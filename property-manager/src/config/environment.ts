/**
 * Centralized environment configuration
 * All environment variables should be accessed through this file
 */

// Force check environment variables on import
import './force-env-reload';

interface EnvironmentConfig {
  supabase: {
    url: string;
    anonKey: string;
  };
  app: {
    url: string;
    name: string;
    authRedirectUrl: string;
  };
  email: {
    from: string;
    replyTo: string;
  };
  features: {
    analytics: boolean;
    errorReporting: boolean;
    performanceMonitoring: boolean;
    debugMode: boolean;
    serviceWorker: boolean;
    // New feature flags
    newDashboard: boolean;
    advancedAnalytics: boolean;
    tenantChat: boolean;
    maintenanceScheduling: boolean;
    documentUpload: boolean;
    experimentalFeatures: boolean;
    newUI: boolean;
    simplifiedWorkflow: boolean;
  };
  performance: {
    cacheStrategy: string;
    generateSourcemap: boolean;
  };
  isDevelopment: boolean;
  isProduction: boolean;
  isTest: boolean;
}

function getEnvironmentConfig(): EnvironmentConfig {
  // Use environment variables - NO HARDCODED FALLBACKS FOR SECURITY
  // React uses .env.development when NODE_ENV=development
  // React uses .env.production when NODE_ENV=production
  // React uses .env for all other cases
  const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  // CRITICAL FIX: In development, verify the key matches the expected project
  // If it doesn't match, we have a cache issue - try to fix it automatically
  // BUT: NEVER touch localStorage during OAuth callback to preserve PKCE code_verifier
  if (process.env.NODE_ENV === 'development' && supabaseAnonKey && supabaseUrl) {
    // CRITICAL: Check for OAuth callback FIRST - before any localStorage operations
    const isOAuthCallback = typeof window !== 'undefined' && (
      window.location.search.includes('code=') || 
      window.location.pathname.includes('/auth/callback')
    );
    
    // If we're in OAuth callback, skip all localStorage operations
    if (isOAuthCallback) {
      // Do nothing - preserve all localStorage including PKCE code_verifier
      // Just log a warning if needed (but only once to avoid spam)
      const warningKey = 'oauth-callback-warning-shown';
      if (typeof window !== 'undefined' && !sessionStorage.getItem(warningKey)) {
        sessionStorage.setItem(warningKey, 'true');
        console.warn('⚠️ OAuth callback detected - preserving all localStorage (including PKCE code_verifier)');
      }
    } else {
      // Only check for API key mismatch if NOT in OAuth callback
      try {
        const jwtParts = supabaseAnonKey.split('.');
        if (jwtParts.length === 3) {
          const payload = JSON.parse(atob(jwtParts[1]));
          const jwtProjectRef = payload.ref;
          const urlMatch = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/);
          const urlProjectRef = urlMatch ? urlMatch[1] : null;
          
          // If project refs don't match, the dev server hasn't reloaded
          // This is a critical error that will cause authentication failures
          // BUT: Only log once per page load to avoid spam
          if (jwtProjectRef && urlProjectRef && jwtProjectRef !== urlProjectRef) {
            const warningKey = 'dev-server-cache-warning-shown';
            const shouldLog = typeof window !== 'undefined' && !sessionStorage.getItem(warningKey);
            
            if (shouldLog) {
              sessionStorage.setItem(warningKey, 'true');
              console.error('');
              console.error('🚨 CRITICAL: DEV SERVER CACHE ISSUE DETECTED!');
              console.error(`   URL project: ${urlProjectRef}`);
              console.error(`   Loaded key project: ${jwtProjectRef}`);
              console.error('   This means dev server is using cached environment variables!');
              console.error('');
              console.error('   🔧 AUTO-FIXING: Clearing localStorage cache...');
            }
            
            // Clear localStorage to prevent using invalid session
            // BUT preserve PKCE code_verifier for OAuth callback
            // (We already checked isOAuthCallback above, so we're safe here)
            if (typeof window !== 'undefined') {
              // Clear localStorage to prevent using invalid session
              // BUT preserve PKCE code_verifier for OAuth callback
              // Supabase stores PKCE as: sb-{project-ref}-auth-token-code-verifier
              const keysToRemove: string[] = [];
              for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
                  // Don't remove PKCE code_verifier - it's needed for OAuth callback
                  // Check for ALL possible PKCE key formats:
                  // - code_verifier
                  // - code-verifier
                  // - auth-code-verifier
                  // - auth-token-code-verifier (actual format used by Supabase)
                  // - token-code-verifier
                  // - pkce
                  const isPkceKey = key.includes('code_verifier') || 
                                    key.includes('code-verifier') || 
                                    key.includes('token-code-verifier') ||
                                    key.includes('auth-token-code-verifier') ||
                                    key.includes('auth-code-verifier') ||
                                    key.includes('pkce');
                  
                  if (!isPkceKey) {
                    keysToRemove.push(key);
                  }
                }
              }
              keysToRemove.forEach(key => {
                localStorage.removeItem(key);
                if (shouldLog) {
                  console.error(`   ✅ Removed: ${key}`);
                }
              });
              if (shouldLog) {
                console.error('   ✅ Cleared localStorage cache (preserved PKCE code_verifier)');
              }
            }
            
            if (shouldLog) {
              console.error('');
              console.error('   ⚠️ CRITICAL: Dev server must be restarted!');
              console.error('   📝 Steps to fix:');
              console.error('   1. Stop dev server completely (Ctrl+C)');
              console.error('   2. Clear cache: Remove-Item -Recurse -Force node_modules/.cache');
              console.error('   3. Restart: npm start');
              console.error('   4. Hard refresh browser: Ctrl+Shift+R');
              console.error('');
              console.error(`   🔗 Get correct key: https://app.supabase.com/project/${urlProjectRef}/settings/api`);
              console.error('');
              console.error('   ⚠️ Authentication will FAIL until dev server is restarted!');
              console.error('');
            }
          }
        }
      } catch (e) {
        // Ignore decode errors
      }
    }
  }
  
  // Debug: Log which env file is being used
  if (process.env.NODE_ENV === 'development') {
    const envFile = process.env.REACT_APP_SUPABASE_URL ? 'loaded from environment' : 'NOT FOUND';
    console.log('🔍 Environment check:');
    console.log('   NODE_ENV:', process.env.NODE_ENV);
    console.log('   REACT_APP_SUPABASE_URL:', process.env.REACT_APP_SUPABASE_URL ? '✅ Found' : '❌ Missing');
    console.log('   REACT_APP_SUPABASE_ANON_KEY:', process.env.REACT_APP_SUPABASE_ANON_KEY ? '✅ Found' : '❌ Missing');
    if (!process.env.REACT_APP_SUPABASE_URL || !process.env.REACT_APP_SUPABASE_ANON_KEY) {
      console.warn('⚠️ Environment variables not found!');
      console.warn('   Make sure you have .env.development file in property-manager directory');
      console.warn('   Copy your .env file to .env.development or create .env.development with:');
      console.warn('   REACT_APP_SUPABASE_URL=https://hlcvskkxrnwxtktscpyy.supabase.co');
      console.warn('   REACT_APP_SUPABASE_ANON_KEY=your_anon_key_here');
      console.warn('   Then restart the dev server (npm start)');
    }
  }
  const appUrl = process.env.REACT_APP_APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const appName = process.env.REACT_APP_APP_NAME || process.env.NEXT_PUBLIC_APP_NAME || 'Property Manager';
  const authRedirectUrl = process.env.REACT_APP_AUTH_REDIRECT_URL || `${appUrl}/auth/callback`;
  
  // Email configuration
  const emailFrom = process.env.REACT_APP_EMAIL_FROM || 'noreply@localhost';
  const emailReplyTo = process.env.REACT_APP_EMAIL_REPLY_TO || 'support@localhost';
  
  // Feature flags with defaults
  const enableAnalytics = process.env.REACT_APP_ENABLE_ANALYTICS === 'true';
  const enableErrorReporting = process.env.REACT_APP_ENABLE_ERROR_REPORTING === 'true';
  const enablePerformanceMonitoring = process.env.REACT_APP_ENABLE_PERFORMANCE_MONITORING !== 'false';
  const enableDebugMode = process.env.REACT_APP_ENABLE_DEBUG_MODE === 'true';
  const enableServiceWorker = process.env.REACT_APP_ENABLE_SERVICE_WORKER !== 'false';
  
  // New feature flags
  const enableNewDashboard = process.env.REACT_APP_ENABLE_NEW_DASHBOARD === 'true';
  const enableAdvancedAnalytics = process.env.REACT_APP_ENABLE_ADVANCED_ANALYTICS === 'true';
  const enableTenantChat = process.env.REACT_APP_ENABLE_TENANT_CHAT === 'true';
  const enableMaintenanceScheduling = process.env.REACT_APP_ENABLE_MAINTENANCE_SCHEDULING === 'true';
  const enableDocumentUpload = process.env.REACT_APP_ENABLE_DOCUMENT_UPLOAD === 'true';
  const enableExperimentalFeatures = process.env.REACT_APP_ENABLE_EXPERIMENTAL_FEATURES === 'true';
  const enableNewUI = process.env.REACT_APP_ENABLE_NEW_UI === 'true';
  const enableSimplifiedWorkflow = process.env.REACT_APP_ENABLE_SIMPLIFIED_WORKFLOW === 'true';
  
  // Performance settings
  const cacheStrategy = process.env.REACT_APP_CACHE_STRATEGY || 'minimal';
  const generateSourcemap = process.env.GENERATE_SOURCEMAP !== 'false';
  
  // Environment detection
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isProduction = process.env.NODE_ENV === 'production';
  const isTest = process.env.NODE_ENV === 'test';

  // Validate required environment variables
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing required Supabase environment variables!');
    console.error('📝 Please create a .env.development file in the property-manager directory with:');
    console.error('   REACT_APP_SUPABASE_URL=https://your-project.supabase.co');
    console.error('   REACT_APP_SUPABASE_ANON_KEY=your_anon_key_here');
    console.error('');
    console.error('💡 You can copy from env.development.template or env.production.template');
    console.error('🔗 Get your credentials from: https://app.supabase.com/project/your-project/settings/api');
    console.error('');
    console.error('⚠️ Note: If you have a .env file, make sure you also have .env.development');
    console.error('   React uses .env.development when NODE_ENV=development');
    
    throw new Error(
      'Missing required Supabase environment variables. Please create a .env.development file with REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY'
    );
  }
  
  // Validate anon key format
  if (!supabaseAnonKey.startsWith('eyJ')) {
    console.warn('⚠️ Supabase anon key does not look like a valid JWT token');
    console.warn('   Expected format: JWT token starting with "eyJ"');
    console.warn('   Current key starts with:', supabaseAnonKey.substring(0, 10));
    console.warn('   This might cause authentication errors');
  }
  
  // Log configuration in development
  if (isDevelopment) {
    console.log('✅ Supabase configuration loaded:');
    console.log('   URL:', supabaseUrl);
    console.log('   Anon Key:', supabaseAnonKey.substring(0, 30) + '...' + supabaseAnonKey.substring(supabaseAnonKey.length - 10));
    console.log('   Anon Key length:', supabaseAnonKey.length);
    
    // Decode JWT to verify project reference matches URL (informational only)
    try {
      const jwtParts = supabaseAnonKey.split('.');
      if (jwtParts.length === 3) {
        const payload = JSON.parse(atob(jwtParts[1]));
        const jwtProjectRef = payload.ref;
        const urlMatch = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/);
        const urlProjectRef = urlMatch ? urlMatch[1] : null;
        
        if (jwtProjectRef && urlProjectRef) {
          if (jwtProjectRef === urlProjectRef) {
            console.log('   ✅ Project ref verification: MATCH (' + jwtProjectRef + ')');
          } else {
            // Only warn, don't block - let Supabase handle validation
            console.warn('   ⚠️ Project ref mismatch detected (informational only)');
            console.warn('      URL project ref: ' + urlProjectRef);
            console.warn('      JWT project ref: ' + jwtProjectRef);
            console.warn('      Note: This may cause authentication issues. Verify your API key matches the project.');
          }
        }
      }
    } catch (e) {
      // Ignore JWT decode errors in logging
    }
  }

  return {
    supabase: {
      url: supabaseUrl,
      anonKey: supabaseAnonKey,
    },
    app: {
      url: appUrl,
      name: appName,
      authRedirectUrl,
    },
    email: {
      from: emailFrom,
      replyTo: emailReplyTo,
    },
    features: {
      analytics: enableAnalytics,
      errorReporting: enableErrorReporting,
      performanceMonitoring: enablePerformanceMonitoring,
      debugMode: enableDebugMode,
      serviceWorker: enableServiceWorker,
      // New feature flags
      newDashboard: enableNewDashboard,
      advancedAnalytics: enableAdvancedAnalytics,
      tenantChat: enableTenantChat,
      maintenanceScheduling: enableMaintenanceScheduling,
      documentUpload: enableDocumentUpload,
      experimentalFeatures: enableExperimentalFeatures,
      newUI: enableNewUI,
      simplifiedWorkflow: enableSimplifiedWorkflow,
    },
    performance: {
      cacheStrategy,
      generateSourcemap,
    },
    isDevelopment,
    isProduction,
    isTest,
  };
}

