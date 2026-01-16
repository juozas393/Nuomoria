/* eslint-disable react/prop-types */
import React, { useState, useEffect, useCallback, useRef, useContext } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../context/AuthContext';
import { FRONTEND_MODE } from '../../config/frontendMode';
import { 
  XMarkIcon, 
  BuildingOfficeIcon, 
  MapPinIcon, 
  UserGroupIcon,
  BoltIcon,
  PlusIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import { MetersTable } from './MetersTable';
import { geocodeAddressWithRateLimit, parseAddressComponents } from '../../utils/geocoding';
import { type DistributionMethod } from '../../constants/meterDistribution';
import { supabase } from '../../lib/supabase';
import { addressApi } from '../../lib/database';
import { sendNotificationNew } from '../../utils/notificationSystem';

const debugLog = (...args: unknown[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(...args);
  }
};

// Form schema
const addressSchema = z.object({
  address: z.object({
    fullAddress: z.string().min(5, 'Adresas per trumpas'),
    city: z.string().optional()
  }),
  location: z.object({
    postalCode: z.string().trim().refine(val => val === '' || /^\d{5}$/.test(val), 'Netinkamas pašto kodas'),
    coordinates: z.object({
      lat: z.number(),
      lng: z.number()
    }).optional()
  }),
  buildingInfo: z.object({
    buildingType: z.string().min(1, 'Pastato tipas privalomas'),
    floors: z.number().min(1, 'Bent 1 aukštas'),
    totalApartments: z.number().min(1, 'Bent 1 butas'),
    yearBuilt: z.number().optional(),
    defaultMonthlyRent: z.number().min(0, 'Nuomos kaina negali būti neigiama').optional(),
    defaultDepositAmount: z.number().min(0, 'Depozitas negali būti neigiamas').optional()
  }),
  contacts: z.object({
    managementType: z.string().min(1, 'Administravimo tipas privalomas'),
    chairmanName: z.string().optional(),
    chairmanPhone: z.string().optional(),
    chairmanEmail: z.string().email().optional(),
    companyName: z.string().optional(),
    contactPerson: z.string().optional(),
    companyPhone: z.string().optional(),
    companyEmail: z.string().email().optional()
  })
}).refine((data) => {
  // Jei nerandamos koordinatės, pašto kodas privalomas
  if (!data.location.coordinates?.lat || !data.location.coordinates?.lng) {
    return data.location.postalCode && data.location.postalCode.length === 5;
  }
  return true;
}, {
  message: "Jei nerandamos koordinatės, pašto kodas yra privalomas",
  path: ["location", "postalCode"]
});

type AddressFormData = z.infer<typeof addressSchema>;

interface CommunalMeter {
  id: string;
  name: string;
  type: 'individual' | 'communal';
  unit: 'm3' | 'kWh' | 'GJ' | 'Kitas';
  price_per_unit: number;
  fixed_price?: number;
  distribution_method: DistributionMethod;
  description: string;
  is_active: boolean;
  requires_photo: boolean;
  collectionMode: 'landlord_only' | 'tenant_photo';
  landlordReadingEnabled: boolean;
  tenantPhotoEnabled: boolean;
}

interface AddAddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (addressData: AddressFormData) => void;
}

