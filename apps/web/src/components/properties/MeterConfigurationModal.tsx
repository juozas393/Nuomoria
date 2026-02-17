import React, { useState, useEffect } from 'react';
import {
  PlusIcon,
  TrashIcon,
  CogIcon,
  CurrencyEuroIcon,
  CameraIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { PropertyMeterConfig, MeterType, MeterUnit, MeterTariff, MeterStatus } from '../../types/meters';

interface MeterConfigurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  propertyName: string;
  existingConfigs?: PropertyMeterConfig[];
  onSave: (configs: PropertyMeterConfig[]) => void;
}

const METER_TYPES: Array<{ value: MeterType; label: string; icon: string; unit: MeterUnit; defaultPrice: number }> = [
  { value: 'electricity_individual', label: 'Elektra', icon: '⚡', unit: 'kWh', defaultPrice: 0.23 },
  { value: 'water_cold', label: 'Šaltas vanduo', icon: '🌊', unit: 'm3', defaultPrice: 1.32 },
  { value: 'water_hot', label: 'Karštas vanduo', icon: '🔥', unit: 'm3', defaultPrice: 3.50 },
  { value: 'heating', label: 'Šildymas', icon: '🔥', unit: 'kWh', defaultPrice: 0.095 },
  { value: 'gas', label: 'Dujos', icon: '🔥', unit: 'm3', defaultPrice: 0.99 },
  { value: 'waste', label: 'Šiukšlės', icon: '🗑️', unit: 'Kitas', defaultPrice: 5.0 }
];

const TARIFF_OPTIONS: Array<{ value: MeterTariff; label: string }> = [
  { value: 'single', label: 'Vienkartinė kaina' },
  { value: 'day_night', label: 'Diena/naktis' },
  { value: 'peak_offpeak', label: 'Piko/ne piko' }
];

const STATUS_OPTIONS: Array<{ value: MeterStatus; label: string; color: string }> = [
  { value: 'active', label: 'Aktyvus', color: 'text-green-600' },
  { value: 'inactive', label: 'Neaktyvus', color: 'text-gray-600' },
  { value: 'maintenance', label: 'Priežiūra', color: 'text-orange-600' }
];

