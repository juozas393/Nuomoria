import { Meter, MeterTypeSection, Unit, MeterMode, Allocation } from '../types/meters';
import { type DistributionMethod } from './meterDistribution';

export type MeterTemplate = {
  id: string;
  name: string;
  description?: string;
  icon: 'droplet' | 'bolt' | 'flame' | 'wifi' | 'trash' | 'fan' | 'elevator' | 'gauge';
  type: 'individual' | 'communal';
  unit: 'm3' | 'kWh' | 'GJ' | 'Kitas';
  defaultPrice?: number;
  distribution: DistributionMethod;
  requiresPhoto?: boolean;
};

export const METER_TEMPLATES: MeterTemplate[] = [
  { 
    id: 'water_cold', 
    name: 'Vanduo (šaltas)', 
    description: 'Šalto vandens suvartojimas',
    icon: 'droplet', 
    type: 'individual', 
    unit: 'm3', 
    defaultPrice: 1.20,
    distribution: 'per_consumption', 
    requiresPhoto: true 
  },
  { 
    id: 'water_hot', 
    name: 'Vanduo (karštas)', 
    description: 'Karšto vandens suvartojimas',
    icon: 'droplet', 
    type: 'individual', 
    unit: 'm3', 
    defaultPrice: 3.50,
    distribution: 'per_consumption', 
    requiresPhoto: true 
  },
  { 
    id: 'electricity_ind', 
    name: 'Elektra (individuali)', 
    description: 'Elektra bute',
    icon: 'bolt', 
    type: 'individual', 
    unit: 'kWh', 
    defaultPrice: 0.15,
    distribution: 'per_consumption', 
    requiresPhoto: true 
  },
  { 
    id: 'electricity_shared', 
    name: 'Elektra (bendra)', 
    description: 'Namo apšvietimas',
    icon: 'bolt', 
    type: 'communal', 
    unit: 'kWh', 
    defaultPrice: 0.15,
    distribution: 'per_apartment' 
  },
  { 
    id: 'heating', 
    name: 'Šildymas', 
    description: 'Namo šildymo sąnaudos',
    icon: 'flame', 
    type: 'communal', 
    unit: 'GJ', 
    defaultPrice: 25.00,
    distribution: 'per_apartment' 
  },
  { 
    id: 'internet', 
    name: 'Internetas', 
    description: 'Namo interneto paslaugos',
    icon: 'wifi', 
    type: 'communal', 
    unit: 'Kitas', 
    defaultPrice: 60.00,
    distribution: 'fixed_split' 
  },
  { 
    id: 'trash', 
    name: 'Šiukšlių išvežimas', 
    description: 'Komunalinių atliekų išvežimas',
    icon: 'trash', 
    type: 'communal', 
    unit: 'Kitas', 
    defaultPrice: 45.00,
    distribution: 'fixed_split' 
  },
  { 
    id: 'ventilation', 
    name: 'Vėdinimas', 
    description: 'Vėdinimo sistemos',
    icon: 'fan', 
    type: 'communal', 
    unit: 'Kitas', 
    defaultPrice: 30.00,
    distribution: 'fixed_split' 
  },
  { 
    id: 'elevator', 
    name: 'Lifto priežiūra', 
    description: 'Lifto techninė priežiūra',
    icon: 'elevator', 
    type: 'communal', 
    unit: 'Kitas', 
    defaultPrice: 25.00,
    distribution: 'fixed_split' 
  }
];

// Utility functions for formatting
export const unitSuffix = (u: 'm3' | 'kWh' | 'GJ' | 'Kitas') =>
  u === 'm3' ? '€/m³' : u === 'kWh' ? '€/kWh' : u === 'GJ' ? '€/GJ' : u === 'Kitas' ? '€/vnt.' : '€/mėn.';

export const fmtPriceLt = (v: number, u: 'm3' | 'kWh' | 'GJ' | 'Kitas') =>
  `${v.toLocaleString('lt-LT', { minimumFractionDigits: 2 })} ${unitSuffix(u)}`;

export const getUnitLabel = (unit: string) => {
  switch (unit) {
    case 'm3': return 'm³';
    case 'kWh': return 'kWh';
    case 'GJ': return 'GJ';
    case 'Kitas': return 'Kitas';
    default: return unit;
  }
};

export const getDistributionLabel = (method: string) => {
  switch (method) {
    case 'consumption': return 'Pagal suvartojimą';
    case 'per_apartment': return 'Pagal butus';
    case 'per_area': return 'Pagal plotą';
    case 'fixed_split': return 'Fiksuotas';
    case 'per_consumption': return 'Pagal suvartojimą';
    case 'Kitas': return 'Kitas';
    default: return method;
  }
};

export const getMeterIconName = (iconName: string) => {
  return iconName;
};
