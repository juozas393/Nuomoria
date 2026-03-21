import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import GoogleButton from '../components/GoogleButton';
import logoImage from '../../../assets/logocanvaTransparent.png';

const heroBgImage = '/images/ImageIntroduction.webp';

/**
 * Registration Page — Email/Password sign-up
 * Same premium glass design as LoginPage
 * Email confirmation disabled on staging → direct redirect to onboarding
 */

const RegisterPage: React.FC = () => {
  const [googleLoading, setGoogleLoading] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError('');
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: { prompt: 'select_account' }
        }
      });
    } catch {
      setGoogleLoading(false);
    }
  };

  const handleRegister = async () => {
    setError('');

    // Validation
    if (!firstName.trim()) {
      setError('Įrašykite vardą.');
      return;
    }
    if (!email.trim()) {
      setError('Įrašykite el. paštą.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Neteisingas el. pašto formatas.');
      return;
    }
    if (password.length < 6) {
      setError('Slaptažodis turi būti bent 6 simbolių.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Slaptažodžiai nesutampa.');
      return;
    }

    setLoading(true);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            full_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
          },
        },
      });

      if (signUpError) {
        if (signUpError.message.includes('already registered') || signUpError.message.includes('already been registered')) {
          setError('Šis el. paštas jau užregistruotas. Prisijunkite arba naudokite kitą el. paštą.');
        } else {
          setError(signUpError.message);
        }
        setLoading(false);
        return;
      }

      // Email confirmation OFF → session created immediately
      if (data.session) {
        window.location.href = '/onboarding';
      } else if (data.user && !data.session) {
        // Email confirmation is ON (production) — show message
        setError('');
        setLoading(false);
        // Show confirmation message
        document.getElementById('register-form')?.classList.add('hidden');
        document.getElementById('confirm-message')?.classList.remove('hidden');
      }
    } catch {
      setError('Klaida kuriant paskyrą. Bandykite dar kartą.');
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && email && password && confirmPassword && !loading) {
      handleRegister();
    }
  };

  const inputClass = (compact: boolean) => compact
    ? 'w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[12px] text-gray-700 placeholder-gray-400 focus:ring-2 focus:ring-[#2F8481]/30 focus:border-[#2F8481] transition-all outline-none'
    : 'w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] text-gray-700 placeholder-gray-400 focus:ring-2 focus:ring-[#2F8481]/30 focus:border-[#2F8481] transition-all outline-none';

  /* ═══════════════ Registration Card Content ═══════════════ */

  const renderRegisterCard = (compact = false) => {
    return (
      <>
        {/* Logo */}
        <div className={`flex justify-center ${compact ? 'mb-4' : 'mb-7'}`}>
          <img src={logoImage} alt="Nuomoria" className={`${compact ? 'h-[52px]' : 'h-[64px]'} w-auto object-contain`} />
        </div>

        {/* Heading */}
        <div className={`text-center ${compact ? 'mb-3' : 'mb-5'}`}>
          <h2 className={`${compact ? 'text-[20px] mb-1' : 'text-[24px] mb-2'} font-bold text-gray-900 leading-tight tracking-[-0.02em]`}>
            Sukurti paskyrą
          </h2>
          <p className={`${compact ? 'text-[11px]' : 'text-[13px]'} leading-relaxed`} style={{ color: '#667085' }}>
            Pradėkite valdyti nekilnojamąjį turtą
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className={`${compact ? 'mb-3' : 'mb-4'} p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2`}>
            <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <span className="text-red-600 text-[12px] font-medium">{error}</span>
          </div>
        )}

        {/* Email confirmation message (shown when confirmation is needed) */}
        <div id="confirm-message" className="hidden">
          <div className={`${compact ? 'mb-3' : 'mb-4'} p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center`}>
            <svg className="w-8 h-8 text-emerald-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
            <h3 className="text-[14px] font-bold text-emerald-700 mb-1">Patikrinkite el. paštą</h3>
            <p className="text-[12px] text-emerald-600">
              Išsiuntėme patvirtinimo nuorodą į <strong>{email}</strong>. Paspauskite nuorodą ir galėsite prisijungti.
            </p>
          </div>
          <Link to="/login" className="block text-center text-[12px] font-semibold text-[#2F8481] hover:text-[#267270] transition-colors">
            Grįžti į prisijungimą
          </Link>
        </div>

        {/* Registration form */}
        <div id="register-form">
          {/* Google Button */}
          <div className={compact ? 'mb-3' : 'mb-4'}>
            <div className="login-google-btn-wrapper">
              <GoogleButton onClick={handleGoogleLogin} loading={googleLoading} />
            </div>
          </div>

          {/* Divider */}
          <div className={`flex items-center gap-3 ${compact ? 'mb-3' : 'mb-4'}`}>
            <div className="flex-1 h-px bg-gray-200" />
            <span className={`${compact ? 'text-[10px]' : 'text-[11px]'} font-medium text-gray-400 select-none`}>arba</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleRegister(); }}>
          {/* Form */}
          <div className={`space-y-2.5 ${compact ? 'mb-3' : 'mb-4'}`}>
            {/* Name row */}
            <div className={`grid grid-cols-2 ${compact ? 'gap-2' : 'gap-3'}`}>
              <div>
                <label className={`block ${compact ? 'text-[10px]' : 'text-[11px]'} font-medium text-gray-500 mb-1`}>Vardas *</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Jonas"
                  autoFocus
                  autoComplete="given-name"
                  className={inputClass(compact)}
                />
              </div>
              <div>
                <label className={`block ${compact ? 'text-[10px]' : 'text-[11px]'} font-medium text-gray-500 mb-1`}>Pavardė</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Jonaitis"
                  autoComplete="family-name"
                  className={inputClass(compact)}
                />
              </div>
            </div>
            <div>
              <label className={`block ${compact ? 'text-[10px]' : 'text-[11px]'} font-medium text-gray-500 mb-1`}>El. paštas *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="jonas@pvz.lt"
                autoComplete="email"
                className={inputClass(compact)}
              />
            </div>
            <div>
              <label className={`block ${compact ? 'text-[10px]' : 'text-[11px]'} font-medium text-gray-500 mb-1`}>Slaptažodis *</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Mažiausiai 6 simboliai"
                autoComplete="new-password"
                className={inputClass(compact)}
              />
            </div>
            <div>
              <label className={`block ${compact ? 'text-[10px]' : 'text-[11px]'} font-medium text-gray-500 mb-1`}>Pakartokite slaptažodį *</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="••••••••"
                autoComplete="new-password"
                className={inputClass(compact)}
              />
            </div>
          </div>

          {/* Register button */}
          <button
            onClick={handleRegister}
            disabled={loading || !firstName || !email || !password || !confirmPassword}
            className={`w-full ${compact ? 'h-10 text-[12px] rounded-lg' : 'h-12 text-[14px] rounded-xl'} flex items-center justify-center gap-2 bg-[#2F8481] hover:bg-[#267270] text-white font-semibold shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]`}
            type="submit"
          >
            {loading ? (
              <div className={`animate-spin rounded-full ${compact ? 'h-4 w-4' : 'h-5 w-5'} border-2 border-white border-t-transparent`} />
            ) : (
              'Sukurti paskyrą'
            )}
          </button>

          {/* Already have account */}
          <p className={`text-center ${compact ? 'text-[10px] mt-3' : 'text-[12px] mt-4'}`} style={{ color: '#98A2B3' }}>
            Jau turite paskyrą?{' '}
            <Link to="/login" className="font-semibold text-[#2F8481] hover:text-[#267270] transition-colors">
              Prisijungti
            </Link>
          </p>
          </form>
        </div>
      </>
    );
  };

  /* ═══════════════ RENDER ═══════════════ */

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Back to login */}
      <Link
        to="/login"
        className="fixed top-3 left-3 lg:top-5 lg:left-5 z-50 inline-flex items-center gap-2 px-3 py-2 lg:px-4 lg:py-2.5 rounded-full text-[12px] lg:text-[13px] font-medium text-white/90 hover:text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
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
        <span className="hidden lg:inline">Grįžti į prisijungimą</span>
      </Link>

      {/* Hero Background */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroBgImage})`, transform: 'scale(1.05)', transformOrigin: 'center' }}
      />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(3,6,8,0.85) 0%, rgba(3,6,8,0.55) 50%, rgba(3,6,8,0.30) 100%)' }} />
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 50% 40%, rgba(16,185,170,0.12) 0%, transparent 55%)' }} />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center py-8 px-4">
        <div className="w-full max-w-[440px]">
          {/* Desktop card */}
          <div className="hidden lg:block">
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
              <div className="rounded-[20px] px-8 py-10" style={{ backgroundColor: 'rgba(255,255,255,0.96)' }}>
                {renderRegisterCard(false)}
              </div>
            </div>
          </div>

          {/* Mobile card */}
          <div className="lg:hidden">
            <div
              className="relative overflow-hidden rounded-[20px] p-2 login-card-glow"
              style={{
                backgroundColor: 'rgba(255,255,255,0.14)',
                backdropFilter: 'blur(22px)',
                WebkitBackdropFilter: 'blur(22px)',
                borderWidth: '1px',
                borderColor: 'rgba(255,255,255,0.20)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.16), 0 20px 60px rgba(0,0,0,0.45)',
              }}
            >
              <div className="rounded-[14px] px-5 py-5" style={{ backgroundColor: 'rgba(255,255,255,0.96)' }}>
                {renderRegisterCard(true)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Styles */}
      <style>{`
        .login-card-glow { transition: box-shadow 0.4s ease; }
        .login-card-glow:hover {
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.18), 0 30px 90px rgba(0,0,0,0.5), 0 0 80px rgba(47,132,129,0.15) !important;
        }
        .login-google-btn-wrapper button { transition: all 0.2s ease; }
        .login-google-btn-wrapper button:hover {
          box-shadow: 0 4px 20px rgba(47,132,129,0.25), 0 2px 8px rgba(0,0,0,0.1);
          transform: translateY(-1px);
        }
        .login-google-btn-wrapper button:active { transform: scale(0.98) translateY(0); }
        *:focus-visible { outline: 2px solid #2F8481; outline-offset: 2px; }
      `}</style>
    </div>
  );
};

export default RegisterPage;
