import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

export default function LoginMethodsSection() {
  const { user } = useAuth();
  const [hasPassword, setHasPassword] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchPasswordStatus();
  }, [user?.id]);

  const fetchPasswordStatus = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('has_password')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setHasPassword(data?.has_password || false);
    } catch (err) {
      console.error('Error fetching password status:', err);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password.length < 8) {
      setError('Slaptažodis turi būti bent 8 simboliai');
      return;
    }

    if (password !== confirmPassword) {
      setError('Slaptažodžiai nesutampa');
      return;
    }

    setLoading(true);

    try {
      // Update password in auth
      const { error: passwordError } = await supabase.auth.updateUser({
        password: password,
      });

      if (passwordError) throw passwordError;

      // Update has_password flag in profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ has_password: true })
        .eq('id', user!.id);

      if (profileError) throw profileError;

      setSuccess(hasPassword ? 'Slaptažodis sėkmingai pakeistas!' : 'Slaptažodis sėkmingai nustatytas!');
      setHasPassword(true);
      setShowPasswordModal(false);
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message || 'Nepavyko nustatyti slaptažodžio');
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = (value: string): { text: string; color: string } => {
    if (value.length < 8) return { text: 'Per trumpas', color: 'text-red-600' };
    if (value.length < 12) return { text: 'Vidutinis', color: 'text-yellow-600' };
    return { text: 'Stiprus', color: 'text-green-600' };
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Prisijungimo metodai</h3>

      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-green-800 text-sm">{success}</p>
        </div>
      )}

      <div className="space-y-4">
        {/* Google OAuth */}
        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <div>
              <div className="font-medium text-gray-900">Google</div>
              <div className="text-sm text-gray-500">Prijungta</div>
            </div>
          </div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            ✓ Aktyvus
          </span>
        </div>

        {/* Username/Password */}
        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <div>
              <div className="font-medium text-gray-900">Slaptažodis</div>
              <div className="text-sm text-gray-500">
                {hasPassword ? 'Nustatytas' : 'Nenustatytas'}
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowPasswordModal(true)}
            className="px-4 py-2 text-sm font-medium text-[#2F8481] hover:bg-[#2F8481]/5 rounded-lg transition"
          >
            {hasPassword ? 'Pakeisti' : 'Sukurti'}
          </button>
        </div>
      </div>

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900">
                {hasPassword ? 'Pakeisti slaptažodį' : 'Sukurti slaptažodį'}
              </h4>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setError('');
                  setPassword('');
                  setConfirmPassword('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSetPassword} className="space-y-4">
              <div>
                <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1">
                  {hasPassword ? 'Naujas slaptažodis' : 'Slaptažodis'}
                </label>
                <input
                  id="new-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2F8481]"
                  placeholder="Bent 8 simboliai"
                />
                {password && (
                  <p className={`text-xs mt-1 ${getPasswordStrength(password).color}`}>
                    Stiprumas: {getPasswordStrength(password).text}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="confirm-new-password" className="block text-sm font-medium text-gray-700 mb-1">
                  Pakartokite slaptažodį
                </label>
                <input
                  id="confirm-new-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2F8481]"
                  placeholder="Pakartokite slaptažodį"
                />
                {confirmPassword && (
                  <p className={`text-xs mt-1 ${password === confirmPassword ? 'text-green-600' : 'text-red-600'}`}>
                    {password === confirmPassword ? '✓ Sutampa' : '✗ Nesutampa'}
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setError('');
                    setPassword('');
                    setConfirmPassword('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Atšaukti
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-[#2F8481] text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition"
                >
                  {loading ? 'Išsaugoma...' : 'Išsaugoti'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
