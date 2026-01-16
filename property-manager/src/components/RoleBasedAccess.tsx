/**
 * Role-Based Access Control Components
 * The RIGHT way to control what users can see
 */

import React from 'react';
import { useUserRole } from '../hooks';

interface RoleBasedAccessProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireRole?: 'admin' | 'manager' | 'owner' | 'tenant';
  requirePermission?: string;
  requireAnyPermission?: string[];
  requireAllPermissions?: string[];
}

/**
 * Main component for role-based access control
 */
export function RoleBasedAccess({ 
  children, 
  fallback = null, 
  requireRole,
  requirePermission,
  requireAnyPermission,
  requireAllPermissions
}: RoleBasedAccessProps) {
  const { 
    userRole, 
    loading, 
    canAccess, 
    hasPermission, 
    hasAnyPermission, 
    hasAllPermissions 
  } = useUserRole();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!userRole) {
    return <>{fallback}</>;
  }

  // Check role requirement
  if (requireRole && !canAccess(requireRole)) {
    return <>{fallback}</>;
  }

  // Check single permission
  if (requirePermission && !hasPermission(requirePermission)) {
    return <>{fallback}</>;
  }

  // Check any permission
  if (requireAnyPermission && !hasAnyPermission(requireAnyPermission)) {
    return <>{fallback}</>;
  }

  // Check all permissions
  if (requireAllPermissions && !hasAllPermissions(requireAllPermissions)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Admin Only Component
 */
export function AdminOnly({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <RoleBasedAccess requireRole="admin" fallback={fallback}>
      {children}
    </RoleBasedAccess>
  );
}

/**
 * Manager Only Component (includes admins)
 */
export function ManagerOnly({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <RoleBasedAccess requireRole="manager" fallback={fallback}>
      {children}
    </RoleBasedAccess>
  );
}

/**
 * Owner Only Component (includes managers and admins)
 */
export function OwnerOnly({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <RoleBasedAccess requireRole="owner" fallback={fallback}>
      {children}
    </RoleBasedAccess>
  );
}

/**
 * Tenant Only Component
 */
export function TenantOnly({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <RoleBasedAccess requireRole="tenant" fallback={fallback}>
      {children}
    </RoleBasedAccess>
  );
}

/**
 * Permission-based access
 */
export function PermissionRequired({ 
  permission, 
  children, 
  fallback = null 
}: { 
  permission: string; 
  children: React.ReactNode; 
  fallback?: React.ReactNode; 
}) {
  return (
    <RoleBasedAccess requirePermission={permission} fallback={fallback}>
      {children}
    </RoleBasedAccess>
  );
}

/**
 * Multiple permissions (any one required)
 */
export function AnyPermissionRequired({ 
  permissions, 
  children, 
  fallback = null 
}: { 
  permissions: string[]; 
  children: React.ReactNode; 
  fallback?: React.ReactNode; 
}) {
  return (
    <RoleBasedAccess requireAnyPermission={permissions} fallback={fallback}>
      {children}
    </RoleBasedAccess>
  );
}

/**
 * Multiple permissions (all required)
 */
export function AllPermissionsRequired({ 
  permissions, 
  children, 
  fallback = null 
}: { 
  permissions: string[]; 
  children: React.ReactNode; 
  fallback?: React.ReactNode; 
}) {
  return (
    <RoleBasedAccess requireAllPermissions={permissions} fallback={fallback}>
      {children}
    </RoleBasedAccess>
  );
}



