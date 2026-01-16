// Example meters with realistic policy values
import { Meter } from '../types/meterPolicy';

export const exampleMeters: Meter[] = [
  // Individual meters - tenant_photo, apartment scope
  {
    id: 'water_cold_1',
    kind: 'water_cold',
    type: 'individual',
    distribution: 'per_consumption',
    unit: 'm3',
    pricePerUnit: 1.2,
    currency: 'EUR',
    policy: {
      collectionMode: 'tenant_photo',
      scope: 'apartment'
    }
  },
  {
    id: 'water_hot_1',
    kind: 'water_hot',
    type: 'individual',
    distribution: 'per_consumption',
    unit: 'm3',
    pricePerUnit: 3.5,
    currency: 'EUR',
    policy: {
      collectionMode: 'tenant_photo',
      scope: 'apartment'
    }
  },
  {
    id: 'electricity_ind_1',
    kind: 'electricity_ind',
    type: 'individual',
    distribution: 'per_consumption',
    unit: 'kWh',
    pricePerUnit: 0.15,
    currency: 'EUR',
    policy: {
      collectionMode: 'tenant_photo',
      scope: 'apartment'
    }
  },
  
  // Shared meters - landlord_only, building scope
  {
    id: 'electricity_shared_1',
    kind: 'electricity_shared',
    type: 'shared',
    distribution: 'per_apartment',
    unit: 'kWh',
    pricePerUnit: 0.15,
    currency: 'EUR',
    policy: {
      collectionMode: 'landlord_only',
      scope: 'building'
    }
  },
  
  // Fixed meters - landlord_only, none scope
  {
    id: 'internet_1',
    kind: 'internet',
    type: 'shared',
    distribution: 'fixed_split',
    unit: 'custom',
    fixedAmountPerApt: 60,
    currency: 'EUR',
    policy: {
      collectionMode: 'landlord_only',
      scope: 'none'
    }
  },
  {
    id: 'waste_1',
    kind: 'waste',
    type: 'shared',
    distribution: 'fixed_split',
    unit: 'custom',
    fixedAmountPerApt: 45,
    currency: 'EUR',
    policy: {
      collectionMode: 'landlord_only',
      scope: 'none'
    }
  }
];

// Helper function to get meters visible to tenants
export const getTenantVisibleMeters = (meters: Meter[]): Meter[] => {
  return meters.filter(meter => 
    meter.policy.collectionMode === 'tenant_photo' && 
    meter.policy.scope !== 'none'
  );
};

// Helper function to get meters for landlord view
export const getLandlordVisibleMeters = (meters: Meter[]): Meter[] => {
  return meters; // Landlord sees all meters
};

// Helper function to get fixed meters (for billing)
export const getFixedMeters = (meters: Meter[]): Meter[] => {
  return meters.filter(meter => meter.policy.scope === 'none');
};

// Helper function to get meters that need readings
export const getMetersNeedingReadings = (meters: Meter[]): Meter[] => {
  return meters.filter(meter => meter.policy.scope !== 'none');
};
