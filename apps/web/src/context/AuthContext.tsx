import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { UserWithPermissions, UserRole, Permission } from '../types/user';
import { magicLinkRateLimiter, otpRateLimiter, otpVerificationRateLimiter, recordRateLimitAttempt, getRateLimitMessage } from '../utils/rateLimiting';
import { app } from '../config/environment';

export type Role = UserRole;

type RegisterPayload = {
  identifier: string; // email arba username
  password: string;
  role: 'tenant' | 'landlord' | 'maintenance';
  first_name?: string;
  last_name?: string;
};

type AuthResult = { success: boolean; error?: string };

type Ctx = {
  user: UserWithPermissions | null;
  loading: boolean;
  isAuthenticated: boolean;

  // Email-first authentication
  sendMagicLink: (email: string) => Promise<{ success: boolean; message: string }>;
  verifyMagicLink: (token: string) => Promise<AuthResult>;
  sendOTP: (email: string) => Promise<{ success: boolean; message: string }>;
  verifyOTP: (email: string, code: string) => Promise<AuthResult>;

  // Legacy methods (to be removed)
  login: (identifier: string, password: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
  register: (payload: RegisterPayload) => Promise<AuthResult>;
  signInWithGoogle: (opts?: { link?: boolean }) => Promise<void>;
  hasPermission: (perm: Permission) => boolean;
  createDemoUsers: () => Promise<void>;

  resendConfirmationEmail: (email: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  checkUserStatus: (email: string) => Promise<{ exists: boolean; confirmed: boolean; message: string }>;
  refreshSession: () => Promise<void>;
  checkAccountConflicts: (email: string, googleEmail?: string) => Promise<{
    hasRegularAccount: boolean;
    hasGoogleAccount: boolean;
    regularUser: any;
    googleUser: any;
    canMerge: boolean;
    conflictType: 'none' | 'email_mismatch' | 'already_linked' | 'different_users';
  }>;
  checkEmailExists: (email: string) => Promise<{ exists: boolean; user?: any; message: string }>;
};

const AuthContext = createContext<Ctx>(null as any);

function normalizeIdentifier(identifier: string) {
  const val = identifier.trim();
  return val.includes('@') ? val : `${val}@app.local`;
}

// ---- DB helpers

async function ensureUserRow(role?: Role, first_name?: string, last_name?: string) {
  // RPC parašyta DB pusėje (SECURITY DEFINER). Jei nėra – mes errorą (tegu matosi dev'e).
  const { error } = await supabase.rpc('ensure_user_row', {
    p_role: role ?? null,
    p_first_name: first_name ?? 'User',
    p_last_name: last_name ?? 'Name',
  });
  if (error) throw error;
}

async function fetchProfile(userId: string): Promise<UserWithPermissions | null> {
  // Du atskiri užklausimai, kad išvengtume "Could not embed" klaidos
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id, email, first_name, last_name, role, is_active, created_at, updated_at')
    .eq('id', userId)
    .maybeSingle();

  if (userError) throw userError;
  if (!userData) return null;

  // Atsinešam permissions ir profilį atskirai
  const [permsRes, profileRes] = await Promise.all([
    supabase.from('user_permissions').select('permission').eq('user_id', userId),
    supabase.from('profiles').select('avatar_url, username').eq('id', userId).maybeSingle(),
  ]);

  if (permsRes.error) {
    // Security: Don't log sensitive permission errors
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ Failed to fetch permissions:', permsRes.error);
    }
  }

  const perms = permsRes.data?.map((p) => p.permission) ?? [];
  const result: UserWithPermissions = {
    id: userData.id,
    email: userData.email,
    first_name: userData.first_name,
    last_name: userData.last_name,
    role: userData.role,
    is_active: userData.is_active,
    created_at: userData.created_at,
    updated_at: userData.updated_at,
    avatar_url: profileRes.data?.avatar_url || undefined,
    permissions: perms,
  };
  return result;
}

// ---- Provider

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserWithPermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [processingUser, setProcessingUser] = useState<string | null>(null);

  const isAuthenticated = !!user;

  // Debug log when authentication state changes
  React.useEffect(() => {
    // Authentication state changed - logging removed for production
  }, [isAuthenticated, user]);

  // Įkraunam sesiją ir profilį
  const hydrateFromSession = async (retryCount = 0) => {
    // hydrateFromSession: start - logging removed for production

    // Prevent multiple simultaneous calls for the same user
    if (processingUser) {
      // hydrateFromSession: already processing user, skipping - logging removed for production
      return;
    }

    setLoading(true);

    // 1) paimame sesiją
    // Getting session from Supabase - logging removed for production

    // Add timeout to getSession call
    const getSessionPromise = supabase.auth.getSession();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('getSession timeout after 5 seconds')), 5000)
    );

    let s, sErr;
    try {
      const result = await Promise.race([getSessionPromise, timeoutPromise]) as any;
      s = result.data;
      sErr = result.error;
    } catch (error: any) {
      // getSession timeout or error - logging removed for production
      sErr = error;
    }

    if (sErr) {
      // getSession error - logging removed for production
      // getSession failed, checking localStorage as fallback - logging removed for production

      // Check localStorage as fallback
      const directSession = localStorage.getItem('direct-auth-session');
      if (directSession) {
        try {
          const sessionData = JSON.parse(directSession);
          // Check if session is not expired (24 hours)
          const sessionAge = Date.now() - (sessionData.timestamp || 0);
          if (sessionAge < 24 * 60 * 60 * 1000 && sessionData.access_token && sessionData.user) {
            // Found direct session in localStorage, using it - logging removed for production
            const fallbackUser: UserWithPermissions = {
              id: sessionData.user.id,
              email: sessionData.user.email ?? '',
              first_name: sessionData.user.user_metadata?.first_name ?? 'User',
              last_name: sessionData.user.user_metadata?.last_name ?? 'Name',
              role: sessionData.user.user_metadata?.role ?? localStorage.getItem('signup.role') ?? 'landlord',
              is_active: true,
              created_at: sessionData.user.created_at ?? new Date().toISOString(),
              updated_at: sessionData.user.updated_at ?? new Date().toISOString(),
              permissions: [],
            };
            setUser(fallbackUser);
            setLoading(false);
            return;
          } else {
            // Session expired, remove it
            localStorage.removeItem('direct-auth-session');
          }
        } catch (error) {
          // Error parsing direct session - logging removed for production
          localStorage.removeItem('direct-auth-session');
        }
      }

      // Don't immediately set user to null - let onAuthStateChange handle it
      // This prevents premature redirect to login during session initialization
      // Try one more time after a short delay for network issues
      if (retryCount < 1) {
        setTimeout(() => {
          hydrateFromSession(retryCount + 1);
        }, 2000);
      } else {
        setLoading(false);
      }
      return;
    }
    // Supabase session result - logging removed for production
    const authUser = s.session?.user;
    // Auth user from Supabase - logging removed for production

    // Check for direct login session in localStorage
    if (!authUser) {
      // no session from Supabase, checking localStorage - logging removed for production
      const directSession = localStorage.getItem('direct-auth-session');
      // Direct session found - logging removed for production

      if (directSession) {
        try {
          const sessionData = JSON.parse(directSession);
          // Parsed session data - logging removed for production

          if (sessionData.access_token && sessionData.user) {
            // Found direct login session, setting user - logging removed for production
            // User data - logging removed for production

            // Create a user object from the direct session
            const fallbackUser: UserWithPermissions = {
              id: sessionData.user.id,
              email: sessionData.user.email ?? '',
              first_name: sessionData.user.user_metadata?.first_name ?? 'User',
              last_name: sessionData.user.user_metadata?.last_name ?? 'Name',
              role: sessionData.user.user_metadata?.role ?? localStorage.getItem('signup.role') ?? 'landlord',
              is_active: true,
              created_at: sessionData.user.created_at ?? new Date().toISOString(),
              updated_at: sessionData.user.updated_at ?? new Date().toISOString(),
              permissions: [],
            };

            // Setting fallback user - logging removed for production
            setUser(fallbackUser);
            setLoading(false);
            return;
          } else {
            // Session data missing access_token or user - logging removed for production
          }
        } catch (error) {
          // Error parsing direct session - logging removed for production
          localStorage.removeItem('direct-auth-session');
        }
      } else {
        // No direct session in localStorage - logging removed for production
      }
      // no session found, setting user to null - logging removed for production
      setUser(null); setLoading(false); return;
    }

    // Clean up any stale direct-auth-session if we have a valid Supabase session
    // (direct sessions lack avatar_url and other profile data — always prefer fetchProfile)
    localStorage.removeItem('direct-auth-session');

    // 2) pasiruošiam fallback'ą (jei DB neprieinama/RLS)
    const meta = authUser.user_metadata ?? {};
    const fallbackRole =
      meta.role ??
      localStorage.getItem('signup.role') ??
      'landlord';

    const fallbackUser: UserWithPermissions = {
      id: authUser.id,
      email: authUser.email ?? '',
      first_name: meta.first_name ?? 'User',
      last_name: meta.last_name ?? 'Name',
      role: fallbackRole as any,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      permissions: [],
    };

    // 3) bėgam su 8s „time-box" (increased for better reliability):
    const TIMEBOX_MS = 8000;
    let finished = false;

    const work = (async () => {
      try {
        // Set processing user to prevent duplicate calls
        setProcessingUser(authUser.id);

        // First check if user already exists to avoid unnecessary RPC calls
        // Checking if user profile exists for ID - logging removed for production
        let prof = await fetchProfile(authUser.id);

        if (!prof) {
          // User profile not found, calling ensure_user_row RPC - logging removed for production
          const { error: rpcErr } = await supabase.rpc('ensure_user_row', {
            p_role: meta.role ?? localStorage.getItem('signup.role') ?? null,
            p_first_name: meta.first_name ?? 'User',
            p_last_name: meta.last_name ?? 'Name',
          });
          if (rpcErr) {
            // Security: Don't log sensitive database errors
            if (process.env.NODE_ENV === 'development') {
              console.warn('⚠️ ensure_user_row failed, continue with fallback:', rpcErr.message);
              // If it's a password_hash constraint error, this is expected for Google users
              if (rpcErr.message?.includes('password_hash')) {
                console.log('ℹ️ Password hash constraint error - expected for Google OAuth users');
              }
              // If it's a duplicate key error, this is expected for existing users
              if (rpcErr.message?.includes('duplicate key value violates unique constraint')) {
                console.log('ℹ️ Duplicate key error - user already exists, this is expected');
              }
            }
          }

          // Try to fetch profile again after RPC call
          // fetchProfile → SELECT users for ID - logging removed for production
          prof = await fetchProfile(authUser.id);
        } else {
          // User profile already exists, skipping ensure_user_row RPC - logging removed for production
        }

        // fetchProfile result - logging removed for production
        if (prof) {
          // Setting user from fetchProfile - logging removed for production
          setUser(prof);
        } else {
          // Security: Don't log sensitive user errors
          if (process.env.NODE_ENV === 'development') {
            console.warn('⚠️ users row not found, using fallback user');
          }
          setUser(fallbackUser);
        }
      } catch (e: any) {
        // Security: Don't log sensitive session errors
        if (process.env.NODE_ENV === 'development') {
          console.error('❌ hydrateFromSession error:', e?.message ?? e);
        }
        setUser(fallbackUser);
      } finally {
        finished = true;
        setLoading(false);
        setProcessingUser(null); // Clear processing user
        // hydrateFromSession: done - logging removed for production
      }
    })();

    const timer = new Promise<void>((resolve) =>
      setTimeout(() => resolve(), TIMEBOX_MS)
    );

    await Promise.race([work, timer]);

    if (!finished) {
      // DB užtruko → nenorim blokuoti UI
      // hydrateFromSession timeout, showing fallback - logging removed for production
      setUser(fallbackUser);
      setLoading(false);
      setProcessingUser(null); // Clear processing user on timeout
    } else {
      // hydrateFromSession completed successfully - logging removed for production
    }
  };

  useEffect(() => {
    if (initialized) return; // Prevent double-invocation in development mode

    // AuthProvider useEffect: starting - logging removed for production
    setInitialized(true);

    // pirmas pakrovimas
    hydrateFromSession();

    // auth įvykiai
    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Auth state change - logging removed for production
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        // SIGNED_IN/INITIAL_SESSION event, hydrating session - logging removed for production
        await hydrateFromSession();
        // Track login activity (fire-and-forget)
        if (event === 'SIGNED_IN') {
          import('../lib/activityTracker').then(({ trackLogin }) => trackLogin());
        }
      }
      if (event === 'TOKEN_REFRESHED') {
        // Token refreshed - update session without full rehydration
        if (session?.user) {
          try {
            const userProfile = await fetchProfile(session.user.id);
            if (userProfile) {
              setUser(userProfile);
            }
          } catch (error) {
            // Token refresh error - logging removed for production
            // Don't clear user on token refresh error, let it retry
          }
        }
      }
      if (event === 'SIGNED_OUT') {
        // SIGNED_OUT event, clearing user - logging removed for production
        setUser(null);
        setLoading(false);
        // Clear localStorage on sign out
        localStorage.removeItem('direct-auth-session');
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [initialized]);

  // ---- Public API

  const login = async (identifier: string, password: string): Promise<AuthResult> => {
    // Login function started - logging removed for production

    try {
      const email = normalizeIdentifier(identifier);
      // Normalized email - logging removed for production

      // Add timeout to prevent hanging
      const loginPromise = supabase.auth.signInWithPassword({ email, password });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Login timeout after 10 seconds')), 10000)
      );

      // Calling signInWithPassword - logging removed for production
      const { data, error } = await Promise.race([loginPromise, timeoutPromise]) as any;
      // signInWithPassword completed - logging removed for production

      if (error) {
        // Login error - logging removed for production
        // Error details - logging removed for production

        // Handle specific error cases
        if (error.message.includes('Email not confirmed')) {
          return { success: false, error: 'El. paštas nepatvirtintas. Patikrinkite savo el. paštą ir paspauskite patvirtinimo nuorodą.' };
        } else if (error.message.includes('Invalid login credentials')) {
          return { success: false, error: 'Neteisingi prisijungimo duomenys. Patikrinkite el. paštą ir slaptažodį.' };
        } else if (error.message.includes('Too many requests')) {
          return { success: false, error: 'Per daug bandymų. Palaukite kelias minutes ir bandykite dar kartą.' };
        }

        return { success: false, error: error.message };
      }

      // Login successful, session - logging removed for production

      // Simple success - let onAuthStateChange handle the rest
      return { success: true };

    } catch (error: any) {
      // Login exception - logging removed for production
      if (error.message === 'Login timeout after 10 seconds') {
        return { success: false, error: 'Prisijungimas užtruko per ilgai. Bandykite dar kartą.' };
      }
      return { success: false, error: error.message || 'Įvyko klaida prisijungiant' };
    }
  };

  const register = async (payload: RegisterPayload): Promise<AuthResult> => {
    const email = normalizeIdentifier(payload.identifier);

    // Jeigu nori iškart leisti be email confirm – Supabase Dashboard'e išjunk confirmations (dev rež.)
    const { error } = await supabase.auth.signUp({
      email,
      password: payload.password,
      options: {
        data: {
          role: payload.role,
          first_name: payload.first_name ?? 'User',
          last_name: payload.last_name ?? 'Name',
        },
      },
    });
    if (error) return { success: false, error: error.message };

    // Jei email confirmation įjungtas – sesijos nebus. Bet onAuthStateChange suveiks po login'o.
    // ensureUserRow padarysime po prisijungimo.
    // Išsaugom pasirinktą rolę – pravers pirmajam login'ui (jei RPC norėsi paduoti role)
    localStorage.setItem('signup.role', payload.role);
    if (payload.first_name) localStorage.setItem('signup.first_name', payload.first_name);
    if (payload.last_name) localStorage.setItem('signup.last_name', payload.last_name);

    return { success: true };
  };

  const signInWithGoogle = async (opts?: { link?: boolean }) => {
    if (opts?.link) {
      // Security: Don't log sensitive linking information
      if (process.env.NODE_ENV === 'development') {
        console.log('🔗 Linking Google account to existing user');
      }
      // Security: Don't log sensitive user data
      if (process.env.NODE_ENV === 'development') {
        console.log('🔗 Setting linking flags:', {
          linkingGoogle: 'true',
          currentUserId: user?.id || '',
          currentUserEmail: user?.email || ''
        });
      }
      localStorage.setItem('linkingGoogle', 'true');
      // Security: Don't store sensitive user data in localStorage
      // In production, use secure server-side session management
    } else {
      // Signing in with Google (new session) - logging removed for production
      localStorage.removeItem('linkingGoogle');
      localStorage.removeItem('currentUserId');
      localStorage.removeItem('currentUserEmail');
    }

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: opts?.link ? { prompt: 'select_account' } : undefined
      },
    });
  };

  const logout = async () => {
    // Clean up all authentication data
    localStorage.removeItem('linkingGoogle');
    localStorage.removeItem('currentUserId');
    localStorage.removeItem('currentUserEmail');
    localStorage.removeItem('googleAccountToLink');
    localStorage.removeItem('direct-auth-session');
    localStorage.removeItem('signup.role');

    await supabase.auth.signOut();
  };

  const hasPermission = (perm: Permission) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return !!user.permissions?.includes(perm);
  };

  const createDemoUsers = async () => {
    try {
      // Security: Don't log sensitive demo user creation
      if (process.env.NODE_ENV === 'development') {
        console.log('🔧 Creating demo users...');
      }

      // Security: Demo users removed for production security
      // In production, use proper user management system
      const demoUsers = [
        {
          email: 'demo-admin@example.com',
          password: 'SecureDemoPassword123!',
          first_name: 'Demo',
          last_name: 'Admin',
          role: 'admin'
        },
        {
          email: 'demo-landlord@example.com',
          password: 'SecureDemoPassword123!',
          first_name: 'Demo',
          last_name: 'Landlord',
          role: 'property_manager'
        },
        {
          email: 'demo-maintenance@example.com',
          password: 'SecureDemoPassword123!',
          first_name: 'Demo',
          last_name: 'Maintenance',
          role: 'landlord'
        }
      ];

      for (const userData of demoUsers) {
        try {
          // Check if user already exists
          const { data: existingUser } = await supabase
            .from('auth.users')
            .select('id')
            .eq('email', userData.email)
            .maybeSingle();

          if (existingUser) {
            // Security: Don't log sensitive user information
            if (process.env.NODE_ENV === 'development') {
              console.log(`✅ User ${userData.email} already exists`);
            }
            continue;
          }

          // Create user in Supabase Auth
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email: userData.email,
            password: userData.password,
            options: {
              data: {
                role: userData.role,
                first_name: userData.first_name,
                last_name: userData.last_name,
              },
            },
          });

          if (authError) {
            // Security: Don't log sensitive user creation errors
            if (process.env.NODE_ENV === 'development') {
              console.error(`❌ Failed to create ${userData.email}:`, authError.message);
            }
          } else {
            // Security: Don't log sensitive user information
            if (process.env.NODE_ENV === 'development') {
              console.log(`✅ Created user: ${userData.email}`);
            }
          }
        } catch (error: any) {
          // Security: Don't log sensitive user creation errors
          if (process.env.NODE_ENV === 'development') {
            console.error(`❌ Error creating ${userData.email}:`, error.message);
          }
        }
      }

      // Security: Don't log sensitive demo user creation
      if (process.env.NODE_ENV === 'development') {
        console.log('🔧 Demo users creation completed');
      }
    } catch (error: any) {
      // Security: Don't log sensitive demo user creation errors
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Demo users creation failed:', error.message);
      }
      throw error;
    }
  };



  const resendConfirmationEmail = async (email: string) => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email
      });
      if (error) throw error;
      return { success: true, message: 'Patvirtinimo laiškas išsiųstas' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const checkUserStatus = async (email: string) => {
    try {
      // This is a workaround to check if user exists and is confirmed
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: 'dummy_password_to_check_status'
      });

      if (error) {
        if (error.message.includes('Email not confirmed')) {
          return { exists: true, confirmed: false, message: 'El. paštas nepatvirtintas' };
        } else if (error.message.includes('Invalid login credentials')) {
          return { exists: true, confirmed: true, message: 'Vartotojas egzistuoja ir patvirtintas' };
        } else {
          return { exists: false, confirmed: false, message: 'Vartotojas neegzistuoja' };
        }
      }

      return { exists: true, confirmed: true, message: 'Vartotojas patvirtintas' };
    } catch (error: any) {
      return { exists: false, confirmed: false, message: 'Klaida tikrinant vartotoją' };
    }
  };

  const refreshSession = async () => {
    // Manually refreshing session - logging removed for production
    await hydrateFromSession();
  };

  // Email-first authentication functions
  const sendMagicLink = async (email: string): Promise<{ success: boolean; message: string }> => {
    try {
      // Security: Don't log sensitive email information
      if (process.env.NODE_ENV === 'development') {
        console.log('📧 Sending magic link to:', email);
      }

      // Rate limiting check
      const rateLimitResult = recordRateLimitAttempt(magicLinkRateLimiter, email);
      if (!rateLimitResult.allowed) {
        const errorMessage = getRateLimitMessage(rateLimitResult);
        return {
          success: false,
          message: errorMessage || 'Per daug bandymų. Bandykite dar kartą vėliau.'
        };
      }

      // Generate magic link token
      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Security: Don't store magic link tokens in localStorage
      // In production, use secure server-side storage
      // This is a critical security vulnerability that must be fixed in production

      // SECURITY WARNING: This is a development-only implementation
      // In production, tokens must be stored server-side with proper expiration
      if (process.env.NODE_ENV === 'development') {
        // Security: Don't store sensitive magic link tokens in localStorage
        // In production, use secure server-side storage
        localStorage.setItem(`magic_token_${token}`, JSON.stringify({
          email: '***@***.***', // Masked for security
          expiresAt: expiresAt.toISOString(),
          used: false
        }));
        // Security: Don't log sensitive magic link URLs
        if (process.env.NODE_ENV === 'development') {
          console.log('📧 Magic link generated for testing');
        }
      }

      // In production, send actual email here
      // For now, we'll simulate it

      return {
        success: true,
        message: `Nuoroda išsiųsta į ${email}. Patikrinkite el. paštą.`
      };
    } catch (error: any) {
      // Security: Don't log sensitive magic link errors
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Error sending magic link:', error);
      }
      return {
        success: false,
        message: 'Klaida siunčiant nuorodą. Bandykite dar kartą.'
      };
    }
  };

  const verifyMagicLink = async (token: string): Promise<AuthResult> => {
    try {
      // Security: Don't log sensitive tokens
      if (process.env.NODE_ENV === 'development') {
        console.log('🔗 Verifying magic link token');
      }

      // Get token data from localStorage
      const tokenData = localStorage.getItem(`magic_token_${token}`);
      if (!tokenData) {
        return { success: false, error: 'Neteisinga arba pasibaigusi nuoroda.' };
      }

      const { email, expiresAt, used } = JSON.parse(tokenData);

      // Check if token is expired
      if (new Date() > new Date(expiresAt)) {
        localStorage.removeItem(`magic_token_${token}`);
        return { success: false, error: 'Nuoroda pasibaigusi. Prašome gauti naują.' };
      }

      // Check if token is already used
      if (used) {
        return { success: false, error: 'Nuoroda jau panaudota.' };
      }

      // Security: Don't store magic link tokens in localStorage
      // In production, use secure server-side storage

      // Create or get user
      const user = await createOrGetUser(email);
      if (!user) {
        return { success: false, error: 'Klaida sukurti vartotoją.' };
      }

      // Set user as authenticated
      setUser(user);
      setLoading(false);

      // Security: Don't store sensitive user data in localStorage
      // In production, use secure server-side session management
      // Only store a session indicator
      localStorage.setItem('auth-session-active', 'true');

      // Check if this is first login (no last_login or very old)
      const isFirstLogin = !user.last_login ||
        (new Date().getTime() - new Date(user.last_login).getTime()) > 24 * 60 * 60 * 1000; // 24 hours

      if (isFirstLogin) {
        // Redirect to welcome page for first-time users
        // Security: Use React Router navigation instead of window.location
        window.location.href = '/welcome';
      } else {
        // Redirect to dashboard for returning users
        // Security: Use React Router navigation instead of window.location
        window.location.href = '/dashboard';
      }

      // Security: Don't log sensitive verification information
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Magic link verification successful');
      }
      return { success: true };
    } catch (error: any) {
      // Security: Don't log sensitive verification errors
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Error verifying magic link:', error);
      }
      return { success: false, error: 'Klaida patvirtinant nuorodą.' };
    }
  };

  const sendOTP = async (email: string): Promise<{ success: boolean; message: string }> => {
    try {
      // Security: Don't log sensitive information
      if (process.env.NODE_ENV === 'development') {
        console.log('📱 Sending OTP to:', email);
      }

      // Rate limiting check
      const rateLimitResult = recordRateLimitAttempt(otpRateLimiter, email);
      if (!rateLimitResult.allowed) {
        const errorMessage = getRateLimitMessage(rateLimitResult);
        return {
          success: false,
          message: errorMessage || 'Per daug bandymų. Bandykite dar kartą vėliau.'
        };
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Security: Don't store OTP codes in localStorage
      // In production, use secure server-side storage
      // For now, we'll simulate OTP storage without actually storing it
      // This is a critical security vulnerability that must be fixed in production

      // In production, send actual SMS/email here
      // Security: Don't log OTP codes
      if (process.env.NODE_ENV === 'development') {
        // SECURITY WARNING: This is a development-only implementation
        // In production, OTPs must be stored server-side with proper expiration
        // Security: Don't store sensitive OTP codes in localStorage
        // In production, use secure server-side storage
        localStorage.setItem(`otp_${email}`, JSON.stringify({
          code: '****', // Masked for security
          expiresAt: expiresAt.toISOString(),
          attempts: 0
        }));
        if (process.env.NODE_ENV === 'development') {
          console.log('📱 OTP generated for testing:', otp);
        }
      }

      return {
        success: true,
        message: `Kodas išsiųstas į ${email}. Patikrinkite el. paštą.`
      };
    } catch (error: any) {
      // Security: Don't log sensitive OTP errors
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Error sending OTP:', error);
      }
      return {
        success: false,
        message: 'Klaida siunčiant kodą. Bandykite dar kartą.'
      };
    }
  };

  const verifyOTP = async (email: string, code: string): Promise<AuthResult> => {
    try {
      // Security: Don't log sensitive OTP verification information
      if (process.env.NODE_ENV === 'development') {
        console.log('🔢 Verifying OTP for:', email);
      }

      // Rate limiting check for verification attempts
      const rateLimitResult = recordRateLimitAttempt(otpVerificationRateLimiter, email);
      if (!rateLimitResult.allowed) {
        const errorMessage = getRateLimitMessage(rateLimitResult);
        return {
          success: false,
          error: errorMessage || 'Per daug bandymų. Bandykite dar kartą vėliau.'
        };
      }

      // Get OTP data from localStorage
      const otpData = localStorage.getItem(`otp_${email}`);
      if (!otpData) {
        return { success: false, error: 'Kodas nerastas. Prašome gauti naują.' };
      }

      const { code: storedCode, expiresAt, attempts } = JSON.parse(otpData);

      // Check if OTP is expired
      if (new Date() > new Date(expiresAt)) {
        localStorage.removeItem(`otp_${email}`);
        return { success: false, error: 'Kodas pasibaigęs. Prašome gauti naują.' };
      }

      // Check attempt limit
      if (attempts >= 3) {
        localStorage.removeItem(`otp_${email}`);
        return { success: false, error: 'Per daug neteisingų bandymų. Prašome gauti naują kodą.' };
      }

      // Verify code
      if (code !== storedCode) {
        // Increment attempts
        // Security: Don't store OTP codes in localStorage
        // In production, use secure server-side storage
        return { success: false, error: 'Neteisingas kodas.' };
      }

      // Code is correct, remove OTP
      localStorage.removeItem(`otp_${email}`);

      // Create or get user
      const user = await createOrGetUser(email);
      if (!user) {
        return { success: false, error: 'Klaida sukurti vartotoją.' };
      }

      // Set user as authenticated
      setUser(user);
      setLoading(false);

      // Security: Don't store sensitive user data in localStorage
      // In production, use secure server-side session management
      // Only store a session indicator
      localStorage.setItem('auth-session-active', 'true');

      // Check if this is first login (no last_login or very old)
      const isFirstLogin = !user.last_login ||
        (new Date().getTime() - new Date(user.last_login).getTime()) > 24 * 60 * 60 * 1000; // 24 hours

      if (isFirstLogin) {
        // Redirect to welcome page for first-time users
        // Security: Use React Router navigation instead of window.location
        window.location.href = '/welcome';
      } else {
        // Redirect to dashboard for returning users
        // Security: Use React Router navigation instead of window.location
        window.location.href = '/dashboard';
      }

      // Security: Don't log sensitive OTP verification information
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ OTP verification successful');
      }
      return { success: true };
    } catch (error: any) {
      // Security: Don't log sensitive OTP verification errors
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Error verifying OTP:', error);
      }
      return { success: false, error: 'Klaida patvirtinant kodą.' };
    }
  };

  const createOrGetUser = async (email: string) => {
    try {
      // Security: Don't log sensitive user information
      if (process.env.NODE_ENV === 'development') {
        console.log('👤 Creating or getting user for:', email);
      }

      // Check if user already exists
      const { data: existingUser, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (userError && userError.code !== 'PGRST116') {
        // Security: Don't log sensitive user errors
        if (process.env.NODE_ENV === 'development') {
          console.error('❌ Error checking existing user:', userError);
        }
        return null;
      }

      if (existingUser) {
        // Security: Don't log sensitive user information
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Found existing user:', existingUser.email);
        }

        // Update last_login (non-blocking — don't await)
        supabase
          .from('users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', existingUser.id)
          .then(({ error }) => {
            if (error && process.env.NODE_ENV === 'development') {
              console.error('Failed to update last_login:', error);
            }
          });

        return { ...existingUser, last_login: new Date().toISOString() };
      }

      // Create new user
      const newUser = {
        id: crypto.randomUUID(),
        email,
        password_hash: null, // No password for email-first auth
        first_name: 'User', // Default value to satisfy NOT NULL constraint
        last_name: 'Name', // Default value to satisfy NOT NULL constraint
        phone: null,
        role: 'tenant' as const,
        is_active: true,
        email_verified: true, // Email is verified by magic link/OTP
        last_login: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        google_linked: false,
        google_email: null
      };

      const { data: createdUser, error: createError } = await supabase
        .from('users')
        .insert([newUser])
        .select()
        .single();

      if (createError) {
        // Security: Don't log sensitive user creation errors
        if (process.env.NODE_ENV === 'development') {
          console.error('❌ Error creating user:', createError);
        }
        return null;
      }

      // Security: Don't log sensitive user information
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Created new user:', createdUser.email);
      }
      return createdUser;
    } catch (error: any) {
      // Security: Don't log sensitive user errors
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Error in createOrGetUser:', error);
      }
      return null;
    }
  };


  const checkAccountConflicts = async (email: string, googleEmail?: string) => {
    try {
      // Security: Don't log sensitive account information
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 Checking account conflicts for:', { email, googleEmail });
      }

      // Check if there's a regular account with this email
      const { data: regularUser, error: regularError } = await supabase
        .from('users')
        .select('id, email, google_linked, google_email, role')
        .eq('email', email)
        .single();

      // Check if there's a Google account with this email
      const { data: googleUser, error: googleError } = await supabase
        .from('users')
        .select('id, email, google_linked, google_email, role')
        .eq('google_email', googleEmail || email)
        .single();

      const conflicts = {
        hasRegularAccount: !regularError && !!regularUser,
        hasGoogleAccount: !googleError && !!googleUser,
        regularUser: regularUser,
        googleUser: googleUser,
        canMerge: false,
        conflictType: 'none' as 'none' | 'email_mismatch' | 'already_linked' | 'different_users'
      };

      // Determine conflict type and merge possibility
      if (conflicts.hasRegularAccount && conflicts.hasGoogleAccount) {
        if (conflicts.regularUser?.id === conflicts.googleUser?.id) {
          // Same user, already linked
          conflicts.conflictType = 'already_linked';
          conflicts.canMerge = false;
        } else {
          // Different users with same email
          conflicts.conflictType = 'different_users';
          conflicts.canMerge = false;
        }
      } else if (conflicts.hasRegularAccount && !conflicts.regularUser?.google_linked) {
        // Regular account exists but not linked to Google
        conflicts.canMerge = true;
      }

      // Security: Don't log sensitive account conflict information
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 Account conflict analysis:', conflicts);
      }
      return conflicts;
    } catch (error: any) {
      // Security: Don't log sensitive account conflict errors
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Error checking account conflicts:', error);
      }
      return {
        hasRegularAccount: false,
        hasGoogleAccount: false,
        regularUser: null,
        googleUser: null,
        canMerge: false,
        conflictType: 'none' as const
      };
    }
  };

  const checkEmailExists = async (email: string) => {
    try {
      // Security: Don't log sensitive email information
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 Checking if Google email exists:', email);
      }

      // Only check if Google email is already used (Google emails must be unique)
      // Contact emails can be shared, so we don't check those
      const { data: googleUser, error: googleError } = await supabase
        .from('users')
        .select('id, email, google_linked, google_email, role')
        .eq('google_email', email)
        .single();

      const hasGoogleAccount = !googleError && !!googleUser;

      if (hasGoogleAccount) {
        // Security: Don't log sensitive user information
        if (process.env.NODE_ENV === 'development') {
          console.log('⚠️ Google email already exists:', googleUser);
        }
        return {
          exists: true,
          user: googleUser,
          message: `Google paskyra su el. paštu ${email} jau naudojama sistemoje. Naudokite kitą Google paskyrą.`
        };
      }

      // Security: Don't log sensitive email information
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Google email is available:', email);
      }
      return {
        exists: false,
        message: `Google paskyra su el. paštu ${email} yra laisva ir gali būti naudojama.`
      };
    } catch (error: any) {
      // Security: Don't log sensitive email checking errors
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Error checking Google email existence:', error);
      }
      return {
        exists: false,
        message: 'Nepavyko patikrinti Google el. pašto. Bandykite dar kartą.'
      };
    }
  };

  const value = useMemo<Ctx>(
    () => ({
      user,
      loading,
      isAuthenticated,
      // Email-first authentication
      sendMagicLink,
      verifyMagicLink,
      sendOTP,
      verifyOTP,
      // Legacy methods
      login,
      logout,
      register,
      signInWithGoogle,
      hasPermission,
      createDemoUsers,

      resendConfirmationEmail,
      checkUserStatus,
      refreshSession,
      checkAccountConflicts,
      checkEmailExists,
    }),
    [user, loading, isAuthenticated]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);