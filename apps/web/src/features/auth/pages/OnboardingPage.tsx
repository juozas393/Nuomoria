import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import logoImage from '../../../assets/logocanvBLACKWithoutBG.png';
import smallLogoWhite from '../../../assets/SmallLogoWHITEWithoutBG.png';

interface OnboardingPageProps {
  userEmail: string;
  userId: string;
}

/* ─────────────────────────────── constants ────────────────────────────── */

const STEPS = ['welcome', 'username', 'role', 'complete'] as const;
type Step = typeof STEPS[number];

const heroBgImage = '/images/ImageIntroduction.jpg';

/* ─────────────────────────── tiny SVG icons ──────────────────────────── */

const CheckIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const SpinnerIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={`animate-spin ${className}`} viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

/* ── lucide-style mini icons for feature tags ── */

const IconPencil = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
  </svg>
);

const IconTarget = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 12h.01" />
  </svg>
);

/* ──────────────────────────── main component ─────────────────────────── */

const OnboardingPage: React.FC<OnboardingPageProps> = ({ userEmail, userId }) => {
  const [step, setStep] = useState<Step>('welcome');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<'landlord' | 'tenant' | ''>('');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  const stepIndex = STEPS.indexOf(step);

  // ── username availability check ──
  useEffect(() => {
    if (!username || username.length < 3) { setUsernameAvailable(null); return; }
    const t = setTimeout(async () => {
      setCheckingUsername(true);
      try {
        const { data, error: e } = await supabase.rpc('check_username_available', { p_username: username.toLowerCase() });
        if (e) throw e;
        setUsernameAvailable(data === true);
      } catch { setUsernameAvailable(null); }
      finally { setCheckingUsername(false); }
    }, 400);
    return () => clearTimeout(t);
  }, [username]);

  // ── step transition ──
  const go = useCallback((next: Step) => {
    setTransitioning(true);
    setTimeout(() => { setStep(next); setTransitioning(false); }, 250);
  }, []);

  // ── validation ──
  const usernameError = username.length >= 3
    ? (!username ? 'Vartotojo vardas privalomas'
      : username.length < 3 ? 'Mažiausiai 3 simboliai'
        : username.length > 20 ? 'Daugiausiai 20 simbolių'
          : !/^[a-z0-9._-]+$/.test(username) ? 'Tik mažosios raidės, skaičiai, taškai, brūkšneliai'
            : usernameAvailable === false ? 'Šis vartotojo vardas jau užimtas'
              : null)
    : null;

  const usernameOk = username.length >= 3 && usernameAvailable === true && !checkingUsername && !usernameError;

  // ── submit ──
  const handleComplete = async () => {
    setError(''); setLoading(true);
    try {
      const { error: pe } = await supabase.from('profiles').insert({
        id: userId, email: userEmail, username: username.toLowerCase(), role,
      });
      if (pe) {
        if (pe.message.includes('duplicate key') || pe.message.includes('unique')) {
          setError('Šis vartotojo vardas jau užimtas'); go('username');
        } else { setError('Nepavyko sukurti profilio. Bandykite dar kartą.'); }
        setLoading(false); return;
      }
      const { error: ue } = await supabase.from('users').update({ role }).eq('id', userId);
      // Silently handle non-critical user update errors
      void ue;

      go('complete'); setLoading(false);

      // Full page reload ensures AuthContext re-hydrates with the new role
      setTimeout(() => {
        window.location.href = role === 'landlord' ? '/dashboard' : '/tenant';
      }, 3000);
    } catch {
      setError('Įvyko nenumatyta klaida. Bandykite dar kartą.'); setLoading(false);
    }
  };

  const firstName = userEmail.split('@')[0].split(/[._-]/)[0];
  const displayName = firstName.charAt(0).toUpperCase() + firstName.slice(1);

  /* ═══════════════════════════ RENDER ═══════════════════════════ */
  return (
    <div className="min-h-screen relative overflow-hidden selection:bg-teal-500/30">

      {/* Background image — same as login page for visual continuity */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${heroBgImage})`,
          transform: 'scale(1.08)',
          transformOrigin: 'center',
        }}
      />

      {/* Dark overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, rgba(3,6,8,0.90) 0%, rgba(3,6,8,0.93) 50%, rgba(3,6,8,0.88) 100%)',
        }}
      />

      {/* Subtle teal ambient glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(47,132,129,0.10), transparent)',
        }}
      />

      {/* ── page layout ── */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-10">

        {/* brand logo */}
        <div className="mb-6 flex items-center gap-2.5 select-none ob-fade-in">
          <img
            src={logoImage}
            alt="Nuomoria"
            className="h-12 w-auto object-contain"
            loading="eager"
          />
        </div>

        {/* step indicator */}
        <div className="flex items-center gap-1.5 mb-8">
          {STEPS.map((s, i) => {
            const done = i < stepIndex;
            const active = i === stepIndex;
            return (
              <React.Fragment key={s}>
                <div className={`flex items-center justify-center rounded-full transition-all duration-500 ${done ? 'w-7 h-7 bg-teal-500 text-white' :
                  active ? 'w-8 h-8 bg-gradient-to-br from-teal-500 to-teal-400 text-white shadow-[0_0_24px_rgba(47,132,129,.45)] ring-[3px] ring-teal-400/20' :
                    'w-7 h-7 bg-white/[0.05] text-white/25 border border-white/[0.08]'
                  }`}>
                  {done ? <CheckIcon className="w-3.5 h-3.5" /> : <span className="text-[11px] font-bold">{i + 1}</span>}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`w-10 h-[2px] rounded-full transition-all duration-700 ${done ? 'bg-teal-500' : 'bg-white/[0.06]'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* ── card ── */}
        <div className="w-full max-w-[460px]">
          <div className="relative group">
            {/* subtle border glow */}
            <div className="absolute -inset-px rounded-[26px] bg-gradient-to-b from-white/10 via-transparent to-transparent opacity-60" />

            <div
              className="relative rounded-[24px] border shadow-2xl shadow-black/40 overflow-hidden"
              style={{
                backgroundColor: 'rgba(8,12,16,0.88)',
                borderColor: 'rgba(255,255,255,0.10)',
              }}
            >

              {/* top accent line */}
              <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-teal-500/50 to-transparent" />

              {/* animated content area */}
              <div className={`transition-all duration-300 ease-out ${transitioning ? 'opacity-0 translate-y-3 scale-[0.98]' : 'opacity-100 translate-y-0 scale-100'}`}>

                {/* ═══ WELCOME ═══ */}
                {step === 'welcome' && (
                  <div className="px-8 pt-10 pb-9 sm:px-10 text-center">
                    {/* Hero illustration */}
                    <div className="flex justify-center mb-7">
                      <div className="relative ob-hero-float">
                        {/* outer glow ring */}
                        <div className="absolute -inset-4 rounded-3xl bg-teal-500/[0.07] blur-xl" />
                        <div className="relative w-[88px] h-[88px] rounded-[22px] bg-gradient-to-br from-[#1a3a39] to-[#0f2928] border border-teal-500/20 flex items-center justify-center overflow-hidden">
                          {/* inner accent */}
                          <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 to-transparent" />
                          <img src={smallLogoWhite} alt="N" className="relative w-16 h-16 object-contain opacity-90" />
                        </div>
                        {/* live badge */}
                        <div className="absolute -bottom-1.5 -right-1.5 px-2 py-0.5 rounded-full bg-emerald-500 text-[9px] font-bold text-white shadow-lg shadow-emerald-500/30 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                          LIVE
                        </div>
                      </div>
                    </div>

                    <h1 className="text-[26px] sm:text-[30px] font-extrabold text-white tracking-tight leading-tight mb-2">
                      Sveiki atvykę, {displayName}
                    </h1>
                    <p className="text-white/40 text-[15px] leading-relaxed mb-1">
                      Jūsų Google paskyra sėkmingai susieta.
                    </p>
                    <p className="text-white/30 text-sm mb-8">
                      Konfigūracija užtruks tik <span className="text-teal-400 font-semibold">~30 sek</span>
                    </p>

                    {/* what we'll set up — lucide icons instead of emoji */}
                    <div className="space-y-2.5 mb-8">
                      {[
                        { step: 1, icon: <IconPencil className="w-5 h-5 text-teal-400" />, title: 'Pasirinksite unikalų vardą', desc: 'Jūsų tapatybė platformoje' },
                        { step: 2, icon: <IconTarget className="w-5 h-5 text-teal-400" />, title: 'Nurodysite paskyros tipą', desc: 'Nuomotojas arba nuomininkas' },
                      ].map(item => (
                        <div key={item.step} className="flex items-center gap-4 rounded-2xl px-4 py-3.5 border transition-colors duration-200"
                          style={{
                            backgroundColor: 'rgba(255,255,255,0.020)',
                            borderColor: 'rgba(255,255,255,0.04)',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.035)'; }}
                          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.020)'; }}
                        >
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500/15 to-teal-600/5 flex items-center justify-center flex-shrink-0">
                            {item.icon}
                          </div>
                          <div className="text-left">
                            <p className="text-white/75 text-[13px] font-medium leading-snug">{item.title}</p>
                            <p className="text-white/30 text-[11px] mt-0.5">{item.desc}</p>
                          </div>
                          <div className="ml-auto flex-shrink-0">
                            <div className="w-5 h-5 rounded-full border border-white/10 flex items-center justify-center text-white/15">
                              <span className="text-[10px] font-bold">{item.step}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button onClick={() => go('username')}
                      className="w-full h-[50px] rounded-2xl bg-gradient-to-r from-teal-600 to-teal-500 text-white text-[15px] font-semibold shadow-[0_6px_24px_rgba(20,184,166,.25)] hover:shadow-[0_8px_32px_rgba(20,184,166,.35)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center justify-center gap-2">
                      Pradėkime
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                    </button>

                    <p className="text-white/15 text-[11px] mt-5 flex items-center justify-center gap-1.5">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                      </svg>
                      {userEmail}
                    </p>
                  </div>
                )}

                {/* ═══ USERNAME ═══ */}
                {step === 'username' && (
                  <div className="px-8 pt-9 pb-8 sm:px-10">
                    <div className="text-center mb-7">
                      <div className="inline-flex items-center justify-center w-[52px] h-[52px] rounded-2xl bg-gradient-to-br from-teal-500/15 to-teal-600/5 border border-teal-500/10 mb-4">
                        <svg className="w-6 h-6 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                        </svg>
                      </div>
                      <h2 className="text-[22px] font-bold text-white tracking-tight mb-1">Sukurkite savo vardą</h2>
                      <p className="text-white/35 text-[13px]">Unikalus identifikatorius Nuomoria platformoje</p>
                    </div>

                    {/* input */}
                    <div className="relative mb-3">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-teal-500/50 font-mono text-sm select-none">@</span>
                      <input
                        type="text"
                        value={username}
                        onChange={e => setUsername(e.target.value.toLowerCase())}
                        placeholder="pvz. jonas.petraitis"
                        autoFocus
                        className="w-full h-[52px] pl-9 pr-12 rounded-2xl text-white text-[15px] placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-teal-500/40 transition-all duration-200 font-medium"
                        style={{
                          backgroundColor: 'rgba(255,255,255,0.04)',
                          borderWidth: '1px',
                          borderStyle: 'solid',
                          borderColor: 'rgba(255,255,255,0.08)',
                        }}
                        onFocus={e => { e.currentTarget.style.borderColor = 'rgba(20,184,166,0.3)'; }}
                        onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                      />
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                        {checkingUsername && <SpinnerIcon className="w-5 h-5 text-white/25" />}
                        {usernameOk && (
                          <div className="w-6 h-6 rounded-full bg-emerald-500/15 flex items-center justify-center">
                            <CheckIcon className="w-3.5 h-3.5 text-emerald-400" />
                          </div>
                        )}
                        {usernameError && username.length >= 3 && !checkingUsername && (
                          <div className="w-6 h-6 rounded-full bg-red-500/15 flex items-center justify-center">
                            <svg className="w-3.5 h-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* validation rules */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mb-4">
                      {[
                        { ok: username.length >= 3, text: 'Min. 3 simboliai' },
                        { ok: username.length > 0 && username.length <= 20, text: 'Max. 20 simbolių' },
                        { ok: /^[a-z0-9._-]*$/.test(username) && username.length > 0, text: 'a-z, 0-9, . _ -' },
                        { ok: usernameAvailable === true, text: 'Vardas laisvas' },
                      ].map((r, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-all duration-300 ${r.ok ? 'bg-emerald-500/20' : 'bg-white/[0.04]'
                            }`}>
                            {r.ok ? <CheckIcon className="w-2 h-2 text-emerald-400" /> : <div className="w-1 h-1 rounded-full bg-white/15" />}
                          </div>
                          <span className={`text-[11px] transition-colors duration-300 ${r.ok ? 'text-emerald-400/70' : 'text-white/20'}`}>{r.text}</span>
                        </div>
                      ))}
                    </div>

                    {usernameError && <p className="text-xs text-red-400 font-medium mb-3">{usernameError}</p>}

                    {/* live preview */}
                    {usernameOk && (
                      <div
                        className="rounded-2xl border p-4 flex items-center gap-3.5 mb-4 ob-fade-in"
                        style={{
                          backgroundColor: 'rgba(255,255,255,0.020)',
                          borderColor: 'rgba(255,255,255,0.05)',
                        }}
                      >
                        <div className="w-11 h-11 rounded-[14px] bg-gradient-to-br from-teal-600 to-teal-400 flex items-center justify-center text-white font-bold text-base shadow-lg shadow-teal-500/20">
                          {username.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-white/85 text-sm font-semibold truncate">@{username}</p>
                          <p className="text-white/30 text-[11px] truncate">{userEmail}</p>
                        </div>
                        <div className="ml-auto flex-shrink-0">
                          <div className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold flex items-center gap-1">
                            <CheckIcon className="w-2.5 h-2.5" /> Laisvas
                          </div>
                        </div>
                      </div>
                    )}

                    {/* nav */}
                    <div className="flex gap-3 mt-6">
                      <button onClick={() => go('welcome')}
                        className="h-[46px] w-[46px] flex items-center justify-center border text-white/50 rounded-2xl transition-all duration-200"
                        style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.07)' }}
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.07)'; }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'; }}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                        </svg>
                      </button>
                      <button onClick={() => go('role')} disabled={!usernameOk}
                        className="flex-1 h-[46px] rounded-2xl bg-gradient-to-r from-teal-600 to-teal-500 text-white text-sm font-semibold shadow-[0_4px_20px_rgba(20,184,166,.25)] hover:shadow-[0_8px_28px_rgba(20,184,166,.35)] disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none disabled:from-gray-600 disabled:to-gray-500 transition-all duration-200 flex items-center justify-center gap-2">
                        Toliau
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}

                {/* ═══ ROLE ═══ */}
                {step === 'role' && (
                  <div className="px-8 pt-9 pb-8 sm:px-10">
                    <div className="text-center mb-7">
                      <div className="inline-flex items-center justify-center w-[52px] h-[52px] rounded-2xl bg-gradient-to-br from-teal-500/15 to-teal-600/5 border border-teal-500/10 mb-4">
                        <svg className="w-6 h-6 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                        </svg>
                      </div>
                      <h2 className="text-[22px] font-bold text-white tracking-tight mb-1">Kaip naudosite Nuomoria?</h2>
                      <p className="text-white/35 text-[13px]">Pasirinkite savo paskyros tipą</p>
                    </div>

                    <div className="space-y-3">
                      {/* Landlord card */}
                      <button type="button" onClick={() => setRole('landlord')}
                        className={`w-full text-left rounded-2xl border-2 transition-all duration-250 p-[18px] ${role === 'landlord'
                          ? 'border-teal-500/70 bg-teal-500/[0.07] shadow-[0_0_40px_rgba(20,184,166,.1)]'
                          : 'border-white/[0.05] bg-white/[0.015] hover:border-white/[0.1] hover:bg-white/[0.03]'
                          }`}>
                        <div className="flex items-start gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200 ${role === 'landlord' ? 'bg-teal-500/15' : 'bg-white/[0.04]'
                            }`}>
                            <svg className={`w-6 h-6 transition-colors duration-200 ${role === 'landlord' ? 'text-teal-400' : 'text-white/25'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.4}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205l3 1m1.5.5l-1.5-.5M6.75 7.364V3h-3v18m3-13.636l10.5-3.819" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0 pt-0.5">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className={`text-[15px] font-semibold transition-colors ${role === 'landlord' ? 'text-white' : 'text-white/65'}`}>
                                Nuomotojas
                              </h3>
                              <div className={`w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center transition-all duration-200 ${role === 'landlord' ? 'border-teal-500 bg-teal-500' : 'border-white/15'
                                }`}>
                                {role === 'landlord' && <CheckIcon className="w-2.5 h-2.5 text-white" />}
                              </div>
                            </div>
                            <p className={`text-[12px] leading-relaxed transition-colors ${role === 'landlord' ? 'text-white/45' : 'text-white/25'}`}>
                              Valdykite butus, stebėkite mokėjimus ir bendraukite su nuomininkais vienoje platformoje.
                            </p>
                            <div className="flex flex-wrap gap-1.5 mt-2.5">
                              {['Valdymo pultas', 'Butų valdymas', 'Sąskaitos', 'Skaitikliai'].map(t => (
                                <span key={t} className={`text-[10px] px-2 py-[3px] rounded-lg transition-colors ${role === 'landlord' ? 'bg-teal-500/10 text-teal-400/80' : 'bg-white/[0.03] text-white/20'
                                  }`}>{t}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </button>

                      {/* Tenant card */}
                      <button type="button" onClick={() => setRole('tenant')}
                        className={`w-full text-left rounded-2xl border-2 transition-all duration-250 p-[18px] ${role === 'tenant'
                          ? 'border-teal-500/70 bg-teal-500/[0.07] shadow-[0_0_40px_rgba(20,184,166,.1)]'
                          : 'border-white/[0.05] bg-white/[0.015] hover:border-white/[0.1] hover:bg-white/[0.03]'
                          }`}>
                        <div className="flex items-start gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200 ${role === 'tenant' ? 'bg-teal-500/15' : 'bg-white/[0.04]'
                            }`}>
                            <svg className={`w-6 h-6 transition-colors duration-200 ${role === 'tenant' ? 'text-teal-400' : 'text-white/25'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.4}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0 pt-0.5">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className={`text-[15px] font-semibold transition-colors ${role === 'tenant' ? 'text-white' : 'text-white/65'}`}>
                                Nuomininkas
                              </h3>
                              <div className={`w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center transition-all duration-200 ${role === 'tenant' ? 'border-teal-500 bg-teal-500' : 'border-white/15'
                                }`}>
                                {role === 'tenant' && <CheckIcon className="w-2.5 h-2.5 text-white" />}
                              </div>
                            </div>
                            <p className={`text-[12px] leading-relaxed transition-colors ${role === 'tenant' ? 'text-white/45' : 'text-white/25'}`}>
                              Peržiūrėkite nuomos informaciją, teikite rodmenis ir gaukite pranešimus.
                            </p>
                            <div className="flex flex-wrap gap-1.5 mt-2.5">
                              {['Rodmenys', 'Mokėjimai', 'Pranešimai', 'Žinutės'].map(t => (
                                <span key={t} className={`text-[10px] px-2 py-[3px] rounded-lg transition-colors ${role === 'tenant' ? 'bg-teal-500/10 text-teal-400/80' : 'bg-white/[0.03] text-white/20'
                                  }`}>{t}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </button>
                    </div>

                    {error && (
                      <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-[12px] text-red-400 flex items-center gap-2">
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                        </svg>
                        {error}
                      </div>
                    )}

                    {/* nav */}
                    <div className="flex gap-3 mt-7">
                      <button onClick={() => go('username')}
                        className="h-[46px] w-[46px] flex items-center justify-center border text-white/50 rounded-2xl transition-all duration-200"
                        style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.07)' }}
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.07)'; }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'; }}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                        </svg>
                      </button>
                      <button onClick={handleComplete} disabled={!role || loading}
                        className="flex-1 h-[46px] rounded-2xl bg-gradient-to-r from-teal-600 to-teal-500 text-white text-sm font-semibold shadow-[0_4px_20px_rgba(20,184,166,.25)] hover:shadow-[0_8px_28px_rgba(20,184,166,.35)] disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none disabled:from-gray-600 disabled:to-gray-500 transition-all duration-200 flex items-center justify-center gap-2">
                        {loading ? (
                          <><SpinnerIcon className="w-4 h-4" /> Kuriama...</>
                        ) : (
                          <>
                            Sukurti paskyrą
                            <CheckIcon className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* ═══ COMPLETE ═══ */}
                {step === 'complete' && (
                  <div className="px-8 pt-12 pb-10 sm:px-10 text-center">
                    {/* celebration */}
                    <div className="flex justify-center mb-7">
                      <div className="relative ob-pop">
                        <div className="absolute -inset-6 rounded-full bg-emerald-500/10 ob-ring" />
                        <div
                          className="relative w-[76px] h-[76px] rounded-full border flex items-center justify-center"
                          style={{
                            background: 'linear-gradient(135deg, rgba(16,185,129,0.20) 0%, rgba(16,185,129,0.08) 100%)',
                            borderColor: 'rgba(16,185,129,0.30)',
                          }}
                        >
                          <svg className="w-9 h-9 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        {/* sparkles */}
                        {Array.from({ length: 8 }).map((_, i) => (
                          <div key={i} className="absolute top-1/2 left-1/2 ob-sparkle"
                            style={{ '--angle': `${i * 45}deg`, '--dist': '42px', animationDelay: `${i * 0.06}s` } as React.CSSProperties}>
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          </div>
                        ))}
                      </div>
                    </div>

                    <h2 className="text-[24px] font-bold text-white mb-1.5 tracking-tight">Viskas paruošta!</h2>
                    <p className="text-white/40 text-[14px] mb-7">
                      Paskyra sukonfigūruota. Nukreipiame į {role === 'landlord' ? 'valdymo pultą' : 'nuomininko sritį'}...
                    </p>

                    {/* account summary card */}
                    <div
                      className="rounded-2xl border p-5 text-left ob-fade-in"
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.020)',
                        borderColor: 'rgba(255,255,255,0.05)',
                      }}
                    >
                      <div className="flex items-center gap-3.5 mb-4">
                        <div className="w-12 h-12 rounded-[14px] bg-gradient-to-br from-teal-600 to-teal-400 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-teal-500/20">
                          {username.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-white/85 text-[15px] font-semibold truncate">@{username}</p>
                          <p className="text-white/30 text-[12px] truncate">{userEmail}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 pt-3.5 border-t border-white/[0.05]">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                          <span className="text-white/50 text-[12px] font-medium">{role === 'landlord' ? 'Nuomotojas' : 'Nuomininkas'}</span>
                        </div>
                        <span className="text-white/15 text-[12px]">•</span>
                        <span className="text-white/30 text-[12px]">Paskyra aktyvi</span>
                      </div>
                    </div>

                    {/* progress */}
                    <div className="mt-7 space-y-2">
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
                        <div className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full ob-fill shadow-sm shadow-teal-500/30" />
                      </div>
                      <p className="text-white/20 text-[11px]">Nukreipiama...</p>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>

        {/* footer */}
        <div className="mt-8 flex items-center gap-1.5 text-white/15 text-[11px] select-none">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
          Nuomoria · 256-bit šifravimas · Google OAuth 2.0
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
