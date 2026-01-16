import { type DistributionMethod } from '../constants/meterDistribution';

// Centralized Tenant type for the entire application
export interface Tenant {
  id: string;
  name: string;
  phone: string;
  email: string;
  apartmentNumber: string;
  address: string;
  address_id?: string;
  property_id?: string;
  status: 'active' | 'expired' | 'pending' | 'moving_out' | 'vacant';
  contractStart: string;
  contractEnd: string;
  moveInDate: string;
  monthlyRent: number;
  deposit: number;
  
  // Optional fields for extended functionality
  notification_count?: number;
  cleaning_required?: boolean;
  cleaning_cost?: number;
  last_notification_sent?: string;
  tenant_response?: 'wants_to_renew' | 'does_not_want_to_renew' | null;
  tenant_response_date?: string;
  planned_move_out_date?: string;
  move_out_notice_date?: string;
  payment_status?: 'paid' | 'unpaid' | 'overdue';
  meters_submitted?: boolean;
  outstanding_amount?: number;
  last_payment_date?: string;
  auto_renewal_enabled?: boolean;
  area?: number;
  rooms?: number;
  photos?: string[];
  addressInfo?: {
    buildingType?: string;
    totalApartments?: number;
    floors?: number;
    yearBuilt?: number;
    managementType?: string;
    chairmanName?: string;
    chairmanPhone?: string;
    chairmanEmail?: string;
    companyName?: string;
    contactPerson?: string;
    companyPhone?: string;
    companyEmail?: string;
  } | null;
  meters?: Array<{
    id: string;
    name: string;
    type: 'individual' | 'communal';
    unit: 'm3' | 'kWh' | 'GJ' | 'MB' | 'fixed';
    price_per_unit: number;
    fixed_price?: number;
    distribution_method: DistributionMethod;
    description: string;
    is_active: boolean;
  requires_photo?: boolean;
    // Reading information
    lastReading?: string;
    lastReadingDate?: string;
    previousReading?: string;
    previousReadingDate?: string;
    consumption?: string;
    cost?: string;
    status?: 'active' | 'inactive';
    needsReading?: boolean;
  }>;
}

// Status mapping for different components
export const STATUS_MAP = {
  'active': 'active',
  'expired': 'inactive', // Map expired to inactive for TenantDetailModalPro
  'pending': 'pending',
  'moving_out': 'inactive',
  'vacant': 'inactive' // Map vacant to inactive for TenantDetailModalPro
} as const;

// Helper function to normalize status for TenantDetailModalPro
export function normalizeTenantStatus(status: Tenant['status']): 'active' | 'inactive' | 'pending' {
  switch (status) {
    case 'active':
      return 'active';
    case 'expired':
    case 'moving_out':
    case 'vacant':
      return 'inactive';
    case 'pending':
      return 'pending';
    default:
      return 'inactive';
  }
}
