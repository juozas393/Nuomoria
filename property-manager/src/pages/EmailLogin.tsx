import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const EmailLogin: React.FC = () => {
  const navigate = useNavigate();
  const { sendMagicLink, sendOTP, verifyOTP } = useAuth();
  
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
        // In production, user would check their email
        // For demo, we'll show the magic link in console
        console.log('📧 Magic link sent! Check console for demo link.');
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
      const result = await sendOTP(email);
      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        setStep('otp-verify');
        // In production, user would check their email/SMS
        // For demo, we'll show the OTP in console
        console.log('📱 OTP sent! Check console for demo code.');
      } else {
        setMessage({ type: 'error', text: result.message });
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
      const result = await verifyOTP(email, otpCode);
      if (result.success) {
        setMessage({ type: 'success', text: 'Sėkmingai prisijungta!' });
        setTimeout(() => navigate('/nuomotojas2'), 1000);
      } else {
        setMessage({ type: 'error', text: result.error || 'Neteisingas kodas' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Klaida patvirtinant kodą' });
    } finally {
      setLoading(false);
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100">
            <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Prisijunkite su el. paštu
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
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
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
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
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
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
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
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm text-center text-lg tracking-widest"
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
            <div className={`rounded-md p-4 ${
              message.type === 'success' 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              <p className={`text-sm ${
                message.type === 'success' ? 'text-green-800' : 'text-red-800'
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
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
                className="w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Grįžti atgal
              </button>
            )}
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              Demo režime: patikrinkite konsolę dėl nuorodos/kodo
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmailLogin;



