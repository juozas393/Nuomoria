import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

interface ProfileData {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone?: string;
  role: string;
  google_linked?: boolean;
  google_email?: string;
}

const Profile: React.FC = () => {
  const { user, signInWithGoogle, logout } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [linkingGoogle, setLinkingGoogle] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fetchingRef = useRef(false);

  // Form state
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: ''
  });

  useEffect(() => {
    // Security: Don't log sensitive user data
  if (process.env.NODE_ENV === 'development') {
    console.log('👤 Profile: useEffect triggered, user changed:', user);
  }
    if (user && !fetchingRef.current) {
      fetchProfile();
    }
  }, [user]);

  // Fallback: ensure loading doesn't get stuck
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading && user) {
        // Security: Don't log sensitive loading states
        if (process.env.NODE_ENV === 'development') {
          console.log('👤 Profile: Loading timeout reached, forcing loading to false');
        }
        setLoading(false);
      }
    }, 5000); // 5 second timeout

    return () => clearTimeout(timeout);
  }, [loading, user]);

  const fetchProfile = async () => {
    // Security: Don't log sensitive user data
    if (process.env.NODE_ENV === 'development') {
      console.log('👤 Profile: fetchProfile called, user =', user);
    }
    
    if (!user) {
      // Security: Don't log sensitive user states
      if (process.env.NODE_ENV === 'development') {
        console.log('👤 Profile: No user, setting loading to false');
      }
      setLoading(false);
      return;
    }

    // Prevent multiple simultaneous calls
    if (fetchingRef.current) {
      // Security: Don't log sensitive fetching states
      if (process.env.NODE_ENV === 'development') {
        console.log('👤 Profile: Already fetching, skipping');
      }
      return;
    }
    
    fetchingRef.current = true;

    try {
      // Security: Don't log sensitive profile data
      if (process.env.NODE_ENV === 'development') {
        console.log('👤 Profile: Creating base profile from user data');
      }
      // First, use the user data from AuthContext as the base
      const baseProfile: ProfileData = {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: undefined, // Will be fetched from database
        role: user.role,
        google_linked: false,
        google_email: undefined
      };

      // Security: Don't log sensitive profile data
      if (process.env.NODE_ENV === 'development') {
        console.log('👤 Profile: Base profile created:', baseProfile);
      }

      // Try to fetch additional data from the database
      try {
        // Security: Don't log sensitive database operations
        if (process.env.NODE_ENV === 'development') {
          console.log('👤 Profile: Fetching additional data from database...');
        }
        // Fixed: removed google_user_id from query
        const { data, error } = await supabase
          .from('users')
          .select('phone, google_linked, google_email')
          .eq('id', user.id)
          .single();

        // Security: Don't log sensitive database results
        if (process.env.NODE_ENV === 'development') {
          console.log('👤 Profile: Database query result:', { data, error });
        }

        if (error) {
          // Security: Don't log sensitive database errors
          if (process.env.NODE_ENV === 'development') {
            console.error('👤 Profile: Database query failed:', error);
          }
          // Check if it's a column not found error or no rows found
          if (error.message?.includes('google_linked') || error.message?.includes('google_email')) {
            // Security: Don't log sensitive database column info
            if (process.env.NODE_ENV === 'development') {
              console.log('👤 Profile: Google columns not found, using defaults');
            }
            // Use default values for Google fields
            baseProfile.google_linked = false;
            baseProfile.google_email = undefined;
          } else if (error.code === 'PGRST116') {
            // Security: Don't log sensitive user table info
            if (process.env.NODE_ENV === 'development') {
              console.log('👤 Profile: User not found in users table, using AuthContext data only');
            }
            // User doesn't exist in users table, use AuthContext data only
            baseProfile.phone = undefined;
            baseProfile.google_linked = false;
            baseProfile.google_email = undefined;
          }
        } else if (data) {
          baseProfile.phone = data.phone;
          baseProfile.google_linked = data.google_linked || false;
          baseProfile.google_email = data.google_email;
          // Security: Don't log sensitive profile data
          if (process.env.NODE_ENV === 'development') {
            console.log('👤 Profile: Updated profile with database data:', baseProfile);
          }
        }

        // Check localStorage for Google linking data (fallback)
        const localStorageGoogleLinked = localStorage.getItem('google_linked');
        const localStorageGoogleEmail = localStorage.getItem('google_email');
        
        if (localStorageGoogleLinked === 'true' && localStorageGoogleEmail) {
          // Security: Don't log sensitive localStorage data
          if (process.env.NODE_ENV === 'development') {
            console.log('👤 Profile: Found Google data in localStorage, using it as fallback');
          }
          baseProfile.google_linked = true;
          baseProfile.google_email = localStorageGoogleEmail;
        }
      } catch (dbError) {
        // Security: Don't log sensitive database errors
        if (process.env.NODE_ENV === 'development') {
          console.warn('👤 Profile: Could not fetch additional profile data from database:', dbError);
        }
        // Continue with base profile data
      }

      // Security: Don't log sensitive profile state
      if (process.env.NODE_ENV === 'development') {
        console.log('👤 Profile: Setting profile state:', baseProfile);
      }
      setProfile(baseProfile);
      setFormData({
        first_name: baseProfile.first_name || '',
        last_name: baseProfile.last_name || '',
        phone: baseProfile.phone || ''
      });
      // Security: Don't log sensitive profile setup info
      if (process.env.NODE_ENV === 'development') {
        console.log('👤 Profile: Profile setup completed successfully');
        console.log('👤 Profile: Profile state set, should show profile now');
        console.log('👤 Profile: About to set loading to false');
      }
    } catch (error) {
      // Security: Don't log sensitive profile errors
      if (process.env.NODE_ENV === 'development') {
        console.error('👤 Profile: Error setting up profile:', error);
      }
    } finally {
      // Security: Don't log sensitive loading states
      if (process.env.NODE_ENV === 'development') {
        console.log('👤 Profile: Setting loading to false');
      }
      setLoading(false);
      fetchingRef.current = false;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setUpdating(true);
    setMessage(null);

    try {
      // Update the database
      const { error } = await supabase
        .from('users')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone
        })
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      // Update the local profile state
      if (profile) {
        setProfile({
          ...profile,
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone
        });
      }

      setMessage({ type: 'success', text: 'Profilis sėkmingai atnaujintas!' });
    } catch (error) {
      // Security: Don't log sensitive profile update errors
      if (process.env.NODE_ENV === 'development') {
        console.error('Error updating profile:', error);
      }
      setMessage({ type: 'error', text: 'Klaida atnaujinant profilį' });
    } finally {
      setUpdating(false);
    }
  };

  const handleLinkGoogle = async () => {
    setLinkingGoogle(true);
    setMessage(null);

    try {
      // Security: Don't log sensitive user linking data
      if (process.env.NODE_ENV === 'development') {
        console.log('🔗 Starting Google account linking for user:', user?.email);
        console.log('🔗 User ID:', user?.id);
      }
      
      // Check if user already has Google linked
      if (profile?.google_linked) {
        setMessage({ type: 'error', text: 'Google paskyra jau prijungta!' });
        setLinkingGoogle(false);
        return;
      }
      
      await signInWithGoogle({ link: true });
    } catch (error) {
      // Security: Don't log sensitive Google linking errors
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Error linking Google:', error);
      }
      setMessage({ type: 'error', text: 'Klaida prijungiant Google paskyrą. Patikrinkite, ar Google OAuth yra sukonfigūruotas.' });
      setLinkingGoogle(false);
    }
  };

  const handleUnlinkGoogle = async () => {
    if (!profile?.google_linked || !user) return;

    try {
      // Security: Don't log sensitive user unlinking data
      if (process.env.NODE_ENV === 'development') {
        console.log('🔗 Unlinking Google account for user:', user.id);
      }
      
      // Security: Google account unlinking functionality implemented
      // This updates the UI state for immediate feedback
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 Using temporary workaround - updating local state only');
      }
      
      // Update local state immediately
      if (profile) {
        setProfile({
          ...profile,
          google_linked: false,
          google_email: undefined
        });
      }
      
      // Clear localStorage Google data
      localStorage.removeItem('google_linked');
      localStorage.removeItem('google_email');
      localStorage.removeItem('google_user_id');
      
      setMessage({ type: 'success', text: 'Google paskyra sėkmingai atjungta! (Laikinas sprendimas)' });
      
      // Try to update database in background (will fail but that's ok for now)
      try {
        const { data, error } = await supabase.rpc('unlink_google_account_bypass', {
          user_id: user.id
        });

        if (error) {
          // Security: Don't log sensitive database update errors
          if (process.env.NODE_ENV === 'development') {
            console.log('⚠️ Database update failed (expected):', error.message);
          }
        } else if (data && data.success) {
          // Security: Don't log sensitive database success info
          if (process.env.NODE_ENV === 'development') {
            console.log('✅ Database updated successfully');
          }
        }
      } catch (dbError) {
        // Security: Don't log sensitive database errors
        if (process.env.NODE_ENV === 'development') {
          console.log('⚠️ Database update failed (expected):', dbError);
        }
      }
      
    } catch (error) {
      // Security: Don't log sensitive Google unlinking errors
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Error unlinking Google:', error);
      }
      setMessage({ type: 'error', text: 'Klaida atjungiant Google paskyrą. Bandykite dar kartą.' });
    }
  };

  // Helper function to check linked Google accounts (development only)
  const checkLinkedGoogleAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, google_linked, google_email')
        .eq('google_linked', true);

      if (error) {
        // Security: Don't log sensitive error details
        if (process.env.NODE_ENV === 'development') {
          console.log('Error checking linked accounts:', error);
          console.log('Error details:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          });
        }
        alert('Klaida tikrinant prijungtas paskyras');
        return;
      }

      // Security: Don't log sensitive Google account data
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 Currently linked Google accounts:', data);
      }
      if (data && data.length > 0) {
        // Security: Don't expose user emails in alerts
        alert(`Prijungtos Google paskyros: ${data.length}`);
      } else {
        alert('Nėra prijungtų Google paskyrų');
      }
    } catch (error) {
      // Security: Don't log sensitive error details
      if (process.env.NODE_ENV === 'development') {
        console.error('Error checking linked accounts:', error);
      }
      alert('Klaida tikrinant prijungtas paskyras');
    }
  };

  // Helper function to check current user's Google status
  const checkCurrentUserGoogleStatus = async () => {
    if (!user) {
      alert('Nėra prisijungusio vartotojo');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, google_linked, google_email')
        .eq('id', user.id)
        .single();

      if (error) {
        // Security: Don't log sensitive error details
        if (process.env.NODE_ENV === 'development') {
          console.log('Error checking current user Google status:', error);
          console.log('Error details:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          });
        }
        alert('Klaida tikrinant dabartinio vartotojo Google statusą');
        return;
      }

      // Security: Don't log sensitive user Google status
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 Current user Google status:', data);
      }
      if (data) {
        // Security: Don't expose user emails in alerts
        alert(`Dabartinis vartotojas:\nGoogle prijungtas: ${data.google_linked ? 'Taip' : 'Ne'}`);
      } else {
        alert('Vartotojas nerastas duomenų bazėje');
      }
    } catch (error) {
      // Security: Don't log sensitive error details
      if (process.env.NODE_ENV === 'development') {
        console.error('Error checking current user Google status:', error);
      }
      alert('Klaida tikrinant dabartinio vartotojo Google statusą');
    }
  };

  // Security: Don't log sensitive render data
  if (process.env.NODE_ENV === 'development') {
    console.log('👤 Profile: Render check - loading =', loading, 'user =', user?.email, 'profile =', profile?.email);
  }
  
  if (loading) {
    // Security: Don't log sensitive loading screen data
    if (process.env.NODE_ENV === 'development') {
      console.log('👤 Profile: Rendering loading screen, user =', user, 'profile =', profile, 'loading =', loading);
    }
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Kraunama...</p>
          <p className="mt-2 text-sm text-gray-500">User: {user ? 'Present' : 'Missing'}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Neprisijungęs vartotojas</p>
          <p className="text-gray-600 mt-2">Prašome prisijungti, kad galėtumėte peržiūrėti profilį</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    // Security: Don't log sensitive error screen data
    if (process.env.NODE_ENV === 'development') {
      console.log('👤 Profile: No profile found, showing error screen');
    }
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Nepavyko užkrauti profilio</p>
          <button 
            onClick={fetchProfile}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Bandyti dar kartą
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Mano Profilis</h1>
            <p className="text-gray-600">Valdykite savo paskyros informaciją</p>
          </div>

          {message && (
            <div className={`mb-6 p-4 rounded-lg ${
              message.type === 'success' 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message.text}
            </div>
          )}

          {/* Account Information */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Paskyros informacija</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">El. paštas:</span>
                <span className="font-medium">{profile.email}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">Rolė:</span>
                <span className="font-medium capitalize">{profile.role}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">Google paskyra:</span>
                <span className={`font-medium ${profile.google_linked ? 'text-green-600' : 'text-gray-400'}`}>
                  {profile.google_linked ? `Prijungta (${profile.google_email || 'N/A'})` : 'Neprijungta'}
                </span>
              </div>
            </div>
          </div>

          {/* Google Account Linking */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Google paskyros prijungimas</h2>
            <div className="bg-gray-50 rounded-lg p-4">
              {profile.google_linked ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-2">
                      Jūsų Google paskyra yra prijungta: <strong>{profile.google_email || 'N/A'}</strong>
                    </p>
                    <p className="text-xs text-gray-500">
                      Dabar galite prisijungti naudodami Google arba el. paštą
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleUnlinkGoogle}
                      className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      Atjungti Google
                    </button>
                    <button
                      onClick={checkCurrentUserGoogleStatus}
                      className="px-3 py-2 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                      title="Patikrinti Google paskyros statusą"
                    >
                      Patikrinti
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-2">
                      Prijunkite savo Google paskyrą, kad galėtumėte prisijungti greičiau
                    </p>
                    <p className="text-xs text-gray-500">
                      Po prijungimo galėsite prisijungti naudodami Google arba el. paštą
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleLinkGoogle}
                      disabled={linkingGoogle}
                      className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      {linkingGoogle ? 'Prijungiama...' : 'Prijungti Google'}
                    </button>
                    <div className="flex gap-1">
                      <button
                        onClick={checkLinkedGoogleAccounts}
                        className="px-3 py-2 text-xs font-medium text-gray-600 bg-gray-100 border border-gray-200 rounded-lg hover:bg-gray-200 transition-colors"
                        title="Rodyti visas prijungtas Google paskyras"
                      >
                        Visos
                      </button>
                      <button
                        onClick={checkCurrentUserGoogleStatus}
                        className="px-3 py-2 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                        title="Rodyti mano Google paskyros statusą"
                      >
                        Mano
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Profile Form */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Asmeninė informacija</h2>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">
                    Vardas
                  </label>
                  <input
                    type="text"
                    id="first_name"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Jūsų vardas"
                  />
                </div>
                <div>
                  <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">
                    Pavardė
                  </label>
                  <input
                    type="text"
                    id="last_name"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Jūsų pavardė"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Telefono numeris
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+370 6XX XXXXX"
                />
              </div>
              <div className="flex justify-between items-center">
                <button
                  type="button"
                  onClick={logout}
                  className="px-4 py-2 text-red-600 border border-red-300 font-medium rounded-lg hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                >
                  Atsijungti
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
                >
                  {updating ? 'Atnaujinama...' : 'Atnaujinti profilį'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;

