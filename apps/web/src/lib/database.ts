import { supabase } from './supabase';

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
  status: 'occupied' | 'vacant' | 'maintenance';
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

// Address API
export const addressApi = {
  // Get all addresses (with optional user filtering) - OPTIMIZED
  async getAll(userId?: string): Promise<Address[]> {
    // Optimized query with single join instead of two separate queries
    if (userId) {
      const { data, error } = await supabase
        .from('addresses')
        .select(`
          *,
          user_addresses!inner(user_id)
        `)
        .eq('user_addresses.user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        return [];
      }
      return data || [];
    }

    // No user filtering - get all addresses
    const { data, error } = await supabase
      .from('addresses')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
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
        )
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
      .select('*')
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
    return data;
  },

  // Delete address
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('addresses')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Check for duplicate addresses
  async checkDuplicate(fullAddress: string, excludeId?: string): Promise<Address[]> {
    let query = supabase
      .from('addresses')
      .select('*')
      .or(`full_address.eq.${fullAddress},full_address.ilike.%${fullAddress}%,full_address.ilike.${fullAddress}%`);

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
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;

    const duplicates = new Map<string, Address[]>();

    // Group addresses by full_address
    addresses?.forEach(address => {
      const key = address.full_address.toLowerCase().trim();
      if (!duplicates.has(key)) {
        duplicates.set(key, []);
      }
      duplicates.get(key)!.push(address);
    });

    // Delete duplicates (keep the oldest one)
    duplicates.forEach((addressList, key) => {
      if (addressList.length > 1) {
        // Keep the first (oldest) one, delete the rest
        const toDelete = addressList.slice(1);
        toDelete.forEach(async (address) => {
          await supabase
            .from('addresses')
            .delete()
            .eq('id', address.id);
        });
      }
    });
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
        if (process.env.NODE_ENV === 'development') {
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
            company_email
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

  // Ensure apartment meters exist for all properties
  async ensureApartmentMeters(): Promise<void> {
    try {
      // Ensuring apartment meters exist for all properties - logging removed for production

      // For now, skip the automatic creation to avoid errors
      // The SQL script should be run manually in Supabase SQL editor
      // Skipping automatic apartment meters creation - logging removed for production

    } catch (error) {
      // Error in ensureApartmentMeters - logging removed for production
      // Don't throw error to prevent app from crashing
      // Continuing without apartment meters creation - logging removed for production
    }
  },

  // Get properties with enhanced meter data - OPTIMIZED
  async getAllWithEnhancedMeters(userId?: string): Promise<PropertyWithAddress[]> {
    // Optimized query with single join and selective field loading
    if (userId) {
      // First, get user's address IDs
      const { data: userAddresses, error: userAddressError } = await supabase
        .from('user_addresses')
        .select('address_id')
        .eq('user_id', userId);

      if (userAddressError) {
        // Security: Don't log sensitive database errors in production
        if (process.env.NODE_ENV === 'development') {
          console.error('Error fetching user addresses:', userAddressError);
        }
        return [];
      }

      if (!userAddresses || userAddresses.length === 0) {
        return [];
      }

      const addressIds = userAddresses.map(ua => ua.address_id);

      // Then get properties for those addresses with safe query
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
        .in('address_id', addressIds)
        .order('created_at', { ascending: false });

      if (error) {
        // Security: Don't log sensitive database errors in production
        if (process.env.NODE_ENV === 'development') {
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
          if (process.env.NODE_ENV === 'development') {
            console.error('Error fetching basic properties:', basicError);
          }
          return [];
        }
        return basicData || [];
      }
      return data || [];
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
          company_email
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      // Security: Don't log sensitive database errors in production
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching all properties with enhanced data:', error);
      }
      // Return basic properties without enhanced data
      const { data: basicData, error: basicError } = await supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false });

      if (basicError) {
        // Security: Don't log sensitive database errors in production
        if (process.env.NODE_ENV === 'development') {
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
          )
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
      .select('*')
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
    return data;
  },

  // Delete property
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('properties')
      .delete()
      .eq('id', id);

    if (error) throw error;
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
    return new Date(date).toLocaleDateString('lt-LT');
  }
};

// Communal Meters API
export const communalMeterApi = {
  // Get all meters for an address
  async getByAddressId(addressId: string): Promise<any[]> {
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
  async create(meter: any): Promise<any> {
    const { data, error } = await supabase
      .from('communal_meters')
      .insert([meter])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update meter
  async update(id: string, updates: any): Promise<any> {
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
  async getByMeterId(meterId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('communal_expenses')
      .select('*')
      .eq('meter_id', meterId)
      .order('month', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get expenses by month
  async getByMonth(month: string): Promise<any[]> {
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
  async create(expense: any): Promise<any> {
    const { data, error } = await supabase
      .from('communal_expenses')
      .insert([expense])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update expense
  async update(id: string, updates: any): Promise<any> {
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

    // Calculate expiry (12 hours from now)
    const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('tenant_invitations')
      .insert([{
        ...invitation,
        invited_by: userData?.user?.id,
        invited_by_email: userData?.user?.email,
        status: 'pending',
        expires_at: expiresAt
      }])
      .select()
      .single();

    if (error) throw error;
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

  // Get all conversations for current user
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
    return data || [];
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
