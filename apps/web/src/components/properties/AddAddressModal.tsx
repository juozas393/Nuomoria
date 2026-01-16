/* eslint-disable react/prop-types */
import React, { useState, useEffect, useCallback, useRef, useContext } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../context/AuthContext';
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
    yearBuilt: z.number().optional()
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
  const [currentStep, setCurrentStep] = useState(0);
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
        yearBuilt: undefined
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
      landlordReadingEnabled: true,
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
      landlordReadingEnabled: true,
      tenantPhotoEnabled: false
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
      landlordReadingEnabled: true,
      tenantPhotoEnabled: false
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
      landlordReadingEnabled: false,
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
    try {
      // Checking for similar addresses - logging removed for production
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
          // Comparing addresses - logging removed for production
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
          
          console.log('Geocoding successful:', result);
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
          landlordReadingEnabled: true,
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
          landlordReadingEnabled: true,
          tenantPhotoEnabled: false
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
          landlordReadingEnabled: true,
          tenantPhotoEnabled: false
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
          landlordReadingEnabled: false,
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
          landlordReadingEnabled: true,
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
        company_email: formData.contacts.companyEmail
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

        console.log('Inserting address meters data:', JSON.stringify(addressMetersData, null, 2));
        console.log('Communal meters state:', JSON.stringify(communalMeters, null, 2));

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

        console.log('✅ Address meters inserted successfully:', insertedMeters);
      }

      // 3. Create apartments
      const apartmentsData = Array.from({ length: formData.buildingInfo.totalApartments }, (_, index) => ({
        address_id: address.id,
        apartment_number: (index + 1).toString(),
        tenant_name: 'Laisvas',
        phone: '',
        email: '',
        rent: 0,
        area: 0,
        rooms: 1,
        contract_start: new Date().toISOString().split('T')[0], // Today's date as default
        contract_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 year from now
        deposit_amount: 0,
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
      
      console.log('✅ Created apartments:', apartments);
      console.log('✅ Apartments count:', apartments?.length || 0);

      // 4. Create individual meter configs for each apartment
      if (apartments && apartments.length > 0) {
        try {
          console.log('Creating apartment meters for', apartments.length, 'apartments');
          
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
          console.log(`✅ Created meters for ${results.length} apartments successfully`);
          
        } catch (meterError) {
          console.error('Error in meter creation process:', meterError);
          const errorMessage = meterError instanceof Error ? meterError.message : 'Nežinoma klaida';
          alert('Adresas sukurtas sėkmingai, bet kilo problema kuriant skaitliukus. Skaitliukus galite pridėti vėliau.');
        }
      } else {
        console.log('No apartments to create meters for');
      }

      // 5. Add current user to address as landlord
      try {
        console.log('Current user data:', user);
        
        if (user?.id) {
          console.log('Adding user to address:', {
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
            
            // Check if it's an RLS policy error
            if (userAddressError.message?.includes('row-level security policy')) {
              console.error('❌ RLS Policy Error: The user_addresses table has Row Level Security enabled but no proper INSERT policy.');
              console.error('❌ Please run the fix-rls-policies.sql script in Supabase SQL Editor to fix this issue.');
              
              // Show user-friendly error message
              setSuccessMessage('Klaida: trūksta duomenų bazės teisių. Administratorius turi atnaujinti duomenų bazės nustatymus.');
            }
          } else {
            console.log('✅ User added to address successfully:', userAddressData);
            console.log('✅ User successfully added to address as landlord:', userAddressData);
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
          console.log(`Sending meter reading notifications to tenants for ${metersWithoutPhoto.length} meters without photo requirement...`);
          
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
                console.log(`✅ Notification sent to tenant ${apartment.tenant_name} for apartment ${apartment.apartment_number}`);
              } else {
                console.error(`❌ Failed to send notification to tenant ${apartment.tenant_name}`);
              }
            }
          }
        } catch (notificationError) {
          console.error('Error sending notifications:', notificationError);
        }
      } else if (communalMeters.length > 0) {
        console.log('No notifications sent - all meters require photos');
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


      {/* Duplicate Address Warning Modal */}
      {showDuplicateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-semibold text-[#0B0F10]">Panašus adresas rastas</h3>
                </div>
              </div>
              
              <div className="mb-6">
                <p className="text-sm text-neutral-600 mb-3">
                  Šis adresas jau egzistuoja sistemoje:
                </p>
                <div className="bg-neutral-50 rounded-lg p-3 max-h-32 overflow-y-auto border border-neutral-200">
                  {similarAddresses.map((address, index) => (
                    <div key={index} className="text-sm text-neutral-700 py-1 border-b border-neutral-200 last:border-b-0">
                      • {address}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-amber-600 mt-2">
                  Negalite sukurti dviejų identiškų adresų. Jei reikia pridėti naują butą prie esamo adreso, naudokite &quot;Pridėti butą&quot; funkciją.
                </p>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowDuplicateModal(false)}
                  className="px-4 py-2 text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors text-sm font-medium"
                >
                  Atšaukti
                </button>
                <button
                  type="button"
                  onClick={() => setShowDuplicateModal(false)}
                  className="px-4 py-2 bg-[#2F8481] text-white hover:bg-[#2a7875] rounded-lg transition-colors text-sm font-medium"
                >
                  Suprantu
                </button>
                </div>
              </div>
            </div>
        </div>
      )}

      {/* Success Message */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-semibold text-[#0B0F10]">Sėkmingai!</h3>
                </div>
              </div>
              
              <div className="mb-6">
                <p className="text-sm text-neutral-600">
                  {successMessage}
                </p>
              </div>
              
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowSuccess(false);
                    handleClose();
                  }}
                  className="px-4 py-2 bg-[#2F8481] text-white hover:bg-[#2a7875] rounded-lg transition-colors text-sm font-medium"
                >
                  Gerai
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Modal */}
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-[min(100vw-32px,1200px)] max-h-[90vh] flex flex-col">
          
          {/* Header */}
          <div className="sticky top-0 z-20 bg-white border-b border-neutral-200">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <BuildingOfficeIcon className="h-6 w-6 text-[#2F8481]" />
                <h2 className="text-lg font-semibold text-[#0B0F10]">Pridėti naują adresą</h2>
          </div>
          <button
                onClick={handleClose}
                className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

            {/* Steps */}
            <div className="flex gap-1 p-2">
              {steps.map((step, i) => (
                <button
                  key={step}
                  className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    i === currentStep 
                      ? 'bg-[#2F8481] text-white' 
                      : 'bg-neutral-100 text-neutral-800 hover:bg-neutral-200'
                  }`}
                  onClick={() => setCurrentStep(i)}
                >
                  {step}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <form onSubmit={handleSubmit(handleFinalSave)} className="space-y-6">
              
              {/* Step 1: Address */}
              {currentStep === 0 && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-neutral-200 bg-white p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <MapPinIcon className="h-4 w-4 text-[#2F8481]" />
                      <h3 className="text-[15px] font-semibold text-[#0B0F10]">Adreso informacija</h3>
                    </div>
                    
                    <div className="space-y-4">
                      {/* Full Address */}
                            <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          Pilnas adresas
                  </label>
                   <Controller
                     name="address.fullAddress"
                     control={control}
                     render={({ field }) => (
                            <input
                              {...field}
                              type="text"
                              placeholder="Mituvos g. 13, Kaunas"
                              className={`w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481] text-sm ${
                                errors.address?.fullAddress ? 'border-rose-300' : ''
                              }`}
                       />
                     )}
                   />
                   {errors.address?.fullAddress && (
                          <p className="text-rose-600 text-xs mt-1">{errors.address.fullAddress.message}</p>
                   )}
                 </div>

                      {/* Postal Code */}
                                 <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          Pašto kodas
                   </label>
                   <Controller
                     name="location.postalCode"
                     control={control}
                     render={({ field }) => (
                         <input
                           {...field}
                           type="text"
                              placeholder="44269"
                              className={`w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481] text-sm ${
                                errors.location?.postalCode ? 'border-rose-300' : ''
                              }`}
                            />
                     )}
                   />
                   {errors.location?.postalCode && (
                          <p className="text-rose-600 text-xs mt-1">{errors.location.postalCode.message}</p>
                        )}
                      </div>

                      {/* Address Verification */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-neutral-700">Adreso patvirtinimas</span>
                          <div className="flex items-center gap-2">
                            {isGeocoding && (
                              <div className="flex items-center gap-1 text-xs text-neutral-600">
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-[#2F8481]"></div>
                                Tikrinama...
                     </div>
                   )}
                            {isAddressVerified && (
                              <div className="flex items-center gap-1 text-xs text-green-600">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Patvirtintas
                              </div>
                            )}
                 </div>
              </div>

                        {geocodingError && (
                          <p className="text-rose-600 text-xs">{geocodingError}</p>
                        )}

                        {/* Map */}
                        {watchedValues.location.coordinates && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-neutral-700">Žemėlapis</span>
                    <button
                      type="button"
                                onClick={() => setShowMap(!showMap)}
                                className="flex items-center gap-1 text-xs text-[#2F8481] hover:text-[#2a7875]"
                    >
                                {showMap ? <EyeSlashIcon className="h-3 w-3" /> : <EyeIcon className="h-3 w-3" />}
                                {showMap ? 'Suskleisti' : 'Rodyti'}
                    </button>
                </div>

                            {showMap && (
                              <div className="border border-neutral-200 rounded-lg overflow-hidden">
                                <iframe
                                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${watchedValues.location.coordinates.lng - 0.01},${watchedValues.location.coordinates.lat - 0.01},${watchedValues.location.coordinates.lng + 0.01},${watchedValues.location.coordinates.lat + 0.01}&layer=mapnik&marker=${watchedValues.location.coordinates.lat},${watchedValues.location.coordinates.lng}`}
                                  width="100%"
                                  height="200"
                                  frameBorder="0"
                                  scrolling="no"
                                  marginHeight={0}
                                  marginWidth={0}
                                  title="Address Map"
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

              {/* Step 2: Building Details */}
              {currentStep === 1 && (
              <div className="space-y-4">
                  <div className="rounded-xl border border-neutral-200 bg-white p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <BuildingOfficeIcon className="h-4 w-4 text-[#2F8481]" />
                      <h3 className="text-[15px] font-semibold text-[#0B0F10]">Pastato informacija</h3>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      {/* Building Type */}
                <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          Pastato tipas
                  </label>
                  <Controller
                    name="buildingInfo.buildingType"
                    control={control}
                    render={({ field }) => (
                      <select
                        {...field}
                              className={`w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481] text-sm ${
                                errors.buildingInfo?.buildingType ? 'border-rose-300' : ''
                              }`}
                      >
                        <option value="Butų namas">Butų namas</option>
                              <option value="Gyvenamasis namas">Gyvenamasis namas</option>
                              <option value="Kita">Kita</option>
                      </select>
                    )}
                  />
                        {errors.buildingInfo?.buildingType && (
                          <p className="text-rose-600 text-xs mt-1">{errors.buildingInfo.buildingType.message}</p>
                        )}
                </div>

                      {/* Total Apartments */}
                  <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          Butų skaičius
                    </label>
                    <Controller
                      name="buildingInfo.totalApartments"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="number"
                          min="1"
                              value={field.value || 1}
                              onChange={(e) => {
                                const value = parseInt(e.target.value) || 1;
                                field.onChange(Math.max(1, value));
                              }}
                              className={`w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481] text-sm ${
                                errors.buildingInfo?.totalApartments ? 'border-rose-300' : ''
                          }`}
                        />
                      )}
                    />
                    {errors.buildingInfo?.totalApartments && (
                          <p className="text-rose-600 text-xs mt-1">{errors.buildingInfo.totalApartments.message}</p>
                    )}
                  </div>

                      {/* Floors */}
                <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          Aukštų skaičius
                  </label>
                  <Controller
                    name="buildingInfo.floors"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="number"
                        min="1"
                              value={field.value || 1}
                              onChange={(e) => {
                                const value = parseInt(e.target.value) || 1;
                                field.onChange(Math.max(1, value));
                              }}
                              className={`w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481] text-sm ${
                                errors.buildingInfo?.floors ? 'border-rose-300' : ''
                        }`}
                      />
                    )}
                  />
                  {errors.buildingInfo?.floors && (
                          <p className="text-rose-600 text-xs mt-1">{errors.buildingInfo.floors.message}</p>
                  )}
                </div>

                      {/* Year Built */}
                  <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Statybos metai
                      </label>
                      <Controller
                        name="buildingInfo.yearBuilt"
                        control={control}
                        render={({ field }) => (
                          <input
                            {...field}
                            value={field.value || ''}
                            type="number"
                              min="1900"
                            max={new Date().getFullYear()}
                              placeholder="2000"
                              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481] text-sm"
                          />
                        )}
                      />
                  </div>
              </div>
            </div>
                </div>
              )}
              
                            {/* Step 3: Contacts */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-neutral-200 bg-white p-4">
                    <h3 className="text-[15px] font-semibold text-[#0B0F10] mb-4">Kontaktai</h3>
              
              <div className="space-y-4">
                      {/* Management Type */}
                <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          Administravimo tipas
                  </label>
                  <Controller
                    name="contacts.managementType"
                    control={control}
                    render={({ field }) => (
                      <select
                        {...field}
                              className={`w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481] text-sm ${
                                errors.contacts?.managementType ? 'border-rose-300' : ''
                              }`}
                      >
                                                 <option value="Nuomotojas">Nuomotojas</option>
                         <option value="Bendrija">Bendrija</option>
                         <option value="Administravimo įmonė">Administravimo įmonė</option>
                      </select>
                    )}
                  />
                        {errors.contacts?.managementType && (
                          <p className="text-rose-600 text-xs mt-1">{errors.contacts.managementType.message}</p>
                        )}
                                 </div>

                      {/* Nuomotojas Info */}
                      {watchedValues.contacts?.managementType === 'Nuomotojas' && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <p className="text-sm text-green-700">
                            ✓ Nuomotojo informacija bus paimta iš jūsų profilio
                      </p>
                    </div>
                  )}

                      {/* Bendrija Info */}
                      {watchedValues.contacts?.managementType === 'Bendrija' && (
                        <div className="grid grid-cols-2 gap-3">
                    <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">
                              Pirmininko vardas
                      </label>
                      <Controller
                        name="contacts.chairmanName"
                        control={control}
                        render={({ field }) => (
                          <input
                            {...field}
                                  value={field.value || ''}
                            type="text"
                                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481] text-sm"
                          />
                        )}
                      />
                    </div>
                    <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">
                              Telefonas
                      </label>
                      <Controller
                        name="contacts.chairmanPhone"
                        control={control}
                        render={({ field }) => (
                          <input
                            {...field}
                                  value={field.value || ''}
                            type="tel"
                            placeholder="+370xxxxxxxx"
                                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481] text-sm"
                          />
                        )}
                      />
                    </div>
                          <div className="col-span-2">
                            <label className="block text-sm font-medium text-neutral-700 mb-1">
                              El. paštas
                      </label>
                      <Controller
                        name="contacts.chairmanEmail"
                        control={control}
                        render={({ field }) => (
                          <input
                            {...field}
                                  value={field.value || ''}
                            type="email"
                                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481] text-sm"
                          />
                        )}
                      />
                    </div>
                  </div>
                )}

                      {/* Administravimo įmonė Info */}
                      {watchedValues.contacts?.managementType === 'Administravimo įmonė' && (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="col-span-2">
                            <label className="block text-sm font-medium text-neutral-700 mb-1">
                              Įmonės pavadinimas
                      </label>
                      <Controller
                        name="contacts.companyName"
                        control={control}
                        render={({ field }) => (
                          <input
                            {...field}
                                  value={field.value || ''}
                            type="text"
                                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481] text-sm"
                          />
                        )}
                      />
                    </div>
                    <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">
                              Kontaktinis asmuo
                      </label>
                      <Controller
                        name="contacts.contactPerson"
                        control={control}
                        render={({ field }) => (
                          <input
                            {...field}
                                  value={field.value || ''}
                            type="text"
                                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481] text-sm"
                          />
                        )}
                      />
                    </div>
                    <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">
                              Telefonas
                      </label>
                      <Controller
                        name="contacts.companyPhone"
                        control={control}
                        render={({ field }) => (
                          <input
                            {...field}
                                  value={field.value || ''}
                            type="tel"
                                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481] text-sm"
                          />
                        )}
                      />
                    </div>
                          <div className="col-span-2">
                            <label className="block text-sm font-medium text-neutral-700 mb-1">
                              El. paštas
                      </label>
                      <Controller
                        name="contacts.companyEmail"
                        control={control}
                        render={({ field }) => (
                          <input
                            {...field}
                                  value={field.value || ''}
                            type="email"
                                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481] text-sm"
                          />
                        )}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
                </div>
              )}

      {/* Step 4: Communal Meters */}
      {currentStep === 3 && (
        <div className="space-y-4">
          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <div className="flex items-center gap-2 mb-4">
              <BoltIcon className="h-4 w-4 text-[#2F8481]" />
              <h3 className="text-[15px] font-semibold text-[#0B0F10]">Komunaliniai skaitliukai</h3>
                  </div>
                  
            <p className="text-sm text-neutral-600 mb-4">
              Konfigūruokite skaitliukus, kurie bus naudojami visiems butams šiame adrese
            </p>

            <MetersTable
              meters={communalMeters}
              onMetersChange={setCommunalMeters}
              onPresetApply={(meters) => setCommunalMeters(meters)}
              onMeterDelete={(id) => {
                setCommunalMeters(prev => prev.filter(m => m.id !== id));
              }}
              onMeterUpdate={(id, updates) => {
                // Only update local state - no database operations in this context
                setCommunalMeters(prev => prev.map(m => 
                  m.id === id ? { ...m, ...updates } : m
                ));
                console.log('✅ Meter updated in local state:', id, updates);
              }}
            />
                  </div>
                </div>
              )}


    </form>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white border-t border-neutral-200 p-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                       <button
                         type="button"
                  onClick={() => setCurrentStep(currentStep - 1)}
                  className="flex items-center gap-2 px-4 py-2 text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
                >
                  <ArrowLeftIcon className="h-4 w-4" />
                  Atgal
                       </button>
              )}
                <button
                  type="button"
                onClick={handleClose}
                className="px-4 py-2 text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
                >
                  Atšaukti
                </button>
                    </div>

            <div className="flex items-center gap-2">
              {currentStep < steps.length - 1 ? (
                    <button
                  type="button"
                  onClick={async () => {
                    if (currentStep === 0) {
                      const fullAddress = watchedValues.address?.fullAddress;
                      if (fullAddress) {
                        // Checking for similar addresses - logging removed for production
                        const foundSimilarAddresses = await checkForSimilarAddresses(fullAddress);
                        // Found similar addresses - logging removed for production
                        if (foundSimilarAddresses && foundSimilarAddresses.length > 0) {
                          // Showing duplicate modal with addresses - logging removed for production
                          setSimilarAddresses(foundSimilarAddresses);
                          setShowDuplicateModal(true);
                          return;
                        } else {
                          // No similar addresses found, continuing to next step - logging removed for production
                        }
                      }
                    }
                    
                    // Patikriname pašto kodą, jei nerandamos koordinatės
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
                  className="px-4 py-2 bg-[#2F8481] text-white hover:bg-[#2a7875] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  Toliau
                    </button>
                  ) : (
                    <button
                  type="button"
                  onClick={() => handleFinalSave(watchedValues)}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#2F8481] text-white hover:bg-[#2a7875] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  {isSubmitting ? 'Saugoma...' : `Išsaugoti ir sukurti ${watchedValues.buildingInfo?.totalApartments || 1} butą`}
                    </button>
                  )}
                </div>
              </div>
            </div>
      </div>
    </>
  );
});

AddAddressModal.displayName = 'AddAddressModal';

export default AddAddressModal;
