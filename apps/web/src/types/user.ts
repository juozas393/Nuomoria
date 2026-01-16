export type UserRole = 'admin' | 'landlord' | 'property_manager' | 'tenant' | 'maintenance';

export type Permission = 
  | 'manage_users'
  | 'manage_addresses' 
  | 'manage_properties'
  | 'view_properties'
  | 'view_analytics'
  | 'manage_finances'
  | 'manage_maintenance';

export type AddressRole = 'owner' | 'manager' | 'tenant' | 'maintenance';

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: UserRole;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface UserPermission {
  id: string;
  user_id: string;
  permission: Permission;
  granted: boolean;
  granted_by?: string;
  granted_at: string;
}

// Address data structure
export interface AddressData {
  id: string;
  full_address: string;
  city: string;
  street?: string;
  house_number?: string;
  postal_code?: string;
  building_type?: string;
  total_apartments?: number;
  floors?: number;
  management_type?: string;
}

// Raw UserAddress from Supabase (may have addresses as array)
export interface UserAddressRaw {
  id: string;
  user_id: string;
  address_id: string;
  role: AddressRole;
  created_at: string;
  addresses?: AddressData | AddressData[];
}

// Clean UserAddress for application use
export interface UserAddress {
  id: string;
  user_id: string;
  address_id: string;
  role: AddressRole;
  created_at: string;
  addresses?: AddressData;
}

export interface UserWithPermissions extends User {
  permissions: Permission[];
}

export interface UserWithAddresses extends User {
  addresses: {
    address_id: string;
    role: AddressRole; // Changed from role_at_address to match database
  }[];
}

// Role-based access control helpers
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    'manage_users',
    'manage_addresses',
    'manage_properties', 
    'view_properties',
    'view_analytics',
    'manage_finances',
    'manage_maintenance'
  ],
  landlord: [
    'manage_addresses',
    'manage_properties',
    'view_properties', 
    'view_analytics',
    'manage_finances'
  ],
  property_manager: [
    'manage_properties',
    'view_properties',
    'view_analytics',
    'manage_maintenance'
  ],
  tenant: [
    'view_properties'
  ],
  maintenance: [
    'view_properties',
    'manage_maintenance'
  ]
};

export const hasPermission = (user: UserWithPermissions, permission: Permission): boolean => {
  return user.permissions.includes(permission);
};

export const hasRole = (user: User, role: UserRole): boolean => {
  return user.role === role;
};

export const canManageUsers = (user: UserWithPermissions): boolean => {
  return hasPermission(user, 'manage_users');
};

export const canManageAddresses = (user: UserWithPermissions): boolean => {
  return hasPermission(user, 'manage_addresses');
};

export const canManageProperties = (user: UserWithPermissions): boolean => {
  return hasPermission(user, 'manage_properties');
};

export const canViewAnalytics = (user: UserWithPermissions): boolean => {
  return hasPermission(user, 'view_analytics');
};

export const canManageFinances = (user: UserWithPermissions): boolean => {
  return hasPermission(user, 'manage_finances');
};

export const canManageMaintenance = (user: UserWithPermissions): boolean => {
  return hasPermission(user, 'manage_maintenance');
};

// Login form types
export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  email: string;
  password: string;
  confirmPassword: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: UserRole;
}

export interface AuthResponse {
  user: UserWithPermissions;
  token: string;
}
