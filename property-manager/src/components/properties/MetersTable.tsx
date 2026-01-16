/* eslint-disable react/prop-types */
import React, { useState, useCallback, useMemo, useEffect, memo } from 'react';
import { Plus, Trash2, Edit3, RefreshCw, Droplets, Bolt, Flame, Wifi, Fan, ArrowUpDown, Gauge, Zap } from 'lucide-react';
import { ReadingRequestModal } from './ReadingRequestModal';
import { ReadingsInbox } from './ReadingsInbox';
import { MetersPanel, Meter as ModernMeter } from './MetersPanel';
import { IconSelector } from './IconSelector';
import { UniversalAddMeterModal } from '../meters/UniversalAddMeterModal';
import { fmtPriceLt, getUnitLabel } from '../../constants/meterTemplates';
import { 
  getAllowedDistributions, 
  getDefaultDistribution, 
  DISTRIBUTION_LABELS, 
  DISTRIBUTION_TOOLTIPS,
  convertLegacyDistribution,
  checkPrecondition,
  getMeterKind,
  type DistributionMethod,
  type PreconditionContext,
  type PreconditionResult
} from '../../constants/meterDistribution';
import { type Allocation } from '../../types/meters';

export interface LocalMeter {
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
  enableMeterEditing?: boolean;
  is_inherited?: boolean; // true if inherited from address defaults
  inherited_from_address_id?: string;
  collectionMode: 'landlord_only' | 'tenant_photo'; // New field for collection mode
  landlordReadingEnabled: boolean;
  tenantPhotoEnabled: boolean;
  lastReadingValue?: number | null;
  previousReadingValue?: number | null;
  lastReadingDate?: string | null;
  lastTotalCost?: number | null;
  lastUpdatedAt?: string | null;
}

interface MetersTableProps {
  meters: LocalMeter[];
  onMetersChange: (meters: LocalMeter[]) => void;
  onPresetApply?: (meters: LocalMeter[]) => void;
  onMeterDelete?: (id: string) => void;
  onMeterUpdate?: (id: string, updates: Partial<LocalMeter>) => void;
}

const AVAILABLE_METERS = [
  { name: 'Vanduo (šaltas)', type: 'individual' as const, unit: 'm3' as const, price_per_unit: 1.2, distribution_method: 'per_consumption' as const, description: 'Šalto vandens suvartojimas', icon: 'Vanduo', requires_photo: true, enableMeterEditing: true, landlordReadingEnabled: false, tenantPhotoEnabled: true },
  { name: 'Vanduo (karštas)', type: 'individual' as const, unit: 'm3' as const, price_per_unit: 3.5, distribution_method: 'per_consumption' as const, description: 'Karšto vandens suvartojimas', icon: 'Vanduo', requires_photo: true, enableMeterEditing: true, landlordReadingEnabled: false, tenantPhotoEnabled: true },
  { name: 'Elektra (individuali)', type: 'individual' as const, unit: 'kWh' as const, price_per_unit: 0.15, distribution_method: 'per_consumption' as const, description: 'Elektra kiekvienam butui', icon: 'Elektra', requires_photo: true, enableMeterEditing: true, landlordReadingEnabled: false, tenantPhotoEnabled: true },
  { name: 'Elektra (bendra)', type: 'communal' as const, unit: 'kWh' as const, price_per_unit: 0.15, distribution_method: 'per_apartment' as const, description: 'Namo apsvietimas', icon: 'Elektra', requires_photo: false, enableMeterEditing: true, landlordReadingEnabled: true, tenantPhotoEnabled: false },
  { name: 'Šildymas', type: 'individual' as const, unit: 'GJ' as const, price_per_unit: 25.0, distribution_method: 'per_area' as const, description: 'Namo šildymo sąnaudos', icon: 'Šildymas', requires_photo: true, enableMeterEditing: true, landlordReadingEnabled: false, tenantPhotoEnabled: true },
  { name: 'Internetas', type: 'communal' as const, unit: 'Kitas' as const, price_per_unit: 0, fixed_price: 60, distribution_method: 'per_apartment' as const, description: 'Interneto paslaugos', icon: 'Internetas', requires_photo: false, enableMeterEditing: true, landlordReadingEnabled: true, tenantPhotoEnabled: false },
  { name: 'Šiukšlių išvežimas', type: 'communal' as const, unit: 'Kitas' as const, price_per_unit: 0, fixed_price: 45, distribution_method: 'per_apartment' as const, description: 'Šiukšlių išvežimo paslaugos', icon: 'Šiukšlės', requires_photo: false, enableMeterEditing: true, landlordReadingEnabled: true, tenantPhotoEnabled: false },
  { name: 'Dujos', type: 'individual' as const, unit: 'm3' as const, price_per_unit: 0.8, distribution_method: 'per_consumption' as const, description: 'Dujų suvartojimas', icon: 'Dujos', requires_photo: true, enableMeterEditing: true, landlordReadingEnabled: false, tenantPhotoEnabled: true },
  { name: 'Vėdinimas', type: 'communal' as const, unit: 'Kitas' as const, price_per_unit: 0, fixed_price: 30, distribution_method: 'per_apartment' as const, description: 'Vėdinimo sistemos', icon: 'Vėdinimas', requires_photo: false, enableMeterEditing: true, landlordReadingEnabled: true, tenantPhotoEnabled: false },
  { name: 'Lifto priežiūra', type: 'communal' as const, unit: 'Kitas' as const, price_per_unit: 0, fixed_price: 25, distribution_method: 'per_apartment' as const, description: 'Lifto techninė priežiūra', icon: 'Liftas', requires_photo: false, enableMeterEditing: true, landlordReadingEnabled: true, tenantPhotoEnabled: false },
  { name: 'Kitas', type: 'individual' as const, unit: 'kWh' as const, price_per_unit: 0.1, distribution_method: 'per_consumption' as const, description: 'Papildomas individualus skaitliukas', icon: 'BoltIcon', requires_photo: true, enableMeterEditing: true, landlordReadingEnabled: false, tenantPhotoEnabled: true }
];

