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

    const userRole = user.role as 'landlord' | 'tenant' | 'admin';

    // Check if user's role is in allowed roles
    if (!allowedRoles.includes(userRole)) {
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

        console.log(`[RoleGuard] Role "${userRole}" not in allowed roles [${allowedRoles.join(', ')}]. Redirecting to ${targetRedirect}`);

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