export function MeterConfigurationModal({
  isOpen,
  onClose,
  propertyId,
  propertyName,
  existingConfigs = [],
  onSave
}: MeterConfigurationModalProps) {
  const [configs, setConfigs] = useState<PropertyMeterConfig[]>(existingConfigs);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      setConfigs(existingConfigs);
      setErrors({});
    }
  }, [isOpen, existingConfigs]);

  const addMeterConfig = () => {
    const newConfig: PropertyMeterConfig = {
      id: `temp_${Date.now()}`,
      propertyId: propertyId,
      meterId: `temp_${Date.now()}`,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Legacy fields for backward compatibility
      property_id: propertyId,
      meter_type: 'electricity_individual',
      unit: 'kWh',
      tariff: 'single',
      price_per_unit: 0.2,
      require_photo: true,
      require_serial: false,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    setConfigs([...configs, newConfig]);
  };

  const removeMeterConfig = (id: string) => {
    setConfigs(configs.filter(config => config.id !== id));
  };

  const updateConfig = (id: string, field: keyof PropertyMeterConfig, value: any) => {
    setConfigs(configs.map(config =>
      config.id === id ? { ...config, [field]: value, updated_at: new Date().toISOString() } : config
    ));
    // Clear error for this field
    if (errors[id]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[id];
        return newErrors;
      });
    }
  };

  const validateConfigs = (): boolean => {
    const newErrors: Record<string, string> = {};

    configs.forEach(config => {
      if (!config.meter_type) {
        newErrors[config.id] = 'Pasirinkite skaitliuko tipą';
      }
      if (config.meter_type && config.meter_type === 'custom' && !config.custom_name) {
        newErrors[config.id] = 'Įveskite skaitliuko pavadinimą';
      }
      if (config.allocation === 'fixed_split' && (!config.fixed_price || config.fixed_price <= 0)) {
        newErrors[config.id] = 'Įveskite fiksuotą kainą';
      }
      if (config.allocation !== 'fixed_split' && (!config.price_per_unit || config.price_per_unit < 0)) {
        newErrors[config.id] = 'Įveskite kainą už vienetą';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateConfigs()) return;

    setIsSaving(true);
    try {
      await onSave(configs);
      onClose();
    } catch (error) {
      console.error('Klaida išsaugant skaitliukų konfigūraciją:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const getMeterTypeInfo = (type: MeterType) => {
    return METER_TYPES.find(t => t.value === type) || METER_TYPES[0];
  };

  const getUnitLabel = (unit: MeterUnit) => {
    switch (unit) {
      case 'm3': return 'm³';
      case 'kWh': return 'kWh';
      case 'GJ': return 'GJ';
      case 'Kitas': return 'Kitas';
      default: return unit;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Skaitliukų konfigūracija</h2>
              <p className="text-sm text-gray-600">{propertyName}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="space-y-6">
            {/* Info */}
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CogIcon className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-blue-900">Kaip veikia skaitliukų konfigūracija</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    Čia galite nustatyti, kokie skaitliukai naudojami šiame objekte ir kokios yra jų kainos.
                    Kiekvienas objektas gali turėti skirtingus skaitliukus ir skirtingas kainas.
                  </p>
                </div>
              </div>
            </div>

            {/* Meter Configurations */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Skaitliukai</h3>
                <button
                  onClick={addMeterConfig}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <PlusIcon className="w-4 h-4" />
                  Pridėti skaitliuką
                </button>
              </div>

              {configs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CogIcon className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p>Dar nėra pridėtų skaitliukų</p>
                  <p className="text-sm">Pridėkite pirmąjį skaitliuką</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {configs.map((config, index) => {
                    const meterTypeInfo = config.meter_type ? getMeterTypeInfo(config.meter_type) : METER_TYPES[0];
                    const hasError = errors[config.id];

                    return (
                      <div key={config.id} className={`border rounded-lg p-4 ${hasError ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'}`}>
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{meterTypeInfo.icon}</span>
                            <div>
                              <h4 className="font-medium text-gray-900">
                                Skaitliukas #{index + 1}
                              </h4>
                              {hasError && (
                                <p className="text-sm text-red-600 mt-1">{hasError}</p>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => removeMeterConfig(config.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {/* Meter Type */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Skaitliuko tipas *
                            </label>
                            <select
                              value={config.meter_type}
                              onChange={(e) => {
                                const newType = e.target.value as MeterType;
                                const typeInfo = getMeterTypeInfo(newType);
                                updateConfig(config.id, 'meter_type', newType);
                                updateConfig(config.id, 'unit', typeInfo.unit);
                                updateConfig(config.id, 'price_per_unit', typeInfo.defaultPrice);
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              {METER_TYPES.map(type => (
                                <option key={type.value} value={type.value}>
                                  {type.icon} {type.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Custom Name */}
                          {config.meter_type && config.meter_type === 'custom' && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Pavadinimas *
                              </label>
                              <input
                                type="text"
                                value={config.custom_name || ''}
                                onChange={(e) => updateConfig(config.id, 'custom_name', e.target.value)}
                                placeholder="Įveskite pavadinimą"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>
                          )}

                          {/* Unit */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Matavimo vienetas
                            </label>
                            <select
                              value={config.unit}
                              onChange={(e) => updateConfig(config.id, 'unit', e.target.value as MeterUnit)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="kWh">kWh</option>
                              <option value="m3">m³</option>
                              <option value="GJ">GJ</option>
                              <option value="Kitas">Kitas</option>
                            </select>
                          </div>

                          {/* Tariff */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Tarifas
                            </label>
                            <select
                              value={config.tariff}
                              onChange={(e) => updateConfig(config.id, 'tariff', e.target.value as MeterTariff)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              {TARIFF_OPTIONS.map(tariff => (
                                <option key={tariff.value} value={tariff.value}>
                                  {tariff.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Price */}
                          {config.allocation === 'fixed_split' ? (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Fiksuota kaina (€) *
                              </label>
                              <div className="relative">
                                <CurrencyEuroIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={config.fixed_price || ''}
                                  onChange={(e) => updateConfig(config.id, 'fixed_price', parseFloat(e.target.value) || 0)}
                                  placeholder="0.00"
                                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </div>
                            </div>
                          ) : (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Kaina už {config.unit ? getUnitLabel(config.unit) : 'vienetą'} (€) *
                              </label>
                              <div className="relative">
                                <CurrencyEuroIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                  type="number"
                                  step="0.0001"
                                  min="0"
                                  value={config.price_per_unit || ''}
                                  onChange={(e) => updateConfig(config.id, 'price_per_unit', parseFloat(e.target.value) || 0)}
                                  placeholder="0.0000"
                                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </div>
                            </div>
                          )}

                          {/* Status */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Statusas
                            </label>
                            <select
                              value={config.status}
                              onChange={(e) => updateConfig(config.id, 'status', e.target.value as MeterStatus)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              {STATUS_OPTIONS.map(status => (
                                <option key={status.value} value={status.value}>
                                  {status.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Serial Number */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Serijos numeris
                            </label>
                            <input
                              type="text"
                              value={config.serial_number || ''}
                              onChange={(e) => updateConfig(config.id, 'serial_number', e.target.value)}
                              placeholder="Įveskite serijos numerį"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>

                          {/* Provider */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Tiekėjas
                            </label>
                            <input
                              type="text"
                              value={config.provider || ''}
                              onChange={(e) => updateConfig(config.id, 'provider', e.target.value)}
                              placeholder="Įveskite tiekėją"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>

                          {/* Requirements */}
                          <div className="md:col-span-2 lg:col-span-3">
                            <div className="flex items-center gap-6">
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={config.require_photo}
                                  onChange={(e) => updateConfig(config.id, 'require_photo', e.target.checked)}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <CameraIcon className="w-4 h-4 text-gray-500" />
                                <span className="text-sm text-gray-700">Reikalauti nuotraukos</span>
                              </label>
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={config.require_serial}
                                  onChange={(e) => updateConfig(config.id, 'require_serial', e.target.checked)}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <DocumentTextIcon className="w-4 h-4 text-gray-500" />
                                <span className="text-sm text-gray-700">Reikalauti serijos numerio</span>
                              </label>
                            </div>
                          </div>

                          {/* Notes */}
                          <div className="md:col-span-2 lg:col-span-3">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Pastabos
                            </label>
                            <textarea
                              value={config.notes || ''}
                              onChange={(e) => updateConfig(config.id, 'notes', e.target.value)}
                              placeholder="Papildoma informacija..."
                              rows={2}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {configs.length} skaitliukas(ų) konfigūruota
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Atšaukti
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || configs.length === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSaving ? 'Išsaugoma...' : 'Išsaugoti'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