const getMeterIcon = (name: string) => {
  if (name.includes('Vanduo')) return <Droplets className="w-5 h-5" />;
  if (name.includes('Elektra')) return <Bolt className="w-5 h-5" />;
  if (name.includes('Šildymas')) return <Flame className="w-5 h-5" />;
  if (name.includes('Internetas')) return <Wifi className="w-5 h-5" />;
  if (name.includes('Šiukšlės')) return <Trash2 className="w-5 h-5" />;
  if (name.includes('Dujos')) return <Flame className="w-5 h-5" />;
  if (name.includes('Vėdinimas')) return <Fan className="w-5 h-5" />;
  if (name.includes('Liftas')) return <ArrowUpDown className="w-5 h-5" />;
  return <Gauge className="w-5 h-5" />;
};

const getRecommendedDistribution = (type: 'individual' | 'communal', unit: string, name: string): DistributionMethod => {
  return getDefaultDistribution(name, type);
};

const isDistributionValid = (type: 'individual' | 'communal', distribution: string): boolean => {
  if (type === 'individual') {
    // Individualūs skaitliukai turi būti "Pagal butus"
    return distribution === 'per_apartment';
  }
  
  // Bendri skaitliukai gali būti bet kokiu metodu
  return true;
};

const getDistributionWarning = (type: 'individual' | 'communal', distribution: string, name: string): string | null => {
  if (type === 'individual' && distribution !== 'per_apartment') {
    return 'Individualūs skaitliukai turi būti skaičiuojami pagal butus';
  }
  
  if (type === 'communal' && distribution === 'per_apartment') {
    return 'Bendri skaitliukai gali būti skaičiuojami pagal butus';
  }
  
  // Įspėjimas dėl "Pagal plotą" pasirinkimo
  if (type === 'communal' && distribution === 'per_area') {
    if (name.includes('Internetas') || name.includes('Šiukšlės') || name.includes('Liftas') || name.includes('Vėdinimas')) {
      return 'Šis skaitliukas dažniausiai skaičiuojamas pagal butus, ne pagal plotą';
    }
  }
  
  // Įspėjimas dėl "Pagal butus" pasirinkimo šildymui
  if (type === 'communal' && distribution === 'per_apartment' && name.includes('Šildymas')) {
    return 'Šildymas be daliklių dažniausiai skaičiuojamas pagal plotą';
  }
  
  return null;
};

const getDistributionTooltip = (method: DistributionMethod) => {
  return DISTRIBUTION_TOOLTIPS[method] || '';
};

const formatPriceDisplay = (meter: LocalMeter): string => {
  if (meter.distribution_method === 'fixed_split' || meter.unit === 'Kitas') {
    const price = meter.fixed_price ?? meter.price_per_unit ?? 0;
    return `${price.toLocaleString('lt-LT', { minimumFractionDigits: 2 })} €/mėn.`;
  }

  const price = meter.price_per_unit ?? 0;
  return fmtPriceLt(price, meter.unit);
};

const computeDistributionLabel = (meter: LocalMeter): string => {
  if (meter.type === 'individual') {
    return 'Pagal suvartojimą';
  }

  return DISTRIBUTION_LABELS[meter.distribution_method] ?? meter.distribution_method;
};

const toModernMeter = (meter: LocalMeter): ModernMeter => ({
  id: meter.id,
  type: meter.name?.includes('Vanduo') && meter.name?.includes('šaltas') ? 'water_cold' :
        meter.name?.includes('Vanduo') && meter.name?.includes('karštas') ? 'water_hot' :
        meter.name?.includes('Elektra') && meter.name?.includes('individuali') ? 'electricity' :
        meter.name?.includes('Elektra') && meter.name?.includes('bendra') ? 'electricity_common' :
        meter.name?.includes('Šildymas') || meter.name?.includes('Dujos') ? 'heating' : 'electricity_common',
  mode: meter.type === 'individual' ? 'individual' : 'shared',
  unit: meter.unit,
  price: meter.unit === 'Kitas' ? (meter.fixed_price || 0) : (meter.price_per_unit || 0),
  allocation: meter.distribution_method as Allocation,
  photoRequired: (meter.collectionMode || (meter.tenantPhotoEnabled ? 'tenant_photo' : 'landlord_only')) === 'tenant_photo'
    ? (meter.requires_photo ?? true)
    : false,
  visibleToTenant: true,
  active: meter.is_active,
  name: meter.name,
  description: meter.description,
  collectionMode: (meter.collectionMode || (meter.tenantPhotoEnabled ? 'tenant_photo' : 'landlord_only')) as 'landlord_only' | 'tenant_photo'
});

const summarizeLastReading = (meter: LocalMeter) => {
  if (!meter.lastReadingDate) {
    return {
      valueLabel: '—',
      metaLabel: 'Rodmuo nepateiktas',
      isStale: true
    };
  }

  const timestamp = new Date(meter.lastReadingDate).getTime();
  const hasValidTimestamp = !Number.isNaN(timestamp);
  const formattedDate = hasValidTimestamp ? new Date(meter.lastReadingDate).toLocaleDateString('lt-LT') : '—';
  const diffDays = hasValidTimestamp
    ? Math.round((Date.now() - timestamp) / (1000 * 60 * 60 * 24))
    : null;
  const isStale = diffDays == null ? true : diffDays >= 30;
  const relative = diffDays == null
    ? ''
    : diffDays <= 0
      ? 'šiandien'
      : diffDays === 1
        ? 'prieš 1 d.'
        : diffDays < 7
          ? `prieš ${diffDays} d.`
          : diffDays < 35
            ? `prieš ${Math.round(diffDays / 7)} sav.`
            : `prieš ${Math.round(diffDays / 30)} mėn.`;

  const unitLabel = getUnitLabel(meter.unit);

  return {
    valueLabel: meter.lastReadingValue != null ? `${meter.lastReadingValue} ${unitLabel}` : '—',
    metaLabel: `${formattedDate}${relative ? ` (${relative})` : ''}`,
    isStale
  };
};

