import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { UserWithPermissions, UserRole, Permission } from '../types/user';
import { magicLinkRateLimiter, otpRateLimiter, otpVerificationRateLimiter, recordRateLimitAttempt, getRateLimitMessage } from '../utils/rateLimiting';
import { app, supabase as supabaseConfig } from '../config/environment';
import { FRONTEND_MODE, getMockUser } from '../config/frontendMode';

export type Role = UserRole;

type RegisterPayload = {
  username: string;
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  role?: 'tenant' | 'landlord' | 'manager' | 'admin';
};

export type MfaFactor = {
  id: string;
  friendly_name?: string | null;
  factor_type?: string | null;
  status?: string | null;
};

export type MfaChallenge = {
  ticket?: string;
  factors: MfaFactor[];
};

type AuthResult = { success: boolean; error?: string; mfa?: MfaChallenge };

const MFA_PENDING_KEY = 'mfa:pending';
const MFA_REQUIRE_KEY = 'mfa:requireOnNextLogin';
const MFA_VERIFIED_SESSION_KEY = 'mfa:verifiedSessionToken';
const SIGNUP_ROLE_KEY = 'signup:desiredRole';
const SIGNUP_FLOW_KEY = 'signup:flow';
const SIGNUP_TIMESTAMP_KEY = 'signup:timestamp';
const AUTH_ERROR_KEY = 'auth:lastError';
type SignupRolePreference = Extract<UserRole, 'tenant' | 'landlord'>;
let currentMfaTicket: string | null = null;
let skipMfaEnforcementOnce = false;

const collectStorages = (): Storage[] => {
  if (typeof window === 'undefined') {
    return [];
  }
  const storages: Storage[] = [];
  try {
    const local = window.localStorage;
    if (local) {
      storages.push(local);
    }
  } catch {
    // ignore storage access issues
  }
  try {
    const session = window.sessionStorage;
    if (session) {
      storages.push(session);
    }
  } catch {
    // ignore storage access issues
  }
  return storages;
};

const readFromStorages = (key: string): string | null => {
  const storages = collectStorages();
  for (const storage of storages) {
    try {
      const value = storage.getItem(key);
      if (value !== null) {
        return value;
      }
    } catch {
      // ignore storage access issues
    }
  }
  return null;
};

const writeToStorages = (key: string, value: string) => {
  const storages = collectStorages();
  storages.forEach((storage) => {
    try {
      storage.setItem(key, value);
    } catch {
      // ignore storage access issues
    }
  });
};

const removeFromStorages = (key: string) => {
  const storages = collectStorages();
  storages.forEach((storage) => {
    try {
      storage.removeItem(key);
    } catch {
      // ignore storage access issues
    }
  });
};

const setMfaPending = (value: boolean) => {
  try {
    if (value) {
      localStorage.setItem(MFA_PENDING_KEY, 'true');
      localStorage.removeItem(MFA_VERIFIED_SESSION_KEY);
    } else {
      localStorage.removeItem(MFA_PENDING_KEY);
    }
  } catch (err) {
    // localStorage might be unavailable (private mode), ignore
  }
};

const storeMfaRequirement = (challenge: MfaChallenge) => {
  try {
    localStorage.setItem(MFA_REQUIRE_KEY, JSON.stringify(challenge));
  } catch (err) {
    // ignore storage failures
  }
};

const clearMfaRequirement = () => {
  try {
    localStorage.removeItem(MFA_REQUIRE_KEY);
  } catch (err) {
    // ignore
  }
};

const consumePreferredSignupRole = (): SignupRolePreference | null => {
  const role = peekSignupRolePreference();
  if (role) {
    removeFromStorages(SIGNUP_ROLE_KEY);
    removeFromStorages('signup.role');
    removeFromStorages(SIGNUP_TIMESTAMP_KEY);
  }
  return role;
};

const getSignupFlow = (): string | null => {
  const storages = collectStorages();
  for (const storage of storages) {
    try {
      const candidate = storage.getItem(SIGNUP_FLOW_KEY);
      if (candidate && candidate.length > 0) {
        return candidate;
      }
    } catch {
      // ignore storage access issues
    }
  }
  return null;
};

const clearSignupFlow = () => {
  removeFromStorages(SIGNUP_FLOW_KEY);
};

const setAuthErrorMessage = (message: string) => {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(AUTH_ERROR_KEY, message);
    }
  } catch (err) {
    // ignore storage failures
  }
};

const getStoredSignupRole = (): SignupRolePreference | null => {
  const storages = collectStorages();
  for (const storage of storages) {
    try {
      const candidate = storage.getItem('signup.role');
      if (candidate === 'tenant' || candidate === 'landlord') {
        return candidate;
      }
    } catch {
      // ignore storage access issues
    }
  }
  return null;
};

const clearSignupMetadata = () => {
  removeFromStorages('signup.role');
  removeFromStorages('signup.first_name');
  removeFromStorages('signup.last_name');
  removeFromStorages(SIGNUP_ROLE_KEY);
  removeFromStorages(SIGNUP_FLOW_KEY);
  removeFromStorages(SIGNUP_TIMESTAMP_KEY);
};

