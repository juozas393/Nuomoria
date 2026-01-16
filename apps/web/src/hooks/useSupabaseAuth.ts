import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import { app, supabase as supabaseConfig } from '../config/environment';

interface AuthState {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
}

interface AuthMethods {
  // Email-first authentication
  sendMagicLink: (email: string) => Promise<{ success: boolean; message: string }>;
  sendOTP: (email: string) => Promise<{ success: boolean; message: string }>;
  verifyOTP: (email: string, code: string) => Promise<{ success: boolean; error?: string }>;
  
  // Passkey authentication
  registerPasskey: () => Promise<{ success: boolean; error?: string }>;
  authenticateWithPasskey: () => Promise<{ success: boolean; error?: string }>;
  
  // OAuth
  signInWithGoogle: () => Promise<void>;
  
  // Account management
  linkAccount: (provider: 'google' | 'apple') => Promise<{ success: boolean; error?: string }>;
  unlinkAccount: (provider: 'google' | 'apple') => Promise<{ success: boolean; error?: string }>;
  
  // Organization management
  createOrganization: (name: string) => Promise<{ success: boolean; orgId?: string; error?: string }>;
  inviteToOrganization: (email: string, role: string) => Promise<{ success: boolean; error?: string }>;
  acceptInvite: (token: string) => Promise<{ success: boolean; error?: string }>;
  
  // Session management
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

export const useSupabaseAuth = (): AuthState & AuthMethods => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          // Error getting session - logging removed for production
        } else {
          setUser(session?.user ?? null);
        }
      } catch (error) {
        // Error in getInitialSession - logging removed for production
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Auth state changed - logging removed for production
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Handle different auth events
        if (event === 'SIGNED_IN' && session?.user) {
          // Check if this is first login
          const isFirstLogin = !session.user.last_sign_in_at || 
            (new Date().getTime() - new Date(session.user.last_sign_in_at).getTime()) > 24 * 60 * 60 * 1000;
          
          if (isFirstLogin) {
            // Redirect to welcome page
            window.location.href = '/welcome';
          } else {
            // Redirect to dashboard
            window.location.href = '/dashboard';
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Email-first authentication methods
  const sendMagicLink = async (email: string): Promise<{ success: boolean; message: string }> => {
    try {
      // Sending magic link - logging removed for production
      // Redirect URL - logging removed for production
      
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: process.env.REACT_APP_AUTH_REDIRECT_URL || `${app.url}/auth/callback`,
          shouldCreateUser: true,
        }
      });

      if (error) {
        // Magic link error - logging removed for production
        return { success: false, message: error.message };
      }

      return { 
        success: true, 
        message: `Nuoroda išsiųsta į ${email}. Patikrinkite el. paštą.` 
      };
    } catch (error: any) {
      return { success: false, message: 'Klaida siunčiant nuorodą' };
    }
  };

  const sendOTP = async (email: string): Promise<{ success: boolean; message: string }> => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
        }
      });

      if (error) {
        return { success: false, message: error.message };
      }

      return { 
        success: true, 
        message: `Kodas išsiųstas į ${email}. Patikrinkite el. paštą.` 
      };
    } catch (error: any) {
      return { success: false, message: 'Klaida siunčiant kodą' };
    }
  };

  const verifyOTP = async (email: string, code: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'email'
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: 'Klaida patvirtinant kodą' };
    }
  };

  // Passkey authentication (WebAuthn)
  const registerPasskey = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      // This would integrate with WebAuthn API
      // For now, we'll simulate it
      // Registering passkey - logging removed for production
      
      // In production, you would:
      // 1. Generate registration options
      // 2. Use WebAuthn API to create credential
      // 3. Store credential in Supabase
      
      // Simulate successful registration
      const result = { success: true };
      return result;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const authenticateWithPasskey = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      // This would integrate with WebAuthn API
      // Authenticating with passkey - logging removed for production
      
      // In production, you would:
      // 1. Generate authentication options
      // 2. Use WebAuthn API to authenticate
      // 3. Verify with Supabase
      
      // Simulate successful authentication
      const result = { success: true };
      return result;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  // OAuth methods
  const signInWithGoogle = async (): Promise<void> => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: process.env.REACT_APP_AUTH_REDIRECT_URL || `${app.url}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      }
    });

    if (error) {
      // Google sign-in error - logging removed for production
      throw error;
    }
  };

  // Account linking
  const linkAccount = async (provider: 'google' | 'apple'): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.linkIdentity({
        provider,
        options: {
          redirectTo: `${app.url}/auth/callback`,
        }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const unlinkAccount = async (provider: 'google' | 'apple'): Promise<{ success: boolean; error?: string }> => {
    try {
      // Get user identities
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Find identity to unlink
      const identity = user.identities?.find(id => id.provider === provider);
      if (!identity) {
        return { success: false, error: 'Account not linked' };
      }

      // Unlink identity
      const { error } = await supabase.auth.unlinkIdentity(identity);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  // Organization management
  const createOrganization = async (name: string): Promise<{ success: boolean; orgId?: string; error?: string }> => {
    try {
      const { data, error } = await supabase.rpc('setup_user_organization', {
        user_email: user?.email,
        org_name: name
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, orgId: data.org_id };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const inviteToOrganization = async (email: string, role: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // This would create an invite record and send email
      // For now, we'll simulate it
      // Inviting user - logging removed for production
      
      // Simulate successful invitation
      const result = { success: true };
      return result;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const acceptInvite = async (token: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.rpc('accept_invite', {
        invite_token: token
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  // Session management
  const logout = async (): Promise<void> => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const refreshSession = async (): Promise<void> => {
    await supabase.auth.refreshSession();
  };

  return {
    user,
    loading,
    isAuthenticated: !!user,
    sendMagicLink,
    sendOTP,
    verifyOTP,
    registerPasskey,
    authenticateWithPasskey,
    signInWithGoogle,
    linkAccount,
    unlinkAccount,
    createOrganization,
    inviteToOrganization,
    acceptInvite,
    logout,
    refreshSession,
  };
};
