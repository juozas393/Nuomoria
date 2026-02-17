import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * RoleGuard - Prevents cross-environment access between tenant and landlord
 * Redirects users to their appropriate dashboard if they try to access wrong routes
 */

interface RoleGuardProps {
    allowedRoles: ('landlord' | 'tenant' | 'admin')[];
    redirectTo?: string;
    children: React.ReactNode;
}

const LoadingFallback: React.FC = () => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2F8481] mx-auto mb-4"></div>
            <p className="text-gray-600 text-sm">Tikrinama prieiga...</p>
        </div>
    </div>
);

export const RoleGuard: React.FC<RoleGuardProps> = ({
    allowedRoles,
    redirectTo,
    children
}) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return <LoadingFallback />;
    }

    if (!user) {
        // Not logged in - redirect to login
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    const userRole = user.role as string | null | undefined;
    const validRoles = ['landlord', 'tenant', 'admin'];

    // If user has no role or unrecognized role, send to onboarding
    // This prevents the /dashboard ↔ /tenant redirect loop
    if (!userRole || !validRoles.includes(userRole)) {
        if (location.pathname !== '/onboarding') {
            return <Navigate to="/onboarding" replace />;
        }
        // Already on onboarding, render children to avoid loop
        return <>{children}</>;
    }

    // Check if user's role is in allowed roles
    if (!allowedRoles.includes(userRole as 'landlord' | 'tenant' | 'admin')) {
        // Determine redirect based on role
        let targetRedirect = redirectTo;

        if (!targetRedirect) {
            // Default redirects based on role
            if (userRole === 'tenant') {
                targetRedirect = '/tenant';
            } else {
                targetRedirect = '/dashboard';
            }
        }

        // Safety check: don't redirect to where we already are
        if (targetRedirect === location.pathname) {
            return <>{children}</>;
        }

        return <Navigate to={targetRedirect} replace />;
    }

    // Role is allowed, render children
    return <>{children}</>;
};

/**
 * LandlordOnly - Shorthand guard for landlord/admin routes
 */
export const LandlordOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <RoleGuard allowedRoles={['landlord', 'admin']} redirectTo="/tenant">
        {children}
    </RoleGuard>
);

/**
 * TenantOnly - Shorthand guard for tenant routes
 */
export const TenantOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <RoleGuard allowedRoles={['tenant']} redirectTo="/dashboard">
        {children}
    </RoleGuard>
);

export default RoleGuard;
