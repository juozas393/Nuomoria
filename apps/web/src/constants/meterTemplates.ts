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
    name: 'Šaltas vanduo',
    description: 'Šalto vandens tiekimas ir nuotekos',
    icon: 'droplet',
    type: 'individual',
    unit: 'm3',
    defaultPrice: 1.32,
    distribution: 'per_consumption',
    requiresPhoto: true
  },
  {
    id: 'water_hot',
    name: 'Karštas vanduo',
    description: 'Karšto vandens tiekimas',
    icon: 'droplet',
    type: 'individual',
    unit: 'm3',
    defaultPrice: 3.50,
    distribution: 'per_consumption',
    requiresPhoto: true
  },
  {
    id: 'electricity_ind',
    name: 'Elektra',
    description: 'Buto elektros suvartojimas',
    icon: 'bolt',
    type: 'individual',
    unit: 'kWh',
    defaultPrice: 0.23,
    distribution: 'per_consumption',
    requiresPhoto: true
  },
  {
    id: 'heating',
    name: 'Šildymas',
    description: 'Centrinis šildymas pagal plotą',
    icon: 'flame',
    type: 'individual',
    unit: 'kWh',
    defaultPrice: 0.095,
    distribution: 'per_area',
    requiresPhoto: true
  },
  {
    id: 'gas',
    name: 'Dujos',
    description: 'Gamtinių dujų suvartojimas',
    icon: 'flame',
    type: 'individual',
    unit: 'm3',
    defaultPrice: 0.99,
    distribution: 'per_consumption',
    requiresPhoto: true
  },
  {
    id: 'maintenance',
    name: 'Techninė apžiūra',
    description: 'Namo techninė priežiūra ir apžiūra',
    icon: 'gauge',
    type: 'communal',
    unit: 'Kitas',
    defaultPrice: 0,
    distribution: 'per_apartment'
  },
  {
    id: 'trash',
    name: 'Šiukšlės',
    description: 'Komunalinių atliekų išvežimas',
    icon: 'trash',
    type: 'communal',
    unit: 'Kitas',
    defaultPrice: 5.00,
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
    case 'per_apartment': return 'Pagal butų sk.';
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

// --- Custom Template Management (localStorage, scoped per user) ---

import { supabase } from '../lib/supabase';

/** Cached user ID — updated on auth state change */
let _cachedUserId: string | null = null;

// Listen for auth state changes to keep the cached user ID in sync
supabase.auth.onAuthStateChange((_event, session) => {
  _cachedUserId = session?.user?.id ?? null;
});

// Initialize from current session on module load
supabase.auth.getSession().then(({ data }) => {
  _cachedUserId = data.session?.user?.id ?? null;
});

/** Get current user ID (synchronous, uses cached value) */
const getCurrentUserId = (): string | null => {
  return _cachedUserId;
};

const getCustomTemplatesKey = () => {
  const userId = getCurrentUserId();
  return userId ? `nuomoria_custom_meter_templates_${userId}` : 'nuomoria_custom_meter_templates';
};

const getHiddenDefaultsKey = () => {
  const userId = getCurrentUserId();
  return userId ? `nuomoria_hidden_default_templates_${userId}` : 'nuomoria_hidden_default_templates';
};

export type CustomMeterTemplate = Omit<MeterTemplate, 'icon'> & {
  icon: MeterTemplate['icon'];
  isCustom: true;
  createdAt: string;
};

/** Get all custom templates from localStorage (scoped to current user) */
export const getCustomTemplates = (): CustomMeterTemplate[] => {
  try {
    const stored = localStorage.getItem(getCustomTemplatesKey());
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

/** Save a new custom template */
export const saveCustomTemplate = (template: {
  name: string;
  type: 'individual' | 'communal';
  unit: 'm3' | 'kWh' | 'GJ' | 'Kitas';
  defaultPrice?: number;
  distribution: DistributionMethod;
  requiresPhoto?: boolean;
  description?: string;
}): CustomMeterTemplate => {
  const customs = getCustomTemplates();
  const newTemplate: CustomMeterTemplate = {
    id: `custom_${Date.now()}`,
    name: template.name,
    description: template.description || '',
    icon: 'gauge',
    type: template.type,
    unit: template.unit,
    defaultPrice: template.defaultPrice || 0,
    distribution: template.distribution,
    requiresPhoto: template.requiresPhoto || false,
    isCustom: true,
    createdAt: new Date().toISOString(),
  };
  customs.push(newTemplate);
  localStorage.setItem(getCustomTemplatesKey(), JSON.stringify(customs));
  return newTemplate;
};

/** Remove a custom template by ID */
export const removeCustomTemplate = (id: string): void => {
  const customs = getCustomTemplates().filter(t => t.id !== id);
  localStorage.setItem(getCustomTemplatesKey(), JSON.stringify(customs));
};

// --- Hidden Default Templates Management ---

/** Get IDs of hidden default templates */
export const getHiddenDefaultIds = (): string[] => {
  try {
    const stored = localStorage.getItem(getHiddenDefaultsKey());
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

/** Hide a built-in default template */
export const hideDefaultTemplate = (id: string): void => {
  const hidden = getHiddenDefaultIds();
  if (!hidden.includes(id)) {
    hidden.push(id);
    localStorage.setItem(getHiddenDefaultsKey(), JSON.stringify(hidden));
  }
};

/** Restore all hidden default templates */
export const restoreDefaultTemplates = (): void => {
  localStorage.removeItem(getHiddenDefaultsKey());
};

/** Check if any defaults are currently hidden */
export const hasHiddenDefaults = (): boolean => {
  return getHiddenDefaultIds().length > 0;
};

/** Remove a template by ID — handles both custom and default (hides default) */
export const removeTemplate = (id: string): void => {
  if (id.startsWith('custom_')) {
    removeCustomTemplate(id);
  } else {
    hideDefaultTemplate(id);
  }
};

/** Get ALL templates (visible built-in + custom) */
export const getAllTemplates = (): MeterTemplate[] => {
  const hiddenIds = getHiddenDefaultIds();
  const visibleDefaults = METER_TEMPLATES.filter(t => !hiddenIds.includes(t.id));
  const customs = getCustomTemplates();
  const customAsMeterTemplate: MeterTemplate[] = customs.map(c => ({
    id: c.id,
    name: c.name,
    description: c.description,
    icon: c.icon,
    type: c.type,
    unit: c.unit,
    defaultPrice: c.defaultPrice,
    distribution: c.distribution,
    requiresPhoto: c.requiresPhoto,
  }));
  return [...visibleDefaults, ...customAsMeterTemplate];
};

