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
    supplier: string | null;
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
    photo_urls: string[] | null;
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

// Map meter config name to the correct database type for meter_readings
// address_meters.type is 'individual'/'communal' (distribution), NOT the meter type
// meter_readings.type CHECK constraint: 'electricity','water','heating','internet','garbage','gas'
function resolveMeterReadingType(config: MeterConfig): string {
    const nameLower = (config.name || '').toLowerCase();
    if (nameLower.includes('vanduo') || nameLower.includes('water') || nameLower.includes('karštas') || nameLower.includes('šaltas')) {
        return 'water';
    }
    if (nameLower.includes('šildym') || nameLower.includes('heat')) {
        return 'heating';
    }
    if (nameLower.includes('duj') || nameLower.includes('gas')) {
        return 'gas';
    }
    if (nameLower.includes('internet') || nameLower.includes('ryšy')) {
        return 'internet';
    }
    if (nameLower.includes('šiukšl') || nameLower.includes('atliek') || nameLower.includes('trash') || nameLower.includes('garbage')) {
        return 'garbage';
    }
    // Default: electricity (covers elektra, techninė apžiūra, etc.)
    return 'electricity';
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
    const [areaInfo, setAreaInfo] = useState<{ apartmentArea: number; totalArea: number; totalApartments: number } | null>(null);

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
                if (import.meta.env.DEV) console.error('[useMeterReadings] Error fetching meter configs:', err);
                setError('Nepavyko užkrauti skaitliukų konfigūracijos');
                return;
            }
            setMeterConfigs(data || []);
        };

        fetchConfigs();
    }, [addressId]);

    // Fetch area data for distribution proportion display
    useEffect(() => {
        if (!addressId || !propertyId) return;

        const fetchAreaInfo = async () => {
            const { data: allProps } = await supabase
                .from('properties')
                .select('id, area')
                .eq('address_id', addressId);

            if (allProps && allProps.length > 0) {
                const currentProp = allProps.find(p => p.id === propertyId);
                const totalArea = allProps.reduce((sum, p) => sum + (Number(p.area) || 0), 0);
                setAreaInfo({
                    apartmentArea: Number(currentProp?.area) || 0,
                    totalArea,
                    totalApartments: allProps.length,
                });
            }
        };

        fetchAreaInfo();
    }, [addressId, propertyId]);

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

                if (import.meta.env.DEV) console.log(`[useMeterReadings] Loaded ${(currentData || []).length} readings for ${year}-${month + 1}, ${(prevData || []).length} from prev month`);
            } catch (e: any) {
                if (import.meta.env.DEV) console.error('[useMeterReadings] Error fetching readings:', e);
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

            // Carry-forward: prev month's current_reading is authoritative
            // Only fall back to this period's saved previous_reading if no prev month data
            const previousReading = prevReading?.current_reading ?? reading?.previous_reading ?? null;
            const currentReading = reading?.current_reading ?? null;

            if (import.meta.env.DEV) console.log(`[useMeterReadings] Meter "${config.name}" (${config.id}):`, {
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
            const isCommunal = config.distribution_method !== 'per_consumption';

            // For communal meters, always recalculate using live proportion
            // (stored total_sum may be stale if apartment area changed)
            // For individual meters, calculate from consumption × price
            let cost: number | null;
            if (fixedPrice > 0) {
                cost = fixedPrice;
            } else {
                const rawCost = consumption !== null ? consumption * pricePerUnit : null;
                // Apply distribution proportion for communal meters
                if (rawCost !== null && isCommunal && areaInfo) {
                    if (config.distribution_method === 'per_area' && areaInfo.totalArea > 0) {
                        cost = Math.round(rawCost * (areaInfo.apartmentArea / areaInfo.totalArea) * 100) / 100;
                    } else if (config.distribution_method === 'per_apartment' && areaInfo.totalApartments > 0) {
                        cost = Math.round(rawCost / areaInfo.totalApartments * 100) / 100;
                    } else {
                        cost = rawCost;
                    }
                } else if (isCommunal && reading && (reading.total_sum != null || reading.amount != null)) {
                    // Fallback to stored DB value only when no areaInfo available
                    cost = Number(reading.total_sum) || Number(reading.amount) || 0;
                } else {
                    cost = rawCost;
                }
            }

            // Determine status: 'pending' when reading exists (not yet approved by landlord)
            // Only becomes 'ok' when landlord explicitly approves via the approve button
            let status: 'missing' | 'pending' | 'ok' = 'missing';
            if (reading && reading.current_reading != null) {
                status = 'pending';
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
                photoUrl: reading?.photo_urls?.[0] ?? null,
                supplier: config.supplier || null,
                distributionMethod: config.distribution_method || null,
                apartmentArea: areaInfo?.apartmentArea ?? null,
                totalArea: areaInfo?.totalArea ?? null,
                totalApartments: areaInfo?.totalApartments ?? null,
            } as MeterData;
        });
    }, [meterConfigs, readings, prevMonthReadings, areaInfo]);

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
                if (import.meta.env.DEV) console.error('[useMeterReadings] Error fetching history:', err);
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
            if (import.meta.env.DEV) console.error('[useMeterReadings] Error in fetchMeterHistory:', e);
            return [];
        }
    }, [propertyId]);

    // Save a reading for the current period
    const saveReading = useCallback(async (
        meterId: string,
        currentReadingValue: number | null,
        previousReadingValue: number | null,
        meterConfig?: MeterConfig
    ): Promise<boolean> => {
        if (!propertyId) return false;

        try {
            const config = meterConfig || meterConfigs.find(c => c.id === meterId);
            if (!config) {
                if (import.meta.env.DEV) console.error('[useMeterReadings] Config not found for meter:', meterId);
                return false;
            }

            // Defensive: ensure values are proper numbers, keep null for current if not entered
            const currentVal = currentReadingValue != null ? (Number(currentReadingValue) || 0) : null;
            const prev = Number(previousReadingValue) || 0;
            const difference = currentVal != null ? (currentVal - prev) : 0;
            const pricePerUnit = Number(config.price_per_unit) || 0;
            const fixedPrice = Number(config.fixed_price) || 0;
            const totalSum = currentVal != null
                ? (fixedPrice > 0 ? fixedPrice : difference * pricePerUnit)
                : 0;

            const isCommunal = config.distribution_method !== 'per_consumption';
            const meterType = isCommunal ? 'address' : 'apartment';

            if (import.meta.env.DEV) console.log(`[useMeterReadings] saveReading:`, {
                meterId,
                currentVal,
                prev,
                difference,
                pricePerUnit,
                totalSum,
                meterType,
                isCommunal,
                readingDate,
            });

            if (isCommunal && config.address_id) {
                // ===== COMMUNAL METER: distribute to all properties at this address =====
                return await saveCommunalReading(config, meterId, currentVal, prev, difference, pricePerUnit, fixedPrice, totalSum);
            } else {
                // ===== INDIVIDUAL METER: save for this property only =====
                return await saveIndividualReading(meterId, config, currentVal, prev, difference, pricePerUnit, totalSum, meterType);
            }
        } catch (e) {
            if (import.meta.env.DEV) console.error('[useMeterReadings] Error saving reading:', e);
            return false;
        }
    }, [propertyId, meterConfigs, readings, readingDate, year, month]);

    // Save an individual (per-property) meter reading
    const saveIndividualReading = useCallback(async (
        meterId: string,
        config: MeterConfig,
        currentVal: number | null,
        prev: number,
        difference: number,
        pricePerUnit: number,
        totalSum: number,
        meterType: string,
    ): Promise<boolean> => {
        const existing = readings.find(r => r.meter_id === meterId);

        if (existing) {
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
                if (import.meta.env.DEV) console.error('[useMeterReadings] Error updating reading:', updateErr);
                return false;
            }
            if (import.meta.env.DEV) console.log(`✅ Updated reading for meter ${meterId} in period ${readingDate}`);
        } else {
            const { error: insertErr } = await supabase
                .from('meter_readings')
                .insert({
                    property_id: propertyId!,
                    meter_id: meterId,
                    meter_type: meterType,
                    type: resolveMeterReadingType(config),
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
                if (import.meta.env.DEV) console.error('[useMeterReadings] Error inserting reading:', insertErr);
                return false;
            }
            if (import.meta.env.DEV) console.log(`✅ Inserted reading for meter ${meterId} in period ${readingDate}`);
        }

        return true;
    }, [propertyId, readings, readingDate, year, month]);

    // Save a communal meter reading and distribute to all properties at the address
    const saveCommunalReading = useCallback(async (
        config: MeterConfig,
        meterId: string,
        currentVal: number | null,
        prev: number,
        difference: number,
        pricePerUnit: number,
        fixedPrice: number,
        totalSum: number,
    ): Promise<boolean> => {
        // 1. Fetch all properties at this address
        const { data: allProperties, error: propErr } = await supabase
            .from('properties')
            .select('id, area')
            .eq('address_id', config.address_id);

        if (propErr || !allProperties || allProperties.length === 0) {
            if (import.meta.env.DEV) console.error('[useMeterReadings] Cannot fetch properties for communal distribution:', propErr);
            // Fallback: save for current property only
            return await saveIndividualReading(meterId, config, currentVal, prev, difference, pricePerUnit, totalSum, 'address');
        }

        const aptCount = allProperties.length;
        const totalArea = allProperties.reduce((sum, p) => sum + (Number(p.area) || 0), 0);
        const readingType = resolveMeterReadingType(config);

        if (import.meta.env.DEV) console.log(`[useMeterReadings] Communal distribution: ${aptCount} apartments, totalArea=${totalArea}, method=${config.distribution_method}`);

        // 2. Fetch existing readings for this meter across ALL properties in this period
        const { data: existingReadings } = await supabase
            .from('meter_readings')
            .select('id, property_id')
            .eq('meter_id', meterId)
            .gte('reading_date', readingDate)
            .lte('reading_date', readingDate);

        const existingMap = new Map((existingReadings || []).map(r => [r.property_id, r.id]));

        // 3. Calculate per-apartment share and upsert for each property
        let allSuccess = true;
        for (const prop of allProperties) {
            let aptShare: number;

            if (fixedPrice > 0) {
                // Fixed price: same for each apartment
                aptShare = fixedPrice;
            } else if (config.distribution_method === 'per_area' && totalArea > 0) {
                // Per area: proportional to apartment area
                const propArea = Number(prop.area) || 0;
                aptShare = totalSum * (propArea / totalArea);
            } else {
                // Per apartment (default): equal split
                aptShare = totalSum / aptCount;
            }

            // Round to 2 decimal places
            aptShare = Math.round(aptShare * 100) / 100;

            const existingId = existingMap.get(prop.id);

            if (existingId) {
                const { error: updateErr } = await supabase
                    .from('meter_readings')
                    .update({
                        current_reading: currentVal,
                        previous_reading: prev,
                        difference: difference,
                        price_per_unit: pricePerUnit,
                        total_sum: aptShare,
                        amount: aptShare,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', existingId);

                if (updateErr) {
                    if (import.meta.env.DEV) console.error(`[useMeterReadings] Error updating communal reading for property ${prop.id}:`, updateErr);
                    allSuccess = false;
                }
            } else {
                const { error: insertErr } = await supabase
                    .from('meter_readings')
                    .insert({
                        property_id: prop.id,
                        meter_id: meterId,
                        meter_type: 'address',
                        type: readingType,
                        reading_date: readingDate,
                        current_reading: currentVal,
                        previous_reading: prev,
                        difference: difference,
                        price_per_unit: pricePerUnit,
                        total_sum: aptShare,
                        amount: aptShare,
                        notes: `Bendras skaitliukas — paskirstyta (${config.distribution_method}, ${year}-${String(month + 1).padStart(2, '0')})`,
                    });

                if (insertErr) {
                    if (import.meta.env.DEV) console.error(`[useMeterReadings] Error inserting communal reading for property ${prop.id}:`, insertErr);
                    allSuccess = false;
                }
            }
        }

        if (allSuccess) {
            if (import.meta.env.DEV) console.log(`✅ Communal meter "${config.name}" distributed to ${aptCount} properties`);
        }

        return allSuccess;
    }, [propertyId, readingDate, year, month, saveIndividualReading]);

    // Delete a reading for the current period (allows re-entry)
    const deleteReading = useCallback(async (meterId: string): Promise<boolean> => {
        if (!propertyId) return false;

        try {
            const config = meterConfigs.find(c => c.id === meterId);
            const isCommunal = config && config.distribution_method !== 'per_consumption';

            if (isCommunal && config?.address_id) {
                // For communal meters, delete all distributed readings across ALL properties
                const { error: delErr } = await supabase
                    .from('meter_readings')
                    .delete()
                    .eq('meter_id', meterId)
                    .gte('reading_date', periodStart)
                    .lte('reading_date', periodEnd);

                if (delErr) {
                    if (import.meta.env.DEV) console.error('[useMeterReadings] Error deleting communal readings:', delErr);
                    return false;
                }
                if (import.meta.env.DEV) console.log(`✅ Deleted communal readings for meter ${meterId} in period ${periodStart}–${periodEnd}`);
            } else {
                // Individual meter — delete ALL readings for this meter+property in this period
                // (handles duplicates: e.g. null entry on 1st + real entry on 7th)
                const { error: delErr } = await supabase
                    .from('meter_readings')
                    .delete()
                    .eq('meter_id', meterId)
                    .eq('property_id', propertyId)
                    .gte('reading_date', periodStart)
                    .lte('reading_date', periodEnd);

                if (delErr) {
                    if (import.meta.env.DEV) console.error('[useMeterReadings] Error deleting reading:', delErr);
                    return false;
                }
                if (import.meta.env.DEV) console.log(`✅ Deleted all readings for meter ${meterId}, property ${propertyId} in period ${periodStart}–${periodEnd}`);
            }

            return true;
        } catch (e) {
            if (import.meta.env.DEV) console.error('[useMeterReadings] Error in deleteReading:', e);
            return false;
        }
    }, [propertyId, meterConfigs, periodStart, periodEnd]);

    // Refetch readings for current AND previous period (call after save)
    const refetch = useCallback(async () => {
        if (!propertyId) {
            if (import.meta.env.DEV) console.warn('[useMeterReadings] refetch: no propertyId');
            return;
        }

        if (import.meta.env.DEV) console.log(`[useMeterReadings] refetch: propertyId=${propertyId}, period=${periodStart} - ${periodEnd}`);

        // Current period
        const { data: currentData, error: currErr } = await supabase
            .from('meter_readings')
            .select('*')
            .eq('property_id', propertyId)
            .gte('reading_date', periodStart)
            .lte('reading_date', periodEnd)
            .order('reading_date', { ascending: false });

        if (import.meta.env.DEV) console.log(`[useMeterReadings] refetch: currentData=${(currentData || []).length} readings, error=${currErr?.message || 'none'}`);

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

        if (import.meta.env.DEV) console.log(`[useMeterReadings] refetch complete: ${(currentData || []).length} current, ${(prevData || []).length} prev`);
    }, [propertyId, periodStart, periodEnd, year, month]);

    return {
        meters,
        meterConfigs,
        isLoading,
        error,
        readingDate,
        fetchMeterHistory,
        saveReading,
        deleteReading,
        refetch,
    };
}

export default useMeterReadings;
