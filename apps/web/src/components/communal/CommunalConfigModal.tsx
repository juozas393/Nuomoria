import React, { useState } from 'react';
import { CommunalConfig, CommunalMeter, CommunalPrices } from '../../types/communal';

interface CommunalConfigModalProps {
  address: string;
  currentConfig?: CommunalConfig;
  onSave: (config: CommunalConfig) => void;
  onClose: () => void;
}

const DEFAULT_METERS: CommunalMeter[] = [
  { id: '1', type: 'water_cold', name: 'Šaltas vanduo', unit: 'm³', isRequired: true, hasIndividualMeter: true, defaultPrice: 1.32 },
  { id: '2', type: 'water_hot', name: 'Karštas vanduo', unit: 'm³', isRequired: true, hasIndividualMeter: true, defaultPrice: 3.5 },
  { id: '3', type: 'electricity', name: 'Elektra', unit: 'kWh', isRequired: true, hasIndividualMeter: true, defaultPrice: 0.23 },
  { id: '4', type: 'heating', name: 'Šildymas', unit: 'kWh', isRequired: false, hasIndividualMeter: true, defaultPrice: 0.095 },
  { id: '5', type: 'gas', name: 'Dujos', unit: 'm³', isRequired: false, hasIndividualMeter: true, defaultPrice: 0.99 },
  { id: '6', type: 'garbage', name: 'Šiukšlės', unit: 'mėn', isRequired: false, hasIndividualMeter: false, defaultPrice: 5.0 },
];

const DEFAULT_PRICES: CommunalPrices = {
  waterCold: 1.32,
  waterHot: 3.5,
  electricity: 0.23,
  gas: 0.99,
  heating: 0.095,
  garbage: 5.0,
};

