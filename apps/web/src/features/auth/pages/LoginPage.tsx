import React, { useState, useEffect, useCallback, memo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import GoogleButton from '../components/GoogleButton';
import logoImage from '../../../assets/logocanvaTransparent.png';
import smallLogoWhite from '../../../assets/SmallLogoWHITEWithoutBG.png';
// Background image path (optimized - modern cityscape)
const heroBgImage = '/images/ImageIntroduction.webp';

type AuthTab = 'google' | 'email';

// Map Supabase auth errors to Lithuanian
const mapAuthError = (msg: string): string => {
  const m = msg.toLowerCase();
  if (m.includes('user already registered') || m.includes('already been registered')) return 'Šis el. paštas jau užregistruotas. Bandykite prisijungti.';
  if (m.includes('invalid login credentials') || m.includes('invalid credentials')) return 'Neteisingas el. paštas arba slaptažodis';
  if (m.includes('email not confirmed')) return 'El. paštas nepatvirtintas. Patikrinkite savo paštą.';
  if (m.includes('rate limit') || m.includes('too many requests')) return 'Per daug bandymų. Palaukite ir bandykite vėliau.';
  if (m.includes('password')) return 'Slaptažodis per silpnas (min. 6 simboliai)';
  if (m.includes('email')) return 'Netinkamas el. pašto adresas';
  return msg; // fallback to original
};

/* ─── Email Auth Form Sub-component ─── */
interface EmailAuthFormProps {
  compact?: boolean;
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  confirmPassword: string;
  setConfirmPassword: (v: string) => void;
  isRegister: boolean;
  setIsRegister: (v: boolean) => void;
  isForgotPassword?: boolean;
  setIsForgotPassword?: (v: boolean) => void;
  emailLoading: boolean;
  emailError: string;
  emailSuccess: string;
  setEmailError: (v: string) => void;
  setEmailSuccess: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

const EmailAuthForm = memo<EmailAuthFormProps>(({
  compact = false, email, setEmail, password, setPassword,
  confirmPassword, setConfirmPassword, isRegister, setIsRegister,
  isForgotPassword, setIsForgotPassword,
  emailLoading, emailError, emailSuccess, setEmailError, setEmailSuccess, onSubmit,
}) => {
  const inputCls = compact
    ? 'w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-[13px] text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 outline-none transition-all'
    : 'w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-[14px] text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 outline-none transition-all';

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="El. paštas"
          className={inputCls}
          disabled={emailLoading}
          autoComplete="email"
        />
      </div>

      {!isForgotPassword && (
        <div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Slaptažodis"
            className={inputCls}
            disabled={emailLoading}
            autoComplete={isRegister ? 'new-password' : 'current-password'}
          />
        </div>
      )}

      {!isForgotPassword && isRegister && (
        <div>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Pakartokite slaptažodį"
            className={inputCls}
            disabled={emailLoading}
            autoComplete="new-password"
          />
        </div>
      )}

      {!isForgotPassword && !isRegister && setIsForgotPassword && (
        <div className="flex justify-end pr-1">
          <button
            type="button"
            onClick={() => { setIsForgotPassword(true); setEmailError(''); setEmailSuccess(''); }}
            className="text-[12px] text-[#2F8481] hover:underline font-medium"
          >
            Pamiršau slaptažodį
          </button>
        </div>
      )}

      {emailError && (
        <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-[12px] text-red-600">
          {emailError}
        </div>
      )}
      {emailSuccess && (
        <div className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-[12px] text-emerald-700">
          {emailSuccess}
        </div>
      )}

      <button
        type="submit"
        disabled={emailLoading}
        className="w-full h-12 flex items-center justify-center gap-2 rounded-[15px] bg-[#2F8481] text-white text-[15px] font-semibold shadow-md transition-all duration-200 hover:bg-[#267673] hover:shadow-lg hover:-translate-y-[1px] active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {emailLoading ? (
          <>
            <svg className="animate-spin w-[18px] h-[18px]" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>{isForgotPassword ? 'Siunčiama...' : isRegister ? 'Kuriama...' : 'Jungiamasi...'}</span>
          </>
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
            <span>{isForgotPassword ? 'Siųsti nuorodą' : isRegister ? 'Registruotis' : 'Prisijungti'}</span>
          </>
        )}
      </button>

      <p className="text-[12px] text-center" style={{ color: '#667085' }}>
        {isForgotPassword ? (
          <>Prisiminėte slaptažodį?{' '}
            <button type="button" onClick={() => { setIsForgotPassword!(false); setEmailError(''); setEmailSuccess(''); }} className="font-medium text-teal-600 hover:text-teal-700 transition-colors">Grįžti atgal</button>
          </>
        ) : isRegister ? (
          <>Jau turite paskyrą?{' '}
            <button type="button" onClick={() => { setIsRegister(false); setEmailError(''); setEmailSuccess(''); }} className="font-medium text-teal-600 hover:text-teal-700 transition-colors">Prisijungti</button>
          </>
        ) : (
          <>Neturite paskyros?{' '}
            <button type="button" onClick={() => { setIsRegister(true); setEmailError(''); setEmailSuccess(''); }} className="font-medium text-teal-600 hover:text-teal-700 transition-colors">Registruotis</button>
          </>
        )}
      </p>
    </form>
  );
});
EmailAuthForm.displayName = 'EmailAuthForm';

