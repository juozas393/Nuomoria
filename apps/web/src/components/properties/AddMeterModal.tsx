import React, { useState, useMemo } from 'react';
import { X, Search, Plus, Check } from 'lucide-react';
import { METER_TEMPLATES, MeterTemplate, fmtPriceLt, getUnitLabel, getDistributionLabel, getMeterIconName } from '../../constants/meterTemplates';
import { getMeterIcon } from '../../components/meters/iconMap';
import { type DistributionMethod } from '../../constants/meterDistribution';

interface LocalMeter {
  id: string;
  name: string;
  type: 'individual' | 'communal';
  unit: 'm3' | 'kWh' | 'GJ' | 'Kitas';
  price_per_unit: number;
  fixed_price?: number;
  distribution_method: DistributionMethod;
  description: string;
  is_active: boolean;
  is_custom?: boolean;
  requires_photo: boolean;
  is_inherited?: boolean;
  inherited_from_address_id?: string;
}

// Helper function to convert template icon to meter icon
const getIconFromTemplate = (iconName: string) => {
  switch (iconName) {
    case 'droplet': return 'water_cold';
    case 'bolt': return 'electric_ind';
    case 'flame': return 'heating';
    case 'wifi': return 'internet';
    case 'trash': return 'waste';
    case 'fan': return 'ventilation';
    case 'elevator': return 'elevator';
    case 'gauge': return 'electric_ind';
    default: return 'electric_ind';
  }
};

interface AddMeterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddMeters: (meters: LocalMeter[]) => void;
  existingMeterNames: string[];
}

