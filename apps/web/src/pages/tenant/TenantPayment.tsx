import React from 'react';
import {
  CreditCardIcon,
  DocumentTextIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';

const TenantPayment: React.FC = () => {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-[#f0fafa]">
      {/* Header with logout button */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-black">Mokėjimas</h1>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={logout}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                title="Atsijungti"
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5" />
                <span className="hidden sm:inline">Atsijungti</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl">
              <CreditCardIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Mokėjimas</h1>
              <p className="text-gray-600">Apmokėkite sąskaitas</p>
            </div>
          </div>
        </div>

        {/* Empty state */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="p-12 text-center">
            <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Neapmokėtų sąskaitų nėra</h3>
            <p className="text-gray-500">Šiuo metu neturite neapmokėtų sąskaitų. Kai nuomotojas sukurs sąskaitą, galėsite ją apmokėti čia.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TenantPayment;