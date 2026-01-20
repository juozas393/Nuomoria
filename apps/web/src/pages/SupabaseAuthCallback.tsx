import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

/**
 * Modern Auth Callback Handler
 * Premium design with smooth animations
 */

const SupabaseAuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState<string>('');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Animate progress bar
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90 && status === 'verifying') return prev;
        if (prev >= 100) return 100;
        return prev + 10;
      });
    }, 150);

    return () => clearInterval(progressInterval);
  }, [status]);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const code = searchParams.get('code');
        const error = searchParams.get('error');

        // Handle OAuth error
        if (error) {
          setStatus('error');
          setMessage(`Prisijungimo klaida: ${error}`);
          setProgress(100);
          setTimeout(() => navigate('/login'), 3000);
          return;
        }

        let session = null;

        // Exchange code for session if present (OAuth flow)
        if (code) {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            setStatus('error');
            setMessage('Nepavyko patvirtinti prisijungimo. Bandykite dar kartą.');
            setProgress(100);
            setTimeout(() => navigate('/login'), 3000);
            return;
          }

          session = data.session;
        } else {
          // No code - check existing session
          const { data: { session: existingSession } } = await supabase.auth.getSession();
          session = existingSession;
        }

        // No session found
        if (!session) {
          setStatus('error');
          setMessage('Sesija nerasta. Bandykite prisijungti iš naujo.');
          setProgress(100);
          setTimeout(() => navigate('/login'), 3000);
          return;
        }

        // Check if user has a profile (onboarding completed)
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Profile check error:', profileError);
        }

        // Get role from users table
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .maybeSingle();

        const userRole = userData?.role || session.user.user_metadata?.role || 'tenant';

        setStatus('success');
        setProgress(100);

        // Redirect based on profile status
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

      } catch (error) {
        console.error('Auth callback error:', error);
        setStatus('error');
        setMessage('Įvyko netikėta klaida. Bandykite dar kartą.');
        setProgress(100);
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    handleAuthCallback();
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460]">
        {/* Floating orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#2F8481]/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#4DB6AC]/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-[#2F8481]/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          {/* Card */}
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-8 shadow-2xl">
            {/* Logo */}
            <div className="flex justify-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-[#2F8481] to-[#4DB6AC] rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
            </div>

            {/* Status Icon */}
            <div className="flex justify-center mb-6">
              {status === 'verifying' && (
                <div className="relative">
                  <div className="w-20 h-20 rounded-full border-4 border-[#2F8481]/30" />
                  <div className="absolute inset-0 w-20 h-20 rounded-full border-4 border-transparent border-t-[#2F8481] animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="w-8 h-8 text-[#2F8481]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                </div>
              )}
              {status === 'success' && (
                <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center animate-scale-in">
                  <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
              {status === 'error' && (
                <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center animate-scale-in">
                  <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              )}
            </div>

            {/* Title */}
            <h1 className={`text-2xl font-bold text-center mb-2 ${status === 'verifying' ? 'text-white' :
              status === 'success' ? 'text-emerald-400' :
                'text-red-400'
              }`}>
              {status === 'verifying' && 'Patvirtinama...'}
              {status === 'success' && 'Sėkmingai!'}
              {status === 'error' && 'Klaida'}
            </h1>

            {/* Message */}
            <p className="text-white/70 text-center text-sm mb-6">
              {message || 'Palaukite, tikrinamas prisijungimas...'}
            </p>

            {/* Progress bar */}
            <div className="h-1 bg-white/10 rounded-full overflow-hidden mb-6">
              <div
                className={`h-full rounded-full transition-all duration-300 ease-out ${status === 'verifying' ? 'bg-[#2F8481]' :
                  status === 'success' ? 'bg-emerald-500' :
                    'bg-red-500'
                  }`}
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Error action */}
            {status === 'error' && (
              <button
                onClick={() => navigate('/login')}
                className="w-full py-3 px-4 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl font-medium transition-all duration-200"
              >
                Grįžti į prisijungimą
              </button>
            )}

            {/* Security note */}
            <div className="flex items-center justify-center gap-2 text-white/40 text-xs mt-6">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>Saugus prisijungimas su šifravimu</span>
            </div>
          </div>

          {/* Branding */}
          <p className="text-center text-white/30 text-sm mt-6">
            Nuomoria • Nuomos valdymo platforma
          </p>
        </div>
      </div>

      {/* Custom animation styles */}
      <style>{`
        @keyframes scale-in {
          0% { transform: scale(0.5); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default SupabaseAuthCallback;
