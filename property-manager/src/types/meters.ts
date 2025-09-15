// Meter system type definitions - NEW POLICY SYSTEM
import { type DistributionMethod as NewDistributionMethod } from '../constants/meterDistribution';

// New meter policy system
export type CollectionMode = 'landlord_only' | 'tenant_photo';
export type Scope = 'apartment' | 'building' | 'none';
export type Distribution = 'consumption' | 'per_apartment' | 'per_area' | 'fixed' | 'fixed_split' | 'per_consumption' | 'per_person';
export type Unit = 'm3' | 'kWh' | 'GJ' | 'custom' | 'Kitas';

export type MeterPolicy = {
  collectionMode: CollectionMode; // kas pildo
  scope: Scope;                   // kur renkama
};

export type Meter = {
  id: string;
  kind: 'water_cold'|'water_hot'|'electricity_ind'|'electricity_shared'|'heating'|'internet'|'waste'|'ventilation'|string;
  type: 'individual'|'shared';
  distribution: Distribution;
  unit: Unit;
  pricePerUnit?: number;       // jei ne fixed
  fixedAmountPerApt?: number;  // jei fixed €/butui
  currency: 'EUR';
  policy: MeterPolicy;
  
  // Legacy compatibility fields
  name?: string;           // alias for title
  title?: string;          // meter display name
  mode?: 'individual' | 'communal'; // legacy mode field
  icon?: string;           // icon name
  description?: string;    // meter description
  fixed_price?: number;    // fixed price for fixed meters
  price_per_unit?: number; // price per unit (legacy)
  price?: number;          // legacy price field
  distribution_method?: Distribution; // distribution method (legacy)
  requires_photo?: boolean; // alias for photoRequired
  photoRequired?: boolean; // requires photo
  is_active?: boolean;     // alias for active
  active?: boolean;        // meter is active
  is_custom?: boolean;     // custom meter flag
  is_inherited?: boolean;  // inherited meter flag
  allocation?: 'per_apartment' | 'per_person' | 'per_area' | 'fixed_split' | 'per_consumption';
};

// Legacy compatibility types
export type MeterMode = 'individual' | 'communal';
export type DistributionMethod = NewDistributionMethod;
export type Allocation = 'per_apartment' | 'per_person' | 'per_area' | 'fixed_split' | 'per_consumption';
export type MeterKindLegacy = 
  | 'water_cold' | 'water_hot' | 'electricity_ind' | 'gas_ind'
  | 'heating' | 'electricity_shared' | 'internet' | 'trash' | 'ventilation' | 'elevator'
  | 'custom';

// Legacy interface for backward compatibility
export interface LegacyMeter {
  id: string;
  kind: MeterKindLegacy;
  title: string;           // "Vanduo (šaltas)"
  mode: MeterMode;         // individualus / bendras
  unit: Unit;              // m3 | kWh | GJ | custom
  price: number;           // tik skaičius (UI rodo sufiksą)
  allocation: Allocation;  // jei individualus → 'consumption' (LOCK)
  photoRequired: boolean;
  active: boolean;
  // New fields for fixed/communal meters
  isFixedMeter?: boolean;  // true if meter is fixed (internet, etc.)
  isCommunalMeter?: boolean; // true if meter is communal (shared electricity, etc.)
  showPhotoRequirement?: boolean; // true if tenant needs to take photos
  needsReading?: boolean;  // true if tenant needs to submit readings
  costPerApartment?: number; // calculated cost per apartment
  
  // Legacy compatibility fields
  name?: string;           // alias for title
  type?: 'individual' | 'communal'; // legacy type field
  icon?: string;           // icon name
  description?: string;    // meter description
  fixed_price?: number;    // fixed price for fixed meters
  price_per_unit?: number; // price per unit
  distribution_method?: DistributionMethod; // distribution method
  requires_photo?: boolean; // alias for photoRequired
  is_active?: boolean;     // alias for active
  is_custom?: boolean;     // custom meter flag
  is_inherited?: boolean;  // inherited meter flag
}

export interface TenantRequestPayload {
  tenantId: string;
  addressId: string;
  month: string;           // YYYY-MM
  requestedMeters: Array<{
    meterId: string;
    title: string;
    unit: Unit;
    photoRequired: true;   // čia visada true — tik šie siunčiami nuomininkui
  }>;
}

// Legacy types for backward compatibility
export interface MeterRow {
  id: string;
  key: string;
  name: string;
  unit: string;
  rate: number;
  initialReading: number;
  note?: string;
  mode?: MeterMode;
  allocation?: Allocation;
  photoRequired?: boolean;
  active?: boolean;
}

export type MeterTemplate = Omit<LegacyMeter, 'id'>;
export type MeterKey = string;

