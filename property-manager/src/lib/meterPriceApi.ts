import { supabase } from './supabase';
import { MeterPriceData } from '../components/properties/MeterPriceManager';
import { PostgrestError } from '@supabase/supabase-js';

const derivePolicy = (
  type: 'individual' | 'communal',
  distribution: MeterPriceData['distribution_method'],
  policy?: MeterPriceData['policy']
): MeterPriceData['policy'] => {
  if (policy) return policy;

  if (distribution === 'fixed_split') {
    return {
      scope: 'none',
      collectionMode: 'landlord_only'
    };
  }

  if (type === 'communal') {
    return {
      scope: 'building',
      collectionMode: 'landlord_only'
    };
  }

  return {
    scope: 'apartment',
    collectionMode: 'landlord_only'
  };
};

const fetchLatestReadings = async (meterIds: string[]) => {
  if (meterIds.length === 0) {
    return new Map<string, any>();
  }

  const { data, error } = await supabase
    .from('meter_readings')
    .select('meter_id,current_reading,previous_reading,reading_date,total_sum')
    .in('meter_id', meterIds)
    .order('reading_date', { ascending: false });

  if (error) {
    console.error('Error fetching latest meter readings:', error);
    return new Map<string, any>();
  }

  const latest = new Map<string, any>();
  (data ?? []).forEach((reading) => {
    if (!latest.has(reading.meter_id)) {
      latest.set(reading.meter_id, reading);
    }
  });

  return latest;
};

// Update individual apartment meter
export const updateApartmentMeter = async (
  meterId: string,
  updates: Partial<MeterPriceData>
): Promise<void> => {
  const { error } = await supabase
    .from('apartment_meters')
    .update({
      price_per_unit: updates.price_per_unit,
      fixed_price: updates.fixed_price,
      distribution_method: updates.distribution_method,
      updated_at: new Date().toISOString()
    })
    .eq('id', meterId);

  if (error) {
    console.error('Error updating apartment meter:', error);
    throw new Error(`Failed to update apartment meter: ${error.message}`);
  }
};

// Update global address meter (affects all apartments)
export const updateAddressMeter = async (
  addressMeterId: string,
  updates: Partial<MeterPriceData>
): Promise<void> => {
  // First update the address meter
  const { error: addressError } = await supabase
    .from('address_meters')
    .update({
      price_per_unit: updates.price_per_unit,
      fixed_price: updates.fixed_price,
      distribution_method: updates.distribution_method,
      updated_at: new Date().toISOString()
    })
    .eq('id', addressMeterId);

  if (addressError) {
    console.error('Error updating address meter:', addressError);
    throw new Error(`Failed to update address meter: ${addressError.message}`);
  }

  // Then update all apartment meters that inherit from this address meter
  const { error: apartmentError } = await supabase
    .from('apartment_meters')
    .update({
      price_per_unit: updates.price_per_unit,
      fixed_price: updates.fixed_price,
      distribution_method: updates.distribution_method,
      updated_at: new Date().toISOString()
    })
    .eq('address_meter_id', addressMeterId)
    .eq('is_custom', false); // Only update non-custom meters

  if (apartmentError) {
    console.error('Error updating apartment meters:', apartmentError);
    throw new Error(`Failed to update apartment meters: ${apartmentError.message}`);
  }
};