// Export singleton instance
export const env = getEnvironmentConfig();

// Export individual values for convenience
export const { 
  supabase, 
  app, 
  email, 
  features, 
  performance, 
  isDevelopment, 
  isProduction, 
  isTest 
} = env;

// Environment indicator for development
if (isDevelopment) {
  console.log(`🚀 Running in DEVELOPMENT mode`);
  console.log(`📁 Using .env.development file`);
  console.log(`🔗 App URL: ${app.url}`);
  console.log(`🏗️  Supabase URL: ${supabase.url}`);
  
  // Additional verification: Show the actual key being used (first and last chars for security)
  const keyPreview = supabase.anonKey.length > 60 
    ? `${supabase.anonKey.substring(0, 30)}...${supabase.anonKey.substring(supabase.anonKey.length - 30)}`
    : supabase.anonKey.substring(0, 30) + '...';
  console.log(`🔑 Anon Key in use: ${keyPreview}`);
  console.log(`📏 Key length: ${supabase.anonKey.length} characters`);
  
  // Quick project ref check
  try {
    const jwtParts = supabase.anonKey.split('.');
    if (jwtParts.length === 3) {
      const payload = JSON.parse(atob(jwtParts[1]));
      const jwtProjectRef = payload.ref;
      const urlMatch = supabase.url.match(/https?:\/\/([^.]+)\.supabase\.co/);
      const urlProjectRef = urlMatch ? urlMatch[1] : null;
      
      if (jwtProjectRef && urlProjectRef) {
        if (jwtProjectRef !== urlProjectRef) {
          // CRITICAL: Project mismatch detected - clear cache and force reload
          // BUT: Only log once per page load to avoid spam
          const apiKeyWarningKey = 'api-key-mismatch-warning-shown';
          const shouldLogApiKey = typeof window !== 'undefined' && !sessionStorage.getItem(apiKeyWarningKey);
          
          if (shouldLogApiKey) {
            sessionStorage.setItem(apiKeyWarningKey, 'true');
            console.error('');
            console.error('🚨 CRITICAL: API KEY PROJECT MISMATCH DETECTED!');
            console.error(`   Expected project: ${urlProjectRef}`);
            console.error(`   Key is from project: ${jwtProjectRef}`);
            console.error('   This will cause authentication failures!');
            console.error('');
            console.error('   🔧 Auto-fixing: Clearing localStorage cache...');
          }
          
          // CRITICAL: Don't clear localStorage if we're in OAuth callback
          // Check if URL has OAuth code parameter - if so, don't clear anything!
          const isOAuthCallback = typeof window !== 'undefined' && 
                                  window.location.search.includes('code=');
          
          if (isOAuthCallback) {
            if (shouldLogApiKey) {
              console.error('   ⚠️ OAuth callback detected - NOT clearing localStorage to preserve PKCE code_verifier');
            }
          } else {
            // Clear Supabase-related localStorage entries BUT preserve PKCE code_verifier
            // Supabase stores PKCE as: sb-{project-ref}-auth-token-code-verifier
            const keysToRemove: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
                // Don't remove PKCE code_verifier - it's needed for OAuth callback
                // Check for ALL possible PKCE key formats:
                const isPkceKey = key.includes('code_verifier') || 
                                  key.includes('code-verifier') || 
                                  key.includes('token-code-verifier') ||
                                  key.includes('auth-token-code-verifier') ||
                                  key.includes('auth-code-verifier') ||
                                  key.includes('pkce');
                
                if (!isPkceKey) {
                  keysToRemove.push(key);
                }
              }
            }
            keysToRemove.forEach(key => {
              localStorage.removeItem(key);
              if (shouldLogApiKey) {
                console.error(`   ✅ Removed: ${key}`);
              }
            });
            if (shouldLogApiKey) {
              console.error('   ✅ Cleared localStorage cache (preserved PKCE code_verifier)');
            }
          }
          
          if (shouldLogApiKey) {
            console.error('');
            console.error('   ⚠️ IMPORTANT: Restart dev server to load correct API key!');
            console.error(`   🔗 Get correct key from: https://app.supabase.com/project/${urlProjectRef}/settings/api`);
            console.error('   📝 Update .env.development and restart: npm start');
            console.error('');
            console.error('   ⚠️ Authentication will fail until dev server is restarted!');
            console.error('   (No automatic reload - please restart manually)');
          }
        }
      }
    }
  } catch (e) {
    // Ignore decode errors
  }
} else if (isProduction) {
  // Minimal logging in production - keep errors for debugging
  console.log(`🏭 Running in PRODUCTION mode`);
}

// Note: console.* will be removed by ESLint in production builds
// Keep console.error for critical error reporting