// Legacy aliases for backward compatibility
export type MeterUnit = Unit;
export type MeterTariff = 'single' | 'day_night' | 'peak_offpeak';
export type MeterStatus = 'active' | 'inactive' | 'maintenance';

// Additional types for compatibility
export type MeterTypeSection = 'water_cold' | 'water_hot' | 'electricity' | 'electricity_individual' | 'electricity_common' | 'heating' | 'gas' | 'internet' | 'waste' | 'garbage' | 'custom';
export type MeterType = MeterTypeSection;
export type MeterKind = MeterType;

// Legacy form types
export interface MeterForm {
  id: string;
  type: MeterType;
  label: string;
  unit: Unit;
  tariff: MeterTariff;
  initialDate?: string;
  requirePhoto: boolean;
  price_per_unit: number;
  custom_name?: string;
  // Additional fields for compatibility
  serial?: string;
  initialReading?: number;
  provider?: string;
  // Legacy fields for backward compatibility
  title?: string;
  kind?: MeterKind;
  mode?: MeterMode;
  price?: number;
  allocation: Allocation;
  photoRequired?: boolean;
  active?: boolean;
  fixed_price?: number;
  initial_reading?: number;
  initial_date?: string;
  require_photo?: boolean;
  serial_number?: string;
  status?: MeterStatus;
  notes?: string;
}

// Property meter configuration
export interface PropertyMeterConfig {
  id: string;
  propertyId: string;
  meterId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Legacy fields for backward compatibility
  property_id?: string;
  meter_type?: MeterType;
  custom_name?: string;
  unit?: MeterUnit;
  tariff?: MeterTariff;
  allocation?: DistributionMethod;
  price_per_unit?: number;
  fixed_price?: number;
  initial_reading?: number;
  initial_date?: string;
  require_photo?: boolean;
  require_serial?: boolean;
  serial_number?: string;
  provider?: string;
  status?: MeterStatus;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  // Additional fields for compatibility
  meter_config_id?: string;
  reading_date?: string;
  submission_date?: string;
  photos?: string[];
  total_cost?: number;
  difference?: number;
  current_reading?: number;
  previous_reading?: number;
  price_per_unit_reading?: number;
}

// Meter reading types
export type ReadingStatus = 'pending' | 'confirmed' | 'rejected' | 'approved' | 'submitted';

export interface MeterReading {
  id: string;
  meterId: string;
  propertyId: string;
  reading: number;
  date: string;
  photoUrl?: string;
  status: ReadingStatus;
  createdAt: string;
  // Updated fields to match new DB schema
  property_id?: string;
  meter_id?: string;
  meter_type?: 'address' | 'apartment';
  type?: 'electricity' | 'water' | 'heating' | 'internet' | 'garbage' | 'gas';
  previous_reading?: number;
  current_reading?: number;
  consumption?: number;
  reading_date?: string;
  price_per_unit?: number;
  total_sum?: number;
  amount?: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  // Legacy fields for backward compatibility
  meter_config_id?: string;
  difference?: number;
  submission_date?: string;
  photos?: string[];
  approved_by?: string;
  approved_at?: string;
  total_cost?: number;
  meter_config?: PropertyMeterConfig;
}

export interface MeterReadingWithPricing extends MeterReading {
  price: number;
  cost: number;
  consumption: number;
  // Legacy fields for backward compatibility
  price_per_unit?: number;
  total_cost?: number;
  meter_config?: PropertyMeterConfig;
}

export interface MeterStatistics {
  totalReadings: number;
  averageConsumption: number;
  totalCost: number;
  lastReadingDate?: string;
  // Legacy fields for backward compatibility
  total_consumption?: number;
  average_monthly?: number;
  last_reading_date?: string;
  average_cost_per_month?: number;
  trend?: 'increasing' | 'decreasing' | 'stable';
}

export interface FormReading {
  id: string;
  meter_id: string;
  meter_config: PropertyMeterConfig;
  previous_reading: number;
  current_reading: number;
  consumption?: number;
  reading_date: string;
  notes?: string;
  // Legacy field for backward compatibility
  meter_config_id?: string;
  difference?: number;
}

