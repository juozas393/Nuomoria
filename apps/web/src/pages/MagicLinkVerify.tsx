import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const MagicLinkVerify: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { verifyMagicLink } = useAuth();

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    const handleVerification = async () => {
      const token = searchParams.get('token');

      if (!token) {
        setStatus('error');
        setMessage('Neteisinga nuoroda. Trūksta patvirtinimo kodo.');
        return;
      }

      try {
        console.log('🔗 Verifying magic link token:', token);
        const result = await verifyMagicLink(token);

        if (result.success) {
          setStatus('success');
          setMessage('Sėkmingai prisijungta! Nukreipiama į pagrindinį puslapį...');
          setTimeout(() => navigate('/'), 2000);
        } else {
          setStatus('error');
          setMessage(result.error || 'Nepavyko patvirtinti nuorodos.');
        }
      } catch (error) {
        console.error('❌ Error verifying magic link:', error);
        setStatus('error');
        setMessage('Klaida patvirtinant nuorodą. Bandykite dar kartą.');
      }
    };

    handleVerification();
  }, [searchParams, verifyMagicLink, navigate]);

  const getStatusIcon = () => {
    switch (status) {
      case 'verifying':
        return (
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2F8481] mx-auto"></div>
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
      case 'verifying': return 'text-[#2F8481]';
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
    }
  };

  const getStatusTitle = () => {
    switch (status) {
      case 'verifying': return 'Patvirtinama nuoroda...';
      case 'success': return 'Sėkmingai prisijungta!';
      case 'error': return 'Klaida';
    }
  };

  return (
    <div className="min-h-screen bg-[#f0fafa] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
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
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#2F8481] hover:bg-[#297a77] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2F8481]"
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

export default MagicLinkVerify;



