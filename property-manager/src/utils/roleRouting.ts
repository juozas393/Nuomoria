import { UserRole } from '../types/user';

/**
 * Returns the default route for a user based on their role.
 * If user has no role, redirects to onboarding for role selection.
 * 
 * @param role - User's role (tenant, landlord, property_manager, etc.)
 * @returns Route path string
 */
export const getDefaultRouteForRole = (role?: UserRole | null): string => {
  // If user has no role, redirect to onboarding to select role
  if (!role) {
    return '/onboarding';
  }

  switch (role) {
    case 'tenant':
      return '/tenant-dashboard';
    case 'landlord':
    case 'property_manager':
    case 'admin':
    case 'maintenance':
    default:
      return '/nuomotojas2';
  }
};












