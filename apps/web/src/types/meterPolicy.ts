// Meter policy system types
import { type DistributionMethod } from '../constants/meterDistribution';

export type CollectionMode = 'landlord_only' | 'tenant_photo';
export type Scope = 'apartment' | 'building' | 'none';
export type Distribution = DistributionMethod | 'fixed' | 'consumption';
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
  collectionMode?: 'landlord_only' | 'tenant_photo'; // collection mode for legacy compatibility
};

// Policy inference function
export const inferPolicyFrom = (meter: Partial<Meter>): Scope => {
  if (meter.distribution === 'fixed' || meter.distribution === 'fixed_split') {
    return 'none';
  }
  
  if (meter.type === 'individual' && (meter.distribution === 'consumption' || meter.distribution === 'per_consumption')) {
    return 'apartment';
  }
  
  if (meter.type === 'shared' && meter.distribution && 
      !['fixed_split', 'fixed'].includes(meter.distribution)) {
    return 'building';
  }
  
  // Default fallback
  return 'apartment';
};

// Visibility function for tenants
export const isVisibleToTenant = (m: Meter): boolean => {
  return m.policy.collectionMode === 'tenant_photo' && m.policy.scope !== 'none';
};

// Reading status types
export type ReadingStatus = 'pending' | 'approved' | 'rejected';

export interface MeterReading {
  id: string;
  meterId: string;
  apartmentId?: string; // for apartment scope
  buildingId?: string;  // for building scope
  previousReading: number;
  currentReading: number;
  consumption: number;
  photoUrl?: string;    // for tenant_photo mode
  status: ReadingStatus;
  submittedBy: 'tenant' | 'landlord';
  submittedAt: Date;
  approvedAt?: Date;
  approvedBy?: string;
  notes?: string;
  // Legacy field for backward compatibility
  difference?: number;
}
