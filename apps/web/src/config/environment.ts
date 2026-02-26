/**
 * Centralized environment configuration
 * All environment variables should be accessed through this file
 * 
 * Vite uses import.meta.env instead of process.env
 * Environment variables must be prefixed with VITE_ to be exposed
 */

interface EnvironmentConfig {
  supabase: {
    url: string;
    anonKey: string;
  };
  stripe: {
    publishableKey: string;
  };
  app: {
    url: string;
    name: string;
  };
  isDevelopment: boolean;
  isProduction: boolean;
}

function getEnvironmentConfig(): EnvironmentConfig {
  // Vite uses import.meta.env instead of process.env
  // Supports both VITE_ prefix (Vite) and REACT_APP_ prefix (legacy CRA fallback)
  const supabaseUrl =
    import.meta.env.VITE_SUPABASE_URL ||
    import.meta.env.REACT_APP_SUPABASE_URL ||
    '';

  const supabaseAnonKey =
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env.REACT_APP_SUPABASE_ANON_KEY ||
    '';

  const appUrl =
    import.meta.env.VITE_APP_URL ||
    import.meta.env.REACT_APP_APP_URL ||
    'http://localhost:3000';

  const appName =
    import.meta.env.VITE_APP_NAME ||
    import.meta.env.REACT_APP_APP_NAME ||
    'Nuomoria';

  const stripePublishableKey =
    import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';

  // Validate required environment variables
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
      'Missing required Supabase environment variables. Please check your .env file.\n' +
      'Required: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY'
    );
  }

  return {
    supabase: {
      url: supabaseUrl,
      anonKey: supabaseAnonKey,
    },
    stripe: {
      publishableKey: stripePublishableKey,
    },
    app: {
      url: appUrl,
      name: appName,
    },
    isDevelopment: import.meta.env.DEV,
    isProduction: import.meta.env.PROD,
  };
}

// Export singleton instance
export const env = getEnvironmentConfig();

// Export individual values for convenience
export const { supabase, stripe, app, isDevelopment, isProduction } = env;
