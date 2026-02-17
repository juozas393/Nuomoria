import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';
import { MeterData } from './MeterRow';

// =============================================================================
// TYPES
// =============================================================================

interface MeterConfig {
    id: string;
    address_id: string;
    name: string;
    type: string;
    unit: string;
    price_per_unit: number | null;
    fixed_price: number | null;
    distribution_method: string;
    description: string | null;
    requires_photo: boolean | null;
    is_active: boolean | null;
    collection_mode: string | null;
    landlord_reading_enabled: boolean | null;
    tenant_photo_enabled: boolean | null;
}

interface MeterReading {
    id: string;
    property_id: string;
    meter_id: string;
    meter_type: string;
    type: string;
    reading_date: string;
    previous_reading: number | null;
    current_reading: number;
    consumption: number | null;
    difference: number;
    price_per_unit: number;
    total_sum: number;
    amount: number | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

export interface MeterHistoryEntry {
    id: string;
    readingDate: string;
    previousReading: number | null;
    currentReading: number;
    consumption: number;
    cost: number;
    notes: string | null;
}

// =============================================================================
// HELPER: Get date range for a specific month
// =============================================================================

function getMonthRange(year: number, month: number): { start: string; end: string } {
    // month is 0-indexed (0 = January)
    const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const end = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return { start, end };
}

// =============================================================================
// HOOK: useMeterReadings
// =============================================================================

export function useMeterReadings(propertyId: string | undefined, addressId: string | undefined, year: number, month: number) {
    const [meterConfigs, setMeterConfigs] = useState<MeterConfig[]>([]);
    const [readings, setReadings] = useState<MeterReading[]>([]);
    const [prevMonthReadings, setPrevMonthReadings] = useState<MeterReading[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { start: periodStart, end: periodEnd } = useMemo(() => getMonthRange(year, month), [year, month]);
    const readingDate = periodStart; // Use first of month as the reading_date for saves

    // Fetch meter configs (address_meters) - these don't change per period
    useEffect(() => {
        if (!addressId) return;

        const fetchConfigs = async () => {
            const { data, error: err } = await supabase
                .from('address_meters')
                .select('*')
                .eq('address_id', addressId)
                .eq('is_active', true)
                .order('name');

            if (err) {
                console.error('[useMeterReadings] Error fetching meter configs:', err);
                setError('Nepavyko užkrauti skaitliukų konfigūracijos');
                return;
            }
            setMeterConfigs(data || []);
        };

        fetchConfigs();
    }, [addressId]);

    // Fetch readings for the selected period AND previous period
    useEffect(() => {
        if (!propertyId || meterConfigs.length === 0) return;

        const fetchReadings = async () => {
            setIsLoading(true);
            setError(null);

            try {
                // Current period readings
                const { data: currentData, error: currentErr } = await supabase
                    .from('meter_readings')
                    .select('*')
                    .eq('property_id', propertyId)
                    .gte('reading_date', periodStart)
                    .lte('reading_date', periodEnd)
                    .order('reading_date', { ascending: false });

                if (currentErr) throw currentErr;
                setReadings(currentData || []);

                // Previous period readings (for auto-previous-reading)
                const prevMonth = month === 0 ? 11 : month - 1;
                const prevYear = month === 0 ? year - 1 : year;
                const { start: prevStart, end: prevEnd } = getMonthRange(prevYear, prevMonth);

                const { data: prevData, error: prevErr } = await supabase
                    .from('meter_readings')
                    .select('*')
                    .eq('property_id', propertyId)
                    .gte('reading_date', prevStart)
                    .lte('reading_date', prevEnd)
                    .order('reading_date', { ascending: false });

                if (prevErr) throw prevErr;
                setPrevMonthReadings(prevData || []);

                console.log(`[useMeterReadings] Loaded ${(currentData || []).length} readings for ${year}-${month + 1}, ${(prevData || []).length} from prev month`);
            } catch (e: any) {
                console.error('[useMeterReadings] Error fetching readings:', e);
                setError('Nepavyko užkrauti rodmenų');
            } finally {
                setIsLoading(false);
            }
        };

        fetchReadings();
    }, [propertyId, meterConfigs.length, periodStart, periodEnd, year, month]);

    // Merge configs + readings into MeterData[]
    const meters: MeterData[] = useMemo(() => {
        return meterConfigs.map(config => {
            // Find this period's reading for this meter
            const reading = readings.find(r => r.meter_id === config.id);
            // Find previous period's reading
            const prevReading = prevMonthReadings.find(r => r.meter_id === config.id);

            // Auto-previous: use this period's saved previous_reading, 
            // OR fall back to last month's current_reading
            const previousReading = reading?.previous_reading ?? prevReading?.current_reading ?? null;
            const currentReading = reading?.current_reading ?? null;

            console.log(`[useMeterReadings] Meter "${config.name}" (${config.id}):`, {
                savedPrevReading: reading?.previous_reading,
                prevMonthCurrent: prevReading?.current_reading,
                resolvedPrevious: previousReading,
                currentReading,
                source: reading?.previous_reading != null ? 'saved' : prevReading?.current_reading != null ? 'prev-month' : 'none'
            });

            // Calculate consumption
            const consumption = (previousReading !== null && currentReading !== null)
                ? currentReading - previousReading
                : null;

            // Calculate cost
            const pricePerUnit = config.price_per_unit || 0;
            const fixedPrice = config.fixed_price || 0;
            const cost = fixedPrice > 0
                ? fixedPrice
                : (consumption !== null ? consumption * pricePerUnit : null);

            // Determine status
            let status: 'missing' | 'pending' | 'ok' = 'missing';
            if (reading) {
                status = 'ok';
            }

            // Category detection
            let category: 'elektra' | 'vanduo' | 'sildymas' | 'dujos' = 'elektra';
            const nameLower = (config.name || '').toLowerCase();
            const typeLower = (config.type || '').toLowerCase();
            if (nameLower.includes('vanduo') || nameLower.includes('water') || typeLower.includes('vanduo') || typeLower.includes('karštas') || typeLower.includes('šaltas')) {
                category = 'vanduo';
            } else if (nameLower.includes('šildym') || nameLower.includes('heat') || typeLower.includes('šildym')) {
                category = 'sildymas';
            } else if (nameLower.includes('duj') || nameLower.includes('gas') || typeLower.includes('duj')) {
                category = 'dujos';
            }

            return {
                id: config.id,
                name: config.name,
                category,
                scope: config.distribution_method === 'per_consumption' ? 'individual' : 'communal',
                unit: config.unit || 'kWh',
                previousReading,
                currentReading,
                status,
                tariff: pricePerUnit || fixedPrice || 0,
                fixedPrice: fixedPrice > 0 ? fixedPrice : undefined,
                consumption,
                cost,
                photoUrl: null,
            } as MeterData;
        });
    }, [meterConfigs, readings, prevMonthReadings]);

    // Fetch history for a specific meter
    const fetchMeterHistory = useCallback(async (meterId: string, limit = 12): Promise<MeterHistoryEntry[]> => {
        if (!propertyId) return [];

        try {
            const { data, error: err } = await supabase
                .from('meter_readings')
                .select('*')
                .eq('meter_id', meterId)
                .eq('property_id', propertyId)
                .order('reading_date', { ascending: false })
                .limit(limit);

            if (err) {
                console.error('[useMeterReadings] Error fetching history:', err);
                return [];
            }

            return (data || []).map(r => ({
                id: r.id,
                readingDate: r.reading_date,
                previousReading: r.previous_reading,
                currentReading: r.current_reading,
                consumption: r.consumption || (r.current_reading - (r.previous_reading || 0)),
                cost: r.total_sum || r.amount || 0,
                notes: r.notes,
            }));
        } catch (e) {
            console.error('[useMeterReadings] Error in fetchMeterHistory:', e);
            return [];
        }
    }, [propertyId]);

    // Save a reading for the current period
    const saveReading = useCallback(async (
        meterId: string,
        currentReadingValue: number,
        previousReadingValue: number | null,
        meterConfig?: MeterConfig
    ): Promise<boolean> => {
        if (!propertyId) return false;

        try {
            const config = meterConfig || meterConfigs.find(c => c.id === meterId);
            if (!config) {
                console.error('[useMeterReadings] Config not found for meter:', meterId);
                return false;
            }

            // Defensive: ensure all values are proper numbers, never NaN/undefined
            const currentVal = Number(currentReadingValue) || 0;
            const prev = Number(previousReadingValue) || 0;
            const consumption = currentVal - prev;
            const difference = isNaN(consumption) ? 0 : consumption;
            const pricePerUnit = Number(config.price_per_unit) || 0;
            const fixedPrice = Number(config.fixed_price) || 0;
            const totalSum = fixedPrice > 0
                ? fixedPrice
                : difference * pricePerUnit;

            const meterType = config.distribution_method === 'per_consumption' ? 'apartment' : 'address';

            console.log(`[useMeterReadings] saveReading:`, {
                meterId,
                currentVal,
                prev,
                difference,
                pricePerUnit,
                totalSum,
                meterType,
                readingDate,
            });

            // Check if reading already exists for this meter+period
            const existing = readings.find(r => r.meter_id === meterId);

            if (existing) {
                // Update existing reading
                const { error: updateErr } = await supabase
                    .from('meter_readings')
                    .update({
                        current_reading: currentVal,
                        previous_reading: prev,
                        difference: difference,
                        price_per_unit: pricePerUnit,
                        total_sum: totalSum,
                        amount: totalSum,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', existing.id);

                if (updateErr) {
                    console.error('[useMeterReadings] Error updating reading:', updateErr);
                    return false;
                }
                console.log(`✅ Updated reading for meter ${meterId} in period ${readingDate}`);
            } else {
                // Insert new reading
                const { error: insertErr } = await supabase
                    .from('meter_readings')
                    .insert({
                        property_id: propertyId,
                        meter_id: meterId,
                        meter_type: meterType,
                        type: config.type || 'electricity',
                        reading_date: readingDate,
                        current_reading: currentVal,
                        previous_reading: prev,
                        difference: difference,
                        price_per_unit: pricePerUnit,
                        total_sum: totalSum,
                        amount: totalSum,
                        notes: `Nuomotojo įvestas rodmuo (${year}-${String(month + 1).padStart(2, '0')})`,
                    });

                if (insertErr) {
                    console.error('[useMeterReadings] Error inserting reading:', insertErr);
                    return false;
                }
                console.log(`✅ Inserted reading for meter ${meterId} in period ${readingDate}`);
            }

            return true;
        } catch (e) {
            console.error('[useMeterReadings] Error saving reading:', e);
            return false;
        }
    }, [propertyId, meterConfigs, readings, readingDate, year, month]);

    // Refetch readings for current AND previous period (call after save)
    const refetch = useCallback(async () => {
        if (!propertyId) return;

        // Current period
        const { data: currentData, error: currErr } = await supabase
            .from('meter_readings')
            .select('*')
            .eq('property_id', propertyId)
            .gte('reading_date', periodStart)
            .lte('reading_date', periodEnd)
            .order('reading_date', { ascending: false });

        if (!currErr) {
            setReadings(currentData || []);
        }

        // Previous period (for auto-previous-reading when switching months)
        const prevMonth = month === 0 ? 11 : month - 1;
        const prevYear = month === 0 ? year - 1 : year;
        const { start: prevStart, end: prevEnd } = getMonthRange(prevYear, prevMonth);

        const { data: prevData, error: prevErr } = await supabase
            .from('meter_readings')
            .select('*')
            .eq('property_id', propertyId)
            .gte('reading_date', prevStart)
            .lte('reading_date', prevEnd)
            .order('reading_date', { ascending: false });

        if (!prevErr) {
            setPrevMonthReadings(prevData || []);
        }
    }, [propertyId, periodStart, periodEnd, year, month]);

    return {
        meters,
        meterConfigs,
        isLoading,
        error,
        readingDate,
        fetchMeterHistory,
        saveReading,
        refetch,
    };
}

export default useMeterReadings;