export interface ModernMeter {
  id: string;
  type: MeterType;
  name: string;
  unit: Unit;
  price_per_unit: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Utility functions for UI
export const getMeterIcon = (kind: MeterKind): string => {
  switch (kind) {
    case 'water_cold':
    case 'water_hot':
      return 'Droplet';
    case 'electricity':
    case 'electricity_individual':
    case 'electricity_common':
      return 'Zap';
    case 'heating':
    case 'gas':
      return 'Flame';
    case 'internet':
      return 'Globe';
    case 'waste':
    case 'garbage':
      return 'Recycle';
    case 'custom':
      return 'Settings';
    default:
      return 'Gauge';
  }
};

export const getMeterName = (kind: MeterKind): string => {
  switch (kind) {
    case 'water_cold': return 'Vanduo (šaltas)';
    case 'water_hot': return 'Vanduo (karštas)';
    case 'electricity': return 'Elektra';
    case 'electricity_individual': return 'Elektra (individuali)';
    case 'electricity_common': return 'Elektra (bendra)';
    case 'heating': return 'Šildymas';
    case 'gas': return 'Dujos';
    case 'internet': return 'Internetas';
    case 'waste': return 'Šiukšlių išvežimas';
    case 'garbage': return 'Šiukšlių išvežimas';
    case 'custom': return 'Kitas skaitliukas';
    default: return 'Skaitliukas';
  }
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('lt-LT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

export const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString('lt-LT', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

export const getAllocationLabel = (allocation: Allocation): string => {
  switch (allocation) {
    case 'per_apartment': return 'Pagal butus';
    case 'per_person': return 'Pagal asmenis';
    case 'per_area': return 'Pagal plotą';
    case 'fixed_split': return 'Fiksuotas';
    case 'per_consumption': return 'Pagal suvartojimą';
    default: return allocation;
  }
};

export const getModeLabel = (mode: MeterMode): string => {
  switch (mode) {
    case 'individual': return 'Individualus';
    case 'communal': return 'Bendras';
    default: return mode;
  }
};

// Legacy meter templates
export const METER_TEMPLATES: MeterTemplate[] = [
  {
    kind: 'water_cold',
    title: 'Vanduo (šaltas)',
    mode: 'individual',
    unit: 'm3',
    price: 1.5,
    allocation: 'per_consumption',
    photoRequired: true,
    active: true
  },
  {
    kind: 'water_hot',
    title: 'Vanduo (karštas)',
    mode: 'individual',
    unit: 'm3',
    price: 3.0,
    allocation: 'per_consumption',
    photoRequired: true,
    active: true
  },
  {
    kind: 'electricity_ind',
    title: 'Elektra (individuali)',
    mode: 'individual',
    unit: 'kWh',
    price: 0.15,
    allocation: 'per_consumption',
    photoRequired: true,
    active: true
  },
  {
    kind: 'electricity_shared',
    title: 'Elektra (bendra)',
    mode: 'communal',
    unit: 'kWh',
    price: 0.15,
    allocation: 'per_apartment',
    photoRequired: false,
    active: true
  },
  {
    kind: 'heating',
    title: 'Šildymas',
    mode: 'communal',
    unit: 'GJ',
    price: 25.0,
    allocation: 'per_area',
    photoRequired: false,
    active: true
  },
  {
    kind: 'gas_ind',
    title: 'Dujos',
    mode: 'individual',
    unit: 'm3',
    price: 0.8,
    allocation: 'per_consumption',
    photoRequired: true,
    active: true
  },
  {
    kind: 'internet',
    title: 'Internetas',
    mode: 'communal',
    unit: 'custom',
    price: 15.0,
    allocation: 'per_apartment',
    photoRequired: false,
    active: true
  },
  {
    kind: 'trash',
    title: 'Šiukšlės',
    mode: 'communal',
    unit: 'custom',
    price: 8.0,
    allocation: 'per_apartment',
    photoRequired: false,
    active: true
  }
];

// Alias for backward compatibility
export const DEFAULT_METER_TEMPLATES = METER_TEMPLATES;

// Additional type exports for compatibility
export type MeterFormData = MeterForm;

// Helper functions for type conversion
export const convertLithuanianType = (type: 'individualus' | 'bendras'): 'individual' | 'communal' => {
  return type === 'individualus' ? 'individual' : 'communal';
};

export const convertLithuanianDistribution = (distribution: 'pagal_suvartojima' | 'pagal_butus' | 'fiksuota'): DistributionMethod => {
  switch (distribution) {
    case 'pagal_suvartojima': return 'per_consumption';
    case 'pagal_butus': return 'per_apartment';
    case 'fiksuota': return 'fixed_split';
    default: return 'per_apartment';
  }
};

// Utility functions for legacy compatibility
export const getUnitSuffix = (unit: Unit): string => {
  switch (unit) {
    case 'm3': return '/m³';
    case 'kWh': return '/kWh';
    case 'GJ': return '/GJ';
    case 'custom': return '/vnt';
    default: return '';
  }
};

export const getUnitLabel = (unit: Unit): string => {
  switch (unit) {
    case 'm3': return 'm³';
    case 'kWh': return 'kWh';
    case 'GJ': return 'GJ';
    case 'custom': return 'vnt';
    default: return unit;
  }
};