const AddAddressModal: React.FC<AddAddressModalProps> = React.memo(({
  isOpen,
  onClose,
  onSave
}) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [isAddressVerified, setIsAddressVerified] = useState(false);
  const [geocodingError, setGeocodingError] = useState<string | null>(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [similarAddresses, setSimilarAddresses] = useState<string[]>([]);
  const [communalMeters, setCommunalMeters] = useState<CommunalMeter[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const geocodeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const steps = ['Adresas', 'Detalės', 'Kontaktai', 'Skaitliukai'];

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
    reset
  } = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    mode: 'onChange',
    defaultValues: {
      address: {
        fullAddress: '',
        city: ''
      },
                           location: {
          postalCode: '',
        coordinates: undefined
        },
      buildingInfo: {
        buildingType: 'Butų namas',
                 floors: 1,
        totalApartments: 1,
      yearBuilt: undefined,
      defaultMonthlyRent: 0,
      defaultDepositAmount: 0
      },
      contacts: {
        managementType: 'Nuomotojas',
        chairmanName: '',
        chairmanPhone: '',
        chairmanEmail: '',
        companyName: '',
        contactPerson: '',
        companyPhone: '',
        companyEmail: ''
      }
    }
  });

  const watchedValues = watch();

  // Default communal meters
  const DEFAULT_METERS: Omit<CommunalMeter, 'id'>[] = [
    {
      name: 'Vanduo (šaltas)',
      type: 'individual',
      unit: 'm3',
      price_per_unit: 1.2,
      distribution_method: 'per_consumption',
      description: 'Šalto vandens suvartojimas kiekvienam butui',
      is_active: true,
      requires_photo: true,
      collectionMode: 'tenant_photo',
      landlordReadingEnabled: false,
      tenantPhotoEnabled: true
    },
    {
      name: 'Vanduo (karštas)',
      type: 'individual',
      unit: 'm3',
      price_per_unit: 3.5,
      distribution_method: 'per_consumption',
      description: 'Karšto vandens suvartojimas kiekvienam butui',
      is_active: true,
      requires_photo: true,
      collectionMode: 'tenant_photo',
      landlordReadingEnabled: false,
      tenantPhotoEnabled: true
    },
    {
      name: 'Elektra (individuali)',
      type: 'individual',
      unit: 'kWh',
      price_per_unit: 0.15,
      distribution_method: 'per_consumption',
      description: 'Elektros suvartojimas kiekvienam butui',
      is_active: true,
      requires_photo: true,
      collectionMode: 'tenant_photo',
      landlordReadingEnabled: false,
      tenantPhotoEnabled: true
    },
    {
      name: 'Elektra (bendra)',
      type: 'communal',
      unit: 'kWh',
      price_per_unit: 0.15,
      distribution_method: 'per_apartment',
      description: 'Namo apsvietimas, liftas, kiemo apšvietimas',
      is_active: true,
      requires_photo: false,
      collectionMode: 'landlord_only',
      landlordReadingEnabled: true,
      tenantPhotoEnabled: false
    },
    {
      name: 'Šildymas',
      type: 'communal',
      unit: 'GJ',
      price_per_unit: 25.0,
      distribution_method: 'per_apartment',
      description: 'Namo šildymo sąnaudos',
      is_active: true,
      requires_photo: false,
      collectionMode: 'landlord_only',
      landlordReadingEnabled: false,
      tenantPhotoEnabled: false
    },
    {
      name: 'Internetas',
      type: 'communal',
      unit: 'Kitas',
      price_per_unit: 0,
      fixed_price: 60,
      distribution_method: 'fixed_split',
      description: 'Namo interneto paslaugos',
      is_active: true,
      requires_photo: false,
      collectionMode: 'landlord_only',
      landlordReadingEnabled: false,
      tenantPhotoEnabled: false
    },
    {
      name: 'Šiukšlių išvežimas',
      type: 'communal',
      unit: 'Kitas',
      price_per_unit: 0,
      fixed_price: 45,
      distribution_method: 'fixed_split',
      description: 'Šiukšlių išvežimo paslaugos',
      is_active: true,
      requires_photo: false,
      collectionMode: 'landlord_only',
      landlordReadingEnabled: false,
      tenantPhotoEnabled: false
    }
  ];

  // Normalize address for comparison
  const normalizeAddress = (address: string): string => {
    return address.toLowerCase().trim().replace(/\s+/g, ' ');
  };

  // Check for similar addresses
  const checkForSimilarAddresses = async (address: string): Promise<string[]> => {
    // ⚠️ FRONTEND MODE - Skip API calls
    if (FRONTEND_MODE) {
      debugLog('🚫 FRONTEND ONLY: Skipping address similarity check');
      return [];
    }
    
    try {
      // Checking for similar addresses - logging removed for production
      debugLog('🔍 Checking similar addresses for user:', user?.id);
      const addresses = await addressApi.getAll(user?.id);
      // User addresses from DB - logging removed for production
      
      // If no addresses exist or API fails, return empty array
      if (!addresses || addresses.length === 0) {
        // No user addresses found in database - logging removed for production
        return [];
      }
      
      const normalizedInput = normalizeAddress(address);
      // Normalized input - logging removed for production
      
      const similarAddresses = addresses
        .filter(addr => {
          if (!addr.full_address) return false;
          const normalizedAddr = normalizeAddress(addr.full_address);
          // Tiksliau tikriname duplikatus - tik jei adresai yra identiški
          const isExactMatch = normalizedAddr === normalizedInput;
          debugLog('🔍 Comparing:', normalizedAddr, 'vs', normalizedInput, 'Match:', isExactMatch);
          return isExactMatch;
        })
        .map(addr => addr.full_address);
      
      // Found similar addresses - logging removed for production
      return similarAddresses;
    } catch (error) {
      // Error checking for similar addresses - logging removed for production
      return [];
    }
  };



  // Address verification with geocoding
  const handleAddressVerification = useCallback(async () => {
    const fullAddress = watchedValues.address?.fullAddress;
    if (!fullAddress) {
      setGeocodingError('Įveskite adresą prieš geokodavimą');
      return;
    }

    setIsGeocoding(true);
    setGeocodingError(null);

    if (geocodeTimeoutRef.current) {
      clearTimeout(geocodeTimeoutRef.current);
    }

    geocodeTimeoutRef.current = setTimeout(async () => {
      try {
        // Parse address components first
        const addressParts = parseAddressComponents(fullAddress);
        
        // Try geocoding with the full address
        const result = await geocodeAddressWithRateLimit(fullAddress, 'Lithuania');
        
        if (result) {
          // Set coordinates
          setValue('location.coordinates', {
            lat: result.lat,
            lng: result.lng
          });
          
          // Set extracted postal code if available
          if (addressParts.postalCode) {
            setValue('location.postalCode', addressParts.postalCode);
          } else if (result.postcode) {
            setValue('location.postalCode', result.postcode);
          }
          
          // Set city if available
          if (result.city) {
            setValue('address.city', result.city);
          } else if (addressParts.city) {
            setValue('address.city', addressParts.city);
          }
          
          setShowMap(true);
          setIsAddressVerified(true);
          setGeocodingError(null);
          
          debugLog('Geocoding successful:', result);
        } else {
          setGeocodingError('Nepavyko rasti adreso koordinačių. Jei norite tęsti, privalote įvesti pašto kodą.');
          setIsAddressVerified(false);
          
          // Still parse address components even if geocoding fails
          if (addressParts.city) {
            setValue('address.city', addressParts.city);
          }
          if (addressParts.postalCode) {
            setValue('location.postalCode', addressParts.postalCode);
          }
        }
      } catch (error) {
        console.error('Geocoding error:', error);
        setGeocodingError('Klaida geokodavimo metu. Patikrinkite internetinę prieigą arba pabandykite vėliau.');
        setIsAddressVerified(false);
      } finally {
        setIsGeocoding(false);
      }
    }, 1500); // Increased delay to respect rate limits
  }, [watchedValues.address?.fullAddress, setValue]);

  // Debounced geocoding
  useEffect(() => {
    if (watchedValues.address?.fullAddress) {
      handleAddressVerification();
    }
  }, [watchedValues.address?.fullAddress, handleAddressVerification]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      reset();
      setCurrentStep(0);
      setIsAddressVerified(false);
      setGeocodingError(null);
      setShowMap(false);
      setShowDuplicateModal(false);
      setSimilarAddresses([]);
      setCommunalMeters([]);
    }
  }, [isOpen, reset]);



  // Initialize default meters when modal opens
  useEffect(() => {
    if (isOpen) {
      // Reset meters to ensure fresh defaults
      setCommunalMeters([]);
      
      const defaultMeters: CommunalMeter[] = [
        { 
          id: 'meter-1', 
          name: 'Vanduo (šaltas)', 
          type: 'individual', 
          unit: 'm3', 
          price_per_unit: 1.2, 
          distribution_method: 'per_consumption', 
          description: 'Šalto vandens suvartojimas', 
          is_active: true, 
          requires_photo: true, 
          collectionMode: 'tenant_photo',
          landlordReadingEnabled: false,
          tenantPhotoEnabled: true
        },
        { 
          id: 'meter-2', 
          name: 'Vanduo (karštas)', 
          type: 'individual', 
          unit: 'm3', 
          price_per_unit: 3.5, 
          distribution_method: 'per_consumption', 
          description: 'Karšto vandens suvartojimas', 
          is_active: true, 
          requires_photo: true, 
          collectionMode: 'tenant_photo',
          landlordReadingEnabled: false,
          tenantPhotoEnabled: true
        },
        { 
          id: 'meter-3', 
          name: 'Elektra (individuali)', 
          type: 'individual', 
          unit: 'kWh', 
          price_per_unit: 0.15, 
          distribution_method: 'per_consumption', 
          description: 'Elektros suvartojimas', 
          is_active: true, 
          requires_photo: true, 
          collectionMode: 'tenant_photo',
          landlordReadingEnabled: false,
          tenantPhotoEnabled: true
        },
        { 
          id: 'meter-4', 
          name: 'Elektra (bendra)', 
          type: 'communal', 
          unit: 'kWh', 
          price_per_unit: 0.15, 
          distribution_method: 'per_apartment', 
          description: 'Namo apsvietimas', 
          is_active: true, 
          requires_photo: false, 
          collectionMode: 'landlord_only',
          landlordReadingEnabled: true,
          tenantPhotoEnabled: false
        },
        { 
          id: 'meter-5', 
          name: 'Šildymas', 
          type: 'individual', 
          unit: 'GJ', 
          price_per_unit: 25.0, 
          distribution_method: 'per_area', 
          description: 'Namo šildymo sąnaudos', 
          is_active: true, 
          requires_photo: true, 
          collectionMode: 'tenant_photo',
          landlordReadingEnabled: false,
          tenantPhotoEnabled: true
        }
      ];
      
      // Set default meters after a small delay to ensure state is cleared
      setTimeout(() => {
        setCommunalMeters(defaultMeters);
      }, 100);
    }
  }, [isOpen]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (geocodeTimeoutRef.current) {
        clearTimeout(geocodeTimeoutRef.current);
      }
    };
  }, []);



  const handleFinalSave = async (formData: any) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // Patikriname pašto kodą, jei nerandamos koordinatės
      const hasCoordinates = formData.location?.coordinates?.lat && formData.location?.coordinates?.lng;
      const hasPostalCode = formData.location?.postalCode && formData.location.postalCode.length === 5;
      
      if (!hasCoordinates && !hasPostalCode) {
        alert('Jei nerandamos koordinatės, privalote įvesti pašto kodą.');
        setIsSubmitting(false);
        return;
      }

      if (!user) {
        alert('Naudotojo sesija negalioja. Prisijunkite iš naujo.');
        setIsSubmitting(false);
        return;
      }

      // 1. Save address
      const addressData = {
        full_address: formData.address.fullAddress,
        street: formData.address.street,
        house_number: formData.address.houseNumber,
        city: formData.address.city,
        postal_code: formData.location.postalCode,
        coordinates_lat: formData.location.coordinates?.lat,
        coordinates_lng: formData.location.coordinates?.lng,
        building_type: formData.buildingInfo.buildingType,
        total_apartments: formData.buildingInfo.totalApartments,
        floors: formData.buildingInfo.floors,
        year_built: formData.buildingInfo.yearBuilt,
        management_type: formData.contacts.managementType,
        chairman_name: formData.contacts.chairmanName,
        chairman_phone: formData.contacts.chairmanPhone,
        chairman_email: formData.contacts.chairmanEmail,
        company_name: formData.contacts.companyName,
        contact_person: formData.contacts.contactPerson,
        company_phone: formData.contacts.companyPhone,
        company_email: formData.contacts.companyEmail,
        created_by: user.id
      };

      const { data: address, error: addressError } = await supabase
        .from('addresses')
        .insert([addressData])
        .select()
        .single();

      if (addressError) throw addressError;

      // 2. Save address meters (defaults for all apartments)
      if (communalMeters.length > 0) {
        const addressMetersData = communalMeters.map(meter => ({
          address_id: address.id,
          name: meter.name,
          type: meter.type,
          unit: meter.unit,
          price_per_unit: meter.price_per_unit || 0,
          fixed_price: meter.fixed_price || 0,
          distribution_method: meter.distribution_method || 'per_apartment', // ✅ FIX: Add default distribution method
          description: meter.description || '',
          requires_photo: meter.requires_photo !== undefined ? meter.requires_photo : true,
          is_active: meter.is_active !== undefined ? meter.is_active : true
        }));

        debugLog('Inserting address meters data:', JSON.stringify(addressMetersData, null, 2));
        debugLog('Communal meters state:', JSON.stringify(communalMeters, null, 2));

        // Validate data before insert
        const validatedData = addressMetersData.map(meter => {
          // Ensure type is valid
          if (!['individual', 'communal'].includes(meter.type)) {
            console.error(`Invalid meter type: ${meter.type} for meter: ${meter.name}`);
            throw new Error(`Invalid meter type: ${meter.type}. Must be 'individual' or 'communal'`);
          }
          
          // Ensure unit is valid
          if (!['m3', 'kWh', 'GJ', 'Kitas'].includes(meter.unit)) {
            console.error(`Invalid meter unit: ${meter.unit} for meter: ${meter.name}`);
            throw new Error(`Invalid meter unit: ${meter.unit}. Must be 'm3', 'kWh', 'GJ', or 'Kitas'`);
          }
          
          // Ensure distribution_method is valid
          if (!['per_apartment', 'per_area', 'per_consumption', 'fixed_split'].includes(meter.distribution_method)) {
            console.error(`Invalid distribution method: ${meter.distribution_method} for meter: ${meter.name}`);
            throw new Error(`Invalid distribution method: ${meter.distribution_method}. Must be 'per_apartment', 'per_area', 'per_consumption', or 'fixed_split'`);
          }
          
          return meter;
        });

        const { data: insertedMeters, error: metersError } = await supabase
          .from('address_meters')
          .insert(validatedData)
          .select();

        if (metersError) {
          console.error('Error inserting meters:', metersError);
          console.error('Data that failed:', JSON.stringify(validatedData, null, 2));
          
          // Check if it's an RLS policy error
          if (metersError.message?.includes('row-level security policy')) {
            console.error('❌ RLS Policy Error: The address_meters table has Row Level Security enabled but no proper INSERT policy.');
            console.error('❌ Please run the fix-address-meters-rls.sql script in Supabase SQL Editor to fix this issue.');
          }
          
          throw metersError;
        }

        debugLog('✅ Address meters inserted successfully:', insertedMeters);
      }

      // 3. Create apartments
      const defaultMonthlyRent = formData.buildingInfo.defaultMonthlyRent ?? 0;
      const defaultDepositAmount = formData.buildingInfo.defaultDepositAmount ?? 0;

      const apartmentsData = Array.from({ length: formData.buildingInfo.totalApartments }, (_, index) => ({
        address_id: address.id,
        apartment_number: (index + 1).toString(),
        tenant_name: 'Laisvas',
        phone: '',
        email: '',
        rent: defaultMonthlyRent,
        area: 0,
        rooms: 1,
        contract_start: new Date().toISOString().split('T')[0], // Today's date as default
        contract_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 year from now
        deposit_amount: defaultDepositAmount,
        deposit_paid_amount: 0,
        deposit_paid: false,
        deposit_returned: false,
        deposit_deductions: 0,
        status: 'vacant',
        auto_renewal_enabled: false,
        notification_count: 0,
        original_contract_duration_months: 12
      }));

      const { data: apartments, error: apartmentsError } = await supabase
        .from('properties')
        .insert(apartmentsData)
        .select();

      if (apartmentsError) throw apartmentsError;
      
      debugLog('✅ Created apartments:', apartments);
      debugLog('✅ Apartments count:', apartments?.length || 0);

      // 4. Create individual meter configs for each apartment
      if (apartments && apartments.length > 0) {
        try {
          debugLog('Creating apartment meters for', apartments.length, 'apartments');
          
          // Create all apartment meters at once using Promise.all
          const meterPromises = apartments.map(async (apartment) => {
            const { error: triggerError } = await supabase.rpc('create_apartment_meters_from_address', {
              p_property_id: apartment.id,
              p_address_id: address.id
            });
            
            if (triggerError) {
              throw new Error(`Failed to create meters for apartment ${apartment.apartment_number}: ${triggerError.message}`);
            }
            
            return { apartmentId: apartment.id, apartmentNumber: apartment.apartment_number };
          });
          
          const results = await Promise.all(meterPromises);
          debugLog(`✅ Created meters for ${results.length} apartments successfully`);
          
        } catch (meterError) {
          console.error('Error in meter creation process:', meterError);
          const errorMessage = meterError instanceof Error ? meterError.message : 'Nežinoma klaida';

          let fallbackSucceeded = false;
          try {
            const { data: fallbackMeters, error: fallbackMetersError } = await supabase
              .from('address_meters')
              .select(
                'id, name, type, unit, distribution_method, price_per_unit, fixed_price, requires_photo, is_active'
              )
              .eq('address_id', address.id);

            if (fallbackMetersError) {
              throw fallbackMetersError;
            }

            if (fallbackMeters && fallbackMeters.length > 0) {
              const timestamp = new Date().toISOString();
              for (const apartment of apartments) {
                const inserts = fallbackMeters
                  .filter((meter) => meter.type === 'individual')
                  .map((meter) => ({
                    property_id: apartment.id,
                    address_meter_id: meter.id,
                    meter_name: meter.name,
                    meter_type: meter.type,
                    unit: meter.unit,
                    distribution_method: meter.distribution_method,
                    price_per_unit: meter.price_per_unit,
                    fixed_price: meter.fixed_price ?? 0,
                    is_active: meter.is_active ?? true,
                    requires_photo: meter.requires_photo ?? true,
                    is_custom: false,
                    created_at: timestamp,
                    updated_at: timestamp
                  }));

                if (inserts.length > 0) {
                  const { error: insertError } = await supabase.from('apartment_meters').insert(inserts);
                  if (insertError) {
                    throw insertError;
                  }
                }
              }
              fallbackSucceeded = true;
              console.info('✅ Fallback meter creation succeeded for apartments');
            }
          } catch (fallbackError) {
            console.error('❌ Fallback meter creation failed:', fallbackError);
          }

          if (!fallbackSucceeded) {
            alert('Adresas sukurtas sėkmingai, bet kilo problema kuriant skaitliukus. Skaitliukus galite pridėti vėliau.');
          }
        }
      } else {
        debugLog('No apartments to create meters for');
      }

      // 5. Add current user to address as landlord
      try {
        debugLog('Current user data:', user);
        
        if (user?.id) {
          // First check if user is already associated with this address
          const { data: existingUserAddress, error: checkError } = await supabase
            .from('user_addresses')
            .select('*')
            .eq('user_id', user.id)
            .eq('address_id', address.id)
            .single();

          if (checkError && checkError.code !== 'PGRST116') {
            console.error('Error checking existing user-address relationship:', checkError);
          } else if (existingUserAddress) {
            debugLog('User already associated with this address:', existingUserAddress);
          } else {
            debugLog('Adding user to address:', {
              userId: user.id,
              addressId: address.id,
              role: 'landlord'
            });
            
            const { data: userAddressData, error: userAddressError } = await supabase
              .from('user_addresses')
              .insert([{
                user_id: user.id,
                address_id: address.id,
                role_at_address: 'landlord',
                role: 'landlord'
              }])
              .select();

            if (userAddressError) {
              console.error('Error adding user to address:', userAddressError);
              
              // Check if it's a duplicate key error (409)
              if (userAddressError.code === '23505') {
                debugLog('User already associated with this address (duplicate key)');
              } else if (userAddressError.message?.includes('row-level security policy')) {
                console.error('❌ RLS Policy Error: The user_addresses table has Row Level Security enabled but no proper INSERT policy.');
                console.error('❌ Please run the fix-rls-policies.sql script in Supabase SQL Editor to fix this issue.');
                
                // Show user-friendly error message
                setSuccessMessage('Klaida: trūksta duomenų bazės teisių. Administratorius turi atnaujinti duomenų bazės nustatymus.');
              }
            } else {
              debugLog('✅ User added to address successfully:', userAddressData);
              debugLog('✅ User successfully added to address as landlord:', userAddressData);
            }
          }
        } else {
          console.error('No current user found');
        }
      } catch (userError) {
        console.error('Error in user-address assignment:', userError);
      }

      // 6. Send notification to tenants about meter readings (if no photo required)
      const metersWithoutPhoto = communalMeters.filter(meter => !meter.requires_photo);
      if (metersWithoutPhoto.length > 0) {
        try {
          debugLog(`Sending meter reading notifications to tenants for ${metersWithoutPhoto.length} meters without photo requirement...`);
          
          // Send notification to each apartment
          for (const apartment of apartments || []) {
            if (apartment.tenant_name && apartment.tenant_name !== 'Laisvas') {
              const notification = {
                id: `meter_reading_${apartment.id}_${Date.now()}`,
                tenantId: apartment.id,
                type: 'meter_reading_request' as any,
                status: 'pending' as const,
                scheduledDate: new Date(),
                message: `Sveiki! Prašome pateikti skaitliukų rodmenis adresui ${formData.address.fullAddress}, butas ${apartment.apartment_number}. Reikia pateikti rodmenis šiems skaitliukams: ${metersWithoutPhoto.map(m => m.name).join(', ')}.`,
                recipient: 'tenant' as const,
                channel: 'email' as const,
                priority: 'medium' as const,
                metadata: {
                  apartmentNumber: apartment.apartment_number,
                  address: formData.address.fullAddress,
                  meters: metersWithoutPhoto.map(m => m.name)
                }
              };
              
              const success = await sendNotificationNew(notification);
              if (success) {
                debugLog(`✅ Notification sent to tenant ${apartment.tenant_name} for apartment ${apartment.apartment_number}`);
              } else {
                console.error(`❌ Failed to send notification to tenant ${apartment.tenant_name}`);
              }
            }
          }
        } catch (notificationError) {
          console.error('Error sending notifications:', notificationError);
        }
      } else if (communalMeters.length > 0) {
        debugLog('No notifications sent - all meters require photos');
      }

      // Show success message with notification info
      const notificationCount = apartments?.filter(a => a.tenant_name && a.tenant_name !== 'Laisvas').length || 0;
      const message = notificationCount > 0 && metersWithoutPhoto.length > 0 
        ? `Adresas sukurtas sėkmingai! Išsiųsta ${notificationCount} pranešimų nuomininkams apie skaitliukų rodmenų pateikimą.`
        : 'Adresas sukurtas sėkmingai!';
      
      setSuccessMessage(message);
      setShowSuccess(true);
      
      // Refresh data after successful save
      setTimeout(() => {
        onSave(formData); // Call onSave with the full form data
        
        // Force refresh of addresses and properties data
        // Note: This will be handled by the parent component's onSave callback
      }, 2000);

    } catch (error) {
      // Security: Don't log sensitive error details
      if (process.env.NODE_ENV === 'development') {
        console.error('Error saving address:', error);
      }
      
      // Provide generic error messages to prevent information disclosure
      let errorMessage = 'Klaida išsaugant adresą. Bandykite dar kartą.';
      
      if (error instanceof Error) {
        // Security: Only show safe error messages
        if (error.message.includes('requires_photo')) {
          errorMessage = 'Klaida: trūksta duomenų bazės stulpelio. Praneškite administratoriui.';
        } else if (error.message.includes('400')) {
          errorMessage = 'Klaida: neteisingi duomenys. Patikrinkite visus laukus ir bandykite dar kartą.';
        } else if (error.message.includes('permission')) {
          errorMessage = 'Klaida: neturite teisių išsaugoti adreso. Prisijunkite iš naujo.';
        } else if (error.message.includes('row-level security policy')) {
          errorMessage = 'Klaida: trūksta duomenų bazės teisių. Administratorius turi atnaujinti duomenų bazės nustatymus.';
        }
        // Security: Don't expose raw error messages
      }
      
      alert('Klaida išsaugant adresą');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    
    // Reset form state
    reset();
    setCurrentStep(0);
    setIsAddressVerified(false);
    setIsGeocoding(false);
    setGeocodingError(null);
    setShowMap(false);
    setShowDuplicateModal(false);
    setSimilarAddresses([]);
    setCommunalMeters([]);
    setShowSuccess(false);
    setSuccessMessage('');
    
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {showDuplicateModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center gap-3 border-b border-black/10 px-5 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2F8481]/10">
                <svg className="h-5 w-5 text-[#2F8481]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
              <h3 className="text-lg font-semibold text-black">Adresas jau egzistuoja</h3>
                </div>
            <div className="space-y-4 px-5 py-4">
              <p className="text-sm text-black/70">
                Šis adresas jau įvestas sistemoje. Jei reikia pridėti naują butą, naudokite funkciją „Pridėti butą“ esamam adresui.
                </p>
              <div className="max-h-32 space-y-1 overflow-y-auto rounded-xl border border-black/10 bg-black/5 p-3">
                  {similarAddresses.map((address, index) => (
                  <p key={index} className="text-sm text-black/80">• {address}</p>
                  ))}
                </div>
              </div>
            <div className="flex items-center justify-end gap-3 border-t border-black/10 px-5 py-4">
                <button
                  type="button"
                  onClick={() => setShowDuplicateModal(false)}
                className="rounded-xl px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-black/5"
                >
                Uždaryti
                </button>
              </div>
            </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center gap-3 border-b border-black/10 px-5 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2F8481]/10">
                <svg className="h-5 w-5 text-[#2F8481]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
              <h3 className="text-lg font-semibold text-black">Adresas išsaugotas</h3>
                </div>
            <div className="px-5 py-4">
              <p className="text-sm text-black/70">{successMessage}</p>
                </div>
            <div className="flex items-center justify-end gap-3 border-t border-black/10 px-5 py-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowSuccess(false);
                    handleClose();
                  }}
                className="rounded-xl bg-[#2F8481] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#266e6c]"
                >
                  Gerai
                </button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
        <div className="flex h-full max-h-[95vh] w-full max-w-[min(100vw-24px,1280px)] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
          <div className="sticky top-0 z-20 border-b border-black/10 bg-white/95 backdrop-blur">
            <div className="flex items-center justify-between px-6 py-5">
              <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#2F8481]/10">
                  <BuildingOfficeIcon className="h-6 w-6 text-[#2F8481]" />
                </span>
                <div>
                  <h2 className="text-2xl font-semibold text-black">Pridėti adresą</h2>
                  <p className="text-sm text-black/60">Įveskite objekto informaciją ir patvirtinkite duomenis</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-black/60 transition-colors hover:bg-black/5 hover:text-black"
                aria-label="Uždaryti"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="border-t border-black/10 px-6 py-3">
              <nav className="grid grid-cols-4 gap-2">
                {steps.map((step, idx) => {
                  const isActive = idx === currentStep;
                  return (
                  <button
                    key={step}
                      type="button"
                      onClick={() => setCurrentStep(idx)}
                      className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? 'border-[#2F8481] bg-[#2F8481] text-white shadow-sm'
                          : 'border-black/10 bg-white text-black/70 hover:border-[#2F8481]/30 hover:text-black'
                    }`}
                  >
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                          isActive ? 'bg-white/20 text-white' : 'bg-black/5 text-black'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <span className="truncate">{step}</span>
                  </button>
                  );
                })}
              </nav>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-white p-6">
            <form onSubmit={handleSubmit(handleFinalSave)} className="space-y-6">
              {currentStep === 0 && (
                <div className="space-y-6 animate-fade-in">
                  <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
                    <div className="mb-6 flex items-center gap-3">
                      <div className="rounded-lg bg-[#2F8481] p-2">
                        <MapPinIcon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-black">Adreso informacija</h3>
                        <p className="text-sm text-black/60">Įveskite pilną adresą ir patvirtinkite jo teisingumą</p>
                      </div>
                    </div>
                    <div className="space-y-5">
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-black">Pilnas adresas</label>
                        <Controller
                          name="address.fullAddress"
                          control={control}
                          render={({ field }) => (
                              <input
                                {...field}
                                type="text"
                                placeholder="Mituvos g. 13, Kaunas"
                              className={`w-full rounded-xl border px-4 py-3 text-sm transition-colors focus:border-[#2F8481] focus:outline-none focus:ring-2 focus:ring-[#2F8481]/30 ${
                                errors.address?.fullAddress ? 'border-[#2F8481]' : 'border-black/15'
                                }`}
                              />
                          )}
                        />
                        {errors.address?.fullAddress && (
                          <p className="mt-2 text-xs font-medium text-black">{errors.address.fullAddress.message}</p>
                        )}
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-black">Pašto kodas</label>
                        <Controller
                          name="location.postalCode"
                          control={control}
                          render={({ field }) => (
                              <input
                                {...field}
                                type="text"
                                placeholder="44269"
                              className={`w-full rounded-xl border px-4 py-3 text-sm transition-colors focus:border-[#2F8481] focus:outline-none focus:ring-2 focus:ring-[#2F8481]/30 ${
                                errors.location?.postalCode ? 'border-[#2F8481]' : 'border-black/15'
                                }`}
                              />
                          )}
                        />
                        {errors.location?.postalCode && (
                          <p className="mt-2 text-xs font-medium text-black">{errors.location.postalCode.message}</p>
                        )}
                      </div>
                      <div className="rounded-xl border border-[#2F8481]/20 bg-[#2F8481]/5 p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <span className="text-sm font-semibold text-black">Adreso patvirtinimas</span>
                          <div className="flex items-center gap-2">
                            {isGeocoding && (
                              <div className="flex items-center gap-2 rounded-full bg-[#2F8481]/10 px-3 py-1 text-sm text-[#2F8481]">
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#2F8481] border-t-transparent" />
                                Tikrinama...
                              </div>
                            )}
                            {isAddressVerified && (
                              <div className="flex items-center gap-2 rounded-full bg-[#2F8481]/10 px-3 py-1 text-sm text-[#2F8481]">
                                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                Patvirtintas
                              </div>
                            )}
                          </div>
                        </div>
                        {geocodingError && (
                          <div className="rounded-lg border border-black/10 bg-black/5 p-3">
                            <p className="flex items-center gap-2 text-sm text-black">
                              <svg className="h-4 w-4 text-[#2F8481]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                              </svg>
                              {geocodingError}
                            </p>
                          </div>
                        )}
                        {watchedValues.location.coordinates && (
                          <div className="mt-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold text-black">Žemėlapis</span>
                              <button
                                type="button"
                                onClick={() => setShowMap(!showMap)}
                                className="flex items-center gap-2 rounded-lg border border-black/10 bg-white px-3 py-1 text-sm text-[#2F8481] transition-all hover:border-[#2F8481] hover:opacity-80"
                              >
                                {showMap ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                                {showMap ? 'Suskleisti' : 'Rodyti'}
                              </button>
                            </div>
                            {showMap && (
                              <div className="animate-fade-in overflow-hidden rounded-xl border-2 border-black/10 shadow-sm">
                                <iframe
                                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${watchedValues.location.coordinates.lng - 0.01},${watchedValues.location.coordinates.lat - 0.01},${watchedValues.location.coordinates.lng + 0.01},${watchedValues.location.coordinates.lat + 0.01}&layer=mapnik&marker=${watchedValues.location.coordinates.lat},${watchedValues.location.coordinates.lng}`}
                                  width="100%"
                                  height="200"
                                  frameBorder="0"
                                  scrolling="no"
                                  title="Address Map"
                                  className="rounded-xl"
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 1 && (
                <div className="space-y-6 animate-fade-in">
                  <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
                    <div className="mb-6 flex items-center gap-3">
                      <div className="rounded-lg bg-[#2F8481] p-2">
                        <BuildingOfficeIcon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-black">Pastato informacija</h3>
                        <p className="text-sm text-black/60">Aprašykite pastato charakteristikas ir parametrus</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-black">Pastato tipas</label>
                        <Controller
                          name="buildingInfo.buildingType"
                          control={control}
                          render={({ field }) => (
                            <select
                              {...field}
                              className={`w-full rounded-xl border px-4 py-3 text-sm transition-colors focus:border-[#2F8481] focus:outline-none focus:ring-2 focus:ring-[#2F8481]/30 ${
                                errors.buildingInfo?.buildingType ? 'border-[#2F8481]' : 'border-black/15'
                              }`}
                            >
                              <option value="Butų namas">Butų namas</option>
                              <option value="Gyvenamasis namas">Gyvenamasis namas</option>
                              <option value="Kita">Kita</option>
                            </select>
                          )}
                        />
                        {errors.buildingInfo?.buildingType && (
                          <p className="mt-2 text-xs font-medium text-black">{errors.buildingInfo.buildingType.message}</p>
                        )}
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-black">Butų skaičius</label>
                        <Controller
                          name="buildingInfo.totalApartments"
                          control={control}
                          render={({ field }) => (
                            <div className="relative">
                              <input
                                {...field}
                                type="number"
                                min="1"
                                value={field.value || 1}
                                onChange={(event) => {
                                  const value = parseInt(event.target.value, 10) || 1;
                                  field.onChange(Math.max(1, value));
                                }}
                                className={`w-full rounded-xl border px-4 py-3 pr-16 text-sm transition-colors focus:border-[#2F8481] focus:outline-none focus:ring-2 focus:ring-[#2F8481]/30 ${
                                  errors.buildingInfo?.totalApartments ? 'border-[#2F8481]' : 'border-black/15'
                                }`}
                              />
                              <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-black/50">
                                butų
                              </span>
                            </div>
                          )}
                        />
                        {errors.buildingInfo?.totalApartments && (
                          <p className="mt-2 text-xs font-medium text-black">{errors.buildingInfo.totalApartments.message}</p>
                        )}
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-black">Aukštų skaičius</label>
                        <Controller
                          name="buildingInfo.floors"
                          control={control}
                          render={({ field }) => (
                            <input
                              {...field}
                              type="number"
                              min="1"
                              value={field.value || 1}
                              onChange={(event) => {
                                const value = parseInt(event.target.value, 10) || 1;
                                field.onChange(Math.max(1, value));
                              }}
                              className={`w-full rounded-xl border px-4 py-3 text-sm transition-colors focus:border-[#2F8481] focus:outline-none focus:ring-2 focus:ring-[#2F8481]/30 ${
                                errors.buildingInfo?.floors ? 'border-[#2F8481]' : 'border-black/15'
                              }`}
                            />
                          )}
                        />
                        {errors.buildingInfo?.floors && (
                          <p className="mt-2 text-xs font-medium text-black">{errors.buildingInfo.floors.message}</p>
                        )}
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-black">Statybos metai (pasirinktinai)</label>
                        <Controller
                          name="buildingInfo.yearBuilt"
                          control={control}
                          render={({ field }) => (
                            <input
                              {...field}
                              type="number"
                              placeholder="2002"
                              className="w-full rounded-xl border border-black/15 px-4 py-3 text-sm transition-colors focus:border-[#2F8481] focus:outline-none focus:ring-2 focus:ring-[#2F8481]/30"
                            />
                          )}
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-black">
                          Numatytas mėnesio nuomos mokestis (€/mėn.)
                        </label>
                        <Controller
                          name="buildingInfo.defaultMonthlyRent"
                          control={control}
                          render={({ field }) => (
                            <input
                              {...field}
                              type="number"
                              min="0"
                              step="0.01"
                              value={Number.isFinite(field.value) ? field.value : 0}
                              onChange={(event) => {
                                const value = event.target.value;
                                if (value === '') {
                                  field.onChange(0);
                                  return;
                                }
                                const parsed = Number.parseFloat(value);
                                field.onChange(Number.isFinite(parsed) && parsed >= 0 ? parsed : 0);
                              }}
                              className={`w-full rounded-xl border px-4 py-3 text-sm transition-colors focus:border-[#2F8481] focus:outline-none focus:ring-2 focus:ring-[#2F8481]/30 ${
                                errors.buildingInfo?.defaultMonthlyRent ? 'border-[#2F8481]' : 'border-black/15'
                              }`}
                              placeholder="600"
                            />
                          )}
                        />
                        <p className="mt-2 text-xs text-black/50">
                          Ši kaina bus automatiškai priskirta visiems naujai kuriamiems butams. Vėliau ją galėsite pakeisti
                          kiekvienam butui atskirai.
                        </p>
                        {errors.buildingInfo?.defaultMonthlyRent && (
                          <p className="mt-2 text-xs font-medium text-black">
                            {errors.buildingInfo.defaultMonthlyRent.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-black">Numatytas depozitas (€)</label>
                        <Controller
                          name="buildingInfo.defaultDepositAmount"
                          control={control}
                          render={({ field }) => (
                            <input
                              {...field}
                              type="number"
                              min="0"
                              step="0.01"
                              value={Number.isFinite(field.value) ? field.value : 0}
                              onChange={(event) => {
                                const value = event.target.value;
                                if (value === '') {
                                  field.onChange(0);
                                  return;
                                }
                                const parsed = Number.parseFloat(value);
                                field.onChange(Number.isFinite(parsed) && parsed >= 0 ? parsed : 0);
                              }}
                              className={`w-full rounded-xl border px-4 py-3 text-sm transition-colors focus:border-[#2F8481] focus:outline-none focus:ring-2 focus:ring-[#2F8481]/30 ${
                                errors.buildingInfo?.defaultDepositAmount ? 'border-[#2F8481]' : 'border-black/15'
                              }`}
                              placeholder="600"
                            />
                          )}
                        />
                        <p className="mt-2 text-xs text-black/50">
                          Depozito suma, kuri bus įrašyta į kiekvieno buto kortelę pagal nutylėjimą.
                        </p>
                        {errors.buildingInfo?.defaultDepositAmount && (
                          <p className="mt-2 text-xs font-medium text-black">
                            {errors.buildingInfo.defaultDepositAmount.message}
                          </p>
                        )}
                      </div>
              </div>
            </div>
                </div>
              )}
              
              {currentStep === 2 && (
                <section className="space-y-6 animate-fade-in">
                  <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
                    <h3 className="mb-4 text-lg font-semibold text-black">Kontaktai</h3>
                    <div className="space-y-5">
                <div>
                        <label className="mb-2 block text-sm font-semibold text-black">Administravimo tipas</label>
                  <Controller
                    name="contacts.managementType"
                    control={control}
                    render={({ field }) => (
                      <select
                        {...field}
                              className={`w-full rounded-xl border px-4 py-3 text-sm transition-colors focus:border-[#2F8481] focus:outline-none focus:ring-2 focus:ring-[#2F8481]/30 ${
                                errors.contacts?.managementType ? 'border-[#2F8481]' : 'border-black/15'
                              }`}
                      >
                                                 <option value="Nuomotojas">Nuomotojas</option>
                         <option value="Bendrija">Bendrija</option>
                         <option value="Administravimo įmonė">Administravimo įmonė</option>
                      </select>
                    )}
                  />
                        {errors.contacts?.managementType && (
                          <p className="mt-2 text-xs font-medium text-black">{errors.contacts.managementType.message}</p>
                        )}
                                 </div>
                      {watchedValues.contacts?.managementType === 'Nuomotojas' && (
                        <div className="rounded-xl border border-[#2F8481]/30 bg-[#2F8481]/10 px-4 py-3 text-sm text-black">
                          Nuomotojo kontaktai bus automatiškai paimti iš jūsų profilio.
                    </div>
                  )}
                      {watchedValues.contacts?.managementType === 'Bendrija' && (
                        <div className="grid gap-4 md:grid-cols-2">
                    <div>
                            <label className="mb-1 block text-sm font-medium text-black/70">Pirmininko vardas</label>
                      <Controller
                        name="contacts.chairmanName"
                        control={control}
                        render={({ field }) => (
                          <input
                            {...field}
                                  value={field.value || ''}
                            type="text"
                                  className="w-full rounded-xl border border-black/15 px-4 py-3 text-sm transition-colors focus:border-[#2F8481] focus:outline-none focus:ring-2 focus:ring-[#2F8481]/30"
                          />
                        )}
                      />
                    </div>
                    <div>
                            <label className="mb-1 block text-sm font-medium text-black/70">Telefonas</label>
                      <Controller
                        name="contacts.chairmanPhone"
                        control={control}
                        render={({ field }) => (
                          <input
                            {...field}
                                  value={field.value || ''}
                            type="tel"
                            placeholder="+370xxxxxxxx"
                                  className="w-full rounded-xl border border-black/15 px-4 py-3 text-sm transition-colors focus:border-[#2F8481] focus:outline-none focus:ring-2 focus:ring-[#2F8481]/30"
                          />
                        )}
                      />
                    </div>
                          <div className="md:col-span-2">
                            <label className="mb-1 block text-sm font-medium text-black/70">El. paštas</label>
                      <Controller
                        name="contacts.chairmanEmail"
                        control={control}
                        render={({ field }) => (
                          <input
                            {...field}
                                  value={field.value || ''}
                            type="email"
                                  className="w-full rounded-xl border border-black/15 px-4 py-3 text-sm transition-colors focus:border-[#2F8481] focus:outline-none focus:ring-2 focus:ring-[#2F8481]/30"
                          />
                        )}
                      />
                    </div>
                  </div>
                )}
                      {watchedValues.contacts?.managementType === 'Administravimo įmonė' && (
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="md:col-span-2">
                            <label className="mb-1 block text-sm font-medium text-black/70">Įmonės pavadinimas</label>
                      <Controller
                        name="contacts.companyName"
                        control={control}
                        render={({ field }) => (
                          <input
                            {...field}
                                  value={field.value || ''}
                            type="text"
                                  className="w-full rounded-xl border border-black/15 px-4 py-3 text-sm transition-colors focus:border-[#2F8481] focus:outline-none focus:ring-2 focus:ring-[#2F8481]/30"
                          />
                        )}
                      />
                    </div>
                    <div>
                            <label className="mb-1 block text-sm font-medium text-black/70">Kontaktinis asmuo</label>
                      <Controller
                        name="contacts.contactPerson"
                        control={control}
                        render={({ field }) => (
                          <input
                            {...field}
                                  value={field.value || ''}
                            type="text"
                                  className="w-full rounded-xl border border-black/15 px-4 py-3 text-sm transition-colors focus:border-[#2F8481] focus:outline-none focus:ring-2 focus:ring-[#2F8481]/30"
                          />
                        )}
                      />
                    </div>
                    <div>
                            <label className="mb-1 block text-sm font-medium text-black/70">Telefonas</label>
                      <Controller
                        name="contacts.companyPhone"
                        control={control}
                        render={({ field }) => (
                          <input
                            {...field}
                                  value={field.value || ''}
                            type="tel"
                                  className="w-full rounded-xl border border-black/15 px-4 py-3 text-sm transition-colors focus:border-[#2F8481] focus:outline-none focus:ring-2 focus:ring-[#2F8481]/30"
                          />
                        )}
                      />
                    </div>
                          <div className="md:col-span-2">
                            <label className="mb-1 block text-sm font-medium text-black/70">El. paštas</label>
                      <Controller
                        name="contacts.companyEmail"
                        control={control}
                        render={({ field }) => (
                          <input
                            {...field}
                                  value={field.value || ''}
                            type="email"
                                  className="w-full rounded-xl border border-black/15 px-4 py-3 text-sm transition-colors focus:border-[#2F8481] focus:outline-none focus:ring-2 focus:ring-[#2F8481]/30"
                          />
                        )}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
                </section>
              )}

      {currentStep === 3 && (
                <section className="space-y-6 animate-fade-in">
                  <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
                    <div className="mb-4 flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2F8481]/10">
                        <BoltIcon className="h-5 w-5 text-[#2F8481]" />
                      </span>
                      <div>
                        <h3 className="text-lg font-semibold text-black">Komunaliniai skaitliukai</h3>
                        <p className="text-sm text-black/60">Nustatykite skaitiklius šiam adresui</p>
                  </div>
                    </div>
            <MetersTable
              meters={communalMeters}
              onMetersChange={setCommunalMeters}
              onPresetApply={(meters) => setCommunalMeters(meters)}
              onMeterDelete={(id) => {
                        setCommunalMeters((prev) => prev.filter((m) => m.id !== id));
              }}
              onMeterUpdate={(id, updates) => {
                        setCommunalMeters((prev) =>
                          prev.map((m) => (m.id === id ? { ...m, ...updates } : m))
                        );
              }}
            />
                  </div>
                </section>
              )}


    </form>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white border-t border-black/10 p-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                {currentStep > 0 && (
                  <button
                    type="button"
                    onClick={() => setCurrentStep(currentStep - 1)}
                    className="flex items-center gap-2 px-5 py-3 text-black bg-black/5 hover:bg-black/10 rounded-xl transition-all duration-200 hover:shadow-md font-medium"
                  >
                    <ArrowLeftIcon className="h-4 w-4" />
                    Atgal
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-5 py-3 text-black bg-black/5 hover:bg-black/10 rounded-xl transition-all duration-200 hover:shadow-md font-medium"
                >
                  Atšaukti
                </button>
              </div>

              <div className="flex items-center gap-3">
                {currentStep < steps.length - 1 ? (
                  <button
                    type="button"
                    onClick={async () => {
                      if (currentStep === 0) {
                        const fullAddress = watchedValues.address?.fullAddress;
                        if (fullAddress) {
                          const foundSimilarAddresses = await checkForSimilarAddresses(fullAddress);
                          if (foundSimilarAddresses && foundSimilarAddresses.length > 0) {
                            setSimilarAddresses(foundSimilarAddresses);
                            setShowDuplicateModal(true);
                            return;
                          }
                        }
                      }
                      
                      if (currentStep === 0) {
                        const hasCoordinates = watchedValues.location?.coordinates?.lat && watchedValues.location?.coordinates?.lng;
                        const hasPostalCode = watchedValues.location?.postalCode && watchedValues.location.postalCode.length === 5;
                        
                        if (!hasCoordinates && !hasPostalCode) {
                          alert('Jei nerandamos koordinatės, privalote įvesti pašto kodą.');
                          return;
                        }
                      }
                      
                      setCurrentStep(currentStep + 1);
                    }}
                    disabled={currentStep === 0 && !watchedValues.address.fullAddress}
                    title={currentStep === 0 && !watchedValues.address.fullAddress ? 'Įveskite adresą, kad galėtumėte tęsti' : ''}
                    className="px-6 py-3 bg-[#2F8481] text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all duration-200 hover:shadow-lg font-semibold transform hover:scale-[1.02]"
                  >
                    Toliau
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleFinalSave(watchedValues)}
                    disabled={isSubmitting}
                    className="px-6 py-3 bg-[#2F8481] text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all duration-200 hover:shadow-lg font-semibold transform hover:scale-[1.02]"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        Saugoma...
                      </div>
                    ) : (
                      `Išsaugoti ir sukurti ${watchedValues.buildingInfo?.totalApartments || 1} butą`
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
});

AddAddressModal.displayName = 'AddAddressModal';

export default AddAddressModal;
