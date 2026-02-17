import { Meter, Status } from '../components/meters/MeterRow';
import { MeterType } from '../components/meters/iconMap';

// TODO: Replace with real API integration
// This is a mock adapter for development/testing purposes

export const mockMeters: Meter[] = [
  {
    id: '1',
    type: 'water_cold',
    name: 'Šaltas vanduo - 1a',
    unit: 'm³',
    group: 'Individualūs',
    last: 125.5,
    lastDate: '2024-01-15',
    needsPhoto: false,
    needsReading: false,
    status: 'ok'
  },
  {
    id: '2',
    type: 'water_hot',
    name: 'Karštas vanduo - 1a',
    unit: 'm³',
    group: 'Individualūs',
    last: 89.2,
    lastDate: '2024-01-15',
    needsPhoto: true,
    needsReading: false,
    status: 'waiting'
  },
  {
    id: '3',
    type: 'electric_ind',
    name: 'Elektra - 1a',
    unit: 'kWh',
    group: 'Individualūs',
    last: 2450.8,
    lastDate: '2024-01-15',
    needsPhoto: false,
    needsReading: true,
    status: 'overdue'
  },
  {
    id: '4',
    type: 'heating',
    name: 'Šildymas - 1a',
    unit: 'kWh',
    group: 'Individualūs',
    last: 12.5,
    lastDate: '2024-01-10',
    needsPhoto: false,
    needsReading: false,
    status: 'ok'
  },
  {
    id: '5',
    type: 'gas',
    name: 'Dujos - 1a',
    unit: 'm³',
    group: 'Individualūs',
    last: undefined,
    lastDate: undefined,
    needsPhoto: true,
    needsReading: true,
    status: 'waiting'
  },
  {
    id: '6',
    type: 'elevator',
    name: 'Liftas - 1a',
    unit: 'kWh',
    group: 'Bendri',
    last: 1250.5,
    lastDate: '2024-01-15',
    needsPhoto: false,
    needsReading: false,
    status: 'ok'
  }
];

// TODO: Replace with real API calls
export const metersAdapter = {
  // Get meters for a specific tenant
  async getMetersForTenant(tenantId: string): Promise<Meter[]> {
    // TODO: Replace with actual API call
    // const response = await fetch(`/api/tenants/${tenantId}/meters`);
    // return response.json();

    console.log('Getting meters for tenant:', tenantId);
    return mockMeters;
  },

  // Save a new reading
  async saveReading(meterId: string, reading: number, date?: string): Promise<void> {
    // TODO: Replace with actual API call
    // await fetch(`/api/meters/${meterId}/readings`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ reading, date: date || new Date().toISOString() })
    // });

    console.log('Saving reading for meter:', meterId, reading);
  },

  // Request photo for a meter
  async requestPhoto(meterId: string): Promise<void> {
    // TODO: Replace with actual API call
    // await fetch(`/api/meters/${meterId}/request-photo`, {
    //   method: 'POST'
    // });

    console.log('Requesting photo for meter:', meterId);
  },

  // Get meter history
  async getMeterHistory(meterId: string): Promise<any[]> {
    // TODO: Replace with actual API call
    // const response = await fetch(`/api/meters/${meterId}/history`);
    // return response.json();

    console.log('Getting history for meter:', meterId);
    return [];
  },

  // Request missing readings for all meters
  async requestMissingReadings(tenantId: string): Promise<void> {
    // TODO: Replace with actual API call
    // await fetch(`/api/tenants/${tenantId}/request-readings`, {
    //   method: 'POST'
    // });

    console.log('Requesting missing readings for tenant:', tenantId);
  },

  // Update meter status
  async updateMeterStatus(meterId: string, status: Status): Promise<void> {
    // TODO: Replace with actual API call
    // await fetch(`/api/meters/${meterId}/status`, {
    //   method: 'PATCH',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ status })
    // });

    console.log('Updating status for meter:', meterId, status);
  }
};

// Helper function to convert old meter format to new format
export const convertToMeterFormat = (oldMeter: any): Meter => {
  return {
    id: oldMeter.id,
    type: oldMeter.type as MeterType,
    name: oldMeter.name,
    unit: oldMeter.unit || 'm³',
    group: oldMeter.group || 'Individualūs',
    last: oldMeter.lastReading,
    lastDate: oldMeter.lastReadingDate,
    needsPhoto: oldMeter.requires_photo || false,
    needsReading: !oldMeter.lastReading,
    status: oldMeter.lastReading ? 'ok' : 'waiting'
  };
};
