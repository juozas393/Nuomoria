import React, { useState, useEffect, useCallback } from 'react';
import { MeterPriceManager, MeterPriceData } from './MeterPriceManager';
import { MeterManagementCard } from './MeterManagementCard';
import {
  getApartmentMeters,
  getApartmentCount,
  createMeterReading,
  calculateMeterCost
} from '../../lib/meterPriceApi';
import { supabase } from '../../lib/supabase';

interface FallbackMeter {
  id: string;
  name: string;
  unit?: string;
  mode?: 'Bendri' | 'Individualūs';
  distribution_method?: MeterPriceData['distribution_method'] | string;
  price_per_unit?: number;
  fixed_price?: number;
  policy?: MeterPriceData['policy'];
  needsPhoto?: boolean;
  needsReading?: boolean;
  requires_photo?: boolean;
  requires_reading?: boolean;
  currentReading?: number | null;
  previousReading?: number | null;
  lastUpdatedAt?: string | null;
  tenantSubmittedValue?: number | null;
  tenantSubmittedAt?: string | null;
  isApproved?: boolean;
}

interface ApartmentMeterManagerProps {
  propertyId: string;
  addressId: string;
  fallbackMeters?: FallbackMeter[];
  onMetersUpdate?: () => void;
}

export const ApartmentMeterManager: React.FC<ApartmentMeterManagerProps> = ({
  propertyId,
  addressId,
  fallbackMeters,
  onMetersUpdate
}) => {
  const [meters, setMeters] = useState<(MeterPriceData & { costPerApartment?: number })[]>([]);
  const [apartmentCount, setApartmentCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const convertFallbackMeters = useCallback(
    (items: FallbackMeter[], count: number): (MeterPriceData & { costPerApartment?: number })[] => {
      return items.map((meter) => {
        const type = meter.mode === 'Bendri' ? 'communal' : 'individual';
        const unit =
          meter.unit === 'm³' ? 'm3' : meter.unit === 'KWh' ? 'kWh' : (meter.unit as MeterPriceData['unit']) ?? 'Kitas';
        const rawDistribution = meter.distribution_method;
        const distribution: MeterPriceData['distribution_method'] =
          rawDistribution === 'per_area' ||
          rawDistribution === 'per_apartment' ||
          rawDistribution === 'per_consumption' ||
          rawDistribution === 'fixed_split'
            ? rawDistribution
            : type === 'communal'
              ? 'per_apartment'
              : 'per_consumption';
        const policy =
          meter.policy ??
          (type === 'communal'
            ? { scope: 'building', collectionMode: 'tenant_photo' }
            : { scope: 'apartment', collectionMode: 'tenant_photo' });
        const latestConsumption = Math.max(0, (meter.currentReading ?? 0) - (meter.previousReading ?? 0));
        const tempMeter: MeterPriceData = {
          id: meter.id,
          name: meter.name,
          type,
          unit,
          distribution_method: distribution,
          price_per_unit: meter.price_per_unit ?? 0,
          fixed_price: meter.fixed_price ?? 0,
          is_custom: true,
          address_meter_id: null,
          property_id: propertyId,
          policy,
          requires_photo: meter.requires_photo ?? meter.needsPhoto ?? false,
          requires_reading: meter.requires_reading ?? meter.needsReading ?? true,
          last_reading: meter.currentReading ?? null,
          previous_reading: meter.previousReading ?? null,
          last_reading_date: meter.lastUpdatedAt ?? null,
          last_total_cost: null,
          tenant_submitted_value: meter.tenantSubmittedValue ?? null,
          tenant_submitted_at: meter.tenantSubmittedAt ?? null,
          tenant_submission_status: meter.isApproved == null ? null : meter.isApproved ? 'approved' : 'pending'
        };
        const costPerApartment = calculateMeterCost(tempMeter, count, latestConsumption);
        return {
          ...tempMeter,
          costPerApartment
        };
      });
    },
    [propertyId]
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let meterList = await getApartmentMeters(propertyId).catch((err) => {
        console.error('Error fetching apartment meters:', err);
        return [] as MeterPriceData[];
      });

      const count = await getApartmentCount(addressId).catch((err) => {
        console.error('Error fetching apartment count:', err);
        return 1;
      });

      if (meterList.length === 0 && addressId) {
        const { error: syncError } = await supabase.rpc('create_apartment_meters_from_address', {
          p_property_id: propertyId,
          p_address_id: addressId
        });

        if (syncError) {
          console.error('Failed to create apartment meters via RPC:', syncError);
        } else {
          meterList = await getApartmentMeters(propertyId).catch((err) => {
            console.error('Error fetching apartment meters after RPC:', err);
            return [] as MeterPriceData[];
          });
        }
      }

      console.debug('🔄 Loaded apartment meters', {
        propertyId,
        addressId,
        meterListCount: meterList.length,
        count
      });

      let resolvedMeters = meterList;
      if (resolvedMeters.length === 0 && fallbackMeters && fallbackMeters.length > 0) {
        resolvedMeters = convertFallbackMeters(fallbackMeters, count);
      }

      setMeters(
        resolvedMeters.map((meter) => {
          const latestConsumption = Math.max(0, (meter.last_reading ?? 0) - (meter.previous_reading ?? 0));
          const costPerApartment = calculateMeterCost(meter, count, latestConsumption);
          const totalCostEstimate = Number.isFinite(costPerApartment) ? costPerApartment * count : undefined;
          return {
            ...meter,
            last_reading: meter.last_reading ?? null,
            previous_reading: meter.previous_reading ?? null,
            last_reading_date: meter.last_reading_date ?? null,
            last_total_cost: meter.last_total_cost ?? (totalCostEstimate ?? null),
            tenant_submitted_value: meter.tenant_submitted_value ?? null,
            tenant_submission_status: meter.tenant_submission_status ?? null,
            tenant_submitted_at: meter.tenant_submitted_at ?? null,
            costPerApartment
          };
        })
      );
      setApartmentCount(count);
    } catch (err) {
      console.error('Error loading meter data:', err);
      setError('Klaida kraunant skaitliukų duomenis');
    } finally {
      setLoading(false);
    }
  }, [propertyId, addressId, fallbackMeters, convertFallbackMeters]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleMeterUpdate = useCallback(
    (meterId: string, updates: Partial<MeterPriceData>) => {
      setMeters((prev) =>
        prev.map((meter) =>
          meter.id === meterId
            ? {
                ...meter,
                ...updates
              }
            : meter
        )
      );
      void loadData();
      onMetersUpdate?.();
    },
    [loadData, onMetersUpdate]
  );

  const handleGlobalMeterUpdate = useCallback(
    (addressMeterId: string, updates: Partial<MeterPriceData>) => {
      setMeters((prev) =>
        prev.map((meter) =>
          meter.address_meter_id === addressMeterId && !meter.is_custom
            ? {
                ...meter,
                ...updates
              }
            : meter
        )
      );
      void loadData();
      onMetersUpdate?.();
    },
    [loadData, onMetersUpdate]
  );

  const handleSaveReading = useCallback(
    async (
      meterId: string,
      reading: { current: number; previous: number }
    ) => {
      const meter = meters.find((m) => m.id === meterId);
      if (!meter) return;

      const scope = meter.policy?.scope ?? (meter.type === 'communal' ? 'building' : meter.distribution_method === 'fixed_split' ? 'none' : 'apartment');
      if (scope === 'none') {
        console.warn('Attempted to save reading for fixed meter:', meterId);
        return;
      }

      await createMeterReading({
        propertyId,
        meterId,
        scope,
        type: meter.type,
        currentReading: reading.current,
        previousReading: reading.previous,
        pricePerUnit: meter.price_per_unit ?? 0,
        notes: meter.type === 'communal' ? 'Nuomotojo įvestas bendras rodmuo' : 'Nuomotojo įvestas individualus rodmuo'
      });

      await loadData();
      onMetersUpdate?.();
    },
    [meters, propertyId, loadData, onMetersUpdate]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          <p className="mt-2 text-sm text-gray-600">Kraunama...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Klaida</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
            <div className="mt-4">
              <button
                onClick={() => void loadData()}
                className="bg-red-100 text-red-800 px-3 py-2 rounded-md text-sm font-medium hover:bg-red-200"
              >
                Bandyti dar kartą
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (meters.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">Nėra skaitliukų</h3>
        <p className="mt-1 text-sm text-gray-500">Šiam butui dar nepridėta jokių skaitliukų.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Skaitliukų valdymas</h2>
          <p className="mt-1 text-sm text-gray-600">
            Valdykite skaitliukų kainas, pasiskirstymo metodus ir registruokite naujus rodmenis
          </p>
        </div>
        <div className="flex items-center gap-4 rounded-xl border border-black/10 bg-black/5 px-4 py-2 text-sm text-black/70">
          <span className="font-semibold text-black">Butų skaičius:</span>
          <span>{apartmentCount}</span>
        </div>
      </div>

      <section className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Rodmenų registravimas</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {meters.map((meter) => (
            <MeterManagementCard
              key={meter.id}
              meter={meter}
              onUpdateReading={async (id, reading) => {
                await handleSaveReading(id, reading);
              }}
              onOpenApartmentReadings={() => {
                // Placeholder for future modal integration
                console.info('Open detailed readings for meter', meter.id);
              }}
              onReviewTenantSubmission={async () => {
                console.info('Review tenant submission feature is pending implementation');
              }}
            />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Kainodaros nustatymai</h3>
        <MeterPriceManager
          meters={meters}
          apartmentCount={apartmentCount}
          onMeterUpdate={handleMeterUpdate}
          onGlobalMeterUpdate={handleGlobalMeterUpdate}
        />
      </section>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3 text-sm text-blue-700">
            <p className="font-medium text-blue-800">Kaip veikia redagavimas</p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>
                <strong>Individualūs skaitliukai:</strong> kainos keitimas taikomas tik šiam butui
              </li>
              <li>
                <strong>Bendri skaitliukai:</strong> kainos keitimas pritaikomas visiems adresui priskirtiems butams
              </li>
              <li>
                <strong>Fiksuoti mokesčiai:</strong> rodmenų pateikti nereikia – svarbi tik mėnesio suma
              </li>
              <li>
                <strong>Kintami mokesčiai:</strong> kainai reikalingi aktualūs rodmenys, kad būtų apskaičiuotos išlaidos
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
