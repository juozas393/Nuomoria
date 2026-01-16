import React, { useState } from 'react';
import { CommunalConfig } from '../../types/communal';
import { CommunalConfigModal } from './CommunalConfigModal';

interface CommunalConfigManagerProps {
  address: string;
  currentConfig?: CommunalConfig;
  onConfigChange: (config: CommunalConfig) => void;
}

export const CommunalConfigManager: React.FC<CommunalConfigManagerProps> = ({
  address,
  currentConfig,
  onConfigChange
}) => {
  const [showModal, setShowModal] = useState(false);

  const handleSaveConfig = (config: CommunalConfig) => {
    onConfigChange(config);
    setShowModal(false);
  };

  const getMeterStatus = () => {
    if (!currentConfig) return { required: 0, individual: 0, total: 0 };
    
    const required = currentConfig.meters.filter(m => m.isRequired).length;
    const individual = currentConfig.meters.filter(m => m.hasIndividualMeter).length;
    
    return { required, individual, total: currentConfig.meters.length };
  };

  const meterStatus = getMeterStatus();

  return (
    <div className="space-y-4">
      {/* Konfigūracijos kortelė */}
      <div className="rounded-lg border border-black/10 bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Komunalinių konfigūracija</h3>
          <button
            onClick={() => setShowModal(true)}
            className="px-3 py-1.5 bg-[#2F8481] text-white rounded-lg hover:bg-[#2a7875] text-sm"
          >
            {currentConfig ? 'Redaguoti' : 'Sukurti'} konfigūraciją
          </button>
        </div>

        {currentConfig ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Skaitliukų statistika */}
              <div className="bg-neutral-50 rounded-lg p-3">
                <div className="text-sm text-neutral-600 mb-1">Skaitliukai</div>
                <div className="text-2xl font-bold text-[#2F8481]">{meterStatus.total}</div>
                <div className="text-xs text-neutral-500">
                  {meterStatus.required} reikalingi, {meterStatus.individual} individualūs
                </div>
              </div>

              {/* Kainų statistika */}
              <div className="bg-neutral-50 rounded-lg p-3">
                <div className="text-sm text-neutral-600 mb-1">Kainos</div>
                <div className="text-2xl font-bold text-[#2F8481]">8</div>
                <div className="text-xs text-neutral-500">
                  Nustatytos visos kainos
                </div>
              </div>

              {/* Atnaujinimo data */}
              <div className="bg-neutral-50 rounded-lg p-3">
                <div className="text-sm text-neutral-600 mb-1">Atnaujinta</div>
                <div className="text-sm font-medium">
                  {new Date(currentConfig.updatedAt).toLocaleDateString('lt-LT')}
                </div>
                <div className="text-xs text-neutral-500">
                  {new Date(currentConfig.updatedAt).toLocaleTimeString('lt-LT')}
                </div>
              </div>
            </div>

            {/* Skaitliukų sąrašas */}
            <div className="mt-4">
              <h4 className="text-sm font-semibold mb-2">Konfigūruoti skaitliukai:</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {currentConfig.meters.map((meter) => (
                  <div key={meter.id} className="flex items-center justify-between p-2 bg-neutral-50 rounded text-sm">
                    <span className="font-medium">{meter.name}</span>
                    <div className="flex items-center gap-1">
                      {meter.isRequired && (
                        <span className="w-2 h-2 bg-green-500 rounded-full" title="Reikalingas" />
                      )}
                      {meter.hasIndividualMeter && (
                        <span className="w-2 h-2 bg-blue-500 rounded-full" title="Individualus" />
                      )}
                      {meter.defaultPrice && (
                        <span className="text-xs text-neutral-500">
                          {meter.defaultPrice}€/{meter.unit}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <div className="text-neutral-400 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h4 className="text-lg font-medium text-neutral-700 mb-2">Nėra konfigūracijos</h4>
            <p className="text-sm text-neutral-500 mb-4">
              Sukurkite komunalinių konfigūraciją, kad galėtumėte valdyti skaitliukus ir kainas šiam adresui.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-[#2F8481] text-white rounded-lg hover:bg-[#2a7875]"
            >
              Sukurti konfigūraciją
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <CommunalConfigModal
          address={address}
          currentConfig={currentConfig}
          onSave={handleSaveConfig}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
};