export const CommunalConfigModal: React.FC<CommunalConfigModalProps> = ({
  address,
  currentConfig,
  onSave,
  onClose
}) => {
  const [meters, setMeters] = useState<CommunalMeter[]>(currentConfig?.meters || DEFAULT_METERS);
  const [prices, setPrices] = useState<CommunalPrices>(currentConfig?.prices || DEFAULT_PRICES);

  const handleMeterToggle = (meterId: string, field: 'isRequired' | 'hasIndividualMeter') => {
    setMeters(prev => prev.map(meter =>
      meter.id === meterId
        ? { ...meter, [field]: !meter[field] }
        : meter
    ));
  };

  const handlePriceChange = (type: keyof CommunalPrices, value: number) => {
    setPrices(prev => ({ ...prev, [type]: value }));
  };

  const handleSave = () => {
    const config: CommunalConfig = {
      id: currentConfig?.id || `config_${Date.now()}`,
      address,
      meters,
      prices,
      createdAt: currentConfig?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onSave(config);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200">
          <div>
            <h2 className="text-xl font-bold text-neutral-800">Komunalinių konfigūracija</h2>
            <p className="text-sm text-neutral-600">Adresas: {address}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Skaitliukų konfigūracija */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Komunaliniai skaitliukai</h3>
              <div className="space-y-3">
                {meters.map((meter) => (
                  <div key={meter.id} className="border border-neutral-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{meter.name}</h4>
                      <span className="text-sm text-neutral-500">{meter.unit}</span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-neutral-600">Reikalingas</span>
                        <button
                          onClick={() => handleMeterToggle(meter.id, 'isRequired')}
                          className={`w-10 h-6 rounded-full transition-colors ${meter.isRequired ? 'bg-[#2F8481]' : 'bg-neutral-300'
                            }`}
                        >
                          <div className={`w-4 h-4 bg-white rounded-full transition-transform ${meter.isRequired ? 'translate-x-5' : 'translate-x-1'
                            }`} />
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-neutral-600">Individualus skaitliukas</span>
                        <button
                          onClick={() => handleMeterToggle(meter.id, 'hasIndividualMeter')}
                          className={`w-10 h-6 rounded-full transition-colors ${meter.hasIndividualMeter ? 'bg-[#2F8481]' : 'bg-neutral-300'
                            }`}
                        >
                          <div className={`w-4 h-4 bg-white rounded-full transition-transform ${meter.hasIndividualMeter ? 'translate-x-5' : 'translate-x-1'
                            }`} />
                        </button>
                      </div>

                      {meter.hasIndividualMeter && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-neutral-600">Kaina už {meter.unit}</span>
                          <input
                            type="number"
                            step="0.01"
                            value={meter.defaultPrice || 0}
                            onChange={(e) => {
                              setMeters(prev => prev.map(m =>
                                m.id === meter.id
                                  ? { ...m, defaultPrice: parseFloat(e.target.value) || 0 }
                                  : m
                              ));
                            }}
                            className="w-20 px-2 py-1 text-sm border border-neutral-300 rounded"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Kainų konfigūracija */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Komunalinių kainos</h3>
              <div className="space-y-3">
                <div className="border border-neutral-200 rounded-lg p-4">
                  <h4 className="font-medium mb-3">Kainos už vienetą</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Šaltas vanduo (€/m³)</span>
                      <input
                        type="number"
                        step="0.01"
                        value={prices.waterCold}
                        onChange={(e) => handlePriceChange('waterCold', parseFloat(e.target.value) || 0)}
                        className="w-20 px-2 py-1 text-sm border border-neutral-300 rounded"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Karštas vanduo (€/m³)</span>
                      <input
                        type="number"
                        step="0.01"
                        value={prices.waterHot}
                        onChange={(e) => handlePriceChange('waterHot', parseFloat(e.target.value) || 0)}
                        className="w-20 px-2 py-1 text-sm border border-neutral-300 rounded"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Elektra (€/kWh)</span>
                      <input
                        type="number"
                        step="0.01"
                        value={prices.electricity}
                        onChange={(e) => handlePriceChange('electricity', parseFloat(e.target.value) || 0)}
                        className="w-20 px-2 py-1 text-sm border border-neutral-300 rounded"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Dujos (€/m³)</span>
                      <input
                        type="number"
                        step="0.01"
                        value={prices.gas}
                        onChange={(e) => handlePriceChange('gas', parseFloat(e.target.value) || 0)}
                        className="w-20 px-2 py-1 text-sm border border-neutral-300 rounded"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Šildymas (€/kWh)</span>
                      <input
                        type="number"
                        step="0.01"
                        value={prices.heating}
                        onChange={(e) => handlePriceChange('heating', parseFloat(e.target.value) || 0)}
                        className="w-20 px-2 py-1 text-sm border border-neutral-300 rounded"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Šiukšlės (€/mėn)</span>
                      <input
                        type="number"
                        step="0.01"
                        value={prices.garbage}
                        onChange={(e) => handlePriceChange('garbage', parseFloat(e.target.value) || 0)}
                        className="w-20 px-2 py-1 text-sm border border-neutral-300 rounded"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Priežiūra (€/mėn)</span>
                      <input
                        type="number"
                        step="0.01"
                        value={prices.maintenance}
                        onChange={(e) => handlePriceChange('maintenance', parseFloat(e.target.value) || 0)}
                        className="w-20 px-2 py-1 text-sm border border-neutral-300 rounded"
                      />
                    </div>
                  </div>
                </div>

                {/* Informacija */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-800 mb-2">Kaip tai veikia?</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Ši konfigūracija pritaikys visiems butams adrese: {address}</li>
                    <li>• Individualūs skaitliukai - nuomininkas pateiks rodmenis</li>
                    <li>• Bendri skaitliukai - mokestis skirstomas pagal plotą</li>
                    <li>• Fiksuoti mokesčiai - šiukšlės, priežiūra</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-neutral-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-neutral-700 border border-neutral-300 rounded-lg hover:bg-neutral-50"
          >
            Atšaukti
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-[#2F8481] text-white rounded-lg hover:bg-[#2a7875]"
          >
            Išsaugoti konfigūraciją
          </button>
        </div>
      </div>
    </div>
  );
};



