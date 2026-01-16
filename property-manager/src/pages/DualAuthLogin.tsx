import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function DualAuthLogin() {
  const navigate = useNavigate();
  const [showUsernameLogin, setShowUsernameLogin] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError('');
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Nepavyko prisijungti su Google');
      setLoading(false);
    }
  };

  const handleUsernamePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Get user by username
      const { data: userData, error: lookupError } = await supabase
        .rpc('get_user_by_username', { p_username: username });

      if (lookupError) throw lookupError;

      if (!userData || userData.length === 0) {
        setError('Vartotojas nerastas. Patikrinkite vartotojo vardą.');
        setLoading(false);
        return;
      }

      const user = userData[0];

      // 2. Check if password is set
      if (!user.has_password) {
        setError(
          'Slaptažodis dar nenustatytas. Prisijunkite su Google ir nustatykite slaptažodį nustatymuose.'
        );
        setLoading(false);
        return;
      }

      // 3. Sign in with password
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: password,
      });

      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          setError('Neteisingas slaptažodis');
        } else {
          setError(signInError.message);
        }
        setLoading(false);
        return;
      }

      // Success! AuthContext will handle redirect
      console.log('✅ Username/password login successful');
      
    } catch (err: any) {
      setError(err.message || 'Prisijungimo klaida');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Prisijungimas</h2>
          <p className="mt-2 text-gray-600">
            Pasirinkite prisijungimo būdą
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {!showUsernameLogin ? (
          <div className="space-y-4">
            {/* Google OAuth - Primary */}
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#2F8481] disabled:opacity-50 transition"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
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
              <span className="font-medium text-gray-700">
                Tęsti su Google
              </span>
            </button>

            {/* Separator */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-50 text-gray-500">arba</span>
              </div>
            </div>

            {/* Username/Password - Secondary */}
            <button
              onClick={() => setShowUsernameLogin(true)}
              disabled={loading}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#2F8481] disabled:opacity-50 transition"
            >
              <span className="font-medium text-gray-700">
                Prisijungti su vartotojo vardu
              </span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Back button */}
            <button
              onClick={() => {
                setShowUsernameLogin(false);
                setError('');
              }}
              className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Atgal
            </button>

            {/* Username/Password Form */}
            <form onSubmit={handleUsernamePasswordLogin} className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                  Vartotojo vardas
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2F8481]"
                  placeholder="juozas.k"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Slaptažodis
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2F8481]"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-3 bg-[#2F8481] text-white rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#2F8481] focus:ring-offset-2 disabled:opacity-50 transition font-medium"
              >
                {loading ? 'Jungiamasi...' : 'Prisijungti'}
              </button>
            </form>

            <div className="text-center text-sm text-gray-600">
              <p>Naujas vartotojas?</p>
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="text-[#2F8481] hover:underline font-medium"
              >
                Pradėkite su Google
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
