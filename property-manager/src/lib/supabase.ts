import { createClient } from '@supabase/supabase-js';
import { supabase as supabaseConfig } from '../config/environment';

// Validate configuration before creating client
if (!supabaseConfig.url || !supabaseConfig.anonKey) {
  const errorMsg = '❌ Supabase configuration is missing! Please check your .env file.';
  console.error(errorMsg);
  console.error('   URL:', supabaseConfig.url || 'MISSING');
  console.error('   Anon Key:', supabaseConfig.anonKey ? `${supabaseConfig.anonKey.substring(0, 20)}...` : 'MISSING');
  throw new Error(errorMsg);
}

// Validate anon key format (should be a JWT token, starts with eyJ)
if (!supabaseConfig.anonKey.startsWith('eyJ')) {
  console.warn('⚠️ Supabase anon key does not look like a valid JWT token');
  console.warn('   Anon key should start with "eyJ" (base64 encoded JWT)');
  console.warn('   Current key starts with:', supabaseConfig.anonKey.substring(0, 10));
}

// CRITICAL: Verify project ref match and fix automatically if needed
// This ensures we're using the correct API key for the project
let verifiedAnonKey = supabaseConfig.anonKey;
let verifiedUrl = supabaseConfig.url;

// Expected correct configuration for project hlcvskkxrnwxtktscpyy
const CORRECT_URL = 'https://hlcvskkxrnwxtktscpyy.supabase.co';
const CORRECT_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsY3Zza2t4cm53eHRrdHNjcHl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4MzM1MDcsImV4cCI6MjA3MDQwOTUwN30.7tV1GsLkTPJnYrl7r73QBhD8-yImgbCK0MNYBPcAmHM';

try {
  const jwtParts = supabaseConfig.anonKey.split('.');
  if (jwtParts.length === 3) {
    const payload = JSON.parse(atob(jwtParts[1]));
    const jwtProjectRef = payload.ref;
    const urlMatch = supabaseConfig.url.match(/https?:\/\/([^.]+)\.supabase\.co/);
    const urlProjectRef = urlMatch ? urlMatch[1] : null;
    
    // If project refs don't match, use correct key as fallback (development only)
    if (jwtProjectRef && urlProjectRef && jwtProjectRef !== urlProjectRef) {
      // Only log once per page load to avoid spam
      const warningKey = 'supabase-api-key-mismatch-warning-shown';
      const shouldLog = typeof window !== 'undefined' && !sessionStorage.getItem(warningKey);
      
      if (shouldLog) {
        sessionStorage.setItem(warningKey, 'true');
        console.error('');
        console.error('🚨 CRITICAL: API KEY PROJECT MISMATCH DETECTED!');
        console.error(`   URL project: ${urlProjectRef}`);
        console.error(`   Key project: ${jwtProjectRef}`);
        console.error('   This means dev server is using cached environment variables!');
        console.error('');
        console.error('   🔧 AUTO-FIXING: Using correct API key from fallback...');
      }
      
      // Use correct key as fallback (only in development)
      if (process.env.NODE_ENV === 'development' && urlProjectRef === 'hlcvskkxrnwxtktscpyy') {
        verifiedAnonKey = CORRECT_ANON_KEY;
        verifiedUrl = CORRECT_URL;
        if (shouldLog) {
          console.error('   ✅ Using correct API key from fallback');
          console.error('   ⚠️ This is a temporary fix - restart dev server to load from .env.development');
        }
      }
      
      // CRITICAL: Check for OAuth callback FIRST - before any localStorage operations
      // This must be checked before any other logic to prevent clearing PKCE code_verifier
      const isOAuthCallback = typeof window !== 'undefined' && (
        window.location.search.includes('code=') || 
        window.location.pathname.includes('/auth/callback')
      );
      
      // If we're in OAuth callback, skip all localStorage operations
      if (isOAuthCallback) {
        // Do nothing - preserve all localStorage including PKCE code_verifier
        // Just log a warning if needed (but only once to avoid spam)
        const oauthWarningKey = 'oauth-callback-warning-shown';
        if (!sessionStorage.getItem(oauthWarningKey)) {
          sessionStorage.setItem(oauthWarningKey, 'true');
          console.warn('⚠️ OAuth callback detected - preserving all localStorage (including PKCE code_verifier)');
        }
      } else {
        // Clear Supabase-related localStorage entries BUT preserve PKCE code_verifier
        // PKCE code_verifier is needed for OAuth callback to work
        // Supabase stores it as: sb-{project-ref}-auth-code-verifier
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
        });
        
        if (process.env.NODE_ENV === 'development') {
          // Log preserved keys for debugging
          const preservedKeys: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) {
              const isPkceKey = key.includes('code_verifier') || 
                                key.includes('code-verifier') || 
                                key.includes('token-code-verifier') ||
                                key.includes('auth-token-code-verifier') ||
                                key.includes('auth-code-verifier') ||
                                key.includes('pkce');
              if (isPkceKey) {
                preservedKeys.push(key);
              }
            }
          }
          if (preservedKeys.length > 0) {
            if (shouldLog) {
              console.error('   ✅ Preserved PKCE keys:', preservedKeys);
            }
          } else {
            if (shouldLog) {
              console.warn('   ⚠️ No PKCE code_verifier found in localStorage');
            }
          }
        }
        if (shouldLog) {
          console.error('   ✅ Cleared localStorage cache');
        }
      }
      
      if (shouldLog) {
        console.error('');
        console.error('   📝 IMPORTANT: Restart dev server to load from .env.development:');
        console.error('   1. Stop dev server (Ctrl+C)');
        console.error('   2. Clear cache: Remove-Item -Recurse -Force node_modules' + '/.cache');
        console.error('   3. Restart: npm start');
        console.error('   4. Hard refresh browser: Ctrl+Shift+R');
        console.error('');
      }
    }
  }
} catch (e) {
  // Ignore JWT decode errors - will be caught by Supabase client validation
}

