/**
 * Environment Indicator Component
 * Shows current environment (STAGING/DEVELOPMENT) in non-production environments
 * Helps developers avoid accidentally modifying production data
 */

import React from 'react';

const environment = import.meta.env.VITE_ENVIRONMENT || 'production';
const isProduction = environment === 'production';

export const EnvironmentIndicator: React.FC = () => {
    // Don't show anything in production
    if (isProduction) return null;

    const bgColor = environment === 'staging'
        ? 'bg-orange-500'
        : 'bg-yellow-500';

    const label = environment === 'staging'
        ? '🧪 STAGING'
        : '🔧 DEVELOPMENT';

    return (
        <div
            className={`fixed bottom-0 left-0 right-0 ${bgColor} text-white text-center py-1 text-xs font-bold z-[9999] opacity-90`}
            style={{ pointerEvents: 'none' }}
        >
            {label} - Tai nėra production aplinka!
        </div>
    );
};

/**
 * Hook to check current environment
 */
export const useEnvironment = () => {
    return {
        environment,
        isProduction,
        isStaging: environment === 'staging',
        isDevelopment: environment === 'development',
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
    };
};

export default EnvironmentIndicator;
