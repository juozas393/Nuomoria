import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabaseAuth } from '../hooks/useSupabaseAuth';
import { supabase } from '../lib/supabase';

const SupabaseLogin: React.FC = () => {
  const navigate = useNavigate();
  const { sendMagicLink, sendOTP, verifyOTP, signInWithGoogle } = useSupabaseAuth();

  const [email, setEmail] = useState('');
  const [method, setMethod] = useState<'magic-link' | 'otp'>('magic-link');
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState<'email' | 'otp-verify'>('email');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSendMagicLink = async () => {
    if (!email.trim()) {
      setMessage({ type: 'error', text: 'Įveskite el. paštą' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const result = await sendMagicLink(email);
      if (result.success) {
        setMessage({ type: 'success', text: result.message });
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Klaida siunčiant nuorodą' });
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async () => {
    if (!email.trim()) {
      setMessage({ type: 'error', text: 'Įveskite el. paštą' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      // Use Supabase OTP directly
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
        }
      });

      if (error) {
        setMessage({ type: 'error', text: error.message });
      } else {
        setMessage({ type: 'success', text: `Kodas išsiųstas į ${email}. Patikrinkite el. paštą.` });
        setStep('otp-verify');
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Klaida siunčiant kodą' });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpCode.trim()) {
      setMessage({ type: 'error', text: 'Įveskite kodą' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      // Use Supabase OTP verification directly
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type: 'email'
      });

      if (error) {
        setMessage({ type: 'error', text: error.message });
      } else {
        setMessage({ type: 'success', text: 'Sėkmingai prisijungta!' });
        // Navigation will be handled by auth state change
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Klaida patvirtinant kodą' });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      setMessage({ type: 'error', text: 'Klaida prisijungiant su Google' });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (method === 'magic-link') {
      handleSendMagicLink();
    } else {
      handleSendOTP();
    }
  };

  return (
    <div className="min-h-screen bg-[#f0fafa] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-[#E8F5F4]">
            <svg className="h-6 w-6 text-[#2F8481]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Prisijunkite prie sistemos
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Pasirinkite patogiausią būdą prisijungti
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                El. paštas
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-[#2F8481] focus:border-[#2F8481] focus:z-10 sm:text-sm"
                placeholder="Įveskite el. paštą"
                disabled={loading || step === 'otp-verify'}
              />
            </div>

            {step === 'email' && (
              <div className="space-y-3">
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="method"
                      value="magic-link"
                      checked={method === 'magic-link'}
                      onChange={(e) => setMethod(e.target.value as 'magic-link' | 'otp')}
                      className="h-4 w-4 text-[#2F8481] focus:ring-[#2F8481] border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">Nuoroda el. paštu</span>
                  </label>
                </div>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="method"
                      value="otp"
                      checked={method === 'otp'}
                      onChange={(e) => setMethod(e.target.value as 'magic-link' | 'otp')}
                      className="h-4 w-4 text-[#2F8481] focus:ring-[#2F8481] border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">Kodas el. paštu</span>
                  </label>
                </div>
              </div>
            )}

            {step === 'otp-verify' && (
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
                  Patvirtinimo kodas
                </label>
                <input
                  id="otp"
                  name="otp"
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-[#2F8481] focus:border-[#2F8481] focus:z-10 sm:text-sm text-center text-lg tracking-widest"
                  placeholder="000000"
                  disabled={loading}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Kodas išsiųstas į {email}
                </p>
              </div>
            )}
          </div>

          {message && (
            <div className={`rounded-md p-4 ${message.type === 'success'
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
              }`}>
              <p className={`text-sm ${message.type === 'success' ? 'text-green-800' : 'text-red-800'
                }`}>
                {message.text}
              </p>
            </div>
          )}

          <div className="space-y-3">
            {step === 'email' ? (
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[#2F8481] hover:bg-[#297a77] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2F8481] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Siunčiama...
                  </div>
                ) : (
                  method === 'magic-link' ? 'Siųsti nuorodą' : 'Siųsti kodą'
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleVerifyOTP}
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[#2F8481] hover:bg-[#297a77] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2F8481] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Patvirtinama...
                  </div>
                ) : (
                  'Patvirtinti kodą'
                )}
              </button>
            )}

            {step === 'otp-verify' && (
              <button
                type="button"
                onClick={() => {
                  setStep('email');
                  setOtpCode('');
                  setMessage(null);
                }}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2F8481]"
              >
                Grįžti atgal
              </button>
            )}
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-[#f0fafa] text-gray-500">arba</span>
            </div>
          </div>

          {/* Google OAuth */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2F8481]"
          >
            <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Tęsti su Google
          </button>
        </form>

        <div className="text-center">
          <div className="text-sm text-gray-600">
            <p className="mb-2">
              <strong>Rekomenduojama:</strong> Prisijunkite su el. paštu
            </p>
            <p className="text-xs text-gray-500">
              Greitas ir saugus prisijungimas be slaptažodžių
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupabaseLogin;
