import React, { useState, useCallback, useMemo, useEffect, useRef, useLayoutEffect } from 'react';
import {
  Search,
  Plus,
  Info,
  Bolt,
  Camera,
  Send,
  FileCheck,
  X,
  Check,
  Eye,
  Pencil,
  Trash,
  Trash2,
  Edit3,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  MapPin,
  Phone,
  Mail,
  CreditCard,
  Banknote,
  ArrowRight,
  ArrowLeft,
  Image,
  EyeOff,
  Users,
  Building2,
  Wrench,
  Beaker,
  Flame,
  Receipt,
  Star,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Sparkles as SparklesIcon,
  Droplets,
  Wifi,
  Fan,
  ArrowUpDown,
  Gauge,
  Zap,
  Copy,
  MoreVertical
} from 'lucide-react';
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
  ALLOWED,
  type DistributionMethod,
  type PreconditionContext,
  type PreconditionResult
} from '../../constants/meterDistribution';
import { type Allocation } from '../../types/meters';

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
  enableMeterEditing?: boolean;
  is_inherited?: boolean; // true if inherited from address defaults
  inherited_from_address_id?: string;
  collectionMode: 'landlord_only' | 'tenant_photo'; // New field for collection mode
  landlordReadingEnabled: boolean;
  tenantPhotoEnabled: boolean;
}

interface MetersTableProps {
  meters: LocalMeter[];
  onMetersChange: (meters: LocalMeter[]) => void;
  onPresetApply?: (meters: LocalMeter[]) => void;
  onMeterDelete?: (id: string) => void;
  onMeterUpdate?: (id: string, updates: Partial<LocalMeter>) => void;
}

const AVAILABLE_METERS = [
  { name: 'Šaltas vanduo', type: 'individual' as const, unit: 'm3' as const, price_per_unit: 1.32, distribution_method: 'per_consumption' as const, description: 'Šalto vandens tiekimas ir nuotekos', icon: 'Vanduo', requires_photo: true, enableMeterEditing: true, landlordReadingEnabled: true, tenantPhotoEnabled: true },
  { name: 'Karštas vanduo', type: 'individual' as const, unit: 'm3' as const, price_per_unit: 3.50, distribution_method: 'per_consumption' as const, description: 'Karšto vandens tiekimas', icon: 'Vanduo', requires_photo: true, enableMeterEditing: true, landlordReadingEnabled: true, tenantPhotoEnabled: true },
  { name: 'Elektra', type: 'individual' as const, unit: 'kWh' as const, price_per_unit: 0.23, distribution_method: 'per_consumption' as const, description: 'Buto elektros suvartojimas', icon: 'Elektra', requires_photo: true, enableMeterEditing: true, landlordReadingEnabled: true, tenantPhotoEnabled: true },
  { name: 'Šildymas', type: 'individual' as const, unit: 'kWh' as const, price_per_unit: 0.095, distribution_method: 'per_area' as const, description: 'Centrinis šildymas pagal plotą', icon: 'Šildymas', requires_photo: true, enableMeterEditing: true, landlordReadingEnabled: true, tenantPhotoEnabled: true },
  { name: 'Dujos', type: 'individual' as const, unit: 'm3' as const, price_per_unit: 0.99, distribution_method: 'per_consumption' as const, description: 'Gamtinių dujų suvartojimas', icon: 'Dujos', requires_photo: true, enableMeterEditing: true, landlordReadingEnabled: true, tenantPhotoEnabled: true },
  { name: 'Techninė apžiūra', type: 'communal' as const, unit: 'Kitas' as const, price_per_unit: 0, fixed_price: 0, distribution_method: 'per_apartment' as const, description: 'Namo techninė priežiūra ir apžiūra', icon: 'Techninė apžiūra', requires_photo: false, enableMeterEditing: true, landlordReadingEnabled: true, tenantPhotoEnabled: false },
  { name: 'Šiukšlės', type: 'communal' as const, unit: 'Kitas' as const, price_per_unit: 0, fixed_price: 5, distribution_method: 'fixed_split' as const, description: 'Komunalinių atliekų išvežimas', icon: 'Šiukšlės', requires_photo: false, enableMeterEditing: true, landlordReadingEnabled: false, tenantPhotoEnabled: false }
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

const getUnitSuffix = (unit: string) => {
  switch (unit) {
    case 'm3': return '€/m³';
    case 'kWh': return '€/kWh';
    case 'GJ': return '€/GJ';
    case 'Kitas': return '€/vnt';
    default: return '€';
  }
};

// Format price with Lithuanian locale
const formatPrice = (price: number, unit: string): string => {
  const formattedPrice = price.toLocaleString('lt-LT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3
  });

  return `${formattedPrice} €`;
};

// Get price suffix based on unit
const getPriceSuffix = (unit: string): string => {
  const suffix = getUnitSuffix(unit);
  return `€/${suffix}`;
};

const getDistributionLabel = (method: string) => {
  switch (method) {
    case 'per_apartment': return 'Pagal butų sk.';
    case 'per_area': return 'Pagal plotą';
    case 'fixed_split': return 'Fiksuotas';
    default: return method;
  }
};

const getRecommendedDistribution = (type: 'individual' | 'communal', unit: string, name: string): DistributionMethod => {
  return getDefaultDistribution(name, type);
};

const isDistributionValid = (type: 'individual' | 'communal', distribution: string, name: string = ''): boolean => {
  // Use centralized ALLOWED config for proper validation
  const kind = getMeterKind(name, type);
  const cfg = ALLOWED[kind];
  return cfg ? cfg.allowed.includes(distribution as DistributionMethod) : true;
};

