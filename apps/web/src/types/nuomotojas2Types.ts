// 🏠 NUOMOTOJAS2 TYPES
// Tipai Nuomotojas2 dashboard'ui

export interface Address {
  id: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
}

export interface Property {
  id: string;
  address: Address;
  apartmentNumber: string;
  floor: number;
  area: number;
  rooms: number;
  status: 'occupied' | 'vacant' | 'maintenance';
  monthlyRent: number;
  utilities: number;
  totalMonthlyCost: number;
  tenant?: Tenant;
  lastUpdated: string;
  description?: string;
  outstanding_amount?: number;
}

export interface Tenant {
  id: string;
  name: string;
  phone: string;
  email: string;
  contractStart: string;
  contractEnd: string;
  monthlyRent: number;
  deposit: number;
  status: 'active' | 'expired' | 'pending';
  meters: MeterReading[];
  notification_count?: number;
  cleaning_required?: boolean;
  cleaning_cost?: number;
  cleaning?: number; // Patvirtintos išlaidos už valymą
  other?: number; // Kitos patvirtintos išlaidos
  last_notification_sent?: string;
  tenant_response?: 'wants_to_renew' | 'does_not_want_to_renew' | null;
  tenant_response_date?: string;
  planned_move_out_date?: string;
  payment_status?: 'paid' | 'unpaid' | 'overdue';
  meters_submitted?: boolean;
  last_payment_date?: string;
  outstanding_amount?: number;
  auto_renewal_enabled?: boolean;
  deposit_paid_amount?: number;
  actual_move_out_date?: string;
}

export interface MeterReading {
  id: string;
  type: 'electricity' | 'water' | 'heating' | 'gas';
  currentReading: number;
  previousReading: number;
  consumption: number;
  unit: string;
  rate: number;
  totalSum: number;
  readingDate: string;
  // Legacy field for backward compatibility
  difference?: number;
} 