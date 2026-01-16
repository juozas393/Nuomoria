/**
 * Force reload environment variables from .env.development file
 * This is a workaround for when dev server cache prevents proper env loading
 */

// Only run in browser environment
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // CRITICAL: Check for OAuth callback FIRST - before ANY other logic
  // This must be checked before any other logic to prevent clearing PKCE code_verifier
  // Check both URL search params and pathname to catch all OAuth callback scenarios
  const hasCodeParam = window.location.search.includes('code=');
  const isCallbackPath = window.location.pathname.includes('/auth/callback');
  const isOAuthCallback = hasCodeParam || isCallbackPath;
  
  if (isOAuthCallback) {
    // Do ABSOLUTELY NOTHING during OAuth callback - preserve ALL localStorage
    // This includes PKCE code_verifier which is critical for OAuth flow
    // Just log a warning if needed (but only once to avoid spam)
    const warningKey = 'oauth-callback-warning-shown';
    if (!sessionStorage.getItem(warningKey)) {
      sessionStorage.setItem(warningKey, 'true');
      console.warn('⚠️ OAuth callback detected - preserving ALL localStorage (including PKCE code_verifier)');
      console.warn('   URL:', window.location.href.substring(0, 100));
      console.warn('   Code param present:', hasCodeParam);
      console.warn('   Callback path present:', isCallbackPath);
    }
    // Exit early - don't do ANY localStorage operations during OAuth callback
    // This is critical - even checking localStorage can cause issues
    // DO NOT proceed with any other logic - wrap everything else in else block
  } else {
    // Only check for API key mismatch if NOT in OAuth callback
    const currentKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
    const expectedProjectRef = 'hlcvskkxrnwxtktscpyy';
    
    if (currentKey) {
      try {
        const jwtParts = currentKey.split('.');
        if (jwtParts.length === 3) {
          const payload = JSON.parse(atob(jwtParts[1]));
          const currentProjectRef = payload.ref;
          
          // If project ref doesn't match, we need to reload
          // BUT: Only log in development, and only once per page load to avoid spam
          if (currentProjectRef !== expectedProjectRef) {
            // Check if we've already logged this warning (avoid spam)
            const warningKey = 'api-key-mismatch-warning-shown';
            if (!sessionStorage.getItem(warningKey)) {
              sessionStorage.setItem(warningKey, 'true');
              console.error('🚨 Detected wrong API key in runtime!');
              console.error(`   Current project: ${currentProjectRef}`);
              console.error(`   Expected project: ${expectedProjectRef}`);
              console.error('   This means dev server needs to be restarted!');
              console.error('   Please stop dev server (Ctrl+C) and run: npm start');
            }
            
            // Clear localStorage to prevent using cached session
            // BUT preserve PKCE code_verifier for OAuth callback
            // (We already checked isOAuthCallback above, so we're safe here)
            {
            // Clear localStorage to prevent using cached session
            // BUT preserve PKCE code_verifier for OAuth callback
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
              keysToRemove.forEach(key => localStorage.removeItem(key));
            }
            
            // Log error message (no alert to avoid blocking)
            console.error('');
            console.error('   ⚠️ Please restart dev server to fix this issue:');
            console.error('   1. Stop server (Ctrl+C)');
            console.error('   2. Run: npm start');
            console.error('   3. Hard refresh browser (Ctrl+Shift+R)');
          }
        }
      } catch (e) {
        // Ignore decode errors
      }
    }
  }
}

export {};
