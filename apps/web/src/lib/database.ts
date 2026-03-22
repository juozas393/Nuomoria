import { supabase } from './supabase';
import { logAuditEvent } from './auditLogApi';

// Types
export interface Address {
  id: string;
  full_address: string;
  street?: string;
  house_number?: string;
  city: string;
  postal_code?: string;
  coordinates_lat?: number;
  coordinates_lng?: number;
  building_type: string;
  total_apartments?: number;
  floors: number;
  year_built?: number;
  management_type: string;
  chairman_name?: string;
  chairman_phone?: string;
  chairman_email?: string;
  company_name?: string;
  contact_person?: string;
  company_phone?: string;
  company_email?: string;
  created_at: string;
  updated_at: string;
}

export interface Property {
  id: string;
  address_id: string;
  apartment_number: string;
  tenant_name: string;
  phone?: string;
  email?: string;
  rent: number;
  area?: number;
  rooms?: number;
  status: 'occupied' | 'vacant' | 'maintenance' | 'reserved';
  under_maintenance: boolean;
  contract_start: string;
  contract_end: string;
  tenant_response?: 'wants_to_renew' | 'does_not_want_to_renew' | 'no_response';
  tenant_response_date?: string;
  planned_move_out_date?: string;
  move_out_notice_date?: string;
  deposit_amount: number;
  deposit_paid_amount: number;
  deposit_paid: boolean;
  deposit_returned: boolean;
  deposit_deductions: number;
  bedding_owner?: 'tenant' | 'landlord';
  bedding_fee_paid: boolean;
  cleaning_required: boolean;
  cleaning_cost: number;
  last_notification_sent?: string;
  notification_count: number;
  original_contract_duration_months: number;
  auto_renewal_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface PropertyWithAddress extends Property {
  address: Address;
}

export interface MeterConfig {
  id: string;
  property_id: string;
  meter_type: 'electricity' | 'water_cold' | 'water_hot' | 'gas' | 'heating' | 'internet' | 'garbage' | 'custom';
  custom_name?: string;
  unit: 'm3' | 'kWh' | 'GJ' | 'MB' | 'fixed';
  tariff: 'single' | 'day_night' | 'peak_offpeak';
  price_per_unit: number;
  fixed_price?: number;
  initial_reading?: number;
  initial_date?: string;
  require_photo: boolean;
  require_serial: boolean;
  serial_number?: string;
  provider?: string;
  status: 'active' | 'inactive' | 'maintenance';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface MeterReading {
  id: string;
  property_id: string;
  meter_id: string | null;
  meter_type: 'address' | 'apartment';
  type: 'electricity' | 'water' | 'heating' | 'internet' | 'garbage' | 'gas';
  reading_date: string;
  previous_reading: number | null;
  current_reading: number;
  consumption: number;
  price_per_unit: number;
  total_sum: number | null;
  amount: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Legacy fields for backward compatibility
  meter_config_id?: string;
  difference?: number;
  submission_date?: string;
  status?: 'pending' | 'submitted' | 'approved' | 'rejected' | 'overdue';
  photos?: string[];
  approved_by?: string;
  approved_at?: string;
}

export interface Invoice {
  id: string;
  property_id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  amount: number;
  rent_amount: number;
  utilities_amount: number;
  other_amount: number;
  status: 'paid' | 'unpaid' | 'overdue' | 'cancelled';
  paid_date?: string;
  payment_method?: 'cash' | 'bank_transfer' | 'card' | 'check';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Tenant {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}

// Helper function to resolve allowed address IDs based on user role
async function getAllowedAddressIds(userId: string, role?: string): Promise<string[]> {
  if (role === 'property_manager') {
    const { data: assignments } = await supabase
      .from('agent_assignments')
      .select('landlord_id, address_id')
      .eq('agent_id', userId)
      .eq('status', 'active');
    
    if (!assignments || assignments.length === 0) return [];
    
    const globalLandlords = assignments.filter(a => !a.address_id).map(a => a.landlord_id);
    const specificIds = assignments.filter(a => a.address_id).map(a => a.address_id as string);
    
    let globalIds: string[] = [];
    if (globalLandlords.length > 0) {
      const { data } = await supabase
        .from('user_addresses')
        .select('address_id')
        .in('user_id', globalLandlords)
        .in('role_at_address', ['owner', 'landlord']);
      if (data) globalIds = data.map(d => d.address_id);
    }
    
    return [...new Set([...specificIds, ...globalIds])];
  } else {
    // Normal user (landlord or tenant)
    const { data, error } = await supabase
      .from('user_addresses')
      .select('address_id')
      .eq('user_id', userId);
    
    if (error || !data) return [];
    return data.map(d => d.address_id);
  }
}

// Helper: get specific property IDs for agents with apartment-level assignments
// Returns null if agent has full access (global or all-at-address), 
// or a Set of property IDs if they have specific apartment assignments
async function getAgentPropertyFilter(userId: string, role?: string): Promise<Set<string> | null> {
  if (role !== 'property_manager') return null;
  
  const { data: assignments } = await supabase
    .from('agent_assignments')
    .select('address_id, property_id')
    .eq('agent_id', userId)
    .eq('status', 'active');
  
  if (!assignments || assignments.length === 0) return new Set();
  
  // If any assignment is global (no address & no property), return null = full access
  if (assignments.some(a => !a.address_id && !a.property_id)) return null;
  
  // Collect specific property IDs and addresses with full access
  const specificPropertyIds = new Set<string>();
  const fullAddressIds = new Set<string>();
  
  for (const a of assignments) {
    if (a.address_id && !a.property_id) {
      // Full access to this address — don't filter its properties
      fullAddressIds.add(a.address_id);
    } else if (a.property_id) {
      specificPropertyIds.add(a.property_id);
    }
  }
  
  // If there are any full-address assignments, we can't just use property IDs
  // Return null to skip filtering — RLS will handle the rest
  if (fullAddressIds.size > 0 && specificPropertyIds.size === 0) return null;
  
  // Mixed: some addresses fully, some specific properties
  // For full addresses, we need to NOT filter those properties
  // We return the specific IDs + a marker for full addresses
  if (fullAddressIds.size > 0) return null; // Let RLS handle mixed scenarios
  
  return specificPropertyIds;
}

// Address API
export const addressApi = {
  // Get all addresses (with optional user filtering) - OPTIMIZED
  async getAll(userId?: string, role?: string): Promise<Address[]> {
    // Optimized query with resolved address boundaries
    if (userId) {
      const addressIds = await getAllowedAddressIds(userId, role);
      if (addressIds.length === 0) return [];

      const selectStr = role === 'property_manager' 
        ? '*, address_settings(*), user_addresses!inner(role, users:user_id(first_name, last_name, email))' 
        : '*, address_settings(*)';

      let query = supabase
        .from('addresses')
        .select(selectStr as any)
        .in('id', addressIds)
        .order('created_at', { ascending: false });
        
      if (role === 'property_manager') {
        query = query.in('user_addresses.role', ['owner', 'landlord']);
      }

      const { data, error } = await query;

      if (error) {
        return [];
      }
      return (data as unknown) as Address[];
    }

    // No user filtering - get all addresses
    const { data, error } = await supabase
      .from('addresses')
      .select('*, address_settings(*)')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return (data as unknown) as Address[];
  },

  // Get addresses for specific user
  async getByUserId(userId: string): Promise<Address[]> {
    const { data, error } = await supabase
      .from('addresses')
      .select(`
        *,
        user_addresses!inner(
          user_id,
          role
        ),
        address_settings(*)
      `)
      .eq('user_addresses.user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get address by ID
  async getById(id: string): Promise<Address | null> {
    const { data, error } = await supabase
      .from('addresses')
      .select('*, address_settings(*)')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  // Create new address
  async create(address: Omit<Address, 'id' | 'created_at' | 'updated_at'>): Promise<Address> {
    const { data, error } = await supabase
      .from('addresses')
      .insert([address])
      .select()
      .single();

    if (error) throw error;
    logAuditEvent(data.id, 'addresses', 'INSERT', `Sukurtas naujas adresas: ${address.full_address}`, { full_address: address.full_address, city: address.city }).catch(() => {});
    return data;
  },

  // Update address
  async update(id: string, updates: Partial<Address>): Promise<Address> {
    const { data, error } = await supabase
      .from('addresses')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    logAuditEvent(id, 'addresses', 'UPDATE', 'Atnaujintas adresas', updates, null, Object.keys(updates)).catch(() => {});
    return data;
  },

  // Delete address
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('addresses')
      .delete()
      .eq('id', id);

    if (error) throw error;
    logAuditEvent(id, 'addresses', 'DELETE', 'Ištrintas adresas').catch(() => {});
  },

  // Check for duplicate addresses (safe against injection)
  async checkDuplicate(fullAddress: string, excludeId?: string): Promise<Pick<Address, 'id' | 'full_address' | 'city' | 'created_at'>[]> {
    // Use separate safe queries instead of string interpolation in .or()
    let query = supabase
      .from('addresses')
      .select('id, full_address, city, created_at')
      .ilike('full_address', `%${fullAddress.replace(/%/g, '')}%`);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  // Clean up duplicate addresses (keep the oldest one)
  async cleanupDuplicates(): Promise<void> {
    const { data: addresses, error } = await supabase
      .from('addresses')
      .select('id, full_address, created_at')
      .order('created_at', { ascending: true });

    if (error) throw error;

    const duplicates = new Map<string, Address[]>();

    // Group addresses by full_address
    addresses?.forEach(address => {
      const key = address.full_address.toLowerCase().trim();
      if (!duplicates.has(key)) {
        duplicates.set(key, []);
      }
      duplicates.get(key)!.push(address as Address);
    });

    // Delete duplicates (keep the oldest one) — properly awaited
    for (const [, addressList] of duplicates) {
      if (addressList.length > 1) {
        const toDelete = addressList.slice(1);
        const idsToDelete = toDelete.map(a => a.id);
        const { error: delErr } = await supabase
          .from('addresses')
          .delete()
          .in('id', idsToDelete);
        if (delErr) throw delErr;
      }
    }
  }
};

// Property API
export const propertyApi = {
  // Get all properties with address information (with optional user filtering) - OPTIMIZED
  async getAll(userId?: string): Promise<PropertyWithAddress[]> {
    // Optimized query with single join instead of two separate queries
    if (userId) {
      // First, get user's address IDs
      const { data: userAddresses, error: userAddressError } = await supabase
        .from('user_addresses')
        .select('address_id')
        .eq('user_id', userId);

      if (userAddressError) {
        // Security: Don't log sensitive database errors in production
        if (import.meta.env.DEV) {
          console.error('Error fetching user addresses:', userAddressError);
        }
        return [];
      }

      if (!userAddresses || userAddresses.length === 0) {
        return [];
      }

      const addressIds = userAddresses.map(ua => ua.address_id);

      // Then get properties for those addresses
      const { data, error } = await supabase
        .from('properties')
        .select(`
          *,
          address:addresses(
            id,
            full_address,
            building_type,
            total_apartments,
            floors,
            year_built,
            management_type,
            chairman_name,
            chairman_phone,
            chairman_email,
            company_name,
            contact_person,
            company_phone,
            company_email,
            address_settings(*)
          )
        `)
        .in('address_id', addressIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    }

    // No user filtering - get all properties
    const { data, error } = await supabase
      .from('properties')
      .select(`
        *,
        address:addresses(
          id,
          full_address,
          building_type,
          total_apartments,
          floors,
          year_built,
          management_type,
          chairman_name,
          chairman_phone,
          chairman_email,
          company_name,
          contact_person,
          company_phone,
          company_email
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get properties with enhanced meter data - OPTIMIZED
  async getAllWithEnhancedMeters(userId?: string, role?: string): Promise<PropertyWithAddress[]> {
    // Optimized query with single join and selective field loading
    if (userId) {
      const addressIds = await getAllowedAddressIds(userId, role);
      
      if (addressIds.length === 0) {
        return [];
      }

      // Then get properties for those addresses with safe query
      const selectStr = role === 'property_manager'
        ? `
          *,
          address:addresses(
            id,
            full_address,
            building_type,
            total_apartments,
            floors,
            year_built,
            management_type,
            chairman_name,
            chairman_phone,
            chairman_email,
            company_name,
            contact_person,
            company_phone,
            company_email,
            user_addresses!inner(role, users:user_id(first_name, last_name, email))
          )
        ` : `
          *,
          address:addresses(
            id,
            full_address,
            building_type,
            total_apartments,
            floors,
            year_built,
            management_type,
            chairman_name,
            chairman_phone,
            chairman_email,
            company_name,
            contact_person,
            company_phone,
            company_email
          )
        `;

      let query = supabase
        .from('properties')
        .select(selectStr as any)
        .in('address_id', addressIds)
        .order('created_at', { ascending: false });

      if (role === 'property_manager') {
        query = query.in('address.user_addresses.role', ['owner', 'landlord']);
      }

      // Get agent property filter for apartment-level assignments
      const propertyFilter = await getAgentPropertyFilter(userId, role);

      const { data, error } = await query;

      if (error) {
        // Security: Don't log sensitive database errors in production
        if (import.meta.env.DEV) {
          console.error('Error fetching properties with enhanced data:', error);
        }
        // Return basic properties without enhanced data
        const { data: basicData, error: basicError } = await supabase
          .from('properties')
          .select('*')
          .in('address_id', addressIds)
          .order('created_at', { ascending: false });

        if (basicError) {
          // Security: Don't log sensitive database errors in production
          if (import.meta.env.DEV) {
            console.error('Error fetching basic properties:', basicError);
          }
          return [];
        }
        let filteredBasic = (basicData as unknown) as PropertyWithAddress[];
        if (propertyFilter) {
          filteredBasic = filteredBasic.filter(p => propertyFilter.has(p.id));
        }
        return filteredBasic;
      }
      let result = (data as unknown) as PropertyWithAddress[];
      // Apply property-level filter for agents with specific apartment assignments
      if (propertyFilter) {
        result = result.filter(p => propertyFilter.has(p.id));
      }
      return result;
    }

    // No user filtering - get all properties with safe query
    const { data, error } = await supabase
      .from('properties')
      .select(`
        *,
        address:addresses(
          id,
          full_address,
          building_type,
          total_apartments,
          floors,
          year_built,
          management_type,
          chairman_name,
          chairman_phone,
          chairman_email,
          company_name,
          contact_person,
          company_phone,
          company_email,
          address_settings(*)
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      // Security: Don't log sensitive database errors in production
      if (import.meta.env.DEV) {
        console.error('Error fetching all properties with enhanced data:', error);
      }
      // Return basic properties without enhanced data
      const { data: basicData, error: basicError } = await supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false });

      if (basicError) {
        // Security: Don't log sensitive database errors in production
        if (import.meta.env.DEV) {
          console.error('Error fetching basic properties:', basicError);
        }
        return [];
      }
      return basicData || [];
    }
    return data || [];
  },

  // Get properties for specific user
  async getByUserId(userId: string): Promise<PropertyWithAddress[]> {
    const { data, error } = await supabase
      .from('properties')
      .select(`
        *,
        address:addresses!inner(
          *,
          user_addresses!inner(
            user_id,
            role
          ),
          address_settings(*)
        )
      `)
      .eq('address.user_addresses.user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get properties by address ID
  async getByAddressId(addressId: string): Promise<Property[]> {
    const { data, error } = await supabase
      .from('properties')
      .select('*, address:addresses(address_settings(*))')
      .eq('address_id', addressId)
      .order('apartment_number');

    if (error) throw error;
    return data || [];
  },

  // Get property by ID with address
  async getById(id: string): Promise<PropertyWithAddress | null> {
    const { data, error } = await supabase
      .from('properties')
      .select(`
        *,
        address:addresses(
          *,
          address_meters(*),
          communal_meters(*),
          address_settings(*)
        ),
        apartment_meters(*),
        meter_readings(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  // Create new property
  async create(property: Omit<Property, 'id' | 'created_at' | 'updated_at'>): Promise<Property> {
    const { data, error } = await supabase
      .from('properties')
      .insert([property])
      .select()
      .single();

    if (error) throw error;
    logAuditEvent(data.id, 'properties', 'INSERT', `Sukurtas naujas būstas: ${(property as any).apartment_number || data.id}`, { apartment_number: (property as any).apartment_number, rooms: (property as any).rooms, area: (property as any).area }).catch(() => {});
    return data;
  },

  // Update property
  async update(id: string, updates: Partial<Property>): Promise<Property> {
    const { data, error } = await supabase
      .from('properties')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    logAuditEvent(id, 'properties', 'UPDATE', 'Atnaujintas būstas', updates, null, Object.keys(updates)).catch(() => {});
    return data;
  },

  // Delete property
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('properties')
      .delete()
      .eq('id', id);

    if (error) throw error;
    logAuditEvent(id, 'properties', 'DELETE', 'Ištrintas būstas').catch(() => {});
  },

  // Get properties by status
  async getByStatus(status: Property['status']): Promise<PropertyWithAddress[]> {
    const { data, error } = await supabase
      .from('properties')
      .select(`
        *,
        address:addresses(*)
      `)
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get properties with expiring contracts
  async getExpiringContracts(days: number = 30): Promise<PropertyWithAddress[]> {
    const { data, error } = await supabase
      .from('properties')
      .select(`
        *,
        address:addresses(*)
      `)
      .gte('contract_end', new Date().toISOString().split('T')[0])
      .lte('contract_end', new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('contract_end');

    if (error) throw error;
    return data || [];
  }
};

// Meter Config API
export const meterConfigApi = {
  // Get meter configs by property ID
  async getByPropertyId(propertyId: string): Promise<MeterConfig[]> {
    const { data, error } = await supabase
      .from('property_meter_configs')
      .select('*')
      .eq('property_id', propertyId)
      .eq('status', 'active')
      .order('created_at');

    if (error) throw error;
    return data || [];
  },

  // Create meter config
  async create(config: Omit<MeterConfig, 'id' | 'created_at' | 'updated_at'>): Promise<MeterConfig> {
    const { data, error } = await supabase
      .from('property_meter_configs')
      .insert([config])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update meter config
  async update(id: string, updates: Partial<MeterConfig>): Promise<MeterConfig> {
    const { data, error } = await supabase
      .from('property_meter_configs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete meter config
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('property_meter_configs')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};

// Meter Reading API
export const meterReadingApi = {
  // Get readings by property ID
  async getByPropertyId(propertyId: string): Promise<MeterReading[]> {
    const { data, error } = await supabase
      .from('meter_readings')
      .select('*')
      .eq('property_id', propertyId)
      .order('reading_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get readings by meter config ID
  async getByMeterConfigId(meterConfigId: string): Promise<MeterReading[]> {
    const { data, error } = await supabase
      .from('meter_readings')
      .select('*')
      .eq('meter_config_id', meterConfigId)
      .order('reading_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Create meter reading
  async create(reading: Omit<MeterReading, 'id' | 'created_at' | 'updated_at'>): Promise<MeterReading> {
    const { data, error } = await supabase
      .from('meter_readings')
      .insert([reading])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update meter reading
  async update(id: string, updates: Partial<MeterReading>): Promise<MeterReading> {
    const { data, error } = await supabase
      .from('meter_readings')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete meter reading
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('meter_readings')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Delete meter readings by property ID
  async deleteByPropertyId(propertyId: string): Promise<void> {
    const { error } = await supabase
      .from('meter_readings')
      .delete()
      .eq('property_id', propertyId);

    if (error) throw error;
  }
};

// Invoice API
export const invoiceApi = {
  // Get invoices by property ID
  async getByPropertyId(propertyId: string): Promise<Invoice[]> {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('property_id', propertyId)
      .order('invoice_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get overdue invoices
  async getOverdue(): Promise<Invoice[]> {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('status', 'unpaid')
      .lt('due_date', new Date().toISOString().split('T')[0])
      .order('due_date');

    if (error) throw error;
    return data || [];
  },

  // Create invoice
  async create(invoice: Omit<Invoice, 'id' | 'created_at' | 'updated_at'>): Promise<Invoice> {
    const { data, error } = await supabase
      .from('invoices')
      .insert([invoice])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update invoice
  async update(id: string, updates: Partial<Invoice>): Promise<Invoice> {
    const { data, error } = await supabase
      .from('invoices')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Mark invoice as paid
  async markAsPaid(id: string, paymentMethod: Invoice['payment_method']): Promise<Invoice> {
    const { data, error } = await supabase
      .from('invoices')
      .update({
        status: 'paid',
        paid_date: new Date().toISOString().split('T')[0],
        payment_method: paymentMethod
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

// Tenant API
export const tenantApi = {
  // Get all tenants
  async getAll(): Promise<Tenant[]> {
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .order('name');

    if (error) throw error;
    return data || [];
  },

  // Create tenant
  async create(tenant: Omit<Tenant, 'id' | 'created_at' | 'updated_at'>): Promise<Tenant> {
    const { data, error } = await supabase
      .from('tenants')
      .insert([tenant])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update tenant
  async update(id: string, updates: Partial<Tenant>): Promise<Tenant> {
    const { data, error } = await supabase
      .from('tenants')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

// Utility functions
export const databaseUtils = {
  // Generate invoice number
  generateInvoiceNumber(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `INV-${year}${month}-${random}`;
  },

  // Calculate days until contract expiry
  getDaysUntilExpiry(contractEnd: string): number {
    const endDate = new Date(contractEnd);
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  },

  // Format currency
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('lt-LT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  },

  // Format date
  formatDate(date: string): string {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
};

// Communal Meters API
export interface CommunalMeter {
  id: string;
  address_id: string;
  name: string;
  type: string;
  unit: string;
  price_per_unit: number;
  fixed_price?: number;
  distribution_method?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface CommunalExpense {
  id: string;
  meter_id: string;
  month: string;
  amount: number;
  consumption?: number;
  notes?: string;
  created_at: string;
  updated_at?: string;
  communal_meters?: Pick<CommunalMeter, 'id' | 'name' | 'type' | 'unit' | 'price_per_unit' | 'fixed_price' | 'distribution_method'>;
}

export const communalMeterApi = {
  // Get all meters for an address
  async getByAddressId(addressId: string): Promise<CommunalMeter[]> {
    const { data, error } = await supabase
      .from('communal_meters')
      .select('*')
      .eq('address_id', addressId)
      .eq('is_active', true)
      .order('created_at');

    if (error) throw error;
    return data || [];
  },

  // Create new meter
  async create(meter: Omit<CommunalMeter, 'id' | 'created_at'>): Promise<CommunalMeter> {
    const { data, error } = await supabase
      .from('communal_meters')
      .insert([meter])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update meter
  async update(id: string, updates: Partial<Omit<CommunalMeter, 'id' | 'created_at'>>): Promise<CommunalMeter> {
    const { data, error } = await supabase
      .from('communal_meters')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete meter
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('communal_meters')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};

// Communal Expenses API
export const communalExpenseApi = {
  // Get all expenses for a meter
  async getByMeterId(meterId: string): Promise<CommunalExpense[]> {
    const { data, error } = await supabase
      .from('communal_expenses')
      .select('*')
      .eq('meter_id', meterId)
      .order('month', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get expenses by month
  async getByMonth(month: string): Promise<CommunalExpense[]> {
    const { data, error } = await supabase
      .from('communal_expenses')
      .select(`
        *,
        communal_meters (
          id,
          name,
          type,
          unit,
          price_per_unit,
          fixed_price,
          distribution_method
        )
      `)
      .eq('month', month)
      .order('created_at');

    if (error) throw error;
    return data || [];
  },

  // Create new expense
  async create(expense: Omit<CommunalExpense, 'id' | 'created_at' | 'communal_meters'>): Promise<CommunalExpense> {
    const { data, error } = await supabase
      .from('communal_expenses')
      .insert([expense])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update expense
  async update(id: string, updates: Partial<Omit<CommunalExpense, 'id' | 'created_at' | 'communal_meters'>>): Promise<CommunalExpense> {
    const { data, error } = await supabase
      .from('communal_expenses')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete expense
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('communal_expenses')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};

// Tenant Invitation Types
export interface TenantInvitation {
  id: string;
  property_id: string;
  email: string;
  full_name?: string;
  phone?: string;
  contract_start?: string;
  contract_end?: string;
  rent?: number;
  deposit?: number;
  status: 'pending' | 'accepted' | 'declined';
  token: string;
  invited_by?: string;
  invited_by_email?: string;
  property_label?: string;
  created_at: string;
  responded_at?: string;
  expires_at?: string;
}

// Tenant Invitation API
export const tenantInvitationApi = {
  // Create a new invitation (landlord)
  // Deletes any existing pending invitations for the same property first
  async create(invitation: {
    property_id: string;
    email: string;
    full_name?: string;
    phone?: string;
    contract_start?: string;
    contract_end?: string;
    rent?: number;
    deposit?: number;
    property_label?: string;
  }): Promise<TenantInvitation> {
    // Get current user info for invited_by fields
    const { data: userData } = await supabase.auth.getUser();

    // Delete any existing pending invitations for this property (only one code per apartment)
    await supabase
      .from('tenant_invitations')
      .delete()
      .eq('property_id', invitation.property_id)
      .eq('status', 'pending');

    // Calculate expiry (1 day from now)
    const expiresAt = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString();

    // Auto-set 1-year contract from today if not explicitly provided
    const today = new Date();
    const oneYearLater = new Date(today);
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
    const contractStart = invitation.contract_start || today.toISOString().substring(0, 10);
    const contractEnd = invitation.contract_end || oneYearLater.toISOString().substring(0, 10);

    const { data, error } = await supabase
      .from('tenant_invitations')
      .insert([{
        ...invitation,
        invited_by: userData?.user?.id,
        invited_by_email: userData?.user?.email,
        status: 'pending',
        expires_at: expiresAt,
        contract_start: contractStart,
        contract_end: contractEnd
      }])
      .select()
      .single();

    if (error) throw error;
    logAuditEvent(invitation.property_id, 'tenant_invitations', 'INSERT', `Nuomininko pakvietimas išsiųstas: ${invitation.email}`, { email: invitation.email, full_name: invitation.full_name, rent: invitation.rent, deposit: invitation.deposit, contract_start: contractStart, contract_end: contractEnd }).catch(() => {});
    return data;
  },

  // Get invitations for a specific property (landlord view)
  async getByPropertyId(propertyId: string): Promise<TenantInvitation[]> {
    const { data, error } = await supabase
      .from('tenant_invitations')
      .select('*')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get pending invitations for current user (tenant view) — excludes expired
  async getMyPendingInvitations(): Promise<TenantInvitation[]> {
    const { data: userData } = await supabase.auth.getUser();
    const userEmail = userData?.user?.email;

    if (!userEmail) return [];

    const { data, error } = await supabase
      .from('tenant_invitations')
      .select('*')
      .eq('status', 'pending')
      .ilike('email', userEmail)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Accept invitation (tenant)
  // Note: DB trigger `handle_invitation_accepted` auto-updates property status
  async accept(invitationId: string): Promise<TenantInvitation> {
    const { data, error } = await supabase
      .from('tenant_invitations')
      .update({
        status: 'accepted',
        responded_at: new Date().toISOString()
      })
      .eq('id', invitationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Decline invitation (tenant)
  async decline(invitationId: string): Promise<TenantInvitation> {
    const { data, error } = await supabase
      .from('tenant_invitations')
      .update({
        status: 'declined',
        responded_at: new Date().toISOString()
      })
      .eq('id', invitationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Cancel/delete invitation (landlord)
  async cancel(invitationId: string): Promise<void> {
    const { error } = await supabase
      .from('tenant_invitations')
      .delete()
      .eq('id', invitationId);

    if (error) throw error;
  },

  // Join by code (tenant) - find invitation by token prefix and accept it
  async joinByCode(code: string): Promise<TenantInvitation> {
    // Clean and normalize the code (remove dashes, lowercase)
    const cleanCode = code.replace(/-/g, '').toLowerCase();

    if (cleanCode.length < 8) {
      throw new Error('Neteisingas kvietimo kodas');
    }

    // Get current user info
    const { data: userData } = await supabase.auth.getUser();
    const userEmail = userData?.user?.email;
    const userName = userData?.user?.user_metadata?.full_name ||
      userData?.user?.user_metadata?.name ||
      userEmail?.split('@')[0];

    if (!userEmail) {
      throw new Error('Turite būti prisijungęs');
    }

    // Search for invitation where token starts with the code
    const { data: invitations, error: searchError } = await supabase
      .from('tenant_invitations')
      .select('*')
      .eq('status', 'pending')
      .ilike('token', `${cleanCode}%`);

    if (searchError) throw searchError;

    if (!invitations || invitations.length === 0) {
      throw new Error('Kvietimas nerastas arba jau panaudotas');
    }

    // Check if invitation has expired
    const invitation = invitations[0];
    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      throw new Error('Kvietimo kodas nebegalioja. Paprašykite nuomotojo sugeneruoti naują.');
    }

    // Accept the invitation and update with tenant's real email
    const { data, error } = await supabase
      .from('tenant_invitations')
      .update({
        status: 'accepted',
        email: userEmail, // Update with actual tenant email
        full_name: userName,
        responded_at: new Date().toISOString()
      })
      .eq('id', invitation.id)
      .select()
      .single();

    if (error) throw error;

    // Note: DB trigger `handle_invitation_accepted` auto-updates property status
    return data;
  }
};

// Message Types
export interface Conversation {
  id: string;
  property_id?: string;
  participant_1: string;
  participant_2: string;
  created_at: string;
  updated_at: string;
  // Joined data
  other_user?: {
    id: string;
    email?: string;
    full_name?: string;
    avatar_url?: string;
  };
  last_message?: Message;
  unread_count?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'invitation_code' | 'system';
  metadata?: {
    invitation_id?: string;
    property_label?: string;
    code?: string;
  };
  is_read: boolean;
  created_at: string;
}

// Messages API
export const messagesApi = {
  // Get or create conversation between two users
  async getOrCreateConversation(otherUserId: string, propertyId?: string): Promise<Conversation> {
    const { data: userData } = await supabase.auth.getUser();
    const currentUserId = userData?.user?.id;

    if (!currentUserId) throw new Error('Turite būti prisijungęs');

    // Try to find existing conversation (check both orderings)
    const { data: existing } = await supabase
      .from('conversations')
      .select('*')
      .or(`and(participant_1.eq.${currentUserId},participant_2.eq.${otherUserId}),and(participant_1.eq.${otherUserId},participant_2.eq.${currentUserId})`)
      .single();

    if (existing) return existing;

    // Create new conversation
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        participant_1: currentUserId,
        participant_2: otherUserId,
        property_id: propertyId
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Get all conversations for current user — enriched with other user info
  async getMyConversations(): Promise<Conversation[]> {
    const { data: userData } = await supabase.auth.getUser();
    const currentUserId = userData?.user?.id;

    if (!currentUserId) return [];

    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .or(`participant_1.eq.${currentUserId},participant_2.eq.${currentUserId}`)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    if (!data?.length) return [];

    // Collect all "other" participant IDs
    const otherUserIds = data.map(c =>
      c.participant_1 === currentUserId ? c.participant_2 : c.participant_1
    );
    const uniqueIds = [...new Set(otherUserIds)];

    // Fetch user details — users table has first_name + last_name + avatar_url
    const { data: usersData } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, avatar_url')
      .in('id', uniqueIds);

    const usersMap = new Map(
      (usersData || []).map(u => [u.id, u])
    );

    // Fetch last message + unread count for each conversation
    const conversationIds = data.map(c => c.id);

    const { data: lastMessages } = await supabase
      .from('messages')
      .select('*')
      .in('conversation_id', conversationIds)
      .order('created_at', { ascending: false });

    // Group: last message per conversation
    const lastMsgMap = new Map<string, Message>();
    for (const msg of (lastMessages || [])) {
      if (!lastMsgMap.has(msg.conversation_id)) {
        lastMsgMap.set(msg.conversation_id, msg);
      }
    }

    // Unread counts per conversation
    const { data: unreadMsgs } = await supabase
      .from('messages')
      .select('conversation_id')
      .in('conversation_id', conversationIds)
      .neq('sender_id', currentUserId)
      .eq('is_read', false);

    const unreadMap = new Map<string, number>();
    for (const msg of (unreadMsgs || [])) {
      unreadMap.set(msg.conversation_id, (unreadMap.get(msg.conversation_id) || 0) + 1);
    }

    // Enrich conversations
    return data.map(conv => {
      const otherId = conv.participant_1 === currentUserId
        ? conv.participant_2
        : conv.participant_1;
      const user = usersMap.get(otherId);

      // Build full name from first_name + last_name
      const fullName = user
        ? [user.first_name, user.last_name].filter(Boolean).join(' ') || undefined
        : undefined;

      return {
        ...conv,
        other_user: user ? {
          id: user.id,
          email: user.email,
          full_name: fullName,
          avatar_url: user.avatar_url,
        } : undefined,
        last_message: lastMsgMap.get(conv.id),
        unread_count: unreadMap.get(conv.id) || 0,
      };
    });
  },

  // Get messages for a conversation
  async getMessages(conversationId: string, limit = 50): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  // Send a message
  async sendMessage(conversationId: string, content: string, messageType: 'text' | 'invitation_code' | 'system' = 'text', metadata?: any): Promise<Message> {
    const { data: userData } = await supabase.auth.getUser();
    const senderId = userData?.user?.id;

    if (!senderId) throw new Error('Turite būti prisijungęs');

    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content,
        message_type: messageType,
        metadata
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Send invitation code as message
  async sendInvitationCode(conversationId: string, invitationId: string, code: string, propertyLabel: string): Promise<Message> {
    return this.sendMessage(
      conversationId,
      `Kvietimo kodas: ${code}`,
      'invitation_code',
      { invitation_id: invitationId, code, property_label: propertyLabel }
    );
  },

  // Mark messages as read
  async markAsRead(conversationId: string): Promise<void> {
    const { data: userData } = await supabase.auth.getUser();
    const currentUserId = userData?.user?.id;

    if (!currentUserId) return;

    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', currentUserId)
      .eq('is_read', false);
  },

  // Get unread count
  async getUnreadCount(): Promise<number> {
    const { data: userData } = await supabase.auth.getUser();
    const currentUserId = userData?.user?.id;

    if (!currentUserId) return 0;

    // Get conversations where user is participant
    const { data: conversations } = await supabase
      .from('conversations')
      .select('id')
      .or(`participant_1.eq.${currentUserId},participant_2.eq.${currentUserId}`);

    if (!conversations?.length) return 0;

    const conversationIds = conversations.map(c => c.id);

    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .in('conversation_id', conversationIds)
      .neq('sender_id', currentUserId)
      .eq('is_read', false);

    if (error) return 0;
    return count || 0;
  },

  // Subscribe to new messages (realtime)
  subscribeToMessages(conversationId: string, callback: (message: Message) => void) {
    return supabase
      .channel(`messages:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload) => {
        callback(payload.new as Message);
      })
      .subscribe();
  },

  // Unsubscribe
  unsubscribe(channel: any) {
    supabase.removeChannel(channel);
  }
};
