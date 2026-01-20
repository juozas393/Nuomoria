import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Settings Page - User account settings
 * Includes Login Methods section for password management
 */

const Settings: React.FC = () => {
  const [hasPassword, setHasPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [settingPassword, setSettingPassword] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        return;
      }

      // Check if user has password set
      const { data: profile } = await supabase
        .from('profiles')
        .select('has_password')
        .eq('id', session.user.id)
        .single();

      if (profile) {
        setHasPassword(profile.has_password || false);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetPassword = async () => {
    setPasswordError('');
    setPasswordSuccess('');

    // Validation
    if (!newPassword) {
      setPasswordError('Slaptažodis privalomas');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('Slaptažodis turi būti mažiausiai 8 simbolių');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Slaptažodžiai nesutampa');
      return;
    }

    setSettingPassword(true);

    try {
      // Update password in Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        throw updateError;
      }

      // Update has_password flag in profiles
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ has_password: true })
          .eq('id', session.user.id);

        if (profileError) {
          console.error('Error updating profile:', profileError);
        }
      }

      setPasswordSuccess(hasPassword ? 'Slaptažodis sėkmingai pakeistas' : 'Slaptažodis sėkmingai sukurtas');
      setHasPassword(true);
      setNewPassword('');
      setConfirmPassword('');
      
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess('');
      }, 2000);
      
    } catch (error: any) {
      console.error('Error setting password:', error);
      setPasswordError(error.message || 'Nepavyko nustatyti slaptažodžio');
    } finally {
      setSettingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2F8481]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Nustatymai</h1>
          <p className="mt-2 text-sm text-gray-600">
            Valdykite savo paskyros nustatymus
          </p>
        </div>

        {/* Login Methods Section */}
        <div className="bg-white shadow-sm rounded-xl border border-gray-200">
          <div className="px-6 py-5 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Prisijungimo būdai</h2>
            <p className="mt-1 text-sm text-gray-500">
              Valdykite, kaip prisijungiate prie savo paskyros
            </p>
          </div>

          <div className="px-6 py-5 space-y-4">
            {/* Google OAuth */}
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-gray-700" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">Google</div>
                  <div className="text-xs text-gray-500">Prisijungimas per Google OAuth</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                  Prijungta
                </span>
              </div>
            </div>

            <div className="border-t border-gray-200"></div>

            {/* Password */}
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">Slaptažodis</div>
                  <div className="text-xs text-gray-500">
                    {hasPassword ? 'Prisijungimas su vartotojo vardu ir slaptažodžiu' : 'Pridėkite slaptažodį prisijungimui su vartotojo vardu'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowPasswordModal(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2F8481] transition-colors"
              >
                {hasPassword ? 'Keisti slaptažodį' : 'Sukurti slaptažodį'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Password Modal */}
      {showPasswordModal && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setShowPasswordModal(false)}
        >
          <div 
            className="bg-white rounded-xl p-7 max-w-md w-full shadow-2xl border border-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {hasPassword ? 'Keisti slaptažodį' : 'Sukurti slaptažodį'}
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              {hasPassword 
                ? 'Įveskite naują slaptažodį savo paskyrai'
                : 'Pridėkite slaptažodį, kad galėtumėte prisijungti su vartotojo vardu'}
            </p>

            <div className="space-y-4">
              {/* New Password */}
              <div>
                <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Naujas slaptažodis
                </label>
                <input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mažiausiai 8 simboliai"
                  className="w-full h-11 px-3.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481]"
                />
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Pakartokite slaptažodį
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Pakartokite slaptažodį"
                  className="w-full h-11 px-3.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481]"
                />
              </div>

              {/* Error */}
              {passwordError && (
                <div className="rounded-lg border border-red-300 bg-red-50 px-3.5 py-2.5 text-sm text-red-800">
                  {passwordError}
                </div>
              )}

              {/* Success */}
              {passwordSuccess && (
                <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800">
                  {passwordSuccess}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordError('');
                    setPasswordSuccess('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  className="flex-1 h-11 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                  disabled={settingPassword}
                >
                  Atšaukti
                </button>
                <button
                  onClick={handleSetPassword}
                  disabled={settingPassword || !newPassword || !confirmPassword}
                  className="flex-1 h-11 px-4 bg-[#2F8481] text-white rounded-lg text-sm font-semibold hover:bg-[#267673] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {settingPassword ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Nustatoma...
                    </span>
                  ) : (
                    hasPassword ? 'Keisti' : 'Sukurti'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
