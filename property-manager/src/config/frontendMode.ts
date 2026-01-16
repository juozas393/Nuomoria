/**
 * FRONTEND MODE CONFIGURATION
 * 
 * This file controls whether the app runs in frontend-only mode (no backend calls)
 * or full backend mode with authentication and database operations.
 * 
 * Set FRONTEND_MODE to:
 * - true: Frontend-only mode (no authentication, no API calls)
 * - false: Full backend mode (authentication required, all API calls active)
 */

export const FRONTEND_MODE = false; // 🔧 Toggle this to switch modes

/**
 * Helper function to check if we're in frontend mode
 */
export const isFrontendMode = (): boolean => FRONTEND_MODE;

/**
 * Helper function to get mode status for logging
 */
export const getModeStatus = (): string => {
  return FRONTEND_MODE ? '🚫 FRONTEND ONLY' : '🔗 BACKEND ENABLED';
};

/**
 * Mock user data for frontend development
 */
export const getMockUser = () => {
  if (!FRONTEND_MODE) return null;
  
  return {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'developer@example.com',
    first_name: 'Developer',
    last_name: 'User',
    name: 'Developer User',
    role: 'landlord',
    is_active: true,
    avatar_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    permissions: [
      'properties:read',
      'properties:write',
      'addresses:read',
      'addresses:write',
      'tenants:read',
      'tenants:write',
      'meters:read',
      'meters:write',
      'invoices:read',
      'invoices:write',
      'maintenance:read',
      'maintenance:write'
    ]
  };
};

/**
 * Development helper - log current mode
 */
if (process.env.NODE_ENV === 'development') {
  console.log(`${getModeStatus()}: ${FRONTEND_MODE ? 'No authentication, no API calls' : 'Full authentication and API calls enabled'}`);
}
