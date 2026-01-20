import React, { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock";
import { useFocusTrap } from "../../utils/nuomotojas2Utils";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";

import { Tenant } from "../../types/tenant";
import { type Meter } from "../komunaliniai";
import { X, User, Home, FileText, Droplets, Phone, Calendar, Euro, MapPin, Camera, Clock, MessageSquare, Save } from 'lucide-react';
import { getMeterTypeLabel } from '../../constants/meterDistribution';
import { PremiumOverviewTab } from './PremiumOverviewTab';
import { getApartmentMeters } from '../../lib/meterPriceApi';
import InviteTenantModal from './InviteTenantModal';

// Type definitions for missing interfaces
interface PropertyInfo {
  id: string;
  address?: string;
  rooms?: number;
  area?: number;
  floor?: number;
  type?: string;
  status?: string;
}

interface MoveOut {
  notice?: string;
  planned?: string;
  status?: string;
}

interface Documents {
  id: string;
  name: string;
  type: string;
  url?: string;
  uploadedAt?: string;
}

interface MeterItem {
  id: string;
  name: string;
  type: string;
  serialNumber?: string;
  lastReading?: number;
  lastReadingDate?: string;
  requires_photo?: boolean;
}

// Helper functions
const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString('lt-LT', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '—';

// Translation dictionaries for Lithuanian UI
const translatePropertyType = (type?: string): string => {
  const dict: Record<string, string> = {
    'apartment': 'Butas',
    'house': 'Namas',
    'studio': 'Studija',
    'room': 'Kambarys',
    'commercial': 'Komercinis',
    'flat': 'Butas',
    'office': 'Biuras'
  };
  return dict[type?.toLowerCase() || ''] || type || '—';
};

const translateStatus = (status?: string): string => {
  const dict: Record<string, string> = {
    'vacant': 'Laisvas',
    'occupied': 'Gyvenamas',
    'reserved': 'Rezervuotas',
    'notice': 'Išsikraustymas suplanuotas',
    'notice_given': 'Išsikraustymas suplanuotas',
    'moved_out_pending': 'Laukia uždarymo',
    'active': 'Aktyvus',
    'expired': 'Baigėsi',
    'pending': 'Laukia',
    'none': ''
  };
  return dict[status?.toLowerCase() || ''] || status || '—';
};

const formatValue = (value: any, unit?: string): string => {
  if (value === null || value === undefined || value === '' || value === 'none') return '—';
  if (typeof value === 'number' && value === 0) return '—';
  if (typeof value === 'string' && value.toLowerCase() === 'none') return '—';
  return unit ? `${value} ${unit}` : String(value);
};

const hasMeaningfulValue = (value: any): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'number' && value === 0) return false;
  if (typeof value === 'string' && (!value || value.toLowerCase() === 'none')) return false;
  return true;
};

// Apartment occupancy state machine
type OccupancyState = 'VACANT' | 'RESERVED' | 'OCCUPIED' | 'NOTICE_GIVEN' | 'MOVED_OUT_PENDING';

const getOccupancyState = (tenant: any, moveOut: any): OccupancyState => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // No tenant or no active lease
  if (!tenant?.name || tenant.name === 'Laisvas' || tenant.status === 'vacant') {
    return 'VACANT';
  }

  // Check lease dates
  const leaseStart = tenant.contractStart ? new Date(tenant.contractStart) : null;
  const leaseEnd = tenant.contractEnd ? new Date(tenant.contractEnd) : null;
  const moveOutDate = moveOut?.planned ? new Date(moveOut.planned) : null;

  // Reserved: lease exists but hasn't started
  if (leaseStart && leaseStart > today) {
    return 'RESERVED';
  }

  // Move out pending: moveout date passed but not closed
  if (moveOutDate && moveOutDate < today && hasMeaningfulValue(moveOut?.status)) {
    return 'MOVED_OUT_PENDING';
  }

  // Notice given: moveout scheduled in future
  if (moveOutDate && moveOutDate >= today) {
    return 'NOTICE_GIVEN';
  }

  // Lease expired
  if (leaseEnd && leaseEnd < today) {
    return 'MOVED_OUT_PENDING';
  }

  // Active lease
  return 'OCCUPIED';
};

const getOccupancyLabel = (state: OccupancyState): string => {
  const labels: Record<OccupancyState, string> = {
    'VACANT': 'Laisvas',
    'RESERVED': 'Rezervuotas',
    'OCCUPIED': 'Gyvenamas',
    'NOTICE_GIVEN': 'Išsikraustymas',
    'MOVED_OUT_PENDING': 'Laukia uždarymo'
  };
  return labels[state];
};

const getOccupancyColor = (state: OccupancyState): string => {
  const colors: Record<OccupancyState, string> = {
    'VACANT': 'bg-neutral-100 text-neutral-700',
    'RESERVED': 'bg-blue-100 text-blue-700',
    'OCCUPIED': 'bg-emerald-100 text-emerald-700',
    'NOTICE_GIVEN': 'bg-amber-100 text-amber-700',
    'MOVED_OUT_PENDING': 'bg-rose-100 text-rose-700'
  };
  return colors[state];
};
const normalizeHeating = (meter: any) => {
  // Special case for heating: if distribution is per_area or per_apartment, convert to shared
  if (meter.name?.toLowerCase().includes('šildymas') || meter.name?.toLowerCase().includes('heating')) {
    if (meter.distribution_method === 'per_area' || meter.distribution_method === 'per_apartment') {
      return { ...meter, mode: 'Bendri', isCommunalMeter: true };
    }
  }
  return meter;
};

const shouldShowReading = (meter: Meter) => {
  // Fixed meters never need readings
  if (meter.distribution_method === 'fixed_split' || meter.isFixedMeter ||
    meter.name?.includes('valymas') || meter.name?.includes('internetas') ||
    (meter.fixed_price && meter.fixed_price > 0)) {
    return false;
  }

  // Individual meters always need readings
  if (meter.mode === 'Individualūs') {
    return true;
  }

  // Communal meters need readings if not fixed
  if (meter.mode === 'Bendri' && !meter.isFixedMeter) {
    return true;
  }

  return false;
};

const shouldShowPricePerUnit = (meter: Meter) => {
  // Show price per unit for consumption-based meters
  return meter.price_per_unit && meter.price_per_unit > 0 &&
    meter.distribution_method !== 'fixed_split';
};

const shouldShowFixedAmount = (meter: Meter) => {
  // Show fixed amount for fixed meters
  return meter.fixed_price && meter.fixed_price > 0 ||
    meter.distribution_method === 'fixed_split';
};

const getMeterTypeLabelLocal = (meter: Meter) => {
  // Fixed meters
  if (shouldShowFixedAmount(meter)) {
    return 'Fiksuota įmoka';
  }

  // Individual meters - check by name
  if (meter.name?.includes('individuali') || meter.name?.includes('Individuali') ||
    meter.mode === 'Individualūs') {
    return 'Individualus skaitliukas';
  }

  // Communal meters
  if (meter.mode === 'Bendri') {
    return 'Bendras skaitliukas';
  }

  return 'Skaitliukas';
};

const getDistributionLabel = (method: string) => {
  switch (method) {
    case 'per_apartment':
      return 'Pagal butus';
    case 'per_area':
      return 'Pagal plotą';
    case 'per_person':
      return 'Pagal žmones';
    case 'per_consumption':
      return 'Pagal suvartojimą';
    case 'fixed_split':
      return 'Fiksuotas pasiskirstymas';
    default:
      return method || 'Pagal butus';
  }
};

// Helper functions for meter calculations
const calculateMeterCost = (meter: any, apartmentCount: number = 1): number => {
  if (!meter) return 0;

  // Fixed meters - use fixed_price
  if (meter.unit === 'Kitas' || meter.distribution_method === 'fixed_split') {
    return (meter.fixed_price || 0) / apartmentCount;
  }

  // Meters with readings - calculate consumption
  const currentReading = meter.current_reading || meter.value || meter.tenantSubmittedValue || 0;
  const previousReading = meter.previous_reading || meter.previousReading || 0;
  const consumption = Math.max(0, currentReading - previousReading);

  // Individual meters - pay for own consumption
  if (meter.type === 'individual' || meter.distribution_method === 'per_consumption' || meter.mode === 'Individualūs') {
    return consumption * (meter.price_per_unit || 0);
  }

  // Communal meters - divide total cost among apartments
  // For communal meters, the reading represents the total building consumption
  const totalCost = consumption * (meter.price_per_unit || 0);
  return totalCost / apartmentCount;
};

const getMeterPriceDisplay = (meter: any): string => {
  if (!meter) return 'Nenustatyta';

  if (meter.unit === 'Kitas' || meter.distribution_method === 'fixed_split') {
    return `${meter.fixed_price || 0}€/mėn.`;
  }

  return `${meter.price_per_unit || 0}€/${meter.unit}`;
};

// New logic functions for determining UI elements
const getMeterScope = (meter: any): 'none' | 'building' | 'apartment' => {
  if (meter.unit === 'Kitas' || meter.distribution_method === 'fixed_split') {
    return 'none'; // Fixed meters
  }

  if (meter.type === 'individual' || meter.distribution_method === 'per_consumption') {
    return 'apartment'; // Individual meters
  }

  return 'building'; // Communal meters
};

const getCollectionMode = (meter: any): 'landlord_only' | 'tenant_photo' => {
  // Check if tenant photo submission is enabled
  if (meter.tenantPhotoEnabled || meter.tenantReadingEnabled) {
    return 'tenant_photo';
  }
  // Default to landlord_only
  return 'landlord_only';
};

