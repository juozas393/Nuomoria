import { UserWithPermissions } from '../types/user';

/**
 * Centralized Post-Auth Redirect Logic
 * Single source of truth for all authentication-related redirects
 */

export interface AuthRedirectResult {
    path: string;
    reason: 'not_authenticated' | 'onboarding_required' | 'tenant_dashboard' | 'landlord_dashboard' | 'account_deleted';
}

/**
 * Determines the correct redirect path after authentication
 * @param user - The authenticated user (or null if not authenticated)
 * @param onboardingCompleted - Whether the user has completed onboarding
 * @param isDeleted - Whether the user's account is deleted/deactivated
 */
export function getPostAuthRedirect(
    user: UserWithPermissions | null,
    onboardingCompleted?: boolean,
    isDeleted?: boolean
): AuthRedirectResult {
    // Account is deleted/deactivated
    if (isDeleted) {
        return { path: '/login', reason: 'account_deleted' };
    }

    // Not authenticated
    if (!user) {
        return { path: '/login', reason: 'not_authenticated' };
    }

    // Onboarding not completed - force onboarding
    if (onboardingCompleted === false) {
        return { path: '/onboarding', reason: 'onboarding_required' };
    }

    // Role-based dashboard redirect
    if (user.role === 'tenant') {
        return { path: '/tenant', reason: 'tenant_dashboard' };
    }

    // Landlord, admin, property_manager, maintenance -> landlord dashboard
    return { path: '/dashboard', reason: 'landlord_dashboard' };
}

/**
 * Get the dashboard path based on user role
 * Use this when you know the user is authenticated and onboarded
 */
export function getDashboardPath(role: string): string {
    return role === 'tenant' ? '/tenant' : '/dashboard';
}

/**
 * Get the settings path based on user role
 */
export function getSettingsPath(role: string): string {
    return role === 'tenant' ? '/tenant/settings' : '/profilis';
}

/**
 * Get the profile/settings path based on user role
 * SINGLE SOURCE OF TRUTH for all profile navigation
 * NO DEFAULT TO TENANT - explicit role matching only
 * @param role - User role ('tenant', 'landlord', 'admin', or null)
 * @returns The correct profile path for the user's role
 */
export function getProfileRoute(role: string | null | undefined): string {
    // DEBUG: Log every call to trace the issue
    console.log('[getProfileRoute] Called with role:', role, 'type:', typeof role);

    if (!role || role === 'null' || role === 'undefined') {
        console.warn('[getProfileRoute] Role is falsy! Returning /onboarding');
        return '/onboarding';
    }

    if (role === 'tenant') {
        console.log('[getProfileRoute] Role is tenant -> /tenant/settings');
        return '/tenant/settings';
    }

    if (role === 'landlord' || role === 'admin') {
        console.log('[getProfileRoute] Role is landlord/admin -> /profilis');
        return '/profilis';
    }

    // EXPLICIT: Any unknown role goes to onboarding, NOT tenant
    console.warn('[getProfileRoute] Unknown role:', role, '-> /onboarding');
    return '/onboarding';
}

/**
 * Check if a path belongs to tenant environment
 */
export function isTenantPath(path: string): boolean {
    return path.startsWith('/tenant');
}

/**
 * Check if a path belongs to landlord/admin environment
 */
export function isLandlordPath(path: string): boolean {
    const landlordPaths = ['/dashboard', '/turtas', '/butai', '/nuomininkai', '/skaitikliai', '/saskaitos', '/analitika', '/remontas', '/profilis', '/nustatymai', '/vartotojai'];
    return landlordPaths.some(p => path === p || path.startsWith(p + '/'));
}
