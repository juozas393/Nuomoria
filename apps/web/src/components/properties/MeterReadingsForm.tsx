import React, { useState, useEffect } from 'react';
import LtDateInput from '../ui/LtDateInput';
import {
  CameraIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
  ArrowUpTrayIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { PropertyMeterConfig, MeterReading, ReadingStatus, getMeterIcon, getMeterName, getUnitLabel, formatCurrency } from '../../types/meters';

interface MeterReadingsFormProps {
  propertyId: string;
  meterConfigs: PropertyMeterConfig[];
  existingReadings?: MeterReading[];
  onSubmit: (readings: MeterReading[]) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

interface FormReading {
  id: string;
  meter_config_id: string;
  meter_config: PropertyMeterConfig;
  previous_reading: number;
  current_reading: number;
  consumption?: number;
  reading_date: string;
  photos: string[];
  notes: string;
  status: ReadingStatus;
  error?: string;
  // Legacy field for backward compatibility
  difference?: number;
}

export function MeterReadingsForm({
  propertyId,
  meterConfigs,
  existingReadings = [],
  onSubmit,
  onCancel,
  isSubmitting = false
}: MeterReadingsFormProps) {
  const [readings, setReadings] = useState<FormReading[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    // Initialize form readings from meter configs - only those that require photos
    const initialReadings: FormReading[] = meterConfigs
      .filter(config => config.status === 'active' && config.require_photo) // Only active meters that require photos
      .map(config => {
        const existingReading = existingReadings.find(r => r.meter_config_id === config.id);

        return {
          id: existingReading?.id || `temp_${Date.now()}_${config.id}`,
          meter_config_id: config.id,
          meter_config: config,
          previous_reading: existingReading?.previous_reading || config.initial_reading || 0,
          current_reading: existingReading?.current_reading || 0,
          consumption: existingReading?.consumption || existingReading?.difference || 0,
          reading_date: existingReading?.reading_date || new Date().toISOString().split('T')[0],
          photos: existingReading?.photos || [],
          notes: existingReading?.notes || '',
          status: existingReading?.status || 'pending'
        };
      });

    setReadings(initialReadings);
  }, [meterConfigs, existingReadings]);

  const updateReading = (id: string, field: keyof FormReading, value: any) => {
    setReadings(prev => prev.map(reading => {
      if (reading.id === id) {
        const updated = { ...reading, [field]: value };

        // Recalculate consumption if readings changed
        if (field === 'current_reading' || field === 'previous_reading') {
          updated.consumption = updated.current_reading - updated.previous_reading;
        }

        return updated;
      }
      return reading;
    }));
  };

  const validateReadings = (): boolean => {
    setIsValidating(true);
    const newErrors: Record<string, string> = {};

    readings.forEach(reading => {
      const config = reading.meter_config;

      // Check if current reading is entered
      if (reading.current_reading === 0) {
        newErrors[reading.id] = 'Dabartinis rodmuo yra privalomas';
      }

      // Check if current reading is less than previous
      if (reading.current_reading < reading.previous_reading) {
        newErrors[reading.id] = 'Dabartinis rodmuo negali būti mažesnis už ankstesnį';
      }

      // Check if photos are required and uploaded
      if (config.require_photo && reading.photos.length === 0) {
        newErrors[reading.id] = 'Skaitliuko nuotrauka yra privaloma';
      }

      // Check if serial number is required
      if (config.require_serial && !config.serial_number) {
        newErrors[reading.id] = 'Serijos numeris yra privalomas';
      }

      // Check for unreasonable consumption
      const consumption = reading.current_reading - reading.previous_reading;
      if (consumption < 0) {
        newErrors[reading.id] = 'Sunaudojimas negali būti neigiamas';
      }

      // Check for zero consumption (might be suspicious)
      if (consumption === 0 && reading.current_reading > 0) {
        newErrors[reading.id] = 'Sunaudojimas lygus nuliui - patikrinkite rodmenis';
      }
    });

    setErrors(newErrors);
    setIsValidating(false);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateReadings()) return;

    const readingsToSubmit: MeterReading[] = readings.map(reading => ({
      id: reading.id,
      meterId: reading.meter_config_id,
      propertyId: propertyId,
      reading: reading.current_reading,
      date: reading.reading_date,
      photoUrl: reading.photos[0],
      status: reading.status,
      createdAt: new Date().toISOString(),
      // Legacy fields for backward compatibility
      property_id: propertyId,
      meter_config_id: reading.meter_config_id,
      previous_reading: reading.previous_reading,
      current_reading: reading.current_reading,
      consumption: reading.consumption ?? reading.difference ?? 0,
      reading_date: reading.reading_date,
      submission_date: new Date().toISOString(),
      photos: reading.photos,
      notes: reading.notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    await onSubmit(readingsToSubmit);
  };

  const getMeterIcon = (type: string) => {
    switch (type) {
      case 'electricity': return '⚡';
      case 'water_cold': return '🌊';
      case 'water_hot': return '🔥';
      case 'gas': return '🔥';
      case 'heating': return '🔥';
      case 'internet': return '🌐';
      case 'garbage': return '🗑️';
      case 'custom': return '⚙️';
      default: return '📊';
    }
  };

  const getMeterName = (config: PropertyMeterConfig) => {
    if (config.meter_type === 'custom' && config.custom_name) {
      return config.custom_name;
    }

    switch (config.meter_type) {
      case 'electricity': return 'Elektra';
      case 'water_cold': return 'Šaltas vanduo';
      case 'water_hot': return 'Karštas vanduo';
      case 'gas': return 'Dujos';
      case 'heating': return 'Šildymas';
      case 'internet': return 'Internetas';
      case 'garbage': return 'Šiukšlių išvežimas';
      default: return 'Skaitliukas';
    }
  };

  const getUnitLabel = (unit: string) => {
    switch (unit) {
      case 'm3': return 'm³';
      case 'kWh': return 'kWh';
      case 'GJ': return 'GJ';
      case 'Kitas': return 'Kitas';
      default: return unit;
    }
  };

  const calculateCost = (reading: FormReading) => {
    const config = reading.meter_config;
    if (config.fixed_price) {
      return config.fixed_price;
    }
    return ((reading.consumption ?? reading.difference) || 0) * (config.price_per_unit || 0);
  };

  const handlePhotoUpload = (readingId: string, files: FileList) => {
    // In a real app, you'd upload to cloud storage
    const newPhotos = Array.from(files).map(file => URL.createObjectURL(file));
    updateReading(readingId, 'photos', newPhotos);
  };

  const removePhoto = (readingId: string, photoIndex: number) => {
    setReadings(prev => prev.map(reading => {
      if (reading.id === readingId) {
        const newPhotos = reading.photos.filter((_, index) => index !== photoIndex);
        return { ...reading, photos: newPhotos };
      }
      return reading;
    }));
  };

  if (readings.length === 0) {
    return (
      <div className="text-center py-8">
        <InformationCircleIcon className="w-12 h-12 mx-auto text-gray-400 mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Nėra skaitliukų, kuriems reikia rodmenų</h3>
        <p className="text-gray-600">
          Šiame objekte nėra aktyvių skaitliukų, kuriems reikia rodmenų nuotraukų.
          Bendri skaitliukai (internetas, šiukšlės) skaičiuojami automatiškai.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-xl font-semibold text-gray-900">Skaitliukai</h2>
        <p className="text-sm text-gray-600 mt-1">
          Pateikite dabartinius skaitliukų rodmenis. Visi privalomi laukai pažymėti žvaigždute (*).
        </p>
      </div>

      {/* Readings Form */}
      <div className="space-y-6">
        {readings.map((reading, index) => {
          const config = reading.meter_config;
          const hasError = errors[reading.id];
          const cost = calculateCost(reading);

          return (
            <div key={reading.id} className={`border rounded-lg p-6 ${hasError ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'}`}>
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getMeterIcon(config.meter_type || '')}</span>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {getMeterName(config)}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {config.serial_number && `Serija: ${config.serial_number}`}
                      {config.provider && ` • Tiekėjas: ${config.provider}`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-gray-900">
                    {cost.toFixed(2)} €
                  </div>
                  <div className="text-sm text-gray-600">
                    {config.fixed_price ? 'Fiksuota kaina' : `${config.price_per_unit || 0} €/${getUnitLabel(config.unit || '')}`}
                  </div>
                </div>
              </div>

              {hasError && (
                <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg">
                  <div className="flex items-center gap-2">
                    <ExclamationTriangleIcon className="w-4 h-4 text-red-600" />
                    <span className="text-sm text-red-700">{hasError}</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Previous Reading */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ankstesnis rodmuo
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      value={reading.previous_reading}
                      onChange={(e) => updateReading(reading.id, 'previous_reading', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                      {getUnitLabel(config.unit || '')}
                    </span>
                  </div>
                </div>

                {/* Current Reading */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dabartinis rodmuo *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min={reading.previous_reading}
                      value={reading.current_reading}
                      onChange={(e) => updateReading(reading.id, 'current_reading', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                      {getUnitLabel(config.unit || '')}
                    </span>
                  </div>
                </div>

                {/* Consumption Display */}
                <div className="md:col-span-2">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Sunaudojimas</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {reading.consumption ?? reading.difference ?? 0} {getUnitLabel(config.unit || '')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Kaina</p>
                        <p className="text-xl font-semibold text-blue-600">
                          {cost.toFixed(2)} €
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rodmenų data *
                  </label>
                  <LtDateInput
                    value={reading.reading_date}
                    onChange={(e) => updateReading(reading.id, 'reading_date', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Photos */}
                {config.require_photo && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nuotraukos {config.require_photo && '*'}
                    </label>
                    <div className="space-y-3">
                      {/* Photo Upload */}
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={(e) => e.target.files && handlePhotoUpload(reading.id, e.target.files)}
                          className="hidden"
                          id={`photo-upload-${reading.id}`}
                        />
                        <label htmlFor={`photo-upload-${reading.id}`} className="cursor-pointer">
                          <CameraIcon className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                          <p className="text-sm text-gray-600">Pridėti nuotraukas</p>
                        </label>
                      </div>

                      {/* Photo Preview */}
                      {reading.photos.length > 0 && (
                        <div className="grid grid-cols-3 gap-2">
                          {reading.photos.map((photo, photoIndex) => (
                            <div key={photoIndex} className="relative">
                              <img
                                src={photo}
                                alt={`Nuotrauka ${photoIndex + 1}`}
                                className="w-full h-20 object-cover rounded-lg"
                              />
                              <button
                                onClick={() => removePhoto(reading.id, photoIndex)}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                              >
                                <XMarkIcon className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pastabos
                  </label>
                  <textarea
                    value={reading.notes}
                    onChange={(e) => updateReading(reading.id, 'notes', e.target.value)}
                    placeholder="Papildoma informacija..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="bg-blue-50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-blue-900">Iš viso</h3>
            <p className="text-sm text-blue-700">
              {readings.length} skaitliukas(ų) • {readings.filter(r => r.current_reading > 0).length} pateikta
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-900">
              {readings.reduce((sum, r) => sum + calculateCost(r), 0).toFixed(2)} €
            </div>
            <div className="text-sm text-blue-700">Bendra suma</div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Atšaukti
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || isValidating}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Pateikiama...' : 'Pateikti rodmenis'}
        </button>
      </div>
    </div>
  );
}



