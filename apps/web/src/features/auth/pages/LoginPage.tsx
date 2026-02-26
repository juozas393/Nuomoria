import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import GoogleButton from '../components/GoogleButton';
import logoImage from '../../../assets/logocanvaTransparent.png';
import smallLogoWhite from '../../../assets/SmallLogoWHITEWithoutBG.png';
// Background image path (optimized - modern cityscape)
const heroBgImage = '/images/ImageIntroduction.jpg';

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
  const [googleLoading, setGoogleLoading] = useState(false);

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
        className="fixed top-5 left-5 z-50 inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-[13px] font-medium text-white/90 hover:text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
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
        Grįžti į pagrindinį
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
          <div className="max-w-[1280px] mx-auto px-12 min-h-screen flex items-center py-16">
            <div className="grid grid-cols-12 gap-16 w-full items-center">

              {/* LEFT COLUMN - PREMIUM HERO PANEL */}
              <div className="col-span-7">
                {/* Premium Content Panel */}
                <div
                  className="max-w-[560px] p-12 rounded-[28px] border shadow-[0_24px_70px_rgba(0,0,0,0.45),0_10px_28px_rgba(0,0,0,0.25)]"
                  style={{
                    backgroundColor: 'rgba(6,10,12,0.84)',
                    borderColor: 'rgba(255,255,255,0.13)',
                    backdropFilter: 'blur(16px)'
                  }}
                >
                  {/* Headline - PURE WHITE, tighter tracking */}
                  <h1 className="text-[54px] lg:text-[58px] font-bold text-white leading-[1.06] mb-5 tracking-[-0.025em] login-fade-in" style={{ animationDelay: '0.1s' }}>
                    Valdykite nuomą{' '}
                    <span className="login-gradient-text">paprastai</span>
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
                      <span>10+ NT valdytojų</span>
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
                            Automatizuotas sąskaitų valdymas
                          </h3>
                          <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.70)' }}>
                            Sąskaitos ir priminimai generuojami automatiškai
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
                            Bendravimas su nuomininkais
                          </h3>
                          <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.70)' }}>
                            Centralizuota pranešimų sistema
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
                            Analitika ir ataskaitos
                          </h3>
                          <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.70)' }}>
                            Stebėkite pajamas realiu laiku
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* N watermark — right side, aligned with features */}
                    <div className="flex-shrink-0 hidden lg:flex items-center">
                      <img src={smallLogoWhite} alt="Nuomoria" className="h-40 w-40 object-contain opacity-35" />
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
                      {/* Inner Opaque Panel - Crisp UI Surface */}
                      <div
                        className="rounded-[20px] px-7 py-7"
                        style={{
                          backgroundColor: 'rgba(255,255,255,0.92)'
                        }}
                      >
                        {/* Logo Header - BIG */}
                        <div className="pb-5 mb-6 border-b" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
                          <img
                            src={logoImage}
                            alt="Nuomoria"
                            className="h-[110px] w-auto object-contain mx-auto md:h-[96px]"
                          />
                        </div>

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
                          <div className="login-google-btn-wrapper">
                            <GoogleButton
                              onClick={handleGoogleLogin}
                              loading={googleLoading}
                            />
                          </div>
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
                            <span>Jau naudoja <span className="font-medium text-gray-700">10+ NT valdytojų</span></span>
                          </p>
                        </div>

                        {/* Pagalba link */}
                        <div className="mt-4 text-center space-y-2">
                          <Link
                            to="/pagalba"
                            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-teal-600 hover:text-teal-700 transition-colors duration-150"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                            </svg>
                            Kaip naudotis Nuomoria?
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
                          className="h-[110px] w-auto object-contain mx-auto md:h-[96px]"
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
                          <span>Jau naudoja <span className="font-medium" style={{ color: 'rgba(255,255,255,0.85)' }}>10+ NT valdytojų</span></span>
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
                          className="h-[110px] w-auto object-contain mx-auto md:h-[96px]"
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
                            <span>Jau naudoja <span className="font-medium text-gray-700">10+ NT valdytojų</span></span>
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
        <div className="md:hidden relative z-10 min-h-screen flex flex-col">
          {/* Hero Header - fixed height */}
          <div className="relative h-[40vh] flex items-center justify-center px-5 py-8">
            <div className="text-center">
              <h1 className="text-[36px] font-bold text-white leading-tight tracking-[-0.02em] mb-4 drop-shadow-lg">
                Valdykite nuomą{' '}
                <span className="text-[#2F8481] drop-shadow-[0_2px_8px_rgba(47,132,129,0.4)]">paprastai</span>
              </h1>
              <p className="text-[15px] text-white/85 leading-relaxed max-w-sm mx-auto drop-shadow-md">
                Profesionali platforma nekilnojamojo turto valdymui
              </p>
            </div>
          </div>

          {/* Content area - dark background */}
          <div className="flex-1 bg-gradient-to-b from-slate-900/95 to-slate-900/98 px-5 py-10">
            {/* Auth Card - Mobile Theme-Aware */}
            <div className="max-w-md mx-auto mb-10">

              {/* MOBILE - VARIANT A: GLASS */}
              {LOGIN_CARD_THEME === "glass" && (
                <div
                  className="relative overflow-hidden rounded-[22px] p-2.5 shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.14)',
                    backdropFilter: 'blur(14px)',
                    WebkitBackdropFilter: 'blur(14px)',
                    borderWidth: '1px',
                    borderColor: 'rgba(255,255,255,0.18)'
                  }}
                >
                  <div
                    className="rounded-[16px] px-5 py-6"
                    style={{ backgroundColor: 'rgba(255,255,255,0.92)' }}
                  >
                    <div className="pb-4 border-b mb-5" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
                      <img src={logoImage} alt="Nuomoria" className="h-[88px] w-auto object-contain mx-auto" />
                    </div>
                    <div className="mb-5 text-center">
                      <h2 className="text-[24px] font-bold text-gray-900 mb-1.5 leading-tight tracking-[-0.015em]">Prisijungti</h2>
                      <p className="text-[14px]" style={{ color: '#667085' }}>Pradėkite valdyti objektus</p>
                    </div>
                    <div className="space-y-2.5 mb-4">
                      <GoogleButton onClick={handleGoogleLogin} loading={googleLoading} />
                      <p className="text-[11px] text-center" style={{ color: '#98A2B3' }}>Nauji vartotojai kuria paskyrą per Google</p>
                    </div>
                    <div className="pt-4" style={{ borderTop: '1px solid rgba(0,0,0,0.08)' }}>
                      <p className="text-[11px] text-center flex items-center justify-center gap-1.5" style={{ color: '#98A2B3' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-500">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                        </svg>
                        <span>Jau naudoja <span className="font-medium text-gray-700">10+ NT valdytojų</span></span>
                      </p>
                    </div>

                    {/* Pagalba link - Mobile */}
                    <div className="mt-3 text-center space-y-2">
                      <Link
                        to="/pagalba"
                        className="inline-flex items-center gap-1.5 text-[12px] font-medium text-teal-600 hover:text-teal-700 transition-colors duration-150"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                        </svg>
                        Kaip naudotis?
                      </Link>

                    </div>
                  </div>
                </div>
              )}

              {/* MOBILE - VARIANT B: DARK */}
              {LOGIN_CARD_THEME === "dark" && (
                <div
                  className="relative overflow-hidden rounded-[22px] px-5 py-6 shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
                  style={{
                    background: 'linear-gradient(180deg, rgba(12,16,18,0.88) 0%, rgba(12,16,18,0.78) 100%)',
                    borderWidth: '1px',
                    borderColor: 'rgba(255,255,255,0.10)'
                  }}
                >
                  <div className="pb-4 border-b mb-5" style={{ borderColor: 'rgba(255,255,255,0.10)' }}>
                    <img src={logoImage} alt="Nuomoria" className="h-[88px] w-auto object-contain mx-auto" style={{ filter: 'brightness(1.1)' }} />
                  </div>
                  <div className="mb-5 text-center">
                    <h2 className="text-[24px] font-bold mb-1.5 leading-tight tracking-[-0.015em]" style={{ color: 'rgba(255,255,255,0.96)' }}>Prisijungti</h2>
                    <p className="text-[14px]" style={{ color: 'rgba(255,255,255,0.70)' }}>Pradėkite valdyti objektus</p>
                  </div>
                  <div className="space-y-2.5 mb-4">
                    <button
                      onClick={handleGoogleLogin}
                      disabled={googleLoading}
                      className="w-full h-[48px] flex items-center justify-center gap-2.5 rounded-[14px] bg-white text-gray-900 px-4 text-[14px] font-semibold shadow-lg transition-colors duration-[180ms] ease-out active:scale-[0.98] disabled:opacity-60"
                      type="button"
                    >
                      {googleLoading ? <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" /> :
                        <><svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg><span>Tęsti su Google</span></>}
                    </button>
                    <p className="text-[11px] text-center" style={{ color: 'rgba(255,255,255,0.60)' }}>Nauji vartotojai kuria paskyrą per Google</p>
                  </div>
                  <div className="pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.10)' }}>
                    <p className="text-[11px] text-center flex items-center justify-center gap-1.5" style={{ color: 'rgba(255,255,255,0.60)' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-400">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                      </svg>
                      <span>Jau naudoja <span className="font-medium" style={{ color: 'rgba(255,255,255,0.85)' }}>10+ NT valdytojų</span></span>
                    </p>
                  </div>
                </div>
              )}

              {/* MOBILE - VARIANT C: SPLIT */}
              {LOGIN_CARD_THEME === "split" && (
                <div className="relative overflow-hidden rounded-[22px] shadow-[0_20px_60px_rgba(0,0,0,0.5)]" style={{ backgroundColor: '#FFFFFF', borderWidth: '1px', borderColor: 'rgba(0,0,0,0.08)' }}>
                  <div className="px-5 py-5" style={{ background: 'linear-gradient(180deg, rgba(10,14,16,0.92) 0%, rgba(10,14,16,0.88) 100%)', borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
                    <img src={logoImage} alt="Nuomoria" className="h-[88px] w-auto object-contain mx-auto" style={{ filter: 'brightness(1.1)' }} />
                  </div>
                  <div className="px-5 py-6">
                    <div className="mb-5 text-center">
                      <h2 className="text-[24px] font-bold text-gray-900 mb-1.5 leading-tight tracking-[-0.015em]">Prisijungti</h2>
                      <p className="text-[14px]" style={{ color: '#667085' }}>Pradėkite valdyti objektus</p>
                    </div>
                    <div className="space-y-2.5 mb-4">
                      <GoogleButton onClick={handleGoogleLogin} loading={googleLoading} />
                      <p className="text-[11px] text-center" style={{ color: '#98A2B3' }}>Nauji vartotojai kuria paskyrą per Google</p>
                    </div>
                    <div className="pt-4" style={{ borderTop: '1px solid rgba(0,0,0,0.08)' }}>
                      <p className="text-[11px] text-center flex items-center justify-center gap-1.5" style={{ color: '#98A2B3' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-500">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                        </svg>
                        <span>Jau naudoja <span className="font-medium text-gray-700">10+ NT valdytojų</span></span>
                      </p>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Features mobile */}
            <div className="max-w-md mx-auto space-y-3">
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" className="text-[#2F8481]">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-[13px] font-semibold text-white mb-0.5">Automatizuotas valdymas</h3>
                  <p className="text-[12px] text-white/70">Sąskaitos generuojamos automatiškai</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" className="text-[#2F8481]">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-[13px] font-semibold text-white mb-0.5">Bendravimas</h3>
                  <p className="text-[12px] text-white/70">Su nuomininkais akimirksniu</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" className="text-[#2F8481]">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-[13px] font-semibold text-white mb-0.5">Analitika</h3>
                  <p className="text-[12px] text-white/70">Realaus laiko ataskaitos</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 z-20 py-4 text-center">
          <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
            © {new Date().getFullYear()} Nuomoria. Visos teisės saugomos.
          </p>
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
