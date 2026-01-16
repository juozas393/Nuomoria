/**
 * Feature Flags Hook
 * Controls what features are visible to different users
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { env } from '../config/environment';

export interface FeatureFlags {
  // New Features (Beta)
  newDashboard: boolean;
  advancedAnalytics: boolean;
  tenantChat: boolean;
  maintenanceScheduling: boolean;
  documentUpload: boolean;
  
  // User Role Features
  adminPanel: boolean;
  bulkOperations: boolean;
  systemSettings: boolean;
  userManagement: boolean;
  
  // Environment Features
  debugMode: boolean;
  performanceMonitoring: boolean;
  experimentalFeatures: boolean;
  
  // A/B Testing
  newUI: boolean;
  simplifiedWorkflow: boolean;
}

export interface UserRole {
  id: string;
  role: 'admin' | 'manager' | 'tenant' | 'owner';
  permissions: string[];
}

/**
 * Hook to manage feature flags based on user role and environment
 */
export function useFeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlags>({
    // Default flags (all disabled for safety)
    newDashboard: false,
    advancedAnalytics: false,
    tenantChat: false,
    maintenanceScheduling: false,
    documentUpload: false,
    adminPanel: false,
    bulkOperations: false,
    systemSettings: false,
    userManagement: false,
    debugMode: false,
    performanceMonitoring: false,
    experimentalFeatures: false,
    newUI: false,
    simplifiedWorkflow: false,
  });

  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFeatureFlags();
  }, []);

  const loadFeatureFlags = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      // Get user role and permissions
      const { data: userData, error } = await supabase
        .from('users')
        .select('role, permissions')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching user role:', error);
        setLoading(false);
        return;
      }

      const role: UserRole = {
        id: user.id,
        role: userData.role || 'tenant',
        permissions: userData.permissions || [],
      };

      setUserRole(role);

      // Calculate feature flags based on role and environment
      const newFlags = calculateFeatureFlags(role);
      setFlags(newFlags);

    } catch (error) {
      console.error('Error loading feature flags:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateFeatureFlags = (role: UserRole): FeatureFlags => {
    const isAdmin = role.role === 'admin';
    const isManager = role.role === 'manager' || isAdmin;
    const isOwner = role.role === 'owner' || isManager;
    const isTenant = role.role === 'tenant';

    return {
      // New Features (Beta) - Only for admins and managers
      newDashboard: isManager && env.isDevelopment,
      advancedAnalytics: isManager && env.isDevelopment,
      tenantChat: isManager && env.isDevelopment,
      maintenanceScheduling: isManager && env.isDevelopment,
      documentUpload: isManager && env.isDevelopment,

      // User Role Features
      adminPanel: isAdmin,
      bulkOperations: isManager,
      systemSettings: isAdmin,
      userManagement: isAdmin,

      // Environment Features
      debugMode: env.features.debugMode && (isAdmin || env.isDevelopment),
      performanceMonitoring: env.features.performanceMonitoring && isManager,
      experimentalFeatures: env.isDevelopment && isManager,

      // A/B Testing - Random for now, can be made more sophisticated
      newUI: Math.random() > 0.5 && isManager,
      simplifiedWorkflow: Math.random() > 0.5 && isTenant,
    };
  };

  const hasFeature = (feature: keyof FeatureFlags): boolean => {
    return flags[feature] || false;
  };

  const hasPermission = (permission: string): boolean => {
    if (!userRole) return false;
    return userRole.permissions.includes(permission) || userRole.role === 'admin';
  };

  const hasRole = (role: string): boolean => {
    if (!userRole) return false;
    return userRole.role === role;
  };

  return {
    flags,
    userRole,
    loading,
    hasFeature,
    hasPermission,
    hasRole,
    refresh: loadFeatureFlags,
  };
}

/**
 * Higher-order component to conditionally render components based on feature flags
 */
export function withFeatureFlag<T extends object>(
  Component: React.ComponentType<T>,
  feature: keyof FeatureFlags,
  Fallback?: React.ComponentType<T>
) {
  return function FeatureFlaggedComponent(props: T) {
    const { hasFeature } = useFeatureFlags();
    
    if (hasFeature(feature)) {
      return <Component {...props} />;
    }
    
    if (Fallback) {
      return <Fallback {...props} />;
    }
    
    return null;
  };
}

/**
 * Hook for A/B testing
 */
export function useABTest(testName: string, variants: string[]) {
  const [variant, setVariant] = useState<string>('');
  const { userRole } = useFeatureFlags();

  useEffect(() => {
    if (!userRole) return;

    // Simple A/B test logic - can be made more sophisticated
    const hash = userRole.id.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    const index = Math.abs(hash) % variants.length;
    setVariant(variants[index]);
  }, [userRole, testName, variants]);

  return variant;
}