// Get meter data for apartment with latest readings and configuration inheritance
export const getApartmentMeters = async (
  propertyId: string,
  addressId?: string
): Promise<MeterPriceData[]> => {
  try {
    const [apartmentResp, addressResp] = await Promise.all([
      supabase
        .from('apartment_meters')
        .select(
          `id,
           meter_name,
           meter_type,
           unit,
           distribution_method,
           price_per_unit,
           fixed_price,
           policy,
           address_meter_id,
           is_custom,
           requires_photo,
           requires_reading`
        )
        .eq('property_id', propertyId)
        .order('created_at', { ascending: true }),
      addressId
        ? supabase
            .from('address_meters')
            .select(
              `id,
               name,
               type,
               unit,
               distribution_method,
               price_per_unit,
               fixed_price,
               policy,
               requires_photo,
               requires_reading`
            )
            .eq('address_id', addressId)
            .eq('is_active', true)
        : Promise.resolve({ data: [], error: null })
    ]);

    let apartmentData = apartmentResp.data ?? [];
    let apartmentError = apartmentResp.error as PostgrestError | null;

    if (apartmentError?.code === '42703') {
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ Legacy apartment_meters schema detected (missing meter_name). Falling back to basic columns.');
      }
      const legacyResp = await supabase
        .from('apartment_meters')
        .select(
          `id,
           name,
           meter_type,
           unit,
           distribution_method,
           price_per_unit,
           fixed_price,
           policy,
           address_meter_id,
           is_custom,
           requires_photo,
           requires_reading`
        )
        .eq('property_id', propertyId)
        .order('created_at', { ascending: true });

      apartmentError = legacyResp.error as PostgrestError | null;
      apartmentData = (legacyResp.data ?? []).map((meter: any) => ({
        ...meter,
        meter_name: meter.name
      }));
    }

    if (apartmentError) {
      console.error('Error fetching apartment meters:', apartmentError);
      return [];
    }

    const addressMeters = addressResp.data ?? [];
    const addressMeterMap = new Map(addressMeters.map((meter) => [meter.id, meter]));

    if (apartmentData.length === 0) {
      return addressMeters.map((addressMeter: any) => {
        const type = (addressMeter.type ?? 'individual') as 'individual' | 'communal';
        const policy = derivePolicy(type, addressMeter.distribution_method ?? 'per_apartment', addressMeter.policy);
        return {
          id: addressMeter.id,
          address_meter_id: addressMeter.id,
          name: addressMeter.name,
          type,
          unit: (addressMeter.unit ?? 'Kitas') as MeterPriceData['unit'],
          distribution_method: addressMeter.distribution_method ?? 'per_apartment',
          price_per_unit: addressMeter.price_per_unit ?? 0,
          fixed_price: addressMeter.fixed_price ?? 0,
          is_custom: false,
          property_id: propertyId,
          policy,
          requires_photo: addressMeter.requires_photo ?? false,
          requires_reading: addressMeter.requires_reading ?? true,
          last_reading: null,
          previous_reading: null,
          last_reading_date: null,
          last_total_cost: null,
          tenant_submitted_value: null,
          tenant_submitted_at: null,
          tenant_submission_status: null
        } satisfies MeterPriceData;
      });
    }

    const latestReadings = await fetchLatestReadings(apartmentData.map((meter: any) => meter.id));

    return apartmentData.map((meter: any) => {
      const template = meter.address_meter_id ? addressMeterMap.get(meter.address_meter_id) : null;
      const unit = (meter.unit ?? template?.unit ?? 'Kitas') as MeterPriceData['unit'];
      const type = ((meter.meter_type ?? template?.type) === 'communal' ? 'communal' : 'individual') as
        | 'individual'
        | 'communal';
      const distribution = (meter.distribution_method ?? template?.distribution_method ?? 'per_apartment') as MeterPriceData['distribution_method'];
      const policy = derivePolicy(type, distribution, meter.policy ?? template?.policy);
      const latest = latestReadings.get(meter.id);

      return {
        id: meter.id,
        address_meter_id: meter.address_meter_id ?? template?.id ?? null,
        name: meter.meter_name ?? template?.name ?? 'Skaitliukas',
        type,
        unit,
        distribution_method: distribution,
        price_per_unit: meter.price_per_unit ?? template?.price_per_unit ?? 0,
        fixed_price: meter.fixed_price ?? template?.fixed_price ?? 0,
        is_custom: Boolean(meter.is_custom),
        property_id: propertyId,
        policy,
        requires_photo: meter.requires_photo ?? template?.requires_photo ?? false,
        requires_reading: meter.requires_reading ?? template?.requires_reading ?? true,
        last_reading: latest?.current_reading ?? null,
        previous_reading: latest?.previous_reading ?? null,
        last_reading_date: latest?.reading_date ?? null,
        last_total_cost: latest?.total_sum ?? null,
        tenant_submitted_value: null,
        tenant_submitted_at: null,
        tenant_submission_status: null
      } satisfies MeterPriceData;
    });
  } catch (error) {
    console.error('Error in getApartmentMeters:', error);
    return [];
  }
};