/* ─── Tab Switcher Sub-component ─── */
interface AuthTabSwitcherProps {
  activeTab: AuthTab;
  onTabChange: (tab: AuthTab) => void;
  compact?: boolean;
}

const AuthTabSwitcher = memo<AuthTabSwitcherProps>(({ activeTab, onTabChange, compact = false }) => (
  <div
    className={`flex rounded-xl p-1 ${compact ? 'mb-4' : 'mb-6'}`}
    style={{ backgroundColor: 'rgba(0,0,0,0.04)' }}
  >
    <button
      type="button"
      onClick={() => onTabChange('email')}
      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-semibold transition-all duration-200 ${
        activeTab === 'email'
          ? 'bg-white text-gray-900 shadow-sm'
          : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
      </svg>
      El. paštu
    </button>
    <button
      type="button"
      onClick={() => onTabChange('google')}
      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-semibold transition-all duration-200 ${
        activeTab === 'google'
          ? 'bg-white text-gray-900 shadow-sm'
          : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" className="flex-shrink-0">
        <path fill={activeTab === 'google' ? '#4285F4' : '#9CA3AF'} d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill={activeTab === 'google' ? '#34A853' : '#9CA3AF'} d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill={activeTab === 'google' ? '#FBBC05' : '#9CA3AF'} d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill={activeTab === 'google' ? '#EA4335' : '#9CA3AF'} d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
      </svg>
      Google
    </button>
  </div>
));
AuthTabSwitcher.displayName = 'AuthTabSwitcher';

/**
 * Premium Image-Led Login Page
 * - Full-bleed hero background with gradient overlay
 * - Theme-switchable auth card (glass/dark/split)
 * - Enterprise/SaaS premium feel
 */

/**
 * 🎨 THEME SWITCHER - Change this to try variants:
 * - "glass": Frosted glass with inner opaque panel (default)
 * - "dark": Dark card with white Google button
 * - "split": Dark brand header + light form section
 */
type LoginCardTheme = "glass" | "dark" | "split";

const LoginPage: React.FC = () => {
  const LOGIN_CARD_THEME = "glass" as LoginCardTheme; // ← Change to "dark" or "split"
  const navigate = useNavigate();
  const { user, login, register } = useAuth();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [authTab, setAuthTab] = useState<AuthTab>('email');

  // Shared email form state (lifted up to survive desktop↔mobile breakpoint switches)
  const [emailFormEmail, setEmailFormEmail] = useState('');
  const [emailFormPassword, setEmailFormPassword] = useState('');
  const [emailFormConfirmPassword, setEmailFormConfirmPassword] = useState('');
  const [emailFormIsRegister, setEmailFormIsRegister] = useState(false);
  const [emailFormIsForgotPassword, setEmailFormIsForgotPassword] = useState(false);
  const [emailFormLoading, setEmailFormLoading] = useState(false);
  const [emailFormError, setEmailFormError] = useState('');
  const [emailFormSuccess, setEmailFormSuccess] = useState('');

  const handleEmailSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailFormError('');
    setEmailFormSuccess('');

    if (!emailFormEmail.trim()) { setEmailFormError('Įveskite el. paštą'); return; }

    if (emailFormIsForgotPassword) {
      setEmailFormLoading(true);
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(emailFormEmail, {
          redirectTo: `${window.location.origin}/profilis`
        });
        if (error) {
          setEmailFormError(mapAuthError(error.message));
        } else {
          setEmailFormSuccess('Slaptažodžio atstatymo nuoroda išsiųsta į jūsų paštą.');
        }
      } catch {
        setEmailFormError('Įvyko netikėta klaida');
      } finally {
        setEmailFormLoading(false);
      }
      return;
    }

    if (!emailFormPassword.trim()) { setEmailFormError('Įveskite slaptažodį'); return; }
    if (emailFormPassword.length < 6) { setEmailFormError('Slaptažodis turi būti bent 6 simbolių'); return; }

    if (emailFormIsRegister) {
      if (emailFormPassword !== emailFormConfirmPassword) { setEmailFormError('Slaptažodžiai nesutampa'); return; }
      setEmailFormLoading(true);
      try {
        const result = await register({ identifier: emailFormEmail, password: emailFormPassword, role: null });
        if (!result.success) {
          setEmailFormError(mapAuthError(result.error || 'Klaida kuriant paskyrą'));
        } else {
          setEmailFormSuccess('Paskyra sukurta! Galite prisijungti.');
          setEmailFormIsRegister(false);
          setEmailFormPassword('');
          setEmailFormConfirmPassword('');
        }
      } catch {
        setEmailFormError('Įvyko netikėta klaida');
      } finally {
        setEmailFormLoading(false);
      }
    } else {
      setEmailFormLoading(true);
      try {
        const result = await login(emailFormEmail, emailFormPassword);
        if (!result.success) {
          setEmailFormError(mapAuthError(result.error || 'Neteisingi prisijungimo duomenys'));
        } else {
          // Login succeeded — wait for AuthContext to update and redirect
          setEmailFormSuccess('Prisijungta! Nukreipiama...');
          // The useEffect listening to `user` will handle role-based navigation naturally without a hard reload.
        }
      } catch {
        setEmailFormError('Įvyko netikėta klaida');
      } finally {
        setEmailFormLoading(false);
      }
    }
  }, [emailFormEmail, emailFormPassword, emailFormConfirmPassword, emailFormIsRegister, emailFormIsForgotPassword, login, register]);

  // Shared props object for EmailAuthForm
  const emailFormProps = {
    email: emailFormEmail, setEmail: setEmailFormEmail,
    password: emailFormPassword, setPassword: setEmailFormPassword,
    confirmPassword: emailFormConfirmPassword, setConfirmPassword: setEmailFormConfirmPassword,
    isRegister: emailFormIsRegister, setIsRegister: setEmailFormIsRegister,
    isForgotPassword: emailFormIsForgotPassword, setIsForgotPassword: setEmailFormIsForgotPassword,
    emailLoading: emailFormLoading, emailError: emailFormError, emailSuccess: emailFormSuccess,
    setEmailError: setEmailFormError, setEmailSuccess: setEmailFormSuccess,
    onSubmit: handleEmailSubmit,
  };

  // Redirect authenticated users (critical for email login — Google goes through /auth/callback)
  useEffect(() => {
    if (user) {
      if (user.role === 'tenant') {
        navigate('/tenant', { replace: true });
      } else if (user.role === 'admin') {
        navigate('/admin', { replace: true });
      } else if (user.role === 'landlord' || user.role === 'property_manager') {
        navigate('/dashboard', { replace: true });
      } else {
        // No role → onboarding
        navigate('/onboarding', { replace: true });
      }
    }
  }, [user, navigate]);

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            prompt: 'select_account'  // Always show account picker
          }
        }
      });
    } catch (error) {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Back to landing — floating glass pill */}
      <Link
        to="/"
        className="fixed top-3 left-3 md:top-5 md:left-5 z-50 inline-flex items-center gap-2 px-3 py-2 md:px-4 md:py-2.5 rounded-full text-[12px] md:text-[13px] font-medium text-white/90 hover:text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
        style={{
          backgroundColor: 'rgba(255,255,255,0.12)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderWidth: '1px',
          borderColor: 'rgba(255,255,255,0.18)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.25)'
        }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.20)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)'; }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        <span className="hidden md:inline">Grįžti į pagrindinį</span>
      </Link>
      {/* Hero Background Image with scale */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${heroBgImage})`,
          transform: 'scale(1.05)',
          transformOrigin: 'center'
        }}
      />

      {/* Cleaner Directional Gradient - cinematic but not muddy */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(90deg, rgba(3,6,8,0.85) 0%, rgba(3,6,8,0.55) 50%, rgba(3,6,8,0.30) 100%)'
        }}
      />

      {/* Subtle teal radial glow behind right card */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 70% 40%, rgba(16,185,170,0.12) 0%, transparent 55%)'
        }}
      />

      {/* Main Content Container */}
      <div className="relative z-10 min-h-screen">
        {/* Desktop Layout */}
        <div className="hidden md:block">
          <div className="max-w-[1280px] mx-auto px-8 lg:px-12 min-h-screen flex items-center py-16">
            <div className="grid grid-cols-12 gap-10 lg:gap-16 w-full items-center">

              {/* LEFT COLUMN - PREMIUM HERO PANEL */}
              <div className="col-span-7">
                {/* Premium Content Panel */}
                <div
                  className="max-w-[560px] p-8 lg:p-12 rounded-[28px] border shadow-[0_24px_70px_rgba(0,0,0,0.45),0_10px_28px_rgba(0,0,0,0.25)]"
                  style={{
                    backgroundColor: 'rgba(6,10,12,0.84)',
                    borderColor: 'rgba(255,255,255,0.13)',
                    backdropFilter: 'blur(16px)'
                  }}
                >
                  {/* Headline - PURE WHITE, tighter tracking */}
                  <h1 className="text-[40px] lg:text-[54px] xl:text-[58px] font-bold text-white leading-[1.15] mb-5 tracking-[-0.025em] login-fade-in overflow-visible pb-1" style={{ animationDelay: '0.1s' }}>
                    Valdykite nuomą{' '}
                    <span className="login-gradient-text italic" style={{ fontFamily: "'Playfair Display', serif" }}>paprastai </span>
                  </h1>

                  {/* Description - white/82 */}
                  <p className="text-[17px] leading-[1.7] mb-8 login-fade-in" style={{ color: 'rgba(255,255,255,0.82)', animationDelay: '0.25s' }}>
                    Profesionali platforma nekilnojamojo turto valdymui. Stebėkite mokėjimus,
                    bendrauti su nuomininkais ir valdykite dokumentus vienoje vietoje.
                  </p>

                  {/* Premium Badges - Consistent */}
                  <div className="flex flex-wrap items-center gap-2.5 mb-9 login-fade-in" style={{ animationDelay: '0.4s' }}>
                    <div
                      className="inline-flex items-center gap-2 h-9 px-3.5 rounded-full text-[13px] font-medium transition-colors duration-150 cursor-default"
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.14)',
                        borderWidth: '1px',
                        borderColor: 'rgba(255,255,255,0.18)',
                        color: 'rgba(255,255,255,0.90)'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.20)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.14)'}
                    >
                      <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                      <span>100% Nemokama</span>
                    </div>
                    <div
                      className="inline-flex items-center gap-2 h-9 px-3.5 rounded-full text-[13px] font-medium transition-colors duration-150 cursor-default"
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.14)',
                        borderWidth: '1px',
                        borderColor: 'rgba(255,255,255,0.18)',
                        color: 'rgba(255,255,255,0.90)'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.20)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.14)'}
                    >
                      <svg className="w-3.5 h-3.5 text-[#3AB09E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                      </svg>
                      <span>Saugus OAuth</span>
                    </div>
                    <div
                      className="inline-flex items-center gap-2 h-9 px-3.5 rounded-full text-[13px] font-medium transition-colors duration-150 cursor-default"
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.14)',
                        borderWidth: '1px',
                        borderColor: 'rgba(255,255,255,0.18)',
                        color: 'rgba(255,255,255,0.90)'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.20)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.14)'}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                      </svg>
                      <span>Realaus laiko</span>
                    </div>
                  </div>

                  {/* Feature List + Brand watermark — side by side */}
                  <div className="flex items-center gap-6 login-fade-in" style={{ animationDelay: '0.55s' }}>
                    <div className="space-y-[18px] flex-1">
                      <div className="flex items-start gap-3.5">
                        <div
                          className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{
                            backgroundColor: 'rgba(255,255,255,0.14)',
                            borderWidth: '1px',
                            borderColor: 'rgba(255,255,255,0.16)'
                          }}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" className="text-[#2F8481]">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                          </svg>
                        </div>
                        <div className="flex-1 pt-0.5">
                          <h3 className="text-[14px] font-semibold mb-0.5" style={{ color: 'rgba(255,255,255,0.92)' }}>
                            Sąskaitos ir skaitikliai
                          </h3>
                          <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.70)' }}>
                            Automatinis sąskaitų generavimas pagal skaitliukų rodmenis
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3.5">
                        <div
                          className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{
                            backgroundColor: 'rgba(255,255,255,0.14)',
                            borderWidth: '1px',
                            borderColor: 'rgba(255,255,255,0.16)'
                          }}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" className="text-[#2F8481]">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
                          </svg>
                        </div>
                        <div className="flex-1 pt-0.5">
                          <h3 className="text-[14px] font-semibold mb-0.5" style={{ color: 'rgba(255,255,255,0.92)' }}>
                            Nuomininkų portalas
                          </h3>
                          <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.70)' }}>
                            Nuomininkai patys siunčia rodmenis ir mato sąskaitas
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3.5">
                        <div
                          className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{
                            backgroundColor: 'rgba(255,255,255,0.14)',
                            borderWidth: '1px',
                            borderColor: 'rgba(255,255,255,0.16)'
                          }}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" className="text-[#2F8481]">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                          </svg>
                        </div>
                        <div className="flex-1 pt-0.5">
                          <h3 className="text-[14px] font-semibold mb-0.5" style={{ color: 'rgba(255,255,255,0.92)' }}>
                            Finansų apžvalga
                          </h3>
                          <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.70)' }}>
                            Pajamos, mokėjimai ir užimtumas vienoje vietoje
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* N watermark — right side, aligned with features */}
                    <div className="flex-shrink-0 hidden md:flex items-center">
                      <img src={smallLogoWhite} alt="Nuomoria" className="h-48 w-48 object-contain opacity-40" />
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN - THEME-SWITCHABLE AUTH CARD */}
              <div className="col-span-5">
                <div className="relative max-w-[460px] ml-auto login-slide-up" style={{ animationDelay: '0.3s' }}>

                  {/* VARIANT A: FROSTED GLASS (DEFAULT) */}
                  {LOGIN_CARD_THEME === "glass" && (
                    <div
                      className="relative overflow-hidden rounded-[28px] p-3 login-card-glow"
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.14)',
                        backdropFilter: 'blur(22px)',
                        WebkitBackdropFilter: 'blur(22px)',
                        borderWidth: '1px',
                        borderColor: 'rgba(255,255,255,0.20)',
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.16), 0 30px 90px rgba(0,0,0,0.45), 0 0 60px rgba(47,132,129,0.08)'
                      }}
                    >
                      {/* Inner Opaque Panel */}
                      <div
                        className="rounded-[20px] px-8 py-10"
                        style={{
                          backgroundColor: 'rgba(255,255,255,0.96)'
                        }}
                      >
                        {/* Logo */}
                        <div className="flex justify-center mb-5">
                          <img
                            src={logoImage}
                            alt="Nuomoria"
                            className="h-[64px] w-auto object-contain"
                          />
                        </div>

                        {/* Heading */}
                        <div className="text-center mb-5">
                          <h2 className="text-[24px] font-bold text-gray-900 mb-2 leading-tight tracking-[-0.02em]">
                            Sveiki sugrįžę
                          </h2>
                          <p className="text-[13px] leading-relaxed" style={{ color: '#667085' }}>
                            Prisijunkite ir tęskite nuomos valdymą
                          </p>
                        </div>

                        {/* Tab Switcher */}
                        <AuthTabSwitcher activeTab={authTab} onTabChange={setAuthTab} />

                        {/* Auth Content */}
                        {authTab === 'google' ? (
                          <div className="mb-6">
                            <div className="login-google-btn-wrapper">
                              <GoogleButton
                                onClick={handleGoogleLogin}
                                loading={googleLoading}
                              />
                            </div>
                            <p className="text-[11px] text-center mt-2.5 leading-relaxed" style={{ color: '#98A2B3' }}>
                              Nauji vartotojai sukuria paskyrą automatiškai
                            </p>
                          </div>
                        ) : (
                          <div className="mb-4">
                            <EmailAuthForm {...emailFormProps} />
                          </div>
                        )}

                        {/* Footer */}
                        <div className="pt-4 flex items-center justify-center gap-3" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                          <p className="text-[11px] flex items-center gap-1.5" style={{ color: '#B0B7C3' }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-500">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                            </svg>
                            Saugus prisijungimas
                          </p>
                          <span className="text-[11px]" style={{ color: '#D0D5DD' }}>·</span>
                          <Link
                            to="/pagalba"
                            className="text-[11px] font-medium text-teal-600 hover:text-teal-700 transition-colors"
                          >
                            Pagalba
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* VARIANT B: DARK CARD */}
                  {LOGIN_CARD_THEME === "dark" && (
                    <div
                      className="relative overflow-hidden rounded-[28px] px-8 py-8 shadow-[0_30px_90px_rgba(0,0,0,0.55)]"
                      style={{
                        background: 'linear-gradient(180deg, rgba(12,16,18,0.88) 0%, rgba(12,16,18,0.78) 100%)',
                        borderWidth: '1px',
                        borderColor: 'rgba(255,255,255,0.10)'
                      }}
                    >
                      {/* Logo Header - BIG */}
                      <div className="pb-5 mb-6 border-b" style={{ borderColor: 'rgba(255,255,255,0.10)' }}>
                        <img
                          src={logoImage}
                          alt="Nuomoria"
                          className="h-[110px] w-auto object-contain mx-auto lg:h-[96px]"
                          style={{ filter: 'brightness(1.1)' }}
                        />
                      </div>

                      {/* Title + Subtitle */}
                      <div className="mb-6">
                        <h2 className="text-[30px] font-bold mb-2 leading-tight tracking-[-0.02em]" style={{ color: 'rgba(255,255,255,0.96)' }}>
                          Prisijungti
                        </h2>
                        <p className="text-[15px] leading-relaxed max-w-sm" style={{ color: 'rgba(255,255,255,0.70)' }}>
                          Pradėkite valdyti savo nekilnojamąjį turtą
                        </p>
                      </div>

                      {/* White Google Button on Dark */}
                      <div className="space-y-3 mb-5">
                        <button
                          onClick={handleGoogleLogin}
                          disabled={googleLoading}
                          className="w-full h-[52px] flex items-center justify-center gap-3 rounded-[16px] bg-white text-gray-900 px-4 text-[15px] font-semibold shadow-lg transition-colors duration-[180ms] ease-out hover:bg-gray-50 hover:shadow-xl hover:-translate-y-[2px] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0C1012]"
                          type="button"
                        >
                          {googleLoading ? (
                            <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
                          ) : (
                            <>
                              <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                              </svg>
                              <span>Tęsti su Google</span>
                            </>
                          )}
                        </button>
                        <p className="text-[12px] text-center leading-relaxed" style={{ color: 'rgba(255,255,255,0.60)' }}>
                          Nauji vartotojai kuria paskyrą per Google
                        </p>
                      </div>

                      {/* Trust Badge */}
                      <div className="pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.10)' }}>
                        <p className="text-[12px] text-center flex items-center justify-center gap-1.5" style={{ color: 'rgba(255,255,255,0.60)' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-400">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                          </svg>
                          <span>Saugus prisijungimas su <span className="font-medium" style={{ color: 'rgba(255,255,255,0.85)' }}>Google</span></span>
                        </p>
                      </div>
                    </div>
                  )}

                  {/* VARIANT C: SPLIT HEADER */}
                  {LOGIN_CARD_THEME === "split" && (
                    <div
                      className="relative overflow-hidden rounded-[28px] shadow-[0_30px_90px_rgba(0,0,0,0.45)]"
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderWidth: '1px',
                        borderColor: 'rgba(0,0,0,0.08)'
                      }}
                    >
                      {/* Dark Brand Header */}
                      <div
                        className="px-8 py-6"
                        style={{
                          background: 'linear-gradient(180deg, rgba(10,14,16,0.92) 0%, rgba(10,14,16,0.88) 100%)',
                          borderBottom: '1px solid rgba(255,255,255,0.10)'
                        }}
                      >
                        <img
                          src={logoImage}
                          alt="Nuomoria"
                          className="h-[110px] w-auto object-contain mx-auto lg:h-[96px]"
                          style={{ filter: 'brightness(1.1)' }}
                        />
                      </div>

                      {/* Light Form Section */}
                      <div className="px-8 py-7">
                        {/* Title + Subtitle */}
                        <div className="mb-6">
                          <h2 className="text-[30px] font-bold text-gray-900 mb-2 leading-tight tracking-[-0.02em]">
                            Prisijungti
                          </h2>
                          <p className="text-[15px] leading-relaxed max-w-sm" style={{ color: '#667085' }}>
                            Pradėkite valdyti savo nekilnojamąjį turtą
                          </p>
                        </div>

                        {/* Google Button */}
                        <div className="space-y-3 mb-5">
                          <GoogleButton
                            onClick={handleGoogleLogin}
                            loading={googleLoading}
                          />
                          <p className="text-[12px] text-center leading-relaxed" style={{ color: '#98A2B3' }}>
                            Nauji vartotojai kuria paskyrą per Google
                          </p>
                        </div>

                        {/* Trust Badge */}
                        <div className="pt-5" style={{ borderTop: '1px solid rgba(0,0,0,0.08)' }}>
                          <p className="text-[12px] text-center flex items-center justify-center gap-1.5" style={{ color: '#98A2B3' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-500">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                            </svg>
                            <span>Saugus prisijungimas su <span className="font-medium text-gray-700">Google</span></span>
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile/Tablet Layout */}
        <div className="md:hidden relative z-10 min-h-screen">
          {/* Hero Header - with background image visible */}
          <div className="relative px-4 pt-14 pb-6">
            {/* Premium Hero Panel - matching desktop */}
            <div
              className="rounded-[20px] p-6 border shadow-[0_16px_48px_rgba(0,0,0,0.4)]"
              style={{
                backgroundColor: 'rgba(6,10,12,0.88)',
                borderColor: 'rgba(255,255,255,0.13)',
                backdropFilter: 'blur(16px)'
              }}
            >
              {/* Headline */}
              <h1 className="text-[28px] font-bold text-white leading-[1.2] mb-3 tracking-[-0.025em] login-fade-in overflow-visible pb-0.5" style={{ animationDelay: '0.1s' }}>
                Valdykite nuomą{' '}
                <span className="login-gradient-text italic" style={{ fontFamily: "'Playfair Display', serif" }}>paprastai </span>
              </h1>

              {/* Description */}
              <p className="text-[13px] leading-[1.65] mb-5 login-fade-in" style={{ color: 'rgba(255,255,255,0.78)', animationDelay: '0.2s' }}>
                Profesionali platforma nekilnojamojo turto valdymui. Stebėkite mokėjimus, bendrauti su nuomininkais ir valdykite dokumentus vienoje vietoje.
              </p>

              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2 mb-6 login-fade-in" style={{ animationDelay: '0.3s' }}>
                {[
                  { dot: true, label: '100% Nemokama' },
                  { icon: 'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z', label: 'Saugus OAuth' },
                  { icon: 'M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z', label: 'Realaus laiko' },
                ].map((b, i) => (
                  <div
                    key={i}
                    className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11px] font-medium"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.12)',
                      borderWidth: '1px',
                      borderColor: 'rgba(255,255,255,0.16)',
                      color: 'rgba(255,255,255,0.88)'
                    }}
                  >
                    {b.dot ? (
                      <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                    ) : (
                      <svg className="w-3 h-3 text-[#3AB09E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d={b.icon} />
                      </svg>
                    )}
                    <span>{b.label}</span>
                  </div>
                ))}
              </div>

              {/* Features */}
              <div className="space-y-3 login-fade-in" style={{ animationDelay: '0.4s' }}>
                {[
                  { icon: 'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z', title: 'Sąskaitos ir skaitikliai', desc: 'Automatinis sąskaitų generavimas pagal skaitliukų rodmenis' },
                  { icon: 'M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155', title: 'Nuomininkų portalas', desc: 'Nuomininkai patys siunčia rodmenis ir mato sąskaitas' },
                  { icon: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z', title: 'Finansų apžvalga', desc: 'Pajamos, mokėjimai ir užimtumas vienoje vietoje' },
                ].map((f, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div
                      className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.12)',
                        borderWidth: '1px',
                        borderColor: 'rgba(255,255,255,0.14)'
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" className="text-[#2F8481]">
                        <path strokeLinecap="round" strokeLinejoin="round" d={f.icon} />
                      </svg>
                    </div>
                    <div className="flex-1 pt-0.5">
                      <h3 className="text-[13px] font-semibold mb-0.5" style={{ color: 'rgba(255,255,255,0.92)' }}>{f.title}</h3>
                      <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.60)' }}>{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Auth Card */}
          <div className="px-4 pb-6">
            {LOGIN_CARD_THEME === "glass" && (
              <div
                className="relative overflow-hidden rounded-[20px] p-2 login-card-glow login-slide-up"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.14)',
                  backdropFilter: 'blur(22px)',
                  WebkitBackdropFilter: 'blur(22px)',
                  borderWidth: '1px',
                  borderColor: 'rgba(255,255,255,0.20)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.16), 0 20px 60px rgba(0,0,0,0.45)',
                  animationDelay: '0.3s'
                }}
              >
                <div className="rounded-[14px] px-5 py-5" style={{ backgroundColor: 'rgba(255,255,255,0.96)' }}>
                  <div className="flex justify-center mb-4">
                    <img src={logoImage} alt="Nuomoria" className="h-[52px] w-auto object-contain" />
                  </div>
                  <div className="text-center mb-3">
                    <h2 className="text-[20px] font-bold text-gray-900 mb-1 leading-tight tracking-[-0.02em]">Sveiki sugrįžę</h2>
                    <p className="text-[12px]" style={{ color: '#667085' }}>Prisijunkite ir tęskite nuomos valdymą</p>
                  </div>

                  {/* Tab Switcher */}
                  <AuthTabSwitcher activeTab={authTab} onTabChange={setAuthTab} compact />

                  {/* Auth Content */}
                  {authTab === 'google' ? (
                    <div className="mb-4">
                      <div className="login-google-btn-wrapper">
                        <GoogleButton onClick={handleGoogleLogin} loading={googleLoading} />
                      </div>
                      <p className="text-[10px] text-center mt-2" style={{ color: '#98A2B3' }}>Nauji vartotojai sukuria paskyrą automatiškai</p>
                    </div>
                  ) : (
                    <div className="mb-3">
                      <EmailAuthForm compact {...emailFormProps} />
                    </div>
                  )}

                  <div className="pt-3 flex items-center justify-center gap-2.5" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                    <p className="text-[10px] flex items-center gap-1" style={{ color: '#B0B7C3' }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-500">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                      </svg>
                      Saugus prisijungimas
                    </p>
                    <span className="text-[10px]" style={{ color: '#D0D5DD' }}>·</span>
                    <Link to="/pagalba" className="text-[10px] font-medium text-teal-600 hover:text-teal-700 transition-colors">Pagalba</Link>
                  </div>
                </div>
              </div>
            )}

            {LOGIN_CARD_THEME === "dark" && (
              <div
                className="relative overflow-hidden rounded-[20px] px-5 py-5 login-slide-up"
                style={{
                  background: 'linear-gradient(180deg, rgba(12,16,18,0.88) 0%, rgba(12,16,18,0.78) 100%)',
                  borderWidth: '1px',
                  borderColor: 'rgba(255,255,255,0.10)',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.55)',
                  animationDelay: '0.3s'
                }}
              >
                <div className="flex justify-center mb-4">
                  <img src={logoImage} alt="Nuomoria" className="h-[52px] w-auto object-contain" style={{ filter: 'brightness(1.1)' }} />
                </div>
                <div className="text-center mb-4">
                  <h2 className="text-[20px] font-bold mb-1 leading-tight" style={{ color: 'rgba(255,255,255,0.96)' }}>Prisijungti</h2>
                  <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.70)' }}>Pradėkite valdyti objektus</p>
                </div>
                <div className="space-y-2 mb-3">
                  <button onClick={handleGoogleLogin} disabled={googleLoading} className="w-full h-[44px] flex items-center justify-center gap-2.5 rounded-[12px] bg-white text-gray-900 px-4 text-[13px] font-semibold shadow-lg active:scale-[0.98] disabled:opacity-60" type="button">
                    {googleLoading ? <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" /> :
                      <><svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg><span>Tęsti su Google</span></>}
                  </button>
                  <p className="text-[10px] text-center" style={{ color: 'rgba(255,255,255,0.55)' }}>Nauji vartotojai kuria paskyrą per Google</p>
                </div>
              </div>
            )}

            {LOGIN_CARD_THEME === "split" && (
              <div className="relative overflow-hidden rounded-[20px] login-slide-up" style={{ backgroundColor: '#FFFFFF', borderWidth: '1px', borderColor: 'rgba(0,0,0,0.08)', boxShadow: '0 20px 60px rgba(0,0,0,0.45)', animationDelay: '0.3s' }}>
                <div className="px-5 py-4" style={{ background: 'linear-gradient(180deg, rgba(10,14,16,0.92) 0%, rgba(10,14,16,0.88) 100%)', borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
                  <img src={logoImage} alt="Nuomoria" className="h-[52px] w-auto object-contain mx-auto" style={{ filter: 'brightness(1.1)' }} />
                </div>
                <div className="px-5 py-5">
                  <div className="mb-4 text-center">
                    <h2 className="text-[20px] font-bold text-gray-900 mb-1 leading-tight">Prisijungti</h2>
                    <p className="text-[12px]" style={{ color: '#667085' }}>Pradėkite valdyti objektus</p>
                  </div>
                  <div className="space-y-2 mb-3">
                    <GoogleButton onClick={handleGoogleLogin} loading={googleLoading} />
                    <p className="text-[10px] text-center" style={{ color: '#98A2B3' }}>Nauji vartotojai kuria paskyrą per Google</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 pb-6 text-center">
            <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.30)' }}>
              © {new Date().getFullYear()} Nuomoria. Visos teisės saugomos.
            </p>
          </div>
        </div>
      </div>

      {/* Styles */}
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; max-height: 0; transform: translateY(-4px); }
          to { opacity: 1; max-height: 600px; transform: translateY(0); }
        }
        .animate-slideDown {
          animation: slideDown 200ms cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* Staggered fade-in for hero elements */
        @keyframes loginFadeIn {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .login-fade-in {
          opacity: 0;
          animation: loginFadeIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        /* Slide-up for auth card */
        @keyframes loginSlideUp {
          from { opacity: 0; transform: translateY(28px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .login-slide-up {
          opacity: 0;
          animation: loginSlideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        /* Gradient text for 'paprastai' */
        .login-gradient-text {
          background: linear-gradient(135deg, #3AB09E 0%, #5ECEC0 50%, #2F8481 100%);
          background-size: 200% 200%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: loginGradientShift 4s ease-in-out infinite;
          display: inline-block;
          padding: 0.05em 0.15em 0.2em 0.1em;
          margin: -0.05em -0.15em -0.2em -0.1em;
        }
        @keyframes loginGradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        /* Card subtle teal glow */
        .login-card-glow {
          transition: box-shadow 0.4s ease;
        }
        .login-card-glow:hover {
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.18), 0 30px 90px rgba(0,0,0,0.5), 0 0 80px rgba(47,132,129,0.15) !important;
        }

        /* Google button hover glow */
        .login-google-btn-wrapper button {
          transition: all 0.2s ease;
        }
        .login-google-btn-wrapper button:hover {
          box-shadow: 0 4px 20px rgba(47,132,129,0.25), 0 2px 8px rgba(0,0,0,0.1);
          transform: translateY(-1px);
        }
        .login-google-btn-wrapper button:active {
          transform: scale(0.98) translateY(0);
        }

        *:focus-visible {
          outline: 2px solid #2F8481;
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
};

export default LoginPage;
