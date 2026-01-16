import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const SupabaseAuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Security: No console logging in production
        
        // Check if we have a code parameter (for OAuth flows)
        const code = searchParams.get('code');
        const error = searchParams.get('error');
        
        if (error) {
          // Security: No console logging in production
          setStatus('error');
          setMessage(`OAuth klaida: ${error}`);
          return;
        }
        
        if (code) {
          // Exchange code for session (for OAuth flows)
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          
          if (error) {
            // Security: No console logging in production
            setStatus('error');
            setMessage('Klaida patvirtinant prisijungimą. Bandykite dar kartą.');
            return;
          }
          
          if (data.session) {
            // Security: No console logging in production
            setStatus('success');
            setMessage('Sėkmingai prisijungta! Nukreipiama...');
            
            // Check if this is first login
            const isFirstLogin = !data.session.user.last_sign_in_at || 
              (new Date().getTime() - new Date(data.session.user.last_sign_in_at).getTime()) > 24 * 60 * 60 * 1000;
            
            setTimeout(() => {
              if (isFirstLogin) {
                navigate('/welcome');
              } else {
                navigate('/nuomotojas2');
              }
            }, 2000);
          } else {
            setStatus('error');
            setMessage('Nepavyko gauti sesijos. Bandykite dar kartą.');
          }
        } else {
          // No code parameter - check if user is already authenticated
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session) {
            // Security: No console logging in production
            setStatus('success');
            setMessage('Sėkmingai prisijungta! Nukreipiama...');
            
            setTimeout(() => {
              navigate('/dashboard');
            }, 2000);
          } else {
            setStatus('error');
            setMessage('Nepavyko gauti sesijos. Bandykite dar kartą.');
          }
        }
      } catch (error) {
        // Security: No console logging in production
        setStatus('error');
        setMessage('Įvyko netikėta klaida. Bandykite dar kartą.');
      }
    };

    handleAuthCallback();
  }, [navigate]);

  const getStatusIcon = () => {
    switch (status) {
      case 'verifying':
        return (
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        );
      case 'success':
        return (
          <div className="rounded-full h-12 w-12 bg-green-100 flex items-center justify-center mx-auto">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'error':
        return (
          <div className="rounded-full h-12 w-12 bg-red-100 flex items-center justify-center mx-auto">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'verifying': return 'text-blue-600';
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
    }
  };

  const getStatusTitle = () => {
    switch (status) {
      case 'verifying': return 'Patvirtinama...';
      case 'success': return 'Sėkmingai prisijungta!';
      case 'error': return 'Klaida';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          {getStatusIcon()}
          <h2 className={`mt-6 text-3xl font-extrabold ${getStatusColor()}`}>
            {getStatusTitle()}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {message}
          </p>
          
          {status === 'error' && (
            <div className="mt-6">
              <button
                onClick={() => navigate('/login')}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Grįžti į prisijungimo puslapį
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupabaseAuthCallback;
