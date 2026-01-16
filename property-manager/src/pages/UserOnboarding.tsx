import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function UserOnboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<'landlord' | 'tenant'>('tenant');
  const [addPassword, setAddPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Check username availability with debounce
  useEffect(() => {
    if (username.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingUsername(true);
      try {
        const { data, error } = await supabase
          .rpc('is_username_available', { p_username: username });

        if (error) throw error;
        setUsernameAvailable(data);
      } catch (err) {
        console.error('Username check error:', err);
      } finally {
        setCheckingUsername(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [username]);

  const validateUsername = (value: string): boolean => {
    // Allow: a-z, 0-9, ., _, -
    const regex = /^[a-z0-9._-]+$/i;
    return regex.test(value) && value.length >= 3 && value.length <= 20;
  };

  const validatePassword = (value: string): boolean => {
    return value.length >= 8;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!validateUsername(username)) {
      setError('Vartotojo vardas turi būti 3-20 simbolių, leistini: a-z, 0-9, ., _, -');
      return;
    }

    if (usernameAvailable === false) {
      setError('Šis vartotojo vardas jau užimtas');
      return;
    }

    if (addPassword) {
      if (!validatePassword(password)) {
        setError('Slaptažodis turi būti bent 8 simboliai');
        return;
      }

      if (password !== confirmPassword) {
        setError('Slaptažodžiai nesutampa');
        return;
      }
    }

    if (!user?.id) {
      setError('Vartotojas nerastas. Prašome prisijungti iš naujo.');
      return;
    }

    setLoading(true);

    try {
      // 1. Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email,
          username: username.trim(),
          role: role,
          has_password: addPassword,
        });

      if (profileError) throw profileError;

      // 2. Set password if requested
      if (addPassword) {
        const { error: passwordError } = await supabase.auth.updateUser({
          password: password,
        });

        if (passwordError) throw passwordError;
      }

      console.log('✅ Onboarding completed successfully');
      
      // Navigate to appropriate dashboard
      const dashboardRoute = role === 'landlord' ? '/nuomotojas2' : '/tenant-dashboard';
      navigate(dashboardRoute, { replace: true });

    } catch (err: any) {
      console.error('Onboarding error:', err);
      setError(err.message || 'Įvyko klaida. Bandykite dar kartą.');
      setLoading(false);
    }
  };

  const getUsernameInputClass = () => {
    if (!username || username.length < 3) return 'border-gray-300';
    if (checkingUsername) return 'border-yellow-400';
    if (usernameAvailable === true) return 'border-green-500';
    if (usernameAvailable === false) return 'border-red-500';
    return 'border-gray-300';
  };

  const getUsernameMessage = () => {
    if (!username || username.length < 3) return null;
    if (checkingUsername) return <span className="text-yellow-600">Tikrinama...</span>;
    if (usernameAvailable === true) return <span className="text-green-600">✓ Laisvas</span>;
    if (usernameAvailable === false) return <span className="text-red-600">✗ Užimtas</span>;
    return null;
  };

  const getPasswordStrength = (value: string): { text: string; color: string } => {
    if (value.length < 8) return { text: 'Per trumpas', color: 'text-red-600' };
    if (value.length < 12) return { text: 'Vidutinis', color: 'text-yellow-600' };
    return { text: 'Stiprus', color: 'text-green-600' };
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="max-w-lg w-full">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Užbaikite paskyros kūrimą</h2>
          <p className="mt-2 text-gray-600">
            Dar keletas žingsnių ir galėsite naudotis sistema
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
          {/* Username */}
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              Vartotojo vardas *
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().trim())}
              required
              autoComplete="username"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2F8481] transition ${getUsernameInputClass()}`}
              placeholder="juozas.k"
            />
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className="text-gray-500">3-20 simbolių (a-z, 0-9, ., _, -)</span>
              {getUsernameMessage()}
            </div>
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pasirinkite rolę *
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setRole('landlord')}
                className={`p-4 border-2 rounded-lg transition ${
                  role === 'landlord'
                    ? 'border-[#2F8481] bg-[#2F8481]/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-center">
                  <div className="text-2xl mb-1">🏢</div>
                  <div className="font-medium text-gray-900">Nuomotojas</div>
                  <div className="text-xs text-gray-500 mt-1">Valdau nuomojamą turtą</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setRole('tenant')}
                className={`p-4 border-2 rounded-lg transition ${
                  role === 'tenant'
                    ? 'border-[#2F8481] bg-[#2F8481]/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-center">
                  <div className="text-2xl mb-1">👤</div>
                  <div className="font-medium text-gray-900">Nuomininkas</div>
                  <div className="text-xs text-gray-500 mt-1">Nuomojuosi būstą</div>
                </div>
              </button>
            </div>
          </div>

          {/* Add Password (Optional) */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between mb-4">
              <label htmlFor="add-password" className="text-sm font-medium text-gray-700">
                Pridėti slaptažodį (neprivaloma)
              </label>
              <button
                type="button"
                onClick={() => setAddPassword(!addPassword)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                  addPassword ? 'bg-[#2F8481]' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    addPassword ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Galėsite prisijungti su vartotojo vardu ir slaptažodžiu be Google
            </p>

            {addPassword && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Slaptažodis
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
                  <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
                    Pakartokite slaptažodį
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
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
              </div>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || usernameAvailable === false || (username.length > 0 && username.length < 3)}
            className="w-full px-4 py-3 bg-[#2F8481] text-white rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#2F8481] focus:ring-offset-2 disabled:opacity-50 transition font-medium"
          >
            {loading ? 'Išsaugoma...' : addPassword ? 'Išsaugoti ir nustatyti slaptažodį' : 'Išsaugoti ir tęsti'}
          </button>
        </form>
      </div>
    </div>
  );
}
