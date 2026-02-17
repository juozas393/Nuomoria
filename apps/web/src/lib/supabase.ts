import { createClient } from '@supabase/supabase-js';
import { supabase as supabaseConfig } from '../config/environment';

export const supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
  },
  global: {
    headers: { 'x-app-version': '1.0.0' },
  },
  db: {
    schema: 'public',
  },
  realtime: {
    params: {
      eventsPerSecond: 2,
    },
  },
});

// Security: Remove debug exposure in production
if (process.env.NODE_ENV === 'development') {
  // @ts-expect-error
  window.__supabase = supabase;
}

// Note: RLS is now handled by Supabase JWT + users table role
// No need for manual context setting

// Database types
export type Property = Database['public']['Tables']['properties']['Row'];
export type Database = {
  public: {
    Tables: {
      properties: {
        Row: {
          id: string
          address: string
          apartment_number: string
          tenant_name: string
          phone: string | null
          email: string | null
          rent: number
          area: number | null
          rooms: number | null
          status: 'occupied' | 'vacant' | 'maintenance'
          contract_start: string
          contract_end: string
          tenant_response: 'wants_to_renew' | 'does_not_want_to_renew' | 'no_response' | null
          tenant_response_date?: string | null
          planned_move_out_date: string | null
          move_out_notice_date?: string | null
          deposit_amount: number
          deposit_paid_amount: number
          deposit_paid: boolean
          deposit_returned: boolean
          deposit_deductions: number
          bedding_owner: 'tenant' | 'landlord' | null
          bedding_fee_paid: boolean
          cleaning_required: boolean
          cleaning_cost: number
          last_notification_sent: string | null
          notification_count: number
          original_contract_duration_months: number
          auto_renewal_enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          address: string
          apartment_number: string
          tenant_name: string
          phone?: string | null
          email?: string | null
          rent: number
          area?: number | null
          rooms?: number | null
          status?: 'occupied' | 'vacant' | 'maintenance'
          contract_start: string
          contract_end: string
          tenant_response?: 'wants_to_renew' | 'does_not_want_to_renew' | 'no_response' | null
          tenant_response_date?: string | null
          planned_move_out_date?: string | null
          move_out_notice_date?: string | null
          deposit_amount?: number
          deposit_paid_amount?: number
          deposit_paid?: boolean
          deposit_returned?: boolean
          deposit_deductions?: number
          bedding_owner?: 'tenant' | 'landlord' | null
          bedding_fee_paid?: boolean
          cleaning_required?: boolean
          cleaning_cost?: number
          last_notification_sent?: string | null
          notification_count?: number
          original_contract_duration_months?: number
          auto_renewal_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          address?: string
          apartment_number?: string
          tenant_name?: string
          phone?: string | null
          email?: string | null
          rent?: number
          area?: number | null
          rooms?: number | null
          status?: 'occupied' | 'vacant' | 'maintenance'
          contract_start?: string
          contract_end?: string
          tenant_response?: 'wants_to_renew' | 'does_not_want_to_renew' | 'no_response' | null
          tenant_response_date?: string | null
          planned_move_out_date?: string | null
          move_out_notice_date?: string | null
          deposit_amount?: number
          deposit_paid_amount?: number
          deposit_paid?: boolean
          deposit_returned?: boolean
          deposit_deductions?: number
          bedding_owner?: 'tenant' | 'landlord' | null
          bedding_fee_paid?: boolean
          cleaning_required?: boolean
          cleaning_cost?: number
          last_notification_sent?: string | null
          notification_count?: number
          original_contract_duration_months?: number
          auto_renewal_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      meter_readings: {
        Row: {
          id: string
          property_id: string
          meter_id: string | null
          meter_type: 'address' | 'apartment'
          type: 'electricity' | 'water' | 'heating' | 'internet' | 'garbage' | 'gas'
          reading_date: string
          previous_reading: number | null
          current_reading: number
          consumption: number
          price_per_unit: number
          total_sum: number | null
          amount: number | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          property_id: string
          meter_id?: string | null
          meter_type: 'address' | 'apartment'
          type: 'electricity' | 'water' | 'heating' | 'internet' | 'garbage' | 'gas'
          reading_date: string
          previous_reading?: number | null
          current_reading: number
          price_per_unit: number
          total_sum?: number | null
          amount?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          property_id?: string
          meter_id?: string | null
          meter_type?: 'address' | 'apartment'
          type?: 'electricity' | 'water' | 'heating' | 'internet' | 'garbage' | 'gas'
          reading_date?: string
          previous_reading?: number | null
          current_reading?: number
          price_per_unit?: number
          total_sum?: number | null
          amount?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      property_meter_configs: {
        Row: {
          id: string
          property_id: string
          meter_type: 'electricity' | 'water_cold' | 'water_hot' | 'gas' | 'heating' | 'internet' | 'garbage' | 'custom'
          custom_name: string | null
          unit: 'm3' | 'kWh' | 'GJ' | 'MB' | 'fixed'
          tariff: 'single' | 'day_night' | 'peak_offpeak'
          price_per_unit: number
          fixed_price: number | null
          initial_reading: number | null
          initial_date: string | null
          require_photo: boolean
          require_serial: boolean
          serial_number: string | null
          provider: string | null
          status: 'active' | 'inactive' | 'maintenance'
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          property_id: string
          meter_type: 'electricity' | 'water_cold' | 'water_hot' | 'gas' | 'heating' | 'internet' | 'garbage' | 'custom'
          custom_name?: string | null
          unit: 'm3' | 'kWh' | 'GJ' | 'MB' | 'fixed'
          tariff?: 'single' | 'day_night' | 'peak_offpeak'
          price_per_unit: number
          fixed_price?: number | null
          initial_reading?: number | null
          initial_date?: string | null
          require_photo?: boolean
          require_serial?: boolean
          serial_number?: string | null
          provider?: string | null
          status?: 'active' | 'inactive' | 'maintenance'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          property_id?: string
          meter_type?: 'electricity' | 'water_cold' | 'water_hot' | 'gas' | 'heating' | 'internet' | 'garbage' | 'custom'
          custom_name?: string | null
          unit?: 'm3' | 'kWh' | 'GJ' | 'MB' | 'fixed'
          tariff?: 'single' | 'day_night' | 'peak_offpeak'
          price_per_unit?: number
          fixed_price?: number | null
          initial_reading?: number | null
          initial_date?: string | null
          require_photo?: boolean
          require_serial?: boolean
          serial_number?: string | null
          provider?: string | null
          status?: 'active' | 'inactive' | 'maintenance'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      invoices: {
        Row: {
          id: string
          property_id: string
          invoice_number: string
          invoice_date: string
          due_date: string
          amount: number
          rent_amount: number
          utilities_amount: number
          other_amount: number
          status: 'paid' | 'unpaid' | 'overdue' | 'cancelled'
          paid_date: string | null
          payment_method: 'cash' | 'bank_transfer' | 'card' | 'check' | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          property_id: string
          invoice_number: string
          invoice_date: string
          due_date: string
          amount: number
          rent_amount: number
          utilities_amount?: number
          other_amount?: number
          status: 'paid' | 'unpaid' | 'overdue' | 'cancelled'
          paid_date?: string | null
          payment_method?: 'cash' | 'bank_transfer' | 'card' | 'check' | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          property_id?: string
          invoice_number?: string
          invoice_date?: string
          due_date?: string
          amount?: number
          rent_amount?: number
          utilities_amount?: number
          other_amount?: number
          status?: 'paid' | 'unpaid' | 'overdue' | 'cancelled'
          paid_date?: string | null
          payment_method?: 'cash' | 'bank_transfer' | 'card' | 'check' | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      tenants: {
        Row: {
          id: string
          name: string
          email: string | null
          phone: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 