const MeterCard = memo<{
  meter: LocalMeter;
  index: number;
  onUpdate: (meter: ModernMeter) => void;
  onDelete: (id: string) => void;
  onEdit: (meter: ModernMeter) => void;
  onInlineUpdate: (index: number, field: keyof LocalMeter, value: unknown) => void;
  onTypeChange: (index: number, newType: 'individual' | 'communal') => void;
}>(({ meter, index, onUpdate, onDelete, onEdit, onInlineUpdate, onTypeChange }) => {
  const [showIconSelector, setShowIconSelector] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState<React.ReactNode>(() => getMeterIcon(meter.name));

  const modernMeter = useMemo(
    () => toModernMeter(meter),
    [
      meter.collectionMode,
      meter.description,
      meter.distribution_method,
      meter.fixed_price,
      meter.id,
      meter.is_active,
      meter.name,
      meter.price_per_unit,
      meter.requires_photo,
      meter.tenantPhotoEnabled,
      meter.type,
      meter.unit
    ]
  );

  const lastReading = useMemo(
    () => summarizeLastReading(meter),
    [meter.lastReadingDate, meter.lastReadingValue, meter.unit]
  );

  const unitLabel = useMemo(() => getUnitLabel(meter.unit), [meter.unit]);
  const priceDisplay = useMemo(
    () => formatPriceDisplay(meter),
    [meter.distribution_method, meter.fixed_price, meter.price_per_unit, meter.unit]
  );
  const distributionLabel = useMemo(
    () => computeDistributionLabel(meter),
    [meter.distribution_method, meter.type]
  );

  const distributionOptions = useMemo(
    () => getAllowedDistributions(meter.name, meter.type).map((method) => ({
      value: method,
      label: DISTRIBUTION_LABELS[method]
    })),
    [meter.name, meter.type]
  );
 
  return (
    <>
      <div className="h-full rounded-lg border border-black/10 bg-white px-3 py-2 text-[13px] text-black shadow-sm transition-shadow hover:shadow-md">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_150px_200px_110px_150px_minmax(0,1.1fr)_96px] lg:items-center">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowIconSelector(true)}
              className="w-7 h-7 bg-[#2F8481]/10 rounded-md flex items-center justify-center hover:bg-[#2F8481]/20 transition-all duration-200 hover:scale-105 shrink-0"
              title="Keisti piktogramą"
            >
              <div className="w-4 h-4 text-[#2F8481]">{selectedIcon}</div>
            </button>
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-black/45">Skaitliukas</div>
              <div className="font-semibold text-black text-sm truncate">{meter.name}</div>
              {meter.description ? (
                <div className="text-[11px] text-black/55 truncate">{meter.description}</div>
              ) : null}
            </div>
          </div>
          <div className="flex flex-col items-center lg:items-stretch gap-1 text-[12px] text-black/70">
            <span className="lg:hidden text-[10px] font-semibold uppercase tracking-wide text-black/45">Tipas</span>
            <select
              value={meter.type}
              onChange={(event) => onTypeChange(index, event.target.value as 'individual' | 'communal')}
              className="w-full rounded-md border border-black/15 bg-white px-2 py-1 text-[12px] font-medium text-black/70 focus:border-[#2F8481] focus:outline-none focus:ring-2 focus:ring-[#2F8481]/30"
            >
              <option value="individual">Individualus</option>
              <option value="communal">Bendras</option>
            </select>
          </div>
          <div className="flex flex-col items-center lg:items-stretch gap-1 text-[12px] text-black/70">
            <span className="lg:hidden text-[10px] font-semibold uppercase tracking-wide text-black/45">Paskirstymas</span>
            <select
              value={meter.distribution_method}
              onChange={(event) => onInlineUpdate(index, 'distribution_method', event.target.value as DistributionMethod)}
              className="w-full rounded-md border border-black/15 bg-white px-2 py-1 text-[12px] font-medium text-black/70 focus:border-[#2F8481] focus:outline-none focus:ring-2 focus:ring-[#2F8481]/30"
            >
              {distributionOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col items-center text-[12px] text-black/70">
            <span className="lg:hidden text-[10px] font-semibold uppercase tracking-wide text-black/45">Vienetas</span>
            <span className="font-medium text-black">{unitLabel}</span>
          </div>
          <div className="flex flex-col items-center text-[12px] text-black/70">
            <span className="lg:hidden text-[10px] font-semibold uppercase tracking-wide text-black/45">Kaina</span>
            <span className="font-semibold text-black whitespace-nowrap">{priceDisplay}</span>
          </div>
          <div className="flex flex-col items-center lg:items-start gap-1 text-[12px] text-black/70">
            <span className="lg:hidden text-[10px] font-semibold uppercase tracking-wide text-black/45">Rodmenys</span>
            <div className={`text-[12px] font-semibold ${lastReading.isStale ? 'text-[#b45309]' : 'text-black'}`}>{lastReading.valueLabel}</div>
            <div className={`text-[11px] leading-tight ${lastReading.isStale ? 'text-[#b45309]' : 'text-black/50'}`}>{lastReading.metaLabel}</div>
            <select
              value={modernMeter.collectionMode}
              onChange={(event) => {
                const selected = event.target.value as 'landlord_only' | 'tenant_photo';
                onUpdate({
                  ...modernMeter,
                  collectionMode: selected,
                  photoRequired: selected === 'tenant_photo'
                });
              }}
              className="w-full lg:max-w-[180px] rounded-md border border-black/15 bg-white px-2.5 py-1 text-[12px] font-medium text-black/70 focus:border-[#2F8481] focus:outline-none focus:ring-2 focus:ring-[#2F8481]/30"
            >
              <option value="landlord_only">Pildo nuomotojas</option>
              <option value="tenant_photo">Pildo nuomininkas (su nuotrauka)</option>
            </select>
          </div>
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={() => onEdit(modernMeter)}
              className="p-2 hover:bg-[#2F8481]/10 rounded-md text-black/60 hover:text-[#2F8481] transition-all duration-200"
            >
              <Edit3 className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(meter.id)}
              className="p-2 hover:bg-red-50 rounded-md text-red-500 hover:text-red-600 transition-all duration-200"
              title="Ištrinti"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
      <IconSelector
        isOpen={showIconSelector}
        onClose={() => setShowIconSelector(false)}
        onSelect={(icon) => {
          setSelectedIcon(icon);
          setShowIconSelector(false);
        }}
        currentIcon={selectedIcon}
      />
    </>
  );
});

