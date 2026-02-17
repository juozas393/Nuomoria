/* eslint-disable react/prop-types */
/**
 * UniversalAddMeterModal - Premium Design
 * Matches app-wide modal pattern: ModalBackground.png backdrop + CardsBackground.webp on cards
 */

import React, { useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Plus, Check, AlertCircle, AlertTriangle, Bookmark, Camera, Info, Trash2, RotateCcw } from 'lucide-react';
import { METER_TEMPLATES, MeterTemplate, getAllTemplates, saveCustomTemplate, removeTemplate, hasHiddenDefaults, restoreDefaultTemplates } from '../../constants/meterTemplates';
import { MeterIcon } from '../ui/MeterIcon';
import {
  MeterForm,
  Unit,
  MeterTypeSection,
  DistributionMethod
} from '../../types/meters';
import { fmtPriceLt, getUnitLabel, getDistributionLabel } from '../../constants/meterTemplates';
import { validateMeter, getValidationWarnings, ValidationError } from '../../utils/meterValidation';

const cardsBg = '/images/CardsBackground.webp';

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
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateSaved, setTemplateSaved] = useState(false);
  const [templateListVersion, setTemplateListVersion] = useState(0);
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
    distribution: 'per_consumption',
    requiresPhoto: false,
    description: ''
  });

  // Use ALL templates (built-in + custom saved ones)
  const allTemplates = useMemo(() => getAllTemplates(), [templateSaved, templateListVersion]);

  // Check if any defaults are hidden
  const defaultsHidden = useMemo(() => hasHiddenDefaults(), [templateListVersion]);

  // Delete a template (custom or hide default)
  const handleDeleteTemplate = useCallback((e: React.MouseEvent, templateId: string) => {
    e.stopPropagation();
    removeTemplate(templateId);
    setSelectedTemplates(prev => prev.filter(id => id !== templateId));
    setTemplateListVersion(v => v + 1);
  }, []);

  // Restore all hidden default templates
  const handleRestoreDefaults = useCallback(() => {
    restoreDefaultTemplates();
    setTemplateListVersion(v => v + 1);
  }, []);

  // Filter available templates
  const availableTemplates = useMemo(() => {
    return allTemplates.filter((template) =>
      template.name && !existingMeterNames.includes(template.name) &&
      template.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allTemplates, existingMeterNames, searchTerm]);

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
    const selectedMeters = allTemplates.filter((t) => selectedTemplates.includes(t.id));

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
  }, [selectedTemplates, allTemplates, onAddMeters]);

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

    // Actually save as template if toggled
    if (saveAsTemplate) {
      saveCustomTemplate({
        name: customForm.name,
        type: customForm.type,
        unit: customForm.unit as 'm3' | 'kWh' | 'GJ' | 'Kitas',
        defaultPrice: customForm.price,
        distribution: customForm.distribution,
        requiresPhoto: customForm.requiresPhoto,
        description: customForm.description,
      });
      setTemplateSaved(prev => !prev); // trigger re-render of template list
    }

    const metersWithMeta = [{ ...meterData, saveAsTemplate }];
    onAddMeters(metersWithMeta);
    setSaveAsTemplate(false);
    setCustomForm({
      name: '',
      type: 'individual',
      unit: 'm3',
      price: 0,
      distribution: 'per_consumption',
      requiresPhoto: false,
      description: ''
    });
  }, [customForm, existingMeterNames, onAddMeters]);

  const isValidCustomForm = useMemo(() => {
    return customForm.name.trim().length > 0 && customForm.price >= 0;
  }, [customForm.name, customForm.price]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      {/* Backdrop overlay */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal card — same pattern as TenantDetailModalPro */}
      <div
        className="relative rounded-2xl shadow-2xl max-w-[720px] w-full max-h-[90vh] flex flex-col overflow-hidden"
        style={{
          background: `linear-gradient(135deg, rgba(0, 0, 0, 0.45) 0%, rgba(20, 20, 20, 0.30) 50%, rgba(0, 0, 0, 0.45) 100%), url('/images/ModalBackground.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-white/10 px-5 py-3 flex items-center justify-between bg-neutral-900/60 backdrop-blur-sm">
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition-colors"
            title="Uždaryti"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pill-style Segmented Tabs */}
        <div className="px-5 py-2.5 border-b border-white/10">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('templates')}
              className={`px-4 py-2 text-[13px] font-medium rounded-lg transition-colors ${activeTab === 'templates'
                ? 'bg-teal-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/10'
                }`}
            >
              Šablonai
            </button>
            <button
              onClick={() => setActiveTab('custom')}
              className={`px-4 py-2 text-[13px] font-medium rounded-lg transition-colors ${activeTab === 'custom'
                ? 'bg-teal-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/10'
                }`}
            >
              Naujas skaitliukas
            </button>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'templates' ? (
            <div className="space-y-3">
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Ieškoti skaitliukų..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 bg-white/[0.06] border border-white/10 rounded-lg text-[13px] text-white placeholder-gray-500 focus:ring-2 focus:ring-teal-500/40 focus:border-transparent transition-colors"
                />
              </div>

              {/* Selectable List-Table — cards use CardsBackground */}
              <div className="space-y-2">
                {availableTemplates.map((template) => {
                  const isSelected = selectedTemplates.includes(template.id);
                  return (
                    <div
                      key={template.id}
                      onClick={() => handleTemplateToggle(template.id)}
                      className={`group relative flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${isSelected
                        ? 'bg-white/95 border-teal-400 shadow-md'
                        : 'bg-white/90 border-white/20 hover:bg-white/95 hover:shadow-sm'
                        }`}
                      style={{ backgroundImage: `url('${cardsBg}')`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                    >
                      {/* Left accent bar when selected */}
                      {isSelected && (
                        <div className="absolute left-0 top-2 bottom-2 w-1 bg-[#2F8481] rounded-full" />
                      )}

                      {/* Checkbox */}
                      <div className="flex-shrink-0 ml-2">
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${isSelected
                          ? 'bg-[#2F8481] border-[#2F8481]'
                          : 'border-gray-300 bg-white'
                          }`}>
                          {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                        </div>
                      </div>

                      {/* Icon + Name */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-[#2F8481]/20' : 'bg-gray-100'
                          }`}>
                          <MeterIcon iconName={template.icon || 'bolt'} />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900 text-sm flex items-center gap-1.5">
                            {template.name}
                            {template.id.startsWith('custom_') && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-violet-100 text-violet-600 rounded-full font-medium">Mano</span>
                            )}
                          </div>
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

                      {/* Price */}
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

                      {/* Delete Template Button */}
                      <button
                        onClick={(e) => handleDeleteTemplate(e, template.id)}
                        className="flex-shrink-0 p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                        title={template.id.startsWith('custom_') ? 'Ištrinti šabloną' : 'Paslėpti šabloną'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}

                {availableTemplates.length === 0 && (
                  <div className="text-center py-12 text-gray-400">
                    <p>Nėra pasiekiamų šablonų</p>
                    {searchTerm && <p className="text-sm mt-1">Pabandykite kitą paieškos frazę</p>}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Validation Errors */}
              {validationErrors.length > 0 && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
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
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
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

              {/* Form with Sections — cards use CardsBackground */}
              <form onSubmit={(e) => { e.preventDefault(); if (isValidCustomForm) handleAddCustom(); }} className="space-y-4">
                {/* Section 1: Pagrindinė informacija */}
                <div
                  className="bg-white/95 rounded-2xl border border-white/20 shadow-sm p-4"
                  style={{ backgroundImage: `url('${cardsBg}')`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-[#2F8481]/10 flex items-center justify-center">
                      <Info className="w-3.5 h-3.5 text-[#2F8481]" />
                    </div>
                    <h3 className="text-[12px] font-bold text-gray-900 uppercase tracking-wide">Pagrindinė informacija</h3>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">Pavadinimas <span className="text-red-400">*</span></label>
                      <input
                        type="text"
                        required
                        value={customForm.name}
                        onChange={(e) => setCustomForm(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-transparent transition-all text-[13px]"
                        placeholder="pvz., Šaltas vanduo, Elektra..."
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">Aprašymas</label>
                      <textarea
                        value={customForm.description}
                        onChange={(e) => setCustomForm(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-transparent transition-all text-[13px] resize-none"
                        placeholder="Papildomas aprašymas (neprivalomas)"
                        rows={2}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-700 mb-1">Tipas <span className="text-red-400">*</span></label>
                        <select
                          required
                          value={customForm.type}
                          onChange={(e) => setCustomForm(prev => ({ ...prev, type: e.target.value as 'individual' | 'communal' }))}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-transparent transition-all text-[13px]"
                        >
                          <option value="individual">Individualus</option>
                          <option value="communal">Bendras</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-700 mb-1">Vienetas <span className="text-red-400">*</span></label>
                        <select
                          required
                          value={customForm.unit}
                          onChange={(e) => setCustomForm(prev => ({ ...prev, unit: e.target.value as Unit }))}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-transparent transition-all text-[13px]"
                        >
                          <option value="m3">m³ (kubiniai metrai)</option>
                          <option value="kWh">kWh (kilovatvalandės)</option>
                          <option value="GJ">GJ (gigadžauliai)</option>
                          <option value="Kitas">Kitas</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Kainodara */}
                <div
                  className="bg-white/95 rounded-2xl border border-white/20 shadow-sm p-4"
                  style={{ backgroundImage: `url('${cardsBg}')`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <span className="text-emerald-600 text-[12px] font-bold">€</span>
                    </div>
                    <h3 className="text-[12px] font-bold text-gray-900 uppercase tracking-wide">Kainodara</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">Kaina <span className="text-red-400">*</span></label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          value={customForm.price}
                          onChange={(e) => setCustomForm(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-transparent transition-all text-[13px] pr-14"
                          placeholder="0.00"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400">
                          €/{getUnitLabel(customForm.unit)}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1">
                        {customForm.distribution === 'fixed_split' ? 'Fiksuota suma eurais' : `Kaina už ${getUnitLabel(customForm.unit)}`}
                      </p>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">Paskirstymo būdas <span className="text-red-400">*</span></label>
                      <select
                        required
                        value={customForm.distribution}
                        onChange={(e) => setCustomForm(prev => ({ ...prev, distribution: e.target.value as DistributionMethod }))}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-transparent transition-all text-[13px]"
                      >
                        <option value="per_apartment">Pagal butų sk.</option>
                        <option value="per_area">Pagal plotą</option>
                        <option value="per_person">Pagal asmenis</option>
                        <option value="per_consumption">Pagal suvartojimą</option>
                        <option value="fixed_split">Fiksuota</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section 3: Nustatymai */}
                <div
                  className="bg-white/95 rounded-2xl border border-white/20 shadow-sm p-4"
                  style={{ backgroundImage: `url('${cardsBg}')`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center">
                      <Camera className="w-3.5 h-3.5 text-violet-600" />
                    </div>
                    <h3 className="text-[12px] font-bold text-gray-900 uppercase tracking-wide">Nustatymai</h3>
                  </div>
                  <div className="space-y-3">
                    {/* Photo requirement toggle */}
                    <div
                      className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 cursor-pointer hover:border-gray-300 transition-colors group"
                      onClick={() => setCustomForm(prev => ({ ...prev, requiresPhoto: !prev.requiresPhoto }))}
                    >
                      <div className="flex items-center gap-3">
                        <Camera className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                        <div>
                          <span className="text-sm font-medium text-gray-700">Reikia nuotraukos</span>
                          <p className="text-[11px] text-gray-400">Nuomininkas turės pridėti skaitliuko nuotrauką</p>
                        </div>
                      </div>
                      <div className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 ${customForm.requiresPhoto ? 'bg-[#2F8481]' : 'bg-gray-300'}`}>
                        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${customForm.requiresPhoto ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                      </div>
                    </div>

                    {/* Save as template toggle */}
                    <div
                      className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 cursor-pointer hover:border-gray-300 transition-colors group"
                      onClick={() => setSaveAsTemplate(prev => !prev)}
                    >
                      <div className="flex items-center gap-3">
                        <Bookmark className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                        <div>
                          <span className="text-sm font-medium text-gray-700">Išsaugoti kaip šabloną</span>
                          <p className="text-[11px] text-gray-400">Skaitliukas bus pasiekiamas šablonuose kitą kartą</p>
                        </div>
                      </div>
                      <div className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 ${saveAsTemplate ? 'bg-[#2F8481]' : 'bg-gray-300'}`}>
                        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${saveAsTemplate ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Sticky Footer */}
        <div className="border-t border-white/10 px-5 py-3 bg-neutral-900/60 backdrop-blur-sm">
          {activeTab === 'templates' ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSelectAll}
                  className="text-sm text-teal-400 hover:text-teal-300 font-medium"
                >
                  {selectedTemplates.length === availableTemplates.length ? 'Atžymėti viską' : 'Pažymėti viską'}
                </button>
                {defaultsHidden && (
                  <button
                    onClick={handleRestoreDefaults}
                    className="text-sm text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Atkurti numatytuosius
                  </button>
                )}
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-400">
                  Pasirinkta: <span className="font-semibold text-white">{selectedTemplates.length}</span>
                </span>
                <button
                  onClick={handleAddSelected}
                  disabled={selectedTemplates.length === 0}
                  className="px-4 py-2 bg-teal-600 text-white rounded-xl hover:bg-teal-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium shadow-sm"
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
                className="px-4 py-2 border border-white/20 text-gray-300 rounded-xl hover:bg-white/10 transition-colors font-medium"
              >
                Atšaukti
              </button>
              <button
                onClick={handleAddCustom}
                disabled={!isValidCustomForm}
                className="px-4 py-2 bg-teal-600 text-white rounded-xl hover:bg-teal-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Sukurti skaitiklį
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
});

UniversalAddMeterModal.displayName = 'UniversalAddMeterModal';
