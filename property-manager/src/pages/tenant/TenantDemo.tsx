import React, { useState } from 'react';
import { 
  ArrowRightOnRectangleIcon 
} from '@heroicons/react/24/outline';

import type { Property } from '../../lib/supabase';
import TenantContractTermination from './TenantContractTermination';
import { useAuth } from '../../context/AuthContext';

const TenantDemo: React.FC = () => {
  const { logout } = useAuth();
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);

  // Filter only occupied properties for tenant demo
  const tenantTestData: Property[] = [];

  const selectedProperty = tenantTestData.find((p: Property) => p.id === selectedPropertyId);

  if (selectedProperty) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header with logout button */}
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <h1 className="text-xl font-semibold text-black">Sutarties nutraukimas</h1>
              </div>
              
              <div className="flex items-center space-x-4">
                <button 
                  onClick={logout}
                  className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                  title="Atsijungti"
                >
                  <ArrowRightOnRectangleIcon className="w-5 h-5" />
                  <span className="hidden sm:inline">Atsijungti</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="mb-6">
            <button
              onClick={() => setSelectedPropertyId(null)}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              ← Grįžti į testavimo scenarijus
            </button>
          </div>
          
          <TenantContractTermination property={selectedProperty} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with logout button */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-black">Nuomininko Testavimas</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <button 
                onClick={logout}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                title="Atsijungti"
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5" />
                <span className="hidden sm:inline">Atsijungti</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Nuomininko Sutarties Nutraukimo Simuliacija
          </h1>
          <p className="text-gray-600">
            Pasirinkite nuosavybę, kurios nuomininkas nori nutraukti sutartį
          </p>
        </div>

        {/* Test Scenarios */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {tenantTestData.map((property: Property, index: number) => {
            const isSelected = selectedPropertyId === property.id;
            
            return (
              <div
                key={property.id}
                className={`bg-white rounded-lg shadow-sm border-2 cursor-pointer transition-all duration-200 ${
                  isSelected 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                }`}
                onClick={() => setSelectedPropertyId(property.id)}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {property.address} #{property.apartment_number}
                    </h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      property.tenant_response === 'does_not_want_to_renew'
                        ? 'bg-red-100 text-red-800'
                        : property.tenant_response === 'wants_to_renew'
                        ? 'bg-primary-100 text-primary-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {property.tenant_response === 'does_not_want_to_renew' ? 'Nenori pratęsti' :
                       property.tenant_response === 'wants_to_renew' ? 'Nori pratęsti' :
                       'Nėra atsakymo'}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    <p><strong>Nuomininkas:</strong> {property.tenant_name}</p>
                    <p><strong>Nuoma:</strong> €{property.rent}/mėn</p>
                    <p><strong>Depozitas:</strong> €{property.deposit_amount}</p>
                    {property.planned_move_out_date && (
                      <p><strong>Išsikraustymo data:</strong> {property.planned_move_out_date}</p>
                    )}
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      Spustelėkite, kad pamatytumėte sutarties nutraukimo simuliaciją
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">
            Testavimo Instrukcijos
          </h2>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Pasirinkite nuosavybę, kurios nuomininkas nori nutraukti sutartį</li>
            <li>• Simuliacija parodys, kaip skaičiuojamas depozito grąžinimas</li>
            <li>• Galėsite pamatyti skirtingus scenarijus pagal atsakymo laiką</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TenantDemo; 