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
  /** If true, this meter is added by default when creating a new address */
  isDefault?: boolean;
};

export const METER_TEMPLATES: MeterTemplate[] = [
  // ── Bendri (communal) ──────────────────────────
  {
    id: 'heating',
    name: 'Šildymas',
    description: 'Centrinis šildymas paskirstomas pagal buto plotą',
    icon: 'flame',
    type: 'communal',
    unit: 'kWh',
    defaultPrice: 0.095,
    distribution: 'per_area',
    isDefault: true
  },
  {
    id: 'staircase_lighting',
    name: 'Laiptinės apšvietimas',
    description: 'Bendrų patalpų elektros suvartojimas',
    icon: 'bolt',
    type: 'communal',
    unit: 'kWh',
    defaultPrice: 0.23,
    distribution: 'per_apartment'
  },
  {
    id: 'elevator',
    name: 'Liftas',
    description: 'Lifto priežiūra ir elektra',
    icon: 'gauge',
    type: 'communal',
    unit: 'Kitas',
    defaultPrice: 5.00,
    distribution: 'per_apartment'
  },
  {
    id: 'maintenance',
    name: 'Namo priežiūra',
    description: 'Namo techninė priežiūra ir administravimas',
    icon: 'gauge',
    type: 'communal',
    unit: 'Kitas',
    defaultPrice: 0.30,
    distribution: 'per_area'
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
  },
  // ── Individualūs ──────────────────────────────
  {
    id: 'water_cold',
    name: 'Šaltas vanduo',
    description: 'Šalto vandens tiekimas ir nuotekos',
    icon: 'droplet',
    type: 'individual',
    unit: 'm3',
    defaultPrice: 1.32,
    distribution: 'per_consumption',
    requiresPhoto: true,
    isDefault: true
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
    requiresPhoto: true,
    isDefault: true
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
    requiresPhoto: true,
    isDefault: true
  },
  {
    id: 'gas',
    name: 'Dujos',
    description: 'Gamtinių dujų suvartojimas',
    icon: 'flame',
    type: 'individual',
    unit: 'm3',
    defaultPrice: 0.65,
    distribution: 'per_consumption',
    requiresPhoto: true
  }
];

// Utility functions for formatting
export const unitSuffix = (u: 'm3' | 'kWh' | 'GJ' | 'Kitas') =>
  u === 'm3' ? '€/m³' : u === 'kWh' ? '€/kWh' : u === 'GJ' ? '€/GJ' : u === 'Kitas' ? '€/vnt.' : '€/mėn.';

export const fmtPriceLt = (v: number, u: 'm3' | 'kWh' | 'GJ' | 'Kitas') =>
  `${v.toLocaleString('lt-LT', { minimumFractionDigits: 2 })} ${unitSuffix(u)}`;

/** Smart tariff formatting: >= 1€ → 2 decimals, < 1€ → 3 decimals (rounded) */
export const fmtTariff = (v: number): string => {
  const digits = v >= 1 ? 2 : 3;
  return v.toLocaleString('lt-LT', { minimumFractionDigits: digits, maximumFractionDigits: digits });
};

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

/** Run one-time cleanup if needed, then cache the user ID */
const setUserId = (id: string | null): void => {
  if (id && id !== _cachedUserId) {
    _cachedUserId = id;
    // One-time cleanup: only run if version flag not set for this user
    const versionKey = `nuomoria_templates_v2_${id}`;
    if (!localStorage.getItem(versionKey)) {
      cleanupUnscopedTemplates(id);
      localStorage.setItem(versionKey, '1');
    }
  } else {
    _cachedUserId = id;
  }
};

// Listen for auth state changes
supabase.auth.onAuthStateChange((_event, session) => {
  setUserId(session?.user?.id ?? null);
});

// Initialize from current session on module load
supabase.auth.getSession().then(({ data }) => {
  setUserId(data.session?.user?.id ?? null);
});

/** Clean up any templates stored under generic (unscoped) key — they can't be reliably attributed to any user */
const cleanupUnscopedTemplates = (userId: string): void => {
  try {
    // Remove the generic (shared) key — can't know whose templates these are
    const genericKey = 'nuomoria_custom_meter_templates';
    localStorage.removeItem(genericKey);
    localStorage.removeItem('nuomoria_hidden_default_templates');
    // Also clean user-scoped key if it was polluted by a previous bad migration
    const userKey = `nuomoria_custom_meter_templates_${userId}`;
    const hiddenKey = `nuomoria_hidden_default_templates_${userId}`;
    const existing = localStorage.getItem(userKey);
    if (existing) {
      try {
        const templates = JSON.parse(existing);
        // If templates contain items that were clearly migrated (before this fix), clean them
        if (Array.isArray(templates) && templates.length > 0) {
          // Keep only templates that were created AFTER this fix (user will re-save)
          // For now, clean everything — user can re-save their own templates
          localStorage.removeItem(userKey);
        }
      } catch { localStorage.removeItem(userKey); }
    }
    // Also clean hidden defaults — restore all defaults
    localStorage.removeItem(hiddenKey);
  } catch { /* silent */ }
};

/** Get current user ID (synchronous, uses cached value with fallback) */
const getCurrentUserId = (): string | null => {
  if (_cachedUserId) return _cachedUserId;
  // Fallback: try to extract user ID from Supabase local storage token
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          const uid = parsed?.user?.id;
          if (uid) { _cachedUserId = uid; return uid; }
        }
      }
    }
  } catch { /* silent */ }
  return null;
};

const getCustomTemplatesKey = () => {
  const userId = getCurrentUserId();
  if (!userId) {
    // If still no user ID, warn — this shouldn't happen in normal usage
    console.warn('[meterTemplates] No user ID available for template scoping');
  }
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