const getDistributionWarning = (type: 'individual' | 'communal', distribution: string, name: string): string | null => {
  if (!isDistributionValid(type, distribution, name)) {
    const kind = getMeterKind(name, type);
    const cfg = ALLOWED[kind];
    const allowedLabels = cfg?.allowed.map((d: DistributionMethod) => DISTRIBUTION_LABELS[d]).join(', ') || '';
    return `Šis paskirstymo metodas netinka. Galimi: ${allowedLabels}`;
  }

  if (type === 'communal' && distribution === 'per_apartment') {
    return 'Bendri skaitliukai gali būti skaičiuojami pagal butų sk.';
  }

  // Įspėjimas dėl "Pagal plotą" pasirinkimo
  if (type === 'communal' && distribution === 'per_area') {
    if (name.includes('Internetas') || name.includes('Šiukšlės') || name.includes('Liftas') || name.includes('Vėdinimas')) {
      return 'Šis skaitliukas dažniausiai skaičiuojamas pagal butų sk., ne pagal plotą';
    }
  }

  // Įspėjimas dėl "Pagal butų sk." pasirinkimo šildymui
  if (type === 'communal' && distribution === 'per_apartment' && name.includes('Šildymas')) {
    return 'Šildymas be daliklių dažniausiai skaičiuojamas pagal plotą';
  }

  return null;
};

const getDistributionTooltip = (method: DistributionMethod) => {
  return DISTRIBUTION_TOOLTIPS[method] || '';
};

