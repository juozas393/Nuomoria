import React, { useState } from 'react';

interface PasskeyEnrollmentProps {
  onComplete: () => void;
  onSkip: () => void;
}

const PasskeyEnrollment: React.FC<PasskeyEnrollmentProps> = ({ onComplete, onSkip }) => {
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleEnrollPasskey = async () => {
    setIsEnrolling(true);
    setMessage(null);

    try {
      // Check if WebAuthn is supported
      if (!window.PublicKeyCredential) {
        throw new Error('Passkeys are not supported on this device');
      }

      // For demo purposes, we'll simulate the passkey enrollment
      // In production, you would use the WebAuthn API
      console.log('🔐 Starting passkey enrollment...');
      
      // Simulate enrollment process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setMessage({ 
        type: 'success', 
        text: 'Passkey sėkmingai sukurtas! Dabar galite prisijungti be el. pašto kodo.' 
      });
      
      setTimeout(() => {
        onComplete();
      }, 2000);
      
    } catch (error: any) {
      console.error('❌ Passkey enrollment error:', error);
      setMessage({ 
        type: 'error', 
        text: error.message || 'Klaida kuriant passkey. Bandykite dar kartą.' 
      });
    } finally {
      setIsEnrolling(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-green-100 mb-4">
          <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Sukurkite passkey
        </h3>
        
        <p className="text-sm text-gray-600 mb-6">
          Passkey leis jums prisijungti greičiau ir saugiau be el. pašto kodų. 
          Jūsų įrenginys (telefonas, kompiuteris) taps jūsų slaptažodžiu.
        </p>

        <div className="space-y-3">
          <button
            onClick={handleEnrollPasskey}
            disabled={isEnrolling}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isEnrolling ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Kuriama...
              </div>
            ) : (
              'Sukurti passkey'
            )}
          </button>

          <button
            onClick={onSkip}
            disabled={isEnrolling}
            className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
          >
            Praleisti dabar
          </button>
        </div>

        {message && (
          <div className={`mt-4 rounded-md p-3 ${
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

        <div className="mt-4 text-xs text-gray-500">
          <p>Passkey veiks tik šiame įrenginyje. Galite sukurti papildomų passkey kitiems įrenginiams nustatymuose.</p>
        </div>
      </div>
    </div>
  );
};

export default PasskeyEnrollment;






