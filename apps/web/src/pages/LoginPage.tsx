import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import logoImage from '../assets/LogoNormalSize.png';

const LoginPage: React.FC = () => {
  const { signInWithGoogle, loading } = useAuth();
  const navigate = useNavigate();
  const clearAuthError = useCallback(() => {
    try {
      localStorage.removeItem('auth:lastError');
    } catch (err) {
      // ignore
    }
  }, []);

  const [globalError, setGlobalError] = useState('');
  const [googleSubmitting, setGoogleSubmitting] = useState(false);

  useEffect(() => {
    try {
      const storedError = localStorage.getItem('auth:lastError');
      if (storedError) {
        setGlobalError(storedError);
        localStorage.removeItem('auth:lastError');
      }
    } catch (err) {
      // ignore storage errors
    }
  }, []);

  const handleGoogleLogin = useCallback(async () => {
    setGlobalError('');
    setGoogleSubmitting(true);

    try {
      // signInWithGoogle redirects to Google OAuth - no return value
      await signInWithGoogle();
      clearAuthError();
      // Google OAuth will redirect automatically, no need to handle success here
    } catch (error) {
      setGlobalError('Nepavyko prisijungti su Google paskyra.');
      setGoogleSubmitting(false);
    }
  }, [signInWithGoogle, clearAuthError]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      const shouldAuto = window.localStorage.getItem('login:autoGoogle');
      if (shouldAuto === 'true') {
        window.localStorage.removeItem('login:autoGoogle');
        handleGoogleLogin();
      }
    } catch {
      // ignore storage errors
    }
  }, [handleGoogleLogin]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-[#f3fbfb] to-white flex items-center">
      <div className="w-full max-w-6xl mx-auto px-4 lg:px-12 py-8 lg:py-12">
        <div className="flex flex-col md:flex-row md:items-start md:gap-10 lg:gap-14">
          <div className="flex-1 max-w-xl">
            <div className="flex flex-col items-center md:items-start text-center md:text-left gap-6 lg:gap-7">
              <img src={logoImage} alt="Nuomoria Logo" className="h-28 lg:h-36 w-auto drop-shadow-sm" />
              <div className="space-y-4 w-full">
                <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1 text-sm font-medium text-primary">
                  Nuomoria platforma – prisijunkite ir tęskite
                </span>
                <h1 className="text-3xl lg:text-4xl font-semibold text-gray-900 leading-tight">
                  Valdykite turto nuomą patogiai – prisijunkite vos per kelias sekundes
                </h1>
                <p className="text-sm lg:text-base text-gray-600 leading-relaxed">
                  Prisijunkite naudodami savo Google paskyrą. Prisijungimas yra saugus, o duomenys saugomi pagal naujausius standartus.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                <div className="rounded-2xl border border-primary/20 bg-primary/5 px-5 py-4 shadow-sm text-left">
                  <p className="text-xs uppercase tracking-wide text-primary/70">Patikimas prisijungimas</p>
                  <p className="text-lg font-semibold text-primary">Saugus Google OAuth prisijungimas</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm text-left space-y-2">
                  <p className="text-xs uppercase tracking-wide text-gray-400">Pasitikėjimas</p>
                  <p className="text-lg font-semibold text-gray-800">Nuomorią naudoja 10+ NT valdytojų</p>
                  <div className="flex items-center gap-2 text-gray-300 text-xs">
                    <span className="inline-flex h-2 w-2 rounded-full bg-primary/60" />
                    <span className="uppercase tracking-wide">Patikrinta partnerių</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full md:w-[420px] md:shrink-0 md:sticky md:top-8 mt-10 md:mt-0 flex justify-center">
            <div className="w-full max-w-md md:max-w-none">
              <div className="rounded-[26px] border border-gray-100 bg-white shadow-xl backdrop-blur px-6 py-8 space-y-6 sm:px-7 sm:py-9 sm:space-y-7 lg:px-8 lg:py-10">
                <div className="text-center space-y-3 sm:space-y-4">
                  <h2 className="text-xl font-semibold text-gray-900 sm:text-2xl md:text-[26px]">Prisijunkite prie Nuomoria paskyros</h2>
                  <p className="text-sm text-gray-600 max-w-sm mx-auto">
                    Prisijunkite naudodami savo Google paskyrą ir tęskite darbą su Nuomoria.
                  </p>
                </div>

                <div className="space-y-5 sm:space-y-6">
                  <button
                    onClick={handleGoogleLogin}
                    disabled={googleSubmitting || loading}
                    className="w-full flex items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-4 text-sm font-medium text-gray-700 shadow-sm transition-all duration-200 hover:shadow-md hover:border-primary/35 hover:bg-gray-50 hover:text-primary active:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/35 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                  >
                    {googleSubmitting ? (
                      <>
                        <svg className="h-5 w-5 animate-spin text-primary" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                        </svg>
                        <span>Jungiama...</span>
                      </>
                    ) : (
                      <>
                        <svg className="h-5 w-5" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        <span>Prisijungti su Google</span>
                      </>
                    )}
                  </button>

                  {globalError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                      {globalError}
                    </div>
                  )}

                  <div className="pt-4 text-center text-sm text-gray-600">
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Prisijungimas vyksta saugiu šifruotu ryšiu per Google OAuth. Jūsų duomenys saugomi pagal industrijos standartus.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