if (process.env.NODE_ENV === 'development') {
  console.log('🔧 Initializing Supabase client...');
  console.log('   URL:', verifiedUrl);
  console.log('   Anon Key present:', !!verifiedAnonKey);
  console.log('   Anon Key length:', verifiedAnonKey.length);
  console.log('   Anon Key preview:', verifiedAnonKey.substring(0, 30) + '...');
  
  // Verify the key being used
  try {
    const jwtParts = verifiedAnonKey.split('.');
    if (jwtParts.length === 3) {
      const payload = JSON.parse(atob(jwtParts[1]));
      const jwtProjectRef = payload.ref;
      const urlMatch = verifiedUrl.match(/https?:\/\/([^.]+)\.supabase\.co/);
      const urlProjectRef = urlMatch ? urlMatch[1] : null;
      
      if (jwtProjectRef && urlProjectRef) {
        if (jwtProjectRef === urlProjectRef) {
          console.log('   ✅ Project ref verification: MATCH (' + jwtProjectRef + ')');
        } else {
          console.warn('   ⚠️ Project ref mismatch (using fallback key)');
          console.warn('      URL project ref: ' + urlProjectRef);
          console.warn('      JWT project ref: ' + jwtProjectRef);
        }
      }
    }
  } catch (e) {
    // Ignore decode errors
  }
}

// Use verified configuration (will be same as supabaseConfig if no mismatch)
export const supabase = createClient(verifiedUrl, verifiedAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,         // <-- svarbu
    detectSessionInUrl: true,     // <-- automatiškai aptinka sesiją iš URL hash
    storage: window.localStorage, // <-- laikom sesiją
    flowType: 'pkce',            // <-- naudoti PKCE flow (saugiau)
  },
});

// Export verified configuration for direct use (e.g., in Login.tsx)
export const getVerifiedSupabaseConfig = () => ({
  url: verifiedUrl,
  anonKey: verifiedAnonKey,
});

// Intercept fetch to suppress 401 errors from Supabase when user is not logged in
// This prevents console noise for expected 401 responses
const originalFetch = window.fetch;
let last401WarningTime = 0;
const WARNING_DEBOUNCE_MS = 2000; // Only log 401 warning once per 2 seconds

