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

import { 
  Meter, 
  MeterRow, 
  MeterTemplate,
  MeterKind,
  MeterMode,
  Allocation,
  MeterUnit,
  MeterType,
  DistributionMethod,
  Distribution
} from '../types/meters';
import { convertLegacyDistribution } from '../constants/meterDistribution';

// Convert legacy meter to new meter format
export const convertLegacyToMeter = (row: MeterRow): Meter => ({
  id: row.id,
  kind: (row.key as MeterKind) || 'water_cold',
  type: row.mode === 'individual' ? 'individual' : 'shared',
  distribution: convertAllocationToDistribution(row.allocation || 'per_apartment'),
  unit: (row.unit as MeterUnit) || 'm3',
  pricePerUnit: row.rate,
  currency: 'EUR',
  policy: {
    collectionMode: 'landlord_only',
    scope: 'apartment'
  },
  // Legacy compatibility fields
  name: row.name,
  title: row.name,
  mode: row.mode || 'individual',
  price: row.rate,
  allocation: row.allocation || 'per_apartment',
  photoRequired: row.photoRequired || false,
  active: row.active !== false,
  price_per_unit: row.rate,
  distribution_method: convertAllocationToDistribution(row.allocation || 'per_apartment') as any,
  is_active: row.active !== false,
  requires_photo: row.photoRequired || false,
  is_custom: false,
  is_inherited: false
});

// Convert new meter to legacy format
export const convertMeterToLegacy = (meter: Meter): MeterRow => ({
  id: meter.id,
  key: meter.kind || 'water_cold',
  name: meter.name || meter.title || '',
  unit: meter.unit,
  rate: meter.price || meter.price_per_unit || 0,
  initialReading: 0,
      mode: meter.mode || (meter.type === 'individual' ? 'individual' : 'communal'),
  allocation: meter.allocation || convertDistributionToAllocation(meter.distribution_method || 'per_apartment'),
  photoRequired: meter.photoRequired || meter.requires_photo || false,
  active: meter.active !== undefined ? meter.active : meter.is_active
});

// Convert allocation to distribution method
export const convertAllocationToDistribution = (allocation: Allocation): Distribution => {
  switch (allocation) {
    case 'per_apartment': return 'per_apartment';
    case 'per_person': return 'per_person';
    case 'per_area': return 'per_area';
    case 'fixed_split': return 'fixed_split';
    case 'per_consumption': return 'per_consumption';
    default: return 'per_apartment';
  }
};

// Convert distribution method to allocation
export const convertDistributionToAllocation = (method: Distribution): Allocation => {
  switch (method) {
    case 'per_apartment': return 'per_apartment';
    case 'per_person': return 'per_person';
    case 'per_area': return 'per_area';
    case 'fixed_split': return 'fixed_split';
    case 'per_consumption': return 'per_consumption';
    case 'consumption': return 'per_consumption';
    case 'fixed': return 'fixed_split';
    default: return 'per_apartment';
  }
};

// Create a meter with legacy compatibility
export const createLegacyCompatibleMeter = (
  kind: MeterKind,
  name: string,
  mode: MeterMode = 'individual',
  unit: MeterUnit = 'm3',
  price: number = 0,
  allocation: Allocation = 'per_apartment',
  photoRequired: boolean = false,
  active: boolean = true
): Meter => ({
  id: `meter_${Date.now()}_${Math.random()}`,
  kind,
  type: mode === 'individual' ? 'individual' : 'shared',
  distribution: convertAllocationToDistribution(allocation),
  unit,
  pricePerUnit: price,
  currency: 'EUR',
  policy: {
    collectionMode: 'landlord_only',
    scope: 'apartment'
  },
  // Legacy compatibility fields
  name,
  title: name,
  mode,
  price,
  allocation,
  photoRequired,
  active,
  price_per_unit: price,
  distribution_method: convertAllocationToDistribution(allocation),
  requires_photo: photoRequired,
  is_active: active,
  is_custom: false,
  is_inherited: false
});

// Update meter with legacy support
export const updateMeterWithLegacySupport = (meter: Meter, updates: Partial<Meter>): Meter => {
  const updated = { ...meter, ...updates };
  
  // Sync legacy fields
  if (updates.name !== undefined) {
    updated.title = updates.name;
  }
  if (updates.title !== undefined) {
    updated.name = updates.title;
  }
  if (updates.type !== undefined) {
    updated.mode = updates.type === 'individual' ? 'individual' : 'communal';
  }
  if (updates.mode !== undefined) {
    updated.type = updates.mode === 'individual' ? 'individual' : 'shared';
  }
  if (updates.price_per_unit !== undefined) {
    updated.price = updates.price_per_unit;
  }
  if (updates.price !== undefined) {
    updated.price_per_unit = updates.price;
  }
  if (updates.requires_photo !== undefined) {
    updated.photoRequired = updates.requires_photo;
  }
  if (updates.photoRequired !== undefined) {
    updated.requires_photo = updates.photoRequired;
  }
  if (updates.is_active !== undefined) {
    updated.active = updates.is_active;
  }
  if (updates.active !== undefined) {
    updated.is_active = updates.active;
  }
  if (updates.distribution_method !== undefined) {
    updated.allocation = convertDistributionToAllocation(updates.distribution_method);
  }
  if (updates.allocation !== undefined) {
    updated.distribution_method = convertAllocationToDistribution(updates.allocation);
  }
  
  return updated;
};
