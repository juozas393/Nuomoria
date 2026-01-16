/**
 * Centralized environment configuration
 * All environment variables should be accessed through this file
 */

interface EnvironmentConfig {
  supabase: {
    url: string;
    anonKey: string;
  };
  app: {
    url: string;
    name: string;
  };
  isDevelopment: boolean;
  isProduction: boolean;
}

function getEnvironmentConfig(): EnvironmentConfig {
  // Use environment variables - NO HARDCODED FALLBACKS FOR SECURITY
  const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const appUrl = process.env.REACT_APP_APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const appName = process.env.REACT_APP_APP_NAME || process.env.NEXT_PUBLIC_APP_NAME || 'Property Manager';

  // Validate required environment variables
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing required Supabase environment variables. Please check your .env file.\n' +
      'Required: REACT_APP_SUPABASE_URL, REACT_APP_SUPABASE_ANON_KEY'
    );
  }

  return {
    supabase: {
      url: supabaseUrl,
      anonKey: supabaseAnonKey,
    },
    app: {
      url: appUrl,
      name: appName,
    },
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
  };
}

// Export singleton instance
export const env = getEnvironmentConfig();

// Export individual values for convenience
export const { supabase, app, isDevelopment, isProduction } = env;

// Security: Prevent environment variables from being logged in production
if (isProduction) {
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
}