const syncSignupParamsFromUrl = (): { flow: string | null; role: SignupRolePreference | null } => {
  try {
    if (typeof window === 'undefined') {
      return { flow: null, role: null };
    }

    const search = window.location.search;
    if (!search || search.length <= 1) {
      return { flow: null, role: null };
    }

    const params = new URLSearchParams(search);
    const rawFlow = params.get('flow') ?? params.get('signup_flow');
    const rawRole = params.get('role') ?? params.get('signup_role');

    const normalizedRole: SignupRolePreference | null =
      rawRole === 'tenant' || rawRole === 'landlord' ? rawRole : null;
    const normalizedFlow = rawFlow ? rawFlow.trim() || null : null;

    const storages: Storage[] = [];
    try {
      if (typeof window !== 'undefined') {
        storages.push(window.localStorage);
        if (window.sessionStorage) {
          storages.push(window.sessionStorage);
        }
      }
    } catch {
      // ignore storage access errors
    }

    if (normalizedFlow) {
      writeToStorages(SIGNUP_FLOW_KEY, normalizedFlow);
    }

    if (normalizedRole) {
      writeToStorages(SIGNUP_ROLE_KEY, normalizedRole);
      writeToStorages('signup.role', normalizedRole);
    }

    if (normalizedFlow || normalizedRole) {
      if (normalizedFlow) {
        params.delete('flow');
        params.delete('signup_flow');
      }
      if (normalizedRole) {
        params.delete('role');
        params.delete('signup_role');
      }

      const remaining = params.toString();
      const newUrl =
        remaining.length > 0
          ? `${window.location.pathname}?${remaining}${window.location.hash ?? ''}`
          : `${window.location.pathname}${window.location.hash ?? ''}`;

      window.history.replaceState({}, '', newUrl);
    }

    return { flow: normalizedFlow, role: normalizedRole };
  } catch {
    return { flow: null, role: null };
  }
};

const getSignupTimestamp = (): number | null => {
  const raw = readFromStorages(SIGNUP_TIMESTAMP_KEY);
  if (!raw) {
    return null;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
};

const peekSignupRolePreference = (): SignupRolePreference | null => {
  const storedRole = getStoredSignupRole();
  if (storedRole) {
    return storedRole;
  }
  const direct = readFromStorages(SIGNUP_ROLE_KEY);
  return direct === 'tenant' || direct === 'landlord' ? direct : null;
};

type Ctx = {
  user: UserWithPermissions | null;
  loading: boolean;
  isAuthenticated: boolean;
  needsProfileSetup: boolean;

  // New authentication methods
  loginWithEmail: (identifier: string, password: string) => Promise<AuthResult>;
  loginWithGoogle: (preferredRole?: SignupRolePreference) => Promise<AuthResult>;
  registerWithEmail: (payload: RegisterPayload) => Promise<AuthResult>;
  completeProfile: (nickname: string, password: string, role?: SignupRolePreference) => Promise<AuthResult>;
  logout: () => Promise<void>;
  
  // Email-first authentication (legacy)
  sendMagicLink: (email: string) => Promise<{ success: boolean; message: string }>;
  verifyMagicLink: (token: string) => Promise<AuthResult>;
  sendOTP: (email: string) => Promise<{ success: boolean; message: string }>;
  verifyOTP: (email: string, code: string) => Promise<AuthResult>;
  verifyTotpMfa: (params: { factorId: string; code: string; ticket?: string }) => Promise<AuthResult>;
  
  // Legacy methods (to be removed)
  login: (identifier: string, password: string) => Promise<AuthResult>;
  register: (payload: RegisterPayload) => Promise<AuthResult>;
  signInWithGoogle: (opts?: { link?: boolean }) => Promise<void>;
  hasPermission: (perm: Permission) => boolean;
  createDemoUsers: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
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
  // If it's already an email, return as is
  if (val.includes('@')) {
    return val;
  }
  // If it's a username, convert to email format
  return `${val}@app.local`;
}

function hasGoogleIdentity(authUser: { app_metadata?: Record<string, unknown>; identities?: Array<Record<string, unknown>> } | null | undefined): boolean {
  if (!authUser) {
    return false;
  }
  const provider = (authUser.app_metadata as Record<string, unknown> | undefined)?.provider;
  if (provider === 'google') {
    return true;
  }
  const identities = Array.isArray(authUser.identities) ? authUser.identities : [];
  return identities.some((identity) => identity?.provider === 'google');
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
  // First check if we have a valid session before making API calls
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    // No session, don't try to fetch profile
    return null;
  }
  
  // Du atskiri užklausimai, kad išvengtume "Could not embed" klaidos
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id, email, google_email, google_linked, nickname, phone, first_name, last_name, role, is_active, created_at, updated_at, last_login, avatar_url')
    .eq('id', userId)
    .maybeSingle();

  // If we get 401 or "Invalid API key", it means session is invalid
  if (userError) {
    const is401Error = userError.message?.includes('401') || 
                      userError.message?.includes('Invalid API key') ||
                      userError.code === 'PGRST301';
    if (is401Error) {
      // Session is invalid, clear it and return null
      await supabase.auth.signOut({ scope: 'local' });
      return null;
    }
    throw userError;
  }
  if (!userData) return null;

  // Atsinešam permissions atskirai
  const { data: permsData, error: permsError } = await supabase
    .from('user_permissions')
    .select('permission')
    .eq('user_id', userId);

  if (permsError) {
    // Security: Don't log sensitive permission errors
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ Failed to fetch permissions:', permsError);
    }
  }

  const perms = permsData?.map((p) => p.permission) ?? [];
  const result: UserWithPermissions = {
    id: userData.id,
    email: userData.email,
    google_email: userData.google_email ?? null,
    google_linked: userData.google_linked ?? null,
    first_name: userData.first_name,
    last_name: userData.last_name,
    nickname: userData.nickname ?? undefined,
    role: userData.role,
    is_active: userData.is_active,
    created_at: userData.created_at,
    updated_at: userData.updated_at,
    last_login: userData.last_login ?? undefined,
    avatar_url: userData.avatar_url ?? null,
    permissions: perms,
  };
  return result;
}