const shouldShowReadingInputForLandlord = (meter: any): boolean => {
  const scope = getMeterScope(meter);
  const collectionMode = getCollectionMode(meter);
  return scope !== 'none' && collectionMode === 'landlord_only';
};

const shouldShowReviewForLandlord = (meter: any): boolean => {
  const scope = getMeterScope(meter);
  // Only show review if tenant photo submission is explicitly enabled
  return scope !== 'none' && meter.tenantPhotoEnabled === true;
};

const shouldShowPhotoRequirement = (meter: any): boolean => {
  // Only show photo requirement if tenant photo submission is explicitly enabled
  return meter.tenantPhotoEnabled === true;
};

const getMeterStatus = (meter: any): string => {
  const scope = getMeterScope(meter);

  if (scope === 'none') {
    return 'Fiksuota įmoka';
  }

  // Check if tenant photo submission is enabled
  if (meter.tenantPhotoEnabled === true) {
    if (meter.tenantSubmittedValue) {
      if (meter.isApproved) {
        return 'Patvirtinta';
      } else {
        return 'Laukia patvirtinimo';
      }
    } else {
      return 'Nepateiktas rodmuo';
    }
  }

  // Landlord only mode
  if (meter.value || meter.currentReading) {
    return 'Pateikta';
  } else {
    return 'Nepateiktas rodmuo';
  }
};

const getConsumptionDisplay = (meter: any): string => {
  const scope = getMeterScope(meter);

  if (scope === 'none') {
    return 'Fiksuota įmoka';
  }

  const currentValue = meter.tenantSubmittedValue || meter.value || meter.currentReading;
  const previousValue = meter.previousReading;

  if (!currentValue) {
    return 'Nėra rodmenų';
  }

  if (previousValue && currentValue > previousValue) {
    const difference = currentValue - previousValue;
    return `${currentValue} ${meter.unit} (Δ nuo praėjusio: +${difference})`;
  }

  return `${currentValue} ${meter.unit}`;
};

const getCostDisplay = (meter: any, addressInfo?: any): string => {
  const scope = getMeterScope(meter);

  // Get apartment count for communal meters
  let apartmentCount = 1;
  if (scope === 'building' || meter.mode === 'Bendri') {
    apartmentCount = addressInfo?.total_apartments || 1;
  }

  const cost = calculateMeterCost(meter, apartmentCount);

  if (scope === 'none') {
    return new Intl.NumberFormat('lt-LT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(cost);
  }

  const hasReadings = meter.tenantSubmittedValue || meter.value || meter.currentReading;

  if (!hasReadings) {
    return 'Bus paskaičiuota pateikus rodmenis';
  }

  return new Intl.NumberFormat('lt-LT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2
  }).format(cost);
};

