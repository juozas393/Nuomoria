import { supabase } from './supabase'
import type { Database } from './supabase'
import { validateMoveOutDate } from '../utils/notificationSystem'

type Property = Database['public']['Tables']['properties']['Row']
type PropertyInsert = Database['public']['Tables']['properties']['Insert']
type PropertyUpdate = Database['public']['Tables']['properties']['Update']

type MeterReading = Database['public']['Tables']['meter_readings']['Row']
type MeterReadingInsert = Database['public']['Tables']['meter_readings']['Insert']

type Tenant = Database['public']['Tables']['tenants']['Row']
type TenantInsert = Database['public']['Tables']['tenants']['Insert']

// Properties API
export const propertiesApi = {
  // Get all properties
  async getAll() {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .order('apartment_number')
    
    if (error) throw error
    return data
  },

  // Get property by ID
  async getById(id: string) {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  },

  // Create new property
  async create(property: PropertyInsert) {
    const { data, error } = await supabase
      .from('properties')
      .insert(property)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Update property
  async update(id: string, updates: PropertyUpdate) {
    // Validate move-out date if it's being updated
    if (updates.planned_move_out_date) {
      // Get current property data to check contract_end
      const { data: currentProperty, error: fetchError } = await supabase
        .from('properties')
        .select('contract_end')
        .eq('id', id)
        .single()
      
      if (fetchError) throw fetchError
      
      const validation = validateMoveOutDate(updates.planned_move_out_date, currentProperty.contract_end)
      
      if (!validation.isValid) {
        throw new Error(validation.error || 'Invalid move-out date')
      }
    }

    const { data, error } = await supabase
      .from('properties')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Delete property
  async delete(id: string) {
    const { error } = await supabase
      .from('properties')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  // Get properties with meter readings
  async getWithMeterReadings() {
    const { data, error } = await supabase
      .from('properties')
      .select(`
        *,
        meter_readings (*)
      `)
      .order('apartment_number')
    
    if (error) throw error
    return data
  },

  deleteWhereIdStartsWith: async (prefix: string) => {
    const { error } = await supabase
      .from('properties')
      .delete()
      .ilike('id', `${prefix}%`);
    return { error };
  }
}

// Meter Readings API
export const meterReadingsApi = {
  // Get meter readings for property
  async getByPropertyId(propertyId: string) {
    const { data, error } = await supabase
      .from('meter_readings')
      .select('*')
      .eq('property_id', propertyId)
      .order('reading_date', { ascending: false })
    
    if (error) throw error
    return data
  },

  // Create meter reading
  async create(reading: MeterReadingInsert) {
    const { data, error } = await supabase
      .from('meter_readings')
      .insert(reading)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Update meter reading
  async update(id: string, updates: Partial<MeterReading>) {
    const { data, error } = await supabase
      .from('meter_readings')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Delete meter reading
  async delete(id: string) {
    const { error } = await supabase
      .from('meter_readings')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  // Get latest readings for all properties
  async getLatestReadings() {
    const { data, error } = await supabase
      .from('meter_readings')
      .select('*')
      .order('reading_date', { ascending: false })
      .limit(100)
    
    if (error) throw error
    return data
  }
}

// Property Meter Configs API
export const propertyMeterConfigsApi = {
  // Get all meter configs for a property
  async getByPropertyId(propertyId: string) {
    const { data, error } = await supabase
      .from('property_meter_configs')
      .select('*')
      .eq('property_id', propertyId)
      .order('created_at')
    
    if (error) throw error
    return data
  },

  // Get only meter configs that require photos for a property
  async getPhotoRequiredByPropertyId(propertyId: string) {
    const { data, error } = await supabase
      .from('property_meter_configs')
      .select('*')
      .eq('property_id', propertyId)
      .eq('status', 'active')
      .eq('require_photo', true)
      .order('created_at')
    
    if (error) throw error
    return data
  },

  // Get inherited meters (from address defaults)
  async getInheritedMeters(propertyId: string) {
    const { data, error } = await supabase
      .from('property_meter_configs')
      .select('*')
      .eq('property_id', propertyId)
      .eq('is_inherited', true)
      .order('created_at')
    
    if (error) throw error
    return data
  },

  // Get custom meters (specific to this apartment)
  async getCustomMeters(propertyId: string) {
    const { data, error } = await supabase
      .from('property_meter_configs')
      .select('*')
      .eq('property_id', propertyId)
      .eq('is_inherited', false)
      .order('created_at')
    
    if (error) throw error
    return data
  },

  // Create meter config
  async create(config: Database['public']['Tables']['property_meter_configs']['Insert']) {
    const { data, error } = await supabase
      .from('property_meter_configs')
      .insert(config)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Update meter config
  async update(id: string, updates: Partial<Database['public']['Tables']['property_meter_configs']['Row']>) {
    const { data, error } = await supabase
      .from('property_meter_configs')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Delete meter config
  async delete(id: string) {
    const { error } = await supabase
      .from('property_meter_configs')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  // Create multiple meter configs for a property
  async createMultiple(propertyId: string, configs: Omit<Database['public']['Tables']['property_meter_configs']['Insert'], 'property_id'>[]) {
    const configsWithPropertyId = configs.map(config => ({
      ...config,
      property_id: propertyId
    }));

    const { data, error } = await supabase
      .from('property_meter_configs')
      .insert(configsWithPropertyId)
      .select()
    
    if (error) throw error
    return data
  },

  // Convert inherited meter to custom (allows editing)
  async convertToCustom(meterId: string) {
    const { data, error } = await supabase
      .from('property_meter_configs')
      .update({ 
        is_inherited: false, 
        inherited_from_address_id: null 
      })
      .eq('id', meterId)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Reset meter to inherited values (from address defaults)
  async resetToInherited(meterId: string, addressId: string) {
    // Get the original address meter values
    const { data: addressMeter, error: addressError } = await supabase
      .from('address_meters')
      .select('*')
      .eq('address_id', addressId)
      .single()
    
    if (addressError) throw addressError

    // Update the property meter with inherited values
    const { data, error } = await supabase
      .from('property_meter_configs')
      .update({
        is_inherited: true,
        inherited_from_address_id: addressId,
        price_per_unit: addressMeter.price_per_unit,
        fixed_price: addressMeter.fixed_price,
        unit: addressMeter.unit,
        require_photo: addressMeter.type = 'individual'
      })
      .eq('id', meterId)
      .select()
      .single()
    
    if (error) throw error
    return data
  }
}

// Tenants API
export const tenantsApi = {
  // Get all tenants
  async getAll() {
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .order('name')
    
    if (error) throw error
    return data
  },

  // Get tenant by ID
  async getById(id: string) {
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  },

  // Create tenant
  async create(tenant: TenantInsert) {
    const { data, error } = await supabase
      .from('tenants')
      .insert(tenant)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Update tenant
  async update(id: string, updates: Partial<Tenant>) {
    const { data, error } = await supabase
      .from('tenants')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Delete tenant
  async delete(id: string) {
    const { error } = await supabase
      .from('tenants')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }
}

// Analytics API
export const analyticsApi = {
  // Get total rent income
  async getTotalRent() {
    const { data, error } = await supabase
      .from('properties')
      .select('rent')
    
    if (error) throw error
    return data?.reduce((sum: number, property: { rent: number | null }) => sum + (property.rent || 0), 0) || 0
  },

  // Get occupancy rate
  async getOccupancyRate() {
    const { data, error } = await supabase
      .from('properties')
      .select('status')
    
    if (error) throw error
    
    const total = data?.length || 0
    const occupied = data?.filter((p: { status: string }) => p.status === 'occupied').length || 0
    
    return total > 0 ? (occupied / total) * 100 : 0
  },

  // Get monthly expenses
  async getMonthlyExpenses() {
    const { data, error } = await supabase
      .from('meter_readings')
      .select('total_sum')
      .gte('reading_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
    
    if (error) throw error
    return data?.reduce((sum: number, reading: { total_sum: number | null }) => sum + (reading.total_sum || 0), 0) || 0
  }
} 