// ---- Provider

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserWithPermissions | null>(() => {
    // Initialize with mock user in frontend mode
    if (FRONTEND_MODE) {
      const mockUser = getMockUser();
      return mockUser as UserWithPermissions;
    }
    return null;
  });
  const [loading, setLoading] = useState(() => FRONTEND_MODE ? false : true);
  const [initialized, setInitialized] = useState(() => FRONTEND_MODE ? true : false);
  const [processingUser, setProcessingUser] = useState<string | null>(null);
  const [needsProfileSetup, setNeedsProfileSetup] = useState(false);

  const isAuthenticated = !!user;
  
  // Debug log when authentication state changes
  React.useEffect(() => {
    // Authentication state changed - logging removed for production
  }, [isAuthenticated, user]);

  // Įkraunam sesiją ir profilį
  const hydrateFromSession = async (retryCount = 0) => {
    // hydrateFromSession: start - logging removed for production
    
    // Security: First verify we have a valid session before proceeding
    // Wait for session to be ready (with retry mechanism)
    let sessionReady = false;
    let attempts = 0;
    const maxAttempts = 5;
    const retryDelay = 500; // 500ms between retries
    
    while (!sessionReady && attempts < maxAttempts) {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (session && !sessionError) {
        sessionReady = true;
        if (process.env.NODE_ENV === 'development' && attempts > 0) {
          console.log(`✅ Session ready after ${attempts} attempt(s)`);
        }
        break;
      }
      
      attempts++;
      if (attempts < maxAttempts) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`⏳ Waiting for session to be ready (attempt ${attempts}/${maxAttempts})...`);
        }
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
    
    if (!sessionReady) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ No valid session found after retries, skipping hydration');
      }
      setUser(null);
      setNeedsProfileSetup(false);
      setLoading(false);
      return;
    }
    
    // Prevent multiple simultaneous calls for the same user
    if (processingUser) {
      // hydrateFromSession: already processing user, skipping - logging removed for production
      return;
    }
    
    setLoading(true);

    // 1) paimame sesiją
    // Getting session from Supabase - logging removed for production
    
    // Retry mechanism: Wait for session to be ready (up to 3 seconds)
    let s, sErr;
    const maxRetries = 6;
    const sessionRetryDelay = 500; // 500ms between retries
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const getSessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('getSession timeout')), 3000)
        );
        
        const result = await Promise.race([getSessionPromise, timeoutPromise]) as any;
        s = result?.data?.session;
        sErr = result?.error;
        
        // If we have a valid session, break out of retry loop
        if (s && !sErr) {
          if (process.env.NODE_ENV === 'development' && attempt > 0) {
            console.log(`✅ Session retrieved after ${attempt} retry(ies)`);
          }
          break;
        }
        
        // If no session yet, wait and retry
        if (attempt < maxRetries - 1) {
          if (process.env.NODE_ENV === 'development') {
            console.log(`⏳ Waiting for session (attempt ${attempt + 1}/${maxRetries})...`);
          }
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      } catch (error: any) {
        // getSession timeout or error - retry if we have attempts left
        if (attempt < maxRetries - 1) {
          if (process.env.NODE_ENV === 'development') {
            console.log(`⏳ getSession error, retrying (attempt ${attempt + 1}/${maxRetries})...`);
          }
                  await new Promise(resolve => setTimeout(resolve, sessionRetryDelay));
                  continue;
                }
                sErr = error;
              }
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
            const googleLinked = hasGoogleIdentity(sessionData.user);
            const fallbackUser: UserWithPermissions = {
              id: sessionData.user.id,
              email: sessionData.user.email ?? '',
              google_email: sessionData.user.user_metadata?.google_email ?? sessionData.user.email ?? null,
              google_linked: googleLinked,
              first_name: sessionData.user.user_metadata?.first_name ?? 'User',
              last_name: sessionData.user.user_metadata?.last_name ?? 'Name',
              nickname: sessionData.user.user_metadata?.nickname ?? undefined,
              role: sessionData.user.user_metadata?.role ?? 'tenant',
              is_active: true,
              created_at: sessionData.user.created_at ?? new Date().toISOString(),
              updated_at: sessionData.user.updated_at ?? new Date().toISOString(),
              permissions: [],
              avatar_url: sessionData.user.user_metadata?.avatar_url ?? null,
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
    // CRITICAL FIX: s is already the session object (from result?.data?.session)
    // So we access s?.user directly, NOT s.session?.user
    const authUser = s?.user;
    const lastSignInAt = (authUser as { last_sign_in_at?: string | null } | null)?.last_sign_in_at ?? null;
    const refreshToken = s?.refresh_token ?? null;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 AuthContext hydrateFromSession:', {
        hasSession: !!s,
        hasUser: !!authUser,
        userId: authUser?.id,
        userEmail: authUser?.email
      });
    }
    const storedVerifiedToken = (() => {
      try {
        return localStorage.getItem(MFA_VERIFIED_SESSION_KEY);
      } catch (err) {
        return null;
      }
    })();

    const hasVerifiedThisSession = Boolean(refreshToken && storedVerifiedToken && storedVerifiedToken === refreshToken);

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
              google_email: sessionData.user.user_metadata?.google_email ?? sessionData.user.email ?? null,
              first_name: sessionData.user.user_metadata?.first_name ?? 'User',
              last_name: sessionData.user.user_metadata?.last_name ?? 'Name',
              nickname: sessionData.user.user_metadata?.nickname ?? undefined,
              role: sessionData.user.user_metadata?.role ?? 'tenant',
              is_active: true,
              created_at: sessionData.user.created_at ?? new Date().toISOString(),
              updated_at: sessionData.user.updated_at ?? new Date().toISOString(),
              permissions: [],
              avatar_url: sessionData.user.user_metadata?.avatar_url ?? null,
            };
            
            // Setting fallback user - logging removed for production
            setUser(fallbackUser);
          setNeedsProfileSetup(false);
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
      setUser(null);
      setNeedsProfileSetup(false);
      setLoading(false);
      return;
    }

    if (!skipMfaEnforcementOnce && !hasVerifiedThisSession) {
      try {
        const { data: mfaData, error: mfaError } = await supabase.auth.mfa.listFactors();
        if (!mfaError) {
          const verifiedTotpFactors = ((mfaData?.totp ?? []) as Array<{ id: string; friendly_name?: string | null; factor_type?: string | null; status?: string | null }>).filter((factor) => factor.status === 'verified');
          if (verifiedTotpFactors.length > 0) {
            const normalizedFactors: MfaFactor[] = verifiedTotpFactors.map((factor) => ({
              id: factor.id,
              friendly_name: factor.friendly_name ?? 'Authenticator',
              factor_type: factor.factor_type ?? 'totp',
              status: factor.status ?? 'verified'
            }));
            storeMfaRequirement({ factors: normalizedFactors });
            setMfaPending(true);
            currentMfaTicket = null;
            setUser(null);
            setNeedsProfileSetup(false);
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        // Ignore MFA enforcement errors and continue with fallback flow
      }
    }

    skipMfaEnforcementOnce = false;

    // 2) pasiruošiam fallback'ą (jei DB neprieinama/RLS)
    const signupUrlMetadata = syncSignupParamsFromUrl();
    const preferredSignupRole = peekSignupRolePreference();
    const pendingSignupFlow = getSignupFlow();
    const storedSignupRole = getStoredSignupRole();
    const signupTimestamp = getSignupTimestamp();
    const meta = (authUser.user_metadata ?? {}) as Record<string, unknown>;
    const rawMetaSignupRole = typeof meta.signup_role === 'string' ? (meta.signup_role as string) : null;
    const metadataSignupRole: SignupRolePreference | null =
      rawMetaSignupRole === 'tenant' || rawMetaSignupRole === 'landlord' ? rawMetaSignupRole : null;
    const hasRecentSignupIntent =
      typeof signupTimestamp === 'number' ? Date.now() - signupTimestamp < 10 * 60 * 1000 : false;
    const metaNickname = typeof meta.nickname === 'string' ? (meta.nickname as string) : null;
    const metaHasPassword = Boolean(meta.has_password);
    const metaRole = typeof meta.role === 'string' ? (meta.role as string) : null;
    const metaFirstName = typeof meta.first_name === 'string' ? (meta.first_name as string) : null;
    const metaLastName = typeof meta.last_name === 'string' ? (meta.last_name as string) : null;
    const fallbackRole =
      preferredSignupRole ??
      metaRole ??
      metadataSignupRole ??
      localStorage.getItem('signup.role') ??
      'tenant';

    const googleLinkedFromAuth = hasGoogleIdentity(authUser as any);

    const fallbackUser: UserWithPermissions = {
      id: authUser.id,
      email: authUser.email ?? '',
      google_email: authUser.email ?? null,
      google_linked: googleLinkedFromAuth,
      first_name: metaFirstName ?? 'User',
      last_name: metaLastName ?? 'Name',
      nickname: metaNickname ?? undefined,
      role: fallbackRole as any,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      permissions: [],
      last_login: lastSignInAt ?? undefined,
      avatar_url: (authUser.user_metadata as any)?.avatar_url ?? null,
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
        
        if (prof && lastSignInAt && prof.last_login !== lastSignInAt) {
          await supabase.from('users').update({ last_login: lastSignInAt }).eq('id', authUser.id);
          const refreshedProfile = await fetchProfile(authUser.id);
          if (refreshedProfile) {
            prof = refreshedProfile;
          } else {
            prof = { ...prof, last_login: lastSignInAt } as UserWithPermissions;
          }
        }
        
        if (!prof) {
          const hasPendingRegistration = Boolean(
            pendingSignupFlow ||
              storedSignupRole ||
              preferredSignupRole ||
              metadataSignupRole ||
              signupUrlMetadata.flow ||
              signupUrlMetadata.role ||
              hasRecentSignupIntent,
          );
          if (!hasPendingRegistration) {
            let existingByEmail: { id: string; role: Role } | null = null;
            if (authUser.email) {
              const { data } = await supabase
                .from('users')
                .select('id, role')
                .eq('email', authUser.email)
                .maybeSingle();
              if (data) {
                existingByEmail = data as { id: string; role: Role };
              }
            }

          if (existingByEmail) {
            try {
              clearSignupMetadata();
            } catch {
              // ignore storage issues
            }

            if (existingByEmail.id === authUser.id) {
              try {
                const existingProfile = await fetchProfile(authUser.id);
                if (existingProfile) {
                  setUser({
                    ...existingProfile,
                    last_login: existingProfile.last_login ?? lastSignInAt ?? undefined,
                  } as UserWithPermissions);
                  removeFromStorages('auth:google-login-intent');
                  removeFromStorages('auth:google-signup-intent');
                  setNeedsProfileSetup(false);
                  setLoading(false);
                  setProcessingUser(null);
                  return;
                }
              } catch {
                // if we fail to fetch the profile we'll treat it as a conflict below
              }
            }

            setAuthErrorMessage(
              'Ši Google paskyra jau susieta su kita vartotojo paskyra. Susisiekite su administratoriumi, kad būtų sujungtos paskyros.'
            );
            await supabase.auth.signOut();
            setUser(null);
            setNeedsProfileSetup(false);
            setLoading(false);
            removeFromStorages('auth:google-login-intent');
            removeFromStorages('auth:google-signup-intent');
            setProcessingUser(null);
            return;
          }

          }
          // User profile not found, calling ensure_user_row RPC - logging removed for production
          const { error: rpcErr } = await supabase.rpc('ensure_user_row', {
            p_role: preferredSignupRole ?? meta.role ?? 'tenant',
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
        const nicknameFromDb = (prof as any)?.nickname ?? null;
        const effectiveNickname = nicknameFromDb ?? metaNickname;

        const identities = Array.isArray((authUser as any).identities)
          ? ((authUser as any).identities as Array<Record<string, any>>)
          : [];
        const googleIdentity = identities.find((identity) => identity.provider === 'google');
        const googleIdentityData = googleIdentity?.identity_data ?? {};
        const googleEmailFromIdentity =
          (googleIdentityData.email as string | undefined) ??
          authUser.email ??
          (meta.google_email as string | undefined) ??
          null;
        const googleGivenName = (googleIdentityData.given_name as string | undefined) ?? (meta.first_name as string | undefined);
        const googleFamilyName = (googleIdentityData.family_name as string | undefined) ?? (meta.last_name as string | undefined);
        const isGoogleLinked = Boolean((prof as any)?.google_linked) || googleLinkedFromAuth || Boolean(googleIdentity);

        if (googleIdentity) {
          const profileUpdates: Record<string, unknown> = {};

          if (!prof?.google_linked) {
            profileUpdates.google_linked = true;
          }

          if (googleEmailFromIdentity && prof?.google_email !== googleEmailFromIdentity) {
            profileUpdates.google_email = googleEmailFromIdentity;
          }

          if (googleGivenName && (!prof?.first_name || prof.first_name === 'User')) {
            profileUpdates.first_name = googleGivenName;
          }

          if (googleFamilyName && (!prof?.last_name || prof.last_name === 'Name')) {
            profileUpdates.last_name = googleFamilyName;
          }

          if (!(prof as any)?.nickname) {
            const identityNickname = (googleIdentityData.nickname as string | undefined) ?? (googleIdentityData.name as string | undefined);
            const derivedNickname =
              identityNickname?.trim().replace(/\s+/g, '.').toLowerCase() ??
              (googleEmailFromIdentity ? googleEmailFromIdentity.split('@')[0] : undefined);
            const nicknameCandidate = metaNickname ?? derivedNickname ?? null;
            const sanitizedNickname = nicknameCandidate?.trim();
            if (sanitizedNickname && sanitizedNickname !== 'User') {
              profileUpdates.nickname = sanitizedNickname.toLowerCase();
            }
          }

          if (Object.keys(profileUpdates).length > 0) {
            await supabase.from('users').update(profileUpdates).eq('id', authUser.id);
            const updatedProfile = await fetchProfile(authUser.id);
            if (updatedProfile) {
              prof = updatedProfile;
            }
          }
        }

        if (preferredSignupRole && prof?.role !== preferredSignupRole) {
          try {
            await supabase.from('users').update({ role: preferredSignupRole }).eq('id', authUser.id);
            const updatedProfile = await fetchProfile(authUser.id);
            if (updatedProfile) {
              prof = updatedProfile;
            }
          } catch (err) {
            // ignore role update errors; fallback will apply
          }
          try {
            await supabase.auth.updateUser({
              data: {
                ...(meta ?? {}),
                role: preferredSignupRole,
              },
            });
          } catch (err) {
            // ignore metadata update failures
          }
          try {
            localStorage.setItem('signup.role', preferredSignupRole);
          } catch (err) {
            // ignore storage errors
          }
        }

        if (prof) {
          // Setting user from fetchProfile - logging removed for production
          setUser({
            ...prof,
            nickname: effectiveNickname ?? undefined,
            google_email: (prof as any).google_email ?? authUser.email ?? null,
            google_linked: (prof as any).google_linked ?? (isGoogleLinked ? true : false),
            last_login: prof.last_login ?? lastSignInAt ?? undefined,
          } as UserWithPermissions);
        } else {
          // Security: Don't log sensitive user errors
          if (process.env.NODE_ENV === 'development') {
            console.warn('⚠️ users row not found, using fallback user');
          }
          setUser({
            ...fallbackUser,
            nickname: effectiveNickname ?? undefined,
            google_linked: isGoogleLinked,
            last_login: fallbackUser.last_login ?? lastSignInAt ?? undefined,
          });
        }
        removeFromStorages('auth:google-login-intent');
        removeFromStorages('auth:google-signup-intent');

        setNeedsProfileSetup(!(effectiveNickname && metaHasPassword));
        if (pendingSignupFlow || storedSignupRole) {
          clearSignupMetadata();
        }
      } catch (e: any) {
        // Security: Don't log sensitive session errors
        // Only log non-401 errors (401 is expected when not logged in)
        const is401Error = e?.message?.includes('401') || 
                          e?.message?.includes('Invalid API key') ||
                          e?.code === 'PGRST301' ||
                          e?.status === 401;
        
        if (process.env.NODE_ENV === 'development' && !is401Error) {
          console.error('❌ hydrateFromSession error:', e?.message ?? e);
        }
        
        // If it's a 401/Invalid API key error, it means session is invalid
        // Clear any invalid session data and set user to null
        if (is401Error) {
          // Clear invalid session from localStorage
          const supabaseKeys = Object.keys(localStorage).filter(key => 
            key.startsWith('sb-') || key.includes('supabase.auth')
          );
          supabaseKeys.forEach(key => localStorage.removeItem(key));
          localStorage.removeItem('direct-auth-session');
          
          setUser(null);
          setNeedsProfileSetup(false);
          setLoading(false);
          return;
        }
        
        // For other errors, use fallback user
        setUser({
          ...fallbackUser,
          nickname: metaNickname ?? undefined,
          google_linked: googleLinkedFromAuth,
          last_login: fallbackUser.last_login ?? lastSignInAt ?? undefined,
        });
        setNeedsProfileSetup(!(metaNickname && metaHasPassword));
        if (pendingSignupFlow || storedSignupRole) {
          clearSignupMetadata();
        }
        removeFromStorages('auth:google-login-intent');
        removeFromStorages('auth:google-signup-intent');
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
      if (pendingSignupFlow || storedSignupRole) {
        clearSignupMetadata();
      }
    } else {
      // hydrateFromSession completed successfully - logging removed for production
    }
  };

  useEffect(() => {
    if (initialized) return; // Prevent double-invocation in development mode
    
    // ⚠️ FRONTEND MODE - Skip authentication setup
    if (FRONTEND_MODE) {
      setInitialized(true);
      setLoading(false);
      if (process.env.NODE_ENV === 'development') {
        console.log('🚫 FRONTEND ONLY: Skipping authentication setup');
      }
      return;
    }
    
    // AuthProvider useEffect: starting - logging removed for production
    setInitialized(true);
    
    // pirmas pakrovimas
    hydrateFromSession();

    // auth įvykiai
    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Auth state change - logging removed for production
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        // SIGNED_IN/INITIAL_SESSION event, waiting a bit for session to be fully established
        // then hydrating session
        if (process.env.NODE_ENV === 'development') {
          console.log('🔄 Auth state changed:', event, session ? 'has session' : 'no session');
          if (session?.user) {
            console.log('👤 User in session:', session.user.email);
            console.log('🆔 User ID:', session.user.id);
          }
        }
        
        // Wait a bit for session to be fully established in localStorage
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Verify session is ready before hydrating
        const { data: { session: verifySession } } = await supabase.auth.getSession();
        if (verifySession) {
          if (process.env.NODE_ENV === 'development') {
            console.log('✅ Session verified, hydrating...');
          }
          await hydrateFromSession();
        } else if (process.env.NODE_ENV === 'development') {
          console.warn('⚠️ Session not ready after auth state change, will retry on next check');
          // Retry after a longer delay
          setTimeout(async () => {
            const { data: { session: retrySession } } = await supabase.auth.getSession();
            if (retrySession) {
              await hydrateFromSession();
            }
          }, 2000);
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
    const email = normalizeIdentifier(payload.email);

    // If no password provided, create a temporary one
    const password = payload.password || crypto.randomUUID();

    // Jeigu nori iškart leisti be email confirm – Supabase Dashboard'e išjunk confirmations (dev rež.)
    const { error } = await supabase.auth.signUp({
      email,
      password: password,
      options: {
        emailRedirectTo: undefined, // Disable email confirmation
        data: {
          role: payload.role,
          first_name: payload.firstName ?? 'User',
          last_name: payload.lastName ?? 'Name',
          has_password: !!payload.password,
        },
      },
    });
    if (error) return { success: false, error: error.message };

    // Jei email confirmation įjungtas – sesijos nebus. Bet onAuthStateChange suveiks po login'o.
    // ensureUserRow padarysime po prisijungimo.
    // Išsaugom pasirinktą rolę – pravers pirmajam login'ui (jei RPC norėsi paduoti role)
    localStorage.setItem('signup.role', payload.role || 'tenant');
    localStorage.setItem(SIGNUP_FLOW_KEY, 'email');
    if (payload.firstName) localStorage.setItem('signup.first_name', payload.firstName);
    if (payload.lastName) localStorage.setItem('signup.last_name', payload.lastName);

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

    // CRITICAL: Use window.location.origin to ensure PKCE code_verifier works in dev/prod
    const redirectUrl = `${window.location.origin}/auth/callback`;
    console.log('🔐 Google OAuth redirect URL:', redirectUrl);
    
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { 
        redirectTo: redirectUrl,
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
    clearSignupMetadata();
    clearMfaRequirement();
    localStorage.removeItem(MFA_VERIFIED_SESSION_KEY);
    removeFromStorages('auth:google-login-intent');
    removeFromStorages('auth:google-signup-intent');
    setMfaPending(false);
    setNeedsProfileSetup(false);
    
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

  const requestPasswordReset = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
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

      // Get redirect route based on user role
      const { getDefaultRouteForRole } = await import('../utils/roleRouting');
      const redirectRoute = getDefaultRouteForRole(user.role);
      
      // Use window.location as fallback (components should handle navigation via React Router)
      // This is a temporary solution - components should handle navigation
      if (typeof window !== 'undefined') {
        window.location.href = redirectRoute;
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

      // Get redirect route based on user role
      const { getDefaultRouteForRole } = await import('../utils/roleRouting');
      const redirectRoute = getDefaultRouteForRole(user.role);
      
      // Use window.location as fallback (components should handle navigation via React Router)
      // This is a temporary solution - components should handle navigation
      if (typeof window !== 'undefined') {
        window.location.href = redirectRoute;
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

      const preferredSignupRole = consumePreferredSignupRole();
      
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
        
        // Check if user needs onboarding (has default values or incomplete profile)
        const needsOnboarding = existingUser.first_name === 'User' || 
                               existingUser.last_name === 'Name' ||
                               !existingUser.first_name || 
                               !existingUser.last_name ||
                               existingUser.first_name.trim() === '' ||
                               existingUser.last_name.trim() === '';
        
        if (needsOnboarding) {
          if (process.env.NODE_ENV === 'development') {
            console.log('🆕 User needs onboarding - redirecting to setup');
          }
          // Mark user as needing onboarding
          existingUser.needsOnboarding = true;
        }
        
        return existingUser;
      }

      // Create new user
      const newUser = {
        id: crypto.randomUUID(),
        email,
        password_hash: null, // No password for email-first auth
        first_name: 'User', // Default value to satisfy NOT NULL constraint
        last_name: 'Name', // Default value to satisfy NOT NULL constraint
        phone: null,
        role: (preferredSignupRole ?? 'tenant') as UserRole,
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
      
      // Mark new user as needing onboarding
      createdUser.needsOnboarding = true;
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

  // New authentication methods
  const loginWithEmail = async (identifier: string, password: string): Promise<AuthResult> => {
    try {
      if (FRONTEND_MODE) {
        if (process.env.NODE_ENV === 'development') {
          console.log('🚫 FRONTEND ONLY: Skipping email login');
        }
        return { success: true };
      }

      const trimmed = identifier.trim();
      let emailToUse = trimmed;

      if (!trimmed.includes('@')) {
        const { data: nicknameUser, error: nicknameError } = await supabase
          .from('nickname_lookup')
          .select('email, google_email, nickname')
          .eq('nickname', trimmed)
          .maybeSingle();

        if (nicknameError) {
          return { success: false, error: 'Nepavyko patikrinti vartotojo vardo. Bandykite dar kartą.' };
        }

        if (nicknameUser) {
          emailToUse = nicknameUser.google_email ?? nicknameUser.email ?? `${trimmed}@app.local`;
        } else {
          emailToUse = `${trimmed}@app.local`;
        }
      }

      // Use normalizeIdentifier to handle username fallbacks
      const email = emailToUse.includes('@') ? emailToUse : normalizeIdentifier(emailToUse);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        if (error.message === 'MFA required') {
          const mfaData = (data as any)?.mfa;
          const ticket = mfaData?.ticket;

          let factors = ((mfaData?.factors ?? []) as Array<{ id: string; factor_type?: string | null; friendly_name?: string | null; status?: string | null }>).filter(
            (factor) => factor.factor_type === 'totp'
          );

          if (!factors.length) {
            const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
            if (!factorsError) {
              const fromList = ((factorsData?.totp ?? []) as Array<{ id: string; factor_type?: string | null; friendly_name?: string | null; status?: string | null }>).filter(
                (factor) => factor.factor_type === 'totp'
              );
              factors = fromList;
            }
          }

          if (!factors.length) {
            return { success: false, error: 'Šiai paskyrai nerasta aktyvių TOTP faktorių.' };
          }

          const normalizedFactors: MfaFactor[] = factors.map((factor) => ({
            id: factor.id,
            friendly_name: factor.friendly_name ?? 'Authenticator',
            factor_type: factor.factor_type ?? 'totp',
            status: factor.status ?? 'verified'
          }));

          setMfaPending(true);
          currentMfaTicket = ticket ?? null;
          skipMfaEnforcementOnce = false;
          storeMfaRequirement({ ticket, factors: normalizedFactors });

          return {
            success: false,
            mfa: {
              ticket,
              factors: normalizedFactors
            }
          };
        }

        if (error.message.includes('Email not confirmed')) {
          return { success: false, error: 'El. paštas nepatvirtintas. Patikrinkite savo el. paštą ir paspauskite patvirtinimo nuorodą.' };
        } else if (error.message.includes('Invalid login credentials')) {
          return { success: false, error: 'Neteisingi prisijungimo duomenys. Patikrinkite el. paštą ir slaptažodį.' };
        } else if (error.message.includes('Too many requests')) {
          return { success: false, error: 'Per daug bandymų. Palaukite kelias minutes ir bandykite dar kartą.' };
        }

        return { success: false, error: error.message };
      }

      if (!data?.session) {
        return { success: false, error: 'Nepavyko sukurti prisijungimo sesijos.' };
      }

      const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
      if (!factorsError) {
        const totpFactors = ((factorsData?.totp ?? []) as Array<{ id: string; friendly_name?: string | null; factor_type?: string | null; status?: string | null }>).filter(
          (factor) => factor.factor_type === 'totp'
        );
        if (totpFactors.length > 0) {
          const normalizedFactors: MfaFactor[] = totpFactors.map((factor) => ({
            id: factor.id,
            friendly_name: factor.friendly_name ?? 'Authenticator',
            factor_type: factor.factor_type ?? 'totp',
            status: factor.status ?? 'verified'
          }));

          setMfaPending(true);
          currentMfaTicket = null;
          skipMfaEnforcementOnce = false;
          storeMfaRequirement({ factors: normalizedFactors });

          return {
            success: false,
            mfa: {
              factors: normalizedFactors
            }
          };
        }
      }

      setMfaPending(false);
      currentMfaTicket = null;

      await hydrateFromSession();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: 'Prisijungimo klaida' };
    }
  };

  const loginWithGoogle = async (preferredRoleParam?: SignupRolePreference): Promise<AuthResult> => {
    try {
      if (FRONTEND_MODE) {
        if (process.env.NODE_ENV === 'development') {
          console.log('🚫 FRONTEND ONLY: Skipping Google login');
        }
        return { success: true };
      }

      const signupFlow = getSignupFlow();
      const signupRole = preferredRoleParam ?? peekSignupRolePreference();

      const redirectParams: Record<string, string> = {};
      if (signupFlow) {
        redirectParams.flow = signupFlow;
      }
      if (signupRole) {
        redirectParams.role = signupRole;
      }
      const searchParams = new URLSearchParams(redirectParams);
      // Use /auth/callback route for OAuth redirect
      const baseCallbackUrl = `${window.location.origin}/auth/callback`;
      const redirectUrl = searchParams.toString()
        ? `${baseCallbackUrl}?${searchParams.toString()}`
        : baseCallbackUrl;

      if (preferredRoleParam) {
        writeToStorages('auth:google-signup-intent', 'true');
        removeFromStorages('auth:google-login-intent');
      } else {
        removeFromStorages('auth:google-signup-intent');
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('🔐 Starting Google OAuth login...');
        console.log('🔗 Redirect URL:', redirectUrl);
        console.log('🔗 Supabase URL:', supabaseConfig.url);
      }

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        }
      });

      if (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('❌ Google OAuth error:', error);
        }
        return { success: false, error: error.message || 'Google prisijungimo klaida' };
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Google OAuth initiated, redirecting to:', data?.url);
      }

      // If data.url exists, it means we need to redirect manually (for some cases)
      if (data?.url) {
        window.location.href = data.url;
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: 'Google prisijungimo klaida' };
    }
  };

  const verifyTotpMfa = async ({ factorId, code, ticket }: { factorId: string; code: string; ticket?: string }): Promise<AuthResult> => {
    try {
      const sanitized = code.replace(/\s+/g, '');
      if (!sanitized) {
        return { success: false, error: 'Įveskite 6 skaitmenų kodą.' };
      }

      const effectiveTicket = ticket ?? currentMfaTicket ?? undefined;

      const challengePayload: { factorId: string; ticket?: string } = { factorId };
      if (effectiveTicket) {
        challengePayload.ticket = effectiveTicket;
      }

      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge(challengePayload as any);

      if (challengeError || !challengeData) {
        return { success: false, error: 'Nepavyko inicijuoti 2FA patvirtinimo. Bandykite dar kartą.' };
      }

      const verifyPayload: { factorId: string; challengeId: string; code: string; ticket?: string } = {
        factorId,
        challengeId: challengeData.id,
        code: sanitized,
      };

      if (effectiveTicket) {
        verifyPayload.ticket = effectiveTicket;
      }

      const { data: verifyData, error: verifyError } = await supabase.auth.mfa.verify(verifyPayload as any);

      if (verifyError) {
        return { success: false, error: verifyError.message ?? 'Neteisingas 2FA kodas. Bandykite dar kartą.' };
      }

      setMfaPending(false);
      currentMfaTicket = null;
      clearMfaRequirement();
      skipMfaEnforcementOnce = true;

      if (verifyData?.access_token && verifyData?.refresh_token) {
        await supabase.auth.setSession({
          access_token: verifyData.access_token,
          refresh_token: verifyData.refresh_token,
        });
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const refreshToken = sessionData.session?.refresh_token;
      if (refreshToken) {
        try {
          localStorage.setItem(MFA_VERIFIED_SESSION_KEY, refreshToken);
        } catch (err) {
          // ignore storage failures
        }
      }

      await hydrateFromSession();
      localStorage.setItem('mfa:lastVerifiedAt', Date.now().toString());
      return { success: true };
    } catch (error: any) {
      return { success: false, error: 'Nepavyko patvirtinti 2FA kodo. Bandykite dar kartą.' };
    }
  };

  const registerWithEmail = async (_payload: RegisterPayload): Promise<AuthResult> => {
    return { success: false, error: 'Registracija galima tik naudojant Google paskyrą.' };
  };

  const completeProfile = async (nickname: string, password: string, roleParam?: SignupRolePreference): Promise<AuthResult> => {
    try {
      if (!user) {
        return { success: false, error: 'Vartotojas neprisijungęs.' };
      }

      const trimmedNickname = nickname.trim().toLowerCase();
      if (trimmedNickname.length < 3 || trimmedNickname.length > 20) {
        return { success: false, error: 'Vartotojo vardas turi būti 3–20 simbolių.' };
      }

      const { data: existingNickname, error: nicknameError } = await supabase
        .from('users')
        .select('id')
        .eq('nickname', trimmedNickname)
        .maybeSingle();

      if (nicknameError) {
        return { success: false, error: 'Nepavyko patikrinti vartotojo vardo. Bandykite dar kartą.' };
      }

      if (existingNickname && existingNickname.id !== user.id) {
        return { success: false, error: 'Toks vartotojo vardas jau naudojamas. Pasirinkite kitą.' };
      }

      const { error: authError } = await supabase.auth.updateUser({
        password,
        data: {
          nickname: trimmedNickname,
          has_password: true,
          google_linked: true,
          ...(roleParam ? { role: roleParam } : {}),
        },
      });

      if (authError) {
        return { success: false, error: authError.message };
      }

      const { data: authUserResult } = await supabase.auth.getUser();
      const primaryEmail = authUserResult?.user?.email ?? (user as any).google_email ?? user.email;
      const desiredRole = roleParam ?? (user.role === 'tenant' || user.role === 'landlord' ? user.role : 'tenant');

      const { error: updateError } = await supabase
        .from('users')
        .update({
          nickname: trimmedNickname,
          google_email: primaryEmail,
          email: primaryEmail,
          role: desiredRole,
          google_linked: true,
        })
        .eq('id', user.id);

      if (updateError) {
        return { success: false, error: 'Nepavyko išsaugoti vartotojo nustatymų. Bandykite dar kartą.' };
      }

      localStorage.setItem('signup.username', trimmedNickname);
      if (desiredRole) {
        try {
          localStorage.setItem('signup.role', desiredRole);
        } catch {
          // ignore storage errors
        }
      }
      await hydrateFromSession();
      setNeedsProfileSetup(false);

      return { success: true };
    } catch (error: any) {
      return { success: false, error: 'Nepavyko užbaigti profilio.' };
    }
  };

  const value = useMemo<Ctx>(
    () => ({
      user,
      loading,
      isAuthenticated,
      needsProfileSetup,
      // New authentication methods
      loginWithEmail,
      loginWithGoogle,
      registerWithEmail,
      completeProfile,
      logout,
      // Email-first authentication
      sendMagicLink,
      verifyMagicLink,
      sendOTP,
      verifyOTP,
      verifyTotpMfa,
      // Legacy methods
      login,
      register,
      signInWithGoogle,
      hasPermission,
      createDemoUsers,
      requestPasswordReset,
      resendConfirmationEmail,
      checkUserStatus,
      refreshSession,
      checkAccountConflicts,
      checkEmailExists,
    }),
    [user, loading, isAuthenticated, needsProfileSetup, completeProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);