// --- Modern Overview Tab ---
const OverviewTab: React.FC<{
  tenant: Tenant;
  property: PropertyInfo;
  moveOut: MoveOut;
}> = ({ tenant, property, moveOut }) => {
  return (
    <div className="space-y-6">
      {/* Tenant Info */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-[#2F8481]/10 rounded-lg flex items-center justify-center">
            <User className="w-5 h-5 text-[#2F8481]" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-neutral-900">{tenant.name}</h3>
            <p className="text-sm text-neutral-500">{tenant.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-neutral-400" />
              <span className="text-sm text-neutral-600">Telefonas:</span>
              <span className="text-sm font-medium text-neutral-900">{tenant.phone}</span>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-neutral-400" />
              <span className="text-sm text-neutral-600">Įsikėlimo data:</span>
              <span className="text-sm font-medium text-neutral-900">{formatDate(tenant.contractStart)}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-neutral-600">Būsena:</span>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${(tenant.status === 'active' || String(tenant.status) === 'occupied') ? 'bg-emerald-50 text-emerald-700' :
                tenant.status === 'expired' ? 'bg-rose-50 text-rose-700' :
                  tenant.status === 'vacant' ? 'bg-neutral-100 text-neutral-600' :
                    'bg-amber-50 text-amber-700'
                }`}>
                {translateStatus(tenant.status)}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Euro className="w-4 h-4 text-neutral-400" />
              <span className="text-sm text-neutral-600">Mėnesinis mokestis:</span>
              <span className="text-sm font-medium text-neutral-900">€{tenant.monthlyRent}</span>
            </div>
            <div className="flex items-center gap-3">
              <Euro className="w-4 h-4 text-neutral-400" />
              <span className="text-sm text-neutral-600">Depozitas:</span>
              <span className="text-sm font-medium text-neutral-900">€{tenant.deposit}</span>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-neutral-400" />
              <span className="text-sm text-neutral-600">Sutarties pabaiga:</span>
              <span className="text-sm font-medium text-neutral-900">{formatDate(tenant.contractEnd)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Property Info */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-[#2F8481]/10 rounded-lg flex items-center justify-center">
            <Home className="w-5 h-5 text-[#2F8481]" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-neutral-900">Būstas</h3>
            <p className="text-sm text-neutral-500">{property.address || '—'}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {hasMeaningfulValue(property.rooms) && (
            <div className="text-center">
              <div className="text-2xl font-bold text-[#2F8481]">{property.rooms}</div>
              <div className="text-xs text-neutral-500">Kambariai</div>
            </div>
          )}
          {hasMeaningfulValue(property.area) && (
            <div className="text-center">
              <div className="text-2xl font-bold text-[#2F8481]">{property.area}</div>
              <div className="text-xs text-neutral-500">m²</div>
            </div>
          )}
          {hasMeaningfulValue(property.floor) && (
            <div className="text-center">
              <div className="text-2xl font-bold text-[#2F8481]">{property.floor}</div>
              <div className="text-xs text-neutral-500">Aukštas</div>
            </div>
          )}
          {hasMeaningfulValue(property.type) && (
            <div className="text-center">
              <div className="text-lg font-semibold text-neutral-900">{translatePropertyType(property.type)}</div>
              <div className="text-xs text-neutral-500">Tipas</div>
            </div>
          )}
        </div>
      </div>

      {/* Move Out Info (if applicable) - hide when status is 'none' or empty */}
      {hasMeaningfulValue(moveOut.status) && moveOut.status !== 'none' && (
        <div className="bg-white border border-neutral-200 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-neutral-900">Išsikraustymas</h3>
              <p className="text-sm text-neutral-500">Planuojama išsikraustymo informacija</p>
            </div>
          </div>

          <div className="space-y-2">
            {hasMeaningfulValue(moveOut.notice) && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-neutral-600">Pateikto prašymo data:</span>
                <span className="text-sm font-medium text-neutral-900">{formatDate(moveOut.notice)}</span>
              </div>
            )}
            {hasMeaningfulValue(moveOut.planned) && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-neutral-600">Planuojama data:</span>
                <span className="text-sm font-medium text-neutral-900">{formatDate(moveOut.planned)}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-sm text-neutral-600">Būsena:</span>
              <span className="text-sm font-medium text-neutral-900">{translateStatus(moveOut.status)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Modern Property Tab ---
const PropertyTab: React.FC<{ property: PropertyInfo }> = ({ property }) => {
  return (
    <div className="space-y-6">
      <div className="bg-white border border-neutral-200 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#2F8481]/10 rounded-xl flex items-center justify-center">
              <Home className="w-5 h-5 text-[#2F8481]" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-neutral-900">Būsto informacija</h3>
              <p className="text-sm text-neutral-500">Pagrindiniai būsto duomenys</p>
            </div>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-neutral-200 rounded-lg text-neutral-700 hover:bg-neutral-50 transition-colors text-sm font-medium">
            Redaguoti
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          {/* Address */}
          <div className="flex justify-between items-center py-3 border-b border-neutral-100">
            <span className="text-sm text-neutral-600">Adresas</span>
            <span className="text-sm font-medium text-neutral-900">{property.address || '—'}</span>
          </div>

          {/* Rooms */}
          <div className="flex justify-between items-center py-3 border-b border-neutral-100">
            <span className="text-sm text-neutral-600">Kambarių skaičius</span>
            {hasMeaningfulValue(property.rooms) ? (
              <span className="text-sm font-medium text-neutral-900">{property.rooms}</span>
            ) : (
              <button className="text-sm text-[#2F8481] font-medium hover:underline">Pridėti</button>
            )}
          </div>

          {/* Area */}
          <div className="flex justify-between items-center py-3 border-b border-neutral-100">
            <span className="text-sm text-neutral-600">Bendras plotas</span>
            {hasMeaningfulValue(property.area) ? (
              <span className="text-sm font-medium text-neutral-900">{property.area} m²</span>
            ) : (
              <button className="text-sm text-[#2F8481] font-medium hover:underline">Pridėti</button>
            )}
          </div>

          {/* Floor */}
          <div className="flex justify-between items-center py-3 border-b border-neutral-100">
            <span className="text-sm text-neutral-600">Aukštas</span>
            {hasMeaningfulValue(property.floor) ? (
              <span className="text-sm font-medium text-neutral-900">{property.floor}</span>
            ) : (
              <button className="text-sm text-[#2F8481] font-medium hover:underline">Pridėti</button>
            )}
          </div>

          {/* Type */}
          <div className="flex justify-between items-center py-3 border-b border-neutral-100">
            <span className="text-sm text-neutral-600">Būsto tipas</span>
            <span className="text-sm font-medium text-neutral-900">{translatePropertyType(property.type)}</span>
          </div>

          {/* Status */}
          <div className="flex justify-between items-center py-3 border-b border-neutral-100">
            <span className="text-sm text-neutral-600">Būsena</span>
            <span className="text-sm font-medium text-neutral-900">{translateStatus(property.status)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Modern Meters Tab ---
const MetersTab: React.FC<{
  meters: MeterItem[] | any[],
  tenant: any;
  addressInfo?: any;
  onSaveReading: (meterId: string, reading: number) => void;
  onApproveReading: (meterId: string) => void;
  onEditReading: (meterId: string, value: number) => void;
  onSendWarning: (meterId: string) => void;
  onRequestPhoto: (meterId: string) => void;
  onViewHistory: (meterId: string) => void;
  onRequestMissing: (ids: string[]) => void;
}> = ({
  meters,
  tenant,
  addressInfo,
  onSaveReading,
  onApproveReading,
  onEditReading,
  onSendWarning,
  onRequestPhoto,
  onViewHistory,
  onRequestMissing
}) => {
    console.log('🔍 MetersTab received meters:', meters);
    console.log('🔍 Meter pricing data:', meters.map((m: any) => ({
      name: m.name,
      price_per_unit: m.price_per_unit,
      fixed_price: m.fixed_price,
      unit: m.unit
    })));

    // Konvertuojame duomenis į naują formatą - naudojame meters prop tiesiogiai
    const meterData: Meter[] = useMemo(() =>
      meters.map((meter: any) => {
        console.log('🔍 Processing meter:', meter.name, 'requires_photo:', meter.requires_photo, 'mode:', meter.mode);

        // Normalize heating meters
        const normalizedMeter = normalizeHeating(meter);

        // Determine correct mode based on logic
        let correctMode = normalizedMeter.mode;
        if (!correctMode) {
          if (normalizedMeter.distribution_method === 'fixed_split' || normalizedMeter.isFixedMeter) {
            correctMode = 'Bendri'; // Fixed meters are communal
          } else if (normalizedMeter.distribution_method === 'per_consumption') {
            correctMode = 'Individualūs'; // Consumption-based are individual
          } else if (normalizedMeter.distribution_method === 'per_apartment' || normalizedMeter.distribution_method === 'per_area') {
            correctMode = 'Bendri'; // Per apartment/area are communal
          } else {
            correctMode = 'Individualūs'; // Default to individual
          }
        }

        return {
          id: normalizedMeter.id,
          kind: normalizedMeter.type as any,
          name: normalizedMeter.name,
          mode: correctMode,
          unit: normalizedMeter.unit || 'm³',
          value: normalizedMeter.tenantSubmittedValue || normalizedMeter.currentReading || null,
          lastUpdatedAt: normalizedMeter.lastReadingDate,
          needsPhoto: !!normalizedMeter.requires_photo,
          needsReading: shouldShowReading({ ...normalizedMeter, mode: correctMode } as Meter),
          status: normalizedMeter.status === 'read' ? 'ok' as const : 'waiting' as const,
          photoPresent: !!normalizedMeter.photoUrl,
          photoUrl: normalizedMeter.photoUrl || null,
          // Use actual meter data - prioritize tenantSubmittedValue over currentReading
          tenantSubmittedValue: normalizedMeter.tenantSubmittedValue || normalizedMeter.currentReading || null,
          tenantSubmittedAt: normalizedMeter.lastReadingDate,
          isApproved: normalizedMeter.status === 'read',
          hasWarning: false,
          // Fixed/Communal meter properties
          isFixedMeter: normalizedMeter.distribution_method === 'fixed_split' || normalizedMeter.isFixedMeter || false,
          isCommunalMeter: correctMode === 'Bendri',
          showPhotoRequirement: !!normalizedMeter.requires_photo,
          costPerApartment: normalizedMeter.costPerApartment || 0,
          // Additional pricing information
          price_per_unit: normalizedMeter.price_per_unit || normalizedMeter.pricePerUnit || 0,
          fixed_price: normalizedMeter.fixed_price || 0,
          distribution_method: normalizedMeter.distribution_method || 'per_apartment',
          description: normalizedMeter.description || '',
          // Add missing fields for ExtendedMeter
          type: normalizedMeter.type || 'electricity',
          previousReading: normalizedMeter.previousReading || 0,
          currentReading: normalizedMeter.currentReading || null,
          tenantPhotoEnabled: normalizedMeter.tenantPhotoEnabled || false
        };
      }), [meters]
    );

    // All meters in one list, sorted by type and name - naudojame meterData iš useMemo
    const sortedMeters = useMemo(() => {
      return meterData.sort((a, b) => {
        // First sort by meter type (Individualūs first, then Bendri)
        if (a.mode === 'Individualūs' && b.mode !== 'Individualūs') return -1;
        if (a.mode !== 'Individualūs' && b.mode === 'Individualūs') return 1;

        // Then sort alphabetically by name
        return a.name.localeCompare(b.name);
      });
    }, [meterData]);

    // Calculate total costs - naudojame meterData iš useMemo
    const totalCosts = useMemo(() => {
      const total = meterData.reduce((sum, m) => {
        if (m.tenantSubmittedValue && m.price_per_unit) {
          return sum + (m.tenantSubmittedValue * m.price_per_unit);
        }
        return sum + (m.costPerApartment || 0);
      }, 0);

      return { total };
    }, [meterData]);

    const needsAttention = meterData.filter(m => m.needsPhoto || m.needsReading).length;
    const needsReading = meterData.filter(m => m.needsReading).length;
    const needsPhoto = meterData.filter(m => m.needsPhoto).length;
    const pendingApproval = meterData.filter(m => m.tenantSubmittedValue && !m.isApproved).length;

    // Helper function to format currency
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('lt-LT', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2
      }).format(amount);
    };

    // Helper function to get distribution method label
    const getDistributionLabel = (method: string) => {
      switch (method) {
        case 'per_apartment': return 'Pagal butus';
        case 'per_area': return 'Pagal plotą';
        case 'per_person': return 'Pagal asmenis';
        case 'fixed_split': return 'Fiksuotas';
        case 'per_consumption': return 'Pagal suvartojimą';
        default: return method;
      }
    };



    // EMPTY STATE: Show when no meters exist
    if (meterData.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 px-8">
          <div className="w-20 h-20 bg-neutral-100 rounded-2xl flex items-center justify-center mb-6">
            <Droplets className="w-10 h-10 text-neutral-400" />
          </div>
          <h3 className="text-xl font-semibold text-neutral-900 mb-2">Skaitliukų nėra</h3>
          <p className="text-neutral-500 text-center max-w-md mb-6">
            Šiam butui dar nepriskirti komunaliniai skaitliukai. Pridėkite skaitliukus, kad galėtumėte sekti suvartojimą ir skaičiuoti mokėjimus.
          </p>
          <button className="flex items-center gap-2 px-6 py-3 bg-[#2F8481] text-white rounded-xl hover:bg-[#267270] transition-colors font-medium">
            <Droplets className="w-5 h-5" />
            Priskirti skaitliukus
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Header with Stats */}
        <div className="bg-white border border-neutral-200 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-[#2F8481]/10 rounded-lg flex items-center justify-center">
              <Droplets className="w-5 h-5 text-[#2F8481]" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-neutral-900">Komunaliniai skaitliukai</h3>
              <p className="text-sm text-neutral-500">
                {meterData.length} skaitliukų, {needsAttention} reikalauja dėmesio
              </p>
            </div>
            {needsAttention > 0 && (
              <button
                onClick={() => onRequestMissing(meterData.filter(m => m.needsPhoto || m.needsReading).map(m => m.id))}
                className="bg-amber-500 hover:bg-amber-600 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
              >
                Paprašyti trūkstamų
              </button>
            )}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-5 gap-4">
            <div className="text-center p-3 bg-neutral-50 rounded-lg">
              <div className="text-2xl font-bold text-[#2F8481]">{meterData.length}</div>
              <div className="text-xs text-neutral-500">Iš viso</div>
            </div>
            <div className="text-center p-3 bg-amber-50 rounded-lg">
              <div className="text-2xl font-bold text-amber-600">{needsReading}</div>
              <div className="text-xs text-neutral-500">Reikia rodmens</div>
            </div>
            <div className="text-center p-3 bg-rose-50 rounded-lg">
              <div className="text-2xl font-bold text-rose-600">{needsPhoto}</div>
              <div className="text-xs text-neutral-500">Reikia foto</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{pendingApproval}</div>
              <div className="text-xs text-neutral-500">Laukia patvirtinimo</div>
            </div>
            <div className="text-center p-3 bg-emerald-50 rounded-lg">
              <div className="text-2xl font-bold text-emerald-600">{meterData.length - needsAttention}</div>
              <div className="text-xs text-neutral-500">Tvarkingi</div>
            </div>
          </div>
        </div>

        {/* Cost Summary */}
        <div className="bg-white border border-neutral-200 rounded-xl p-5">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">Bendros išlaidos</h3>
          <div className="text-center p-4 bg-[#2F8481]/10 rounded-lg">
            <div className="text-3xl font-bold text-[#2F8481]">{formatCurrency(totalCosts.total)}</div>
            <div className="text-sm text-[#2F8481]">Bendros išlaidos</div>
          </div>
        </div>

        {/* All Meters Section */}
        <div className="bg-white border border-neutral-200 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-[#2F8481]/10 rounded-lg flex items-center justify-center">
              <Droplets className="w-4 h-4 text-[#2F8481]" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-neutral-900">Visi skaitliukai</h3>
              <p className="text-sm text-neutral-500">
                {sortedMeters.length} skaitliukų • {formatCurrency(totalCosts.total)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {sortedMeters.map((meter) => {
              // Use appropriate card based on meter type
              if (meter.mode === 'Individualūs') {
                return (
                  <MeterCard
                    key={meter.id}
                    meter={meter}
                    addressInfo={addressInfo}
                    onSaveReading={onSaveReading}
                    onApproveReading={onApproveReading}
                    onEditReading={onEditReading}
                    onSendWarning={onSendWarning}
                    onRequestPhoto={onRequestPhoto}
                    onViewHistory={onViewHistory}
                  />
                );
              } else {
                return (
                  <CommunalMeterCard
                    key={meter.id}
                    meter={meter}
                    addressInfo={addressInfo}
                    onSaveReading={onSaveReading}
                    onApproveReading={onApproveReading}
                    onEditReading={onEditReading}
                    onSendWarning={onSendWarning}
                    onRequestPhoto={onRequestPhoto}
                    onViewHistory={onViewHistory}
                  />
                );
              }
            })}
          </div>
        </div>

        {/* No Meters Message */}
        {sortedMeters.length === 0 && (
          <div className="bg-white border border-neutral-200 rounded-xl p-5">
            <div className="text-center py-12">
              <div className="text-3xl text-neutral-300 mb-3">📊</div>
              <p className="text-neutral-500 text-sm">Skaitliukų nėra</p>
            </div>
          </div>
        )}
      </div>
    );
  };

// Individual Meter Card Component
const MeterCard: React.FC<{
  meter: any;
  addressInfo?: any;
  onSaveReading: (id: string, value: number) => void;
  onApproveReading: (id: string) => void;
  onEditReading: (id: string, value: number) => void;
  onSendWarning: (id: string) => void;
  onRequestPhoto: (id: string) => void;
  onViewHistory: (id: string) => void;
}> = ({ meter, addressInfo, onSaveReading, onApproveReading, onEditReading, onSendWarning, onRequestPhoto, onViewHistory }) => {
  const [currentInputValue, setCurrentInputValue] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Update currentInputValue when meter reading changes
  const meterCurrentReading = meter.tenantSubmittedValue || meter.value || meter.currentReading;
  useEffect(() => {
    if (meterCurrentReading && !currentInputValue) {
      setCurrentInputValue(meterCurrentReading.toString());
    }
  }, [meterCurrentReading, currentInputValue]);
  const scope = getMeterScope(meter);
  const status = getMeterStatus(meter);

  // Get meter icon based on name
  const getMeterIcon = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('elektra') || lowerName.includes('elektros')) return '⚡';
    if (lowerName.includes('vanduo') || lowerName.includes('šaltas') || lowerName.includes('karštas')) return '💧';
    if (lowerName.includes('šildymas') || lowerName.includes('šiluma')) return '🔥';
    if (lowerName.includes('dujos') || lowerName.includes('dujų')) return '🔥';
    return '📊';
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Patvirtinta': return 'bg-emerald-50 text-emerald-700';
      case 'Laukia patvirtinimo': return 'bg-amber-50 text-amber-700';
      case 'Pateikta': return 'bg-blue-50 text-blue-700';
      case 'Atmesta': return 'bg-rose-50 text-rose-700';
      default: return 'bg-neutral-50 text-neutral-700';
    }
  };

  // Get previous reading
  const previousReading = meter.previousReading || 0;
  const consumption = meterCurrentReading ? meterCurrentReading - previousReading : null;

  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-4 hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{getMeterIcon(meter.name)}</span>
          <span className="font-semibold text-neutral-900">{meter.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-1 bg-neutral-100 text-neutral-700 rounded-full font-medium">
            {getMeterTypeLabelLocal(meter)}
          </span>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(status)}`}>
            {status}
          </span>
        </div>
      </div>

      {/* Price Pills */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-xs px-2 py-1 bg-neutral-100 text-neutral-700 rounded-full">
          {getMeterPriceDisplay(meter)}
        </span>
        <span className="text-xs px-2 py-1 bg-neutral-100 text-neutral-700 rounded-full">
          {getDistributionLabel(meter.distribution_method || (scope === 'apartment' ? 'per_consumption' : 'per_apartment'))}
        </span>
      </div>

      {/* Fixed Meter - No Readings */}
      {scope === 'none' && (
        <div className="space-y-3">
          <div className="text-sm text-neutral-600">
            Kaina už butą: {getCostDisplay(meter, addressInfo)}
          </div>
        </div>
      )}

      {/* Meters with Readings */}
      {scope !== 'none' && (
        <>
          {/* Readings Row */}
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="text-center">
              <div className="text-xs text-neutral-600 mb-1">Praeitas</div>
              {!meter.tenantPhotoEnabled ? (
                <input
                  type="number"
                  step="0.01"
                  value={previousReading}
                  className="w-full px-2 py-1 text-sm border border-neutral-300 rounded text-center"
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    // Handle previous reading update
                    onEditReading(meter.id, value);
                  }}
                />
              ) : (
                <div className="text-sm font-medium text-neutral-900">
                  {previousReading > 0 ? `${previousReading} ${meter.unit}` : `0 ${meter.unit}`}
                </div>
              )}
            </div>
            <div className="text-center">
              <div className="text-xs text-neutral-600 mb-1">Dabartinis</div>
              {!meter.tenantPhotoEnabled ? (
                <input
                  type="number"
                  step="0.01"
                  value={currentInputValue || meterCurrentReading || ''}
                  placeholder={`${meter.unit}`}
                  className="w-full px-2 py-1 text-sm border border-neutral-300 rounded text-center"
                  onChange={(e) => {
                    setCurrentInputValue(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const value = parseFloat((e.target as HTMLInputElement).value);
                      if (!isNaN(value)) {
                        setIsSaving(true);
                        onSaveReading(meter.id, value);
                        setIsSaving(false);
                        setCurrentInputValue('');
                      }
                    }
                  }}
                  onBlur={(e) => {
                    const value = parseFloat((e.target as HTMLInputElement).value);
                    if (!isNaN(value) && value > 0) {
                      setIsSaving(true);
                      onSaveReading(meter.id, value);
                      setIsSaving(false);
                      setCurrentInputValue('');
                    }
                  }}
                />
              ) : (
                <div className="text-sm font-medium text-neutral-900">
                  {meterCurrentReading ? `${meterCurrentReading} ${meter.unit}` : '—'}
                </div>
              )}
            </div>
            <div className="text-center">
              <div className="text-xs text-neutral-600 mb-1">Δ</div>
              <div className="text-sm font-medium text-neutral-900">
                {consumption ? `${consumption > 0 ? '+' : ''}${consumption} ${meter.unit}` : '—'}
              </div>
            </div>
          </div>

          {/* Photo for tenant submissions */}
          {meter.tenantPhotoEnabled === true && meter.photoUrl && (
            <div className="mb-3">
              <img
                src={meter.photoUrl}
                alt={`Skaitliukas ${meter.name}`}
                className="w-16 h-16 object-cover rounded border"
              />
            </div>
          )}

          {/* Cost */}
          <div className="mb-3">
            <div className="text-sm text-neutral-600">
              Kaina už butą: {getCostDisplay(meter, addressInfo)}
            </div>
          </div>
        </>
      )}

      {/* Actions Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-neutral-100">
        <button
          onClick={() => onViewHistory(meter.id)}
          className="text-xs text-neutral-600 hover:text-neutral-900 transition-colors"
        >
          Istorija
        </button>

        <div className="flex items-center gap-2">
          {/* Landlord input mode */}
          {!meter.tenantPhotoEnabled && scope !== 'none' && (
            <button
              onClick={() => {
                const value = parseFloat(currentInputValue);
                if (!isNaN(value) && value > 0) {
                  setIsSaving(true);
                  onSaveReading(meter.id, value);
                  setIsSaving(false);
                  setCurrentInputValue('');
                }
              }}
              disabled={isSaving || !currentInputValue || parseFloat(currentInputValue) <= 0}
              className="px-3 py-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded text-xs font-medium transition-colors"
            >
              {isSaving ? 'Išsaugoma...' : 'Išsaugoti rodmenį'}
            </button>
          )}

          {/* Tenant review mode */}
          {meter.tenantPhotoEnabled === true && status === 'Laukia patvirtinimo' && (
            <>
              <button
                onClick={() => onEditReading(meter.id, (meterCurrentReading || 0) + 1)}
                className="px-3 py-1 bg-rose-500 hover:bg-rose-600 text-white rounded text-xs font-medium transition-colors"
              >
                Atmesti
              </button>
              <button
                onClick={() => onApproveReading(meter.id)}
                className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded text-xs font-medium transition-colors"
              >
                Patvirtinti
              </button>
            </>
          )}

          {/* Individual meters - show apartment readings button */}
          {scope === 'apartment' && !meter.tenantPhotoEnabled && (
            <button
              onClick={() => onViewHistory(meter.id)}
              className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs font-medium transition-colors"
            >
              Atidaryti butų rodmenis
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Communal Meter Card Component - Clean Design
const CommunalMeterCard: React.FC<{
  meter: any;
  addressInfo?: any;
  onSaveReading: (id: string, value: number) => void;
  onApproveReading: (id: string) => void;
  onEditReading: (id: string, value: number) => void;
  onSendWarning: (id: string) => void;
  onRequestPhoto: (id: string) => void;
  onViewHistory: (id: string) => void;
}> = ({ meter, addressInfo, onSaveReading, onApproveReading, onEditReading, onSendWarning, onRequestPhoto, onViewHistory }) => {
  const [communalInputValue, setCommunalInputValue] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const scope = getMeterScope(meter);
  const status = getMeterStatus(meter);

  // Get meter icon based on name
  const getMeterIcon = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('elektra') || lowerName.includes('elektros')) return '⚡';
    if (lowerName.includes('vanduo') || lowerName.includes('šaltas') || lowerName.includes('karštas')) return '💧';
    if (lowerName.includes('šildymas') || lowerName.includes('šiluma')) return '🔥';
    if (lowerName.includes('dujos') || lowerName.includes('dujų')) return '🔥';
    return '📊';
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Patvirtinta': return 'bg-emerald-50 text-emerald-700';
      case 'Laukia patvirtinimo': return 'bg-amber-50 text-amber-700';
      case 'Pateikta': return 'bg-blue-50 text-blue-700';
      case 'Atmesta': return 'bg-rose-50 text-rose-700';
      default: return 'bg-neutral-50 text-neutral-700';
    }
  };

  // Get previous reading and current reading
  const previousReading = meter.previousReading || 0;
  const communalCurrentReading = meter.tenantSubmittedValue || meter.value || meter.currentReading;
  const consumption = communalCurrentReading ? communalCurrentReading - previousReading : null;

  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-4 hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{getMeterIcon(meter.name)}</span>
          <span className="font-semibold text-neutral-900">{meter.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-1 bg-neutral-100 text-neutral-700 rounded-full font-medium">
            {getMeterTypeLabelLocal(meter)}
          </span>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(status)}`}>
            {status}
          </span>
        </div>
      </div>

      {/* Price Pills */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-xs px-2 py-1 bg-neutral-100 text-neutral-700 rounded-full">
          {getMeterPriceDisplay(meter)}
        </span>
        <span className="text-xs px-2 py-1 bg-neutral-100 text-neutral-700 rounded-full">
          {getDistributionLabel(meter.distribution_method || 'per_apartment')}
        </span>
      </div>

      {/* Fixed Meter - No Readings */}
      {scope === 'none' && (
        <div className="space-y-3">
          <div className="text-sm text-neutral-600">
            Kaina už butą: {getCostDisplay(meter, addressInfo)}
          </div>
        </div>
      )}

      {/* Meters with Readings */}
      {scope !== 'none' && (
        <>
          {/* Readings Row */}
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="text-center">
              <div className="text-xs text-neutral-600 mb-1">Praeitas</div>
              {!meter.tenantPhotoEnabled ? (
                <input
                  type="number"
                  step="0.01"
                  value={previousReading}
                  className="w-full px-2 py-1 text-sm border border-neutral-300 rounded text-center"
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    // Handle previous reading update
                    onEditReading(meter.id, value);
                  }}
                />
              ) : (
                <div className="text-sm font-medium text-neutral-900">
                  {previousReading > 0 ? `${previousReading} ${meter.unit}` : `0 ${meter.unit}`}
                </div>
              )}
            </div>
            <div className="text-center">
              <div className="text-xs text-neutral-600 mb-1">Dabartinis</div>
              {!meter.tenantPhotoEnabled ? (
                <input
                  type="number"
                  step="0.01"
                  value={communalInputValue || ''}
                  placeholder={`${meter.unit}`}
                  className="w-full px-2 py-1 text-sm border border-neutral-300 rounded text-center"
                  onChange={(e) => {
                    setCommunalInputValue(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const value = parseFloat((e.target as HTMLInputElement).value);
                      if (!isNaN(value)) {
                        setIsSaving(true);
                        onSaveReading(meter.id, value);
                        setIsSaving(false);
                        setCommunalInputValue('');
                      }
                    }
                  }}
                  onBlur={(e) => {
                    const value = parseFloat((e.target as HTMLInputElement).value);
                    if (!isNaN(value) && value > 0) {
                      setIsSaving(true);
                      onSaveReading(meter.id, value);
                      setIsSaving(false);
                      setCommunalInputValue('');
                    }
                  }}
                />
              ) : (
                <div className="text-sm font-medium text-neutral-900">
                  {communalCurrentReading ? `${communalCurrentReading} ${meter.unit}` : '—'}
                </div>
              )}
            </div>
            <div className="text-center">
              <div className="text-xs text-neutral-600 mb-1">Δ</div>
              <div className="text-sm font-medium text-neutral-900">
                {consumption ? `${consumption > 0 ? '+' : ''}${consumption} ${meter.unit}` : '—'}
              </div>
            </div>
          </div>

          {/* Photo for tenant submissions */}
          {meter.tenantPhotoEnabled === true && meter.photoUrl && (
            <div className="mb-3">
              <img
                src={meter.photoUrl}
                alt={`Skaitliukas ${meter.name}`}
                className="w-16 h-16 object-cover rounded border"
              />
            </div>
          )}

          {/* Cost */}
          <div className="mb-3">
            <div className="text-sm text-neutral-600">
              Kaina už butą: {getCostDisplay(meter, addressInfo)}
            </div>
          </div>
        </>
      )}

      {/* Actions Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-neutral-100">
        <button
          onClick={() => onViewHistory(meter.id)}
          className="text-xs text-neutral-600 hover:text-neutral-900 transition-colors"
        >
          Istorija
        </button>

        <div className="flex items-center gap-2">
          {/* Landlord input mode */}
          {!meter.tenantPhotoEnabled && scope !== 'none' && (
            <button
              onClick={() => {
                const value = parseFloat(communalInputValue);
                if (!isNaN(value) && value > 0) {
                  setIsSaving(true);
                  onSaveReading(meter.id, value);
                  setIsSaving(false);
                  setCommunalInputValue('');
                }
              }}
              disabled={isSaving || !communalInputValue || parseFloat(communalInputValue) <= 0}
              className="px-3 py-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded text-xs font-medium transition-colors"
            >
              {isSaving ? 'Išsaugoma...' : 'Išsaugoti rodmenį'}
            </button>
          )}

          {/* Tenant review mode */}
          {meter.tenantPhotoEnabled === true && status === 'Laukia patvirtinimo' && (
            <>
              <button
                onClick={() => onEditReading(meter.id, (communalCurrentReading || 0) + 1)}
                className="px-3 py-1 bg-rose-500 hover:bg-rose-600 text-white rounded text-xs font-medium transition-colors"
              >
                Atmesti
              </button>
              <button
                onClick={() => onApproveReading(meter.id)}
                className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded text-xs font-medium transition-colors"
              >
                Patvirtinti
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};



// --- Modern Documents Tab ---
const DocumentsTab: React.FC<{ documents: Documents[] }> = ({ documents }) => {
  // EMPTY STATE: Show when no documents exist
  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-8">
        <div className="w-20 h-20 bg-neutral-100 rounded-2xl flex items-center justify-center mb-6">
          <FileText className="w-10 h-10 text-neutral-400" />
        </div>
        <h3 className="text-xl font-semibold text-neutral-900 mb-2">Dokumentų nėra</h3>
        <p className="text-neutral-500 text-center max-w-md mb-6">
          Čia galėsite saugoti nuomos sutartis, perdavimo aktus ir kitus su butu susijusius dokumentus.
        </p>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-6 py-3 bg-[#2F8481] text-white rounded-xl hover:bg-[#267270] transition-colors font-medium">
            <FileText className="w-5 h-5" />
            Įkelti dokumentą
          </button>
        </div>
      </div>
    );
  }

  // HAS DOCUMENTS: Show list
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-neutral-900">Dokumentai ({documents.length})</h3>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#2F8481] text-white rounded-lg hover:bg-[#267270] transition-colors text-sm font-medium">
          <FileText className="w-4 h-4" />
          Įkelti
        </button>
      </div>

      <div className="space-y-3">
        {documents.map((doc) => (
          <div key={doc.id} className="flex items-center justify-between p-4 bg-white border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#2F8481]/10 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-[#2F8481]" />
              </div>
              <div>
                <div className="text-sm font-medium text-neutral-900">{doc.name}</div>
                <div className="text-xs text-neutral-500">{doc.type}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {doc.uploadedAt && (
                <div className="text-xs text-neutral-500">{formatDate(doc.uploadedAt)}</div>
              )}
              <button className="text-[#2F8481] hover:text-[#267270] text-sm font-medium">
                Atsisiųsti
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Extended Meter interface for this component
interface ExtendedMeter extends Meter {
  type?: string;
  previousReading?: number;
  currentReading?: number;
  value?: number;
  tenantSubmittedValue?: number;
  isApproved?: boolean;
  price_per_unit?: number;
}

// Main component
interface TenantDetailModalProProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: Tenant;
  property: PropertyInfo;
  moveOut: MoveOut;
  documents: Documents[];
  addressInfo?: any;
  meters: MeterItem[];
}

const TenantDetailModalPro: React.FC<TenantDetailModalProProps> = ({
  isOpen,
  onClose,
  tenant,
  property,
  moveOut,
  documents,
  addressInfo,
  meters
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const { user } = useAuth();
  const [meterData, setMeterData] = useState<ExtendedMeter[]>([]);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [propertyNotes, setPropertyNotes] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);

  // Photo upload state
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [propertyPhotos, setPropertyPhotos] = useState<string[]>(tenant.photos || []);

  // Modal states for actions
  const [isTenantModalOpen, setIsTenantModalOpen] = useState(false);
  const [isLeaseModalOpen, setIsLeaseModalOpen] = useState(false);
  const [isEditPropertyModalOpen, setIsEditPropertyModalOpen] = useState(false);

  // Form states
  const [tenantForm, setTenantForm] = useState({ name: '', email: '', phone: '' });
  const [leaseForm, setLeaseForm] = useState({ startDate: '', endDate: '', monthlyRent: '', deposit: '' });
  const [propertyForm, setPropertyForm] = useState({
    rooms: property.rooms?.toString() || '',
    area: property.area?.toString() || '',
    floor: property.floor?.toString() || '',
    type: property.type || 'apartment'
  });

  // Notes modal handlers
  const handleShowNotes = useCallback(() => {
    // Load notes from localStorage (or could be from database)
    const storedNotes = localStorage.getItem(`property_notes_${property.id}`);
    if (storedNotes) {
      setPropertyNotes(storedNotes);
    }
    setIsNotesModalOpen(true);
  }, [property.id]);

  const handleSaveNotes = useCallback(async () => {
    setNotesSaving(true);
    try {
      // Save to localStorage for now (could be extended to save to database)
      localStorage.setItem(`property_notes_${property.id}`, propertyNotes);
      console.log('✅ Notes saved successfully');
      setIsNotesModalOpen(false);
    } catch (error) {
      console.error('Error saving notes:', error);
      alert('Klaida išsaugant pastabas. Bandykite dar kartą.');
    } finally {
      setNotesSaving(false);
    }
  }, [property.id, propertyNotes]);

  // Photo upload handler - REAL IMPLEMENTATION
  const handleUploadPhoto = useCallback(() => {
    photoInputRef.current?.click();
  }, []);

  const handlePhotoFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploadingPhotos(true);
    const uploadedUrls: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Validate file
        if (!file.type.startsWith('image/')) {
          console.warn('Skipping non-image file:', file.name);
          continue;
        }
        if (file.size > 5 * 1024 * 1024) {
          console.warn('File too large:', file.name);
          continue;
        }

        // Generate unique filename
        const ext = file.name.split('.').pop();
        const path = `${property.id}/${Date.now()}-${i}.${ext}`;

        // Upload to Supabase storage
        const { error: uploadError } = await supabase.storage
          .from('property-photos')
          .upload(path, file, { upsert: true });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          continue;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('property-photos')
          .getPublicUrl(path);

        uploadedUrls.push(publicUrl);
      }

      if (uploadedUrls.length > 0) {
        // Update local state
        const newPhotos = [...propertyPhotos, ...uploadedUrls];
        setPropertyPhotos(newPhotos);

        // Save to database (update property with photos)
        // Note: This assumes there's a photos column or we store in localStorage for now
        localStorage.setItem(`property_photos_${property.id}`, JSON.stringify(newPhotos));

        console.log('✅ Photos uploaded successfully:', uploadedUrls.length);
      }
    } catch (error) {
      console.error('Error uploading photos:', error);
      alert('Klaida įkeliant nuotraukas. Bandykite dar kartą.');
    } finally {
      setUploadingPhotos(false);
      // Reset input
      if (photoInputRef.current) {
        photoInputRef.current.value = '';
      }
    }
  }, [property.id, propertyPhotos]);

  // Handle reordering photos (drag and drop)
  const handleReorderPhotos = useCallback((newPhotos: string[]) => {
    setPropertyPhotos(newPhotos);
    localStorage.setItem(`property_photos_${property.id}`, JSON.stringify(newPhotos));
    console.log('📷 Photos reordered:', newPhotos.length);
  }, [property.id]);

  // Handle deleting a photo
  const handleDeletePhoto = useCallback((index: number) => {
    const newPhotos = propertyPhotos.filter((_, i) => i !== index);
    setPropertyPhotos(newPhotos);
    localStorage.setItem(`property_photos_${property.id}`, JSON.stringify(newPhotos));
    console.log('🗑️ Photo deleted at index:', index);
  }, [property.id, propertyPhotos]);

  // Load photos from localStorage on mount
  useEffect(() => {
    const storedPhotos = localStorage.getItem(`property_photos_${property.id}`);
    if (storedPhotos) {
      try {
        const parsed = JSON.parse(storedPhotos);
        if (Array.isArray(parsed)) {
          setPropertyPhotos(parsed);
        }
      } catch (e) {
        console.error('Error parsing stored photos:', e);
      }
    }
  }, [property.id]);

  // Action handlers
  const handleAddTenant = useCallback(() => {
    setTenantForm({ name: '', email: '', phone: '' });
    setIsTenantModalOpen(true);
  }, []);

  const handleSaveTenant = useCallback(async () => {
    if (!tenantForm.name.trim()) {
      alert('Nuomininko vardas yra privalomas');
      return;
    }
    try {
      // Save tenant to database
      const { error } = await supabase
        .from('properties')
        .update({
          tenant_name: tenantForm.name,
          email: tenantForm.email || null,
          phone: tenantForm.phone || null,
          status: 'occupied'
        })
        .eq('id', property.id);

      if (error) throw error;

      console.log('✅ Tenant added successfully');
      setIsTenantModalOpen(false);
      // Would need to refresh data here in real implementation
      alert('Nuomininkas pridėtas sėkmingai!');
    } catch (error) {
      console.error('Error adding tenant:', error);
      alert('Klaida pridėdant nuomininku. Bandykite dar kartą.');
    }
  }, [tenantForm, property.id]);

  const handleCreateLease = useCallback(() => {
    setLeaseForm({ startDate: '', endDate: '', monthlyRent: '', deposit: '' });
    setIsLeaseModalOpen(true);
  }, []);

  const handleSaveLease = useCallback(async () => {
    if (!leaseForm.startDate || !leaseForm.monthlyRent) {
      alert('Pradžios data ir nuomos kaina yra privalomos');
      return;
    }
    try {
      // Save lease to database
      const { error } = await supabase
        .from('properties')
        .update({
          contract_start: leaseForm.startDate,
          contract_end: leaseForm.endDate || null,
          rent: parseFloat(leaseForm.monthlyRent) || 0,
          deposit_amount: parseFloat(leaseForm.deposit) || 0
        })
        .eq('id', property.id);

      if (error) throw error;

      console.log('✅ Lease created successfully');
      setIsLeaseModalOpen(false);
      alert('Sutartis sukurta sėkmingai!');
    } catch (error) {
      console.error('Error creating lease:', error);
      alert('Klaida kuriant sutarti. Bandykite dar kartą.');
    }
  }, [leaseForm, property.id]);

  const handleEditProperty = useCallback(() => {
    setPropertyForm({
      rooms: property.rooms?.toString() || '',
      area: property.area?.toString() || '',
      floor: property.floor?.toString() || '',
      type: property.type || 'apartment'
    });
    setIsEditPropertyModalOpen(true);
  }, [property]);

  const handleSaveProperty = useCallback(async () => {
    try {
      // Save property to database
      const { error } = await supabase
        .from('properties')
        .update({
          rooms: propertyForm.rooms ? parseInt(propertyForm.rooms) : null,
          area: propertyForm.area ? parseFloat(propertyForm.area) : null,
          floor: propertyForm.floor ? parseInt(propertyForm.floor) : null
          // type is not usually in properties table
        })
        .eq('id', property.id);

      if (error) throw error;

      console.log('✅ Property updated successfully');
      setIsEditPropertyModalOpen(false);
      alert('Būsto duomenys atnaujinti sėkmingai!');
    } catch (error) {
      console.error('Error updating property:', error);
      alert('Klaida atnaujinant būsto duomenis. Bandykite dar kartą.');
    }
  }, [propertyForm, property.id]);

  const handleAddPayment = useCallback(() => {
    // Navigate to payments or show payment modal
    alert('Mokėjimo pridėjimo funkcija bus pridėta atskirame modulyje.');
  }, []);

  // Initialize meterData with meters prop when component mounts or meters change
  useEffect(() => {
    if (meters && meters.length > 0) {
      const initialMeterData: ExtendedMeter[] = meters.map((meter: any) => ({
        id: meter.id,
        kind: meter.type as any,
        name: meter.name,
        mode: meter.mode || 'Individualūs',
        unit: meter.unit || 'm³',
        value: meter.currentReading || null,
        lastUpdatedAt: meter.lastReadingDate,
        needsPhoto: !!meter.requires_photo,
        needsReading: true,
        status: meter.status === 'read' ? 'ok' as const : 'waiting' as const,
        photoPresent: !!meter.photoUrl,
        photoUrl: meter.photoUrl || null,
        tenantSubmittedValue: meter.currentReading || null,
        tenantSubmittedAt: meter.lastReadingDate,
        isApproved: meter.status === 'read',
        hasWarning: false,
        isFixedMeter: meter.distribution_method === 'fixed_split' || meter.isFixedMeter || false,
        isCommunalMeter: meter.mode === 'Bendri',
        showPhotoRequirement: !!meter.requires_photo,
        costPerApartment: meter.costPerApartment || 0,
        price_per_unit: meter.price_per_unit || meter.pricePerUnit || 0,
        fixed_price: meter.fixed_price || 0,
        distribution_method: meter.distribution_method || 'per_apartment',
        description: meter.description || '',
        type: meter.type || 'electricity',
        previousReading: meter.previousReading || 0,
        currentReading: meter.currentReading || null,
        tenantPhotoEnabled: meter.tenantPhotoEnabled || false
      }));
      setMeterData(initialMeterData);
      console.log('✅ Initialized meterData with', initialMeterData.length, 'meters');
    }
  }, [meters]);

  // Fetch meters from address_meters if meters prop is empty
  useEffect(() => {
    const fetchAddressMeters = async () => {
      if (isOpen && property?.id && meters.length === 0) {
        try {
          console.log('🔄 Fetching address meters for property:', property.id);
          const addressMeters = await getApartmentMeters(property.id);

          if (addressMeters && addressMeters.length > 0) {
            const convertedMeters: ExtendedMeter[] = addressMeters.map((meter: any) => ({
              id: meter.id,
              kind: meter.type as any,
              name: meter.name,
              mode: meter.type === 'communal' ? 'Bendri' : 'Individualūs',
              unit: meter.unit || 'm³',
              value: undefined,
              lastUpdatedAt: undefined,
              needsPhoto: false,
              needsReading: true,
              status: 'waiting' as const,
              photoPresent: false,
              photoUrl: undefined,
              tenantSubmittedValue: undefined,
              tenantSubmittedAt: undefined,
              isApproved: false,
              hasWarning: false,
              isFixedMeter: meter.distribution_method === 'fixed_split',
              isCommunalMeter: meter.type === 'communal',
              showPhotoRequirement: false,
              costPerApartment: 0,
              price_per_unit: meter.price_per_unit || 0,
              fixed_price: meter.fixed_price || 0,
              distribution_method: meter.distribution_method || 'per_apartment',
              description: '',
              type: meter.type || 'individual',
              previousReading: 0,
              currentReading: undefined,
              tenantPhotoEnabled: false
            }));
            setMeterData(convertedMeters);
            console.log('✅ Loaded', convertedMeters.length, 'meters from address settings');
          }
        } catch (error) {
          console.error('Error fetching address meters:', error);
        }
      }
    };

    fetchAddressMeters();
  }, [isOpen, property?.id, meters.length]);

  useBodyScrollLock(isOpen);
  useFocusTrap(isOpen, modalRef);

  // Helper function to map meter types to database types
  const mapMeterTypeToDatabase = (meterType: string): string => {
    switch (meterType) {
      case 'water_cold':
      case 'water_hot':
        return 'water';
      case 'electricity_ind':
      case 'electricity_shared':
      case 'electricity_individual':
      case 'electricity_common':
        return 'electricity';
      case 'heating':
        return 'heating';
      case 'internet':
        return 'internet';
      case 'trash':
      case 'waste':
        return 'garbage';
      case 'gas_ind':
      case 'gas':
        return 'gas';
      default:
        return 'electricity'; // fallback
    }
  };

  // Get apartment count for communal meter calculations
  const getApartmentCount = (): number => {
    // Try to get from addressInfo first
    if (addressInfo?.total_apartments) {
      return addressInfo.total_apartments;
    }
    // Default fallback - you might want to get this from a different source
    return 1;
  };

  // Handler functions
  const handleSaveReading = useCallback(async (meterId: string, reading: number) => {
    try {
      console.log('Saving reading for meter:', meterId, reading);

      // Find the meter in the data
      const meterIndex = meterData.findIndex(m => m.id === meterId);
      if (meterIndex === -1) {
        console.error('Meter not found:', meterId);
        return;
      }

      const meter = meterData[meterIndex] as ExtendedMeter;

      // Determine if this is a communal meter based on type and distribution method
      // According to database schema:
      // - Individual meters: type = 'individual' AND distribution_method = 'per_consumption'
      // - Communal meters: type = 'communal' AND distribution_method IN ('per_apartment', 'per_area', 'fixed_split')
      let isCommunalMeter = meter.mode === 'Bendri' || meter.isCommunalMeter;

      // If not determined by mode, check type and distribution method
      if (!isCommunalMeter) {
        // Check if it's communal based on distribution method
        if (meter.distribution_method === 'per_apartment' ||
          meter.distribution_method === 'per_area' ||
          meter.distribution_method === 'fixed_split') {
          isCommunalMeter = true;
        } else if (meter.distribution_method === 'per_consumption') {
          isCommunalMeter = false;
        } else {
          // Fallback to type
          isCommunalMeter = meter.type === 'communal';
        }
      }

      // For communal meters, we need to save to address level
      // For individual meters, we save to apartment level
      const meterType = isCommunalMeter ? 'address' : 'apartment';

      // Log the data we're trying to insert for debugging
      const insertData = {
        property_id: property.id, // Always use property.id (for communal meters, this represents the address)
        meter_id: meterId,
        meter_type: meterType, // 'address' for communal, 'apartment' for individual
        type: mapMeterTypeToDatabase(meter.type || 'electricity'), // Map to database type
        reading_date: new Date().toISOString().split('T')[0],
        current_reading: reading,
        previous_reading: meter.previousReading || 0,
        // REMOVED: difference - using consumption (GENERATED)
        price_per_unit: meter.price_per_unit || 0, // Required field
        total_sum: (reading - (meter.previousReading || 0)) * (meter.price_per_unit || 0), // Made nullable in DB
        amount: (reading - (meter.previousReading || 0)) * (meter.price_per_unit || 0),
        notes: isCommunalMeter ? 'Bendras skaitliukas - nuomotojo įvestas rodmuo' : 'Nuomotojo įvestas rodmuo'
      };

      console.log('🔍 Inserting meter reading data:', insertData);
      console.log('🔍 Is communal meter:', isCommunalMeter);
      console.log('🔍 Meter type:', meterType);
      console.log('🔍 Tenant object:', tenant);
      console.log('🔍 Property object:', property);

      // Update the meter reading in the database
      const { data, error } = await supabase
        .from('meter_readings')
        .insert(insertData);

      if (error) {
        console.error('Error saving reading:', error);
        alert('Klaida išsaugant rodmenį. Bandykite dar kartą.');
        return;
      }

      // Update local state
      const updatedMeterData = [...meterData];
      (updatedMeterData[meterIndex] as ExtendedMeter).currentReading = reading;
      (updatedMeterData[meterIndex] as ExtendedMeter).value = reading;
      (updatedMeterData[meterIndex] as ExtendedMeter).tenantSubmittedValue = reading;
      setMeterData(updatedMeterData);

      console.log('✅ Reading saved successfully');
      // Remove the alert - it's causing the persistent notification issue

    } catch (error) {
      console.error('Error saving reading:', error);
      alert('Klaida išsaugant rodmenį. Bandykite dar kartą.');
    }
  }, [meterData, property.id]);

  const handleRequestPhoto = useCallback(async (meterId: string) => {
    try {
      console.log('Requesting photo for meter:', meterId);

      // Here you would typically send a notification to the tenant
      // For now, we'll just log it
      alert('Nuomininkui išsiųstas prašymas pateikti nuotrauką');

    } catch (error) {
      console.error('Error requesting photo:', error);
      alert('Klaida siunčiant prašymą. Bandykite dar kartą.');
    }
  }, []);

  const handleViewHistory = useCallback(async (meterId: string) => {
    try {
      console.log('Getting history for meter:', meterId);

      // Fetch meter reading history from database
      const { data, error } = await supabase
        .from('meter_readings')
        .select('*')
        .eq('meter_id', meterId)
        .order('reading_date', { ascending: false });

      if (error) {
        console.error('Error fetching history:', error);
        alert('Klaida gaunant istoriją. Bandykite dar kartą.');
        return;
      }

      // Show history in a modal or navigate to history page
      console.log('Meter history:', data);
      alert(`Rasta ${data?.length || 0} rodmenų istorijoje`);

    } catch (error) {
      console.error('Error loading history:', error);
      alert('Klaida gaunant istoriją. Bandykite dar kartą.');
    }
  }, []);

  const handleRequestMissing = useCallback(async (ids: string[]) => {
    try {
      console.log('Requesting missing readings for meters:', ids);

      // Here you would typically send notifications to tenants
      // For now, we'll just log it
      alert(`Išsiųstas prašymas ${ids.length} skaitliukų rodmenims`);

    } catch (error) {
      console.error('Error requesting missing readings:', error);
      alert('Klaida siunčiant prašymus. Bandykite dar kartą.');
    }
  }, []);

  const handleApproveReading = useCallback(async (meterId: string) => {
    try {
      console.log('Approving reading for meter:', meterId);

      // Find the meter in the data
      const meterIndex = meterData.findIndex(m => m.id === meterId);
      if (meterIndex === -1) {
        console.error('Meter not found:', meterId);
        return;
      }

      // Update the meter reading status in the database
      const { data, error } = await supabase
        .from('meter_readings')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user?.id
        })
        .eq('meter_id', meterId)
        .eq('status', 'pending');

      if (error) {
        console.error('Error approving reading:', error);
        alert('Klaida patvirtinant rodmenį. Bandykite dar kartą.');
        return;
      }

      // Update local state
      const updatedMeterData = [...meterData];
      (updatedMeterData[meterIndex] as ExtendedMeter).isApproved = true;
      setMeterData(updatedMeterData);

      console.log('✅ Reading approved successfully');
      alert('Rodmuo sėkmingai patvirtintas!');

    } catch (error) {
      console.error('Error approving reading:', error);
      alert('Klaida patvirtinant rodmenį. Bandykite dar kartą.');
    }
  }, [meterData, user?.id]);

  const handleEditReading = useCallback(async (meterId: string, newValue: number) => {
    try {
      console.log('Editing reading for meter:', meterId, newValue);

      // Find the meter in the data
      const meterIndex = meterData.findIndex(m => m.id === meterId);
      if (meterIndex === -1) {
        console.error('Meter not found:', meterId);
        return;
      }

      const meter = meterData[meterIndex] as ExtendedMeter;

      // Update the meter reading in the database
      const { data, error } = await supabase
        .from('meter_readings')
        .update({
          current_reading: newValue,
          difference: newValue - (meter.previousReading || 0),
          total_sum: (newValue - (meter.previousReading || 0)) * (meter.price_per_unit || 0),
          updated_at: new Date().toISOString()
        })
        .eq('meter_id', meterId)
        .order('reading_date', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error updating reading:', error);
        alert('Klaida atnaujinant rodmenį. Bandykite dar kartą.');
        return;
      }

      // Update local state
      const updatedMeterData = [...meterData];
      (updatedMeterData[meterIndex] as ExtendedMeter).currentReading = newValue;
      (updatedMeterData[meterIndex] as ExtendedMeter).value = newValue;
      (updatedMeterData[meterIndex] as ExtendedMeter).tenantSubmittedValue = newValue;
      setMeterData(updatedMeterData);

      console.log('✅ Reading updated successfully');

    } catch (error) {
      console.error('Error editing reading:', error);
      alert('Klaida atnaujinant rodmenį. Bandykite dar kartą.');
    }
  }, [meterData]);

  const handleSendWarning = useCallback(async (meterId: string) => {
    try {
      console.log('Sending warning for meter:', meterId);

      // Here you would typically send a warning notification to the tenant
      // For now, we'll just log it
      alert('Nuomininkui išsiųstas įspėjimas');

    } catch (error) {
      console.error('Error sending warning:', error);
      alert('Klaida siunčiant įspėjimą. Bandykite dar kartą.');
    }
  }, []);

  const tabs = [
    { id: 'overview', label: 'Apžvalga', icon: User },
    { id: 'property', label: 'Būstas', icon: Home },
    { id: 'meters', label: 'Komunaliniai', icon: Droplets },
    { id: 'documents', label: 'Dokumentai', icon: FileText }
  ];

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tenant-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div
        ref={modalRef}
        className="relative bg-white rounded-2xl shadow-2xl max-w-[1000px] w-[96vw] h-[90vh] grid grid-rows-[auto_auto_1fr] overflow-hidden"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-neutral-200 px-6 py-4 flex items-center justify-between bg-white">
          <div>
            <h2 id="tenant-modal-title" className="text-xl font-semibold text-neutral-900">
              {tenant.name}
            </h2>
            <p className="text-sm text-neutral-500">{property.address}</p>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-neutral-500 hover:text-neutral-700 transition-colors"
            aria-label="Uždaryti"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-neutral-200 px-6">
          <nav className="flex space-x-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-3 px-4 rounded-lg font-medium text-sm transition-colors ${isActive
                    ? 'bg-[#2F8481] text-white'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                    }`}
                >
                  <Icon className="size-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <PremiumOverviewTab
              tenant={{ ...tenant, photos: propertyPhotos }}
              property={property}
              moveOut={moveOut}
              meters={meterData}
              addressInfo={addressInfo}
              onNavigateTab={(tab) => setActiveTab(tab === 'komunaliniai' ? 'meters' : tab === 'dokumentai' ? 'documents' : tab === 'bustas' ? 'property' : tab)}
              onUploadPhoto={handleUploadPhoto}
              onShowNotes={handleShowNotes}
              onAddTenant={handleAddTenant}
              onCreateLease={handleCreateLease}
              onAddPayment={handleAddPayment}
              onEditProperty={handleEditProperty}
              onReorderPhotos={handleReorderPhotos}
              onDeletePhoto={handleDeletePhoto}
            />
          )}
          {activeTab === 'property' && <PropertyTab property={property} />}
          {activeTab === 'meters' && (
            <MetersTab
              meters={meterData}
              tenant={tenant}
              addressInfo={addressInfo}
              onSaveReading={handleSaveReading}
              onApproveReading={handleApproveReading}
              onEditReading={handleEditReading}
              onSendWarning={handleSendWarning}
              onRequestPhoto={handleRequestPhoto}
              onViewHistory={handleViewHistory}
              onRequestMissing={handleRequestMissing}
            />
          )}
          {activeTab === 'documents' && <DocumentsTab documents={documents} />}
        </div>
      </div>

      {/* Hidden file input for photo uploads */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handlePhotoFileChange}
        className="hidden"
      />

      {/* Notes Modal */}
      {isNotesModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsNotesModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#2F8481]/10 rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-[#2F8481]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900">Vidinės pastabos</h3>
                  <p className="text-sm text-neutral-500">Komentarai apie būstą</p>
                </div>
              </div>
              <button
                onClick={() => setIsNotesModalOpen(false)}
                className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-neutral-400" />
              </button>
            </div>

            <textarea
              value={propertyNotes}
              onChange={(e) => setPropertyNotes(e.target.value)}
              placeholder="Įveskite pastabas apie būstą... (pvz., remonto istorija, ypatingi nuomininko pageidavimai, svarbi informacija)"
              className="w-full h-48 p-4 border border-neutral-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[#2F8481]/20 focus:border-[#2F8481] text-neutral-700"
            />

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setIsNotesModalOpen(false)}
                className="px-4 py-2 text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors text-sm font-medium"
              >
                Atšaukti
              </button>
              <button
                onClick={handleSaveNotes}
                disabled={notesSaving}
                className="flex items-center gap-2 px-4 py-2 bg-[#2F8481] text-white rounded-lg hover:bg-[#267270] transition-colors text-sm font-medium disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {notesSaving ? 'Saugoma...' : 'Išsaugoti'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Tenant Modal - Using InviteTenantModal */}
      <InviteTenantModal
        isOpen={isTenantModalOpen}
        onClose={() => setIsTenantModalOpen(false)}
        propertyId={property.id}
        propertyLabel={property.address || `Butas ${property.id}`}
      />

      {/* Create Lease Modal */}
      {isLeaseModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsLeaseModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#2F8481]/10 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-[#2F8481]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900">Sukurti sutartį</h3>
                  <p className="text-sm text-neutral-500">Nuomos sutarties duomenys</p>
                </div>
              </div>
              <button
                onClick={() => setIsLeaseModalOpen(false)}
                className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-neutral-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Pradžios data *</label>
                  <input
                    type="date"
                    value={leaseForm.startDate}
                    onChange={(e) => setLeaseForm(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2F8481]/20 focus:border-[#2F8481]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Pabaigos data</label>
                  <input
                    type="date"
                    value={leaseForm.endDate}
                    onChange={(e) => setLeaseForm(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2F8481]/20 focus:border-[#2F8481]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Nuomos kaina (€/mėn) *</label>
                <input
                  type="number"
                  value={leaseForm.monthlyRent}
                  onChange={(e) => setLeaseForm(prev => ({ ...prev, monthlyRent: e.target.value }))}
                  placeholder="500"
                  className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2F8481]/20 focus:border-[#2F8481]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Depozitas (€)</label>
                <input
                  type="number"
                  value={leaseForm.deposit}
                  onChange={(e) => setLeaseForm(prev => ({ ...prev, deposit: e.target.value }))}
                  placeholder="500"
                  className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2F8481]/20 focus:border-[#2F8481]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIsLeaseModalOpen(false)}
                className="px-4 py-2 text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors text-sm font-medium"
              >
                Atšaukti
              </button>
              <button
                onClick={handleSaveLease}
                className="flex items-center gap-2 px-4 py-2 bg-[#2F8481] text-white rounded-lg hover:bg-[#267270] transition-colors text-sm font-medium"
              >
                Sukurti sutartį
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Property Modal */}
      {isEditPropertyModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsEditPropertyModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#2F8481]/10 rounded-lg flex items-center justify-center">
                  <Home className="w-5 h-5 text-[#2F8481]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900">Redaguoti būstą</h3>
                  <p className="text-sm text-neutral-500">Būsto parametrai</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditPropertyModalOpen(false)}
                className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-neutral-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Kambarių sk.</label>
                  <input
                    type="number"
                    value={propertyForm.rooms}
                    onChange={(e) => setPropertyForm(prev => ({ ...prev, rooms: e.target.value }))}
                    placeholder="2"
                    className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2F8481]/20 focus:border-[#2F8481]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Plotas (m²)</label>
                  <input
                    type="number"
                    value={propertyForm.area}
                    onChange={(e) => setPropertyForm(prev => ({ ...prev, area: e.target.value }))}
                    placeholder="50"
                    className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2F8481]/20 focus:border-[#2F8481]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Aukštas</label>
                <input
                  type="number"
                  value={propertyForm.floor}
                  onChange={(e) => setPropertyForm(prev => ({ ...prev, floor: e.target.value }))}
                  placeholder="3"
                  className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2F8481]/20 focus:border-[#2F8481]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Tipas</label>
                <select
                  value={propertyForm.type}
                  onChange={(e) => setPropertyForm(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2F8481]/20 focus:border-[#2F8481] bg-white"
                >
                  <option value="apartment">Butas</option>
                  <option value="house">Namas</option>
                  <option value="studio">Studija</option>
                  <option value="room">Kambarys</option>
                  <option value="commercial">Komercinis</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIsEditPropertyModalOpen(false)}
                className="px-4 py-2 text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors text-sm font-medium"
              >
                Atšaukti
              </button>
              <button
                onClick={handleSaveProperty}
                className="flex items-center gap-2 px-4 py-2 bg-[#2F8481] text-white rounded-lg hover:bg-[#267270] transition-colors text-sm font-medium"
              >
                <Save className="w-4 h-4" />
                Išsaugoti
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo uploading indicator */}
      {uploadingPhotos && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl p-6 flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-[#2F8481] border-t-transparent rounded-full animate-spin" />
            <p className="text-neutral-700 font-medium">Įkeliamos nuotraukos...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TenantDetailModalPro;







