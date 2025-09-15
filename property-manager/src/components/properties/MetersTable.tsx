import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
  Zap
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
  { name: 'Vanduo (šaltas)', type: 'individual' as const, unit: 'm3' as const, price_per_unit: 1.2, distribution_method: 'per_consumption' as const, description: 'Šalto vandens suvartojimas', icon: 'Vanduo', requires_photo: true, enableMeterEditing: true, landlordReadingEnabled: true, tenantPhotoEnabled: true },
  { name: 'Vanduo (karštas)', type: 'individual' as const, unit: 'm3' as const, price_per_unit: 3.5, distribution_method: 'per_consumption' as const, description: 'Karšto vandens suvartojimas', icon: 'Vanduo', requires_photo: true, enableMeterEditing: true, landlordReadingEnabled: true, tenantPhotoEnabled: false },
  { name: 'Elektra (individuali)', type: 'individual' as const, unit: 'kWh' as const, price_per_unit: 0.15, distribution_method: 'per_consumption' as const, description: 'Elektros suvartojimas', icon: 'Elektra', requires_photo: true, enableMeterEditing: true, landlordReadingEnabled: true, tenantPhotoEnabled: false },
  { name: 'Elektra (bendra)', type: 'communal' as const, unit: 'kWh' as const, price_per_unit: 0.15, distribution_method: 'per_apartment' as const, description: 'Namo apsvietimas', icon: 'Elektra', requires_photo: false, enableMeterEditing: true, landlordReadingEnabled: false, tenantPhotoEnabled: false },
  { name: 'Šildymas', type: 'individual' as const, unit: 'GJ' as const, price_per_unit: 25.0, distribution_method: 'per_area' as const, description: 'Namo šildymo sąnaudos', icon: 'Šildymas', requires_photo: true, enableMeterEditing: true, landlordReadingEnabled: true, tenantPhotoEnabled: true },
  { name: 'Internetas', type: 'communal' as const, unit: 'Kitas' as const, price_per_unit: 0, fixed_price: 60, distribution_method: 'per_apartment' as const, description: 'Namo interneto paslaugos', icon: 'Internetas', requires_photo: false, enableMeterEditing: true, landlordReadingEnabled: false, tenantPhotoEnabled: false },
  { name: 'Šiukšlių išvežimas', type: 'communal' as const, unit: 'Kitas' as const, price_per_unit: 0, fixed_price: 45, distribution_method: 'per_apartment' as const, description: 'Šiukšlių išvežimo paslaugos', icon: 'Šiukšlės', requires_photo: false, enableMeterEditing: true, landlordReadingEnabled: false, tenantPhotoEnabled: false },
  { name: 'Dujos', type: 'individual' as const, unit: 'm3' as const, price_per_unit: 0.8, distribution_method: 'per_consumption' as const, description: 'Dujų suvartojimas', icon: 'Dujos', requires_photo: true, enableMeterEditing: true, landlordReadingEnabled: true, tenantPhotoEnabled: true },
  { name: 'Vėdinimas', type: 'communal' as const, unit: 'Kitas' as const, price_per_unit: 0, fixed_price: 30, distribution_method: 'per_apartment' as const, description: 'Vėdinimo sistemos', icon: 'Vėdinimas', requires_photo: false, enableMeterEditing: true, landlordReadingEnabled: false, tenantPhotoEnabled: false },
  { name: 'Lifto priežiūra', type: 'communal' as const, unit: 'Kitas' as const, price_per_unit: 0, fixed_price: 25, distribution_method: 'per_apartment' as const, description: 'Lifto techninė priežiūra', icon: 'Liftas', requires_photo: false, enableMeterEditing: true, landlordReadingEnabled: false, tenantPhotoEnabled: false },
  { name: 'Kitas', type: 'individual' as const, unit: 'kWh' as const, price_per_unit: 0.1, distribution_method: 'per_consumption' as const, description: 'Kitas individualus skaitliukas', icon: 'BoltIcon', requires_photo: true, enableMeterEditing: true, landlordReadingEnabled: true, tenantPhotoEnabled: true }
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
    case 'per_apartment': return 'Pagal butus';
    case 'per_area': return 'Pagal plotą';
    case 'fixed_split': return 'Fiksuotas';
    default: return method;
  }
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
    <div className="contents border-t border-gray-100 hover:bg-gray-50 transition-colors">
      {/* Icon */}
      <div className="px-2 py-2 flex items-center justify-center">
        <button
          onClick={() => setShowIconSelector(true)}
          className="w-6 h-6 bg-[#2F8481]/10 rounded flex items-center justify-center hover:bg-[#2F8481]/20 transition-colors"
          title="Keisti piktogramą"
        >
          <div className="w-4 h-4">{selectedIcon}</div>
        </button>
      </div>

      {/* Name and description */}
      <div className="px-2 py-2">
        <div className="font-medium text-gray-900 text-xs leading-4 truncate">{meter.name}</div>
        {meter.description && (
          <div className="text-xs text-gray-500 mt-0.5 leading-3 truncate">{meter.description}</div>
        )}
      </div>

      {/* Type badge */}
      <div className="px-2 py-2">
        <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium ${
          meter.type === 'individual' 
            ? 'bg-[#2F8481]/10 text-[#2F8481]' 
            : 'bg-orange-100 text-orange-700'
        }`}>
          {meter.type === 'individual' ? 'Ind.' : 'Bendr.'}
        </span>
      </div>

      {/* Unit */}
      <div className="px-2 py-2 text-xs text-gray-600">
        {getUnitLabel(meter.unit)}
      </div>

      {/* Price */}
      <div className="px-2 py-2 text-right text-xs font-medium text-gray-900">
        {getPriceDisplay()}
      </div>

      {/* Distribution method */}
      <div className="px-2 py-2 text-xs text-gray-600 truncate">
        {meter.type === 'communal' ? getDistributionLabel(meter.distribution_method) : 'Pagal suvartojimą'}
      </div>

      {/* Collection mode toggle - XOR logic */}
      <div className="px-2 py-2 flex items-center justify-center">
        <button
          onClick={() => {
            // XOR logic: if currently landlord_only, switch to tenant_photo, and vice versa
            const newCollectionMode = modernMeter.collectionMode === 'landlord_only' ? 'tenant_photo' : 'landlord_only';
                         const updatedMeter = { 
               ...modernMeter, 
               collectionMode: newCollectionMode as 'landlord_only' | 'tenant_photo',
               // If switching to landlord_only, disable photo requirement
               photoRequired: newCollectionMode === 'tenant_photo'
             };
            onUpdate(updatedMeter);
          }}
          className={`w-8 h-4 rounded-full transition-colors duration-200 ease-in-out relative ${
            modernMeter.collectionMode === 'tenant_photo' ? 'bg-blue-500' : 'bg-gray-500'
          }`}
          title={modernMeter.collectionMode === 'tenant_photo' ? 'Pildo nuomininkas' : 'Pildo nuomotojas'}
        >
          <span
            className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transform transition-transform duration-200 ease-in-out ${
              modernMeter.collectionMode === 'tenant_photo' ? 'translate-x-4 left-0.5' : 'translate-x-0 left-0.5'
            }`}
          />
        </button>
      </div>

      {/* Photo requirement toggle - only for tenant_photo mode */}
      <div className="px-2 py-2 flex items-center justify-center">
        <button
          onClick={() => {
            // Only allow photo toggle if in tenant_photo mode
            if (modernMeter.collectionMode !== 'tenant_photo') return;
            
            const newPhotoRequired = !modernMeter.photoRequired;
            const updatedMeter = { 
              ...modernMeter, 
              photoRequired: newPhotoRequired
            };
            onUpdate(updatedMeter);
          }}
          className={`w-8 h-4 rounded-full transition-colors duration-200 ease-in-out relative ${
            modernMeter.collectionMode !== 'tenant_photo' ? 'bg-gray-200 cursor-not-allowed' :
            modernMeter.photoRequired ? 'bg-blue-500' : 'bg-gray-300'
          }`}
          title={modernMeter.collectionMode !== 'tenant_photo' ? 'Nuotrauka tik nuomininko režime' : 
                 modernMeter.photoRequired ? 'Reikia nuotraukos' : 'Nereikia nuotraukos'}
        >
          <span
            className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transform transition-transform duration-200 ease-in-out ${
              modernMeter.photoRequired ? 'translate-x-4 left-0.5' : 'translate-x-0 left-0.5'
            }`}
          />
        </button>
      </div>

      {/* Actions */}
      <div className="px-2 py-2 text-right">
        <div className="flex items-center justify-end gap-0.5">
          <button
            onClick={() => onEdit(modernMeter)}
            className="p-1 hover:bg-gray-200 rounded text-gray-600 hover:text-gray-700 transition-colors"
            title="Redaguoti"
          >
            <Edit3 className="w-3 h-3" />
          </button>
          <button
            onClick={() => onDelete(meter.id)}
            className="p-1 hover:bg-red-50 rounded text-red-600 hover:text-red-700 transition-colors"
            title="Ištrinti"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
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
    if (meter.name?.includes('Vanduo') && meter.name?.includes('šaltas')) {
      type = 'water_cold';
    } else if (meter.name?.includes('Vanduo') && meter.name?.includes('karštas')) {
      type = 'water_hot';
    } else if (meter.name?.includes('Elektra') && meter.name?.includes('individuali')) {
      type = 'electricity';
    } else if (meter.name?.includes('Elektra') && meter.name?.includes('bendra')) {
      type = 'electricity_common';
    } else if (meter.name?.includes('Šildymas') || meter.name?.includes('Dujos')) {
      type = 'heating';
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
    const validDistributionMethods = ['per_apartment', 'per_area', 'per_consumption', 'fixed_split'];
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
      collectionMode: modernMeter.collectionMode || 'landlord_only' // Ensure collectionMode is set
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
      
      const processedMeter = {
        id: meter.id,
        name: meter.name || meter.label || meter.title || meter.custom_name || '',
        description: meter.description || meter.notes || '',
        type: meter.mode, // Use mode field directly - it should be 'individual' or 'communal'
        unit: meter.unit,
        price_per_unit: meter.unit === 'Kitas' ? 0 : (meter.defaultPrice || meter.price_per_unit || 0),
        fixed_price: meter.unit === 'Kitas' ? (meter.defaultPrice || meter.fixed_price || 0) : undefined,
        distribution_method: meter.allocation || meter.distribution,
        requires_photo: meter.requirePhoto || meter.requiresPhoto || meter.requires_photo || false,
        is_active: true,
        is_inherited: false,
        is_custom: meter.is_custom || false,
        collectionMode: 'landlord_only' as const, // Default to landlord_only for new meters
        landlordReadingEnabled: meter.landlordReadingEnabled || false,
        tenantPhotoEnabled: meter.tenantPhotoEnabled || false
      };
      
      console.log('🔍 Processed meter:', processedMeter);
      return processedMeter;
    });
    
    console.log('🔍 Final metersToAdd:', metersToAdd);
    onMetersChange([...meters, ...metersToAdd]);
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
                        
  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
                          <h2 className="text-lg font-semibold text-gray-900">Skaitliukai</h2>
            <p className="text-sm text-gray-600 mt-1">
              Valdykite skaitliukus ir jų nustatymus
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-[#2F8481] text-white rounded-lg hover:bg-[#297a77] transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Pridėti skaitiklį
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="space-y-6">
          {/* Current meters */}
          {meters.length > 0 && (
            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-4">Dabartiniai skaitliukai ({meters.length})</h4>
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="max-h-[60vh] overflow-y-auto overflow-x-auto">{/* Added horizontal scroll */}
                <div className="grid grid-cols-[50px_minmax(180px,2fr)_120px_100px_140px_160px_120px_100px_100px] gap-0 min-w-[1070px]">
                  {/* Table Header */}
                  <div className="contents text-xs text-gray-500 font-medium bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                    <div className="px-2 py-2"></div> {/* Icon space */}
                    <div className="px-2 py-2">Pavadinimas</div>
                    <div className="px-2 py-2">Tipas</div>
                    <div className="px-2 py-2">Vienetas</div>
                    <div className="px-2 py-2 text-right">Kaina</div>
                    <div className="px-2 py-2">Paskirstymas</div>
                    <div className="px-2 py-2 flex items-center gap-1 group relative">
                      Rodmenys (nuomotojas)
                      <div 
                        className="w-3 h-3 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center text-xs cursor-help hover:bg-gray-200 transition-colors"
                        title="Rodmenys (nuomotojas): Rodmenis suveda tik nuomotojas. Nuomininkui šis skaitliukas nerodomas iki sąskaitos."
                      >
                        ?
                      </div>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                        Rodmenys (nuomotojas): Rodmenis suveda tik nuomotojas. Nuomininkui šis skaitliukas nerodomas iki sąskaitos.
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                      </div>
                    </div>
                    <div className="px-2 py-2 flex items-center gap-1 group relative">
                      Rodmuo + nuotrauka (nuomininkas)
                      <div 
                        className="w-3 h-3 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs cursor-help hover:bg-blue-200 transition-colors"
                        title="Rodmuo + nuotrauka (nuomininkas): Nuomininkas pateikia rodmenį su nuotrauka ir skaičiumi. Nuomotojas tvirtina."
                      >
                        ?
                      </div>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                        Rodmuo + nuotrauka (nuomininkas): Nuomininkas pateikia rodmenį su nuotrauka ir skaičiumi. Nuomotojas tvirtina.
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                      </div>
                    </div>
                    <div className="px-2 py-2 text-right">Veiksmai</div>
                  </div>
                  
                  {/* Table Rows */}
                  {meters.map((meter) => (
                    <MeterRow
                      key={meter.id}
                      meter={meter}
                      onUpdate={handleModernMeterChange}
                      onDelete={handleModernMeterDelete}
                      onEdit={handleModernMeterEdit}
                    />
                  ))}
                </div>
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
};
