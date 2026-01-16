import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDefaultRouteForRole } from '../utils/roleRouting';
import type { UserRole } from '../types/user';

type RoleGuardProps = {
  allow: UserRole[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
};

export function RoleGuard({ allow, fallback = null, children }: RoleGuardProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return fallback ? <>{fallback}</> : null;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!allow.includes(user.role)) {
    const target = getDefaultRouteForRole(user.role);
    return <Navigate to={target} replace />;
  }

  return <>{children}</>;
}











