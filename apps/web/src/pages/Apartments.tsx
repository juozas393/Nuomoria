import React from 'react';
import { useAuth } from '../context/AuthContext';
// Removed imports for deleted components

const Apartments: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#f7fafa]">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Butų valdymas</h1>
              <p className="text-gray-600">Sveiki, {user ? `${user.first_name} ${user.last_name}` : 'User'}! Čia galite valdyti visus butus ir nuomininkų informaciją.</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Atnaujinta</p>
              <p className="text-sm font-medium text-gray-900">
                {new Date().toLocaleDateString('lt-LT', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Removed for deleted components */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Butų valdymas</h2>
          <p className="text-gray-600">Komponentas pašalintas dėl nenaudojamų failų.</p>
        </div>
      </div>
    </div>
  );
};

export default Apartments; 