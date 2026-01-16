/**
 * Test Supabase configuration and API key validity
 * This utility helps diagnose authentication issues
 */

import { supabase } from '../lib/supabase';
import { supabase as supabaseConfig } from '../config/environment';

interface TestResult {
  success: boolean;
  message: string;
  details?: any;
}

/**
 * Test if the API key is a valid JWT format
 */
export async function testApiKeyFormat(): Promise<TestResult> {
  // Use verified configuration (handles cache issues automatically)
  const { getVerifiedSupabaseConfig } = await import('../lib/supabase');
  const verifiedConfig = getVerifiedSupabaseConfig();
  const key = verifiedConfig.anonKey;
  
  if (!key) {
    return {
      success: false,
      message: '❌ API key is missing',
    };
  }
  
  if (!key.startsWith('eyJ')) {
    return {
      success: false,
      message: '❌ API key does not look like a valid JWT token',
      details: {
        startsWith: key.substring(0, 10),
        expected: 'eyJ',
      },
    };
  }
  
  // Try to decode JWT (basic check)
  try {
    const parts = key.split('.');
    if (parts.length !== 3) {
      return {
        success: false,
        message: '❌ API key does not have 3 JWT parts',
        details: {
          parts: parts.length,
        },
      };
    }
    
    // Decode header
    const header = JSON.parse(atob(parts[0]));
    const payload = JSON.parse(atob(parts[1]));
    
    return {
      success: true,
      message: '✅ API key format is valid',
      details: {
        header,
        payload: {
          iss: payload.iss,
          ref: payload.ref,
          role: payload.role,
          exp: new Date(payload.exp * 1000).toISOString(),
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      message: '❌ Failed to decode API key',
      details: {
        error: (error as Error).message,
      },
    };
  }
}

/**
 * Test if we can make a request to Supabase API
 */
export async function testSupabaseConnection(): Promise<TestResult> {
  try {
    // Try to get the current session (this will fail if API key is invalid)
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      // Check if it's an API key error
      if (error.message?.includes('Invalid API key') || 
          error.message?.includes('401') ||
          (error as any).status === 401) {
        return {
          success: false,
          message: '❌ API key is invalid or does not match the Supabase project',
          details: {
            error: error.message,
            status: (error as any).status,
            hint: 'The API key might be from a different project or expired',
          },
        };
      }
      
      // Other errors are OK (e.g., no session is normal)
      return {
        success: true,
        message: '✅ Supabase connection is working (no session is normal)',
        details: {
          error: error.message,
        },
      };
    }
    
    return {
      success: true,
      message: '✅ Supabase connection is working',
      details: {
        hasSession: !!data.session,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: '❌ Failed to connect to Supabase',
      details: {
        error: (error as Error).message,
      },
    };
  }
}

/**
 * Test if we can make a request to Supabase REST API
 */
export async function testSupabaseRestApi(): Promise<TestResult> {
  try {
    // Use verified configuration (handles cache issues automatically)
    const { getVerifiedSupabaseConfig } = await import('../lib/supabase');
    const verifiedConfig = getVerifiedSupabaseConfig();
    
    // Try to make a simple REST API call
    // This will fail if API key is invalid
    // Note: Even with a valid anon key, some endpoints may return 401 if RLS is enabled
    // So we'll try a simple endpoint that should work with anon key
    const response = await fetch(`${verifiedConfig.url}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': verifiedConfig.anonKey,
        'Authorization': `Bearer ${verifiedConfig.anonKey}`,
      },
    });
    
    if (response.status === 401) {
      // Try to get more details from the response
      let errorDetails = '';
      try {
        const errorText = await response.text();
        if (errorText) {
          errorDetails = errorText.substring(0, 200);
        }
      } catch {
        // Ignore errors reading response
      }
      
      return {
        success: false,
        message: '❌ API key is invalid for REST API',
        details: {
          status: response.status,
          statusText: response.statusText,
          errorDetails: errorDetails || 'No additional error details',
          hint: 'This usually means the API key does not match your Supabase project. Please verify the key in Supabase Dashboard.',
        },
      };
    }
    
    return {
      success: true,
      message: '✅ REST API connection is working',
      details: {
        status: response.status,
        statusText: response.statusText,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: '❌ Failed to connect to Supabase REST API',
      details: {
        error: (error as Error).message,
      },
    };
  }
}

/**
 * Test if the redirect URL is correct
 */
export function testRedirectUrl(): TestResult {
  const currentUrl = window.location.origin;
  const expectedCallbackUrl = `${currentUrl}/auth/callback`;
  
  return {
    success: true,
    message: '✅ Redirect URL configuration',
    details: {
      currentOrigin: currentUrl,
      expectedCallbackUrl,
      note: 'Make sure this URL is whitelisted in Supabase Dashboard → Authentication → URL Configuration',
    },
  };
}

/**
 * Run all tests and return comprehensive report
 */
export async function testSupabaseConfiguration(): Promise<{
  allPassed: boolean;
  results: Array<{ name: string; result: TestResult }>;
}> {
  const results: Array<{ name: string; result: TestResult }> = [];
  
  // Test 1: API key format
  results.push({
    name: 'API Key Format',
    result: await testApiKeyFormat(),
  });
  
  // Test 2: Supabase connection
  results.push({
    name: 'Supabase Connection',
    result: await testSupabaseConnection(),
  });
  
  // Test 3: REST API
  results.push({
    name: 'REST API',
    result: await testSupabaseRestApi(),
  });
  
  // Test 4: Redirect URL
  results.push({
    name: 'Redirect URL',
    result: testRedirectUrl(),
  });
  
  const allPassed = results.every(r => r.result.success);
  
  return {
    allPassed,
    results,
  };
}

/**
 * Decode JWT to extract project reference
 */
function decodeJWTProjectRef(jwt: string): { ref: string | null; exp: string | null; valid: boolean } {
  try {
    const parts = jwt.split('.');
    if (parts.length !== 3) {
      return { ref: null, exp: null, valid: false };
    }
    const payload = JSON.parse(atob(parts[1]));
    return {
      ref: payload.ref || null,
      exp: payload.exp ? new Date(payload.exp * 1000).toISOString() : null,
      valid: true,
    };
  } catch {
    return { ref: null, exp: null, valid: false };
  }
}

/**
 * Log test results to console
 */
export async function logSupabaseConfigurationTest(): Promise<void> {
  console.log('🔍 Testing Supabase Configuration...');
  console.log('');
  
  // Use verified configuration (handles cache issues automatically)
  const { getVerifiedSupabaseConfig } = await import('../lib/supabase');
  const verifiedConfig = getVerifiedSupabaseConfig();
  
  // First, decode the JWT to show project reference
  const key = verifiedConfig.anonKey;
  const jwtInfo = decodeJWTProjectRef(key);
  const urlMatch = verifiedConfig.url.match(/https?:\/\/([^.]+)\.supabase\.co/);
  const urlProjectRef = urlMatch ? urlMatch[1] : null;
  
  console.log('📋 API Key Analysis:');
  console.log('   Key length:', key.length);
  console.log('   Key starts with:', key.substring(0, 30) + '...');
  if (jwtInfo.valid) {
    console.log('   ✅ JWT is valid');
    if (jwtInfo.ref) {
      console.log('   Project ref in JWT:', jwtInfo.ref);
      if (urlProjectRef) {
        if (jwtInfo.ref === urlProjectRef) {
          console.log('   ✅ Project ref matches URL project ref');
        } else {
          console.log('   ❌ PROJECT REF MISMATCH!');
          console.log('      URL project ref:', urlProjectRef);
          console.log('      JWT project ref: ', jwtInfo.ref);
          console.log('      ⚠️ This API key is from a DIFFERENT Supabase project!');
        }
      }
    }
    if (jwtInfo.exp) {
      const expiresAt = new Date(jwtInfo.exp);
      const now = new Date();
      if (expiresAt > now) {
        const daysUntilExpiry = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        console.log('   Expires at:', jwtInfo.exp);
        console.log('   Days until expiry:', daysUntilExpiry);
      } else {
        console.log('   ⚠️ Key has EXPIRED!');
        console.log('   Expired at:', jwtInfo.exp);
      }
    }
  } else {
    console.log('   ❌ JWT is invalid');
  }
  console.log('');
  
  const { allPassed, results } = await testSupabaseConfiguration();
  
  results.forEach(({ name, result }) => {
    console.log(`${result.success ? '✅' : '❌'} ${name}: ${result.message}`);
    if (result.details && process.env.NODE_ENV === 'development') {
      console.log('   Details:', result.details);
    }
  });
  
  console.log('');
  
  // Check if there's a project ref mismatch
  const hasProjectMismatch = jwtInfo.valid && jwtInfo.ref && urlProjectRef && jwtInfo.ref !== urlProjectRef;
  
  if (allPassed && !hasProjectMismatch) {
    console.log('✅ All tests passed!');
  } else {
    if (hasProjectMismatch) {
      console.log('');
      console.log('🚨 CRITICAL ERROR: API KEY FROM WRONG PROJECT!');
      console.log('');
      console.log('   Your current API key is from project: ' + jwtInfo.ref);
      console.log('   But your Supabase URL is for project: ' + urlProjectRef);
      console.log('');
      console.log('   ⚠️ You MUST get the anon key from the CORRECT project!');
      console.log('');
    } else {
      console.log('❌ Some tests failed. Please check the details above.');
      console.log('');
      console.log('📝 CRITICAL: The API key is being rejected by Supabase.');
      console.log('   This means the key in .env.development does NOT match your Supabase project.');
    }
    console.log('');
    console.log('🔧 Step-by-step fix:');
    console.log('   1. Open: https://app.supabase.com/project/' + urlProjectRef + '/settings/api');
    console.log('      ⚠️ Make sure you are in the project: ' + urlProjectRef);
    console.log('   2. Find the "Project API keys" section');
    console.log('   3. Copy the "anon" "public" key (NOT service_role!)');
    console.log('   4. Open: property-manager/.env.development');
    console.log('   5. Replace REACT_APP_SUPABASE_ANON_KEY with the copied key');
    console.log('   6. Verify the key starts with "eyJ" and is about 200+ characters');
    if (hasProjectMismatch) {
      console.log('   7. ⚠️ IMPORTANT: After copying, verify the JWT project ref matches: ' + urlProjectRef);
    }
    console.log('   8. Check Redirect URLs: https://app.supabase.com/project/' + urlProjectRef + '/auth/url-configuration');
    console.log('      → Make sure "http://localhost:3000/auth/callback" is in the list');
    console.log('   9. Restart dev server: Stop (Ctrl+C) and run "npm start" again');
    console.log('');
    console.log('⚠️ IMPORTANT: After updating .env.development, you MUST restart the dev server!');
  }
}
