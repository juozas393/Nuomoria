import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PasskeyEnrollment from '../components/PasskeyEnrollment';

const Welcome: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showPasskeyEnrollment, setShowPasskeyEnrollment] = useState(false);

  const handleContinue = () => {
    navigate('/');
  };

  const handlePasskeyComplete = () => {
    navigate('/');
  };

  const handlePasskeySkip = () => {
    navigate('/');
  };

  if (showPasskeyEnrollment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <PasskeyEnrollment
          onComplete={handlePasskeyComplete}
          onSkip={handlePasskeySkip}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-green-100">
            <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Sveiki atvykę!
          </h2>

          <p className="mt-2 text-lg text-gray-600">
            {user?.first_name ? `Labas, ${user.first_name}!` : `Labas, ${user?.email}!`}
          </p>

          <p className="mt-4 text-sm text-gray-500">
            Sėkmingai prisijungėte prie nekilnojamojo turto valdymo sistemos
          </p>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Kas toliau?
            </h3>

            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-600">1</span>
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">
                    Sukurkite passkey
                  </p>
                  <p className="text-sm text-gray-500">
                    Greitesnis ir saugesnis prisijungimas be el. pašto kodų
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-600">2</span>
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">
                    Užpildykite profilį
                  </p>
                  <p className="text-sm text-gray-500">
                    Pridėkite kontaktinę informaciją ir nuotrauką
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-600">3</span>
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">
                    Pradėkite naudoti sistemą
                  </p>
                  <p className="text-sm text-gray-500">
                    Valdykite nekilnojamąjį turtą ir nuomininkus
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => setShowPasskeyEnrollment(true)}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Sukurti passkey (rekomenduojama)
            </button>

            <button
              onClick={handleContinue}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Praleisti ir tęsti
            </button>
          </div>
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            Galite sukurti passkey vėliau nustatymuose
          </p>
        </div>
      </div>
    </div>
  );
};

export default Welcome;