// MeterRow component for displaying individual meters
const MeterRow: React.FC<{
  meter: LocalMeter;
  onUpdate: (meter: ModernMeter) => void;
  onDelete: (id: string) => void;
  onEdit: (meter: ModernMeter) => void;
}> = ({ meter, onUpdate, onDelete, onEdit }) => {
  const [showIconSelector, setShowIconSelector] = useState(false);

  const getMeterIcon = (name: string) => {
    if (name.includes('Vanduo')) return <Droplets className="w-5 h-5" />;
    if (name.includes('Elektra')) return <Zap className="w-5 h-5" />;
    if (name.includes('Šildymas')) return <Flame className="w-5 h-5" />;
    if (name.includes('Internetas')) return <Wifi className="w-5 h-5" />;
    if (name.includes('Šiukšlės')) return <Trash2 className="w-5 h-5" />;
    if (name.includes('Dujos')) return <Flame className="w-5 h-5" />;
    if (name.includes('Vėdinimas')) return <Fan className="w-5 h-5" />;
    if (name.includes('Liftas')) return <ArrowUpDown className="w-5 h-5" />;
    return <Gauge className="w-5 h-5" />;
  };

  const [selectedIcon, setSelectedIcon] = useState<React.ReactNode>(getMeterIcon(meter.name));

  // Convert meter to modern format inline
  const modernMeter: ModernMeter = {
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
    photoRequired: meter.requires_photo || false,
    visibleToTenant: true,
    active: meter.is_active,
    name: meter.name,
    description: meter.description,
    collectionMode: meter.collectionMode || 'landlord_only' // Ensure collectionMode is set
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

  const getPriceDisplay = () => {
    if (meter.distribution_method === 'fixed_split') {
      const price = meter.fixed_price || meter.price_per_unit || 0;
      return `${price.toLocaleString('lt-LT', { minimumFractionDigits: 2 })} €/mėn.`;
    }
    const price = meter.price_per_unit || 0;
    return `${price.toLocaleString('lt-LT', { minimumFractionDigits: 2 })} €/${getUnitLabel(meter.unit)}`;
  };

  const getDistributionLabel = (method: DistributionMethod) => {
    return DISTRIBUTION_LABELS[method] || method;
  };

  return (
    <div className="contents border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50 transition-colors duration-150 group/row">
      {/* Column 1: Icon + Name + Description */}
      <div className="px-4 py-4 flex items-center gap-3">
        <button
          onClick={() => setShowIconSelector(true)}
          className="w-8 h-8 bg-[#2F8481]/10 rounded-lg flex items-center justify-center hover:bg-[#2F8481]/20 transition-colors flex-shrink-0"
          title="Keisti piktogramą"
          aria-label="Keisti skaitliuko piktogramą"
        >
          <div className="w-5 h-5 text-[#2F8481]">{selectedIcon}</div>
        </button>
        <div className="min-w-0">
          <div className="font-medium text-gray-900 text-sm leading-5 truncate">{meter.name}</div>
          {meter.description && (
            <div className="text-xs text-gray-500 mt-0.5 leading-4 truncate">{meter.description}</div>
          )}
        </div>
      </div>

      {/* Column 2: Type + Unit (merged) */}
      <div className="px-4 py-4 flex items-center gap-2">
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${meter.type === 'individual'
          ? 'bg-[#2F8481]/10 text-[#2F8481]'
          : 'bg-orange-100 text-orange-700'
          }`}>
          {meter.type === 'individual' ? 'Ind.' : 'Bendr.'}
        </span>
        <span className="text-xs text-gray-500">•</span>
        <span className="text-xs text-gray-600 font-medium">{getUnitLabel(meter.unit)}</span>
      </div>

      {/* Column 3: Price */}
      <div className="px-4 py-4 text-right">
        <span className="text-sm font-medium text-gray-900">{getPriceDisplay()}</span>
      </div>

      {/* Column 4: Distribution method */}
      <div className="px-4 py-4">
        <span className="text-xs text-gray-600">
          {meter.type === 'communal' ? getDistributionLabel(meter.distribution_method) : 'Pagal suvartojimą'}
        </span>
      </div>

      {/* Column 5: Reading Mode (single unified selector) */}
      <div className="px-4 py-4 flex items-center justify-center">
        <button
          onClick={() => {
            // Toggle between landlord_only and tenant_photo modes
            const newMode = meter.collectionMode === 'tenant_photo' ? 'landlord_only' : 'tenant_photo';
            const updatedMeter = {
              ...modernMeter,
              photoRequired: newMode === 'tenant_photo',
              collectionMode: newMode as 'landlord_only' | 'tenant_photo'
            };
            onUpdate(updatedMeter);
          }}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer hover:opacity-80 ${meter.collectionMode === 'tenant_photo'
            ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          title={meter.collectionMode === 'tenant_photo'
            ? 'Nuomininkas pateikia rodmenį su nuotrauka. Spauskite norėdami pakeisti į nuomotojo režimą.'
            : 'Nuomotojas pateikia rodmenį. Spauskite norėdami pakeisti į nuomininko režimą.'}
          aria-label={`Rodmenų režimas: ${meter.collectionMode === 'tenant_photo' ? 'Nuomininkas su nuotrauka' : 'Nuomotojas'}`}
        >
          <span>{meter.collectionMode === 'tenant_photo' ? <Camera className="w-3.5 h-3.5" /> : <Building2 className="w-3.5 h-3.5" />}</span>
          <span>{meter.collectionMode === 'tenant_photo' ? 'Nuomininkas' : 'Nuomotojas'}</span>
        </button>
      </div>

      {/* Column 6: Actions */}
      <div className="px-4 py-4 flex items-center justify-end gap-1.5">
        <button
          onClick={() => onEdit(modernMeter)}
          className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500 hover:text-gray-700 transition-colors"
          title="Redaguoti"
          aria-label="Redaguoti skaitliuką"
        >
          <Edit3 className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(meter.id);
          }}
          className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
          title="Ištrinti"
          aria-label="Ištrinti skaitliuką"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Icon Selector Modal */}
      <IconSelector
        isOpen={showIconSelector}
        onClose={() => setShowIconSelector(false)}
        onSelect={(icon) => {
          setSelectedIcon(icon);
          setShowIconSelector(false);
        }}
        currentIcon={selectedIcon}
      />
    </div>
  );
};

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70]">
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

export const MetersTable: React.FC<MetersTableProps> = ({
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
  const [selectedMeterId, setSelectedMeterId] = useState<string | null>(null);
  const [showAddDropdown, setShowAddDropdown] = useState(false);

  // Refs for connector line
  const containerRef = useRef<HTMLDivElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);
  const listItemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const panelRef = useRef<HTMLDivElement>(null);
  const [connectorPath, setConnectorPath] = useState<string>('');
  const lastValidPath = useRef<string>('');

  // Auto-select first meter when meters are available - use useLayoutEffect for synchronous selection
  useLayoutEffect(() => {
    if (meters.length > 0 && !selectedMeterId) {
      setSelectedMeterId(meters[0].id);
    }
  }, [meters, selectedMeterId]);

  // Calculate connector path with robust measurement
  const updateConnector = useCallback(() => {
    if (!selectedMeterId || !containerRef.current || !panelRef.current) {
      setConnectorPath('');
      return;
    }

    const selectedItemEl = listItemRefs.current.get(selectedMeterId);
    if (!selectedItemEl) {
      setConnectorPath('');
      return;
    }

    // Double RAF technique: wait for layout to fully settle after fonts/images/transitions
    const measure = () => {
      if (!containerRef.current || !panelRef.current || !selectedItemEl) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const itemRect = selectedItemEl.getBoundingClientRect();
      const panelRect = panelRef.current.getBoundingClientRect();

      // Validate bounding boxes - skip if zero or invalid
      if (containerRect.width === 0 || containerRect.height === 0 ||
        itemRect.width === 0 || itemRect.height === 0 ||
        panelRect.width === 0 || panelRect.height === 0) {
        // Use last valid path to prevent flicker
        if (lastValidPath.current) {
          setConnectorPath(lastValidPath.current);
        }
        return;
      }

      // Calculate positions relative to container
      const startX = itemRect.right - containerRect.left;
      const startY = itemRect.top + itemRect.height / 2 - containerRect.top;
      const endX = panelRect.left - containerRect.left;
      const endY = panelRect.top + 40 - containerRect.top; // 40px from panel top

      // Validate calculated positions
      if (startX <= 0 || startY <= 0 || endX <= 0 || endY <= 0 ||
        startX > containerRect.width || endX > containerRect.width ||
        startY > containerRect.height || endY > containerRect.height) {
        if (lastValidPath.current) {
          setConnectorPath(lastValidPath.current);
        }
        return;
      }

      // Create a smooth bezier curve
      const controlX1 = startX + 20;
      const controlX2 = endX - 20;

      const path = `M ${startX} ${startY} C ${controlX1} ${startY}, ${controlX2} ${endY}, ${endX} ${endY}`;
      lastValidPath.current = path;
      setConnectorPath(path);
    };

    // Initial measure
    requestAnimationFrame(() => {
      // Second RAF to catch final layout after modal/fonts/scroll settle
      requestAnimationFrame(measure);
    });
  }, [selectedMeterId]);

  // Update connector on mount, selection, and resize - use useLayoutEffect for synchronous measurement
  useLayoutEffect(() => {
    // Trigger initial measurement with double RAF
    updateConnector();

    // ResizeObserver for container, panel, and selected item
    const resizeObserver = new ResizeObserver(() => {
      updateConnector();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    if (panelRef.current) {
      resizeObserver.observe(panelRef.current);
    }
    // Also observe the selected item
    const selectedItemEl = selectedMeterId ? listItemRefs.current.get(selectedMeterId) : null;
    if (selectedItemEl) {
      resizeObserver.observe(selectedItemEl);
    }

    // Scroll listener on list container
    const listContainer = listContainerRef.current;
    const handleScroll = () => {
      updateConnector();
    };
    if (listContainer) {
      listContainer.addEventListener('scroll', handleScroll, { passive: true });
    }

    // Window resize listener
    window.addEventListener('resize', updateConnector);

    return () => {
      resizeObserver.disconnect();
      if (listContainer) {
        listContainer.removeEventListener('scroll', handleScroll);
      }
      window.removeEventListener('resize', updateConnector);
    };
  }, [updateConnector, selectedMeterId]);

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
    console.log('🔍 Converting meter to modern format:', {
      name: meter.name,
      type: meter.type,
      distribution_method: meter.distribution_method
    });

    // Determine the correct type based on meter name
    let type: ModernMeter['type'] = 'electricity';
    const n = (meter.name || '').toLowerCase();
    if (n.includes('šaltas') || (n.includes('vanduo') && n.includes('šaltas'))) {
      type = 'water_cold';
    } else if (n.includes('karštas') || (n.includes('vanduo') && n.includes('karštas'))) {
      type = 'water_hot';
    } else if (n.includes('elektra') && n.includes('individuali')) {
      type = 'electricity';
    } else if (n.includes('elektra') && n.includes('bendra')) {
      type = 'electricity_common';
    } else if (n.includes('šildymas') || n.includes('dujos')) {
      type = 'heating';
    } else if (n.includes('elektra')) {
      type = 'electricity';
    } else {
      type = 'electricity_common'; // Default for other communal services
    }

    return {
      id: meter.id,
      type: type,
      mode: meter.type === 'individual' ? 'individual' : 'shared',
      unit: meter.unit,
      price: meter.unit === 'Kitas' ? (meter.fixed_price || 0) : (meter.price_per_unit || 0),
      allocation: meter.distribution_method,
      photoRequired: meter.requires_photo || false,
      enableMeterEditing: meter.enableMeterEditing ?? true,
      visibleToTenant: true,
      active: meter.is_active,
      name: meter.name,
      description: meter.description,
      collectionMode: meter.collectionMode || 'landlord_only' // Ensure collectionMode is set
    };
  };

  const convertFromModernMeter = (modernMeter: ModernMeter): Partial<LocalMeter> => {
    // Validate allocation before converting
    const validDistributionMethods = ['per_apartment', 'per_area', 'per_consumption', 'per_person', 'fixed_split'];
    const allocation = modernMeter.allocation || '';
    const distributionMethod = validDistributionMethods.includes(allocation)
      ? allocation as DistributionMethod
      : 'per_apartment';

    return {
      id: modernMeter.id,
      name: modernMeter.name,
      type: modernMeter.mode === 'individual' ? 'individual' : 'communal',
      unit: modernMeter.unit,
      price_per_unit: modernMeter.unit === 'Kitas' ? 0 : modernMeter.price,
      fixed_price: modernMeter.unit === 'Kitas' ? modernMeter.price : undefined,
      distribution_method: distributionMethod,
      requires_photo: modernMeter.photoRequired,
      enableMeterEditing: modernMeter.enableMeterEditing,
      is_active: modernMeter.active,
      description: modernMeter.description,
      collectionMode: modernMeter.collectionMode || 'landlord_only',
      // Mutual exclusion: derive toggle values from collectionMode only
      landlordReadingEnabled: modernMeter.collectionMode === 'landlord_only',
      tenantPhotoEnabled: modernMeter.collectionMode === 'tenant_photo'
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

      // Convert available meter to regular meter format
      const newMeter: LocalMeter = {
        id: `${availableMeter.name}_${Date.now()}`,
        name: availableMeter.name,
        description: availableMeter.description,
        type: availableMeter.type,
        unit: availableMeter.unit,
        price_per_unit: availableMeter.unit === 'Kitas' ? 0 : availableMeter.price_per_unit,
        fixed_price: availableMeter.unit === 'Kitas' ? availableMeter.fixed_price : undefined,
        distribution_method: availableMeter.distribution_method,
        requires_photo: availableMeter.requires_photo,
        is_active: true,
        is_inherited: false,
        is_custom: false,
        collectionMode: 'landlord_only' as const, // Default to landlord_only for new meters
        landlordReadingEnabled: availableMeter.landlordReadingEnabled || false,
        tenantPhotoEnabled: availableMeter.tenantPhotoEnabled || false
      };

      console.log('Created new meter:', newMeter);

      // Add to meters array
      const updatedMeters = [...meters, newMeter];
      console.log('Updated meters array:', updatedMeters);

      onMetersChange(updatedMeters);
      console.log('onMetersChange called successfully');

      // Auto-select the newly added meter for immediate editing
      setSelectedMeterId(newMeter.id);
      console.log('✅ Auto-selected new meter for editing:', newMeter.id);

    } catch (error) {
      console.error('Error adding meter:', error);
      alert('Klaida pridedant skaitiklį. Bandykite dar kartą.');
    }
  };

  const handleAddMeters = useCallback((newMeters: any[]) => {
    console.log('🔍 handleAddMeters called with:', newMeters);

    const metersToAdd = newMeters.map(meter => {
      console.log('🔍 Processing meter:', meter);

      const requiresPhoto = meter.requirePhoto || meter.requiresPhoto || meter.requires_photo || meter.photoRequired || false;
      const processedMeter = {
        id: meter.id,
        name: meter.name || meter.label || meter.title || meter.custom_name || '',
        description: meter.description || meter.notes || '',
        type: meter.mode, // Use mode field directly - it should be 'individual' or 'communal'
        unit: meter.unit,
        price_per_unit: meter.unit === 'Kitas' ? 0 : (meter.price || meter.defaultPrice || meter.price_per_unit || 0),
        fixed_price: meter.unit === 'Kitas' ? (meter.price || meter.defaultPrice || meter.fixed_price || 0) : undefined,
        distribution_method: meter.allocation || meter.distribution,
        requires_photo: requiresPhoto,
        is_active: true,
        is_inherited: false,
        is_custom: meter.is_custom || false,
        collectionMode: requiresPhoto ? 'tenant_photo' as const : 'landlord_only' as const,
        landlordReadingEnabled: meter.landlordReadingEnabled || !requiresPhoto,
        tenantPhotoEnabled: requiresPhoto
      };

      console.log('🔍 Processed meter:', processedMeter);
      return processedMeter;
    });

    console.log('🔍 Final metersToAdd:', metersToAdd);
    onMetersChange([...meters, ...metersToAdd]);

    // Auto-select the first newly added meter for immediate editing
    if (metersToAdd.length > 0) {
      setSelectedMeterId(metersToAdd[0].id);
      setShowAddModal(false);
      console.log('✅ Auto-selected new meter for editing:', metersToAdd[0].id);
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
      } else if (field === 'requires_photo' && value !== meter.requires_photo) {
        updatedMeter.requires_photo = value as boolean;
        hasChanges = true;
      } else if (field === 'collectionMode' && value !== meter.collectionMode) {
        updatedMeter.collectionMode = value as 'landlord_only' | 'tenant_photo';
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
  // Get meter icon based on name/type
  const getMeterIcon = (name: string, isSelected: boolean) => {
    const iconClass = `w-4 h-4 ${isSelected ? 'text-[#2F8481]' : 'text-gray-500'}`;
    const lowerName = name.toLowerCase();
    if (lowerName.includes('vanduo') || lowerName.includes('water')) {
      return <Droplets className={iconClass} />;
    } else if (lowerName.includes('elektr') || lowerName.includes('electric')) {
      return <Zap className={iconClass} />;
    } else if (lowerName.includes('šild') || lowerName.includes('heat') || lowerName.includes('duj')) {
      return <Flame className={iconClass} />;
    }
    return <Gauge className={iconClass} />;
  };

  // Get allocation label
  const getAllocationLabel = (method: string) => {
    switch (method) {
      case 'per_consumption': return 'Pagal suvartojimą';
      case 'per_apartment': return 'Pagal butų sk.';
      case 'per_area': return 'Pagal plotą';
      case 'fixed_split': return 'Fiksuotas';
      default: return method;
    }
  };

  // Get short allocation label
  const getAllocationShort = (method: string) => {
    switch (method) {
      case 'per_consumption': return 'Suvartojimas';
      case 'per_apartment': return 'Butų sk.';
      case 'per_area': return 'Plotas';
      case 'fixed_split': return 'Fiksuotas';
      default: return method;
    }
  };

  // Check if meter is fully configured
  const isMeterConfigured = (meter: LocalMeter) => {
    return meter.price_per_unit > 0 && meter.distribution_method && meter.collectionMode;
  };

  // Get reading mode label
  const getReadingModeLabel = (mode: string) => {
    return mode === 'tenant_photo' ? 'Nuomininkas' : 'Savininkas';
  };

  // Get selected meter
  const selectedMeter = meters.find(m => m.id === selectedMeterId);

  // Duplicate meter handler
  const handleDuplicateMeter = (meter: LocalMeter) => {
    const newMeter: LocalMeter = {
      ...meter,
      id: `${meter.id}_copy_${Date.now()}`,
      name: `${meter.name} (kopija)`,
    };
    onMetersChange([...meters, newMeter]);
    setSelectedMeterId(newMeter.id);
  };

  // Quick add preset meters
  const presetMeters = [
    { name: 'Šaltas vanduo', icon: Droplets, unit: 'm3' as const, price: 1.32 },
    { name: 'Karštas vanduo', icon: Droplets, unit: 'm3' as const, price: 3.50 },
    { name: 'Elektra', icon: Zap, unit: 'kWh' as const, price: 0.23 },
    { name: 'Šildymas', icon: Flame, unit: 'kWh' as const, price: 0.095 },
  ];

  const handleAddPreset = (preset: typeof presetMeters[0]) => {
    const newMeter: LocalMeter = {
      id: `meter_${Date.now()}`,
      name: preset.name,
      type: 'individual',
      unit: preset.unit,
      price_per_unit: preset.price,
      distribution_method: 'per_consumption',
      description: '',
      is_active: true,
      requires_photo: true,
      collectionMode: 'tenant_photo',
      landlordReadingEnabled: true,
      tenantPhotoEnabled: true,
    };
    onMetersChange([...meters, newMeter]);
    setSelectedMeterId(newMeter.id);
    setShowAddDropdown(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* SVG Connector Line - Premium & Clear */}
      {connectorPath && selectedMeter && (
        <svg
          className="absolute inset-0 pointer-events-none z-20"
          style={{ width: '100%', height: '100%' }}
        >
          <defs>
            {/* Strong teal gradient */}
            <linearGradient id="connectorGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#0d9488" stopOpacity="1" />
              <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.9" />
            </linearGradient>
            {/* Glow filter */}
            <filter id="connectorGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Glow layer (behind) */}
          <path
            d={connectorPath}
            fill="none"
            stroke="#14b8a6"
            strokeWidth="6"
            strokeLinecap="round"
            strokeOpacity="0.2"
            className="transition-colors duration-200"
          />

          {/* Main connector line */}
          <path
            d={connectorPath}
            fill="none"
            stroke="url(#connectorGradient)"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="transition-colors duration-200"
          />

          {/* Start endpoint - ring + dot */}
          <circle
            cx={connectorPath.split(' ')[1]}
            cy={connectorPath.split(' ')[2]}
            r="6"
            fill="white"
            stroke="#14b8a6"
            strokeWidth="2"
            className="transition-colors duration-200"
          />
          <circle
            cx={connectorPath.split(' ')[1]}
            cy={connectorPath.split(' ')[2]}
            r="3"
            fill="#0d9488"
            className="transition-colors duration-200"
          />

          {/* End endpoint - extract end coordinates */}
          {(() => {
            const parts = connectorPath.split(' ');
            const endX = parts[parts.length - 2];
            const endY = parts[parts.length - 1];
            return (
              <>
                <circle cx={endX} cy={endY} r="6" fill="white" stroke="#14b8a6" strokeWidth="2" className="transition-colors duration-200" />
                <circle cx={endX} cy={endY} r="3" fill="#0d9488" className="transition-colors duration-200" />
              </>
            );
          })()}
        </svg>
      )}

      {/* 3-Column Split Layout: LIST | GUTTER | EDITOR */}
      <div
        className="grid transition-colors duration-200"
        style={{
          gridTemplateColumns: selectedMeter ? '1fr 48px 1fr' : '1fr',
          gap: '0'
        }}
      >
        {/* LEFT: Meters List - Browse Zone */}
        <div className="transition-colors duration-200">
          <div className="bg-white/95 rounded-xl border border-white/10 shadow-md p-4" style={{ backgroundImage: 'url(/images/CardsBackground.webp)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
            {/* List Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-gray-400" />
                  <span className="text-[14px] font-semibold text-gray-900">
                    Skaitliukai ({meters.length})
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 mt-0.5 ml-6">Pasirinkite, kad redaguotumėte → Taikoma visiems butams</p>
              </div>

              {/* Split Add Button */}
              <div className="relative">
                <div className="flex">
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="px-3 py-1.5 bg-[#2F8481] text-white rounded-l-lg hover:bg-[#297a77] transition-colors text-[12px] font-medium flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Pridėti
                  </button>
                  <button
                    onClick={() => setShowAddDropdown(!showAddDropdown)}
                    className="px-2 py-1.5 bg-[#2F8481] text-white rounded-r-lg hover:bg-[#297a77] transition-colors border-l border-white/20"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Dropdown */}
                {showAddDropdown && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-20">
                    <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                      Greitas pridėjimas
                    </div>
                    {presetMeters.map((preset) => (
                      <button
                        key={preset.name}
                        onClick={() => handleAddPreset(preset)}
                        className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2.5 text-[13px] text-gray-700"
                      >
                        <preset.icon className="w-4 h-4 text-gray-400" />
                        {preset.name}
                        <span className="ml-auto text-[11px] text-gray-400">{preset.price.toFixed(2)} €</span>
                      </button>
                    ))}
                    <div className="border-t border-gray-100 mt-1 pt-1">
                      <button
                        onClick={() => { setShowAddModal(true); setShowAddDropdown(false); }}
                        className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2.5 text-[13px] text-gray-700"
                      >
                        <Wrench className="w-4 h-4 text-gray-400" />
                        Pasirinktinis...
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Meters List */}
            {meters.length > 0 ? (
              <div ref={listContainerRef} className="space-y-2">
                {meters.map((meter, index) => {
                  const isSelected = meter.id === selectedMeterId;
                  const isConfigured = isMeterConfigured(meter);

                  return (
                    <div
                      key={meter.id}
                      ref={(el) => {
                        if (el) listItemRefs.current.set(meter.id, el);
                      }}
                      onClick={() => setSelectedMeterId(meter.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') setSelectedMeterId(meter.id);
                        if (e.key === 'ArrowDown' && index < meters.length - 1) {
                          setSelectedMeterId(meters[index + 1].id);
                        }
                        if (e.key === 'ArrowUp' && index > 0) {
                          setSelectedMeterId(meters[index - 1].id);
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-pressed={isSelected}
                      className={`group flex items-center gap-3 px-3.5 py-3.5 rounded-xl cursor-pointer transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[#2F8481]/50 ${isSelected
                        ? 'bg-teal-50/80 border-l-4 border-l-[#2F8481] border border-t-teal-200/60 border-r-teal-200/60 border-b-teal-200/60 shadow-sm'
                        : 'bg-white/70 hover:bg-white/90 border border-gray-300 hover:border-gray-400 shadow-sm'
                        }`}
                    >
                      {/* Status dot + Icon */}
                      <div className="relative">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? 'bg-[#2F8481]/10' : 'bg-gray-100'
                          }`}>
                          {getMeterIcon(meter.name, isSelected)}
                        </div>
                        {/* Status dot */}
                        <div className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${isConfigured ? 'bg-emerald-400' : 'bg-amber-400'
                          }`} />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-[13px] font-bold truncate ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>
                            {meter.name}
                          </span>
                          <span className={`inline-flex px-1.5 py-0.5 rounded-md text-[10px] font-bold border ${meter.type === 'individual'
                            ? 'bg-teal-50 text-teal-700 border-teal-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                            {meter.type === 'individual' ? 'Individualus' : 'Bendras'}
                          </span>
                          {isSelected && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#2F8481]/10 text-[#2F8481] text-[9px] font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#2F8481] animate-pulse" />
                              Selected
                            </span>
                          )}
                        </div>
                        {/* Row 2: Summary - clearer typography */}
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5 text-[12px] leading-snug">
                          <span className="font-bold text-gray-900">{(meter.unit === 'Kitas' ? (meter.fixed_price ?? 0) : (meter.price_per_unit ?? 0)).toFixed(2)} €/{meter.unit}</span>
                          <span className="text-gray-300 text-[10px]">•</span>
                          <span className="text-gray-600 font-medium">Paskirstymas: <span className="text-gray-900">{getAllocationShort(meter.distribution_method)}</span></span>
                          <span className="text-gray-300 text-[10px]">•</span>
                          <span className="text-gray-600 font-medium">Rodmenys: <span className="text-gray-900">{getReadingModeLabel(meter.collectionMode)}</span></span>
                        </div>
                      </div>

                      {/* Delete button - visible on hover */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Ar tikrai norite ištrinti "${meter.name}"?`)) {
                            onMetersChange(meters.filter(m => m.id !== meter.id));
                            if (selectedMeterId === meter.id) {
                              setSelectedMeterId(null);
                            }
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                        title="Ištrinti"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Empty State */
              <div className="text-center py-10 px-4 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Gauge className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-[13px] font-medium text-gray-600 mb-1">Nėra pridėtų skaitliukų</p>
                <p className="text-[11px] text-gray-400 mb-4">Pridėkite skaitliukus, kad galėtumėte skaičiuoti mokesčius</p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 bg-[#2F8481] text-white rounded-lg text-[12px] font-medium inline-flex items-center gap-1.5 hover:bg-[#297a77] transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Pridėti pirmąjį
                </button>
              </div>
            )}
          </div>
        </div>

        {/* GUTTER: Simple Divider Column */}
        {selectedMeter && (
          <div className="relative flex items-center justify-center">
            {/* Simple vertical divider */}
            <div className="w-px h-full bg-gradient-to-b from-transparent via-gray-200/60 to-transparent" />
          </div>
        )}

        {/* RIGHT: Editor Panel - Workspace Zone */}
        {selectedMeter ? (
          <div
            className="bg-white/95 rounded-xl border border-white/10 shadow-lg transition-colors duration-200 flex flex-col"
            style={{ backgroundImage: 'url(/images/CardsBackground.webp)', backgroundSize: 'cover', backgroundPosition: 'center' }}
            ref={panelRef}
          >
            {/* Panel Header - Workspace bar */}
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[#2F8481]/10 flex items-center justify-center flex-shrink-0">
                    {getMeterIcon(selectedMeter.name, true)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[15px] font-bold text-gray-900 truncate">{selectedMeter.name}</span>
                      <span className="inline-flex px-1.5 py-0.5 rounded bg-[#2F8481]/10 text-[#2F8481] text-[9px] font-semibold uppercase tracking-wide">
                        Editing
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <div className="w-1 h-1 rounded-full bg-emerald-400/70" />
                      <span className="text-[10px] text-gray-400/80 font-medium">Auto-saved</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleDuplicateMeter(selectedMeter)}
                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                    title="Kopijuoti skaitliuką"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setSelectedMeterId(null)}
                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                    title="Uždaryti"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Form Content */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1 h-[400px]">

              {/* Card 1: Type */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[12px] font-bold text-gray-800 uppercase tracking-wide">Tipas</h4>
                </div>
                <p className="text-[12px] font-medium text-gray-600 mb-3">
                  {selectedMeter.type === 'individual'
                    ? 'Individualus – kiekvienas butas turi atskirą skaitliuką.'
                    : 'Bendras – vienas skaitliukas visam pastatui, sąnaudos paskirstomos.'}
                </p>
                <div className="flex gap-1 p-1 bg-white rounded-lg border border-gray-200 shadow-sm">
                  <button
                    onClick={() => handleModernMeterChange({ ...convertToModernMeter(selectedMeter), mode: 'individual' })}
                    className={`flex-1 py-2 rounded-md text-[12px] font-bold transition-colors ${selectedMeter.type === 'individual'
                      ? 'bg-[#2F8481] text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-50'
                      }`}
                  >
                    Individualus
                  </button>
                  <button
                    onClick={() => handleModernMeterChange({ ...convertToModernMeter(selectedMeter), mode: 'shared' })}
                    className={`flex-1 py-2 rounded-md text-[12px] font-bold transition-colors ${selectedMeter.type === 'communal'
                      ? 'bg-[#2F8481] text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-50'
                      }`}
                  >
                    Bendras
                  </button>
                </div>
              </div>

              {/* Card 2: Pricing */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[12px] font-bold text-gray-800 uppercase tracking-wide">Kainodara</h4>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-1 flex items-center shadow-sm">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={selectedMeter.unit === 'Kitas' ? (selectedMeter.fixed_price ?? 0) : (selectedMeter.price_per_unit ?? 0)}
                    onChange={(e) => {
                      const newPrice = parseFloat(e.target.value) || 0;
                      handleModernMeterChange({ ...convertToModernMeter(selectedMeter), price: newPrice });
                    }}
                    placeholder="0.00"
                    className="flex-1 px-3 py-2 text-[14px] font-bold text-gray-900 bg-transparent border-none focus:ring-0 focus:outline-none"
                  />
                  <div className="px-3 py-1.5 bg-gray-100 rounded-md text-[12px] font-bold text-gray-600 mr-1">
                    €/{selectedMeter.unit === 'Kitas' ? 'Kitas' : selectedMeter.unit}
                  </div>
                </div>
                <p className="text-[11px] font-medium text-gray-500 mt-2">
                  {selectedMeter.unit === 'Kitas' ? 'Fiksuota mėnesinė suma.' : 'Kaina naudojama mėnesiniam mokesčiui skaičiuoti.'}
                </p>
              </div>

              {/* Card 3: Distribution */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[12px] font-bold text-gray-800 uppercase tracking-wide">Paskirstymas</h4>
                </div>
                <p className="text-[12px] font-medium text-gray-600 mb-3">
                  {selectedMeter.distribution_method === 'per_consumption'
                    ? 'Pagal suvartojimą – mokestis skaičiuojamas pagal faktinį suvartojimą.'
                    : selectedMeter.distribution_method === 'per_area'
                      ? 'Pagal plotą – mokestis paskirstomas pagal buto plotą.'
                      : selectedMeter.distribution_method === 'per_apartment'
                        ? 'Pagal butų sk. – mokestis dalinamas lygiomis dalimis tarp butų.'
                        : selectedMeter.distribution_method === 'per_person'
                          ? 'Pagal asmenis – mokestis dalinamas pagal gyventojų skaičių.'
                          : 'Fiksuotas – vienoda suma kiekvienam butui.'}
                </p>
                <div className="grid grid-cols-2 gap-1 p-1 bg-white rounded-lg border border-gray-200 shadow-sm">
                  <button
                    onClick={() => handleModernMeterChange({ ...convertToModernMeter(selectedMeter), allocation: 'per_consumption' })}
                    className={`py-2 rounded-md text-[11px] font-bold transition-colors ${selectedMeter.distribution_method === 'per_consumption'
                      ? 'bg-[#2F8481] text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-50'
                      }`}
                  >
                    Suvartojimas
                  </button>
                  <button
                    onClick={() => handleModernMeterChange({ ...convertToModernMeter(selectedMeter), allocation: 'per_area' })}
                    className={`py-2 rounded-md text-[11px] font-bold transition-colors ${selectedMeter.distribution_method === 'per_area'
                      ? 'bg-[#2F8481] text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-50'
                      }`}
                  >
                    Pagal plotą
                  </button>
                  <button
                    onClick={() => handleModernMeterChange({ ...convertToModernMeter(selectedMeter), allocation: 'per_apartment' })}
                    className={`py-2 rounded-md text-[11px] font-bold transition-colors ${selectedMeter.distribution_method === 'per_apartment'
                      ? 'bg-[#2F8481] text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-50'
                      }`}
                  >
                    Pagal butų sk.
                  </button>
                  <button
                    onClick={() => handleModernMeterChange({ ...convertToModernMeter(selectedMeter), allocation: 'per_person' })}
                    className={`py-2 rounded-md text-[11px] font-bold transition-colors ${selectedMeter.distribution_method === 'per_person'
                      ? 'bg-[#2F8481] text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-50'
                      }`}
                  >
                    Pagal asmenis
                  </button>
                </div>
              </div>

              {/* Card 4: Readings */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[12px] font-bold text-gray-800 uppercase tracking-wide">Rodmenys</h4>
                </div>
                <div className="flex gap-1 p-1 bg-white rounded-lg border border-gray-200 shadow-sm mb-3">
                  <button
                    onClick={() => handleModernMeterChange({ ...convertToModernMeter(selectedMeter), collectionMode: 'landlord_only', photoRequired: false })}
                    className={`flex-1 py-2 rounded-md text-[12px] font-bold transition-colors flex items-center justify-center gap-2 ${selectedMeter.collectionMode === 'landlord_only'
                      ? 'bg-[#2F8481] text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-50'
                      }`}
                  >
                    <Building2 className="w-4 h-4" />
                    Savininkas
                  </button>
                  <button
                    onClick={() => handleModernMeterChange({ ...convertToModernMeter(selectedMeter), collectionMode: 'tenant_photo', photoRequired: true })}
                    className={`flex-1 py-2 rounded-md text-[12px] font-bold transition-colors flex items-center justify-center gap-2 ${selectedMeter.collectionMode === 'tenant_photo'
                      ? 'bg-[#2F8481] text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-50'
                      }`}
                  >
                    <Camera className="w-4 h-4" />
                    Nuomininkas
                  </button>
                </div>

                {/* Info Callout */}
                <div className="flex items-start gap-2.5 px-3 py-2.5 bg-blue-50/50 rounded-lg border border-blue-100">
                  <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <p className="text-[12px] font-medium text-blue-900 leading-relaxed">
                    {selectedMeter.collectionMode === 'tenant_photo'
                      ? 'Nuomininkas pateikia rodmenis su nuotrauka.'
                      : 'Savininkas suveda ir deklaruoja rodmenis.'}
                  </p>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="pt-3 mt-3 border-t border-gray-100">
                <button
                  onClick={() => { handleModernMeterDelete(selectedMeter.id); setSelectedMeterId(null); }}
                  className="w-full px-4 py-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50/80 border border-dashed border-gray-200 hover:border-red-200 rounded-xl text-[12px] font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Ištrinti skaitliuką
                </button>
              </div>
            </div>
          </div>
        ) : meters.length > 0 ? (
          /* Empty Selection State */
          <div className="bg-gray-50/50 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center" ref={panelRef}>
            <div className="text-center py-14 px-10">
              <div className="w-16 h-16 bg-gray-100/80 rounded-2xl flex items-center justify-center mx-auto mb-4 ring-4 ring-gray-50">
                <Edit3 className="w-7 h-7 text-gray-400" />
              </div>
              <p className="text-[15px] text-gray-700 font-semibold">Pasirinkite skaitliuką</p>
              <p className="text-[12px] text-gray-400 mt-1 font-medium">kad galėtumėte redaguoti nustatymus</p>
            </div>
          </div>
        ) : null}
      </div>

      {/* Undo Snackbar */}
      {
        deletedMeter && (
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
        )
      }

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
      {
        editingMeter && (
          <EditMeterModal
            meter={editingMeter}
            onClose={() => {
              setShowEditModal(false);
              setEditingMeter(null);
            }}
            onSave={handleEditMeterSave}
          />
        )
      }
    </div >
  );
};
