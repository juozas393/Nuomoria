import React, { useState, useCallback } from 'react';
import { MeterPriceData } from './MeterPriceManager';
import { 
  HomeIcon, 
  BoltIcon, 
  WifiIcon, 
  FireIcon, 
  TrashIcon,
  PhotoIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

interface MeterManagementCardProps {
  meter: MeterPriceData;
  onUpdateReading?: (meterId: string, reading: { current: number; previous: number }) => void;
  onOpenApartmentReadings?: (meterId: string) => void;
  onReviewTenantSubmission?: (meterId: string, action: 'approve' | 'reject') => void;
}

export const MeterManagementCard: React.FC<MeterManagementCardProps> = ({
  meter,
  onUpdateReading,
  onOpenApartmentReadings,
  onReviewTenantSubmission
}) => {
  const [currentReading, setCurrentReading] = useState('');
  const [previousReading, setPreviousReading] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get policy with defaults - use address settings as source of truth
  const policy = meter.policy || {
    scope: meter.distribution_method === 'fixed_split' ? 'none' as const
         : meter.type === 'individual' ? 'apartment' as const
         : 'building' as const,
    collectionMode: 'landlord_only' as const
  };

  console.log('🔍 MeterManagementCard policy:', {
    name: meter.name,
    type: meter.type,
    distribution_method: meter.distribution_method,
    policy: policy
  });

  // Determine what to show based on policy ONLY (no guessing from type/distribution)
  const showLandlordInput = policy.scope !== 'none' && policy.collectionMode === 'landlord_only';
  const showTenantReview = policy.scope !== 'none' && policy.collectionMode === 'tenant_photo';
  const isFixedMeter = policy.scope === 'none';

  // Get meter icon based on name
  const getMeterIcon = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('elektra')) return <BoltIcon className="w-5 h-5" />;
    if (lowerName.includes('vanduo')) return <HomeIcon className="w-5 h-5" />;
    if (lowerName.includes('internetas')) return <WifiIcon className="w-5 h-5" />;
    if (lowerName.includes('šildymas')) return <FireIcon className="w-5 h-5" />;
    if (lowerName.includes('šiukšl')) return <TrashIcon className="w-5 h-5" />;
    return <HomeIcon className="w-5 h-5" />;
  };

  // Get meter type label
  const getMeterTypeLabel = () => {
    if (isFixedMeter) return 'Fiksuota įmoka';
    if (meter.type === 'individual') return 'Individualus skaitliukas';
    return 'Bendras skaitliukas';
  };

  // Get status label and color
  // NOTE: UI validation should be based on policy.collectionMode, not requires_photo
  // Status calculation rules:
  // - landlord_only && no current reading → "Nepateiktas rodmuo"
  // - tenant_photo && not submitted → "Reikia foto"
  // - tenant_photo && submitted but not approved → "Laukia patvirtinimo"
  const getStatusInfo = () => {
    if (isFixedMeter) {
      return { label: 'Fiksuota', color: 'bg-gray-100 text-gray-700' };
    }
    
    if (showTenantReview) {
      // Mock status - in real app this would come from database
      return { label: 'Laukia patvirtinimo', color: 'bg-yellow-100 text-yellow-700' };
    }
    
    if (showLandlordInput) {
      // Mock status - in real app this would check if reading exists
      return { label: 'Nepateiktas rodmuo', color: 'bg-red-100 text-red-700' };
    }
    
    return { label: 'Aktyvus', color: 'bg-green-100 text-green-700' };
  };

  const handleSubmitReading = useCallback(async () => {
    if (!currentReading || !previousReading) return;
    
    setIsSubmitting(true);
    try {
      await onUpdateReading?.(meter.id, {
        current: parseFloat(currentReading),
        previous: parseFloat(previousReading)
      });
      setCurrentReading('');
      setPreviousReading('');
    } catch (error) {
      console.error('Error updating reading:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [currentReading, previousReading, meter.id, onUpdateReading]);

  const statusInfo = getStatusInfo();

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
            {getMeterIcon(meter.name)}
          </div>
          <div>
            <h3 className="font-medium text-gray-900">{meter.name}</h3>
            <p className="text-sm text-gray-500">{getMeterTypeLabel()}</p>
          </div>
        </div>
        
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
          {statusInfo.label}
        </span>
      </div>

      {/* Price Display */}
      <div className="bg-gray-50 rounded-lg p-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Kaina:</span>
          <span className="font-medium text-gray-900">
            {meter.unit === 'Kitas' || meter.distribution_method === 'fixed_split'
              ? `${meter.fixed_price || 0}€/mėn.` // Show €/mėn. instead of €/Kitas
              : `${meter.price_per_unit || 0}€/${meter.unit}`
            }
          </span>
        </div>
      </div>

      {/* Action Area */}
      {isFixedMeter ? (
        <div className="text-center py-4 text-gray-500">
          <p className="text-sm">Fiksuota įmoka - rodmenų nereikia</p>
        </div>
      ) : showLandlordInput && policy.scope === 'building' ? (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Įvesti bendrą rodmenį</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dabartinis rodmuo
              </label>
              <input
                type="number"
                step="0.01"
                value={currentReading}
                onChange={(e) => setCurrentReading(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ankstesnis rodmuo
              </label>
              <input
                type="number"
                step="0.01"
                value={previousReading}
                onChange={(e) => setPreviousReading(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>
          </div>
          <button
            onClick={handleSubmitReading}
            disabled={isSubmitting || !currentReading || !previousReading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Išsaugoma...' : 'Išsaugoti rodmenį'}
          </button>
        </div>
      ) : showLandlordInput && policy.scope === 'apartment' ? (
        <div className="text-center py-4">
          <button
            onClick={() => onOpenApartmentReadings?.(meter.id)}
            className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
          >
            Atidaryti butų rodmenis
          </button>
        </div>
      ) : showTenantReview ? (
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-yellow-600">
            <PhotoIcon className="w-4 h-4" />
            <span className="text-sm font-medium">Laukia nuomininko pateikimo</span>
          </div>
          <div className="bg-yellow-50 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              Nuomininkas turi pateikti rodmenį su nuotrauka
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
};
