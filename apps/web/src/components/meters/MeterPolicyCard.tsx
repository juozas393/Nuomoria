import React from 'react';
import { Meter, MeterReading, ReadingStatus } from '../../types/meterPolicy';
import { isVisibleToTenant, inferPolicyFrom } from '../../types/meterPolicy';

interface MeterPolicyCardProps {
  meter: Meter;
  reading?: MeterReading;
  isLandlord?: boolean;
  onReadingSubmit?: (reading: Partial<MeterReading>) => void;
  onReadingApprove?: (readingId: string) => void;
  onReadingReject?: (readingId: string) => void;
}

const MeterPolicyCard: React.FC<MeterPolicyCardProps> = ({
  meter,
  reading,
  isLandlord = false,
  onReadingSubmit,
  onReadingApprove,
  onReadingReject
}) => {
  // Infer policy if not set
  const policy = meter.policy || {
    collectionMode: meter.distribution === 'fixed' ? 'landlord_only' :
      meter.type === 'individual' ? 'tenant_photo' : 'landlord_only',
    scope: inferPolicyFrom(meter)
  };

  // Use collectionMode from meter if available (for legacy compatibility)
  const effectiveCollectionMode = meter.collectionMode || policy.collectionMode;

  const getStatusColor = (status: ReadingStatus) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: ReadingStatus) => {
    switch (status) {
      case 'approved': return 'Patvirtinta';
      case 'rejected': return 'Atmesta';
      case 'pending': return 'Laukia patvirtinimo';
      default: return 'Nežinomas';
    }
  };

  const getUnitLabel = (unit: string) => {
    switch (unit) {
      case 'm3': return 'm³';
      case 'kWh': return 'kWh';
      case 'GJ': return 'GJ';
      case 'custom': return 'vnt';
      default: return unit;
    }
  };

  const getKindLabel = (kind: string) => {
    switch (kind) {
      case 'water_cold': return 'Šaltas vanduo';
      case 'water_hot': return 'Karštas vanduo';
      case 'electricity_ind': return 'Elektra (individuali)';
      case 'electricity_shared': return 'Elektra (bendra)';
      case 'heating': return 'Šildymas';
      case 'internet': return 'Internetas';
      case 'waste': return 'Šiukšlių išvežimas';
      case 'ventilation': return 'Vėdinimas';
      default: return kind;
    }
  };

  // Get correct badge label based on meter type and distribution
  const getBadgeLabel = () => {
    if (meter.distribution === 'fixed' || meter.distribution === 'fixed_split') {
      return 'Fiksuota įmoka';
    }
    if (meter.type === 'individual') {
      return 'Individualus skaitliukas';
    }
    return 'Bendras skaitliukas';
  };

  const getBadgeColor = () => {
    if (meter.distribution === 'fixed' || meter.distribution === 'fixed_split') {
      return 'bg-purple-100 text-purple-800';
    }
    if (meter.type === 'individual') {
      return 'bg-blue-100 text-blue-800';
    }
    return 'bg-green-100 text-green-800';
  };

  // Don't show to tenants if not visible
  if (!isLandlord && !isVisibleToTenant(meter)) {
    return null;
  }

  const isFixed = meter.distribution === 'fixed' || meter.distribution === 'fixed_split';
  const isTenantMode = effectiveCollectionMode === 'tenant_photo';

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900">
          {getKindLabel(meter.kind)}
        </h3>
        <div className="flex items-center gap-2">
          {/* Collection mode badge */}
          {!isFixed && (
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium cursor-help ${isTenantMode
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-800'
                }`}
              title={isTenantMode
                ? 'Rodmuo + nuotrauka (nuomininkas): Nuomininkas pateikia rodmenį su nuotrauka ir skaičiumi. Nuomotojas tvirtina.'
                : 'Rodmenys (nuomotojas): Rodmenis suveda tik nuomotojas. Nuomininkui šis skaitliukas nerodomas iki sąskaitos.'
              }
            >
              {isTenantMode ? 'Nuomininkas' : 'Nuomotojas'}
            </span>
          )}
          {/* Meter type badge */}
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getBadgeColor()}`}>
            {getBadgeLabel()}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {/* Meter info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          {!isFixed && (
            <>
              <div>
                <span className="text-gray-600">Tipas:</span>
                <span className="ml-2 font-medium">
                  {meter.type === 'individual' ? 'Individualus' : 'Bendras'}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Vienetas:</span>
                <span className="ml-2 font-medium">{getUnitLabel(meter.unit)}</span>
              </div>
              {meter.pricePerUnit && (
                <div>
                  <span className="text-gray-600">Kaina:</span>
                  <span className="ml-2 font-medium">
                    {meter.pricePerUnit.toFixed(2)} €/{getUnitLabel(meter.unit)}
                  </span>
                </div>
              )}
            </>
          )}
          {isFixed && meter.fixedAmountPerApt && (
            <div className="col-span-2">
              <span className="text-gray-600">Fiksuota suma:</span>
              <span className="ml-2 font-medium">
                {meter.fixedAmountPerApt.toFixed(2)} €/butui
              </span>
            </div>
          )}
        </div>

        {/* Reading display - only for non-fixed meters */}
        {!isFixed && reading && policy.scope !== 'none' && (
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Skaitliukai</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(reading.status)}`}>
                {getStatusText(reading.status)}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Praeitas:</span>
                <span className="ml-2 font-medium">{reading.previousReading}</span>
              </div>
              <div>
                <span className="text-gray-600">Dabartinis:</span>
                <span className="ml-2 font-medium">{reading.currentReading}</span>
              </div>
              <div>
                <span className="text-gray-600">Skirtumas:</span>
                <span className="ml-2 font-medium">{reading.consumption ?? reading.difference ?? 0}</span>
              </div>
            </div>
            {reading.photoUrl && (
              <div className="mt-2">
                <span className="text-gray-600 text-sm">Nuotrauka:</span>
                <img loading="lazy" decoding="async" src={reading.photoUrl}
                  alt="Skaitliuko nuotrauka"
                  className="mt-1 w-20 h-20 object-cover rounded border"
                />
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        {isLandlord && !isFixed && effectiveCollectionMode === 'landlord_only' && policy.scope !== 'none' && (
          <div className="flex gap-2">
            <button className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
              Išsaugoti rodmenį
            </button>
          </div>
        )}

        {!isLandlord && !isFixed && effectiveCollectionMode === 'tenant_photo' && policy.scope !== 'none' && (
          <div className="flex gap-2">
            <button className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors">
              Pateikti rodmenį
            </button>
          </div>
        )}

        {isLandlord && reading && reading.status === 'pending' && (
          <div className="flex gap-2">
            <button
              onClick={() => onReadingApprove?.(reading.id)}
              className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors"
            >
              Patvirtinti
            </button>
            <button
              onClick={() => onReadingReject?.(reading.id)}
              className="px-3 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
            >
              Atmesti
            </button>
          </div>
        )}

        {/* Dev tooltip for debugging */}
        {isLandlord && process.env.NODE_ENV === 'development' && (
          <div className="mt-2 p-2 bg-gray-100 rounded text-xs text-gray-600">
            <div>scope: {policy.scope}</div>
            <div>mode: {effectiveCollectionMode}</div>
            <div>unit: {meter.unit}</div>
            <div>distribution: {meter.distribution}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MeterPolicyCard;
