/* eslint-disable react/prop-types */
/**
 * ultimate_performance_rules:
 * - Diagnose root cause, not patch symptom
 * - Meet Core Web Vitals thresholds
 * - Optimize images: WebP/AVIF, srcset, lazy, dimension attrs
 * - Keep bundles small, defer noncritical JS
 * - Minimize DOM size, use virtualization
 * - Cache aggressively: HTTP/2, CDN, ServiceWorkers
 * - Real-time performance monitoring setup
 * - Balance performance vs maintainability decisions
 * - Always ask before ambiguous fixes
 * - Continuous image and perf auditing process
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
    setSelectedTemplates(availableTemplates.map((t) => t.id));
  }, [availableTemplates, allowMultiple]);

  const handleAddSelected = useCallback(() => {
    const selectedMeters = METER_TEMPLATES.filter((t) => selectedTemplates.includes(t.id));
    
    // Helper function to convert template ID to MeterTypeSection
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
    
    const metersData: MeterForm[] = selectedMeters.map((template) => {
      console.log('🔍 Creating MeterForm from template:', template);
      
      const meterForm = {
        id: `temp_${Date.now()}_${Math.random()}`,
        type: convertTemplateIdToType(template.id),
        label: template.name || '',
        unit: template.unit,
        tariff: 'single' as const,
        requirePhoto: template.requiresPhoto || false,
        price_per_unit: template.defaultPrice || 0,
        custom_name: template.name,
        // Legacy compatibility fields
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
      };
      
      console.log('🔍 Created MeterForm:', meterForm);
      return meterForm;
    });
    
    console.log('🔍 Sending metersData to onAddMeters:', metersData);
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
      // Legacy compatibility fields
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-[900px] w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Uždaryti"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'templates'
                ? 'text-[#2F8481] border-b-2 border-[#2F8481]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Šablonai
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'custom'
                ? 'text-[#2F8481] border-b-2 border-[#2F8481]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Naujas skaitliukas
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[calc(90vh-200px)] overflow-y-auto">
          {activeTab === 'templates' ? (
            <div>
              {/* Search */}
              <div className="relative mb-6">
                <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Ieškoti skaitliukų..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-transparent"
                />
              </div>

              {/* Templates Grid */}
              <div className="grid grid-cols-1 md:grid-cols-7 gap-3 text-xs font-medium text-gray-600 mb-3">
                <div>Pasirinkti</div>
                <div>Skaitliukas</div>
                <div>Tipas</div>
                <div>Vienetas</div>
                <div>Kaina</div>
                <div>Paskirstymas</div>
                <div>Reikia nuotraukos</div>
              </div>

              <div className="max-h-[400px] overflow-y-auto">
                {availableTemplates.map((template) => (
                  <div key={template.id} className="grid grid-cols-1 md:grid-cols-7 gap-3 border-t border-gray-100 hover:bg-gray-50 transition-colors py-3">
                    <div className="flex items-center">
                      <input
                        type={allowMultiple ? "checkbox" : "radio"}
                        name={allowMultiple ? undefined : "meterSelection"}
                        checked={selectedTemplates.includes(template.id)}
                        onChange={() => handleTemplateToggle(template.id)}
                        className="w-4 h-4 text-[#2F8481] border-gray-300 rounded focus:ring-[#2F8481]"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[#2F8481]/10 rounded flex items-center justify-center">
                        <MeterIcon iconName={template.icon || 'bolt'} />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 text-sm">{template.name}</div>
                        <div className="text-xs text-gray-500">{template.description}</div>
                      </div>
                    </div>
                    <div>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        template.type === 'individual' 
                          ? 'bg-[#2F8481]/10 text-[#2F8481]' 
                          : 'bg-orange-100 text-orange-700'
                      }`}>
                        {template.type === 'individual' ? 'Individualus' : 'Bendras'}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {getUnitLabel(template.unit)}
                    </div>
                    <div className="text-right text-sm font-medium text-gray-900">
                      {template.defaultPrice ? fmtPriceLt(template.defaultPrice, template.unit) : '-'}
                    </div>
                    <div className="text-sm text-gray-600">
                      {getDistributionLabel(template.distribution)}
                    </div>
                    <div>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        template.requiresPhoto 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {template.requiresPhoto ? 'Taip' : 'Ne'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between mt-6">
                {allowMultiple && (
                  <button
                    onClick={handleSelectAll}
                    className="text-sm text-[#2F8481] hover:underline"
                  >
                    Pažymėti viską
                  </button>
                )}
                {!allowMultiple && <div></div>}
                <button
                  onClick={handleAddSelected}
                  disabled={selectedTemplates.length === 0}
                  className="px-4 py-2 bg-[#2F8481] text-white rounded-lg hover:bg-[#297a77] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Pridėti {allowMultiple ? `pažymėtus (${selectedTemplates.length})` : 'skaitiklį'}
                </button>
              </div>
            </div>
          ) : (
            <div>
              {/* Validation Errors */}
              {validationErrors.length > 0 && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <h4 className="font-medium text-red-800">Klaidos</h4>
                  </div>
                  <ul className="space-y-1">
                    {validationErrors.map((error, index) => (
                      <li key={index} className="text-sm text-red-700">
                        • {error.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Validation Warnings */}
              {validationWarnings.length > 0 && (
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    <h4 className="font-medium text-yellow-800">Įspėjimai</h4>
                  </div>
                  <ul className="space-y-1">
                    {validationWarnings.map((warning, index) => (
                      <li key={index} className="text-sm text-yellow-700">
                        • {warning.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <form onSubmit={(e) => { e.preventDefault(); if (isValidCustomForm) handleAddCustom(); }}>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pavadinimas *
                    </label>
                    <input
                      type="text"
                      required
                      value={customForm.name}
                      onChange={(e) => setCustomForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-transparent"
                      placeholder="Įveskite skaitliuko pavadinimą"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Aprašymas
                    </label>
                    <textarea
                      value={customForm.description}
                      onChange={(e) => setCustomForm(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-transparent"
                      placeholder="Papildomas aprašymas (neprivalomas)"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tipas *
                      </label>
                      <select
                        required
                        value={customForm.type}
                        onChange={(e) => setCustomForm(prev => ({ ...prev, type: e.target.value as 'individual' | 'communal' }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-transparent"
                      >
                        <option value="individual">Individualus</option>
                        <option value="communal">Bendras</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Vienetas *
                      </label>
                      <select
                        required
                        value={customForm.unit}
                        onChange={(e) => setCustomForm(prev => ({ ...prev, unit: e.target.value as Unit }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-transparent"
                      >
                        <option value="m3">m³</option>
                        <option value="kWh">kWh</option>
                                                  <option value="GJ">GJ</option>
                          <option value="Kitas">Kitas</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Kaina *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={customForm.price}
                        onChange={(e) => setCustomForm(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-transparent"
                        placeholder="0.00"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {customForm.distribution === 'fixed_split' ? 'Fiksuota suma eurais' : `Kaina už ${getUnitLabel(customForm.unit)}`}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Paskirstymo būdas *
                      </label>
                      <select
                        required
                        value={customForm.distribution}
                        onChange={(e) => setCustomForm(prev => ({ ...prev, distribution: e.target.value as DistributionMethod }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-transparent"
                      >
                        <option value="per_apartment">Pagal butus</option>
                        <option value="per_area">Pagal plotą</option>
                        <option value="per_person">Pagal asmenis</option>
                        <option value="per_consumption">Pagal suvartojimą</option>
                        <option value="fixed_split">Fiksuota</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="requiresPhoto"
                      checked={customForm.requiresPhoto}
                      onChange={(e) => setCustomForm(prev => ({ ...prev, requiresPhoto: e.target.checked }))}
                      className="w-4 h-4 text-[#2F8481] border-gray-300 rounded focus:ring-[#2F8481]"
                    />
                    <label htmlFor="requiresPhoto" className="ml-2 text-sm text-gray-700">
                      Reikia nuotraukos patvirtinimui
                    </label>
                  </div>
                </div>

                <div className="flex gap-3 mt-8">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Atšaukti
                  </button>
                  <button
                    type="submit"
                    disabled={!isValidCustomForm}
                    className="flex-1 px-4 py-2 bg-[#2F8481] text-white rounded-lg hover:bg-[#297a77] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Pridėti skaitiklį
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

UniversalAddMeterModal.displayName = 'UniversalAddMeterModal';