window.fetch = async (...args) => {
  const response = await originalFetch(...args);
  
  // Check if this is a Supabase request with 401 error
  let url = '';
  if (typeof args[0] === 'string') url = args[0];
  else if (args[0] instanceof URL) url = args[0].toString();
  else if (args[0] instanceof Request) url = args[0].url;
  
  // Only intercept Supabase auth/rest calls
  if (response.status === 401 && url.includes(supabaseConfig.url)) {
    // Check if we're in the middle of OAuth callback (session is being set)
    // Don't clear session if we're on the callback page or have tokens in URL hash/query
    const isOAuthCallback = window.location.pathname.includes('/auth/callback');
    const hasTokenInHash = window.location.hash.includes('access_token');
    const hasCodeInQuery = window.location.search.includes('code=');
    
    // If we're setting up a session (OAuth callback), don't interfere
    // This is important for PKCE flow where we exchange code for session
    if (isOAuthCallback && (hasTokenInHash || hasCodeInQuery)) {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔧 OAuth callback in progress, ignoring 401 error');
      }
      return response; // Silently ignore 401 during OAuth callback
    }
    
    // 401 on Supabase endpoints is normal when user is not logged in
    // Check if there's a stored Supabase session that might be invalid
    const supabaseKeys = Object.keys(localStorage).filter(key => 
      key.startsWith('sb-') || key.includes('supabase.auth')
    );
    
    // If there's no stored session, it's a normal 401 for a non-logged-in user.
    // We don't need to log this as a warning.
    if (supabaseKeys.length === 0) {
      return response; // Silently ignore
    }

    // If there is a stored session, but we're getting 401, it's an invalid session.
    // However, wait a bit to ensure it's not just a timing issue during session setup
    // Check if session was recently set (within last 5 seconds)
    let recentlySetSession = false;
    try {
      const urlMatch = supabaseConfig.url.match(/https?:\/\/([^.]+)\.supabase\.co/);
      const projectRef = urlMatch ? urlMatch[1] : 'unknown';
      const storageKey = `sb-${projectRef}-auth-token`;
      const storedSession = localStorage.getItem(storageKey);
      if (storedSession) {
        try {
          const sessionData = JSON.parse(storedSession);
          // Check if session was set recently (within last 5 seconds)
          const sessionTimestamp = sessionData.timestamp || 0;
          recentlySetSession = (Date.now() - sessionTimestamp) < 5000;
        } catch {
          // Ignore parsing errors
        }
      }
    } catch {
      // Ignore errors checking session timestamp
    }
    
    // If session was recently set, don't clear it yet - might be a timing issue
    if (recentlySetSession) {
      return response; // Silently ignore 401 for recently set sessions
    }

    // Log a warning (debounced) and clear it.
    const now = Date.now();
    const shouldLogWarning = (now - last401WarningTime) > WARNING_DEBOUNCE_MS;
    
    if (shouldLogWarning && process.env.NODE_ENV === 'development') {
      last401WarningTime = now;
      console.warn('⚠️ Invalid Supabase session detected - clearing local storage and signing out.');
      console.log('   This usually happens if your session expired or was revoked.');
      console.log('   Please log in again.');
    }
    
    // Clear invalid session asynchronously (don't block the response)
    // This will trigger onAuthStateChange -> SIGNED_OUT -> localStorage.clear()
    setTimeout(async () => {
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch (error) {
        // Ignore errors during sign out
      }
    }, 0);
  }
  
  return response;
};

// Security: Remove debug exposure in production
if (process.env.NODE_ENV === 'development') {
  // @ts-expect-error
  window.__supabase = supabase;
}

// Note: RLS is now handled by Supabase JWT + users table role
// No need for manual context setting

