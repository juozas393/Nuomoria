import React, { useMemo, useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { getDefaultRouteForRole } from '../utils/roleRouting';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import logoImage from '../assets/LogoNormalSize-Photoroom.png';
import { UserRole } from '../types/user';

const SIGNUP_ROLE_KEY = 'signup:desiredRole';
const SIGNUP_FLOW_KEY = 'signup:flow';
const SIGNUP_TIMESTAMP_KEY = 'signup:timestamp';
type SignupRole = Extract<UserRole, 'tenant' | 'landlord'>;

const collectStorages = (): Storage[] => {
  if (typeof window === 'undefined') {
    return [];
  }
  const storages: Storage[] = [];
  try {
    if (window.localStorage) {
      storages.push(window.localStorage);
    }
  } catch {
    // ignore storage access errors
  }
  try {
    if (window.sessionStorage) {
      storages.push(window.sessionStorage);
    }
  } catch {
    // ignore storage access errors
  }
  return storages;
};

const writeSignupMeta = (key: string, value: string) => {
  collectStorages().forEach((storage) => {
    try {
      storage.setItem(key, value);
    } catch {
      // ignore
    }
  });
};

const readSignupMeta = (key: string): string | null => {
  for (const storage of collectStorages()) {
    try {
      const value = storage.getItem(key);
      if (value !== null) {
        return value;
      }
    } catch {
      // ignore
    }
  }
  return null;
};

const RegisterPage: React.FC = () => {
  const { loginWithGoogle, user, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<SignupRole>('landlord');

  useEffect(() => {
    try {
      window.localStorage.removeItem('login:autoGoogle');
      window.localStorage.removeItem('auth:google-login-intent');
    } catch {
      // ignore
    }
    writeSignupMeta(SIGNUP_FLOW_KEY, 'google');
  }, []);

  useEffect(() => {
    writeSignupMeta(SIGNUP_ROLE_KEY, selectedRole);
    writeSignupMeta('signup.role', selectedRole);
  }, [selectedRole]);

  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      const target = getDefaultRouteForRole(user.role);
      navigate(target, { replace: true });
    }
  }, [loading, isAuthenticated, user, navigate]);

  const handleSelectRole = (role: SignupRole) => {
    setSelectedRole(role);
    writeSignupMeta(SIGNUP_ROLE_KEY, role);
    writeSignupMeta('signup.role', role);
  };

  const roleOptions: Array<{
    value: SignupRole;
    title: string;
    description: string;
    bulletPoints: string[];
  }> = useMemo(
    () => [
      {
        value: 'landlord',
        title: 'Esu nuomotojas',
        description: 'Valdau kelis objektus ir noriu matyti jų veiklos analizę.',
        bulletPoints: [
          'Pilnas adresų ir nuomininkų valdymas',
          'Komunalinių rodmenų stebėjimas',
          'Finansinių ataskaitų suvestinės',
        ],
      },
      {
        value: 'tenant',
        title: 'Esu nuomininkas',
        description: 'Noriu matyti savo nuomos sutartį ir mokėjimų istoriją.',
        bulletPoints: [
          'Nuomos mokėjimų istorija ir grafikas',
          'Komunalinių saskaitų apžvalga',
          'Pagalbos kanalai su nuomotoju',
        ],
      },
    ],
    [],
  );

  const handleGoogleSignup = async () => {
    setError('');
    setIsLoading(true);

    try {
      const timestamp = Date.now().toString();
      writeSignupMeta(SIGNUP_ROLE_KEY, selectedRole);
      writeSignupMeta('signup.role', selectedRole);
      writeSignupMeta(SIGNUP_FLOW_KEY, 'google');
      writeSignupMeta(SIGNUP_TIMESTAMP_KEY, timestamp);

      const result = await loginWithGoogle(selectedRole);
      if (!result.success) {
        setError(result.error || 'Nepavyko prisijungti su Google paskyra');
        return;
      }

      navigate('/', { replace: true });
    } catch (err) {
      setError('Nepavyko prisijungti su Google paskyra. Bandykite dar kartą.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-white">
      {/* Kairė pusė: branding */}
      <div className="flex items-center justify-center px-6 lg:px-12 py-8 bg-white">
        <div className="w-full max-w-md">
          <div className="w-full max-h-[28vh] flex items-center justify-center mb-6">
            <img 
              src={logoImage} 
              alt="Nuomoria Logo" 
              className="w-full h-auto max-h-full object-contain"
            />
          </div>
          <h2 className="text-2xl font-semibold text-primary mb-4 text-center">
            Registracija per Google paskyrą
          </h2>
          <p className="text-black/75 text-sm lg:text-base text-center leading-relaxed">
            Registracija galima tik naudojant Google. Prisijungę pirmą kartą galėsite susikurti unikalų vartotojo vardą ir slaptažodį, kad vėliau prisijungtumėte ir be Google.
          </p>
        </div>
      </div>

      {/* Dešinė pusė: veiksmų kortelė */}
      <div className="flex items-center justify-center px-4 lg:px-8 py-10 bg-white">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/10 p-6 lg:p-8 space-y-6">
            <div className="flex items-start space-x-3 rounded-xl border border-black/10 bg-white p-4">
              <InformationCircleIcon className="w-6 h-6 text-primary shrink-0" />
              <div className="text-sm text-black/80 leading-relaxed">
                <p className="font-medium text-black">Kaip tai veikia?</p>
                <ul className="mt-2 space-y-1 list-disc list-inside text-black/70">
                  <li>Prisijunkite su Google paskyra.</li>
                  <li>Pirmo prisijungimo metu sukursite vartotojo vardą (unikalų) ir slaptažodį.</li>
                  <li>Vėliau galėsite jungtis ir su Google, ir su savo nauju slaptažodžiu.</li>
                </ul>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <p className="text-sm font-semibold text-black">
                Pasirinkite, kokią paskyrą kuriate:
              </p>
              {process.env.NODE_ENV === 'development' && (
                <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4 text-xs text-black/80 space-y-1">
                  <p className="font-semibold text-primary">Debug (tik development režime)</p>
                  <p>signup.role: {readSignupMeta('signup.role') ?? '∅'}</p>
                  <p>signup:desiredRole: {readSignupMeta(SIGNUP_ROLE_KEY) ?? '∅'}</p>
                  <p>signup:flow: {readSignupMeta(SIGNUP_FLOW_KEY) ?? '∅'}</p>
                  <p>signup:timestamp: {readSignupMeta(SIGNUP_TIMESTAMP_KEY) ?? '∅'}</p>
                </div>
              )}
              <div className="grid grid-cols-1 gap-4">
                {roleOptions.map((option) => {
                  const isActive = option.value === selectedRole;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleSelectRole(option.value)}
                      className={`text-left rounded-2xl border-2 transition-all duration-200 p-4 focus:outline-none focus:ring-4 focus:ring-[#2F8481]/20 ${
                        isActive
                          ? 'border-[#2F8481] bg-[#2F8481]/10 shadow-md'
                          : 'border-black/10 hover:border-[#2F8481]/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-semibold text-black">{option.title}</p>
                          <p className="text-sm text-black/70 mt-1">{option.description}</p>
                        </div>
                        <div
                          className={`h-3 w-3 rounded-full border ${
                            isActive ? 'bg-[#2F8481] border-[#2F8481]' : 'border-black/20'
                          }`}
                          aria-hidden
                        />
                      </div>
                      <ul className="mt-3 space-y-1 text-xs text-black/70">
                        {option.bulletPoints.map((point) => (
                          <li key={point} className="flex items-center gap-2">
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#2F8481]" />
                            {point}
                          </li>
                        ))}
                      </ul>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={handleGoogleSignup}
              disabled={isLoading}
              className="w-full flex items-center justify-center px-4 py-3 border border-black/20 rounded-lg bg-white text-black hover:bg-white/90 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 font-medium"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              {isLoading ? 'Jungiama prie Google...' : 'Registruotis su Google'}
            </button>

            <div className="text-center text-sm text-black/70">
              Jau turite paskyrą?{' '}
              <Link to="/login" className="text-primary font-medium hover:text-primary/80">
                Prisijunkite
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
