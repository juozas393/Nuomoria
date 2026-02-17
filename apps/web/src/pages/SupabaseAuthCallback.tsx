import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import logoImage from '../assets/logocanvBLACKWithoutBG.png';

/**
 * Premium Auth Callback Handler
 * Visual continuity from login page with background image,
 * animated verification flow, and smooth transitions.
 */

const heroBgImage = '/images/LoginBackground.webp';

const SupabaseAuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [showContent, setShowContent] = useState(false);

  // Generate random particles once — reduced to 18 for performance
  const particles = useMemo(() =>
    Array.from({ length: 18 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 8,
      duration: 6 + Math.random() * 8,
      size: 2 + Math.random() * 3,
      opacity: 0.15 + Math.random() * 0.25,
    })), []
  );

  // Content fade-in
  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Faster progress bar — fills to 85% in ~1.5s
  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 85 && status === 'verifying') return prev;
        if (prev >= 100) return 100;
        return prev + (status === 'verifying' ? 4 : 20);
      });
    }, 70);
    return () => clearInterval(progressInterval);
  }, [status]);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const code = searchParams.get('code');
        const error = searchParams.get('error');

        if (error) {
          setStatus('error');
          setMessage(`Prisijungimo klaida: ${error}`);
          setProgress(100);
          return; // No auto-redirect — user clicks button
        }

        let session = null;

        if (code) {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            setStatus('error');
            setMessage('Nepavyko patvirtinti prisijungimo. Bandykite dar kartą.');
            setProgress(100);
            return;
          }
          session = data.session;
        } else {
          const { data: { session: existingSession } } = await supabase.auth.getSession();
          session = existingSession;
        }

        if (!session) {
          setStatus('error');
          setMessage('Sesija nerasta. Bandykite prisijungti iš naujo.');
          setProgress(100);
          return;
        }

        const { error: profileError, data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();

        // Silently handle non-critical profile errors
        void profileError;

        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .maybeSingle();

        const userRole = userData?.role || session.user.user_metadata?.role || 'landlord';

        setStatus('success');
        setProgress(100);

        if (!profile) {
          setMessage('Sveiki atvykę! Nukreipiama į profilio kūrimą...');
          setTimeout(() => navigate('/onboarding'), 1000);
        } else {
          setMessage('Sėkmingai prisijungta! Nukreipiama į valdymo pultą...');
          setTimeout(() => {
            if (userRole === 'tenant') {
              navigate('/tenant');
            } else {
              navigate('/dashboard');
            }
          }, 1000);
        }

      } catch {
        setStatus('error');
        setMessage('Įvyko netikėta klaida. Bandykite dar kartą.');
        setProgress(100);
      }
    };

    handleAuthCallback();
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background image — same as login page for visual continuity */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${heroBgImage})`,
          transform: 'scale(1.08)',
          transformOrigin: 'center',
        }}
      />

      {/* Dark overlay — heavier than login to focus on card */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, rgba(3,6,8,0.88) 0%, rgba(3,6,8,0.92) 50%, rgba(3,6,8,0.85) 100%)',
        }}
      />

      {/* Subtle teal ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 50% 40%, rgba(16,185,170,0.08) 0%, transparent 60%)',
        }}
      />

      {/* Rising particles — 18 total for performance */}
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute rounded-full auth-cb-particle"
          style={{
            left: `${p.left}%`,
            bottom: '-5%',
            width: p.size,
            height: p.size,
            background: `rgba(77, 182, 172, ${p.opacity})`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4">
        <div className={`max-w-md w-full transition-all duration-700 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>

          {/* Logo — visual continuity from login */}
          <div className="flex justify-center mb-8 auth-cb-fade-in" style={{ animationDelay: '0s' }}>
            <img
              src={logoImage}
              alt="Nuomoria"
              className="h-16 w-auto object-contain opacity-70"
              loading="eager"
            />
          </div>

          {/* Main card */}
          <div className="relative">
            {/* Card glow effect */}
            <div className={`absolute -inset-1 rounded-[28px] blur-xl transition-all duration-1000 ${status === 'success' ? 'bg-emerald-500/20' :
              status === 'error' ? 'bg-red-500/15' :
                'bg-[#2F8481]/15'
              }`} />

            <div
              className="relative rounded-[24px] border p-10 shadow-[0_32px_64px_rgba(0,0,0,0.5)]"
              style={{
                backgroundColor: 'rgba(8,12,16,0.85)',
                borderColor: 'rgba(255,255,255,0.08)',
              }}
            >

              {/* Status indicator */}
              <div className="flex justify-center mb-8">
                {status === 'verifying' && (
                  <div className="relative w-24 h-24">
                    {/* Outer ring pulse */}
                    <div className="absolute inset-0 rounded-full border-2 border-[#2F8481]/20 animate-ping"
                      style={{ animationDuration: '2s' }} />
                    {/* Spinning ring */}
                    <svg className="absolute inset-0 w-24 h-24 animate-spin" style={{ animationDuration: '2s' }} viewBox="0 0 96 96">
                      <circle cx="48" cy="48" r="44" fill="none" stroke="rgba(47,132,129,0.12)" strokeWidth="3" />
                      <circle cx="48" cy="48" r="44" fill="none" stroke="url(#spinner-gradient)" strokeWidth="3"
                        strokeLinecap="round" strokeDasharray="200" strokeDashoffset="140" />
                      <defs>
                        <linearGradient id="spinner-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#2F8481" />
                          <stop offset="100%" stopColor="#4DB6AC" />
                        </linearGradient>
                      </defs>
                    </svg>
                    {/* Center icon */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: 'rgba(47,132,129,0.15)', border: '1px solid rgba(47,132,129,0.2)' }}
                      >
                        <svg className="w-6 h-6 text-[#4DB6AC]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                )}

                {status === 'success' && (
                  <div className="relative w-24 h-24 auth-cb-success-entrance">
                    {/* Success ring burst */}
                    <div className="absolute inset-0 rounded-full bg-emerald-500/10 auth-cb-ring-burst" />
                    {/* Checkmark circle */}
                    <div
                      className="absolute inset-2 rounded-full border flex items-center justify-center"
                      style={{
                        background: 'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(16,185,129,0.05) 100%)',
                        borderColor: 'rgba(16,185,129,0.3)',
                      }}
                    >
                      <svg className="w-10 h-10 text-emerald-400 auth-cb-check-draw" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    </div>
                    {/* Sparkle particles */}
                    {[0, 60, 120, 180, 240, 300].map((angle, i) => (
                      <div key={i} className="absolute top-1/2 left-1/2 w-1.5 h-1.5 rounded-full bg-emerald-400 auth-cb-sparkle"
                        style={{
                          transform: `rotate(${angle}deg) translateY(-48px)`,
                          animationDelay: `${i * 0.08}s`,
                        }}
                      />
                    ))}
                  </div>
                )}

                {status === 'error' && (
                  <div className="relative w-24 h-24 auth-cb-success-entrance">
                    <div
                      className="absolute inset-2 rounded-full border flex items-center justify-center"
                      style={{
                        background: 'linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(239,68,68,0.05) 100%)',
                        borderColor: 'rgba(239,68,68,0.3)',
                      }}
                    >
                      <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>

              {/* Title */}
              <h1 className={`text-2xl font-semibold text-center mb-2 tracking-tight transition-colors duration-500 ${status === 'verifying' ? 'text-white' :
                status === 'success' ? 'text-emerald-400' :
                  'text-red-400'
                }`}>
                {status === 'verifying' && 'Tikrinama tapatybė...'}
                {status === 'success' && 'Prisijungta sėkmingai'}
                {status === 'error' && 'Prisijungimo klaida'}
              </h1>

              {/* Message */}
              <p className="text-center text-sm mb-8 leading-relaxed min-h-[40px]" style={{ color: 'rgba(255,255,255,0.50)' }}>
                {message || 'Užmezgamas saugus ryšys su jūsų paskyra...'}
              </p>

              {/* Progress section */}
              <div className="space-y-3">
                {/* Steps indicator */}
                <div className="flex items-center justify-between text-xs px-1" style={{ color: 'rgba(255,255,255,0.30)' }}>
                  <span className={status !== 'error' ? 'text-[#4DB6AC]' : 'text-red-400'}>
                    {status === 'verifying' ? 'Tikrinama...' : status === 'success' ? 'Paruošta' : 'Klaida'}
                  </span>
                  <span>{Math.min(progress, 100)}%</span>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                  <div
                    className={`h-full rounded-full transition-all duration-300 ease-out relative ${status === 'verifying' ? 'bg-gradient-to-r from-[#2F8481] to-[#4DB6AC]' :
                      status === 'success' ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' :
                        'bg-gradient-to-r from-red-500 to-red-400'
                      }`}
                    style={{ width: `${progress}%` }}
                  >
                    {/* Shimmer effect on progress bar */}
                    {status === 'verifying' && (
                      <div className="absolute inset-0 overflow-hidden rounded-full">
                        <div className="absolute inset-0 w-[200%] auth-cb-shimmer"
                          style={{
                            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Verification steps */}
                <div className="flex items-center justify-center gap-6 pt-2">
                  {[
                    { label: 'OAuth', done: progress > 20 },
                    { label: 'Sesija', done: progress > 50 },
                    { label: 'Profilis', done: progress > 80 },
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${step.done
                        ? (status === 'error' ? 'bg-red-400' : 'bg-[#4DB6AC]')
                        : 'bg-white/20'
                        }`} />
                      <span className={`text-[11px] transition-colors duration-500 ${step.done ? 'text-white/60' : 'text-white/20'
                        }`}>{step.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Error action — manual only, no auto-redirect */}
              {status === 'error' && (
                <button
                  onClick={() => navigate('/login')}
                  className="w-full mt-6 py-3 px-4 border text-sm font-medium rounded-xl transition-all duration-200 active:scale-[0.98]"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    borderColor: 'rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.80)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.10)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                    e.currentTarget.style.color = 'rgba(255,255,255,1)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                    e.currentTarget.style.color = 'rgba(255,255,255,0.80)';
                  }}
                >
                  ← Grįžti į prisijungimą
                </button>
              )}
            </div>
          </div>

          {/* Security badge */}
          <div className="flex items-center justify-center gap-2 mt-8">
            <div
              className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-full border"
              style={{
                color: 'rgba(255,255,255,0.25)',
                backgroundColor: 'rgba(255,255,255,0.03)',
                borderColor: 'rgba(255,255,255,0.05)',
              }}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'rgba(77,182,172,0.5)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
              <span>256-bit šifravimas</span>
              <span style={{ color: 'rgba(255,255,255,0.10)' }}>•</span>
              <span>Google OAuth 2.0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupabaseAuthCallback;
