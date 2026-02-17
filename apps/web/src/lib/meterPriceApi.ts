import { supabase } from './supabase';
import { MeterPriceData } from '../components/properties/MeterPriceManager';

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

// Get meter data for apartment - ALWAYS get from address_meters (address settings)
export const getApartmentMeters = async (propertyId: string): Promise<MeterPriceData[]> => {
  try {
    // First, get the property to find its address_id
    const { data: propertyData, error: propertyError } = await supabase
      .from('properties')
      .select('address_id')
      .eq('id', propertyId)
      .single();

    if (propertyError) {
      console.error('Error fetching property:', propertyError);
      throw new Error(`Failed to fetch property: ${propertyError.message}`);
    }

    const addressId = propertyData?.address_id;
    if (!addressId) {
      console.error('No address_id found for property:', propertyId);
      return [];
    }

    // ALWAYS get meters from address_meters (address settings) - this is the single source of truth

    const { data: addressMeters, error: addressError } = await supabase
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
        policy
      `)
      .eq('address_id', addressId)
      .eq('is_active', true);



    if (addressError) {
      console.error('Error fetching address meters:', addressError);
      throw new Error(`Failed to fetch address meters: ${addressError.message}`);
    }

    // Convert address meters to apartment meter format
    const convertedMeters: MeterPriceData[] = (addressMeters || []).map(addressMeter => {
      // Use the type directly from address_meters (address settings)
      const meterType = addressMeter.type || 'individual';



      // Determine policy based on type and distribution from address settings
      const policy = {
        scope: addressMeter.distribution_method === 'fixed_split' ? 'none' as const
          : meterType === 'individual' ? 'apartment' as const
            : 'building' as const,
        collectionMode: 'landlord_only' as const
      };

      return {
        id: addressMeter.id, // Use actual address_meter ID
        name: addressMeter.name,
        type: meterType,
        unit: addressMeter.unit,
        distribution_method: addressMeter.distribution_method || 'per_apartment',
        price_per_unit: addressMeter.price_per_unit || 0,
        fixed_price: addressMeter.fixed_price || 0,
        is_custom: false,
        address_meter_id: addressMeter.id,
        property_id: propertyId,
        policy: addressMeter.policy || policy
      };
    });



    return convertedMeters;

  } catch (error) {
    console.error('Error in getApartmentMeters:', error);
    throw error;
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
      policy
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

  // Fixed meters - use fixed_price
  if (meter.unit === 'Kitas' || meter.distribution_method === 'fixed_split') {
    return meter.fixed_price || 0;
  }

  // For communal meters, calculate based on total consumption
  if (meter.type === 'communal') {
    const totalConsumption = consumption || 0;
    const totalCost = totalConsumption * (meter.price_per_unit || 0);
    return totalCost / apartmentCount;
  }

  // Individual meters - cost is per consumption
  return meter.price_per_unit || 0;
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
      // Return zero values if no readings found
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
