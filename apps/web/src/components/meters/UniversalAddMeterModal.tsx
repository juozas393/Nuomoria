/* eslint-disable react/prop-types */
/**
 * UniversalAddMeterModal - Premium Design
 * Features:
 * - Pill-style segmented tabs
 * - Selectable list-table with visual containers
 * - Sticky bottom action bar
 * - 2-column grid for custom form
 */

import React, { useState, useMemo, useCallback } from 'react';
import { X, Search, Plus, Check, AlertCircle, AlertTriangle } from 'lucide-react';
import { METER_TEMPLATES, MeterTemplate } from '../../constants/meterTemplates';
import { MeterIcon } from '../ui/MeterIcon';
import {
  MeterForm,
  Unit,
  MeterTypeSection,
  DistributionMethod
} from '../../types/meters';
import { fmtPriceLt, getUnitLabel, getDistributionLabel } from '../../constants/meterTemplates';
import { validateMeter, getValidationWarnings, ValidationError } from '../../utils/meterValidation';

interface UniversalAddMeterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddMeters: (meters: MeterForm[]) => void;
  existingMeterNames?: string[];
  title?: string;
  allowMultiple?: boolean;
}

export const UniversalAddMeterModal: React.FC<UniversalAddMeterModalProps> = React.memo(({
  isOpen,
  onClose,
  onAddMeters,
  existingMeterNames = [],
  title = "Pridėti skaitiklį",
  allowMultiple = true
}) => {
  const [activeTab, setActiveTab] = useState<'templates' | 'custom'>('templates');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<ValidationError[]>([]);
  const [customForm, setCustomForm] = useState<{
    name: string;
    type: 'individual' | 'communal';
    unit: Unit;
    price: number;
    distribution: DistributionMethod;
    requiresPhoto: boolean;
    description: string;
  }>({
    name: '',
    type: 'individual',
    unit: 'm3',
    price: 0,
    distribution: 'per_apartment',
    requiresPhoto: false,
    description: ''
  });

  // Filter available templates
  const availableTemplates = useMemo(() => {
    return METER_TEMPLATES.filter((template) =>
      template.name && !existingMeterNames.includes(template.name) &&
      template.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [existingMeterNames, searchTerm]);

  const handleTemplateToggle = useCallback((templateId: string) => {
    if (!allowMultiple) {
      setSelectedTemplates([templateId]);
      return;
    }

    setSelectedTemplates(prev =>
      prev.includes(templateId)
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId]
    );
  }, [allowMultiple]);

  const handleSelectAll = useCallback(() => {
    if (!allowMultiple) return;
    if (selectedTemplates.length === availableTemplates.length) {
      setSelectedTemplates([]);
    } else {
      setSelectedTemplates(availableTemplates.map((t) => t.id));
    }
  }, [availableTemplates, allowMultiple, selectedTemplates.length]);

  const handleAddSelected = useCallback(() => {
    const selectedMeters = METER_TEMPLATES.filter((t) => selectedTemplates.includes(t.id));

    const convertTemplateIdToType = (templateId: string): MeterTypeSection => {
      switch (templateId) {
        case 'water_cold': return 'water_cold';
        case 'water_hot': return 'water_hot';
        case 'electricity_ind': return 'electricity_individual';
        case 'electricity_shared': return 'electricity_common';
        case 'heating': return 'heating';
        case 'internet': return 'internet';
        case 'trash': return 'waste';
        case 'ventilation': return 'custom';
        case 'elevator': return 'custom';
        default: return 'custom';
      }
    };

    const metersData: MeterForm[] = selectedMeters.map((template) => ({
      id: `temp_${Date.now()}_${Math.random()}`,
      type: convertTemplateIdToType(template.id),
      label: template.name || '',
      unit: template.unit,
      tariff: 'single' as const,
      requirePhoto: template.requiresPhoto || false,
      price_per_unit: template.defaultPrice || 0,
      custom_name: template.name,
      title: template.name,
      kind: convertTemplateIdToType(template.id),
      mode: template.type,
      price: template.defaultPrice || 0,
      allocation: template.distribution,
      photoRequired: template.requiresPhoto || false,
      active: true,
      fixed_price: template.distribution === 'fixed_split' ? template.defaultPrice : undefined,
      initial_reading: 0,
      initial_date: new Date().toISOString().split('T')[0],
      require_photo: template.requiresPhoto || false,
      serial_number: '',
      status: 'active' as const,
      notes: template.description || ''
    }));

    onAddMeters(metersData);
    setSelectedTemplates([]);
  }, [selectedTemplates, onAddMeters]);

  const handleAddCustom = useCallback(() => {
    const meterData: MeterForm = {
      id: `temp_${Date.now()}_${Math.random()}`,
      type: 'custom',
      label: customForm.name,
      unit: customForm.unit,
      tariff: 'single' as const,
      requirePhoto: customForm.requiresPhoto,
      price_per_unit: customForm.price,
      custom_name: customForm.name,
      title: customForm.name,
      kind: 'custom',
      mode: customForm.type,
      price: customForm.price,
      allocation: customForm.distribution,
      photoRequired: customForm.requiresPhoto,
      active: true,
      fixed_price: customForm.distribution === 'fixed_split' ? customForm.price : undefined,
      initial_reading: 0,
      initial_date: new Date().toISOString().split('T')[0],
      require_photo: customForm.requiresPhoto,
      serial_number: '',
      status: 'active' as const,
      notes: customForm.description
    };

    const errors = validateMeter(meterData, existingMeterNames);
    const warnings = getValidationWarnings(meterData);

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors([]);
    setValidationWarnings(warnings);
    onAddMeters([meterData]);
    setCustomForm({
      name: '',
      type: 'individual',
      unit: 'm3',
      price: 0,
      distribution: 'per_apartment',
      requiresPhoto: false,
      description: ''
    });
  }, [customForm, existingMeterNames, onAddMeters]);

  const isValidCustomForm = useMemo(() => {
    return customForm.name.trim().length > 0 && customForm.price >= 0;
  }, [customForm.name, customForm.price]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-[900px] w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Premium Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors"
            title="Uždaryti"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Pill-style Segmented Tabs */}
        <div className="px-6 py-4">
          <div className="inline-flex bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setActiveTab('templates')}
              className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'templates'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              Šablonai
            </button>
            <button
              onClick={() => setActiveTab('custom')}
              className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'custom'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              Naujas skaitliukas
            </button>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto px-6 pb-4">
          {activeTab === 'templates' ? (
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="w-5 h-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Ieškoti skaitliukų..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2F8481] focus:border-transparent focus:bg-white transition-all"
                />
              </div>

              {/* Selectable List-Table */}
              <div className="space-y-2">
                {availableTemplates.map((template) => {
                  const isSelected = selectedTemplates.includes(template.id);
                  return (
                    <div
                      key={template.id}
                      onClick={() => handleTemplateToggle(template.id)}
                      className={`relative flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${isSelected
                          ? 'bg-teal-50 border-teal-300'
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                        }`}
                    >
                      {/* Left accent bar when selected */}
                      {isSelected && (
                        <div className="absolute left-0 top-2 bottom-2 w-1 bg-[#2F8481] rounded-full" />
                      )}

                      {/* Checkbox */}
                      <div className="flex-shrink-0 ml-2">
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${isSelected
                            ? 'bg-[#2F8481] border-[#2F8481]'
                            : 'border-gray-300 bg-white'
                          }`}>
                          {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                        </div>
                      </div>

                      {/* Icon + Name */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-[#2F8481]/20' : 'bg-white'
                          }`}>
                          <MeterIcon iconName={template.icon || 'bolt'} />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900 text-sm">{template.name}</div>
                          <div className="text-xs text-gray-500 truncate">{template.description}</div>
                        </div>
                      </div>

                      {/* Type Badge */}
                      <div className="flex-shrink-0">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${template.type === 'individual'
                            ? 'bg-[#2F8481]/10 text-[#2F8481]'
                            : 'bg-orange-100 text-orange-700'
                          }`}>
                          {template.type === 'individual' ? 'Individualus' : 'Bendras'}
                        </span>
                      </div>

                      {/* Price - tabular numbers */}
                      <div className="flex-shrink-0 w-24 text-right">
                        <span className="text-sm font-semibold text-gray-900 tabular-nums">
                          {template.defaultPrice ? fmtPriceLt(template.defaultPrice, template.unit) : '-'}
                        </span>
                      </div>

                      {/* Photo Required Badge */}
                      <div className="flex-shrink-0">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${template.requiresPhoto
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                          }`}>
                          {template.requiresPhoto ? 'Taip' : 'Ne'}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {availableTemplates.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <p>Nėra pasiekiamų šablonų</p>
                    {searchTerm && <p className="text-sm mt-1">Pabandykite kitą paieškos frazę</p>}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div>
              {/* Validation Errors */}
              {validationErrors.length > 0 && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <h4 className="font-medium text-red-800">Klaidos</h4>
                  </div>
                  <ul className="space-y-1">
                    {validationErrors.map((error, index) => (
                      <li key={index} className="text-sm text-red-700">• {error.message}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Validation Warnings */}
              {validationWarnings.length > 0 && (
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    <h4 className="font-medium text-yellow-800">Įspėjimai</h4>
                  </div>
                  <ul className="space-y-1">
                    {validationWarnings.map((warning, index) => (
                      <li key={index} className="text-sm text-yellow-700">• {warning.message}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Form with Sections */}
              <form onSubmit={(e) => { e.preventDefault(); if (isValidCustomForm) handleAddCustom(); }} className="space-y-8">
                {/* Section: Pagrindinė informacija */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Pagrindinė informacija</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Pavadinimas *</label>
                      <input
                        type="text"
                        required
                        value={customForm.name}
                        onChange={(e) => setCustomForm(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2F8481] focus:border-transparent focus:bg-white transition-all"
                        placeholder="Įveskite skaitliuko pavadinimą"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Aprašymas</label>
                      <textarea
                        value={customForm.description}
                        onChange={(e) => setCustomForm(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2F8481] focus:border-transparent focus:bg-white transition-all"
                        placeholder="Papildomas aprašymas (neprivalomas)"
                        rows={2}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Tipas *</label>
                      <select
                        required
                        value={customForm.type}
                        onChange={(e) => setCustomForm(prev => ({ ...prev, type: e.target.value as 'individual' | 'communal' }))}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2F8481] focus:border-transparent focus:bg-white transition-all"
                      >
                        <option value="individual">Individualus</option>
                        <option value="communal">Bendras</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Vienetas *</label>
                      <select
                        required
                        value={customForm.unit}
                        onChange={(e) => setCustomForm(prev => ({ ...prev, unit: e.target.value as Unit }))}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2F8481] focus:border-transparent focus:bg-white transition-all"
                      >
                        <option value="m3">m³</option>
                        <option value="kWh">kWh</option>
                        <option value="GJ">GJ</option>
                        <option value="Kitas">Kitas</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section: Kainodara */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Kainodara</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Kaina *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={customForm.price}
                        onChange={(e) => setCustomForm(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2F8481] focus:border-transparent focus:bg-white transition-all"
                        placeholder="0.00"
                      />
                      <p className="text-xs text-gray-500 mt-1.5">
                        {customForm.distribution === 'fixed_split' ? 'Fiksuota suma eurais' : `Kaina už ${getUnitLabel(customForm.unit)}`}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Paskirstymo būdas *</label>
                      <select
                        required
                        value={customForm.distribution}
                        onChange={(e) => setCustomForm(prev => ({ ...prev, distribution: e.target.value as DistributionMethod }))}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2F8481] focus:border-transparent focus:bg-white transition-all"
                      >
                        <option value="per_apartment">Pagal butus</option>
                        <option value="per_area">Pagal plotą</option>
                        <option value="per_person">Pagal asmenis</option>
                        <option value="per_consumption">Pagal suvartojimą</option>
                        <option value="fixed_split">Fiksuota</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section: Papildomai */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Papildomai</h3>
                  <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={customForm.requiresPhoto}
                      onChange={(e) => setCustomForm(prev => ({ ...prev, requiresPhoto: e.target.checked }))}
                      className="w-5 h-5 text-[#2F8481] border-gray-300 rounded focus:ring-[#2F8481]"
                    />
                    <span className="text-sm text-gray-700">Reikia nuotraukos patvirtinimui</span>
                  </label>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Sticky Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          {activeTab === 'templates' ? (
            <div className="flex items-center justify-between">
              <button
                onClick={handleSelectAll}
                className="text-sm text-[#2F8481] hover:text-[#297a77] font-medium"
              >
                {selectedTemplates.length === availableTemplates.length ? 'Atžymėti viską' : 'Pažymėti viską'}
              </button>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500">
                  Pasirinkta: <span className="font-semibold text-gray-900">{selectedTemplates.length}</span>
                </span>
                <button
                  onClick={handleAddSelected}
                  disabled={selectedTemplates.length === 0}
                  className="px-5 py-2.5 bg-[#2F8481] text-white rounded-xl hover:bg-[#297a77] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Pridėti pažymėtus ({selectedTemplates.length})
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors font-medium"
              >
                Atšaukti
              </button>
              <button
                onClick={handleAddCustom}
                disabled={!isValidCustomForm}
                className="px-5 py-2.5 bg-[#2F8481] text-white rounded-xl hover:bg-[#297a77] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Sukurti skaitiklį
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

UniversalAddMeterModal.displayName = 'UniversalAddMeterModal';
