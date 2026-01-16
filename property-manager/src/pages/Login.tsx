import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { supabase as supabaseConfig } from '../config/environment';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login, signInWithGoogle, createDemoUsers, resendConfirmationEmail, checkUserStatus } = useAuth();
  const navigate = useNavigate();

  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [showEmailHelper, setShowEmailHelper] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setNeedsConfirmation(false);

    try {
      // Security: Don't log sensitive information
      if (process.env.NODE_ENV === 'development') {
        console.log('🔐 Attempting login for:', email);
      }
      
      // Use direct login method since Supabase client is having issues
      // SECURITY: Use verified configuration (handles cache issues automatically)
      const { getVerifiedSupabaseConfig } = await import('../lib/supabase');
      const verifiedConfig = getVerifiedSupabaseConfig();
      const supabaseUrl = verifiedConfig.url;
      const supabaseAnonKey = verifiedConfig.anonKey;
      
      const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey
        },
        body: JSON.stringify({
          email: email,
          password: password
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        // Security: Don't log sensitive error details
        if (process.env.NODE_ENV === 'development') {
          console.error('🔐 Login failed:', data);
        }
        if (data.msg?.includes('Email not confirmed')) {
          setError('El. paštas nepatvirtintas. Patikrinkite savo el. paštą ir paspauskite patvirtinimo nuorodą.');
          setShowEmailHelper(true);
        } else if (data.msg?.includes('Invalid login credentials')) {
          setError('Neteisingi prisijungimo duomenys. Patikrinkite el. paštą ir slaptažodį.');
        } else {
          setError('Prisijungimo klaida. Bandykite dar kartą.');
        }
        return;
      }
      
      // Security: Don't log sensitive session data
      if (process.env.NODE_ENV === 'development') {
        console.log('🔐 Login successful');
      }
      
      // Set session in Supabase client
      if (data.access_token && data.refresh_token) {
        await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token
        });
      }
      
      // Wait for AuthContext to hydrate user data
      // Check if user is loaded in AuthContext before redirecting
      let userLoaded = false;
      for (let i = 0; i < 20; i++) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // Wait a bit more for AuthContext to process
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Try to get user profile to determine redirect route
          try {
            const { data: userProfile } = await supabase
              .from('users')
              .select('role')
              .eq('id', session.user.id)
              .maybeSingle();
            
            if (userProfile?.role) {
              // Import getDefaultRouteForRole dynamically
              const { getDefaultRouteForRole } = await import('../utils/roleRouting');
              const defaultRoute = getDefaultRouteForRole(userProfile.role as any);
              navigate(defaultRoute, { replace: true });
              userLoaded = true;
              break;
            } else {
              // User profile not found, redirect to onboarding
              navigate('/onboarding', { replace: true });
              userLoaded = true;
              break;
            }
          } catch (error) {
            // If we can't get profile, redirect to onboarding
            navigate('/onboarding', { replace: true });
            userLoaded = true;
            break;
          }
        }
        await new Promise(resolve => setTimeout(resolve, 250));
      }
      
      // Fallback: if user still not loaded, redirect to root (ProtectedRoute will handle)
      if (!userLoaded) {
        navigate('/', { replace: true });
      }
      
    } catch (error: any) {
      // Security: Don't log sensitive error details
      if (process.env.NODE_ENV === 'development') {
        console.error('🔐 Login exception:', error);
      }
      setError('Įvyko klaida prisijungiant. Bandykite dar kartą.');
    } finally {
      setLoading(false);
    }
  };



  const handleDemoLogin = async (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setLoading(true);
    setError('');
    setNeedsConfirmation(false);

    try {
      const result = await login(demoEmail, demoPassword);
      if (result.success) {
        // Wait for AuthContext to hydrate user data
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Get user role to determine redirect route
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const { data: userProfile } = await supabase
              .from('users')
              .select('role')
              .eq('id', session.user.id)
              .maybeSingle();
            
            if (userProfile?.role) {
              const { getDefaultRouteForRole } = await import('../utils/roleRouting');
              const defaultRoute = getDefaultRouteForRole(userProfile.role as any);
              navigate(defaultRoute, { replace: true });
            } else {
              navigate('/onboarding', { replace: true });
            }
          } else {
            navigate('/', { replace: true });
          }
        } catch (error) {
          navigate('/', { replace: true });
        }
      } else {
        setError('Neteisingi prisijungimo duomenys');
      }
    } catch (error) {
      setError('Įvyko klaida prisijungiant');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      setError('Klaida prisijungiant su Google');
    }
  };

  const handleCreateDemoUsers = async () => {
    try {
      setLoading(true);
      setError('');
      // Security: Don't log sensitive information
      if (process.env.NODE_ENV === 'development') {
        console.log('🔧 Starting demo user creation...');
      }
      await createDemoUsers();
      setError('Demo vartotojai sukurti! Dabar galite prisijungti.');
    } catch (error) {
      // Security: Don't log sensitive error details
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Error creating demo users:', error);
      }
      setError('Klaida kuriant demo vartotojus. Bandykite dar kartą.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckSession = () => {
    // Security: Remove debug session checking in production
    if (process.env.NODE_ENV === 'development') {
      // Security: Don't log sensitive session checking
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 Checking localStorage session...');
      }
      const session = localStorage.getItem('direct-auth-session');
      // Security: Don't log sensitive session info
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 Session found:', !!session);
      }
      if (session) {
        try {
          const sessionData = JSON.parse(session);
          // Security: Don't log sensitive session data
          if (process.env.NODE_ENV === 'development') {
            console.log('🔍 Session data:', sessionData);
          }
          // Security: Don't expose user data in alerts
          alert('Session found!');
        } catch (error) {
          // Security: Don't log sensitive session errors
          if (process.env.NODE_ENV === 'development') {
            console.error('🔍 Error parsing session:', error);
          }
          alert('Session found but corrupted');
        }
      } else {
        alert('No session found in localStorage');
      }
    }
  };

  // Test function - REMOVED FOR PRODUCTION SECURITY
  const testDemoCreation = () => {
    // Security: Test functions removed for production
    if (process.env.NODE_ENV === 'development') {
      console.log('🧪 Test button clicked!');
      setError('Test button veikia! Dabar pabandykite žalią mygtuką.');
    }
  };

  // Email confirmation helper functions
  const handleResendConfirmation = async () => {
    if (!email) {
      setError('Įveskite el. pašto adresą');
      return;
    }
    
    setLoading(true);
    try {
      const result = await resendConfirmationEmail(email);
      if (result.success) {
        setError('✅ Patvirtinimo laiškas išsiųstas! Patikrinkite savo el. paštą.');
        setShowEmailHelper(false);
      } else {
        setError(`❌ Klaida: ${result.error}`);
      }
    } catch (error: any) {
      setError('❌ Klaida. Bandykite dar kartą.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckUserStatus = async () => {
    if (!email) {
      setError('Įveskite el. pašto adresą');
      return;
    }
    
    setLoading(true);
    try {
      const status = await checkUserStatus(email);
      setError(`ℹ️ ${status.message}`);
    } catch (error: any) {
      setError('❌ Klaida. Bandykite dar kartą.');
    } finally {
      setLoading(false);
    }
  };

  // Direct login using fetch (workaround for timeout)
  const directLogin = async () => {
    if (!email || !password) {
      setError('Įveskite el. paštą ir slaptažodį');
      return;
    }
    
    setLoading(true);
    try {
      // Security: Don't log sensitive login attempts
      if (process.env.NODE_ENV === 'development') {
        console.log('🔐 Direct login attempt...');
      }
      
      const supabaseUrl = supabaseConfig.url;
      const supabaseAnonKey = supabaseConfig.anonKey;
      
      const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey
        },
        body: JSON.stringify({
          email: email,
          password: password
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        // Security: Don't log sensitive login errors
        if (process.env.NODE_ENV === 'development') {
          console.error('🔐 Direct login error:', data);
        }
        if (data.msg?.includes('Email not confirmed')) {
          setError('El. paštas nepatvirtintas. Patikrinkite savo el. paštą.');
        } else if (data.msg?.includes('Invalid login credentials')) {
          setError('Neteisingi prisijungimo duomenys.');
        } else {
          setError('Prisijungimo klaida. Bandykite dar kartą.');
        }
        return;
      }
      
      // Security: Don't log sensitive login success data
      if (process.env.NODE_ENV === 'development') {
        console.log('🔐 Direct login successful:', data);
      }
      setError('✅ Prisijungimas sėkmingas! Perkraukite puslapį.');
      
    } catch (error: any) {
      // Security: Don't log sensitive login exceptions
      if (process.env.NODE_ENV === 'development') {
        console.error('🔐 Direct login exception:', error);
      }
      setError('❌ Klaida. Bandykite dar kartą.');
    } finally {
      setLoading(false);
    }
  };

  // Test Supabase connection - REMOVED FOR PRODUCTION SECURITY
  const testSupabaseConnection = async () => {
    // Security: Test functions removed for production
    if (process.env.NODE_ENV === 'development') {
      setLoading(true);
      try {
        // Security: Don't log sensitive testing info
        if (process.env.NODE_ENV === 'development') {
          console.log('🧪 Testing Supabase connection...');
        }
        
        // Test 1: Basic connection
        // Security: Don't log sensitive test info
        if (process.env.NODE_ENV === 'development') {
          console.log('🧪 Test 1: Basic connection...');
        }
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          setError(`❌ Supabase connection error: ${error.message}`);
          return;
        }
        // Security: Don't log sensitive connection info
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Basic connection works');
        }
        
        // Test 2: Try a simple query
        // Security: Don't log sensitive test info
        if (process.env.NODE_ENV === 'development') {
          console.log('🧪 Test 2: Simple query...');
        }
        const { data: testData, error: testError } = await supabase
          .from('properties')
          .select('count')
          .limit(1);
        
        if (testError) {
          setError(`❌ Database query error: ${testError.message}`);
          return;
        }
        // Security: Don't log sensitive database info
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Database query works');
        }
        
        // Test 3: Try auth endpoint
        // Security: Don't log sensitive test info
        if (process.env.NODE_ENV === 'development') {
          console.log('🧪 Test 3: Auth endpoint...');
        }
        const supabaseUrl = supabaseConfig.url;
        const supabaseAnonKey = supabaseConfig.anonKey;
        
        const response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
          method: 'GET',
          headers: {
            'apikey': supabaseAnonKey
          }
        });
        
        if (!response.ok) {
          setError(`❌ Auth endpoint error: ${response.status} ${response.statusText}`);
          return;
        }
        // Security: Don't log sensitive auth info
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Auth endpoint works');
        }
        
        setError(`✅ Supabase fully connected! Session: ${data.session ? 'Active' : 'None'}`);
        
      } catch (error: any) {
        // Security: Don't log sensitive test errors
        if (process.env.NODE_ENV === 'development') {
          console.error('🧪 Supabase test failed:', error);
        }
        setError(`❌ Supabase test failed: ${error.message}`);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Sveiki atvykę!
          </h2>
          <p className="text-gray-600">
            Prisijunkite prie nekilnojamojo turto valdymo sistemos
          </p>
        </div>

        {/* Demo Users Section */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <svg className="h-5 w-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Demo vartotojai
          </h3>
          <div className="space-y-3">
            {[
              { 
                email: 'admin@nuomotojas.lt', 
                role: 'Administratorius', 
                color: 'from-red-500 to-pink-500',
                icon: '👑'
              },
              { 
                email: 'nuomotojas@nuomotojas.lt', 
                role: 'Nuomotojas', 
                color: 'from-blue-500 to-cyan-500',
                icon: '🏠'
              },
              { 
                email: 'vadovas@nuomotojas.lt', 
                role: 'Vadovas', 
                color: 'from-green-500 to-emerald-500',
                icon: '👔'
              },
              { 
                email: 'remontas@nuomotojas.lt', 
                role: 'Remontininkas', 
                color: 'from-yellow-500 to-orange-500',
                icon: '🔧'
              }
            ].map((demoUser) => (
              <button
                key={demoUser.email}
                onClick={() => handleDemoLogin(demoUser.email, 'SecureDemoPassword123!')}
                disabled={loading}
                className="w-full group p-4 rounded-xl border border-gray-200 hover:border-gray-300 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${demoUser.color} flex items-center justify-center text-white text-lg shadow-md group-hover:scale-110 transition-transform duration-300`}>
                      {demoUser.icon}
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-gray-900 group-hover:text-gray-700 transition-colors">
                        {demoUser.email}
                      </div>
                      <div className="text-sm text-gray-500">
                        Demo paskyra
                      </div>
                    </div>
                  </div>
                  <div className={`text-xs px-3 py-1 rounded-full bg-gradient-to-r ${demoUser.color} text-white font-medium shadow-sm`}>
                    {demoUser.role}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 text-gray-500">
              Arba įveskite savo duomenis
            </span>
          </div>
        </div>

        {/* Login Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email-address" className="block text-sm font-medium text-gray-700 mb-2">
                El. pašto adresas
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm transition-all duration-200 hover:border-gray-400"
                placeholder="Įveskite el. pašto adresą"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Slaptažodis
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm transition-all duration-200 hover:border-gray-400"
                placeholder="Įveskite slaptažodį"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-4">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-red-700">{error}</div>
              </div>
            </div>
          )}

          {/* Email Confirmation Helper */}
          {showEmailHelper && (
            <div className="rounded-xl bg-blue-50 border border-blue-200 p-4">
              <div className="flex items-start">
                <svg className="h-5 w-5 text-blue-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <div className="text-sm text-blue-700 mb-3">
                    <strong>El. paštas nepatvirtintas!</strong><br />
                    Patikrinkite savo el. paštą ir paspauskite patvirtinimo nuorodą.
                  </div>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={handleResendConfirmation}
                      disabled={loading}
                      className="px-3 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      Išsiųsti dar kartą
                    </button>
                    <button
                      type="button"
                      onClick={handleCheckUserStatus}
                      disabled={loading}
                      className="px-3 py-1 text-xs bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
                    >
                      Patikrinti statusą
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowEmailHelper(false)}
                      className="px-3 py-1 text-xs bg-gray-400 text-white rounded-lg hover:bg-gray-500"
                    >
                      Uždaryti
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
            >
              {loading ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Prisijungiama...
                </div>
              ) : (
                <div className="flex items-center">
                  <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  Prisijungti
                </div>
              )}
                        </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Arba</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex justify-center items-center py-3 px-4 border border-gray-300 rounded-xl shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Prisijungti su Google
            </button>

            <button
              type="button"
              onClick={handleCreateDemoUsers}
              disabled={loading}
              className="w-full flex justify-center items-center py-3 px-4 border border-green-300 rounded-xl shadow-sm bg-green-50 text-sm font-medium text-green-700 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Sukurti Demo Vartotojus
            </button>

            <button
              type="button"
              onClick={handleCheckSession}
              className="w-full flex justify-center items-center py-3 px-4 border border-yellow-300 rounded-xl shadow-sm bg-yellow-50 text-sm font-medium text-yellow-700 hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-all duration-200"
            >
              <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Patikrinti Sesiją
            </button>

          </div>

          <div className="text-center space-y-3">
            <p className="text-sm text-gray-600">
              Pamiršote slaptažodį?{' '}
              <a href="/reset-password" className="font-medium text-blue-600 hover:text-blue-500 transition-colors">
                Atkurti slaptažodį
              </a>
            </p>
            <p className="text-sm text-gray-600">
              Neturite paskyros?{' '}
              <a href="/register" className="font-medium text-blue-600 hover:text-blue-500 transition-colors">
                Registruotis
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login; 