import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';

/**
 * Onboarding Page - First-time Google OAuth users only
 * - Username selection (unique, validated)
 * - Role selection (landlord/tenant)
 * - Google-only authentication (no password)
 */

interface OnboardingPageProps {
  userEmail: string;
  userId: string;
}

const OnboardingPage: React.FC<OnboardingPageProps> = ({ userEmail, userId }) => {
  const navigate = useNavigate();

  // Form state
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<'landlord' | 'tenant' | ''>('');

  // UI state
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Debounced username check
  useEffect(() => {
    if (!username || username.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingUsername(true);
      try {
        const { data, error } = await supabase.rpc('check_username_available', {
          p_username: username.toLowerCase()
        });

        if (error) throw error;
        setUsernameAvailable(data === true);
      } catch (err) {
        console.error('Username check error:', err);
        setUsernameAvailable(null);
      } finally {
        setCheckingUsername(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [username]);

  const validateUsername = (value: string): string | null => {
    if (!value) return 'Vartotojo vardas privalomas';
    if (value.length < 3) return 'Mažiausiai 3 simboliai';
    if (value.length > 20) return 'Daugiausiai 20 simbolių';
    if (!/^[a-z0-9._-]+$/.test(value)) {
      return 'Tik mažosios raidės, skaičiai, taškai, brūkšneliai';
    }
    if (usernameAvailable === false) return 'Šis vartotojo vardas jau užimtas';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate
    const usernameError = validateUsername(username);
    if (usernameError) {
      setError(usernameError);
      return;
    }

    if (!role) {
      setError('Pasirinkite vaidmenį');
      return;
    }

    setLoading(true);

    try {
      // Create profile (Google-only auth, no password)
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: userEmail,
          username: username.toLowerCase(),
          role: role,
          has_password: false
        });

      if (profileError) {
        if (profileError.message.includes('duplicate key') || profileError.message.includes('unique')) {
          setError('Šis vartotojo vardas jau užimtas');
        } else {
          console.error('Profile creation error:', profileError);
          setError('Nepavyko sukurti profilio. Bandykite dar kartą.');
        }
        setLoading(false);
        return;
      }

      // Also update the users table with role - BUT ONLY IF ROLE IS NOT ALREADY SET
      // This prevents accidental role switching for existing users
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .maybeSingle();

      if (!fetchError && existingUser && !existingUser.role) {
        // Only update role if it's not already set
        const { error: userError } = await supabase
          .from('users')
          .update({ role: role })
          .eq('id', userId);

        if (userError) {
          console.error('Users update error:', userError);
          // Non-fatal - profile was created, continue
        }
      } else if (existingUser?.role && existingUser.role !== role) {
        // User already has a different role - don't overwrite, just log warning
        console.warn('User already has role:', existingUser.role, '- not overwriting with:', role);
      }

      // Navigate to correct dashboard
      if (role === 'landlord') {
        navigate('/dashboard');
      } else {
        navigate('/tenant');
      }

    } catch (err: any) {
      console.error('Onboarding error:', err);
      setError('Įvyko nenumatyta klaida. Bandykite dar kartą.');
      setLoading(false);
    }
  };

  const usernameErrorMsg = username.length >= 3 ? validateUsername(username) : null;
  const showUsernameSuccess = username.length >= 3 && usernameAvailable === true && !checkingUsername;

  return (
    <div className="min-h-screen bg-[#F6FAF9] flex items-center justify-center px-5 py-12">
      <div className="max-w-md w-full">
        {/* Card */}
        <div className="bg-white/80 backdrop-blur-xl border border-white/50 ring-1 ring-black/5 rounded-[24px] px-8 py-8 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-[26px] font-bold text-gray-900 mb-2 tracking-[-0.01em]">
              Užbaikite profilį
            </h1>
            <p className="text-[14px] text-gray-600 leading-relaxed">
              Prisijungėte kaip <span className="font-medium text-gray-900">{userEmail}</span>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-[13px] font-semibold text-gray-900 mb-2">
                Vartotojo vardas
              </label>
              <div className="relative">
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  placeholder="pvz. jonas.petraitis"
                  disabled={loading}
                  required
                  className="w-full h-12 px-4 pr-10 border border-gray-300/80 rounded-xl text-[15px] text-gray-900 placeholder-gray-400 bg-white transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F8481] focus-visible:border-[#2F8481] disabled:bg-gray-50"
                />

                {/* Status icon */}
                {checkingUsername && (
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                    <svg className="animate-spin w-5 h-5 text-gray-400" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  </div>
                )}
                {showUsernameSuccess && (
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                    <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                {usernameErrorMsg && username.length >= 3 && !checkingUsername && (
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                    <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                )}
              </div>

              <p className="mt-1.5 text-[12px] text-gray-500">
                3-20 simbolių: mažosios raidės, skaičiai, taškai, brūkšneliai
              </p>

              {usernameErrorMsg && (
                <p className="mt-1.5 text-[12px] text-red-600 font-medium">
                  {usernameErrorMsg}
                </p>
              )}
            </div>

            {/* Role */}
            <div>
              <label className="block text-[13px] font-semibold text-gray-900 mb-3">
                Pasirinkite vaidmenį
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('landlord')}
                  disabled={loading}
                  className={`h-24 rounded-xl border-2 transition-all duration-150 flex flex-col items-center justify-center gap-2 ${role === 'landlord'
                    ? 'border-[#2F8481] bg-[#2F8481]/5'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                >
                  <svg className={`w-8 h-8 ${role === 'landlord' ? 'text-[#2F8481]' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  <span className={`text-[14px] font-semibold ${role === 'landlord' ? 'text-[#2F8481]' : 'text-gray-700'}`}>
                    Nuomotojas
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('tenant')}
                  disabled={loading}
                  className={`h-24 rounded-xl border-2 transition-all duration-150 flex flex-col items-center justify-center gap-2 ${role === 'tenant'
                    ? 'border-[#2F8481] bg-[#2F8481]/5'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                >
                  <svg className={`w-8 h-8 ${role === 'tenant' ? 'text-[#2F8481]' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className={`text-[14px] font-semibold ${role === 'tenant' ? 'text-[#2F8481]' : 'text-gray-700'}`}>
                    Nuomininkas
                  </span>
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl border border-red-300/80 bg-red-50 px-3.5 py-3 text-[13px] text-red-800">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || checkingUsername || usernameAvailable === false || !role}
              className="w-full h-12 bg-gradient-to-r from-[#2F8481] to-[#2A7470] text-white px-4 rounded-xl text-[15px] font-semibold shadow-[0_2px_8px_rgba(47,132,129,0.2)] transition-all duration-200 hover:shadow-[0_4px_12px_rgba(47,132,129,0.25)] hover:-translate-y-[2px] active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F8481] focus-visible:ring-offset-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Kuriama...
                </span>
              ) : (
                'Išsaugoti ir tęsti'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
