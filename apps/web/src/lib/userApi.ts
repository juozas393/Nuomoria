import { supabase } from './supabase';
import type {
  User,
  UserWithPermissions,
  UserPermission,
  UserAddress,
  UserAddressRaw,
  AddressData,
  Permission,
  UserRole
} from '../types/user';

// Helper function to transform raw UserAddress data from Supabase
function transformUserAddress(raw: UserAddressRaw): UserAddress {
  // Use role if available, fallback to role_at_address for compatibility
  const role = raw.role || (raw as any).role_at_address;

  return {
    id: raw.id,
    user_id: raw.user_id,
    address_id: raw.address_id,
    role: role,
    created_at: raw.created_at,
    addresses: Array.isArray(raw.addresses) ? raw.addresses[0] : raw.addresses
  };
}

// User API (Google OAuth only - no password-based auth)
export const userApi = {
  // Get current user with permissions
  async getCurrentUser(userId: string): Promise<UserWithPermissions> {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !user) {
      throw new Error('User not found');
    }

    const { data: permissions, error: permError } = await supabase
      .from('user_permissions')
      .select('permission')
      .eq('user_id', user.id)
      .eq('granted', true);

    if (permError) {
      throw new Error('Error fetching permissions');
    }

    return {
      ...user,
      permissions: permissions.map(p => p.permission as Permission)
    };
  },

  // Get all users (admin only)
  async getAllUsers(): Promise<UserWithPermissions[]> {
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error('Error fetching users');
    }

    // Get permissions for all users
    const usersWithPermissions = await Promise.all(
      users.map(async (user) => {
        const { data: permissions } = await supabase
          .from('user_permissions')
          .select('permission')
          .eq('user_id', user.id)
          .eq('granted', true);

        return {
          ...user,
          permissions: permissions?.map(p => p.permission as Permission) || []
        };
      })
    );

    return usersWithPermissions;
  },

  // Update user
  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    const { data: user, error } = await supabase
      .from('users')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw new Error('Error updating user');
    }

    return user;
  },

  // Delete user
  async deleteUser(userId: string): Promise<void> {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) {
      throw new Error('Error deleting user');
    }
  },

  // Get user permissions
  async getUserPermissions(userId: string): Promise<UserPermission[]> {
    const { data: permissions, error } = await supabase
      .from('user_permissions')
      .select('*')
      .eq('user_id', userId)
      .order('permission');

    if (error) {
      throw new Error('Error fetching user permissions');
    }

    return permissions;
  },

  // Update user permissions
  async updateUserPermissions(
    userId: string,
    permissions: { permission: Permission; granted: boolean }[],
    grantedBy: string
  ): Promise<void> {
    // Delete existing permissions
    await supabase
      .from('user_permissions')
      .delete()
      .eq('user_id', userId);

    // Insert new permissions
    const permissionData = permissions.map(p => ({
      user_id: userId,
      permission: p.permission,
      granted: p.granted,
      granted_by: grantedBy
    }));

    const { error } = await supabase
      .from('user_permissions')
      .insert(permissionData);

    if (error) {
      throw new Error('Error updating user permissions');
    }
  },

  // Get user addresses with full address information
  async getUserAddresses(userId: string): Promise<UserAddress[]> {
    const { data: userAddresses, error } = await supabase
      .from('user_addresses')
      .select(`
        id,
        user_id,
        address_id,
        role_at_address,
        role,
        created_at,
        addresses (
          id,
          full_address,
          city,
          street,
          house_number,
          postal_code,
          building_type,
          total_apartments,
          floors,
          management_type
        )
      `)
      .eq('user_id', userId);

    if (error) {
      // Security: Don't log sensitive address errors
      if (process.env.NODE_ENV === 'development') {
        console.error('getUserAddresses error:', error);
      }
      throw new Error('Error fetching user addresses');
    }

    // Transform the raw data to match our UserAddress interface
    return (userAddresses || []).map(transformUserAddress);
  },

  // Add user to address
  async addUserToAddress(
    userId: string,
    addressId: string,
    role: string
  ): Promise<UserAddress> {
    const { data: userAddress, error } = await supabase
      .from('user_addresses')
      .insert([{
        user_id: userId,
        address_id: addressId,
        role_at_address: role, // Use role_at_address for compatibility
        role: role // Also set role for new schema
      }])
      .select(`
        id,
        user_id,
        address_id,
        role_at_address,
        role,
        created_at,
        addresses (
          id,
          full_address,
          city,
          street,
          house_number,
          postal_code,
          building_type,
          total_apartments,
          floors,
          management_type
        )
      `)
      .single();

    if (error) {
      // Security: Don't log sensitive address errors
      if (process.env.NODE_ENV === 'development') {
        console.error('addUserToAddress error:', error);
      }
      throw new Error('Error adding user to address');
    }

    return transformUserAddress(userAddress);
  },

  // Remove user from address
  async removeUserFromAddress(userId: string, addressId: string): Promise<void> {
    const { error } = await supabase
      .from('user_addresses')
      .delete()
      .eq('user_id', userId)
      .eq('address_id', addressId);

    if (error) {
      throw new Error('Error removing user from address');
    }
  }
};

// Helper function to get default permissions for a role
function getDefaultPermissions(role: string): Permission[] {
  const rolePermissions: Record<string, Permission[]> = {
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

  return rolePermissions[role] || ['view_properties'];
}