export const AddMeterModal: React.FC<AddMeterModalProps> = ({
  isOpen,
  onClose,
  onAddMeters,
  existingMeterNames
}) => {
  const [activeTab, setActiveTab] = useState<'templates' | 'custom'>('templates');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [customMeter, setCustomMeter] = useState({
    name: '',
    description: '',
    type: 'individual' as 'individual' | 'communal',
    unit: 'm3' as 'm3' | 'kWh' | 'GJ' | 'Kitas',
    price: 0,
    distribution: 'pagal_suvartojima' as 'pagal_suvartojima' | 'pagal_butus' | 'pagal_plota' | 'fiksuota',
    requiresPhoto: false
  });

  // Filter available templates
  const availableTemplates = useMemo(() => {
    return METER_TEMPLATES.filter(template =>
      !existingMeterNames.includes(template.name) &&
      template.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [existingMeterNames, searchQuery]);

  const handleTemplateToggle = (templateId: string) => {
    setSelectedTemplates(prev =>
      prev.includes(templateId)
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId]
    );
  };

  const handleSelectAll = () => {
    setSelectedTemplates(availableTemplates.map(t => t.id));
  };

  const handleAddSelected = () => {
    const selectedMeters = METER_TEMPLATES.filter(t => selectedTemplates.includes(t.id))
      .map(template => ({
        id: `template_${Date.now()}_${template.id}`,
        name: template.name,
        description: template.description || '',
        type: template.type,
        unit: template.unit,
        price_per_unit: template.unit === 'Kitas' ? 0 : (template.defaultPrice || 0),
        fixed_price: template.unit === 'Kitas' ? (template.defaultPrice || 0) : undefined,
        distribution_method: template.distribution,
        requires_photo: template.requiresPhoto || false,
        is_active: true,
        is_inherited: false,
        is_custom: false
      } as LocalMeter));
    onAddMeters(selectedMeters);
    setSelectedTemplates([]);
    onClose();
  };

  const handleAddCustom = () => {
    if (!customMeter.name.trim()) return;

    const newMeter = {
      id: `custom_${Date.now()}`,
      name: customMeter.name,
      description: customMeter.description,
      type: customMeter.type,
      unit: customMeter.unit,
      price_per_unit: customMeter.unit === 'Kitas' ? 0 : customMeter.price,
      fixed_price: customMeter.unit === 'Kitas' ? customMeter.price : undefined,
      distribution_method: (() => {
        switch (customMeter.distribution) {
          case 'pagal_suvartojima': return 'per_consumption' as DistributionMethod;
          case 'pagal_butus': return 'per_apartment' as DistributionMethod;
          case 'pagal_plota': return 'per_area' as DistributionMethod;
          case 'fiksuota': return 'fixed_split' as DistributionMethod;
          default: return 'per_apartment' as DistributionMethod;
        }
      })(),
      requires_photo: customMeter.requiresPhoto,
      is_active: true,
      is_inherited: false,
      is_custom: true
    };

    onAddMeters([newMeter]);
    setCustomMeter({
      name: '',
      description: '',
      type: 'individual',
      unit: 'm3',
      price: 0,
      distribution: 'pagal_butus',
      requiresPhoto: false
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-[900px] w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Pridėti skaitliuką</h2>
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
            className={`px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'templates'
              ? 'text-[#2F8481] border-b-2 border-[#2F8481]'
              : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            Šablonai
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'custom'
              ? 'text-[#2F8481] border-b-2 border-[#2F8481]'
              : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            Naujas skaitiklis
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {activeTab === 'templates' ? (
            <div>
              {/* Search */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Ieškoti šablonų..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Templates Table */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="grid grid-cols-[50px_minmax(200px,1.5fr)_minmax(120px,0.8fr)_minmax(100px,0.7fr)_minmax(140px,0.9fr)_minmax(160px,1fr)_minmax(140px,0.9fr)]">
                  {/* Header */}
                  <div className="contents text-sm text-gray-500 font-medium bg-gray-50 border-b border-gray-200">
                    <div className="px-4 py-3"></div>
                    <div className="px-4 py-3">Pavadinimas</div>
                    <div className="px-4 py-3">Tipas</div>
                    <div className="px-4 py-3">Vienetas</div>
                    <div className="px-4 py-3 text-right">Numatyta kaina</div>
                    <div className="px-4 py-3">Paskirstymas</div>
                    <div className="px-4 py-3">Reikia nuotraukos</div>
                  </div>

                  {/* Rows */}
                  {availableTemplates.map((template) => (
                    <div key={template.id} className="contents border-t border-gray-100 hover:bg-gray-50 transition-colors">
                      <div className="px-4 py-3 flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedTemplates.includes(template.id)}
                          onChange={() => handleTemplateToggle(template.id)}
                          className="w-4 h-4 text-[#2F8481] border-gray-300 rounded focus:ring-[#2F8481]"
                        />
                      </div>

                      <div className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-[#2F8481]/10 rounded flex items-center justify-center">
                            {(() => {
                              const IconComponent = getMeterIcon(getIconFromTemplate(template.icon));
                              return <IconComponent className="w-4 h-4 text-[#2F8481]" />;
                            })()}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 text-sm">{template.name}</div>
                            {template.description && (
                              <div className="text-xs text-gray-500">{template.description}</div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${template.type === 'individual'
                          ? 'bg-[#2F8481]/10 text-[#2F8481]'
                          : 'bg-orange-100 text-orange-700'
                          }`}>
                          {template.type === 'individual' ? 'Individualus' : 'Bendras'}
                        </span>
                      </div>

                      <div className="px-4 py-3 text-sm text-gray-600">
                        {getUnitLabel(template.unit)}
                      </div>

                      <div className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                        {template.defaultPrice ? fmtPriceLt(template.defaultPrice, template.unit) : '-'}
                      </div>

                      <div className="px-4 py-3 text-sm text-gray-600">
                        {getDistributionLabel(template.distribution)}
                      </div>

                      <div className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${template.requiresPhoto
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                          }`}>
                          {template.requiresPhoto ? 'Taip' : 'Ne'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between mt-6">
                <button
                  onClick={handleSelectAll}
                  className="text-sm text-[#2F8481] hover:text-[#297a77] font-medium"
                >
                  Pažymėti viską
                </button>
                <button
                  onClick={handleAddSelected}
                  disabled={selectedTemplates.length === 0}
                  className="px-4 py-2 bg-[#2F8481] text-white rounded-lg hover:bg-[#297a77] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Pridėti pažymėtus ({selectedTemplates.length})
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Custom Form */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pavadinimas *
                  </label>
                  <input
                    type="text"
                    value={customMeter.name}
                    onChange={(e) => setCustomMeter(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-transparent"
                    placeholder="Pvz. Šaltas vanduo"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Aprašas
                  </label>
                  <input
                    type="text"
                    value={customMeter.description}
                    onChange={(e) => setCustomMeter(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-transparent"
                    placeholder="Trumpas aprašas"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipas *
                  </label>
                  <select
                    value={customMeter.type}
                    onChange={(e) => setCustomMeter(prev => ({ ...prev, type: e.target.value as any }))}
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
                    value={customMeter.unit}
                    onChange={(e) => setCustomMeter(prev => ({ ...prev, unit: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-transparent"
                  >
                    <option value="m3">m³</option>
                    <option value="kWh">kWh</option>
                    <option value="GJ">GJ</option>
                    <option value="Kitas">Kitas</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kaina *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={customMeter.price}
                    onChange={(e) => setCustomMeter(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Paskirstymas *
                  </label>
                  <select
                    value={customMeter.distribution}
                    onChange={(e) => setCustomMeter(prev => ({ ...prev, distribution: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-transparent"
                  >
                    <option value="pagal_suvartojima">Pagal suvartojimą</option>
                    <option value="pagal_butus">Pagal butų sk.</option>
                    <option value="pagal_plota">Pagal plotą</option>
                    <option value="fiksuota">Fiksuota</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="requiresPhoto"
                  checked={customMeter.requiresPhoto}
                  onChange={(e) => setCustomMeter(prev => ({ ...prev, requiresPhoto: e.target.checked }))}
                  className="w-4 h-4 text-[#2F8481] border-gray-300 rounded focus:ring-[#2F8481]"
                />
                <label htmlFor="requiresPhoto" className="text-sm text-gray-700">
                  Reikia nuotraukos
                </label>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Atšaukti
                </button>
                <button
                  onClick={handleAddCustom}
                  disabled={!customMeter.name.trim()}
                  className="px-4 py-2 bg-[#2F8481] text-white rounded-lg hover:bg-[#297a77] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Sukurti ir pridėti
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