// Database types
export type Property = Database['public']['Tables']['properties']['Row'];
export type Database = {
  public: {
    Tables: {
      properties: {
        Row: {
          id: string
          address: string
          apartment_number: string
          tenant_name: string
          phone: string | null
          email: string | null
          rent: number
          area: number | null
          rooms: number | null
          status: 'occupied' | 'vacant' | 'maintenance'
          contract_start: string
          contract_end: string
          tenant_response: 'wants_to_renew' | 'does_not_want_to_renew' | 'no_response' | null
          tenant_response_date?: string | null
          planned_move_out_date: string | null
          move_out_notice_date?: string | null
          deposit_amount: number
          deposit_paid_amount: number
          deposit_paid: boolean
          deposit_returned: boolean
          deposit_deductions: number
          bedding_owner: 'tenant' | 'landlord' | null
          bedding_fee_paid: boolean
          cleaning_required: boolean
          cleaning_cost: number
          last_notification_sent: string | null
          notification_count: number
          original_contract_duration_months: number
          auto_renewal_enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          address: string
          apartment_number: string
          tenant_name: string
          phone?: string | null
          email?: string | null
          rent: number
          area?: number | null
          rooms?: number | null
          status?: 'occupied' | 'vacant' | 'maintenance'
          contract_start: string
          contract_end: string
          tenant_response?: 'wants_to_renew' | 'does_not_want_to_renew' | 'no_response' | null
          tenant_response_date?: string | null
          planned_move_out_date?: string | null
          move_out_notice_date?: string | null
          deposit_amount?: number
          deposit_paid_amount?: number
          deposit_paid?: boolean
          deposit_returned?: boolean
          deposit_deductions?: number
          bedding_owner?: 'tenant' | 'landlord' | null
          bedding_fee_paid?: boolean
          cleaning_required?: boolean
          cleaning_cost?: number
          last_notification_sent?: string | null
          notification_count?: number
          original_contract_duration_months?: number
          auto_renewal_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          address?: string
          apartment_number?: string
          tenant_name?: string
          phone?: string | null
          email?: string | null
          rent?: number
          area?: number | null
          rooms?: number | null
          status?: 'occupied' | 'vacant' | 'maintenance'
          contract_start?: string
          contract_end?: string
          tenant_response?: 'wants_to_renew' | 'does_not_want_to_renew' | 'no_response' | null
          tenant_response_date?: string | null
          planned_move_out_date?: string | null
          move_out_notice_date?: string | null
          deposit_amount?: number
          deposit_paid_amount?: number
          deposit_paid?: boolean
          deposit_returned?: boolean
          deposit_deductions?: number
          bedding_owner?: 'tenant' | 'landlord' | null
          bedding_fee_paid?: boolean
          cleaning_required?: boolean
          cleaning_cost?: number
          last_notification_sent?: string | null
          notification_count?: number
          original_contract_duration_months?: number
          auto_renewal_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      meter_readings: {
        Row: {
          id: string
          property_id: string
          meter_id: string | null
          meter_type: 'address' | 'apartment'
          type: 'electricity' | 'water' | 'heating' | 'internet' | 'garbage' | 'gas'
          reading_date: string
          previous_reading: number | null
          current_reading: number
          consumption: number
          price_per_unit: number
          total_sum: number | null
          amount: number | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          property_id: string
          meter_id?: string | null
          meter_type: 'address' | 'apartment'
          type: 'electricity' | 'water' | 'heating' | 'internet' | 'garbage' | 'gas'
          reading_date: string
          previous_reading?: number | null
          current_reading: number
          price_per_unit: number
          total_sum?: number | null
          amount?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          property_id?: string
          meter_id?: string | null
          meter_type?: 'address' | 'apartment'
          type?: 'electricity' | 'water' | 'heating' | 'internet' | 'garbage' | 'gas'
          reading_date?: string
          previous_reading?: number | null
          current_reading?: number
          price_per_unit?: number
          total_sum?: number | null
          amount?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      property_meter_configs: {
        Row: {
          id: string
          property_id: string
          meter_type: 'electricity' | 'water_cold' | 'water_hot' | 'gas' | 'heating' | 'internet' | 'garbage' | 'custom'
          custom_name: string | null
          unit: 'm3' | 'kWh' | 'GJ' | 'MB' | 'fixed'
          tariff: 'single' | 'day_night' | 'peak_offpeak'
          price_per_unit: number
          fixed_price: number | null
          initial_reading: number | null
          initial_date: string | null
          require_photo: boolean
          require_serial: boolean
          serial_number: string | null
          provider: string | null
          status: 'active' | 'inactive' | 'maintenance'
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          property_id: string
          meter_type: 'electricity' | 'water_cold' | 'water_hot' | 'gas' | 'heating' | 'internet' | 'garbage' | 'custom'
          custom_name?: string | null
          unit: 'm3' | 'kWh' | 'GJ' | 'MB' | 'fixed'
          tariff?: 'single' | 'day_night' | 'peak_offpeak'
          price_per_unit: number
          fixed_price?: number | null
          initial_reading?: number | null
          initial_date?: string | null
          require_photo?: boolean
          require_serial?: boolean
          serial_number?: string | null
          provider?: string | null
          status?: 'active' | 'inactive' | 'maintenance'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          property_id?: string
          meter_type?: 'electricity' | 'water_cold' | 'water_hot' | 'gas' | 'heating' | 'internet' | 'garbage' | 'custom'
          custom_name?: string | null
          unit?: 'm3' | 'kWh' | 'GJ' | 'MB' | 'fixed'
          tariff?: 'single' | 'day_night' | 'peak_offpeak'
          price_per_unit?: number
          fixed_price?: number | null
          initial_reading?: number | null
          initial_date?: string | null
          require_photo?: boolean
          require_serial?: boolean
          serial_number?: string | null
          provider?: string | null
          status?: 'active' | 'inactive' | 'maintenance'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      invoices: {
        Row: {
          id: string
          property_id: string
          invoice_number: string
          invoice_date: string
          due_date: string
          amount: number
          rent_amount: number
          utilities_amount: number
          other_amount: number
          status: 'paid' | 'unpaid' | 'overdue' | 'cancelled'
          paid_date: string | null
          payment_method: 'cash' | 'bank_transfer' | 'card' | 'check' | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          property_id: string
          invoice_number: string
          invoice_date: string
          due_date: string
          amount: number
          rent_amount: number
          utilities_amount?: number
          other_amount?: number
          status: 'paid' | 'unpaid' | 'overdue' | 'cancelled'
          paid_date?: string | null
          payment_method?: 'cash' | 'bank_transfer' | 'card' | 'check' | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          property_id?: string
          invoice_number?: string
          invoice_date?: string
          due_date?: string
          amount?: number
          rent_amount?: number
          utilities_amount?: number
          other_amount?: number
          status?: 'paid' | 'unpaid' | 'overdue' | 'cancelled'
          paid_date?: string | null
          payment_method?: 'cash' | 'bank_transfer' | 'card' | 'check' | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      tenants: {
        Row: {
          id: string
          name: string
          email: string | null
          phone: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      user_meter_templates: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          mode: 'individual' | 'communal'
          unit: 'm3' | 'kWh' | 'GJ' | 'Kitas'
          price_per_unit: number
          distribution_method: 'per_apartment' | 'per_area' | 'per_person' | 'per_consumption' | 'fixed_split'
          requires_photo: boolean
          icon: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          mode: 'individual' | 'communal'
          unit: 'm3' | 'kWh' | 'GJ' | 'Kitas'
          price_per_unit?: number
          distribution_method: 'per_apartment' | 'per_area' | 'per_person' | 'per_consumption' | 'fixed_split'
          requires_photo?: boolean
          icon?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          mode?: 'individual' | 'communal'
          unit?: 'm3' | 'kWh' | 'GJ' | 'Kitas'
          price_per_unit?: number
          distribution_method?: 'per_apartment' | 'per_area' | 'per_person' | 'per_consumption' | 'fixed_split'
          requires_photo?: boolean
          icon?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      user_hidden_meter_templates: {
        Row: {
          user_id: string
          template_id: string
          created_at: string
        }
        Insert: {
          user_id: string
          template_id: string
          created_at?: string
        }
        Update: {
          user_id?: string
          template_id?: string
          created_at?: string
        }
      }
      tenant_invitations: {
        Row: {
          id: string
          property_id: string
          email: string
          full_name: string | null
          phone: string | null
          contract_start: string | null
          contract_end: string | null
          rent: number | null
          deposit: number | null
          status: 'pending' | 'accepted' | 'declined'
          token: string
          invited_by: string | null
          invited_by_email: string | null
          property_label: string | null
          created_at: string
          responded_at: string | null
        }
        Insert: {
          id?: string
          property_id: string
          email: string
          full_name?: string | null
          phone?: string | null
          contract_start?: string | null
          contract_end?: string | null
          rent?: number | null
          deposit?: number | null
          status?: 'pending' | 'accepted' | 'declined'
          token?: string
          invited_by?: string | null
          invited_by_email?: string | null
          property_label?: string | null
          created_at?: string
          responded_at?: string | null
        }
        Update: {
          id?: string
          property_id?: string
          email?: string
          full_name?: string | null
          phone?: string | null
          contract_start?: string | null
          contract_end?: string | null
          rent?: number | null
          deposit?: number | null
          status?: 'pending' | 'accepted' | 'declined'
          token?: string
          invited_by?: string | null
          invited_by_email?: string | null
          property_label?: string | null
          created_at?: string
          responded_at?: string | null
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          kind: string
          title: string
          body: string | null
          data: Record<string, unknown>
          is_read: boolean
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          kind: string
          title: string
          body?: string | null
          data?: Record<string, unknown>
          is_read?: boolean
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          kind?: string
          title?: string
          body?: string | null
          data?: Record<string, unknown>
          is_read?: boolean
          read_at?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 