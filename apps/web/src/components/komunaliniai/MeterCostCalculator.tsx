import React from 'react';

export interface MeterData {
  id: string;
  name: string;
  type: 'individual' | 'communal';
  unit: string;
  price_per_unit?: number;
  fixed_price?: number;
  distribution_method?: string;
  current_reading?: number;
  previous_reading?: number;
  value?: number;
  description?: string;
  requires_photo?: boolean;
}

interface MeterCostCalculatorProps {
  meters: MeterData[];
  apartmentCount?: number;
  formatCurrency?: (amount: number) => string;
}

export const MeterCostCalculator: React.FC<MeterCostCalculatorProps> = ({
  meters,
  apartmentCount = 1,
  formatCurrency = (amount) => `${amount.toFixed(2)} €`
}) => {
  const calculateMeterCost = (meter: MeterData): number => {
    if (!meter) return 0;

    const distribution = meter.distribution_method || 'per_apartment';

    // Fixed split - fixed price divided among apartments
    if (distribution === 'fixed_split' || meter.unit === 'Kitas') {
      return (meter.fixed_price || 0) / apartmentCount;
    }

    // Meters with readings - calculate consumption
    const currentReading = meter.current_reading || meter.value || 0;
    const previousReading = meter.previous_reading || 0;
    const consumption = Math.max(0, currentReading - previousReading);
    const totalCost = consumption * (meter.price_per_unit || 0);

    switch (distribution) {
      case 'per_consumption':
        // Individual consumption - each apartment pays for its own usage
        return totalCost;

      case 'per_apartment':
        // Equal split - total cost divided equally among apartments
        return apartmentCount > 0 ? totalCost / apartmentCount : totalCost;

      case 'per_person':
        // Per person - fallback to per_apartment at this level
        // (person count data used in server-side calculateDistribution)
        return apartmentCount > 0 ? totalCost / apartmentCount : totalCost;

      case 'per_area':
        // Per area - fallback to per_apartment at this level
        // (area data used in server-side calculateDistribution)
        return apartmentCount > 0 ? totalCost / apartmentCount : totalCost;

      default:
        // Default: if individual meter, own consumption; otherwise split
        if (meter.type === 'individual') {
          return totalCost;
        }
        return apartmentCount > 0 ? totalCost / apartmentCount : totalCost;
    }
  };

  const getMeterPriceDisplay = (meter: MeterData): string => {
    if (!meter) return 'Nenustatyta';

    if (meter.unit === 'Kitas' || meter.distribution_method === 'fixed_split') {
      return `${meter.fixed_price || 0}€/mėn.`;
    }

    return `${meter.price_per_unit || 0}€/${meter.unit}`;
  };

  const getDistributionLabel = (method?: string): string => {
    switch (method) {
      case 'per_apartment': return 'Pagal butų sk.';
      case 'per_person': return 'Pagal asmenis';
      case 'per_area': return 'Pagal plotą';
      case 'per_consumption': return 'Pagal suvartojimą';
      case 'fixed_split': return 'Fiksuotas';
      default: return 'Pagal butų sk.';
    }
  };

  const getMeterTypeLabel = (meter: MeterData): string => {
    if (meter.unit === 'Kitas' || meter.distribution_method === 'fixed_split') {
      return 'Fiksuota įmoka';
    }
    if (meter.type === 'individual' || meter.distribution_method === 'per_consumption') {
      return 'Individualus skaitliukas';
    }
    return 'Bendras skaitliukas';
  };

  const totalCost = meters.reduce((sum, meter) => sum + calculateMeterCost(meter), 0);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="bg-white border border-neutral-200 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-neutral-900">Visi skaitliukai</h3>
          <div className="text-right">
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalCost)}
            </div>
            <div className="text-sm text-neutral-500">
              {meters.length} skaitliukų
            </div>
          </div>
        </div>
      </div>

      {/* Meters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {meters.map((meter) => {
          const cost = calculateMeterCost(meter);
          const priceDisplay = getMeterPriceDisplay(meter);
          const distributionLabel = getDistributionLabel(meter.distribution_method);
          const meterTypeLabel = getMeterTypeLabel(meter);

          return (
            <div key={meter.id} className="bg-white border border-neutral-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow">
              {/* Header */}
              <div className="h-12 bg-[#E8F5F4] border-b border-[#2F8481]/20">
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                      <span>{meterTypeLabel}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-blue-600 text-sm">⚡</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-neutral-900">{meter.name}</h4>
                    <p className="text-xs text-neutral-500">{meter.unit}</p>
                  </div>
                </div>

                {/* Meter Details */}
                <div className="space-y-2 mb-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-neutral-600">Kaina:</span>
                    <span className="text-sm font-medium text-neutral-900">
                      {priceDisplay}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-neutral-600">Pasiskirstymas:</span>
                    <span className="text-sm font-medium text-neutral-900">
                      {distributionLabel}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-neutral-600">Kaina už butą:</span>
                    <span className="text-sm font-bold text-green-600">
                      {formatCurrency(cost)}
                    </span>
                  </div>
                  {meter.requires_photo && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-neutral-600">Nuotrauka:</span>
                      <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-full">
                        Privaloma
                      </span>
                    </div>
                  )}
                </div>

                {/* Description */}
                {meter.description && (
                  <div className="mb-3 p-2 bg-blue-50 rounded-lg">
                    <p className="text-xs text-blue-700">{meter.description}</p>
                  </div>
                )}

                {/* Current Reading (if available) */}
                {(meter.current_reading || meter.value) && (
                  <div className="mb-3 p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-xs text-green-700 mb-1">Dabartinis rodmuo:</div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-green-900">
                        {meter.current_reading || meter.value}
                      </span>
                      <span className="text-sm text-green-600">{meter.unit}</span>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  <button className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg text-xs font-medium transition-colors">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    Išsaugoti rodmenį
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
