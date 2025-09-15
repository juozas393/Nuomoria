import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const ResetPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const { requestPasswordReset } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      await requestPasswordReset(email);
      setSuccess(true);
    } catch (error) {
      setError('Įvyko klaida siunčiant slaptažodžio atkūrimo užklausą');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Atkurti slaptažodį
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Įveskite savo el. paštą, kad gautumėte slaptažodžio atkūrimo nuorodą
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">
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
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
                placeholder="El. pašto adresas"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          {success && (
            <div className="rounded-md bg-green-50 p-4">
              <div className="text-sm text-green-700">Slaptažodžio atkūrimo nuoroda išsiųsta!</div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Siunčiama...' : 'Siųsti atkūrimo nuorodą'}
            </button>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              Prisiminti slaptažodį? <a href="/login" className="font-medium text-orange-600 hover:text-orange-500">Prisijungti</a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
