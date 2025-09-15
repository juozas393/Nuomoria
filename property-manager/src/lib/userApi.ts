import { supabase } from './supabase';
import type { 
  User, 
  UserWithPermissions, 
  UserPermission, 
  UserAddress,
  UserAddressRaw,
  AddressData,
  LoginForm, 
  RegisterForm, 
  AuthResponse,
  Permission,
  UserRole
} from '../types/user';
import { hashPassword, verifyPassword, generateSessionToken, validateSessionToken } from '../utils/security';

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

// User API
export const userApi = {
  // Login user with direct database queries
  async login(credentials: LoginForm): Promise<AuthResponse> {
    try {
      // Get user from database
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', credentials.email)
        .eq('is_active', true)
        .single();

      if (userError || !user) {
        // Security: Don't log sensitive user lookup errors
        if (process.env.NODE_ENV === 'development') {
          console.error('User lookup error:', userError);
        }
        throw new Error('Neteisingi prisijungimo duomenys');
      }

      // Security: Use proper password hashing with Web Crypto API
      const isValidPassword = await verifyPassword(credentials.password, user.password_hash);

      if (!isValidPassword) {
        throw new Error('Neteisingas el. paštas arba slaptažodis');
      }

      // Get user permissions
      const { data: permissions, error: permError } = await supabase
        .from('user_permissions')
        .select('permission')
        .eq('user_id', user.id)
        .eq('granted', true);

      const userWithPermissions: UserWithPermissions = {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone,
        role: user.role as UserRole,
        is_active: user.is_active,
        last_login: user.last_login,
        created_at: user.created_at,
        updated_at: user.updated_at,
        permissions: (permissions?.map(p => p.permission) || []) as Permission[]
      };

      // Update last login
      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', user.id);

      return {
        user: userWithPermissions,
        token: generateSessionToken(user.id) // Security: Secure session token
      };
    } catch (error) {
      // Security: Don't log sensitive login errors in production
      if (process.env.NODE_ENV === 'development') {
        console.error('Login error:', error);
      }
      throw error;
    }
  },

  // Register new user with enhanced validation
  async register(userData: RegisterForm): Promise<UserWithPermissions> {
    try {
      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', userData.email)
        .maybeSingle();

      if (existingUser) {
        throw new Error('Vartotojas su šiuo el. paštu jau egzistuoja');
      }

      // Create new user with active status for demo
      const { data: user, error } = await supabase
        .from('users')
        .insert([{
          email: userData.email,
          password_hash: await hashPassword(userData.password), // Security: Properly hashed password
          first_name: userData.first_name,
          last_name: userData.last_name,
          phone: userData.phone,
          role: userData.role,
          is_active: true, // Auto-activate for demo
          email_verified: true // Auto-verify for demo
        }])
        .select()
        .single();

      if (error) {
        // Security: Don't log sensitive user creation errors
        if (process.env.NODE_ENV === 'development') {
          console.error('User creation error:', error);
        }
        throw new Error('Klaida kuriant vartotoją');
      }

      // Add default permissions based on role
      const defaultPermissions = getDefaultPermissions(userData.role);
      if (defaultPermissions.length > 0) {
        const permissionData = defaultPermissions.map(permission => ({
          user_id: user.id,
          permission,
          granted: true,
          granted_by: user.id
        }));

        const { error: permError } = await supabase
          .from('user_permissions')
          .insert(permissionData);

        if (permError) {
          // Security: Don't log sensitive permission errors
          if (process.env.NODE_ENV === 'development') {
            console.error('Permission creation error:', permError);
          }
          // Don't fail registration for permission errors
        }
      }

      // Security: Don't log sensitive user information
      if (process.env.NODE_ENV === 'development') {
        console.log(`Vartotojas sėkmingai sukurtas: ${userData.email}`);
      }

      return {
        ...user,
        permissions: defaultPermissions
      };
    } catch (error) {
      // Security: Don't log sensitive registration errors
      if (process.env.NODE_ENV === 'development') {
        console.error('Registration error:', error);
      }
      throw error;
    }
  },

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
  },

  // Request password reset
  async requestPasswordReset(email: string): Promise<void> {
    const { data: user, error } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (error || !user) {
      throw new Error('User not found');
    }

    const resetToken = 'mock-reset-token'; // In real app, generate secure token
    const expiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour expiry

    await supabase
      .from('password_resets')
      .insert([{
        user_id: user.id,
        reset_token: resetToken,
        expires_at: expiresAt
      }]);

    // Send reset email (mocked)
    // Security: Don't log sensitive reset tokens
    if (process.env.NODE_ENV === 'development') {
      console.log(`Password reset email sent to ${email} with token ${resetToken}`);
    }
  },

  // Reset password
  async resetPassword(resetToken: string, newPassword: string): Promise<void> {
    const { data: resetRequest, error } = await supabase
      .from('password_resets')
      .select('*')
      .eq('reset_token', resetToken)
      .eq('used', false)
      .single();

    if (error || !resetRequest || new Date() > new Date(resetRequest.expires_at)) {
      throw new Error('Invalid or expired reset token');
    }

    // Update user password
    await supabase
      .from('users')
      .update({ password_hash: newPassword }) // In real app, hash the password
      .eq('id', resetRequest.user_id);

    // Mark reset request as used
    await supabase
      .from('password_resets')
      .update({ used: true })
      .eq('id', resetRequest.id);
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
