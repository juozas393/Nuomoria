import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { MeterPriceData } from './MeterPriceManager';
import {
  HomeIcon,
  BoltIcon,
  WifiIcon,
  FireIcon,
  TrashIcon,
  PhotoIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

interface MeterManagementCardProps {
  meter: MeterPriceData & { costPerApartment?: number };
  onUpdateReading?: (meterId: string, reading: { current: number; previous: number }) => Promise<void> | void;
  onOpenApartmentReadings?: (meterId: string) => void;
  onReviewTenantSubmission?: (meterId: string, action: 'approve' | 'reject') => void | Promise<void>;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('lt-LT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(value);

export const MeterManagementCard: React.FC<MeterManagementCardProps> = ({
  meter,
  onUpdateReading,
  onOpenApartmentReadings,
  onReviewTenantSubmission
}) => {
  const [currentReading, setCurrentReading] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const policy = useMemo(() => {
    if (meter.policy) return meter.policy;

    if (meter.distribution_method === 'fixed_split') {
      return { scope: 'none' as const, collectionMode: 'landlord_only' as const };
    }

    if (meter.type === 'communal') {
      return { scope: 'building' as const, collectionMode: 'landlord_only' as const };
    }

    return { scope: 'apartment' as const, collectionMode: 'landlord_only' as const };
  }, [meter]);

  const isFixedMeter = policy.scope === 'none';
  const showLandlordInput = policy.scope !== 'none';
  const showTenantReview = policy.scope !== 'none' && policy.collectionMode === 'tenant_photo';

  const previousReadingValue = useMemo(() => meter.last_reading ?? meter.previous_reading ?? null, [meter.last_reading, meter.previous_reading]);
  const lastReadingDate = useMemo(() => (meter.last_reading_date ? new Date(meter.last_reading_date).toLocaleDateString('lt-LT') : null), [meter.last_reading_date]);
  const unitLabel = useMemo(() => {
    switch (meter.unit) {
      case 'm3':
        return 'm³';
      case 'kWh':
        return 'kWh';
      case 'GJ':
        return 'GJ';
      case 'Kitas':
        return '€';
      default:
        return meter.unit;
    }
  }, [meter.unit]);

  const formatRelativeTime = useCallback((iso?: string | null) => {
    if (!iso) return null;
    const timestamp = new Date(iso).getTime();
    if (Number.isNaN(timestamp)) return null;
    const diffMinutes = (Date.now() - timestamp) / (1000 * 60);
    if (diffMinutes < 1) return 'ką tik';
    if (diffMinutes < 60) {
      const minutes = Math.round(diffMinutes);
      return minutes <= 1 ? 'prieš 1 min.' : `prieš ${minutes} min.`;
    }
    const diffHours = diffMinutes / 60;
    if (diffHours < 24) {
      const hours = Math.round(diffHours);
      return hours <= 1 ? 'prieš 1 val.' : `prieš ${hours} val.`;
    }
    const diffDays = Math.round(diffHours / 24);
    if (diffDays < 7) return diffDays === 1 ? 'prieš 1 d.' : `prieš ${diffDays} d.`;
    const diffWeeks = Math.round(diffDays / 7);
    if (diffWeeks < 5) return `prieš ${diffWeeks} sav.`;
    const diffMonths = Math.round(diffDays / 30);
    return `prieš ${diffMonths} mėn.`;
  }, []);

  const lastReadingRelative = useMemo(() => formatRelativeTime(meter.last_reading_date), [formatRelativeTime, meter.last_reading_date]);
  const lastTotalCost = meter.last_total_cost ?? null;
  const fixedCharge = useMemo(() => meter.fixed_price ?? meter.price_per_unit ?? 0, [meter.fixed_price, meter.price_per_unit]);
  const pricePerUnit = meter.price_per_unit ?? 0;

  const currentReadingNumber = useMemo(() => {
    if (!currentReading.trim()) return null;
    const parsed = Number.parseFloat(currentReading);
    return Number.isNaN(parsed) ? null : parsed;
  }, [currentReading]);

  const predictedConsumption = useMemo(() => {
    if (currentReadingNumber == null) return null;
    const baseline = previousReadingValue ?? 0;
    return Math.max(0, currentReadingNumber - baseline);
  }, [currentReadingNumber, previousReadingValue]);

  const predictedAmountValue = useMemo(() => {
    if (meter.distribution_method === 'fixed_split' || meter.unit === 'Kitas') {
      return fixedCharge;
    }
    if (predictedConsumption == null) return null;
    return Math.max(0, predictedConsumption * pricePerUnit);
  }, [fixedCharge, meter.distribution_method, meter.unit, predictedConsumption, pricePerUnit]);

  const predictedConsumptionLabel = useMemo(() => {
    if (meter.distribution_method === 'fixed_split' || meter.unit === 'Kitas') {
      return 'Fiksuota suma';
    }
    if (predictedConsumption == null) return '—';
    return `${predictedConsumption.toFixed(2)} ${unitLabel}`;
  }, [meter.distribution_method, meter.unit, predictedConsumption, unitLabel]);

  const predictedBreakdown = useMemo(() => {
    if (meter.distribution_method === 'fixed_split' || meter.unit === 'Kitas') {
      return 'Fiksuota mėnesio suma, rodmenų nereikia.';
    }
    if (predictedConsumption == null) {
      return 'Įveskite dabartinį rodmenį, kad apskaičiuotume sumą.';
    }
    return `${predictedConsumption.toFixed(2)} × ${pricePerUnit.toLocaleString('lt-LT', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })} €/${unitLabel}`;
  }, [meter.distribution_method, meter.unit, predictedConsumption, pricePerUnit, unitLabel]);

  const predictedAmountLabel = useMemo(() => {
    if (predictedAmountValue == null) return null;
    return formatCurrency(predictedAmountValue);
  }, [predictedAmountValue]);

  const priceDisplay = useMemo(() => {
    if (meter.distribution_method === 'fixed_split' || meter.unit === 'Kitas') {
      return `${fixedCharge.toLocaleString('lt-LT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €/mėn.`;
    }
    return `${pricePerUnit.toLocaleString('lt-LT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €/${unitLabel}`;
  }, [fixedCharge, meter.distribution_method, meter.unit, pricePerUnit, unitLabel]);

  const lastTotalCostLabel = useMemo(() => (lastTotalCost != null ? formatCurrency(lastTotalCost) : null), [lastTotalCost]);

  useEffect(() => {
    setCurrentReading('');
  }, [meter.id, meter.last_reading, meter.previous_reading]);

  const getMeterIcon = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('elektra')) return <BoltIcon className="w-5 h-5" />;
    if (lowerName.includes('vanduo')) return <HomeIcon className="w-5 h-5" />;
    if (lowerName.includes('internetas')) return <WifiIcon className="w-5 h-5" />;
    if (lowerName.includes('šildymas') || lowerName.includes('siluma') || lowerName.includes('heat')) return <FireIcon className="w-5 h-5" />;
    if (lowerName.includes('šiukšl') || lowerName.includes('atliek')) return <TrashIcon className="w-5 h-5" />;
    return <HomeIcon className="w-5 h-5" />;
  };

  const statusInfo = useMemo(() => {
    if (isFixedMeter) {
      return { label: 'Fiksuota kaina', color: 'bg-gray-100 text-gray-700' };
    }

    if (showTenantReview && meter.tenant_submission_status) {
      switch (meter.tenant_submission_status) {
        case 'approved':
          return { label: 'Patvirtinta', color: 'bg-emerald-100 text-emerald-700' };
        case 'rejected':
          return { label: 'Atmesta', color: 'bg-rose-100 text-rose-700' };
        case 'pending':
        default:
          return { label: 'Laukia patvirtinimo', color: 'bg-amber-100 text-amber-700' };
      }
    }

    if (showLandlordInput) {
      if (previousReadingValue != null) {
        return { label: 'Rodmuo pateiktas', color: 'bg-emerald-100 text-emerald-700' };
      }
      return { label: 'Laukia rodmens', color: 'bg-amber-100 text-amber-700' };
    }

    return { label: 'Aktyvus', color: 'bg-blue-100 text-blue-700' };
  }, [isFixedMeter, showTenantReview, showLandlordInput, meter.tenant_submission_status, previousReadingValue]);

  const handleSubmitReading = useCallback(async () => {
    if (!onUpdateReading || !currentReading) return;
    const currentValue = parseFloat(currentReading);
    if (Number.isNaN(currentValue)) return;

    setIsSubmitting(true);
    try {
      await onUpdateReading(meter.id, {
        current: currentValue,
        previous: previousReadingValue ?? 0
      });
      setCurrentReading('');
    } catch (error) {
      console.error('Error updating meter reading:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [currentReading, onUpdateReading, meter.id, previousReadingValue]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-[#2F8481]/10 rounded-lg text-[#2F8481]">{getMeterIcon(meter.name)}</div>
          <div>
            <h3 className="font-semibold text-gray-900">{meter.name}</h3>
            <p className="text-xs uppercase tracking-[0.18em] text-gray-500">
              {meter.type === 'communal' ? 'Bendras skaitliukas' : 'Individualus skaitliukas'}
            </p>
          </div>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
      </div>

      <div className="grid grid-cols-1 gap-3 text-sm text-gray-600">
        <div className="flex justify-between">
          <span>Kaina:</span>
          <span className="font-medium text-gray-900">{priceDisplay}</span>
        </div>
        {meter.costPerApartment != null && meter.type === 'communal' && (
          <div className="flex justify-between">
            <span>Prognozuota dalis butui:</span>
            <span className="font-medium text-gray-900">{formatCurrency(meter.costPerApartment)}</span>
          </div>
        )}
        {lastTotalCostLabel && (
          <div className="flex justify-between">
            <span>Paskutinė suma:</span>
            <span className="font-medium text-gray-900">{lastTotalCostLabel}</span>
          </div>
        )}
        {previousReadingValue != null && (
          <div className="flex justify-between text-xs text-gray-500">
            <span>Ankstesnis rodmuo</span>
            <span>
              {previousReadingValue} {unitLabel}
              {lastReadingDate ? ` (${lastReadingDate})` : ''}
            </span>
          </div>
        )}
        {lastReadingDate && (
          <div className="flex justify-between text-xs text-gray-500">
            <span>Atnaujinta</span>
            <span>
              {lastReadingDate}
              {lastReadingRelative ? ` (${lastReadingRelative})` : ''}
            </span>
          </div>
        )}
      </div>

      {isFixedMeter ? (
        <div className="space-y-2 rounded-lg border border-gray-100 bg-white p-3 text-sm text-gray-600">
          <p className="font-semibold text-gray-800">Fiksuota įmoka</p>
          <p>
            Rodmenų pateikti nereikia. Šiuo metu taikoma suma:
            <span className="font-semibold text-gray-900"> {formatCurrency(fixedCharge)}</span> per mėnesį.
          </p>
          {lastTotalCostLabel && (
            <p className="text-xs text-gray-500">Paskutinė priskaičiuota suma: {lastTotalCostLabel}</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {showLandlordInput && (
            <div className="space-y-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
              <h4 className="text-sm font-semibold text-gray-800">
                Nuomotojo rodmenys
              </h4>
              {policy.scope === 'building' ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1" htmlFor={`meter-input-${meter.id}`}>
                        Dabartinis rodmuo ({meter.unit})
                      </label>
                      <input
                        id={`meter-input-${meter.id}`}
                        type="number"
                        step="0.01"
                        value={currentReading}
                        onChange={(e) => setCurrentReading(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#2F8481] focus:outline-none focus:ring-2 focus:ring-[#2F8481]/40"
                        placeholder={previousReadingValue != null ? previousReadingValue.toString() : '0.00'}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Ankstesnis rodmuo ({meter.unit})
                      </label>
                      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
                        {previousReadingValue != null ? previousReadingValue : '—'}
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg border border-[#2F8481]/15 bg-white px-3 py-3 text-xs text-black/70">
                    <div className="flex items-center justify-between">
                      <span>Suvartojimas</span>
                      <span className="font-medium text-black">{predictedConsumptionLabel}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-sm font-semibold text-black">
                      <span>Prognozuojama suma</span>
                      <span>{predictedAmountLabel ?? '—'}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-black/45">{predictedBreakdown}</p>
                  </div>
                  <button
                    onClick={handleSubmitReading}
                    disabled={isSubmitting || !currentReading}
                    className="w-full rounded-lg bg-[#2F8481] py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#276f6c] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? 'Išsaugoma…' : 'Išsaugoti rodmenį'}
                  </button>
                </>
              ) : (
                <div className="space-y-2 text-sm text-gray-600">
                  <p>Individualus skaitliukas. Norėdami peržiūrėti konkrečių butų rodmenis, atverkite sąrašą.</p>
                  <button
                    onClick={() => onOpenApartmentReadings?.(meter.id)}
                    className="w-full rounded-lg border border-[#2F8481] py-2 text-sm font-semibold text-[#2F8481] transition hover:bg-[#2F8481]/10"
                  >
                    Atidaryti butų sąrašą
                  </button>
                </div>
              )}
            </div>
          )}

          {!showLandlordInput && !showTenantReview && (
            <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-500">
              Šiam skaitliukui nereikia papildomų veiksmų.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
