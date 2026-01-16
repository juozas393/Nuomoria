import React, { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock";
import { useFocusTrap } from "../../utils/nuomotojas2Utils";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";

import { Tenant } from "../../types/tenant";
import { type Meter } from "../komunaliniai";
import { X, User, Home, FileText, Droplets, Phone, Calendar, Euro, MapPin, Camera, Clock, CalendarIcon, UserPlus, Loader2 } from 'lucide-react';
import { VacantAssignmentSection } from './VacantAssignmentSection';
import { getMeterTypeLabel, type DistributionMethod } from '../../constants/meterDistribution';
import { ApartmentMeterManager } from '../properties/ApartmentMeterManager';
import { PropertyQuickActionsBar } from './PropertyQuickActionsBar';
import { RentLedgerCard } from './RentLedgerCard';
import { DepositJournalCard } from './DepositJournalCard';
import { fetchRentLedger, fetchDepositEvents, createDepositEvent, type RentLedgerEntry } from '../../lib/propertyFinancials';
import type { PropertyDepositEvent } from '../../lib/database';
import { propertyApi } from '../../lib/database';

// Type definitions for missing interfaces
export interface PropertyInfo {
  id: string;
  address_id?: string;
  address?: string;
  property_label?: string | null;
  rooms?: number;
  area?: number;
  floor?: number;
  type?: string;
  status?: string;
  rent?: number;
  deposit_amount?: number;
  deposit_paid_amount?: number;
  contract_start?: string;
  contract_end?: string;
  notes?: string | null;
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
const formatCurrency = (value?: number | null) => {
  if (value === null || value === undefined) return '€0';
  return new Intl.NumberFormat('lt-LT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value || 0);
};

const translatePropertyType = (type?: string | null) => {
  if (!type) return '—';
  switch (type.toLowerCase()) {
    case 'apartment':
    case 'flat':
      return 'Butas';
    case 'house':
      return 'Namas';
    case 'studio':
      return 'Studija';
    case 'commercial':
      return 'Komercinis objektas';
    default:
      return type;
  }
};

const translatePropertyStatus = (status?: string | null) => {
  if (!status) return 'Nenurodyta';
  switch (status.toLowerCase()) {
    case 'occupied':
      return 'Užimtas';
    case 'vacant':
      return 'Laisvas';
    case 'maintenance':
      return 'Priežiūra';
    case 'active':
      return 'Aktyvus';
    case 'inactive':
      return 'Neaktyvus';
    default:
      return status;
  }
};

const translateMoveOutStatus = (status?: string | null) => {
  if (!status || status.toLowerCase() === 'none') return 'Nenumatyta';
  switch (status.toLowerCase()) {
    case 'scheduled':
      return 'Suplanuota';
    case 'in_progress':
      return 'Vykdoma';
    case 'completed':
      return 'Užbaigta';
    case 'cancelled':
      return 'Atšaukta';
    default:
      return status;
  }
};

// Helper functions for meter logic
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
  ledger: RentLedgerEntry[];
  ledgerLoading: boolean;
  depositEvents: PropertyDepositEvent[];
  depositLoading: boolean;
  nominalDeposit: number;
  onCreateDepositEvent: (input: { eventType: PropertyDepositEvent['event_type']; amount: number; notes?: string }) => Promise<void>;
}> = ({ tenant, property, moveOut, ledger, ledgerLoading, depositEvents, depositLoading, nominalDeposit, onCreateDepositEvent }) => {
  const statusConfig = useMemo(() => {
    switch (tenant.status) {
      case 'active':
        return { label: 'Aktyvus', badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200' };
      case 'expired':
        return { label: 'Baigėsi', badge: 'bg-rose-50 text-rose-700 border border-rose-200' };
      case 'moving_out':
        return { label: 'Išsikrausto', badge: 'bg-amber-50 text-amber-700 border border-amber-200' };
      case 'vacant':
        return { label: 'Laisvas', badge: 'bg-gray-100 text-gray-600 border border-gray-200' };
      default:
        return { label: 'Laukia', badge: 'bg-amber-50 text-amber-700 border border-amber-200' };
    }
  }, [tenant.status]);

  const paymentStatusLabel = useMemo(() => {
    switch (tenant.payment_status) {
      case 'paid':
        return 'Apmokėta';
      case 'overdue':
        return 'Vėluoja';
      case 'unpaid':
        return 'Neapmokėta';
      default:
        return 'Nežinomas';
    }
  }, [tenant.payment_status]);

  const propertyMetrics = useMemo(
    () => [
      { label: 'Kambariai', value: property.rooms ?? '—' },
      { label: 'Plotas', value: property.area ? `${property.area} m²` : '—' },
      { label: 'Aukštas', value: property.floor ?? '—' },
      { label: 'Tipas', value: translatePropertyType(property.type) },
    ],
    [property.rooms, property.area, property.floor, property.type]
  );

  const summaryMetrics = [
    { label: 'Mėnesinis mokestis', value: formatCurrency(tenant.monthlyRent), emphasis: true },
    { label: 'Depozitas', value: formatCurrency(tenant.deposit) },
    { label: 'Mokėjimo statusas', value: paymentStatusLabel },
    { label: 'Skola', value: formatCurrency(tenant.outstanding_amount ?? 0) },
  ];

  const moveOutNotice = moveOut?.notice || tenant.move_out_notice_date;
  const moveOutStatusLabel = useMemo(() => {
    if (moveOut?.status) return translateMoveOutStatus(moveOut.status);
    switch (tenant.tenant_response) {
      case 'wants_to_renew':
        return 'Nori pratęsti';
      case 'does_not_want_to_renew':
        return 'Nenori pratęsti';
      default:
        return 'Nepatvirtinta';
    }
  }, [moveOut?.status, tenant.tenant_response]);
  const moveOutPlanned = moveOut?.planned || tenant.planned_move_out_date;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-black/5 bg-white/90 p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-1 items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2F8481]/10">
              <User className="h-6 w-6 text-[#2F8481]" />
            </span>
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-2xl font-semibold text-black leading-tight">{tenant.name}</h3>
                <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${statusConfig.badge}`}>
                  {statusConfig.label}
                </span>
          </div>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-black/60">
                <span className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-black/40" />
                  {tenant.phone || '—'}
                </span>
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-black/40" />
                  Įsikėlė {formatDate(tenant.contractStart)}
                </span>
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-black/40" />
                  Sutarties pabaiga {formatDate(tenant.contractEnd)}
                </span>
              </div>
              {tenant.email && <p className="text-sm text-black/50 truncate">{tenant.email}</p>}
          </div>
        </div>
        
          <div className="grid w-full max-w-sm grid-cols-2 gap-3 text-sm">
            {summaryMetrics.map((metric) => (
              <div
                key={metric.label}
                className={`rounded-2xl border border-black/5 bg-white px-4 py-3 text-black ${metric.emphasis ? 'border-[#2F8481]/30 bg-[#2F8481]/10 text-[#2F8481]' : ''}`}
              >
                <p className={`text-xs uppercase tracking-[0.18em] ${metric.emphasis ? 'text-[#2F8481]/80' : 'text-black/50'}`}>{metric.label}</p>
                <p className={`mt-1 text-lg font-semibold ${metric.emphasis ? 'text-[#2F8481]' : 'text-black'}`}>{metric.value}</p>
            </div>
            ))}
            </div>
        </div>
      </section>

      <section className="rounded-3xl border border-black/5 bg-white/90 p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2F8481]/10">
            <Home className="h-5 w-5 text-[#2F8481]" />
          </span>
          <div>
            <h3 className="text-lg font-semibold text-black">Būsto informacija</h3>
            <p className="text-sm text-black/50">{property.address || 'Adresas nenurodytas'}</p>
        </div>
      </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-black/5 bg-white px-5 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-black/50">Objekto parametrai</p>
            <div className="mt-3 grid grid-cols-2 gap-4 text-sm text-black/70">
              {propertyMetrics.map((metric) => (
                <div key={metric.label} className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.18em] text-black/40">{metric.label}</p>
                  <p className="text-base font-semibold text-black">{metric.value}</p>
          </div>
              ))}
          </div>
        </div>
        
          <div className="rounded-2xl border border-black/5 bg-[#f7fbfb] px-5 py-4 text-sm text-black/70">
            <p className="text-xs uppercase tracking-[0.18em] text-black/50">Papildoma informacija</p>
            <div className="mt-3 space-y-3">
              <div className="flex items-center justify-between">
                <span>Būklė</span>
                <span className="font-semibold text-black">{translatePropertyStatus(property.status)}</span>
            </div>
              <div className="flex items-center justify-between">
                <span>Auto pratęsimas</span>
                <span className="font-semibold text-black">{tenant.auto_renewal_enabled ? 'Įjungta' : 'Išjungta'}</span>
            </div>
              <div className="flex items-center justify-between">
                <span>Pastabos</span>
                <span className="max-w-[220px] text-right text-black/60">
                  {tenant.tenant_response ? moveOutStatusLabel : '—'}
                </span>
            </div>
            </div>
        </div>
      </div>
      </section>

      <section className="rounded-3xl border border-black/5 bg-white/90 p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2F8481]/10">
            <Calendar className="h-5 w-5 text-[#2F8481]" />
          </span>
            <div>
            <h3 className="text-lg font-semibold text-black">Išsikraustymo planas</h3>
            <p className="text-sm text-black/50">Sekite planuojamus terminus ir veiksmus.</p>
            </div>
          </div>
          
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-black/5 bg-white px-4 py-3 text-sm text-black/70">
            <p className="text-xs uppercase tracking-[0.18em] text-black/50">Planuojama data</p>
            <p className="mt-2 text-base font-semibold text-black">{formatDate(moveOutPlanned)}</p>
              </div>
          <div className="rounded-2xl border border-black/5 bg-white px-4 py-3 text-sm text-black/70">
            <p className="text-xs uppercase tracking-[0.18em] text-black/50">Būsena</p>
            <p className="mt-2 text-base font-semibold text-black">{moveOutStatusLabel}</p>
        </div>
          <div className="rounded-2xl border border-black/5 bg-white px-4 py-3 text-sm text-black/70 md:col-span-1 md:flex md:flex-col">
            <p className="text-xs uppercase tracking-[0.18em] text-black/50">Pastabos</p>
            <p className="mt-2 flex-1 text-black/60">{moveOutNotice || 'Papildomų pastabų nėra.'}</p>
          </div>
          </div>
      </section>

      {ledgerLoading ? <LoadingCard message="Nuomos grafikas kraunamas..." /> : <RentLedgerCard entries={ledger} />}
      {depositLoading ? (
        <LoadingCard message="Depozito istorija kraunama..." />
      ) : (
        <DepositJournalCard
          events={depositEvents}
          nominalDeposit={nominalDeposit}
          onCreateEvent={onCreateDepositEvent}
        />
      )}
    </div>
  );
};

const LoadingCard: React.FC<{ message: string }> = ({ message }) => (
  <div className="rounded-3xl border border-dashed border-black/10 bg-white/60 p-6 text-sm text-black/50">
    {message}
  </div>
);

// --- Modern Property Tab ---
const PropertyTab: React.FC<{ property: PropertyInfo }> = ({ property }) => {
  return (
    <div className="space-y-6">
      <div className="bg-white border border-neutral-200 rounded-xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-[#2F8481]/10 rounded-lg flex items-center justify-center">
            <MapPin className="w-5 h-5 text-[#2F8481]" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-neutral-900">Būsto informacija</h3>
            <p className="text-sm text-neutral-500">Detali informacija apie būstą</p>
          </div>
        </div>
        
    <div className="space-y-4">
          <div className="flex justify-between items-center py-3 border-b border-neutral-100">
            <span className="text-sm text-neutral-600">Adresas</span>
            <span className="text-sm font-medium text-neutral-900">{property.address}</span>
            </div>
          
          {property.rooms !== undefined && (
            <div className="flex justify-between items-center py-3 border-b border-neutral-100">
              <span className="text-sm text-neutral-600">Kambarių skaičius</span>
              <span className="text-sm font-medium text-neutral-900">{property.rooms}</span>
            </div>
          )}
          
          {property.area !== undefined && (
            <div className="flex justify-between items-center py-3 border-b border-neutral-100">
              <span className="text-sm text-neutral-600">Bendras plotas</span>
              <span className="text-sm font-medium text-neutral-900">{property.area} m²</span>
            </div>
          )}
          
          {property.floor !== undefined && (
            <div className="flex justify-between items-center py-3 border-b border-neutral-100">
              <span className="text-sm text-neutral-600">Aukštas</span>
              <span className="text-sm font-medium text-neutral-900">{property.floor}</span>
            </div>
          )}
          
          {property.type && (
            <div className="flex justify-between items-center py-3 border-b border-neutral-100">
              <span className="text-sm text-neutral-600">Būsto tipas</span>
              <span className="text-sm font-medium text-neutral-900">{translatePropertyType(property.type)}</span>
            </div>
          )}
          
          {property.status && (
            <div className="flex justify-between items-center py-3">
              <span className="text-sm text-neutral-600">Būsena</span>
              <span className="text-sm font-medium text-neutral-900">{translatePropertyStatus(property.status)}</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Property Stats */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5">
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">Būsto charakteristikos</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {property.rooms !== undefined && (
            <div className="text-center p-3 bg-neutral-50 rounded-lg">
              <div className="text-2xl font-bold text-[#2F8481]">{property.rooms}</div>
              <div className="text-xs text-neutral-500">Kambariai</div>
            </div>
          )}
          {property.area !== undefined && (
            <div className="text-center p-3 bg-neutral-50 rounded-lg">
              <div className="text-2xl font-bold text-[#2F8481]">{property.area}</div>
              <div className="text-xs text-neutral-500">m²</div>
        </div>
          )}
          {property.floor !== undefined && (
            <div className="text-center p-3 bg-neutral-50 rounded-lg">
              <div className="text-2xl font-bold text-[#2F8481]">{property.floor}</div>
              <div className="text-xs text-neutral-500">Aukštas</div>
              </div>
          )}
          {property.type && (
            <div className="text-center p-3 bg-neutral-50 rounded-lg">
              <div className="text-lg font-semibold text-neutral-900">{translatePropertyType(property.type)}</div>
              <div className="text-xs text-neutral-500">Tipas</div>
            </div>
          )}
        </div>
      </div>
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
  return (
    <div className="space-y-6">
      <div className="bg-white border border-neutral-200 rounded-xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-[#2F8481]/10 rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-[#2F8481]" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-neutral-900">Dokumentai</h3>
            <p className="text-sm text-neutral-500">{documents.length} dokumentų</p>
          </div>
        </div>

        {documents.length > 0 ? (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#2F8481]/10 rounded-lg flex items-center justify-center">
                    <FileText className="w-4 h-4 text-[#2F8481]" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-neutral-900">{doc.name}</div>
                    <div className="text-xs text-neutral-500">{doc.type}</div>
                  </div>
                </div>
                {doc.uploadedAt && (
                  <div className="text-xs text-neutral-500">{formatDate(doc.uploadedAt)}</div>
                )}
              </div>
            ))}
                      </div>
                    ) : (
          <div className="text-center py-8">
            <div className="text-2xl text-neutral-300 mb-2">📄</div>
            <p className="text-neutral-500 text-sm">Dokumentų nėra</p>
          </div>
                    )}
                  </div>

      {/* Document Stats */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5">
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">Dokumentų statistika</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-neutral-50 rounded-lg">
            <div className="text-2xl font-bold text-[#2F8481]">{documents.length}</div>
            <div className="text-xs text-neutral-500">Iš viso dokumentų</div>
                    </div>
          <div className="text-center p-3 bg-neutral-50 rounded-lg">
            <div className="text-2xl font-bold text-[#2F8481]">
              {documents.filter(d => d.uploadedAt).length}
                      </div>
            <div className="text-xs text-neutral-500">Įkelti</div>
                  </div>
                </div>
                  </div>
                </div>
  );
};

// Extended Meter interface for this component
interface ExtendedMeter extends Meter {
  type?: string;
  previousReading?: number;
  currentReading?: number;
  tenantPhotoEnabled?: boolean;
  costPerApartment?: number;
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
  metersLoading?: boolean;
  onMetersRefresh?: () => void | Promise<void>;
  onTenantAssigned?: () => void | Promise<void>;
}

const TenantDetailModalPro: React.FC<TenantDetailModalProProps> = ({
  isOpen,
  onClose,
  tenant,
  property,
  moveOut,
  documents,
  addressInfo,
  meters,
  metersLoading = false,
  onMetersRefresh,
  onTenantAssigned
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const defaultTab = useMemo(() => (tenant.status === 'vacant' ? 'assign' : 'overview'), [tenant.status]);
  const [activeTab, setActiveTab] = useState(defaultTab);
  const { user } = useAuth();
  const [propertySnapshot, setPropertySnapshot] = useState<PropertyInfo>(property);
  const [ledgerEntries, setLedgerEntries] = useState<RentLedgerEntry[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [depositEvents, setDepositEvents] = useState<PropertyDepositEvent[]>([]);
  const [depositLoading, setDepositLoading] = useState(false);
  const [meterData, setMeterData] = useState<ExtendedMeter[]>([]);
  const invoiceDefaultValues = useMemo(() => {
    const rentAmount = propertySnapshot.rent ?? tenant.monthlyRent ?? 0;

    const utilitiesBreakdown = meterData
      .map((meter) => {
        const raw = meter.costPerApartment;
        const amount =
          typeof raw === 'number' ? raw : raw != null && !Number.isNaN(Number(raw)) ? Number(raw) : 0;
        return {
          label: meter.name ?? 'Komunalinis mokesčis',
          amount: Number(amount.toFixed(2))
        };
      })
      .filter((item) => item.amount > 0);

    const utilitiesAmount = utilitiesBreakdown.reduce((sum, item) => sum + item.amount, 0);

    const summary = [
      { label: 'Nuoma', amount: Number(rentAmount.toFixed(2)) },
      ...utilitiesBreakdown
    ];

    return {
      rent: Number(rentAmount.toFixed(2)),
      utilities: Number(utilitiesAmount.toFixed(2)),
      other: 0,
      summary
    };
  }, [propertySnapshot.rent, tenant.monthlyRent, meterData]);

  const mapApartmentMeterToExtendedMeter = useCallback((meter: any, latest?: {
    current_reading?: number | null;
    previous_reading?: number | null;
    reading_date?: string | null;
    price_per_unit?: number | null;
  }): ExtendedMeter => {
    const unitMap: Record<string, Meter['unit']> = {
      m3: 'm³',
      'm³': 'm³',
      kwh: 'kWh',
      kWh: 'kWh',
      gj: 'GJ',
      GJ: 'GJ'
    };

    const rawUnit = meter.unit ?? meter.unit_type;
    const unit = unitMap[rawUnit as keyof typeof unitMap] ?? 'Kitas';

    const statusCandidates: Array<Meter['status']> = ['ok', 'waiting', 'overdue'];
    const status = statusCandidates.includes(meter.status)
      ? (meter.status as Meter['status'])
      : (meter.require_reading || meter.requires_reading ? 'waiting' : 'ok');

    const resolveKind = (): Meter['kind'] => {
      const kind = meter.kind ?? meter.category ?? meter.type;
      if (
        kind === 'water_cold' ||
        kind === 'water_hot' ||
        kind === 'electricity' ||
        kind === 'heating' ||
        kind === 'gas' ||
        kind === 'ventilation' ||
        kind === 'shared'
      ) {
        return kind;
      }
      if (typeof kind === 'string' && kind.includes('water')) {
        return 'water_cold';
      }
      if (typeof kind === 'string' && kind.includes('electric')) {
        return 'electricity';
      }
      if (typeof kind === 'string' && kind.includes('heat')) {
        return 'heating';
      }
      if (typeof kind === 'string' && kind.includes('gas')) {
        return 'gas';
      }
      return 'shared';
    };

    const rawLastReading =
      latest?.current_reading ??
      meter.last_reading ??
      meter.current_reading ??
      meter.initial_reading ??
      meter.currentReading ??
      meter.lastReading ??
      null;

    const numericLastReading =
      typeof rawLastReading === 'number'
        ? rawLastReading
        : rawLastReading != null && !Number.isNaN(Number(rawLastReading))
          ? Number(rawLastReading)
          : null;

    const tenantValueRaw =
      meter.tenant_submitted_value ??
      meter.tenantSubmittedValue ??
      meter.tenant_submittedValue ??
      null;

    const tenantValue =
      typeof tenantValueRaw === 'number'
        ? tenantValueRaw
        : tenantValueRaw != null && !Number.isNaN(Number(tenantValueRaw))
          ? Number(tenantValueRaw)
          : numericLastReading;

    return {
      id: meter.id,
      name: meter.name ?? meter.custom_name ?? 'Skaitliukas',
      kind: resolveKind(),
      mode: meter.type === 'communal' ? 'Bendri' : 'Individualūs',
      unit,
      needsReading: Boolean(meter.require_reading ?? meter.requires_reading ?? meter.needsReading),
      needsPhoto: Boolean(meter.require_photo ?? meter.requires_photo ?? meter.needsPhoto),
      status,
      lastUpdatedAt: latest?.reading_date ?? meter.updated_at ?? meter.last_reading_date ?? meter.reading_date ?? undefined,
      value: numericLastReading,
      tenantSubmittedValue: tenantValue,
      tenantSubmittedAt: meter.tenant_submitted_at ?? meter.last_reading_date ?? latest?.reading_date ?? undefined,
      isApproved: Boolean(
        meter.isApproved ??
          meter.is_approved ??
          (status === 'ok' || meter.status === 'approved')
      ),
      hasWarning: Boolean(meter.hasWarning),
      isFixedMeter: Boolean(meter.isFixedMeter ?? meter.distribution_method === 'fixed_split'),
      isCommunalMeter: meter.type === 'communal',
      showPhotoRequirement: Boolean(meter.require_photo ?? meter.requires_photo),
      costPerApartment:
        typeof meter.cost_per_apartment === 'number'
          ? meter.cost_per_apartment
          : meter.cost_per_apartment != null && !Number.isNaN(Number(meter.cost_per_apartment))
            ? Number(meter.cost_per_apartment)
            : 0,
      price_per_unit:
        typeof latest?.price_per_unit === 'number'
          ? latest.price_per_unit
          : typeof meter.price_per_unit === 'number'
            ? meter.price_per_unit
            : meter.price_per_unit != null && !Number.isNaN(Number(meter.price_per_unit))
              ? Number(meter.price_per_unit)
              : undefined,
      fixed_price:
        typeof meter.fixed_price === 'number'
          ? meter.fixed_price
          : meter.fixed_price != null && !Number.isNaN(Number(meter.fixed_price))
            ? Number(meter.fixed_price)
            : undefined,
      distribution_method: meter.distribution_method ?? meter.distributionMethod ?? undefined,
      description: meter.description ?? meter.notes ?? '',
      previousReading:
        typeof latest?.previous_reading === 'number'
          ? latest.previous_reading
          : typeof meter.previous_reading === 'number'
            ? meter.previous_reading
            : meter.previous_reading != null && !Number.isNaN(Number(meter.previous_reading))
              ? Number(meter.previous_reading)
              : undefined,
      currentReading: numericLastReading ?? undefined,
      tenantPhotoEnabled: Boolean(meter.tenant_photo_enabled ?? meter.tenantPhotoEnabled)
    };
  }, []);

  const meterSummary = useMemo(() => {
    if (meterData.length === 0) {
      return {
        count: 0,
        needsReading: 0,
        needsPhoto: 0,
        pendingApproval: 0,
        totalCost: 0,
        okCount: 0
      };
    }

    const needsReading = meterData.filter((meter) => meter.needsReading).length;
    const needsPhoto = meterData.filter((meter) => meter.needsPhoto).length;
    const pendingApproval = meterData.filter((meter) => meter.tenantSubmittedValue && !meter.isApproved).length;
    const totalCost = meterData.reduce((sum, meter) => sum + (meter.costPerApartment || 0), 0);
    const okCount = meterData.length - (needsReading + needsPhoto);

    return {
      count: meterData.length,
      needsReading,
      needsPhoto,
      pendingApproval,
      totalCost,
      okCount: okCount < 0 ? 0 : okCount
    };
  }, [meterData]);
  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

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
  // handleSaveReading defined after fetchTenantMeters

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

  const handleUpdateMeterPricing = useCallback(
    async (
      meterId: string,
      payload: { price_per_unit?: number; fixed_price?: number; distribution_method?: string }
    ) => {
      try {
        const updatePayload: Record<string, unknown> = {
          updated_at: new Date().toISOString()
        };

        if (payload.price_per_unit !== undefined) {
          updatePayload.price_per_unit = payload.price_per_unit;
        }

        if (payload.fixed_price !== undefined) {
          updatePayload.fixed_price = payload.fixed_price;
        }

        if (payload.distribution_method !== undefined) {
          updatePayload.distribution_method = payload.distribution_method;
        }

        const { error } = await supabase
          .from('apartment_meters')
          .update(updatePayload)
          .eq('id', meterId);

        if (error) {
          throw error;
        }

        setMeterData((prev) =>
          prev.map((meter) =>
            meter.id === meterId
              ? {
                  ...meter,
                  price_per_unit:
                    payload.price_per_unit !== undefined ? payload.price_per_unit : meter.price_per_unit,
                  fixed_price: payload.fixed_price !== undefined ? payload.fixed_price : meter.fixed_price,
                  distribution_method:
                    payload.distribution_method !== undefined
                      ? payload.distribution_method
                      : meter.distribution_method
                }
              : meter
          )
        );

        if (onMetersRefresh) {
          await onMetersRefresh();
        }
      } catch (error) {
        console.error('❌ Failed to update meter pricing:', error);
        alert('Nepavyko išsaugoti tarifo. Bandykite dar kartą.');
      }
    },
    [onMetersRefresh]
  );

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

  const tabs = useMemo(() => {
    const baseTabs = [
      {
        id: 'assign',
        label: tenant.status === 'vacant' ? 'Pridėti nuomininką' : 'Pakvietimų istorija',
        icon: UserPlus
      },
    { id: 'overview', label: 'Apžvalga', icon: User },
    { id: 'property', label: 'Būstas', icon: Home },
    { id: 'meters', label: 'Komunaliniai', icon: Droplets },
    { id: 'documents', label: 'Dokumentai', icon: FileText }
  ];

    return baseTabs;
  }, [tenant.status]);

  const fetchTenantMeters = useCallback(
    async (propertyId: string) => {
      if (!propertyId) return;

      try {
        const [{ data: meters, error: metersError }, { data: readings, error: readingsError }] = await Promise.all([
          supabase
            .from('apartment_meters')
            .select('*')
            .eq('property_id', propertyId)
            .order('created_at', { ascending: true }),
          supabase
            .from('meter_readings')
            .select('meter_id, meter_type, current_reading, previous_reading, reading_date, price_per_unit')
            .eq('property_id', propertyId)
            .order('reading_date', { ascending: false })
        ]);

        if (metersError) {
          throw metersError;
        }

        if (readingsError) {
          throw readingsError;
        }

        type ReadingRow = NonNullable<typeof readings>[number];
        const latestByMeter = new Map<string, ReadingRow>();
        (readings ?? []).forEach((reading) => {
          if (!reading?.meter_id) return;
          if (!latestByMeter.has(reading.meter_id)) {
            latestByMeter.set(reading.meter_id, reading);
          }
        });

        const mappedMeters = (meters ?? []).map((meter) =>
          mapApartmentMeterToExtendedMeter(meter, latestByMeter.get(meter.id))
        );
        setMeterData(mappedMeters);
      } catch (fetchError) {
        console.error('❌ Failed to load tenant meters:', fetchError);
      }
    },
    [mapApartmentMeterToExtendedMeter]
  );

  useEffect(() => {
    void fetchTenantMeters(property.id);
  }, [fetchTenantMeters, property.id]);

  useEffect(() => {
    setPropertySnapshot(property);
  }, [property]);

  const refreshFinancials = useCallback(async () => {
    if (!property.id) return;

    setLedgerLoading(true);
    setDepositLoading(true);
    try {
      const [ledger, deposits] = await Promise.all([
        fetchRentLedger(property.id),
        fetchDepositEvents(property.id)
      ]);

      setLedgerEntries(ledger);
      setDepositEvents(deposits);
    } catch (error) {
      console.error('❌ Failed to load property financial data:', error);
    } finally {
      setLedgerLoading(false);
      setDepositLoading(false);
    }
  }, [property.id]);

  useEffect(() => {
    void refreshFinancials();
  }, [refreshFinancials]);

  const handlePropertyMutate = useCallback((updates: Partial<PropertyInfo>) => {
    setPropertySnapshot((prev) => ({ ...prev, ...updates }));
  }, []);

  const handlePropertyRefresh = useCallback(async () => {
    if (onTenantAssigned) {
      await onTenantAssigned();
    }
  }, [onTenantAssigned]);

  const handleCreateDepositJournalEntry = useCallback(
    async ({ eventType, amount, notes }: { eventType: PropertyDepositEvent['event_type']; amount: number; notes?: string }) => {
      if (!property.id) return;
      setDepositLoading(true);
      try {
        const baseline =
          depositEvents.length > 0 && depositEvents[0].balance_after !== null && depositEvents[0].balance_after !== undefined
            ? depositEvents[0].balance_after ?? 0
            : propertySnapshot.deposit_paid_amount ?? propertySnapshot.deposit_amount ?? 0;

        const newEvent = await createDepositEvent({
          propertyId: property.id,
          eventType,
          amount,
          notes,
          createdBy: user?.id ?? undefined,
          previousBalance: baseline
        });

        const nextBalance = newEvent?.balance_after ?? baseline ?? 0;
        if (newEvent) {
          setDepositEvents((prev) => [newEvent, ...prev]);
        }
        handlePropertyMutate({ deposit_paid_amount: nextBalance });
        await propertyApi.update(property.id, {
          deposit_paid_amount: nextBalance,
          deposit_paid: nextBalance > 0,
          deposit_returned: nextBalance <= 0
        });
      } catch (error) {
        console.error('❌ Failed to create deposit event:', error);
      } finally {
        setDepositLoading(false);
      }
    },
    [property.id, depositEvents, propertySnapshot.deposit_paid_amount, propertySnapshot.deposit_amount, user?.id, handlePropertyMutate]
  );

  const handleSaveReading = useCallback(async (meterId: string, reading: number) => {
    try {
      console.log('Saving reading for meter:', meterId, reading);

      const meterIndex = meterData.findIndex((m) => m.id === meterId);
      if (meterIndex === -1) {
        console.error('Meter not found:', meterId);
        return;
      }

      const meter = meterData[meterIndex] as ExtendedMeter;

      let isCommunalMeter = meter.mode === 'Bendri' || meter.isCommunalMeter;
      if (!isCommunalMeter) {
        if (
          meter.distribution_method === 'per_apartment' ||
          meter.distribution_method === 'per_area' ||
          meter.distribution_method === 'fixed_split'
        ) {
          isCommunalMeter = true;
        } else if (meter.distribution_method === 'per_consumption') {
          isCommunalMeter = false;
        } else {
          isCommunalMeter = meter.type === 'communal';
        }
      }

      const meterType = isCommunalMeter ? 'address' : 'apartment';
      const previousBaseline =
        typeof meter.currentReading === 'number'
          ? meter.currentReading
          : typeof meter.previousReading === 'number'
            ? meter.previousReading
            : 0;

      const readingDateIso = new Date().toISOString();
      const readingDate = readingDateIso.split('T')[0];

      const insertData = {
        property_id: property.id,
        meter_id: meterId,
        meter_type: meterType,
        type: mapMeterTypeToDatabase(meter.type || 'electricity'),
        reading_date: readingDate,
        current_reading: reading,
        previous_reading: previousBaseline,
        price_per_unit: meter.price_per_unit || 0,
        total_sum: (reading - previousBaseline) * (meter.price_per_unit || 0),
        amount: (reading - previousBaseline) * (meter.price_per_unit || 0),
        notes: isCommunalMeter
          ? 'Bendras skaitliukas - nuomotojo įvestas rodmuo'
          : 'Nuomotojo įvestas rodmuo'
      };

      const { error } = await supabase.from('meter_readings').insert(insertData);

      if (error) {
        console.error('Error saving reading:', error);
        alert('Klaida išsaugant rodmenį. Bandykite dar kartą.');
        return;
      }

      const updatedMeterData = [...meterData];
      (updatedMeterData[meterIndex] as ExtendedMeter).currentReading = reading;
      (updatedMeterData[meterIndex] as ExtendedMeter).previousReading = previousBaseline;
      (updatedMeterData[meterIndex] as ExtendedMeter).value = reading;
      (updatedMeterData[meterIndex] as ExtendedMeter).tenantSubmittedValue = reading;
      (updatedMeterData[meterIndex] as ExtendedMeter).lastUpdatedAt = readingDateIso;
      setMeterData(updatedMeterData);

      await fetchTenantMeters(property.id);
      await onMetersRefresh?.();

      console.log('✅ Reading saved successfully');
    } catch (error) {
      console.error('Error saving reading:', error);
      alert('Klaida išsaugant rodmenį. Bandykite dar kartą.');
    }
  }, [fetchTenantMeters, mapMeterTypeToDatabase, meterData, property.id, onMetersRefresh]);

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

        <PropertyQuickActionsBar
          property={propertySnapshot}
          tenant={tenant}
          ledger={ledgerEntries}
          currentUserId={user?.id ?? undefined}
          onFinancialsRefresh={refreshFinancials}
          onPropertyRefresh={handlePropertyRefresh}
          onPropertyMutate={handlePropertyMutate}
          invoiceDefaults={invoiceDefaultValues}
        />
        
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
                  className={`flex items-center gap-2 py-3 px-4 rounded-lg font-medium text-sm transition-colors ${
                    isActive
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
            <OverviewTab
              tenant={tenant}
              property={propertySnapshot}
              moveOut={moveOut}
              ledger={ledgerEntries}
              ledgerLoading={ledgerLoading}
              depositEvents={depositEvents}
              depositLoading={depositLoading}
              nominalDeposit={propertySnapshot.deposit_paid_amount ?? propertySnapshot.deposit_amount ?? tenant.deposit ?? 0}
              onCreateDepositEvent={handleCreateDepositJournalEntry}
            />
          )}
          {activeTab === 'property' && <PropertyTab property={property} />}
          {activeTab === 'meters' && (
            <div className="space-y-6">
              {metersLoading && meterData.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-black/10 bg-white p-10 text-sm text-black/60">
                  <Loader2 className="h-6 w-6 animate-spin text-[#2F8481]" />
                  <span className="mt-3">Skaitliukai kraunami...</span>
                </div>
              ) : (
                <>
                  <div className="bg-white border border-neutral-200 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-[#2F8481]/10 rounded-lg flex items-center justify-center">
                        <Droplets className="w-5 h-5 text-[#2F8481]" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-neutral-900">Komunaliniai skaitliukai</h3>
                        <p className="text-sm text-neutral-500">
                          {meterSummary.count} skaitliukų, {meterSummary.needsReading + meterSummary.needsPhoto} reikalauja dėmesio
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                      <SummaryTile label="Iš viso" value={meterSummary.count.toString()} tone="primary" />
                      <SummaryTile label="Reikia rodmens" value={meterSummary.needsReading.toString()} tone="amber" />
                      <SummaryTile label="Reikia foto" value={meterSummary.needsPhoto.toString()} tone="rose" />
                      <SummaryTile label="Laukia patvirtinimo" value={meterSummary.pendingApproval.toString()} tone="blue" />
                      <SummaryTile label="Tvarkingi" value={meterSummary.okCount.toString()} tone="emerald" />
                    </div>
                  </div>

                  <div className="bg-white border border-neutral-200 rounded-xl p-5">
                    <h3 className="text-lg font-semibold text-neutral-900 mb-4">Bendros išlaidos</h3>
                    <div className="text-center p-4 bg-[#2F8481]/10 rounded-lg">
                      <div className="text-3xl font-bold text-[#2F8481]">
                        {new Intl.NumberFormat('lt-LT', {
                          style: 'currency',
                          currency: 'EUR',
                          minimumFractionDigits: 2
                        }).format(meterSummary.totalCost)}
                      </div>
                      <div className="text-sm text-[#2F8481]">Bendros išlaidos (pagal pateiktus rodmenis)</div>
                    </div>
                  </div>
                </>
              )}

              {property.address_id && (
                <ApartmentMeterManager
                  propertyId={property.id}
                  addressId={property.address_id}
                  fallbackMeters={meterData}
                  onMetersUpdate={async () => {
                    await fetchTenantMeters(property.id);
                    await onMetersRefresh?.();
                  }}
                />
              )}
            </div>
          )}
          {activeTab === 'documents' && <DocumentsTab documents={documents} />}
          {activeTab === 'assign' && (
            <VacantAssignmentSection
              property={property}
              canInvite={tenant.status === 'vacant'}
              onRefresh={async () => {
                if (onTenantAssigned) {
                  await onTenantAssigned();
                }
              }}
            />
          )}
                          </div>
                        </div>
                    </div>
  );
};

const toneStyles: Record<'primary' | 'amber' | 'rose' | 'blue' | 'emerald', { bg: string; text: string }> = {
  primary: { bg: 'bg-[#2F8481]/10', text: 'text-[#2F8481]' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-600' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-600' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' }
};

const SummaryTile = ({ label, value, tone }: { label: string; value: string; tone: keyof typeof toneStyles }) => {
  const style = toneStyles[tone];
  return (
    <div className={`rounded-xl ${style.bg} p-4 text-center`}>
      <div className={`text-2xl font-bold ${style.text}`}>{value}</div>
      <div className="text-xs text-neutral-500">{label}</div>
                    </div>
  );
};

export default TenantDetailModalPro;







