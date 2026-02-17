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
// Background image paths
const modalBg = '/images/ModalBackground.png';
const cardsBg = '/images/CardsBackground.webp';

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
      name: 'Šaltas vanduo',
      type: 'individual',
      unit: 'm3',
      price_per_unit: 1.32,
      distribution_method: 'per_consumption',
      description: 'Šalto vandens tiekimas ir nuotekos',
      is_active: true,
      requires_photo: true,
      collectionMode: 'tenant_photo',
      landlordReadingEnabled: true,
      tenantPhotoEnabled: true
    },
    {
      name: 'Karštas vanduo',
      type: 'individual',
      unit: 'm3',
      price_per_unit: 3.5,
      distribution_method: 'per_consumption',
      description: 'Karšto vandens tiekimas',
      is_active: true,
      requires_photo: true,
      collectionMode: 'tenant_photo',
      landlordReadingEnabled: true,
      tenantPhotoEnabled: true
    },
    {
      name: 'Elektra',
      type: 'individual',
      unit: 'kWh',
      price_per_unit: 0.23,
      distribution_method: 'per_consumption',
      description: 'Buto elektros suvartojimas',
      is_active: true,
      requires_photo: true,
      collectionMode: 'tenant_photo',
      landlordReadingEnabled: true,
      tenantPhotoEnabled: true
    },
    {
      name: 'Šildymas',
      type: 'individual',
      unit: 'kWh',
      price_per_unit: 0.095,
      distribution_method: 'per_area',
      description: 'Centrinis šildymas pagal plotą',
      is_active: true,
      requires_photo: false,
      collectionMode: 'landlord_only',
      landlordReadingEnabled: true,
      tenantPhotoEnabled: false
    },
    {
      name: 'Techninė apžiūra',
      type: 'communal',
      unit: 'Kitas',
      price_per_unit: 0,
      fixed_price: 0,
      distribution_method: 'per_apartment',
      description: 'Namo techninė priežiūra ir apžiūra',
      is_active: true,
      requires_photo: false,
      collectionMode: 'landlord_only',
      landlordReadingEnabled: true,
      tenantPhotoEnabled: false
    }
  ];

  // Normalize address for comparison - handles Lithuanian diacritics and common abbreviations
  const normalizeAddress = (address: string): string => {
    return address
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')              // Collapse whitespace
      .replace(/g\.\s*/g, 'g. ')         // Normalize "g." abbreviation
      .replace(/pr\.\s*/g, 'pr. ')       // Normalize "pr." abbreviation
      .replace(/al\.\s*/g, 'al. ')       // Normalize "al." abbreviation
      .replace(/[ąĄ]/g, 'a')             // Lithuanian diacritics
      .replace(/[čČ]/g, 'c')
      .replace(/[ęĘ]/g, 'e')
      .replace(/[ėĖ]/g, 'e')
      .replace(/[įĮ]/g, 'i')
      .replace(/[šŠ]/g, 's')
      .replace(/[ųŲ]/g, 'u')
      .replace(/[ūŪ]/g, 'u')
      .replace(/[žŽ]/g, 'z');
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




  // Initialize default meters when modal opens - smart defaults from previous address
  useEffect(() => {
    if (!isOpen) return;

    // Reset meters to ensure fresh defaults
    setCommunalMeters([]);

    const loadSmartDefaults = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No user');

        // Find user's most recent address that has meters
        const { data: userAddresses } = await supabase
          .from('user_addresses')
          .select('address_id')
          .eq('user_id', user.id)
          .eq('role', 'owner');

        if (userAddresses && userAddresses.length > 0) {
          const addressIds = userAddresses.map(ua => ua.address_id);

          // Get the most recent meters from any of the user's addresses
          const { data: existingMeters } = await supabase
            .from('address_meters')
            .select('*')
            .in('address_id', addressIds)
            .eq('is_active', true)
            .order('created_at', { ascending: false });

          if (existingMeters && existingMeters.length > 0) {
            // Group by address_id to find which address has the most meters (most complete setup)
            const metersByAddress: Record<string, typeof existingMeters> = {};
            for (const m of existingMeters) {
              if (!metersByAddress[m.address_id]) metersByAddress[m.address_id] = [];
              metersByAddress[m.address_id].push(m);
            }

            // Pick the address with the most meters
            const allGroups = Object.values(metersByAddress);
            const bestAddressMeters = allGroups.sort(
              (a, b) => b.length - a.length
            )[0];

            if (bestAddressMeters && bestAddressMeters.length > 0) {
              console.log('📋 Using smart defaults from previous address:', bestAddressMeters.length, 'meters');

              const smartMeters: CommunalMeter[] = bestAddressMeters.map((m: any, i: number) => ({
                id: `meter-${i + 1}`,
                name: m.name,
                type: m.type as 'individual' | 'communal',
                unit: m.unit as 'm3' | 'kWh' | 'GJ' | 'Kitas',
                price_per_unit: m.price_per_unit || 0,
                fixed_price: m.fixed_price || 0,
                distribution_method: m.distribution_method as DistributionMethod,
                description: m.description || '',
                is_active: true,
                requires_photo: m.requires_photo ?? true,
                collectionMode: m.requires_photo ? 'tenant_photo' : 'landlord_only' as 'landlord_only' | 'tenant_photo',
                landlordReadingEnabled: !m.requires_photo,
                tenantPhotoEnabled: m.requires_photo ?? true
              }));

              setCommunalMeters(smartMeters);
              return; // Skip hardcoded defaults
            }
          }
        }
      } catch (err) {
        console.warn('⚠️ Could not fetch smart defaults, using hardcoded:', err);
      }

      // Fallback: hardcoded defaults for first-time users
      const defaultMeters: CommunalMeter[] = [
        {
          id: 'meter-1',
          name: 'Šaltas vanduo',
          type: 'individual',
          unit: 'm3',
          price_per_unit: 1.32,
          distribution_method: 'per_consumption',
          description: 'Šalto vandens tiekimas ir nuotekos',
          is_active: true,
          requires_photo: true,
          collectionMode: 'tenant_photo',
          landlordReadingEnabled: true,
          tenantPhotoEnabled: true
        },
        {
          id: 'meter-2',
          name: 'Karštas vanduo',
          type: 'individual',
          unit: 'm3',
          price_per_unit: 3.5,
          distribution_method: 'per_consumption',
          description: 'Karšto vandens tiekimas',
          is_active: true,
          requires_photo: true,
          collectionMode: 'tenant_photo',
          landlordReadingEnabled: true,
          tenantPhotoEnabled: true
        },
        {
          id: 'meter-3',
          name: 'Elektra',
          type: 'individual',
          unit: 'kWh',
          price_per_unit: 0.23,
          distribution_method: 'per_consumption',
          description: 'Buto elektros suvartojimas',
          is_active: true,
          requires_photo: true,
          collectionMode: 'tenant_photo',
          landlordReadingEnabled: true,
          tenantPhotoEnabled: true
        },
        {
          id: 'meter-4',
          name: 'Šildymas',
          type: 'individual',
          unit: 'kWh',
          price_per_unit: 0.095,
          distribution_method: 'per_area',
          description: 'Centrinis šildymas pagal plotą',
          is_active: true,
          requires_photo: false,
          collectionMode: 'landlord_only',
          landlordReadingEnabled: true,
          tenantPhotoEnabled: false
        },
        {
          id: 'meter-5',
          name: 'Techninė apžiūra',
          type: 'communal',
          unit: 'Kitas',
          price_per_unit: 0,
          fixed_price: 0,
          distribution_method: 'per_apartment',
          description: 'Namo techninė priežiūra ir apžiūra',
          is_active: true,
          requires_photo: false,
          collectionMode: 'landlord_only',
          landlordReadingEnabled: true,
          tenantPhotoEnabled: false
        }
      ];

      setCommunalMeters(defaultMeters);
    };

    // Small delay to ensure state is cleared
    setTimeout(() => {
      loadSmartDefaults();
    }, 100);
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
      // Verify user is authenticated before proceeding
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        alert('Klaida: neesate prisijungę. Prašome prisijungti ir bandyti dar kartą.');
        setIsSubmitting(false);
        return;
      }

      // Patikriname pašto kodą, jei nerandamos koordinatės
      const hasCoordinates = formData.location?.coordinates?.lat && formData.location?.coordinates?.lng;
      const hasPostalCode = formData.location?.postalCode && formData.location.postalCode.length === 5;

      if (!hasCoordinates && !hasPostalCode) {
        alert('Jei nerandamos koordinatės, privalote įvesti pašto kodą.');
        setIsSubmitting(false);
        return;
      }

      // 1. Save address
      // Extract city from form data, or try to parse it from the full address
      const extractCity = (fullAddress: string): string => {
        // Try to extract city from address like "Street 123, City" or "Street 123, City, Country"
        const parts = fullAddress.split(',').map(p => p.trim());
        if (parts.length >= 2) {
          // Usually city is the second part (after street) or last significant part
          return parts[parts.length - 1] || parts[1] || 'Nenurodyta';
        }
        return 'Nenurodyta';
      };

      const city = formData.address.city || extractCity(formData.address.fullAddress);

      const addressData = {
        full_address: formData.address.fullAddress,
        street: formData.address.street,
        house_number: formData.address.houseNumber,
        city: city,
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

      // 1.5 Create address_settings with building info and contacts
      try {
        const addressSettingsData = {
          address_id: address.id,
          building_info: {
            totalApartments: formData.buildingInfo.totalApartments,
            totalFloors: formData.buildingInfo.totalFloors || 1,
            yearBuilt: null,
            buildingType: 'apartment',
            heatingType: 'central',
            parkingSpaces: null
          },
          contact_info: {
            managerName: formData.contacts.contactPerson || '',
            managerPhone: formData.contacts.companyPhone || '',
            managerEmail: formData.contacts.companyEmail || '',
            emergencyContact: '',
            emergencyPhone: ''
          },
          financial_settings: {
            defaultDeposit: 500,
            latePaymentFee: 10,
            gracePeriodDays: 5,
            autoRenewalEnabled: true,
            defaultContractDuration: 12
          },
          notification_settings: {
            rentReminderDays: 3,
            contractExpiryReminderDays: 30,
            meterReminderDays: 5,
            maintenanceNotifications: true
          },
          communal_config: {
            enableMeterEditing: true,
            requirePhotos: true
          }
        };

        const { error: settingsError } = await supabase
          .from('address_settings')
          .insert([addressSettingsData]);

        if (settingsError) {
          console.error('⚠️ Error creating address_settings (non-fatal):', settingsError.message);
          // Non-fatal: address is still created successfully
        } else {
          console.log('✅ Address settings created successfully');
        }
      } catch (settingsErr) {
        console.error('⚠️ Exception creating address_settings (non-fatal):', settingsErr);
        // Non-fatal: continue with address creation
      }

      // 2. Save address meters (defaults for all apartments)
      if (communalMeters.length > 0) {
        // Defensive guard: ensure mutual exclusion of reading toggles before saving
        const metersWithBothEnabled = communalMeters.filter(
          m => m.landlordReadingEnabled && m.tenantPhotoEnabled
        );
        if (metersWithBothEnabled.length > 0) {
          console.warn('⚠️ Found meters with both toggles enabled, auto-fixing to tenant mode:',
            metersWithBothEnabled.map(m => m.name));
          // Auto-fix: prioritize tenant mode when both are enabled
          communalMeters.forEach(m => {
            if (m.landlordReadingEnabled && m.tenantPhotoEnabled) {
              m.landlordReadingEnabled = false;
            }
          });
        }

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
          if (!['per_apartment', 'per_area', 'per_consumption', 'per_person', 'fixed_split'].includes(meter.distribution_method)) {
            console.error(`Invalid distribution method: ${meter.distribution_method} for meter: ${meter.name}`);
            throw new Error(`Invalid distribution method: ${meter.distribution_method}. Must be 'per_apartment', 'per_area', 'per_consumption', 'per_person', or 'fixed_split'`);
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

      // 4. Create apartment meters for each apartment (efficient bulk insert)
      if (apartments && apartments.length > 0 && communalMeters.length > 0) {
        try {
          // Create all apartment meter records in memory using flatMap
          const apartmentMetersData = apartments.flatMap(apartment =>
            communalMeters.map(meter => ({
              property_id: apartment.id,
              name: meter.name,
              type: meter.type,
              unit: meter.unit,
              price_per_unit: meter.price_per_unit || 0,
              fixed_price: meter.fixed_price || 0,
              distribution_method: meter.distribution_method || 'per_apartment',  // Required field
              serial_number: null,
              is_active: meter.is_active ?? true,
              requires_photo: meter.requires_photo ?? true
            }))
          );

          console.log(`📊 Creating ${apartmentMetersData.length} apartment meters (${apartments.length} apartments × ${communalMeters.length} meters)`);

          // Single bulk insert for all apartment meters
          const { error: apartmentMetersError } = await supabase
            .from('apartment_meters')
            .insert(apartmentMetersData);

          if (apartmentMetersError) {
            console.error('⚠️ Error creating apartment meters (non-fatal):');
            console.error('  Message:', apartmentMetersError.message);
            console.error('  Details:', apartmentMetersError.details);
            console.error('  Hint:', apartmentMetersError.hint);
            console.error('  Code:', apartmentMetersError.code);
            console.error('  Full error:', JSON.stringify(apartmentMetersError, null, 2));
            // Non-fatal: address is still created successfully
          } else {
            console.log('✅ Successfully created apartment meters:', apartmentMetersData.length);
          }
        } catch (meterCopyError: any) {
          console.error('⚠️ Exception in apartment meter creation (non-fatal):');
          console.error('  Message:', meterCopyError?.message);
          console.error('  Full error:', meterCopyError);
          // Non-fatal: continue with address creation
        }
      }

      // 5. Add current user to address as landlord
      // NOTE: The database trigger 'addresses_autolink_trigger' automatically creates this link
      // So we only need to do this as a fallback if the trigger didn't work
      try {
        if (user?.id) {
          // Check if link already exists (created by trigger)
          const { data: existingLink } = await supabase
            .from('user_addresses')
            .select('id')
            .eq('user_id', user.id)
            .eq('address_id', address.id)
            .maybeSingle();

          if (!existingLink) {
            // Only insert if link doesn't exist
            const { error: userAddressError } = await supabase
              .from('user_addresses')
              .insert([{
                user_id: user.id,
                address_id: address.id,
                role_at_address: 'landlord',
                role: 'landlord'
              }]);

            if (userAddressError && !userAddressError.message?.includes('duplicate')) {
              console.error('Error adding user to address:', userAddressError);
            }
          } else {
            console.log('✅ User already linked to address (by trigger)');
          }
        }
      } catch (userError) {
        // Ignore duplicate key errors - the trigger already created the link
        const errorMsg = userError instanceof Error ? userError.message : '';
        if (!errorMsg.includes('duplicate')) {
          console.error('Error in user-address assignment:', userError);
        }
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

    } catch (error: any) {
      // Security: Don't log sensitive error details
      if (process.env.NODE_ENV === 'development') {
        console.error('Error saving address:', error);
      }

      // Provide generic error messages to prevent information disclosure
      let errorMessage = 'Klaida išsaugant adresą. Bandykite dar kartą.';

      // Check for Supabase error structure
      const errorCode = error?.code || error?.status || error?.statusCode;
      const errorMsg = error?.message || error?.error?.message || '';

      if (errorCode === 403 || errorCode === 'PGRST301' || errorMsg.includes('403') || errorMsg.includes('permission denied') || errorMsg.includes('row-level security')) {
        errorMessage = 'Klaida: neturite teisių išsaugoti adreso. Prašome:\n1. Patikrinkite, ar esate prisijungę\n2. Jei problema išlieka, atsijunkite ir prisijunkite iš naujo\n3. Jei problema tęsiasi, susisiekite su administratoriumi';
      } else if (errorCode === '23505' || errorCode === 409 || errorMsg.includes('409') || errorMsg.includes('duplicate') || errorMsg.includes('unique') || errorMsg.includes('Conflict')) {
        errorMessage = 'Šis adresas jau egzistuoja jūsų paskyroje. Jei norite pridėti naują butą prie esamo adreso, naudokite "Pridėti butą" funkciją.';
      } else if (errorCode === 400 || errorMsg.includes('400')) {
        errorMessage = 'Klaida: neteisingi duomenys. Patikrinkite visus laukus ir bandykite dar kartą.';
      } else if (errorMsg.includes('requires_photo')) {
        errorMessage = 'Klaida: trūksta duomenų bazės stulpelio. Praneškite administratoriui.';
      } else if (errorMsg.includes('network') || errorMsg.includes('fetch')) {
        errorMessage = 'Klaida: ryšio problema. Patikrinkite interneto ryšį ir bandykite dar kartą.';
      }

      alert(errorMessage);
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
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        {/* Modal Container with Dark B/W Background */}
        <div className="relative rounded-2xl shadow-2xl w-full max-w-[min(100vw-32px,1100px)] max-h-[90vh] flex flex-col border border-white/10 overflow-hidden bg-[#0f1215]">

          {/* Background Image Layer */}
          <div className="absolute inset-0 z-0 pointer-events-none select-none overflow-hidden">
            <img
              src={modalBg}
              alt=""
              loading="lazy"
              className="w-full h-full object-cover opacity-70"
              style={{ objectPosition: 'center 40%' }}
            />
            {/* Dark gradient overlay for readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/15 to-black/35" />
          </div>

          {/* Compact Header */}
          <div className="sticky top-0 z-20 bg-black/60 backdrop-blur-md rounded-t-2xl border-b border-white/10">
            <div className="flex items-center justify-between px-4 py-2">
              {/* Left: Title only */}
              <h2 className="text-[15px] font-bold text-white">Naujas adresas</h2>

              {/* Center: Ultra-compact Stepper */}
              <div className="flex items-center">
                {steps.map((step, i) => (
                  <React.Fragment key={step}>
                    {i > 0 && (
                      <div className={`w-6 h-[2px] ${i <= currentStep ? 'bg-[#2F8481]' : 'bg-white/30'}`} />
                    )}
                    <button
                      onClick={() => setCurrentStep(i)}
                      className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors ${i === currentStep ? 'bg-[#2F8481]/20' : 'hover:bg-white/10'
                        }`}
                      title={step}
                    >
                      <span className={`w-[18px] h-[18px] rounded-full text-[10px] flex items-center justify-center font-bold ${i <= currentStep ? 'bg-[#2F8481] text-white' : 'bg-white/20 text-white/80'
                        }`}>
                        {i < currentStep ? '✓' : i + 1}
                      </span>
                      <span className={`text-[11px] font-semibold hidden md:inline ${i === currentStep ? 'text-[#5bbab7]' : 'text-white/70'
                        }`}>
                        {step}
                      </span>
                    </button>
                  </React.Fragment>
                ))}
              </div>

              {/* Right: Close */}
              <button
                onClick={handleClose}
                className="w-7 h-7 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                aria-label="Uždaryti"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="relative z-10 flex-1 overflow-y-auto px-5 py-4">
            <form onSubmit={handleSubmit(handleFinalSave)} className="space-y-4">

              {/* Step 1: Address */}
              {currentStep === 0 && (
                <div className="space-y-4">
                  {/* Step Header */}
                  <div className="mb-2">
                    <h3 className="text-[16px] font-bold text-white">1. Adresas</h3>
                    <p className="text-[13px] font-medium text-white/80 mt-0.5">
                      Įveskite pilną adresą, kad galėtume nustatyti pastato vietą.
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/95 shadow-md p-5" style={{ backgroundImage: `url(${cardsBg})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
                    <div className="space-y-4">
                      {/* Full Address */}
                      <div>
                        <label className="block text-[13px] font-bold text-gray-700 mb-1.5">
                          Pilnas adresas <span className="text-red-500">*</span>
                        </label>
                        <Controller
                          name="address.fullAddress"
                          control={control}
                          render={({ field }) => (
                            <input
                              {...field}
                              type="text"
                              placeholder="pvz., Mituvos g. 13, Kaunas"
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481] text-[13px] transition-colors ${errors.address?.fullAddress
                                ? 'border-red-300 bg-red-50/30'
                                : 'border-neutral-300'
                                }`}
                            />
                          )}
                        />
                        {errors.address?.fullAddress ? (
                          <p className="text-red-600 text-[12px] mt-1 flex items-center gap-1">
                            <span>⚠</span> Įveskite gatvę ir namo numerį (pvz., „Mituvos g. 13, Kaunas")
                          </p>
                        ) : (
                          <p className="text-gray-500 text-[11px] mt-1">Gatvė, namo numeris, miestas</p>
                        )}
                      </div>

                      {/* Postal Code */}
                      <div>
                        <label className="block text-[13px] font-medium text-gray-700 mb-1">
                          Pašto kodas
                          {!watchedValues.location?.coordinates?.lat && (
                            <span className="text-red-500 ml-1">*</span>
                          )}
                        </label>
                        <Controller
                          name="location.postalCode"
                          control={control}
                          render={({ field }) => (
                            <input
                              {...field}
                              type="text"
                              placeholder="44269"
                              maxLength={5}
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481] text-[13px] transition-colors ${errors.location?.postalCode
                                ? 'border-red-300 bg-red-50/30'
                                : 'border-neutral-300'
                                }`}
                            />
                          )}
                        />
                        {errors.location?.postalCode ? (
                          <p className="text-red-600 text-[12px] mt-1 flex items-center gap-1">
                            <span>⚠</span> {errors.location.postalCode.message}
                          </p>
                        ) : (
                          <p className="text-gray-500 text-[11px] mt-1">
                            {watchedValues.location?.coordinates?.lat
                              ? 'Neprivaloma – koordinatės rastos'
                              : 'Privaloma, jei koordinatės nerandamos automatiškai'}
                          </p>
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
                  {/* Step Header */}
                  <div className="mb-2">
                    <h3 className="text-[16px] font-bold text-white">2. Pastato detalės</h3>
                    <p className="text-[13px] font-medium text-white/80 mt-0.5">
                      Nurodykite pastato tipą ir butų skaičių – tai padės sukurti tinkamą struktūrą.
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/95 shadow-md p-5" style={{ backgroundImage: `url(${cardsBg})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
                    <div className="grid grid-cols-2 gap-4">
                      {/* Building Type */}
                      <div>
                        <label className="block text-[13px] font-bold text-gray-700 mb-1.5">
                          Pastato tipas
                        </label>
                        <Controller
                          name="buildingInfo.buildingType"
                          control={control}
                          render={({ field }) => (
                            <select
                              {...field}
                              className={`w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481] text-[13px] font-medium text-gray-900 ${errors.buildingInfo?.buildingType ? 'border-red-300' : ''
                                }`}
                            >
                              <option value="Daugiabutis">Daugiabutis</option>
                              <option value="Namas">Namas</option>
                              <option value="Kotedžas">Kotedžas</option>
                              <option value="Komercinis">Komercinis pastatas</option>
                              <option value="Kita">Kita</option>
                            </select>
                          )}
                        />
                        {errors.buildingInfo?.buildingType && (
                          <p className="text-red-600 text-[12px] mt-1">{errors.buildingInfo.buildingType.message}</p>
                        )}
                      </div>

                      {/* Total Apartments */}
                      <div>
                        <label className="block text-[13px] font-bold text-gray-700 mb-1.5">
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
                              className={`w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481] text-[13px] font-medium text-gray-900 ${errors.buildingInfo?.totalApartments ? 'border-red-300' : ''
                                }`}
                            />
                          )}
                        />
                        {errors.buildingInfo?.totalApartments && (
                          <p className="text-red-600 text-[12px] mt-1">{errors.buildingInfo.totalApartments.message}</p>
                        )}
                      </div>

                      {/* Floors */}
                      <div>
                        <label className="block text-[13px] font-bold text-gray-700 mb-1.5">
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
                              className={`w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481] text-[13px] font-medium text-gray-900 ${errors.buildingInfo?.floors ? 'border-red-300' : ''
                                }`}
                            />
                          )}
                        />
                        {errors.buildingInfo?.floors && (
                          <p className="text-red-600 text-[12px] mt-1">{errors.buildingInfo.floors.message}</p>
                        )}
                      </div>

                      {/* Year Built */}
                      <div>
                        <label className="block text-[13px] font-bold text-gray-700 mb-1.5">
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
                              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481] text-[13px] font-medium text-gray-900"
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
                  {/* Step Header */}
                  <div className="mb-2">
                    <h3 className="text-[16px] font-bold text-white">3. Kontaktai</h3>
                    <p className="text-[13px] font-medium text-white/80 mt-0.5">
                      Pasirinkite, kas administruoja pastatą. Jei nuomotojas – naudosime jūsų profilio duomenis.
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/95 shadow-md p-5" style={{ backgroundImage: `url(${cardsBg})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
                    <div className="space-y-4">
                      {/* Management Type */}
                      <div>
                        <label className="block text-[13px] font-bold text-gray-700 mb-1.5">
                          Kas administruoja pastatą?
                        </label>
                        <Controller
                          name="contacts.managementType"
                          control={control}
                          render={({ field }) => (
                            <select
                              {...field}
                              className={`w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481] text-[13px] font-medium text-gray-900 ${errors.contacts?.managementType ? 'border-red-300' : ''
                                }`}
                            >
                              <option value="Nuomotojas">Nuomotojas</option>
                              <option value="Bendrija">Bendrija</option>
                              <option value="Administravimo įmonė">Administravimo įmonė</option>
                            </select>
                          )}
                        />
                        {errors.contacts?.managementType && (
                          <p className="text-red-600 text-[12px] mt-1">{errors.contacts.managementType.message}</p>
                        )}
                      </div>

                      {/* Nuomotojas Info */}
                      {watchedValues.contacts?.managementType === 'Nuomotojas' && (
                        <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3.5">
                          <p className="text-[13px] font-medium text-emerald-800 flex items-center gap-2">
                            <span>✓</span> Nuomotojo informacija bus paimta iš jūsų profilio
                          </p>
                        </div>
                      )}

                      {/* Bendrija Info */}
                      {watchedValues.contacts?.managementType === 'Bendrija' && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[13px] font-bold text-gray-700 mb-1.5">
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
                                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481] text-[13px] font-medium text-gray-900"
                                />
                              )}
                            />
                          </div>
                          <div>
                            <label className="block text-[13px] font-bold text-gray-700 mb-1.5">
                              Telefono numeris
                            </label>
                            <Controller
                              name="contacts.chairmanPhone"
                              control={control}
                              render={({ field }) => (
                                <input
                                  {...field}
                                  value={field.value || ''}
                                  type="tel"
                                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481] text-[13px] font-medium text-gray-900"
                                />
                              )}
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-[13px] font-bold text-gray-700 mb-1.5">
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
                                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481] text-[13px] font-medium text-gray-900"
                                />
                              )}
                            />
                          </div>
                        </div>
                      )}

                      {/* Administravimo įmonė Info */}
                      {watchedValues.contacts?.managementType === 'Administravimo įmonė' && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="col-span-2">
                            <label className="block text-[13px] font-bold text-gray-700 mb-1.5">
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
                                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481] text-[13px] font-medium text-gray-900"
                                />
                              )}
                            />
                          </div>
                          <div>
                            <label className="block text-[13px] font-bold text-gray-700 mb-1.5">
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
                                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481] text-[13px] font-medium text-gray-900"
                                />
                              )}
                            />
                          </div>
                          <div>
                            <label className="block text-[13px] font-bold text-gray-700 mb-1.5">
                              Telefono numeris
                            </label>
                            <Controller
                              name="contacts.companyPhone"
                              control={control}
                              render={({ field }) => (
                                <input
                                  {...field}
                                  value={field.value || ''}
                                  type="tel"
                                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481] text-[13px] font-medium text-gray-900"
                                />
                              )}
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-[13px] font-bold text-gray-700 mb-1.5">
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
                                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481] text-[13px] font-medium text-gray-900"
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
                <div className="space-y-4 h-full flex flex-col">
                  {/* Step Header */}
                  <div className="mb-2 shrink-0">
                    <h3 className="text-[16px] font-bold text-white">4. Skaitliukai</h3>
                    <p className="text-[13px] font-medium text-white/80 mt-0.5">
                      Sukonfigūruokite pastato skaitliukus. Galite redaguoti kiekvieną atskirai arba naudoti šablonus.
                    </p>
                  </div>

                  <div className="flex-1 min-h-0">
                    <MetersTable
                      meters={communalMeters}
                      onMetersChange={setCommunalMeters}
                      onPresetApply={(meters) => setCommunalMeters(meters)}
                      onMeterDelete={(id) => {
                        setCommunalMeters(prev => prev.filter(m => m.id !== id));
                      }}
                      onMeterUpdate={(id, updates) => {
                        setCommunalMeters(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
                      }}
                    />
                  </div>
                </div>
              )}


            </form>
          </div>

          {/* Compact Footer */}
          <div className="sticky bottom-0 z-20 bg-black/60 backdrop-blur-md border-t border-white/10 px-4 py-3 flex justify-between items-center rounded-b-2xl">
            <div className="flex items-center gap-1.5">
              {currentStep > 0 && (
                <button
                  type="button"
                  onClick={() => setCurrentStep(currentStep - 1)}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-md transition-colors text-[13px] font-medium"
                >
                  <ArrowLeftIcon className="h-3 w-3" />
                  Atgal
                </button>
              )}
              <button
                type="button"
                onClick={handleClose}
                className="px-2.5 py-1.5 text-white/70 hover:text-white rounded-md transition-colors text-[13px]"
              >
                Atšaukti
              </button>
            </div>

            {/* Step indicator */}
            <div className="text-[11px] text-white/60 hidden sm:block">
              {currentStep + 1} / {steps.length}
            </div>

            <div>
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
                  className="px-4 py-1.5 bg-[#2F8481] text-white hover:bg-[#297a77] disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors text-[13px] font-medium"
                >
                  {currentStep === 0 && 'Tęsti → Pastatas'}
                  {currentStep === 1 && 'Tęsti → Kontaktai'}
                  {currentStep === 2 && 'Tęsti → Skaitliukai'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleFinalSave(watchedValues)}
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-[#2F8481] text-white hover:bg-[#297a77] disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors text-[13px] font-medium inline-flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Kuriama...
                    </>
                  ) : (
                    <>Sukurti {watchedValues.buildingInfo?.totalApartments || 1} butą</>
                  )}
                </button>
              )}
            </div>
          </div>
        </div >
      </div >
    </>
  );
});

AddAddressModal.displayName = 'AddAddressModal';

export default AddAddressModal;