// Get address meters for building
export const getAddressMeters = async (addressId: string): Promise<Omit<MeterPriceData, 'is_custom' | 'property_id'>[]> => {
  const { data, error } = await supabase
    .from('address_meters')
    .select(`
      id,
      name,
      type,
      unit,
      distribution_method,
      price_per_unit,
      fixed_price,
      address_id,
      policy,
      requires_photo,
      requires_reading
    `)
    .eq('address_id', addressId)
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching address meters:', error);
    throw new Error(`Failed to fetch address meters: ${error.message}`);
  }

  return data || [];
};

// Calculate meter cost for apartment
export const calculateMeterCost = (
  meter: MeterPriceData,
  apartmentCount: number = 1,
  consumption?: number
): number => {
  if (!meter) return 0;

  if (meter.unit === 'Kitas' || meter.distribution_method === 'fixed_split') {
    return meter.fixed_price || 0;
  }

  if (meter.type === 'communal') {
    const totalConsumption = consumption ?? Math.max(0, (meter.last_reading ?? 0) - (meter.previous_reading ?? 0));
    const totalCost = totalConsumption * (meter.price_per_unit || 0);
    return apartmentCount > 0 ? totalCost / apartmentCount : totalCost;
  }

  const consumptionValue = consumption ?? Math.max(0, (meter.last_reading ?? 0) - (meter.previous_reading ?? 0));
  return consumptionValue * (meter.price_per_unit || 0);
};

// Get meter readings for cost calculation
export const getMeterReadings = async (
  meterId: string,
  meterType: 'address' | 'apartment' = 'address',
  period?: string
): Promise<{ current: number; previous: number; consumption: number }> => {
  try {
    console.log('📊 Getting meter readings for:', { meterId, meterType });

    const { data, error } = await supabase
      .from('meter_readings')
      .select('current_reading, previous_reading, consumption')
      .eq('meter_id', meterId)
      .eq('meter_type', meterType)
      .order('reading_date', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error fetching meter readings:', error);
      return { current: 0, previous: 0, consumption: 0 };
    }

    const reading = data?.[0];
    const result = {
      current: reading?.current_reading || 0,
      previous: reading?.previous_reading || 0,
      consumption: reading?.consumption || 0
    };

    console.log('📊 Meter readings result:', result);
    return result;
  } catch (error) {
    console.error('Error in getMeterReadings:', error);
    return { current: 0, previous: 0, consumption: 0 };
  }
};

// Get apartment count for address
export const getApartmentCount = async (addressId: string): Promise<number> => {
  const { data, error } = await supabase
    .from('properties')
    .select('id')
    .eq('address_id', addressId);

  if (error) {
    console.error('Error fetching apartment count:', error);
    return 1;
  }

  return data?.length || 1;
};
export const createMeterReading = async ({
  propertyId,
  meterId,
  scope,
  type,
  currentReading,
  previousReading,
  pricePerUnit,
  notes
}: {
  propertyId: string;
  meterId: string;
  scope: 'none' | 'apartment' | 'building';
  type: string;
  currentReading: number;
  previousReading: number;
  pricePerUnit: number;
  notes?: string;
}): Promise<void> => {
  const readingDateIso = new Date();
  const readingDate = readingDateIso.toISOString().split('T')[0];
  const consumption = currentReading - previousReading;
  const total = consumption * pricePerUnit;

  const { error } = await supabase
    .from('meter_readings')
    .insert({
      property_id: propertyId,
      meter_id: meterId,
      meter_type: scope === 'building' ? 'address' : 'apartment',
      type,
      reading_date: readingDate,
      current_reading: currentReading,
      previous_reading: previousReading,
      price_per_unit: pricePerUnit,
      total_sum: total,
      amount: total,
      notes: notes ?? (scope === 'building' ? 'Nuomotojo įvestas bendras rodmuo' : 'Nuomotojo įvestas rodmuo')
    });

  if (error) {
    console.error('Error saving meter reading:', error);
    throw new Error(`Failed to save meter reading: ${error.message}`);
  }
};

