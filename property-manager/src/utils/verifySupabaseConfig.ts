/**
 * Verify Supabase configuration by comparing with provided values
 */

import { supabase as supabaseConfig } from '../config/environment';

interface VerificationResult {
  urlMatches: boolean;
  keyMatches: boolean;
  keyValid: boolean;
  details: {
    configuredUrl: string;
    providedUrl: string;
    configuredKeyLength: number;
    providedKeyLength: number;
    keyStartsWith: string;
    keyExpiresAt?: string;
    keyProjectRef?: string;
  };
}

/**
 * Verify Supabase configuration against provided values
 */
export function verifySupabaseConfig(
  providedUrl: string,
  providedKey: string
): VerificationResult {
  const configuredUrl = supabaseConfig.url.trim();
  const providedUrlTrimmed = providedUrl.trim();
  const configuredKey = supabaseConfig.anonKey;
  
  // Check URL match
  const urlMatches = configuredUrl === providedUrlTrimmed;
  
  // Check key match
  const keyMatches = configuredKey === providedKey;
  
  // Validate key format
  let keyValid = false;
  let keyExpiresAt: string | undefined;
  let keyProjectRef: string | undefined;
  
  if (providedKey.startsWith('eyJ')) {
    try {
      const parts = providedKey.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        keyValid = true;
        if (payload.exp) {
          keyExpiresAt = new Date(payload.exp * 1000).toISOString();
        }
        if (payload.ref) {
          keyProjectRef = payload.ref;
        }
      }
    } catch (error) {
      // Invalid JWT
    }
  }
  
  return {
    urlMatches,
    keyMatches,
    keyValid,
    details: {
      configuredUrl,
      providedUrl: providedUrlTrimmed,
      configuredKeyLength: configuredKey.length,
      providedKeyLength: providedKey.length,
      keyStartsWith: providedKey.substring(0, 30) + '...',
      keyExpiresAt,
      keyProjectRef,
    },
  };
}

/**
 * Log verification results
 */
export function logVerificationResults(
  providedUrl: string,
  providedKey: string
): void {
  console.log('🔍 Verifying Supabase Configuration...');
  console.log('');
  
  const result = verifySupabaseConfig(providedUrl, providedKey);
  
  console.log('📋 Configuration Comparison:');
  console.log('');
  
  // URL check
  if (result.urlMatches) {
    console.log('✅ URL matches:', result.details.configuredUrl);
  } else {
    console.log('❌ URL mismatch!');
    console.log('   Configured:', result.details.configuredUrl);
    console.log('   Provided:  ', result.details.providedUrl);
  }
  
  console.log('');
  
  // Key check
  if (result.keyMatches) {
    console.log('✅ API Key matches');
    console.log('   Key length:', result.details.configuredKeyLength);
    console.log('   Key starts:', result.details.keyStartsWith);
  } else {
    console.log('❌ API Key mismatch!');
    console.log('   Configured length:', result.details.configuredKeyLength);
    console.log('   Provided length:  ', result.details.providedKeyLength);
    console.log('   Configured starts:', supabaseConfig.anonKey.substring(0, 30) + '...');
    console.log('   Provided starts:  ', result.details.keyStartsWith);
  }
  
  console.log('');
  
  // Key validity
  if (result.keyValid) {
    console.log('✅ API Key format is valid (JWT)');
    if (result.details.keyProjectRef) {
      console.log('   Project ref in key:', result.details.keyProjectRef);
      // Extract project ref from URL
      const urlMatch = result.details.configuredUrl.match(/https?:\/\/([^.]+)\.supabase\.co/);
      const urlProjectRef = urlMatch ? urlMatch[1] : null;
      if (urlProjectRef && result.details.keyProjectRef !== urlProjectRef) {
        console.log('   ⚠️ WARNING: Project ref mismatch!');
        console.log('      URL project ref:', urlProjectRef);
        console.log('      Key project ref: ', result.details.keyProjectRef);
        console.log('      This means the API key is from a different Supabase project!');
      } else if (urlProjectRef && result.details.keyProjectRef === urlProjectRef) {
        console.log('   ✅ Project ref matches URL');
      }
    }
    if (result.details.keyExpiresAt) {
      const expiresAt = new Date(result.details.keyExpiresAt);
      const now = new Date();
      if (expiresAt > now) {
        const daysUntilExpiry = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        console.log('   Expires at:', result.details.keyExpiresAt);
        console.log('   Days until expiry:', daysUntilExpiry);
      } else {
        console.log('   ⚠️ Key has expired!');
        console.log('   Expired at:', result.details.keyExpiresAt);
      }
    }
  } else {
    console.log('❌ API Key format is invalid (not a valid JWT)');
  }
  
  console.log('');
  
  if (result.urlMatches && result.keyMatches && result.keyValid) {
    console.log('✅ All checks passed! Configuration is correct.');
  } else {
    console.log('❌ Configuration mismatch detected!');
    console.log('');
    console.log('📝 To fix:');
    if (!result.urlMatches) {
      console.log('   1. Update REACT_APP_SUPABASE_URL in .env.development');
    }
    if (!result.keyMatches) {
      console.log('   2. Update REACT_APP_SUPABASE_ANON_KEY in .env.development');
    }
    if (!result.keyValid) {
      console.log('   3. Make sure the API key is a valid JWT token');
    }
    console.log('   4. Restart the dev server (npm start)');
  }
}
