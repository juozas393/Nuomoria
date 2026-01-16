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

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { X, Search, Plus, Check, AlertCircle, AlertTriangle, Trash } from 'lucide-react';
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
import { useAuth } from '../../context/AuthContext';
import { 
  fetchUserMeterTemplates, 
  createUserMeterTemplate,
  deleteUserMeterTemplate,
  fetchHiddenMeterTemplates,
  hideBaseMeterTemplate,
  type UserMeterTemplateRow
} from '../../lib/userMeterTemplates';

interface UniversalAddMeterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddMeters: (meters: MeterForm[]) => void;
  existingMeterNames?: string[];
  title?: string;
  allowMultiple?: boolean;
}

type TemplateOption = MeterTemplate & {
  isUserTemplate?: boolean;
};

const PERSONAL_TEMPLATE_ICON: MeterTemplate['icon'] = 'gauge';
const ALLOWED_TEMPLATE_ICONS: ReadonlyArray<MeterTemplate['icon']> = [
  'droplet',
  'bolt',
  'flame',
  'wifi',
  'trash',
  'fan',
  'elevator',
  'gauge'
];

const resolveTemplateIcon = (icon?: string | null): MeterTemplate['icon'] => {
  return ALLOWED_TEMPLATE_ICONS.includes(icon as MeterTemplate['icon'])
    ? (icon as MeterTemplate['icon'])
    : PERSONAL_TEMPLATE_ICON;
};

