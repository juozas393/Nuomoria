import React, { useState, useMemo } from 'react';
import { XMarkIcon, CameraIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { type DistributionMethod } from '../../constants/meterDistribution';

interface Meter {
  id: string;
  name: string;
  type: 'individual' | 'communal';
  unit: 'm3' | 'kWh' | 'GJ' | 'MB' | 'fixed' | 'Kitas';
  price_per_unit: number;
  distribution_method: DistributionMethod;
  description: string;
  is_active: boolean;
  requires_photo: boolean;
  is_inherited?: boolean;
}

interface ReadingRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  apartmentMeters: Meter[];
  onSendRequest: (selectedMeterIds: string[], period: string, dueDate: string) => void;
}

export const ReadingRequestModal: React.FC<ReadingRequestModalProps> = ({
  isOpen,
  onClose,
  apartmentMeters,
  onSendRequest
}) => {
  const [selectedMeterIds, setSelectedMeterIds] = useState<string[]>([]);
  const [period, setPeriod] = useState('');
  const [dueDate, setDueDate] = useState('');

  // Automatically select meters that require photos
  const photoRequiredMeters = useMemo(() => {
    return apartmentMeters.filter(meter => meter.requires_photo && meter.is_active);
  }, [apartmentMeters]);

  // Initialize selected meters when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setSelectedMeterIds(photoRequiredMeters.map(meter => meter.id));
      // Set default period to current month
      const now = new Date();
      const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      setPeriod(currentPeriod);
      // Set default due date to 5th of next month
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 5);
      setDueDate(nextMonth.toISOString().split('T')[0]);
    }
  }, [isOpen, photoRequiredMeters]);

  const handleMeterToggle = (meterId: string) => {
    setSelectedMeterIds(prev => 
      prev.includes(meterId) 
        ? prev.filter(id => id !== meterId)
        : [...prev, meterId]
    );
  };

  const handleSendRequest = () => {
    if (selectedMeterIds.length === 0) {
      alert('Pasirinkite bent vieną skaitiklį');
      return;
    }
    if (!period || !dueDate) {
      alert('Užpildykite laikotarpį ir terminą');
      return;
    }
    
    onSendRequest(selectedMeterIds, period, dueDate);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200">
          <div className="flex items-center gap-3">
            <CameraIcon className="w-6 h-6 text-[#2F8481]" />
            <h2 className="text-xl font-semibold text-neutral-900">
              Siųsti prašymą nuomininkui
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Period and Due Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Laikotarpis
              </label>
              <input
                type="month"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Terminas (iki kada)
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481]"
              />
            </div>
          </div>

          {/* Info Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CameraIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-700">
                <p className="font-medium mb-1">Nuomininkas gaus prašymą pateikti rodmenis tik tiems skaitliukams, kurie reikalauja nuotraukų.</p>
                <p>Kiti skaitliukai bus skaičiuojami automatiškai pagal pasirinktą metodą.</p>
              </div>
            </div>
          </div>

          {/* Meters Selection */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-neutral-900">
                Skaitliukai, kuriems reikia nuotraukų ({selectedMeterIds.length}/{photoRequiredMeters.length})
              </h3>
              <button
                onClick={() => setSelectedMeterIds(photoRequiredMeters.map(meter => meter.id))}
                className="text-sm text-[#2F8481] hover:text-[#2F8481]/80 font-medium"
              >
                Pasirinkti visus
              </button>
            </div>

            <div className="space-y-2">
              {photoRequiredMeters.map((meter) => (
                <div
                  key={meter.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                    selectedMeterIds.includes(meter.id)
                      ? 'border-[#2F8481] bg-[#2F8481]/5'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                  onClick={() => handleMeterToggle(meter.id)}
                >
                  <input
                    type="checkbox"
                    checked={selectedMeterIds.includes(meter.id)}
                    onChange={() => handleMeterToggle(meter.id)}
                    className="w-4 h-4 text-[#2F8481] border-neutral-300 rounded focus:ring-[#2F8481]"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getMeterIcon(meter.name)}</span>
                      <div>
                        <div className="font-medium text-neutral-900">{meter.name}</div>
                        <div className="text-sm text-neutral-500">{meter.description}</div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-neutral-900">
                      {meter.type === 'individual' ? 'Individualus' : 'Bendras'}
                    </div>
                    <div className="text-xs text-neutral-500">
                      {getUnitSuffix(meter.unit)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {photoRequiredMeters.length === 0 && (
              <div className="text-center py-8 text-neutral-500">
                <CameraIcon className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
                        <p>Nėra skaitliukų, kuriems reikėtų nuotraukų</p>
        <p className="text-sm">Pridėkite skaitliukus su nuotraukų reikalavimu</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-neutral-200 bg-neutral-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-neutral-700 hover:text-neutral-900 font-medium"
          >
            Atšaukti
          </button>
          <button
            onClick={handleSendRequest}
            disabled={selectedMeterIds.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-[#2F8481] text-white rounded-lg hover:bg-[#2F8481]/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            <PaperAirplaneIcon className="w-4 h-4" />
            Siųsti prašymą ({selectedMeterIds.length})
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper functions
const getMeterIcon = (name: string) => {
  if (name.includes('Vanduo')) return '💧';
  if (name.includes('Elektra')) return '⚡';
  if (name.includes('Šildymas')) return '🔥';
  if (name.includes('Internetas')) return '🌐';
  if (name.includes('Šiukšlės')) return '🗑️';
  if (name.includes('Dujos')) return '🔥';
  if (name.includes('Vėdinimas')) return '💨';
  if (name.includes('Liftas')) return '🛗';
  return '📊';
};

const getUnitSuffix = (unit: string) => {
  switch (unit) {
    case 'm3': return '€/m³';
    case 'kWh': return '€/kWh';
    case 'GJ': return '€/GJ';
    case 'Kitas': return '€/vnt';
    default: return '€';
  }
};