MeterCard.displayName = 'MeterCard';


// Edit Meter Modal Component
interface EditMeterModalProps {
  meter: LocalMeter;
  onClose: () => void;
  onSave: (meter: Partial<LocalMeter>) => void;
}

const EditMeterModal: React.FC<EditMeterModalProps> = ({ meter, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: meter.name,
    type: meter.type,
    unit: meter.unit,
    price_per_unit: meter.price_per_unit || 0,
    fixed_price: meter.fixed_price || 0,
    distribution_method: meter.distribution_method,
    description: meter.description || '',
    requires_photo: meter.requires_photo || false
  });
  const [isSaving, setIsSaving] = useState(false);

  // Get allowed distribution methods based on meter name and mode with precondition checking
  const getAllowedDistributionMethods = (meterName: string, mode: string, context?: PreconditionContext) => {
    const allowedMethods = getAllowedDistributions(meterName, mode as 'individual' | 'communal');
    
    if (!context) {
      return allowedMethods.map(method => ({
        value: method,
        label: DISTRIBUTION_LABELS[method],
        disabled: false,
        tooltip: undefined
      }));
    }

    return allowedMethods.map(method => {
      const precondition = checkPrecondition(
        getMeterKind(meterName, mode as 'individual' | 'communal'),
        method,
        context
      );
      
      return {
        value: method,
        label: DISTRIBUTION_LABELS[method],
        disabled: !precondition.allowed,
        tooltip: precondition.reason
      };
    });
  };

  const handleSubmit = () => {
    setIsSaving(true);
    onSave(formData);
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Redaguoti skaitliuką</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pavadinimas</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481]"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipas</label>
            <select
              value={formData.type}
              onChange={(e) => {
                const newType = e.target.value as 'individual' | 'communal';
                setFormData(prev => ({ 
                  ...prev, 
                  type: newType
                  // Don't automatically change distribution_method - let user decide
                }));
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481]"
            >
              <option value="individual">Individualus</option>
              <option value="communal">Bendras</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vienetas</label>
            <select
              value={formData.unit}
              onChange={(e) => {
                const newUnit = e.target.value as 'm3' | 'kWh' | 'GJ' | 'Kitas';
                setFormData(prev => ({ 
                  ...prev, 
                  unit: newUnit
                  // Don't automatically change distribution_method - let user decide
                }));
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481]"
            >
              <option value="m3">m³ (kubiniai metrai)</option>
              <option value="kWh">kWh (kilovatvalandės)</option>
                              <option value="GJ">GJ (gigadžauliai)</option>
                <option value="Kitas">Kitas</option>
            </select>
          </div>

          {formData.unit === 'Kitas' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fiksuota suma (€)</label>
              <input
                type="number"
                step="0.01"
                value={formData.fixed_price}
                onChange={(e) => setFormData(prev => ({ ...prev, fixed_price: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481]"
                required
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kaina už vienetą (€)</label>
              <input
                type="number"
                step="0.01"
                value={formData.price_per_unit}
                onChange={(e) => setFormData(prev => ({ ...prev, price_per_unit: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481]"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pasiskirstymo metodas</label>
            <select
              value={formData.distribution_method}
              onChange={(e) => setFormData(prev => ({ ...prev, distribution_method: e.target.value as DistributionMethod }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481]"
            >
              {getAllowedDistributionMethods(formData.name, formData.type).map(method => (
                <option 
                  key={method.value} 
                  value={method.value}
                  disabled={method.disabled}
                  title={method.tooltip}
                >
                  {method.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Aprašymas</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481]"
              rows={3}
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="requires_photo"
              checked={formData.requires_photo}
              onChange={(e) => setFormData(prev => ({ ...prev, requires_photo: e.target.checked }))}
              className="h-4 w-4 text-[#2F8481] focus:ring-[#2F8481] border-gray-300 rounded"
            />
            <label htmlFor="requires_photo" className="ml-2 block text-sm text-gray-700">
              Reikia nuotraukos
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              Atšaukti
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSubmit}
              className="px-4 py-2 bg-[#2F8481] text-white hover:bg-[#297a7875] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saugoma...
                </>
              ) : (
                'Išsaugoti'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const MetersTable = memo<MetersTableProps>(({
  meters,
  onMetersChange,
  onPresetApply,
  onMeterDelete,
  onMeterUpdate
}) => {
  const [activeTab, setActiveTab] = useState<'my-meters' | 'available-meters'>('my-meters');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'individual' | 'communal'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletedMeter, setDeletedMeter] = useState<{ id: string; index: number; meter: LocalMeter } | null>(null);
  const [editingValues, setEditingValues] = useState<Partial<LocalMeter>>({});
  const [globalPhotoRequired, setGlobalPhotoRequired] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMeter, setEditingMeter] = useState<LocalMeter | null>(null);

  // Reading request functionality
  const [isReadingRequestModalOpen, setIsReadingRequestModalOpen] = useState(false);
  const [isReadingsInboxOpen, setIsReadingsInboxOpen] = useState(false);
  const [readingSubmissions, setReadingSubmissions] = useState<Array<{
    id: string;
    requestId: string;
    meterId: string;
    meterName: string;
    unitId: string;
    unitNumber: string;
    tenantName: string;
    value: number;
    photoUrl: string;
    submittedAt: string;
    status: 'submitted' | 'approved' | 'rejected';
    period: string;
  }>>([
    {
      id: '1',
      requestId: 'req-1',
      meterId: 'water_cold_1',
      meterName: 'Šaltas vanduo',
      unitId: 'unit-1',
      unitNumber: 'A-1',
      tenantName: 'Jonas Jonaitis',
      value: 45.2,
      photoUrl: '/api/photos/1.jpg',
      submittedAt: '2024-01-15T10:30:00Z',
      status: 'submitted',
      period: '2024-01'
    },
    {
      id: '2',
      requestId: 'req-1',
      meterId: 'electricity_1',
      meterName: 'Elektra',
      unitId: 'unit-1',
      unitNumber: 'A-1',
      tenantName: 'Jonas Jonaitis',
      value: 123.7,
      photoUrl: '/api/photos/2.jpg',
      submittedAt: '2024-01-15T11:15:00Z',
      status: 'approved',
      period: '2024-01'
    }
  ]);

  // Adapter functions for modern design
  const convertToModernMeter = (meter: LocalMeter): ModernMeter => {
    const mode = meter.collectionMode || (meter.tenantPhotoEnabled ? 'tenant_photo' : 'landlord_only');
    return {
      id: meter.id,
      type: meter.name?.includes('Vanduo') && meter.name?.includes('šaltas') ? 'water_cold' :
            meter.name?.includes('Vanduo') && meter.name?.includes('karštas') ? 'water_hot' :
            meter.name?.includes('Elektra') && meter.name?.includes('individuali') ? 'electricity' :
            meter.name?.includes('Elektra') && meter.name?.includes('bendra') ? 'electricity_common' :
            meter.name?.includes('Šildymas') || meter.name?.includes('Dujos') ? 'heating' : 'electricity_common',
      mode: meter.type === 'individual' ? 'individual' : 'shared',
      unit: meter.unit,
      price: meter.unit === 'Kitas' ? (meter.fixed_price || 0) : (meter.price_per_unit || 0),
      allocation: meter.distribution_method as Allocation,
      photoRequired: mode === 'tenant_photo' ? (meter.requires_photo || false) : false,
      visibleToTenant: true,
      active: meter.is_active,
      name: meter.name,
      description: meter.description,
      collectionMode: mode as 'landlord_only' | 'tenant_photo'
    };
  };

  const convertFromModernMeter = (modernMeter: ModernMeter): Partial<LocalMeter> => {
    const validDistributionMethods = ['per_apartment', 'per_area', 'per_consumption', 'fixed_split'];
    const allocation = modernMeter.allocation || '';
    const distributionMethod = validDistributionMethods.includes(allocation) 
      ? allocation as DistributionMethod 
      : 'per_apartment';
    const collectionMode = (modernMeter.collectionMode || 'landlord_only') as 'landlord_only' | 'tenant_photo';
    const tenantMode = collectionMode === 'tenant_photo';
    return {
      id: modernMeter.id,
      name: modernMeter.name,
      type: modernMeter.mode === 'individual' ? 'individual' : 'communal',
      unit: modernMeter.unit,
      price_per_unit: modernMeter.unit === 'Kitas' ? 0 : modernMeter.price,
      fixed_price: modernMeter.unit === 'Kitas' ? modernMeter.price : undefined,
      distribution_method: distributionMethod,
      requires_photo: tenantMode ? (modernMeter.photoRequired ?? true) : false,
      enableMeterEditing: modernMeter.enableMeterEditing,
      is_active: modernMeter.active,
      description: modernMeter.description,
      collectionMode,
      landlordReadingEnabled: !tenantMode,
      tenantPhotoEnabled: tenantMode
    };
  };

  const modernMeters = meters.map(convertToModernMeter);

  const handleModernMeterChange = useCallback((modernMeter: ModernMeter) => {
    const updatedMeter = convertFromModernMeter(modernMeter);
    const meterIndex = meters.findIndex(m => m.id === modernMeter.id);
    if (meterIndex !== -1) {
      const updatedMeters = [...meters];
      updatedMeters[meterIndex] = { ...updatedMeters[meterIndex], ...updatedMeter };
      onMetersChange(updatedMeters);
      
      // Update database in background (non-blocking)
      if (onMeterUpdate) {
        Promise.resolve().then(() => {
          try {
            onMeterUpdate(modernMeter.id, updatedMeter);
          } catch (error) {
            console.error('❌ Error updating meter in database:', error);
          }
        });
      }
    }
  }, [meters, onMetersChange, onMeterUpdate]);

  const handleModernMeterEdit = useCallback((modernMeter: ModernMeter) => {
    const meter = meters.find(m => m.id === modernMeter.id);
    if (meter) {
      setEditingMeter(meter);
      setShowEditModal(true);
      console.log('Opening edit modal for meter:', meter.id);
    }
  }, [meters]);

  const handleEditMeterSave = useCallback((updatedMeter: Partial<LocalMeter>) => {
    if (editingMeter) {
      try {
        // Update local state immediately for instant UI response
        const updatedMeters = meters.map(m => 
          m.id === editingMeter.id ? { ...m, ...updatedMeter } : m
        );
        onMetersChange(updatedMeters);
        
        // Close modal and reset state immediately
        setShowEditModal(false);
        setEditingMeter(null);
        
        console.log('✅ Meter updated locally:', editingMeter.id);
        
        // Update the database in the background (non-blocking)
        if (onMeterUpdate) {
          // Use Promise.resolve().then() to make it truly non-blocking
          Promise.resolve().then(() => {
            try {
              onMeterUpdate(editingMeter.id, updatedMeter);
            } catch (error) {
              console.error('❌ Error updating meter in database:', error);
              console.warn('Meter was updated locally but may not be saved to database');
            }
          });
        }
      } catch (error) {
        console.error('❌ Error updating meter:', error);
        // Don't show alert - just log the error to avoid disrupting UX
        console.warn('Error in meter update, but UI remains responsive');
      }
    }
  }, [editingMeter, meters, onMetersChange, onMeterUpdate]);

  // handleModernAddMeter function removed - using AddMeterModal instead

  const handleAddAvailableMeter = (availableMeter: any) => {
    try {
      console.log('handleAddAvailableMeter called with:', availableMeter);
      console.log('Current meters:', meters);
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const collectionMode: 'landlord_only' | 'tenant_photo' = availableMeter.tenantPhotoEnabled ? 'tenant_photo' : 'landlord_only';
      const newMeter: LocalMeter = {
        id: tempId,
        name: availableMeter.name,
        description: availableMeter.description,
        type: availableMeter.type,
        unit: availableMeter.unit,
        price_per_unit: availableMeter.unit === 'Kitas' ? 0 : availableMeter.price_per_unit,
        fixed_price: availableMeter.unit === 'Kitas' ? availableMeter.fixed_price : undefined,
        distribution_method: availableMeter.distribution_method,
        requires_photo: collectionMode === 'tenant_photo' ? (availableMeter.requires_photo ?? true) : false,
        is_active: true,
        is_inherited: false,
        is_custom: false,
        collectionMode,
        landlordReadingEnabled: collectionMode === 'landlord_only',
        tenantPhotoEnabled: collectionMode === 'tenant_photo',
        lastReadingValue: null,
        previousReadingValue: null,
        lastReadingDate: null,
        lastTotalCost: null,
        lastUpdatedAt: null
      };
      
      console.log('Created new meter:', newMeter);
      
      // Add to meters array
      const updatedMeters = [...meters, newMeter];
      console.log('Updated meters array:', updatedMeters);
      
      onMetersChange(updatedMeters);

      // put the newly added meter into edit mode
      setEditingId(tempId);
      console.log('onMetersChange called successfully');
      
      // Show success message
              alert(`Skaitliukas "${availableMeter.name}" sėkmingai pridėtas!`);
      
    } catch (error) {
      console.error('Error adding meter:', error);
      alert('Klaida pridedant skaitiklį. Bandykite dar kartą.');
    }
  };

  const handleAddMeters = useCallback((newMeters: any[]) => {
    console.log('🔍 handleAddMeters called with:', newMeters);
    const metersToAdd = newMeters.map(meter => {
      console.log('🔍 Processing meter:', meter);
      const collectionMode: 'landlord_only' | 'tenant_photo' = meter.tenantPhotoEnabled ? 'tenant_photo' : 'landlord_only';
      const processedMeter = {
        id: meter.id,
        name: meter.name || meter.label || meter.title || meter.custom_name || '',
        description: meter.description || meter.notes || '',
        type: meter.mode,
        unit: meter.unit,
        price_per_unit: meter.unit === 'Kitas' ? 0 : (meter.defaultPrice || meter.price_per_unit || 0),
        fixed_price: meter.unit === 'Kitas' ? (meter.defaultPrice || meter.fixed_price || 0) : undefined,
        distribution_method: meter.allocation || meter.distribution,
        requires_photo: collectionMode === 'tenant_photo' ? (meter.requirePhoto || meter.requiresPhoto || meter.requires_photo || false) : false,
        is_active: true,
        is_inherited: false,
        is_custom: meter.is_custom || false,
        collectionMode,
        landlordReadingEnabled: collectionMode === 'landlord_only',
        tenantPhotoEnabled: collectionMode === 'tenant_photo',
        lastReadingValue: meter.currentReading ?? meter.lastReading ?? null,
        previousReadingValue: meter.previousReading ?? null,
        lastReadingDate: meter.lastReadingDate ?? null,
        lastTotalCost: meter.lastTotalCost ?? null,
        lastUpdatedAt: meter.updatedAt ?? null
      };
      
      console.log('🔍 Processed meter:', processedMeter);
      return processedMeter;
    });
    
    console.log('🔍 Final metersToAdd:', metersToAdd);
    onMetersChange([...meters, ...metersToAdd]);
    if (metersToAdd.length > 0) {
      const lastTempMeter = metersToAdd[metersToAdd.length - 1];
      if (lastTempMeter?.id) {
        setEditingId(lastTempMeter.id);
      }
    }
  }, [meters, onMetersChange]);

  const handleDeleteMeter = useCallback((index: number) => {
    const meter = meters[index];
    setDeletedMeter({ id: meter.id, index, meter });
    const newMeters = meters.filter((_, i) => i !== index);
    onMetersChange(newMeters);
    
    setTimeout(() => {
      setDeletedMeter(null);
    }, 5000);
  }, [meters, onMetersChange]);

  const handleModernMeterDelete = useCallback((id: string) => {
    const meterIndex = meters.findIndex(m => m.id === id);
    if (meterIndex !== -1) {
      handleDeleteMeter(meterIndex);
    }
  }, [meters, handleDeleteMeter]);

  const handleUndoDelete = useCallback(() => {
    if (deletedMeter) {
      const newMeters = [...meters];
      newMeters.splice(deletedMeter.index, 0, deletedMeter.meter);
      onMetersChange(newMeters);
      setDeletedMeter(null);
    }
  }, [deletedMeter, meters, onMetersChange]);

  const handleInlineUpdate = useCallback((index: number, field: keyof LocalMeter, value: any) => {
    const updatedMeters = meters.map((meter, i) => 
      i === index ? { ...meter, [field]: value } : meter
    );
    onMetersChange(updatedMeters);
    
    // Update database in background (non-blocking)
    if (onMeterUpdate) {
      Promise.resolve().then(() => {
        try {
          onMeterUpdate(meters[index].id, { [field]: value });
        } catch (error) {
          console.error('❌ Error updating meter field in database:', error);
        }
      });
    }
  }, [meters, onMetersChange, onMeterUpdate]);

  const handleEditStart = useCallback((meter: LocalMeter) => {
    setEditingId(meter.id);
    setEditingValues({
      name: meter.name,
      type: meter.type,
      unit: meter.unit,
      price_per_unit: meter.price_per_unit,
      fixed_price: meter.fixed_price,
      distribution_method: meter.distribution_method,
      description: meter.description,
      requires_photo: meter.requires_photo,
      collectionMode: meter.collectionMode // Include collectionMode in editing values
    });
  }, []);

  const handleEditSave = useCallback((index: number) => {
    const meter = meters[index];
    const updatedMeter = { ...meter };
    let hasChanges = false;

    // Apply all editing values
    Object.entries(editingValues).forEach(([field, value]) => {
      if (field === 'type' && value !== meter.type) {
        updatedMeter.type = value as 'individual' | 'communal';
        hasChanges = true;
      } else if (field === 'unit' && value !== meter.unit) {
        updatedMeter.unit = value as 'm3' | 'kWh' | 'GJ' | 'Kitas';
        hasChanges = true;
      } else if (field === 'price_per_unit' && value !== meter.price_per_unit) {
        updatedMeter.price_per_unit = value as number;
        hasChanges = true;
      } else if (field === 'distribution_method' && value !== meter.distribution_method) {
        updatedMeter.distribution_method = value as DistributionMethod;
        hasChanges = true;
      } else if (field === 'name' && value !== meter.name) {
        updatedMeter.name = value as string;
        hasChanges = true;
      } else if (field === 'description' && value !== meter.description) {
        updatedMeter.description = value as string;
        hasChanges = true;
      } else if (field === 'requires_photo') {
         updatedMeter.requires_photo = value as boolean;
         hasChanges = true;
      } else if (field === 'collectionMode' && value !== meter.collectionMode) {
        const mode = value as 'landlord_only' | 'tenant_photo';
        updatedMeter.collectionMode = mode;
        const isTenantMode = mode === 'tenant_photo';
        updatedMeter.landlordReadingEnabled = !isTenantMode;
        updatedMeter.tenantPhotoEnabled = isTenantMode;
        updatedMeter.requires_photo = isTenantMode ? (meter.requires_photo ?? true) : false;
        hasChanges = true;
      }
    });

    // If type changed, update distribution method automatically
    if (editingValues.type && editingValues.type !== meter.type) {
      const recommendedDistribution = getRecommendedDistribution(
        editingValues.type as 'individual' | 'communal', 
        updatedMeter.unit, 
        updatedMeter.name
      );
              updatedMeter.distribution_method = recommendedDistribution;
      hasChanges = true;
    }

    // Update UI immediately and exit edit mode
    setEditingId(null);
    setEditingValues({});

    // Only update if there are changes
    if (hasChanges) {
      const updatedMeters = meters.map((m, i) => i === index ? updatedMeter : m);
      onMetersChange(updatedMeters);
      
      // Update database in background (non-blocking)
      if (onMeterUpdate) {
        Promise.resolve().then(() => {
          try {
            onMeterUpdate(meter.id, updatedMeter);
          } catch (error) {
            console.error('❌ Error saving meter changes to database:', error);
          }
        });
      }
    }
  }, [meters, editingValues, onMetersChange, onMeterUpdate]);

  const handleEditCancel = useCallback(() => {
    setEditingId(null);
    setEditingValues({});
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter') {
      handleEditSave(index);
    } else if (e.key === 'Escape') {
      handleEditCancel();
    }
  }, [handleEditSave, handleEditCancel]);

  const handleTypeChange = useCallback((index: number, newType: 'individual' | 'communal') => {
    const meter = meters[index];
    const recommendedDistribution = getRecommendedDistribution(newType, meter.unit, meter.name);
    
    const updatedMeter = { 
      ...meter, 
      type: newType, 
              distribution_method: recommendedDistribution
    };
    
    const updatedMeters = meters.map((m, i) => i === index ? updatedMeter : m);
    onMetersChange(updatedMeters);
    
    // Update database in background (non-blocking)
    if (onMeterUpdate) {
      Promise.resolve().then(() => {
        try {
          onMeterUpdate(meter.id, updatedMeter);
        } catch (error) {
          console.error('❌ Error updating meter type in database:', error);
        }
      });
    }
  }, [meters, onMetersChange, onMeterUpdate]);

  const handleConvertToCustom = useCallback((index: number) => {
    const meter = meters[index];
    if (meter.is_inherited) {
      // Convert to custom meter
      const updatedMeter = { ...meter, is_inherited: false, inherited_from_address_id: undefined };
      const updatedMeters = meters.map((m, i) => i === index ? updatedMeter : m);
      onMetersChange(updatedMeters);
      
      // Update database in background (non-blocking)
      if (onMeterUpdate) {
        Promise.resolve().then(() => {
          try {
            onMeterUpdate(meter.id, { is_inherited: false, inherited_from_address_id: undefined });
          } catch (error) {
            console.error('❌ Error converting meter to custom in database:', error);
          }
        });
      }
    }
  }, [meters, onMetersChange, onMeterUpdate]);

  const handleResetToInherited = useCallback((index: number) => {
    const meter = meters[index];
    if (!meter.is_inherited && meter.inherited_from_address_id) {
      // Reset to inherited values
      const updatedMeter = { ...meter, is_inherited: true };
      const updatedMeters = meters.map((m, i) => i === index ? updatedMeter : m);
      onMetersChange(updatedMeters);
      
      // Update database in background (non-blocking)
      if (onMeterUpdate) {
        Promise.resolve().then(() => {
          try {
            onMeterUpdate(meter.id, { is_inherited: true });
          } catch (error) {
            console.error('❌ Error resetting meter to inherited in database:', error);
          }
        });
      }
    }
  }, [meters, onMetersChange, onMeterUpdate]);

  // Auto-fill and lock units based on meter type
  const getAutoUnit = (meterName: string): string => {
    const name = meterName.toLowerCase();
    if (name.includes('vanduo') || name.includes('water')) return 'm3';
    if (name.includes('elektra') || name.includes('electricity')) return 'kWh';
    if (name.includes('šildymas') || name.includes('heating')) return 'GJ';
    if (name.includes('dujos') || name.includes('gas')) return 'm3';
    if (name.includes('internetas') || name.includes('internet')) return 'MB';
    if (name.includes('šiukšlės') || name.includes('garbage')) return 'fixed';
    return 'custom';
  };

  const isUnitLocked = (meterName: string): boolean => {
    const autoUnit = getAutoUnit(meterName);
    return autoUnit !== 'custom';
  };

  // Get allowed distribution methods based on meter name and mode with precondition checking
  const getAllowedDistributionMethods = (meterName: string, mode: string, context?: PreconditionContext) => {
    const allowedMethods = getAllowedDistributions(meterName, mode as 'individual' | 'communal');
    
    if (!context) {
      return allowedMethods.map(method => ({
        value: method,
        label: DISTRIBUTION_LABELS[method],
        disabled: false,
        tooltip: undefined
      }));
    }

    return allowedMethods.map(method => {
      const precondition = checkPrecondition(
        getMeterKind(meterName, mode as 'individual' | 'communal'),
        method,
        context
      );
      
      return {
        value: method,
        label: DISTRIBUTION_LABELS[method],
        disabled: !precondition.allowed,
        tooltip: precondition.reason
      };
    });
  };

  const handleGlobalPhotoToggle = () => {
    setGlobalPhotoRequired(!globalPhotoRequired);
    // Update all meters to match global setting
    const updatedMeters = meters.map(meter => ({
      ...meter,
      requires_photo: !globalPhotoRequired
    }));
    onMetersChange(updatedMeters);
  };

  // Reading request handlers
  const handleSendReadingRequest = useCallback((selectedMeterIds: string[], period: string, dueDate: string) => {
    console.log('Sending reading request:', { selectedMeterIds, period, dueDate });
    // TODO: Implement API call to send reading request
            alert(`Prašymas išsiųstas ${selectedMeterIds.length} skaitliukams. Laikotarpis: ${period}, terminas: ${dueDate}`);
  }, []);

  const handleApproveSubmission = useCallback((submissionId: string) => {
    console.log('Approving submission:', submissionId);
    // TODO: Implement API call to approve submission
    setReadingSubmissions(prev => 
      prev.map(sub => 
        sub.id === submissionId 
          ? { ...sub, status: 'approved' }
          : sub
      )
    );
  }, []);

  const handleRejectSubmission = useCallback((submissionId: string, reason: string) => {
    console.log('Rejecting submission:', submissionId, reason);
    // TODO: Implement API call to reject submission
    setReadingSubmissions(prev => 
      prev.map(sub => 
        sub.id === submissionId 
          ? { ...sub, status: 'rejected' }
          : sub
      )
    );
  }, []);

  const handleViewPhoto = useCallback((photoUrl: string) => {
    console.log('Viewing photo:', photoUrl);
    // TODO: Implement photo viewer modal
    window.open(photoUrl, '_blank');
  }, []);
                        
  return (
    <div className="bg-white rounded-2xl border border-black/10 shadow-lg overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-black/10 bg-gradient-to-r from-white to-[#2F8481]/5">
        <div className="mx-auto flex w-full max-w-full flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between lg:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl">
          <div>
            <h2 className="text-xl font-bold text-black">Skaitliukai</h2>
            <p className="text-sm text-black/60 mt-1">
              Valdykite skaitliukus ir jų nustatymus
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
            type="button"
              onClick={() => setShowAddModal(true)}
              className="px-5 py-3 bg-[#2F8481] text-white rounded-xl hover:opacity-90 transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-[1.02] font-semibold"
            >
              <Plus className="w-4 h-4" />
              Pridėti skaitiklį
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 pb-6 pt-5">
        <div className="mx-auto w-full max-w-full space-y-6 lg:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl">
          {/* Current meters */}
          {meters.length > 0 && (
            <div>
              <h4 className="text-lg font-bold text-black mb-5 flex items-center gap-2">
                <div className="w-2 h-2 bg-[#2F8481] rounded-full" />
                Dabartiniai skaitliukai ({meters.length})
              </h4>
              <div className="space-y-4">
                <div className="hidden lg:grid lg:grid-cols-[minmax(0,2fr)_150px_200px_110px_150px_minmax(0,1.1fr)_96px] items-center gap-3 rounded-lg bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-black/45 shadow-sm">
                  <span>Skaitliukas</span>
                  <span className="text-center">Tipas</span>
                  <span className="text-center">Paskirstymas</span>
                  <span className="text-center">Vienetas</span>
                  <span className="text-center">Kaina</span>
                  <span className="text-center">Rodmenys</span>
                  <span className="text-right">Veiksmai</span>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
                {meters.map((meter, index) => (
                  <MeterCard
                    key={meter.id}
                    meter={meter}
                    index={index}
                    onUpdate={handleModernMeterChange}
                    onDelete={handleModernMeterDelete}
                    onEdit={handleModernMeterEdit}
                    onInlineUpdate={handleInlineUpdate}
                    onTypeChange={handleTypeChange}
                  />
                ))}
                </div>
              </div>
            </div>
          )}

          {/* Add Meter Button - removed duplicate */}
        </div>
      </div>

      {/* Undo Snackbar */}
      {deletedMeter && (
        <div className="fixed bottom-6 left-6 bg-neutral-900 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 z-50 animate-in slide-in-from-bottom-2 duration-300">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium">Skaitliukas pašalintas</span>
          <button
            onClick={handleUndoDelete}
            className="text-[#2F8481] hover:text-[#2a7875] text-sm font-semibold transition-colors duration-200"
          >
            Atšaukti
          </button>
        </div>
      )}

      {/* Reading Request Modal */}
      <ReadingRequestModal
        isOpen={isReadingRequestModalOpen}
        onClose={() => setIsReadingRequestModalOpen(false)}
        apartmentMeters={meters}
        onSendRequest={handleSendReadingRequest}
      />

      {/* Readings Inbox Modal */}
      <ReadingsInbox
        isOpen={isReadingsInboxOpen}
        onClose={() => setIsReadingsInboxOpen(false)}
        readingSubmissions={readingSubmissions}
        onApproveSubmission={handleApproveSubmission}
        onRejectSubmission={handleRejectSubmission}
        onViewPhoto={handleViewPhoto}
      />

      {/* Add Meter Modal */}
      <UniversalAddMeterModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAddMeters={handleAddMeters}
        existingMeterNames={meters.map(m => m.name)}
        title="Pridėti skaitiklį"
        allowMultiple={true}
      />

      {/* Edit Meter Modal */}
      {editingMeter && (
        <EditMeterModal
          meter={editingMeter}
          onClose={() => {
            setShowEditModal(false);
            setEditingMeter(null);
          }}
          onSave={handleEditMeterSave}
        />
      )}
    </div>
  );
});

// Add displayName for better debugging
MetersTable.displayName = 'MetersTable';
