/**
 * Feature Flag Component
 * Conditionally renders children based on feature flags
 */

import React from 'react';
import { useFeatureFlags, type FeatureFlags } from '../hooks';

interface FeatureFlagProps {
  feature: keyof FeatureFlags;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireRole?: string;
  requirePermission?: string;
}

export function FeatureFlag({ 
  feature, 
  children, 
  fallback = null, 
  requireRole,
  requirePermission 
}: FeatureFlagProps) {
  const { hasFeature, hasRole, hasPermission, loading } = useFeatureFlags();

  if (loading) {
    return <div>Loading...</div>;
  }

  // Check feature flag
  if (!hasFeature(feature)) {
    return <>{fallback}</>;
  }

  // Check role requirement
  if (requireRole && !hasRole(requireRole)) {
    return <>{fallback}</>;
  }

  // Check permission requirement
  if (requirePermission && !hasPermission(requirePermission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Admin Only Component
 */
export function AdminOnly({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <FeatureFlag feature="adminPanel" requireRole="admin" fallback={fallback}>
      {children}
    </FeatureFlag>
  );
}

/**
 * Manager Only Component
 */
export function ManagerOnly({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <FeatureFlag feature="bulkOperations" requireRole="manager" fallback={fallback}>
      {children}
    </FeatureFlag>
  );
}

/**
 * Development Only Component
 */
export function DevOnly({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <FeatureFlag feature="debugMode" fallback={fallback}>
      {children}
    </FeatureFlag>
  );
}

/**
 * Beta Feature Component
 */
export function BetaFeature({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <FeatureFlag feature="experimentalFeatures" fallback={fallback}>
      {children}
    </FeatureFlag>
  );
}