export const UniversalAddMeterModal: React.FC<UniversalAddMeterModalProps> = React.memo(({
  isOpen,
  onClose,
  onAddMeters,
  existingMeterNames = [],
  title = "Pridėti skaitiklį",
  allowMultiple = true
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'templates' | 'custom'>('templates');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<ValidationError[]>([]);
  const [userTemplates, setUserTemplates] = useState<UserMeterTemplateRow[]>([]);
  const [isLoadingUserTemplates, setIsLoadingUserTemplates] = useState(false);
  const [userTemplatesError, setUserTemplatesError] = useState<string | null>(null);
  const [isSavingCustomTemplate, setIsSavingCustomTemplate] = useState(false);
  const [hiddenTemplateIds, setHiddenTemplateIds] = useState<string[]>([]);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);
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

  useEffect(() => {
    if (!isOpen || !user?.id) {
      if (!isOpen) {
        setUserTemplates([]);
        setHiddenTemplateIds([]);
        setUserTemplatesError(null);
      }
      return;
    }

    let isCancelled = false;

    const loadUserData = async () => {
      try {
        setIsLoadingUserTemplates(true);
        const [templates, hidden] = await Promise.all([
          fetchUserMeterTemplates(user.id),
          fetchHiddenMeterTemplates(user.id)
        ]);

        if (!isCancelled) {
          setUserTemplates(templates);
          setHiddenTemplateIds(hidden.map((item) => item.template_id));
          setUserTemplatesError(null);
        }
      } catch (error) {
        if (!isCancelled) {
          setUserTemplatesError('Nepavyko įkelti jūsų skaitiklių šablonų.');
          console.error(
            '❌ Failed to load meter template data:',
            { error, hasUser: Boolean(user?.id), userId: user?.id }
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingUserTemplates(false);
        }
      }
    };

    void loadUserData();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, user?.id]);

  const hiddenTemplateIdSet = useMemo(() => new Set(hiddenTemplateIds), [hiddenTemplateIds]);

  // Filter available templates
  const availableTemplates = useMemo<TemplateOption[]>(() => {
    const personalTemplates: TemplateOption[] = userTemplates.map((template) => ({
      id: template.id,
      name: template.name,
      description: template.description ?? undefined,
      icon: resolveTemplateIcon(template.icon),
      type: template.mode,
      unit: template.unit,
      defaultPrice: Number(template.price_per_unit ?? 0),
      distribution: template.distribution_method as DistributionMethod,
      requiresPhoto: template.requires_photo,
      isUserTemplate: true
    }));

    const baseTemplates: TemplateOption[] = METER_TEMPLATES.map((template) => ({
      ...template,
      isUserTemplate: false
    }));

    return [...personalTemplates, ...baseTemplates].filter((template) => {
      if (!template.name) {
        return false;
      }

      if (!template.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }

      if (!template.isUserTemplate && hiddenTemplateIdSet.has(template.id)) {
        return false;
      }

      if (!template.isUserTemplate && existingMeterNames.includes(template.name)) {
        return false;
      }

      return true;
    });
  }, [existingMeterNames, hiddenTemplateIdSet, searchTerm, userTemplates]);

  const handleTemplateDelete = useCallback(async (template: TemplateOption) => {
    if (!user?.id) {
      console.warn('⚠️ Cannot delete template without authenticated user');
      return;
    }

    setDeletingTemplateId(template.id);
    try {
      if (template.isUserTemplate) {
        await deleteUserMeterTemplate(template.id);
        setUserTemplates((prev) => prev.filter((item) => item.id !== template.id));
      } else {
        await hideBaseMeterTemplate(user.id, template.id);
        setHiddenTemplateIds((prev) => (prev.includes(template.id) ? prev : [...prev, template.id]));
      }
      setSelectedTemplates((prev) => prev.filter((id) => id !== template.id));
    } catch (error) {
      console.error('❌ Failed to delete/hide meter template:', {
        error,
        templateId: template.id,
        isUserTemplate: template.isUserTemplate,
        userId: user.id
      });
      alert('Nepavyko pašalinti šablono. Bandykite dar kartą.');
    } finally {
      setDeletingTemplateId(null);
    }
  }, [user?.id]);

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
    const selectedMeters = availableTemplates.filter((template) =>
      selectedTemplates.includes(template.id)
    );
    
    const convertTemplateToSection = (template: TemplateOption): MeterTypeSection => {
      switch (template.id) {
        case 'water_cold':
          return 'water_cold';
        case 'water_hot':
          return 'water_hot';
        case 'electricity_ind':
          return 'electricity_individual';
        case 'electricity_shared':
          return 'electricity_common';
        case 'heating':
          return 'heating';
        case 'internet':
          return 'internet';
        case 'trash':
          return 'waste';
        default:
          return 'custom';
      }
    };
    
    const metersData: MeterForm[] = selectedMeters.map((template) => {
      console.log('🔍 Creating MeterForm from template:', template);
      
      const meterTypeSection = convertTemplateToSection(template);
      const meterForm = {
        id: `temp_${Date.now()}_${Math.random()}`,
        type: meterTypeSection,
        label: template.name || '',
        unit: template.unit,
        tariff: 'single' as const,
        requirePhoto: template.requiresPhoto || false,
        price_per_unit: template.defaultPrice || 0,
        custom_name: template.name,
        // Legacy compatibility fields
        title: template.name,
        kind: meterTypeSection,
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
  }, [availableTemplates, onAddMeters, selectedTemplates]);

  const handleAddCustom = useCallback(async () => {
    const normalizedUnit =
      customForm.unit === 'custom'
        ? ('Kitas' as const)
        : (customForm.unit as 'm3' | 'kWh' | 'GJ' | 'Kitas');
    const meterData: MeterForm = {
      id: `temp_${Date.now()}_${Math.random()}`,
      type: 'custom',
      label: customForm.name,
      unit: normalizedUnit,
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
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    const warnings = getValidationWarnings(meterData);
    const combinedWarnings = [...warnings];
    setValidationErrors([]);
    setIsSavingCustomTemplate(true);

    try {
      if (user?.id) {
        const savedTemplate = await createUserMeterTemplate({
          user_id: user.id,
          name: customForm.name.trim(),
          description: customForm.description ? customForm.description.trim() : null,
          mode: customForm.type,
            unit: normalizedUnit,
          price_per_unit: customForm.price,
          distribution_method: customForm.distribution,
          requires_photo: customForm.requiresPhoto,
          icon: PERSONAL_TEMPLATE_ICON
        });

        setUserTemplates((prev) => [savedTemplate, ...prev.filter((template) => template.id !== savedTemplate.id)]);
        setActiveTab('templates');
      }
    } catch (error) {
      console.error(
        '❌ Failed to save custom meter template:',
        { error, hasUser: Boolean(user?.id), userId: user?.id }
      );
      combinedWarnings.push({
        field: 'template',
        message: 'Nepavyko išsaugoti šablono. Skaitliukas vis tiek pridėtas.'
      });
    } finally {
      setIsSavingCustomTemplate(false);
    }

    setValidationWarnings(combinedWarnings);
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
  }, [
    customForm,
    existingMeterNames,
    onAddMeters,
    setActiveTab,
    user?.id
  ]);

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
              {isLoadingUserTemplates && (
                <div className="mb-4 text-sm text-gray-500">
                  Kraunama jūsų skaitiklių šablonų biblioteka...
                </div>
              )}
              {userTemplatesError && (
                <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700">
                  {userTemplatesError}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-8 gap-3 text-xs font-medium text-gray-600 mb-3">
                <div>Pasirinkti</div>
                <div>Skaitliukas</div>
                <div>Tipas</div>
                <div>Vienetas</div>
                <div>Kaina</div>
                <div>Paskirstymas</div>
                <div>Reikia nuotraukos</div>
                <div className="text-right">Veiksmai</div>
              </div>

              <div className="max-h-[400px] overflow-y-auto">
                {availableTemplates.map((template) => {
                  const isDuplicate = Boolean(template.name && existingMeterNames.includes(template.name));

                  return (
                  <div key={template.id} className="grid grid-cols-1 md:grid-cols-8 gap-3 border-t border-gray-100 hover:bg-gray-50 transition-colors py-3">
                    <div className="flex items-center">
                      <input
                        type={allowMultiple ? "checkbox" : "radio"}
                        name={allowMultiple ? undefined : "meterSelection"}
                        checked={selectedTemplates.includes(template.id)}
                        onChange={() => {
                          if (!isDuplicate) {
                            handleTemplateToggle(template.id);
                          }
                        }}
                        disabled={isDuplicate}
                        className="w-4 h-4 text-[#2F8481] border-gray-300 rounded focus:ring-[#2F8481]"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[#2F8481]/10 rounded flex items-center justify-center">
                        <MeterIcon iconName={template.icon || 'bolt'} />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 text-sm flex items-center gap-2">
                          <span>{template.name}</span>
                          {isDuplicate && (
                            <span className="inline-flex items-center rounded-full bg-black/10 text-black/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                              Jau pridėta
                            </span>
                          )}
                          {template.isUserTemplate && (
                            <span className="inline-flex items-center rounded-full bg-[#2F8481]/10 text-[#2F8481] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                              Mano
                            </span>
                          )}
                        </div>
                        {template.description && (
                        <div className="text-xs text-gray-500">{template.description}</div>
                        )}
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
                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => handleTemplateDelete(template)}
                        disabled={deletingTemplateId === template.id}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={template.isUserTemplate ? 'Ištrinti šabloną' : 'Paslėpti šį šabloną'}
                      >
                        {deletingTemplateId === template.id ? (
                          <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Trash className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                )})}
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

              <div>
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
                    type="button"
                    disabled={!isValidCustomForm || isSavingCustomTemplate}
                    onClick={() => {
                      if (isValidCustomForm && !isSavingCustomTemplate) {
                        void handleAddCustom();
                      }
                    }}
                    className="flex-1 px-4 py-2 bg-[#2F8481] text-white rounded-lg hover:bg-[#297a77] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    {isSavingCustomTemplate ? 'Saugoma...' : 'Pridėti skaitiklį'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

UniversalAddMeterModal.displayName = 'UniversalAddMeterModal';
