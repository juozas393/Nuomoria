import { MeterData } from './index';

// =============================================================================
// ADAPTER: Convert legacy meter format to new MeterData format
// =============================================================================

export interface LegacyMeterData {
    id: string;
    name: string;
    type?: string;
    mode?: 'Individualūs' | 'Bendras' | string;
    needsPhoto?: boolean;
    needsReading?: boolean;
    tenantSubmittedValue?: number;
    previousValue?: number;
    currentValue?: number;
    isApproved?: boolean;
    price_per_unit?: number;
    fixed_price?: number;
    unit?: string;
    costPerApartment?: number;
    photoUrl?: string;
    requirePhoto?: boolean;
}

/**
 * Converts legacy meter data format to the new KomunaliniaiTab MeterData format
 * Accepts any meter format and extracts known properties
 */
export function adaptLegacyMeters(legacyMeters: any[]): MeterData[] {
    return legacyMeters.map((m: any) => {
        // Determine status
        let status: 'missing' | 'photo' | 'pending' | 'ok' = 'ok';
        if (m.needsReading) {
            status = 'missing';
        } else if (m.needsPhoto) {
            status = 'photo';
        } else if (m.tenantSubmittedValue && !m.isApproved) {
            status = 'pending';
        }

        // Determine category from name or type
        let category: 'elektra' | 'vanduo' | 'sildymas' | 'dujos' = 'elektra';
        const nameLower = (m.name || '').toLowerCase();
        const typeLower = (m.type || '').toLowerCase();

        if (nameLower.includes('vanduo') || nameLower.includes('water') || typeLower.includes('vanduo') || typeLower.includes('karštas') || typeLower.includes('šaltas')) {
            category = 'vanduo';
        } else if (nameLower.includes('šildym') || nameLower.includes('heat') || typeLower.includes('šildym')) {
            category = 'sildymas';
        } else if (nameLower.includes('duj') || nameLower.includes('gas') || typeLower.includes('duj')) {
            category = 'dujos';
        }

        // Calculate consumption
        const prevReading = m.previousValue ?? null;
        const currReading = m.tenantSubmittedValue ?? m.currentValue ?? null;
        const consumption = (prevReading !== null && currReading !== null)
            ? currReading - prevReading
            : undefined;

        // Calculate cost
        const cost = consumption !== undefined && m.price_per_unit
            ? consumption * m.price_per_unit
            : m.costPerApartment;

        return {
            id: m.id,
            name: m.name || 'Skaitiklis',
            category,
            scope: m.mode === 'Individualūs' ? 'individual' : 'communal',
            unit: m.unit || (category === 'elektra' ? 'kWh' : category === 'vanduo' ? 'm³' : category === 'sildymas' ? 'GJ' : 'm³'),
            unitLabel: m.mode === 'Individualūs' ? 'Individualus skaitliukas' : 'Bendras skaitliukas',
            previousReading: prevReading,
            previousReadingDate: null,
            currentReading: currReading,
            status,
            photoRequired: m.requirePhoto ?? m.needsPhoto ?? false,
            photoUrl: m.photoUrl,
            tariff: m.price_per_unit || m.fixed_price || 0,
            fixedPrice: m.fixed_price || undefined,
            consumption,
            cost,
        } as MeterData;
    });
}

export default adaptLegacyMeters;
