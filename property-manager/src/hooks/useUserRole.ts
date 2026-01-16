/**
 * User Role Hook - The RIGHT way to control access
 * Based on database roles, not environment variables
 */

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface UserRole {
  id: string;
  email: string;
  role: 'admin' | 'manager' | 'owner' | 'tenant';
  permissions: string[];
  isActive: boolean;
}

/**
 * Hook to manage user roles and permissions
 * This is the PRIMARY way to control access
 */
export function useUserRole() {
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserRole();
  }, []);

  const loadUserRole = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setUserRole(null);
        setLoading(false);
        return;
      }

      // Get user role from database
      const { data: userData, error } = await supabase
        .from('users')
        .select('role, permissions, is_active')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching user role:', error);
        setUserRole(null);
        setLoading(false);
        return;
      }

      const role: UserRole = {
        id: user.id,
        email: user.email || '',
        role: userData.role || 'tenant',
        permissions: userData.permissions || [],
        isActive: userData.is_active || false,
      };

      setUserRole(role);

    } catch (error) {
      console.error('Error loading user role:', error);
      setUserRole(null);
    } finally {
      setLoading(false);
    }
  };

  // Role checks
  const isAdmin = () => userRole?.role === 'admin';
  const isManager = () => userRole?.role === 'manager' || isAdmin();
  const isOwner = () => userRole?.role === 'owner' || isManager();
  const isTenant = () => userRole?.role === 'tenant';

  // Permission checks
  const hasPermission = (permission: string) => {
    if (!userRole) return false;
    return userRole.permissions.includes(permission) || isAdmin();
  };

  const hasAnyPermission = (permissions: string[]) => {
    if (!userRole) return false;
    return permissions.some(permission => hasPermission(permission));
  };

  const hasAllPermissions = (permissions: string[]) => {
    if (!userRole) return false;
    return permissions.every(permission => hasPermission(permission));
  };

  // Role hierarchy checks
  const canAccess = (requiredRole: string) => {
    if (!userRole) return false;
    
    const roleHierarchy = {
      'tenant': 1,
      'owner': 2,
      'manager': 3,
      'admin': 4
    };
    
    const userLevel = roleHierarchy[userRole.role as keyof typeof roleHierarchy] || 0;
    const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0;
    
    return userLevel >= requiredLevel;
  };

  return {
    userRole,
    loading,
    // Role checks
    isAdmin,
    isManager,
    isOwner,
    isTenant,
    // Permission checks
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    // Access control
    canAccess,
    // Refresh
    refresh: loadUserRole,
  };
}



