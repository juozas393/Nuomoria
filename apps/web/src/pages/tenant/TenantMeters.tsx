import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CameraIcon,
  CloudArrowUpIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
  EyeIcon,
  TrashIcon,
  ArrowUpTrayIcon,
  InformationCircleIcon,
  ClockIcon,
  CalendarIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';
// Reads from apartment_meters for the tenant's property, filtered by collection_mode = 'tenant_submits'
import { supabase } from '../../lib/supabase';

interface MeterConfig {
  id: string;
  address_id: string;
  name: string;
  type: 'individual' | 'communal';
  unit: string;
  price_per_unit: number;
  fixed_price?: number;
  distribution_method?: string;
  requires_photo: boolean;
  collection_mode?: string;
  created_at: string;
}

interface MeterReading {
  id: string;
  meterType: 'electricity' | 'water' | 'gas' | 'heating';
  meterConfigId: string;
  previousReading: number;
  currentReading: number;
  date: string;
  photos: string[];
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  lastSubmissionDate?: string;
  submissionDeadline: string;
  meterNumber: string;
  location: string;
  requirePhoto: boolean;
}

interface MeterValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

const TenantMeters: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [meterConfigs, setMeterConfigs] = useState<MeterConfig[]>([]);
  const [readings, setReadings] = useState<MeterReading[]>([]);
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [addressId, setAddressId] = useState<string | null>(null);
  const [selectedMeter, setSelectedMeter] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingPhotos, setUploadingPhotos] = useState<Record<string, boolean>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Fetch meter configurations from address_meters — matching landlord's data source
  useEffect(() => {
    const fetchMeterConfigs = async () => {
      if (!user) return;

      try {
        setIsLoading(true);

        // Priority 1: Use unread meter_reading_request notification data
        // This contains the exact address_id and property_id the landlord targeted
        const { data: notifData } = await supabase
          .from('notifications')
          .select('data')
          .eq('user_id', user.id)
          .eq('kind', 'meter_reading_request')
          .eq('is_read', false)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (notifData?.data?.address_id && notifData?.data?.property_id) {
          setAddressId(notifData.data.address_id);
          setPropertyId(notifData.data.property_id);
          return;
        }

        // Priority 2: tenant_invitations — has exact property mapping
        const { data: invitations } = await supabase
          .from('tenant_invitations')
          .select('property_id, address_id')
          .eq('email', user.email)
          .eq('status', 'accepted')
          .limit(1);

        if (invitations?.[0]) {
          const inv = invitations[0];
          if (inv.property_id) setPropertyId(inv.property_id);
          if (inv.address_id) {
            setAddressId(inv.address_id);
          } else if (inv.property_id) {
            const { data: propData } = await supabase
              .from('properties')
              .select('address_id')
              .eq('id', inv.property_id)
              .single();
            if (propData?.address_id) setAddressId(propData.address_id);
          }
          return;
        }

        // Priority 3: user_addresses fallback
        const { data: userAddrs } = await supabase
          .from('user_addresses')
          .select('address_id')
          .eq('user_id', user.id)
          .eq('role', 'tenant')
          .limit(1);

        if (userAddrs?.[0]) {
          setAddressId(userAddrs[0].address_id);
          const { data: props } = await supabase
            .from('properties')
            .select('id')
            .eq('address_id', userAddrs[0].address_id)
            .limit(1);
          if (props?.[0]?.id) setPropertyId(props[0].id);
        }
      } catch (error) {
        console.error('Error finding tenant property:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMeterConfigs();
  }, [user]);

  // 2. Once we have addressId, fetch meters + notification + readings
  useEffect(() => {
    const fetchMeters = async () => {
      if (!user || !addressId) return;

      try {
        setIsLoading(true);

        // Fetch ALL individual address_meters for this address
        const { data: addrMeters, error: metersError } = await supabase
          .from('address_meters')
          .select('id, address_id, name, type, unit, price_per_unit, fixed_price, distribution_method, requires_photo, is_active, collection_mode, created_at')
          .eq('address_id', addressId)
          .eq('is_active', true)
          .eq('type', 'individual');

        if (metersError || !addrMeters || addrMeters.length === 0) {
          setIsLoading(false);
          return;
        }

        // Fetch the latest unread meter_reading_request notification
        const { data: notifData } = await supabase
          .from('notifications')
          .select('data, created_at')
          .eq('user_id', user.id)
          .eq('kind', 'meter_reading_request')
          .eq('is_read', false)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        // Extract deadline and requested meter IDs from notification
        const notifDeadline = notifData?.data?.deadline;
        const notifMeterIds: string[] = (notifData?.data?.meters || []).map((m: any) => m.id);

        // Filter meters: if we have a notification, show only those meters; otherwise show all individual
        const metersToShow = notifMeterIds.length > 0
          ? addrMeters.filter(m => notifMeterIds.includes(m.id))
          : addrMeters;

        setMeterConfigs(metersToShow as unknown as MeterConfig[]);

        // Get last readings for each meter
        const readingsPromises = metersToShow.map(async (config: any) => {
          const { data: lastReading } = await supabase
            .from('meter_readings')
            .select('current_reading, reading_date')
            .eq('meter_id', config.id)
            .eq('property_id', propertyId || '')
            .order('reading_date', { ascending: false })
            .limit(1)
            .maybeSingle();

          // Also try without property_id filter (address-level meters)
          if (!lastReading) {
            const { data: fallbackReading } = await supabase
              .from('meter_readings')
              .select('current_reading, reading_date')
              .eq('meter_id', config.id)
              .order('reading_date', { ascending: false })
              .limit(1)
              .maybeSingle();

            return {
              config,
              lastReading: fallbackReading?.current_reading || 0,
              lastDate: fallbackReading?.reading_date
            };
          }

          return {
            config,
            lastReading: lastReading?.current_reading || 0,
            lastDate: lastReading?.reading_date
          };
        });

        const readingsData = await Promise.all(readingsPromises);

        // Build deadline from notification or end of current month
        const now = new Date();
        const deadline = notifDeadline || new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

        const allReadings: MeterReading[] = readingsData.map((rd, index: number) => ({
          id: `reading-${index + 1}`,
          meterType: mapMeterType(rd.config.name),
          meterConfigId: rd.config.id,
          previousReading: Number(rd.lastReading),
          currentReading: 0,
          date: new Date().toISOString().split('T')[0],
          photos: [],
          status: 'pending',
          submissionDeadline: deadline,
          meterNumber: rd.config.name,
          location: '',
          requirePhoto: rd.config.requires_photo || false
        }));

        setReadings(allReadings);

      } catch (error) {
        console.error('Error fetching meter configurations:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMeters();
  }, [user, addressId, propertyId]);

  // Helper function to map meter name to UI type
  const mapMeterType = (name: string): 'electricity' | 'water' | 'gas' | 'heating' => {
    const lower = (name || '').toLowerCase();
    if (lower.includes('elektr')) return 'electricity';
    if (lower.includes('vand') || lower.includes('water')) return 'water';
    if (lower.includes('duj') || lower.includes('gas')) return 'gas';
    if (lower.includes('šild') || lower.includes('heat')) return 'heating';
    return 'electricity';
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const getMeterTypeInfo = (type: string) => {
    const types = {
      electricity: {
        name: 'Elektros skaitliukas',
        icon: '⚡',
        color: 'yellow',
        unit: 'kWh',
        description: 'Elektros energijos suvartojimas',
        averageMonthly: 300, // kWh per mėnesį
        maxReasonable: 800, // maksimalus protingas suvartojimas
        minReasonable: 50    // minimalus protingas suvartojimas
      },
      water: {
        name: 'Vandens skaitliukas',
        icon: '💧',
        color: 'blue',
        unit: 'm³',
        description: 'Vandens suvartojimas',
        averageMonthly: 12,  // m³ per mėnesį
        maxReasonable: 30,   // maksimalus protingas suvartojimas
        minReasonable: 2     // minimalus protingas suvartojimas
      },
      gas: {
        name: 'Dujų skaitliukas',
        icon: '🔥',
        color: 'orange',
        unit: 'm³',
        description: 'Dujų suvartojimas',
        averageMonthly: 45,  // m³ per mėnesį
        maxReasonable: 120,  // maksimalus protingas suvartojimas
        minReasonable: 10    // minimalus protingas suvartojimas
      },
      heating: {
        name: 'Šildymo skaitliukas',
        icon: '🌡️',
        color: 'red',
        unit: 'kWh',
        description: 'Šildymo energijos suvartojimas',
        averageMonthly: 500, // kWh per mėnesį
        maxReasonable: 1500, // maksimalus protingas suvartojimas
        minReasonable: 100   // minimalus protingas suvartojimas
      }
    };
    return types[type as keyof typeof types];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved': return 'Patvirtinta';
      case 'rejected': return 'Atmesta';
      default: return 'Laukiama';
    }
  };

  const validateMeterReading = (reading: MeterReading): MeterValidation => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const meterInfo = getMeterTypeInfo(reading.meterType);

    // Check if current reading is entered
    if (reading.currentReading === 0) {
      errors.push('Dabartinis rodmuo yra privalomas');
    }

    // Check if current reading is less than previous
    if (reading.currentReading < reading.previousReading) {
      errors.push('Dabartinis rodmuo negali būti mažesnis už ankstesnį');
    }

    // Check if photos are uploaded (only for meters that require photos)
    if (reading.requirePhoto && reading.photos.length === 0) {
      errors.push('Skaitliuko nuotrauka yra privaloma');
    }

    // Calculate consumption
    const consumption = reading.currentReading - reading.previousReading;

    // Check for negative consumption (impossible)
    if (consumption < 0) {
      errors.push('Sunaudojimas negali būti neigiamas');
    }

    // Check for unreasonably low consumption
    if (consumption > 0 && consumption < meterInfo.minReasonable) {
      warnings.push(`${meterInfo.name}: Suvartojimas atrodo per mažas (${consumption} ${meterInfo.unit})`);
    }

    // Check for unreasonably high consumption
    if (consumption > meterInfo.maxReasonable) {
      warnings.push(`${meterInfo.name}: Suvartojimas atrodo per didelis (${consumption} ${meterInfo.unit})`);
    }

    // Check for zero consumption (suspicious)
    if (consumption === 0 && reading.currentReading > 0) {
      warnings.push(`${meterInfo.name}: Suvartojimas lygus nuliui - patikrinkite rodmenis`);
    }

    // Check for consumption much higher than average
    if (consumption > meterInfo.averageMonthly * 1.5) {
      warnings.push(`${meterInfo.name}: Suvartojimas ${Math.round((consumption / meterInfo.averageMonthly) * 100)}% didesnis už vidutinį`);
    }

    // Check deadline
    const deadline = new Date(reading.submissionDeadline);
    const daysUntilDeadline = Math.ceil((deadline.getTime() - currentTime.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilDeadline < 0) {
      errors.push('Pateikimo terminas praėjo');
    } else if (daysUntilDeadline <= 3) {
      warnings.push(`Pateikimo terminas baigiasi už ${daysUntilDeadline} dienų`);
    }

    // Check for suspicious patterns
    if (consumption > 0) {
      const dailyAverage = consumption / 30;

      // Check for extremely high daily consumption
      if (dailyAverage > meterInfo.maxReasonable / 30) {
        warnings.push(`${meterInfo.name}: Vidutinis dienos suvartojimas atrodo neįprastai didelis`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  };

  const handleReadingChange = (meterId: string, value: string) => {
    const newValue = parseFloat(value) || 0;

    setReadings(prev => prev.map(meter =>
      meter.id === meterId
        ? { ...meter, currentReading: newValue }
        : meter
    ));
  };

  const handlePhotoUpload = async (meterId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !user) return;

    setUploadingPhotos(prev => ({ ...prev, [meterId]: true }));

    try {
      const uploadedUrls: string[] = [];

      for (const file of Array.from(files)) {
        // Generate unique filename
        const ext = file.name.split('.').pop() || 'jpg';
        const fileName = `${user.id}/${meterId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('meter-readings')
          .upload(fileName, file, { cacheControl: '3600', upsert: false });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from('meter-readings')
          .getPublicUrl(fileName);

        if (urlData?.publicUrl) {
          uploadedUrls.push(urlData.publicUrl);
        }
      }

      if (uploadedUrls.length > 0) {
        setReadings(prev => prev.map(meter =>
          meter.id === meterId
            ? { ...meter, photos: [...meter.photos, ...uploadedUrls] }
            : meter
        ));
      }
    } catch (err) {
      console.error('Photo upload failed:', err);
    } finally {
      setUploadingPhotos(prev => ({ ...prev, [meterId]: false }));
      // Reset file input
      const inputRef = fileInputRefs.current[meterId];
      if (inputRef) inputRef.value = '';
    }
  };

  const removePhoto = (meterId: string, photoIndex: number) => {
    setReadings(prev => prev.map(meter =>
      meter.id === meterId
        ? { ...meter, photos: meter.photos.filter((_, index) => index !== photoIndex) }
        : meter
    ));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    // Validate all readings
    const validations = readings.map(reading => validateMeterReading(reading));
    const hasErrors = validations.some(v => !v.isValid);

    if (hasErrors) {
      alert('Prašome ištaisyti klaidas prieš pateikiant rodmenis');
      setIsSubmitting(false);
      return;
    }

    try {
      // Insert real meter readings into the database
      const readingsToInsert = readings.map(reading => {
        const consumption = reading.currentReading - reading.previousReading;
        const config = meterConfigs.find(c => c.id === reading.meterConfigId);
        const pricePerUnit = config?.price_per_unit || 0;
        const fixedPrice = config?.fixed_price || 0;
        const totalSum = fixedPrice > 0 ? fixedPrice : consumption * pricePerUnit;
        const meterType = config?.distribution_method === 'per_consumption' ? 'apartment' : 'address';

        return {
          property_id: propertyId,
          meter_id: reading.meterConfigId,
          meter_type: meterType,
          type: mapMeterTypeToDbType(reading.meterType, reading.meterConfigId),
          reading_date: reading.date,
          previous_reading: reading.previousReading,
          current_reading: reading.currentReading,
          difference: consumption,
          price_per_unit: pricePerUnit,
          total_sum: totalSum,
          amount: totalSum,
          notes: `Nuomininko pateiktas rodmuo`,
          photo_urls: reading.photos.length > 0 ? reading.photos : [],
          submitted_by: user?.id,
        };
      });

      const { error } = await supabase
        .from('meter_readings')
        .insert(readingsToInsert);

      if (error) {
        console.error('Error submitting readings:', error);
        alert(`Klaida pateikiant rodmenis: ${error.message}`);
        setIsSubmitting(false);
        return;
      }

      // Send notification to landlord
      if (addressId) {
        try {
          // Find the landlord via addresses.created_by (tenant can read this via RLS)
          const { data: addressData } = await supabase
            .from('addresses')
            .select('created_by')
            .eq('id', addressId)
            .single();

          if (addressData?.created_by) {
            const now = new Date();
            const periodLabel = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

            await supabase.from('notifications').insert({
              user_id: addressData.created_by,
              kind: 'meter_readings_submitted',
              title: 'Nuomininkas pateikė skaitliukų rodmenis',
              body: `Gauti skaitliukų rodmenys už ${periodLabel}. ${readings.length} skaitliukai pateikti.`,
              data: {
                address_id: addressId,
                property_id: propertyId,
                meter_count: readings.length,
                period: periodLabel,
                submitted_by: user?.id,
              },
            });
          }
        } catch (notifErr) {
          console.error('Failed to notify landlord:', notifErr);
          // Non-blocking — readings already saved
        }
      }

      // Mark tenant's meter_reading_request notifications as read
      if (user?.id) {
        await supabase
          .from('notifications')
          .update({ is_read: true, read_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .eq('kind', 'meter_reading_request')
          .eq('is_read', false);
      }

      // Update status to approved
      setReadings(prev => prev.map(meter => ({
        ...meter,
        status: 'approved' as const,
        lastSubmissionDate: new Date().toISOString()
      })));

      setIsSubmitting(false);
      setShowSuccess(true);
    } catch (error) {
      console.error('Error submitting readings:', error);
      alert('Klaida pateikiant rodmenis. Bandykite dar kartą.');
      setIsSubmitting(false);
    }
  };

  // Map UI meter type back to DB type column value using meter name
  const mapMeterTypeToDbType = (uiType: string, configId: string): string => {
    const config = meterConfigs.find(c => c.id === configId);
    if (!config) return uiType;
    return mapMeterType(config.name);
  };

  const canSubmit = readings.every(reading => {
    const validation = validateMeterReading(reading);
    return validation.isValid;
  });

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getDaysUntilDeadline = (deadline: string) => {
    const deadlineDate = new Date(deadline);
    return Math.ceil((deadlineDate.getTime() - currentTime.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getConsumptionColor = (consumption: number, meterType: string) => {
    const meterInfo = getMeterTypeInfo(meterType);
    const ratio = consumption / meterInfo.averageMonthly;

    if (ratio < 0.5) return 'text-blue-600';
    if (ratio > 1.5) return 'text-orange-600';
    if (ratio > 2) return 'text-red-600';
    return 'text-green-600';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page subheader */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 py-4">
            <button
              onClick={() => navigate('/tenant')}
              className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
            </button>
            <div className="w-8 h-8 bg-[#2F8481] rounded-lg flex items-center justify-center">
              <DocumentTextIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Skaitliukai</h1>
              <p className="text-sm text-gray-500">Pateikite savo skaitliukų rodmenis</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2F8481] mx-auto mb-4"></div>
            <p className="text-gray-600">Kraunama skaitliukų informacija...</p>
          </div>
        ) : readings.length === 0 ? (
          <div className="text-center py-12">
            <InformationCircleIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nėra skaitliukų, kuriems reikia rodmenų</h3>
            <p className="text-gray-600">
              Jūsų nuomotojas nėra sukonfigūravęs skaitliukų, kuriems reikia rodmenų nuotraukų.
            </p>
          </div>
        ) : (
          <>
            {/* Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <InformationCircleIcon className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-medium text-blue-900 mb-1">
                    Skaitliukai
                  </h3>
                  <p className="text-sm text-blue-700">
                    Pateikite tik tuos skaitliukus, kuriems reikia rodmenų nuotraukų.
                    Bendri skaitliukai (internetas, šiukšlės) skaičiuojami automatiškai.
                  </p>
                </div>
              </div>
            </div>

            {/* Success Message */}
            {showSuccess && (
              <div className="mb-6 bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <CheckCircleIcon className="w-7 h-7 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-emerald-900">Rodmenys sėkmingai pateikti!</h3>
                    <p className="text-sm text-emerald-700 mt-1">Nuomotojas gavo pranešimą ir peržiūrės jūsų rodmenis. Galite grįžti atgal.</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/tenant')}
                  className="mt-4 w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <ArrowLeftIcon className="w-5 h-5" />
                  Grįžti į pagrindinį puslapį
                </button>
              </div>
            )}

            {/* Meters Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {readings.map((meter) => {
                const meterInfo = getMeterTypeInfo(meter.meterType);
                const consumption = meter.currentReading - meter.previousReading;
                const validation = validateMeterReading(meter);
                const daysUntilDeadline = getDaysUntilDeadline(meter.submissionDeadline);
                const consumptionColor = getConsumptionColor(consumption, meter.meterType);

                return (
                  <div key={meter.id} className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                    {/* Header */}
                    <div className="p-6 border-b border-gray-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-3 rounded-xl bg-${meterInfo.color}-100`}>
                            <span className="text-2xl">{meterInfo.icon}</span>
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-gray-900">{meterInfo.name}</h3>
                            <p className="text-sm text-gray-500">{meterInfo.description}</p>
                            <p className="text-xs text-gray-400">Skaitliukas: {meter.meterNumber}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(meter.status)}`}>
                            {getStatusText(meter.status)}
                          </span>
                          <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                            <ClockIcon className="w-3 h-3" />
                            <span>{daysUntilDeadline > 0 ? `${daysUntilDeadline} d.` : 'Terminas praėjo'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Validation Errors */}
                    {validation.errors.length > 0 && (
                      <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                        <div className="flex items-start gap-2">
                          <ExclamationTriangleIcon className="w-4 h-4 text-red-600 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-red-800">Klaidos:</p>
                            <ul className="text-xs text-red-700 mt-1 space-y-1">
                              {validation.errors.map((error, index) => (
                                <li key={index}>• {error}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Validation Warnings */}
                    {validation.warnings.length > 0 && (
                      <div className="mx-6 mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                        <div className="flex items-start gap-2">
                          <ExclamationTriangleIcon className="w-4 h-4 text-yellow-600 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-yellow-800">Įspėjimai:</p>
                            <ul className="text-xs text-yellow-700 mt-1 space-y-1">
                              {validation.warnings.map((warning, index) => (
                                <li key={index}>• {warning}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Reading Form */}
                    <div className="p-6 space-y-6">
                      {/* Previous Reading */}
                      <div className="bg-gray-50 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <label className="text-sm text-gray-500 mb-1 block">Ankstesnis rodmuo</label>
                            <div className="relative">
                              <input
                                type="number"
                                value={meter.previousReading || ''}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setReadings(prev => prev.map(r =>
                                    r.id === meter.id ? { ...r, previousReading: val } : r
                                  ));
                                }}
                                disabled={showSuccess}
                                className={`w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500/40 focus:border-transparent transition-colors duration-200 text-xl font-bold text-gray-900 bg-white ${showSuccess ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                                placeholder="0"
                                min="0"
                                step="0.01"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                                {meterInfo.unit}
                              </span>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">
                              {meter.previousReading === 0 ? 'Nėra ankstesnių duomenų — galite įvesti rankiniu būdu' : 'Automatiškai užpildyta iš praeito mėnesio'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Current Reading Input */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Dabartinis rodmuo *
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            value={meter.currentReading || ''}
                            onChange={(e) => handleReadingChange(meter.id, e.target.value)}
                            disabled={showSuccess}
                            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 text-2xl font-bold ${showSuccess
                              ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                              : validation.errors.some(e => e.includes('rodmuo'))
                                ? 'border-red-300 bg-red-50'
                                : 'border-gray-300'
                              }`}
                            placeholder="0"
                            min={meter.previousReading}
                            step="0.01"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                            {meterInfo.unit}
                          </span>
                        </div>
                      </div>

                      {/* Consumption Display */}
                      {meter.currentReading > 0 && (
                        <div className="bg-[#E8F5F4] rounded-xl p-4 border border-[#2F8481]/20">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-blue-600">Sunaudota per mėnesį</p>
                              <p className={`text-2xl font-bold ${consumptionColor}`}>
                                {consumption.toLocaleString()} {meterInfo.unit}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-blue-600">Vidutiniškai per dieną</p>
                              <p className="text-lg font-semibold text-blue-900">
                                {(consumption / 30).toFixed(1)} {meterInfo.unit}
                              </p>
                            </div>
                          </div>

                          {/* Consumption Analysis */}
                          <div className="mt-3 pt-3 border-t border-blue-200">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-600">Vidutinis mėnesinis suvartojimas:</span>
                              <span className="font-medium">{meterInfo.averageMonthly} {meterInfo.unit}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs mt-1">
                              <span className="text-gray-600">Jūsų suvartojimas:</span>
                              <span className={`font-medium ${consumptionColor}`}>
                                {consumption} {meterInfo.unit} ({Math.round((consumption / meterInfo.averageMonthly) * 100)}%)
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Photo Upload - only show if meter requires photo */}
                      {meter.requirePhoto && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Skaitliuko nuotrauka *
                          </label>
                          <div
                            onClick={() => fileInputRefs.current[meter.id]?.click()}
                            className={`border-2 border-dashed rounded-xl p-6 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors duration-200 cursor-pointer ${validation.errors.some(e => e.includes('nuotrauka'))
                              ? 'border-red-300 bg-red-50'
                              : 'border-gray-300'
                              }`}
                          >
                            <input
                              ref={el => { fileInputRefs.current[meter.id] = el; }}
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={(e) => handlePhotoUpload(meter.id, e)}
                              className="hidden"
                            />
                            {uploadingPhotos[meter.id] ? (
                              <>
                                <div className="w-12 h-12 border-3 border-[#2F8481] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                                <p className="text-gray-600 font-medium mb-2">Įkeliama nuotrauka...</p>
                              </>
                            ) : (
                              <>
                                <CameraIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                <p className="text-gray-600 font-medium mb-2">Nufotografuokite skaitliuką</p>
                                <p className="text-sm text-gray-500">Arba nuvilkite nuotrauką čia</p>
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Photo Preview - only show if meter requires photo and has photos */}
                      {meter.requirePhoto && meter.photos.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">
                            Nuotraukos ({meter.photos.length})
                          </p>
                          <div className="grid grid-cols-2 gap-3">
                            {meter.photos.map((photo, index) => (
                              <div key={index} className="relative group">
                                <img
                                  src={photo}
                                  alt={`Skaitliukas ${index + 1}`}
                                  className="w-full h-32 object-cover rounded-lg"
                                />
                                <button
                                  onClick={() => removePhoto(meter.id, index)}
                                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                >
                                  <TrashIcon className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Info note for meters that don't require photos */}
                      {!meter.requirePhoto && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <div className="flex items-center space-x-2">
                            <CheckCircleIcon className="w-5 h-5 text-green-600" />
                            <span className="text-sm font-medium text-green-800">
                              Šiam skaitliukui nuotrauka nereikalinga
                            </span>
                          </div>
                          <p className="text-xs text-green-600 mt-1">
                            Užtenka tik įrašyti dabartinį rodmenį
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Submit / Return Section */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              {showSuccess ? (
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <CheckCircleIcon className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-emerald-800">Visi rodmenys pateikti</h3>
                    <p className="text-sm text-emerald-600">{readings.length} skaitliukai sėkmingai išsiųsti</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Pateikti rodmenis</h3>
                    <p className="text-sm text-gray-500">
                      {readings.filter(r => {
                        const validation = validateMeterReading(r);
                        return validation.isValid;
                      }).length} / {readings.length} skaitliukai paruošti
                    </p>
                  </div>
                  <button
                    onClick={handleSubmit}
                    disabled={!canSubmit || isSubmitting}
                    className="group relative px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium rounded-xl hover:shadow-lg transition-colors duration-200 overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
                    <span className="relative flex items-center gap-2">
                      {isSubmitting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Siunčiama...
                        </>
                      ) : (
                        <>
                          <ArrowUpTrayIcon className="w-5 h-5" />
                          Pateikti Rodmenis
                        </>
                      )}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TenantMeters; 