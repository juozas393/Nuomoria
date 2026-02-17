import React, { useState, useRef, useEffect } from 'react';
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
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';
import { propertyMeterConfigsApi } from '../../lib/api';
import { supabase } from '../../lib/supabase';

interface MeterConfig {
  id: string;
  property_id: string;
  meter_type: 'electricity' | 'water_cold' | 'water_hot' | 'gas' | 'heating' | 'internet' | 'garbage' | 'custom';
  custom_name?: string;
  unit: 'm3' | 'kWh' | 'GJ' | 'MB' | 'fixed';
  tariff: 'single' | 'day_night' | 'peak_offpeak';
  price_per_unit: number;
  fixed_price?: number;
  initial_reading?: number;
  initial_date?: string;
  require_photo: boolean;
  require_serial: boolean;
  serial_number?: string;
  provider?: string;
  status: 'active' | 'inactive' | 'maintenance';
  notes?: string;
  created_at: string;
  updated_at: string;
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
  const { user, logout } = useAuth();
  const [meterConfigs, setMeterConfigs] = useState<MeterConfig[]>([]);
  const [readings, setReadings] = useState<MeterReading[]>([]);
  const [selectedMeter, setSelectedMeter] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch meter configurations for the tenant's property
  useEffect(() => {
    const fetchMeterConfigs = async () => {
      if (!user) return;

      try {
        setIsLoading(true);

        // Get tenant's property ID from user_addresses table
        console.log('🔍 Fetching property for user:', user.id);

        // First get user's address association
        const { data: userAddresses, error: addressError } = await supabase
          .from('user_addresses')
          .select('address_id')
          .eq('user_id', user.id)
          .eq('role', 'tenant')
          .single();

        if (addressError || !userAddresses) {
          console.log('❌ No address found for tenant:', addressError);
          setIsLoading(false);
          return;
        }

        // Then get any property from that address for demo
        const { data: properties, error: propertyError } = await supabase
          .from('properties')
          .select('id')
          .eq('address_id', userAddresses.address_id)
          .limit(1)
          .single();

        if (propertyError || !properties) {
          console.log('❌ No property found for address:', propertyError);
          setIsLoading(false);
          return;
        }

        const propertyId = properties.id;
        console.log('✅ Found property ID for tenant:', propertyId);

        try {
          const configs = await propertyMeterConfigsApi.getByPropertyId(propertyId);

          setMeterConfigs(configs || []);

          // Create readings for ALL meters (photo required and not required)
          const allReadings: MeterReading[] = (configs || []).map((config: MeterConfig, index: number) => ({
            id: `reading-${index + 1}`,
            meterType: mapMeterType(config.meter_type),
            meterConfigId: config.id,
            previousReading: config.initial_reading || 0,
            currentReading: 0,
            date: new Date().toISOString().split('T')[0],
            photos: [],
            status: 'pending',
            submissionDeadline: '2024-01-31', // TODO: Calculate based on billing cycle
            meterNumber: config.serial_number || `${config.meter_type.toUpperCase()}-${index + 1}`,
            location: 'Butas 15, Vilniaus g. 15', // TODO: Get from property info
            requirePhoto: config.require_photo
          }));

          setReadings(allReadings);

        } catch (error) {
          console.error('Error fetching meter configurations:', error);
        }

      } catch (error) {
        console.error('Error fetching meter configurations:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMeterConfigs();
  }, [user]);

  // Helper function to map database meter types to UI types
  const mapMeterType = (dbType: string): 'electricity' | 'water' | 'gas' | 'heating' => {
    switch (dbType) {
      case 'electricity': return 'electricity';
      case 'water_cold':
      case 'water_hot': return 'water';
      case 'gas': return 'gas';
      case 'heating': return 'heating';
      default: return 'electricity';
    }
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

  const handlePhotoUpload = (meterId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const uploadPromises = Array.from(files).map((file) => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(uploadPromises).then((imageUrls) => {
      setReadings(prev => prev.map(meter =>
        meter.id === meterId
          ? { ...meter, photos: [...meter.photos, ...imageUrls] }
          : meter
      ));
    });
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

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Update status to approved
    setReadings(prev => prev.map(meter => ({
      ...meter,
      status: 'approved' as const,
      lastSubmissionDate: new Date().toISOString()
    })));

    setIsSubmitting(false);
    setShowSuccess(true);

    setTimeout(() => setShowSuccess(false), 5000);
  };

  const canSubmit = readings.every(reading => {
    const validation = validateMeterReading(reading);
    return validation.isValid;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('lt-LT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#2F8481] rounded-lg flex items-center justify-center">
                <DocumentTextIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Skaitliukai</h1>
                <p className="text-sm text-gray-500">Pateikite savo skaitliukų rodmenis</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowRightOnRectangleIcon className="w-4 h-4" />
              <span className="text-sm">Atsijungti</span>
            </button>
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
              <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <CheckCircleIcon className="w-5 h-5 text-green-600" />
                  <div>
                    <h3 className="font-medium text-green-900">Skaitliukai sėkmingai pateikti!</h3>
                    <p className="text-sm text-green-700">Jūsų skaitliukai buvo išsiųsti ir bus peržiūrėti.</p>
                  </div>
                </div>
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
                          <div>
                            <p className="text-sm text-gray-500">Ankstesnis rodmuo</p>
                            <p className="text-2xl font-bold text-gray-900">
                              {meter.previousReading.toLocaleString()} {meterInfo.unit}
                            </p>
                          </div>
                          <CheckCircleIcon className="w-8 h-8 text-green-500" />
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
                            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 text-2xl font-bold ${validation.errors.some(e => e.includes('rodmuo'))
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
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-xl p-6 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors duration-200 cursor-pointer ${validation.errors.some(e => e.includes('nuotrauka'))
                                ? 'border-red-300 bg-red-50'
                                : 'border-gray-300'
                              }`}
                          >
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/*"
                              onChange={(e) => handlePhotoUpload(meter.id, e)}
                              className="hidden"
                            />
                            <CameraIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600 font-medium mb-2">Nufotografuokite skaitliuką</p>
                            <p className="text-sm text-gray-500">Arba nuvilkite nuotrauką čia</p>
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
                              Šiam skaitlikliui nuotrauka nereikalinga
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

            {/* Submit Button */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
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
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TenantMeters; 