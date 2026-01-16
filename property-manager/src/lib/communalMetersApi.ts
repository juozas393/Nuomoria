import { supabase } from './supabase';
import { type DistributionMethod } from '../constants/meterDistribution';
import { type AddressMeterSettings } from '../types/communal';

export interface CommunalMeter {
  id: string;
  address_id: string;
  name: string;
  type: 'individual' | 'communal';
  unit: 'm3' | 'kWh' | 'GJ' | 'Kitas';
  price_per_unit: number;
  fixed_price?: number;
  distribution_method: DistributionMethod;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CommunalExpense {
  id: string;
  meter_id: string;
  month: string; // YYYY-MM format
  total_amount: number;
  total_units?: number;
  distribution_amount: number; // Amount per apartment
  notes?: string;
  created_at: string;
}

export interface AddressSettings {
  id: string;
  address_id: string;
  building_info: {
    totalApartments: number;
    totalFloors: number;
    yearBuilt?: number;
    buildingType: 'apartment' | 'house' | 'commercial';
    heatingType: 'central' | 'individual' | 'district';
    parkingSpaces?: number;
  };
  contact_info: {
    managerName: string;
    managerPhone: string;
    managerEmail: string;
    emergencyContact: string;
    emergencyPhone: string;
  };
  financial_settings: {
    defaultDeposit: number;
    latePaymentFee: number;
    gracePeriodDays: number;
    autoRenewalEnabled: boolean;
    defaultContractDuration: number; // months
  };
  notification_settings: {
    rentReminderDays: number;
    contractExpiryReminderDays: number;
    meterReminderDays: number;
    maintenanceNotifications: boolean;
  };
  communal_config?: AddressMeterSettings;
  created_at: string;
  updated_at: string;
}

// Communal Meters API
export const getCommunalMeters = async (addressId: string): Promise<CommunalMeter[]> => {
  try {
    const { data, error } = await supabase
      .from('communal_meters')
      .select('*')
      .eq('address_id', addressId)
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching communal meters:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getCommunalMeters:', error);
    throw error;
  }
};

export const createCommunalMeter = async (meter: Omit<CommunalMeter, 'id' | 'created_at' | 'updated_at'>): Promise<CommunalMeter> => {
  try {
    const { data, error } = await supabase
      .from('communal_meters')
      .insert([meter])
      .select()
      .single();

    if (error) {
      console.error('Error creating communal meter:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in createCommunalMeter:', error);
    throw error;
  }
};

export const updateCommunalMeter = async (id: string, updates: Partial<CommunalMeter>): Promise<CommunalMeter> => {
  try {
    const { data, error } = await supabase
      .from('communal_meters')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating communal meter:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in updateCommunalMeter:', error);
    throw error;
  }
};

export const deleteCommunalMeter = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('communal_meters')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting communal meter:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in deleteCommunalMeter:', error);
    throw error;
  }
};

// Communal Expenses API
export const getCommunalExpenses = async (meterId: string, month?: string): Promise<CommunalExpense[]> => {
  try {
    let query = supabase
      .from('communal_expenses_new')
      .select('*')
      .eq('meter_id', meterId);

    if (month) {
      query = query.eq('month', month);
    }

    const { data, error } = await query.order('month', { ascending: false });

    if (error) {
      console.error('Error fetching communal expenses:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getCommunalExpenses:', error);
    throw error;
  }
};

export const createCommunalExpense = async (expense: Omit<CommunalExpense, 'id' | 'created_at'>): Promise<CommunalExpense> => {
  try {
    const { data, error } = await supabase
      .from('communal_expenses_new')
      .insert([expense])
      .select()
      .single();

    if (error) {
      console.error('Error creating communal expense:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in createCommunalExpense:', error);
    throw error;
  }
};

export const updateCommunalExpense = async (id: string, updates: Partial<CommunalExpense>): Promise<CommunalExpense> => {
  try {
    const { data, error } = await supabase
      .from('communal_expenses_new')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating communal expense:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in updateCommunalExpense:', error);
    throw error;
  }
};

export const deleteCommunalExpense = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('communal_expenses_new')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting communal expense:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in deleteCommunalExpense:', error);
    throw error;
  }
};

// Address Settings API
export const getAddressSettings = async (addressId: string): Promise<AddressSettings | null> => {
  try {
    const { data, error } = await supabase
      .from('address_settings')
      .select('id, address_id, building_info, contact_info, financial_settings, notification_settings, communal_config, created_at, updated_at')
      .eq('address_id', addressId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No settings found, return null
        return null;
      }
      console.error('Error fetching address settings:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in getAddressSettings:', error);
    throw error;
  }
};

export const createAddressSettings = async (settings: {
  address_id: string;
  building_info: any;
  contact_info: any;
  financial_settings: any;
  notification_settings: any;
  communal_config?: any;
}): Promise<AddressSettings> => {
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 createAddressSettings called with:', settings);
    }
    
    const { data, error } = await supabase
      .from('address_settings')
      .insert([settings])
      .select('id, address_id, building_info, contact_info, financial_settings, notification_settings, communal_config, created_at, updated_at')
      .single();

    if (error) {
      console.error('❌ Error creating address settings:', error);
      throw error;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Address settings created successfully:', data);
    }

    return data;
  } catch (error) {
    console.error('❌ Error in createAddressSettings:', error);
    throw error;
  }
};

export const updateAddressSettings = async (id: string, updates: Partial<AddressSettings>): Promise<AddressSettings> => {
  try {
    const { data, error } = await supabase
      .from('address_settings')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, address_id, building_info, contact_info, financial_settings, notification_settings, communal_config, created_at, updated_at')
      .single();

    if (error) {
      console.error('Error updating address settings:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in updateAddressSettings:', error);
    throw error;
  }
};

export const upsertAddressSettings = async (settings: Omit<AddressSettings, 'id' | 'created_at' | 'updated_at'>): Promise<AddressSettings> => {
  try {
    // Try to get existing settings
    const existing = await getAddressSettings(settings.address_id);
    
    if (existing) {
      // Update existing settings
      return await updateAddressSettings(existing.id, settings);
    } else {
      // Create new settings
      return await createAddressSettings(settings);
    }
  } catch (error) {
    console.error('Error in upsertAddressSettings:', error);
    throw error;
  }
};

export const deleteAddressSettings = async (addressId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('address_settings')
      .delete()
      .eq('address_id', addressId);

    if (error) {
      console.error('Error deleting address settings:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in deleteAddressSettings:', error);
    throw error;
  }
};

// Utility function to get address ID by address string
export const getAddressIdByAddress = async (address: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('addresses')
      .select('id')
      .eq('full_address', address)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error fetching address ID:', error);
      throw error;
    }

    return data?.id || null;
  } catch (error) {
    console.error('Error in getAddressIdByAddress:', error);
    throw error;
  }
};
