import React, { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock";
import { useFocusTrap } from "../../utils/nuomotojas2Utils";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";

import { Tenant } from "../../types/tenant";
import { type Meter } from "../komunaliniai";
import { X, User, Home, FileText, Droplets, Phone, Calendar, Euro, MapPin, Camera, Clock, MessageSquare, Save, DoorOpen, Maximize2, Building2, Activity, Settings, Pencil, TrendingUp, Info } from 'lucide-react';
import { getMeterTypeLabel } from '../../constants/meterDistribution';
import { PremiumOverviewTab } from './PremiumOverviewTab';
import { OverviewWithLayoutEditor } from './OverviewWithLayoutEditor';
import { getApartmentMeters } from '../../lib/meterPriceApi';
import InviteTenantModal from './InviteTenantModal';
import { KomunaliniaiTab, adaptLegacyMeters } from './komunaliniai';
import ContractTerminationSection from './ContractTerminationSection';
import { UniversalAddMeterModal } from '../meters/UniversalAddMeterModal';
import ApartmentSettingsModal from '../properties/ApartmentSettingsModal';
import PhotoGallerySection from './PhotoGallerySection';
import LtDateInput from '../ui/LtDateInput';
import { ChevronDown, ChevronUp, ChevronRight, Check, Thermometer, Car, Sofa, Zap, Flame, Gauge, Fence, Warehouse, PawPrint, CigaretteOff, Wallet, Lock, UserPlus, AlertTriangle } from 'lucide-react';

// Type definitions for missing interfaces
interface PropertyInfo {
  id: string;
  address?: string;
  address_id?: string;
  rooms?: number;
  area?: number;
  floor?: number;
  type?: string;
  status?: string;
  under_maintenance?: boolean;
  rent?: number;
  deposit_amount?: number;
  extended_details?: Record<string, any>;
  property_type?: string;
}

interface MoveOut {
  notice?: string;
  planned?: string;
  status?: string;
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
const formatDate = (d?: string) => { if (!d) return '—'; const dt = new Date(d); return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`; };

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
  return dict[type?.toLowerCase() || ''] || type || 'ï¿½';
};

const translateStatus = (status?: string): string => {
  const dict: Record<string, string> = {
    'vacant': 'Laisvas',
    'occupied': 'Gyvenamas',
    'reserved': 'Rezervuotas',
    'maintenance': 'Remontas',
    'notice': 'Išsikraustymas suplanuotas',
    'notice_given': 'Išsikraustymas suplanuotas',
    'moved_out_pending': 'Laukia uždarymo',
    'active': 'Aktyvus',
    'expired': 'Baigï¿½si',
    'pending': 'Laukia',
    'none': ''
  };
  return dict[status?.toLowerCase() || ''] || status || 'ï¿½';
};

const formatValue = (value: any, unit?: string): string => {
  if (value === null || value === undefined || value === '' || value === 'none') return 'ï¿½';
  if (typeof value === 'number' && value === 0) return 'ï¿½';
  if (typeof value === 'string' && value.toLowerCase() === 'none') return 'ï¿½';
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
      return 'Pagal butų sk.';
    case 'per_area':
      return 'Pagal plotï¿½&';
    case 'per_person':
      return 'Pagal žmones';
    case 'per_consumption':
      return 'Pagal suvartojimï¿½&';
    case 'fixed_split':
      return 'Fiksuotas pasiskirstymas';
    default:
      return method || 'Pagal butų sk.';
  }
};

// Helper functions for meter calculations
const calculateMeterCost = (meter: any, apartmentCount: number = 1): number => {
  if (!meter) return 0;

  const distribution = meter.distribution_method || 'per_apartment';

  // Fixed split - fixed price divided among apartments
  if (distribution === 'fixed_split' || meter.unit === 'Kitas') {
    return (meter.fixed_price || 0) / apartmentCount;
  }

  // Meters with readings - calculate consumption
  const currentReading = meter.current_reading || meter.value || meter.tenantSubmittedValue || 0;
  const previousReading = meter.previous_reading || meter.previousReading || 0;
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
      // Per person - fallback to per_apartment at UI level
      // (actual person-based calculation happens in server-side calculateDistribution)
      return apartmentCount > 0 ? totalCost / apartmentCount : totalCost;

    case 'per_area':
      // Per area - fallback to per_apartment at UI level
      // (actual area-based calculation happens in server-side calculateDistribution)
      return apartmentCount > 0 ? totalCost / apartmentCount : totalCost;

    default:
      // Default: if individual meter, own consumption; otherwise split
      if (meter.type === 'individual' || meter.mode === 'Individualūs') {
        return totalCost;
      }
      return apartmentCount > 0 ? totalCost / apartmentCount : totalCost;
  }
};

const getMeterPriceDisplay = (meter: any): string => {
  if (!meter) return 'Nenustatyta';

  if (meter.unit === 'Kitas' || meter.distribution_method === 'fixed_split') {
    return `${meter.fixed_price || 0}ï¿½ï¿½/mï¿½n.`;
  }

  return `${meter.price_per_unit || 0}ï¿½ï¿½/${meter.unit}`;
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
    return 'Nï¿½ra rodmenų';
  }

  if (previousValue && currentValue > previousValue) {
    const difference = currentValue - previousValue;
    return `${currentValue} ${meter.unit} (ï¿½ nuo praï¿½jusio: +${difference})`;
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
    return 'Bus paskaiÄiuota pateikus rodmenis';
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
              <span className="text-sm text-neutral-600">Įsikï¿½limo data:</span>
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
              <span className="text-sm text-neutral-600">Mï¿½nesinis mokestis:</span>
              <span className="text-sm font-medium text-neutral-900">ï¿½ï¿½{tenant.monthlyRent}</span>
            </div>
            <div className="flex items-center gap-3">
              <Euro className="w-4 h-4 text-neutral-400" />
              <span className="text-sm text-neutral-600">Depozitas:</span>
              <span className="text-sm font-medium text-neutral-900">{tenant.deposit != null ? `€${tenant.deposit}` : '—'}</span>
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
            <p className="text-sm text-neutral-500">{property.address || 'ï¿½'}</p>
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

// =============================================================================
// PROPERTY TAB â€” Million-Dollar Premium Design
// =============================================================================

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  PROPERTY TAB â€” Premium Glass Design (matches PremiumOverviewTab)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// Glass surfaces
const ptSurface = 'bg-white/[0.08] backdrop-blur-md border border-white/[0.12] rounded-xl overflow-hidden';
const ptSurfaceHero = 'bg-white/[0.10] backdrop-blur-lg border border-white/[0.15] rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.12)] overflow-hidden';
const cardBgStyle: React.CSSProperties = {
  backgroundImage: `linear-gradient(135deg, rgba(15,20,25,0.88) 0%, rgba(20,25,30,0.85) 50%, rgba(15,20,25,0.88) 100%), url('/images/CardsBackground.webp')`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
};

// Typography
const ptHeading = 'text-[13px] font-bold text-white';
const ptSub = 'text-[11px] text-gray-400';
const ptTiny = 'text-[9px] text-gray-500';
const ptValue = 'text-[13px] font-bold text-white tabular-nums';
const ptValueLg = 'text-[18px] font-extrabold text-white tabular-nums';

// Inputs â€” dark glass theme
const ptInput = 'w-full px-3 py-2 bg-white/[0.06] border border-white/[0.10] rounded-lg text-[13px] text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-teal-500/40 focus:border-teal-500/40 transition-all hover:bg-white/[0.08] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';
const ptSelect = 'w-full px-3 py-2 bg-white/[0.06] border border-white/[0.10] rounded-lg text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-teal-500/40 focus:border-teal-500/40 transition-all hover:bg-white/[0.08] appearance-none cursor-pointer';
const ptLabel = 'block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5';

// ── Feature toggle config (static, never re-created) ──
const FEATURE_TOGGLES = [
  { key: 'balcony' as const, label: 'Balkonas', Icon: Fence },
  { key: 'storage' as const, label: 'Sandėliukas', Icon: Warehouse },
  { key: 'pets_allowed' as const, label: 'Gyvūnai', Icon: PawPrint },
  { key: 'smoking_allowed' as const, label: 'Rūkymas', Icon: CigaretteOff },
] as const;

// ── Shared handlers (stable references) ──
const preventWheel = (e: React.WheelEvent<HTMLInputElement>) => (e.target as HTMLInputElement).blur();

const PropertyTab: React.FC<{
  property: PropertyInfo;
  photos?: string[];
  tenant?: { name?: string; monthlyRent?: number; deposit?: number; contractStart?: string; contractEnd?: string; phone?: string; email?: string };
  onEditProperty?: () => void;
  onSaveProperty?: (updates: any) => Promise<void>;
  onUploadPhoto?: () => void;
  onDeletePhoto?: (index: number) => void;
  onReorderPhotos?: (photos: string[]) => void;
  onSetCover?: (index: number) => void;
}> = ({ property, photos = [], tenant, onEditProperty, onSaveProperty, onUploadPhoto, onDeletePhoto, onReorderPhotos, onSetCover }) => {
  const ext = (property as any).extended_details || {};
  const isOccupied = property.status === 'occupied' || property.status === 'rented';

  // â”€â”€ Form state â”€â”€
  const [formData, setFormData] = React.useState({
    rooms: property.rooms?.toString() || '',
    area: property.area?.toString() || '',
    floor: property.floor?.toString() || '',
    status: property.status || 'vacant',
    under_maintenance: (property as any).under_maintenance ?? false,
    type: property.type || 'apartment',
    bedrooms: ext.bedrooms?.toString() || '',
    bathrooms: ext.bathrooms?.toString() || '',
    balcony: ext.balcony ?? false,
    storage: ext.storage ?? false,
    parking_type: (ext.parking_type || 'none') as string,
    heating_type: ext.heating_type || '',
    furnished: ext.furnished || '',
    pets_allowed: ext.pets_allowed ?? false,
    smoking_allowed: ext.smoking_allowed ?? false,
    payment_due_day: ext.payment_due_day?.toString() || '1',
    min_term_months: ext.min_term_months?.toString() || '12',
    late_fee_grace_days: ext.late_fee_grace_days?.toString() || '5',
    late_fee_amount: ext.late_fee_amount?.toString() || '0',
    notes_internal: ext.notes_internal || '',
    rent: (property as any).rent?.toString() || '',
    deposit_amount: (property as any).deposit_amount?.toString() || '',
  });
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);
  const initialFormRef = React.useRef(formData);
  const isDirty = React.useMemo(() => {
    const i = initialFormRef.current;
    const f = formData;
    return f.rooms !== i.rooms || f.area !== i.area || f.floor !== i.floor ||
      f.status !== i.status || f.under_maintenance !== i.under_maintenance ||
      f.type !== i.type || f.bedrooms !== i.bedrooms ||
      f.bathrooms !== i.bathrooms || f.balcony !== i.balcony || f.storage !== i.storage ||
      f.parking_type !== i.parking_type || f.heating_type !== i.heating_type ||
      f.furnished !== i.furnished || f.pets_allowed !== i.pets_allowed ||
      f.smoking_allowed !== i.smoking_allowed || f.payment_due_day !== i.payment_due_day ||
      f.min_term_months !== i.min_term_months || f.late_fee_grace_days !== i.late_fee_grace_days ||
      f.late_fee_amount !== i.late_fee_amount || f.notes_internal !== i.notes_internal ||
      f.rent !== i.rent || f.deposit_amount !== i.deposit_amount;
  }, [formData]);

  // Reset form when property changes
  React.useEffect(() => {
    const newExt = (property as any).extended_details || {};
    setFormData({
      rooms: property.rooms?.toString() || '',
      area: property.area?.toString() || '',
      floor: property.floor?.toString() || '',
      status: property.status || 'vacant',
      under_maintenance: (property as any).under_maintenance ?? false,
      type: property.type || 'apartment',
      bedrooms: newExt.bedrooms?.toString() || '',
      bathrooms: newExt.bathrooms?.toString() || '',
      balcony: newExt.balcony ?? false,
      storage: newExt.storage ?? false,
      parking_type: (newExt.parking_type || 'none') as string,
      heating_type: newExt.heating_type || '',
      furnished: newExt.furnished || '',
      pets_allowed: newExt.pets_allowed ?? false,
      smoking_allowed: newExt.smoking_allowed ?? false,
      payment_due_day: newExt.payment_due_day?.toString() || '1',
      min_term_months: newExt.min_term_months?.toString() || '12',
      late_fee_grace_days: newExt.late_fee_grace_days?.toString() || '5',
      late_fee_amount: newExt.late_fee_amount?.toString() || '0',
      notes_internal: newExt.notes_internal || '',
      rent: (property as any).rent?.toString() || '',
      deposit_amount: (property as any).deposit_amount?.toString() || '',
    });
    // Reset dirty tracking
    initialFormRef.current = {
      rooms: property.rooms?.toString() || '',
      area: property.area?.toString() || '',
      floor: property.floor?.toString() || '',
      status: property.status || 'vacant',
      under_maintenance: (property as any).under_maintenance ?? false,
      type: property.type || 'apartment',
      bedrooms: newExt.bedrooms?.toString() || '',
      bathrooms: newExt.bathrooms?.toString() || '',
      balcony: newExt.balcony ?? false,
      storage: newExt.storage ?? false,
      parking_type: (newExt.parking_type || 'none') as string,
      heating_type: newExt.heating_type || '',
      furnished: newExt.furnished || '',
      pets_allowed: newExt.pets_allowed ?? false,
      smoking_allowed: newExt.smoking_allowed ?? false,
      payment_due_day: newExt.payment_due_day?.toString() || '1',
      min_term_months: newExt.min_term_months?.toString() || '12',
      late_fee_grace_days: newExt.late_fee_grace_days?.toString() || '5',
      late_fee_amount: newExt.late_fee_amount?.toString() || '0',
      notes_internal: newExt.notes_internal || '',
      rent: (property as any).rent?.toString() || '',
      deposit_amount: (property as any).deposit_amount?.toString() || '',
    };
  }, [property.id]);

  const updateField = <K extends keyof typeof formData>(field: K, value: typeof formData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = React.useCallback(async () => {
    console.log('[PropertyTab] handleSave called', { isDirty, hasOnSave: !!onSaveProperty });
    if (!onSaveProperty || !isDirty) return;
    setIsSaving(true);
    try {
      await onSaveProperty({
        rooms: formData.rooms ? parseInt(formData.rooms) : null,
        area: formData.area ? parseFloat(formData.area) : null,
        floor: formData.floor ? parseInt(formData.floor) : null,
        rent: formData.rent ? parseFloat(formData.rent) : null,
        deposit_amount: formData.deposit_amount ? parseFloat(formData.deposit_amount) : null,
        under_maintenance: formData.under_maintenance,
        property_type: formData.type,
        extended_details: {
          ...ext,
          bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : undefined,
          bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : undefined,
          balcony: formData.balcony,
          storage: formData.storage,
          parking_type: formData.parking_type,
          heating_type: formData.heating_type || undefined,
          furnished: formData.furnished || undefined,
          pets_allowed: formData.pets_allowed,
          smoking_allowed: formData.smoking_allowed,
          payment_due_day: formData.payment_due_day ? parseInt(formData.payment_due_day) : undefined,
          min_term_months: formData.min_term_months ? parseInt(formData.min_term_months) : undefined,
          late_fee_grace_days: formData.late_fee_grace_days ? parseInt(formData.late_fee_grace_days) : undefined,
          late_fee_amount: formData.late_fee_amount ? parseFloat(formData.late_fee_amount) : undefined,
          notes_internal: formData.notes_internal || undefined,
        },
      });
      console.log('[PropertyTab] Save payload sent successfully');
      // Update initialFormRef so isDirty resets correctly
      initialFormRef.current = { ...formData };
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (error) {
      console.error('Error saving property:', error);
    } finally {
      setIsSaving(false);
    }
  }, [formData, onSaveProperty, isDirty, ext]);

  // Contract helpers
  const contractEnd = tenant?.contractEnd ? new Date(tenant.contractEnd) : null;
  const contractStart = tenant?.contractStart ? new Date(tenant.contractStart) : null;
  const daysUntilEnd = contractEnd ? Math.ceil((contractEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
  const contractExpired = daysUntilEnd !== null && daysUntilEnd < 0;
  const contractEndingSoon = daysUntilEnd !== null && daysUntilEnd >= 0 && daysUntilEnd <= 30;
  const formatDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  // Financial calculations
  const monthlyRent = tenant?.monthlyRent ? Number(tenant.monthlyRent) : (property as any).rent ? Number((property as any).rent) : 0;
  const depositAmount = tenant?.deposit != null ? Number(tenant.deposit) : (property as any).deposit_amount != null ? Number((property as any).deposit_amount) : 0;
  const depositPaid = (property as any).deposit_paid_amount ? Number((property as any).deposit_paid_amount) : ((property as any).deposit_paid ? depositAmount : 0);
  const depositReturned = (property as any).deposit_returned ?? false;

  // Calculate months rented
  const monthsRented = React.useMemo(() => {
    if (!contractStart) return 0;
    const end = contractExpired ? contractEnd! : new Date();
    const diff = (end.getFullYear() - contractStart.getFullYear()) * 12 + (end.getMonth() - contractStart.getMonth());
    return Math.max(0, diff);
  }, [contractStart, contractEnd, contractExpired]);

  // Estimated total income (rent × months)
  const estimatedTotalIncome = monthlyRent * monthsRented;

  // Format currency
  const fmtCurrency = (v: number) => v > 0 ? `${v.toLocaleString('lt-LT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €` : '—';

  // ── Premium light theme tokens ──
  const ltCard = 'bg-white border border-gray-200/80 rounded-2xl shadow-sm overflow-hidden';
  const ltCardInner = 'bg-gray-50/40';
  const ltInput = 'w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-[13px] text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none shadow-sm';
  const ltSelect = 'w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all appearance-none cursor-pointer shadow-sm';
  const ltInputCompact = 'w-full px-2.5 py-2 bg-gray-50/50 border border-gray-300 rounded-lg text-[12px] font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 focus:bg-white transition-all shadow-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';
  const ltSelectCompact = 'w-full px-2.5 py-2 bg-gray-50/50 border border-gray-300 rounded-lg text-[12px] font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 focus:bg-white transition-all appearance-none cursor-pointer shadow-sm';
  const ltLabel = 'block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1';
  const ltSub = 'text-[11px] text-gray-500';
  const ltTiny = 'text-[9px] text-gray-400 font-medium';
  const ltValue = 'text-[14px] font-bold text-gray-800 tabular-nums';
  const NOTES_MAX_LENGTH = 500;

  // Section header — icon badge style
  const SectionHeader = ({ title, icon: Icon, badge }: { title: string; icon: React.FC<{ className?: string }>; badge?: React.ReactNode }) => (
    <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
          <Icon className="w-3.5 h-3.5 text-gray-500" />
        </div>
        <h3 className="text-[13px] font-bold text-gray-800">{title}</h3>
      </div>
      {badge}
    </div>
  );

  return (
    <div className="space-y-4 p-3">

      {/* ═══ 1. PHOTO GALLERY ═══ */}
      <PhotoGallerySection
        photos={photos}
        propertyId={property.id}
        onUploadPhoto={onUploadPhoto}
        onDeletePhoto={onDeletePhoto}
        onReorderPhotos={onReorderPhotos}
        onSetCover={onSetCover}
        isVacant={!isOccupied}
      />

      {/* ═══ 2. COMPREHENSIVE PROPERTY CARD ═══ */}
      <div className={ltCard}>

        {/* ── SECTION A: Pagrindiniai duomenys ── */}
        <div className="relative border-b border-gray-200/80 overflow-hidden">
          <img src="/images/CardsBackground.webp" alt="" className="absolute inset-0 w-full h-full object-cover opacity-[0.35] pointer-events-none" loading="lazy" />
          <div className="relative px-4 py-3">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-7 h-7 rounded-lg bg-teal-500/10 flex items-center justify-center">
                <Home className="w-3.5 h-3.5 text-teal-600" />
              </div>
              <h3 className="text-[13px] font-bold text-gray-900">Pagrindiniai duomenys</h3>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              <div>
                <label className={ltLabel}>Tipas</label>
                <div className="relative group">
                  <select value={formData.type} onChange={e => updateField('type', e.target.value)} className={ltSelectCompact}>
                    <option value="apartment">Butas</option>
                    <option value="house">Namas</option>
                    <option value="studio">Studija</option>
                    <option value="room">Kambarys</option>
                    <option value="commercial">Komercinė</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className={ltLabel}>Būsena</label>
                <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold ${property.status === 'occupied'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-gray-50 text-gray-600 border border-gray-200'
                  }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${property.status === 'occupied' ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                  {property.status === 'occupied' ? 'Išnuomotas' : 'Laisvas'}
                </div>
                <p className="text-[9px] text-gray-400 mt-0.5">Nustatoma automatiškai pagal nuomininką</p>
              </div>
              {/* Under maintenance toggle */}
              <div className="flex items-center gap-2 col-span-full mt-1">
                <button
                  type="button"
                  onClick={() => updateField('under_maintenance', !formData.under_maintenance)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 ${formData.under_maintenance ? 'bg-amber-500' : 'bg-gray-200'}`}
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${formData.under_maintenance ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
                <span className={`${ltTiny} ${formData.under_maintenance ? 'text-amber-600 font-semibold' : ''}`}>
                  Vyksta remontas
                </span>
              </div>
              <div>
                <label className={ltLabel}>Kambariai</label>
                <input type="number" inputMode="numeric" value={formData.rooms} onChange={e => updateField('rooms', e.target.value)} placeholder="—" min={1} className={ltInputCompact} onWheel={preventWheel} />
              </div>
              <div>
                <label className={ltLabel}>Plotas</label>
                <div className="relative">
                  <input type="number" inputMode="numeric" value={formData.area} onChange={e => updateField('area', e.target.value)} placeholder="—" className={`${ltInputCompact} pr-8`} onWheel={preventWheel} />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-gray-400">m²</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 mt-2">
              <div>
                <label className={ltLabel}>Aukštas</label>
                <input type="number" inputMode="numeric" value={formData.floor} onChange={e => updateField('floor', e.target.value)} placeholder="—" min={0} className={ltInputCompact} onWheel={preventWheel} />
              </div>
              <div>
                <label className={ltLabel}>Miegamieji</label>
                <input type="number" inputMode="numeric" value={formData.bedrooms} onChange={e => updateField('bedrooms', e.target.value)} placeholder="—" min={0} className={ltInputCompact} onWheel={preventWheel} />
              </div>
              <div>
                <label className={ltLabel}>Vonios</label>
                <input type="number" inputMode="numeric" value={formData.bathrooms} onChange={e => updateField('bathrooms', e.target.value)} placeholder="—" min={0} className={ltInputCompact} onWheel={preventWheel} />
              </div>
            </div>
          </div>
        </div>

        {/* ── SECTION B: Parametrai ir ypatybės ── */}
        <div className="px-4 py-3 border-b border-gray-200/80">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-7 h-7 rounded-lg bg-teal-500/10 flex items-center justify-center">
              <Settings className="w-3.5 h-3.5 text-teal-600" />
            </div>
            <h3 className="text-[13px] font-bold text-gray-900">Parametrai ir ypatybės</h3>
          </div>
          <div className="grid grid-cols-3 lg:grid-cols-3 gap-2 mb-3">
            <div>
              <label className={ltLabel}>Šildymas</label>
              <div className="relative group">
                <select value={formData.heating_type} onChange={e => updateField('heating_type', e.target.value)} className={ltSelectCompact}>
                  <option value="">Nepasirinkta</option>
                  <option value="centrinis">Centrinis</option>
                  <option value="dujinis">Dujinis</option>
                  <option value="elektra">Elektrinis</option>
                  <option value="grindinis">Grindinis</option>
                  <option value="kita">Kita</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className={ltLabel}>Įrengimas</label>
              <div className="relative group">
                <select value={formData.furnished} onChange={e => updateField('furnished', e.target.value)} className={ltSelectCompact}>
                  <option value="">Nepasirinkta</option>
                  <option value="full">Pilnai įrengtas</option>
                  <option value="partial">Dalinai įrengtas</option>
                  <option value="none">Be baldų</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className={ltLabel}>Parkavimas</label>
              <div className="relative group">
                <select value={formData.parking_type} onChange={e => updateField('parking_type', e.target.value)} className={ltSelectCompact}>
                  <option value="none">Nėra</option>
                  <option value="street">Gatvėje</option>
                  <option value="yard">Kieme</option>
                  <option value="underground">Požeminis</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
          {/* Feature toggles — compact inline row */}
          <div className="flex flex-wrap gap-1.5">
            {FEATURE_TOGGLES.map(({ key, label, Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => updateField(key, !formData[key])}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all duration-150 active:scale-[0.97] border ${formData[key]
                  ? 'bg-teal-50 text-teal-700 border-teal-200'
                  : 'bg-gray-50 text-gray-400 border-gray-200 hover:border-gray-300 hover:text-gray-500'
                  }`}
              >
                <div className={`w-4 h-4 rounded flex items-center justify-center ${formData[key] ? 'bg-teal-500 text-white' : 'bg-gray-200/60'}`}>
                  {formData[key] ? <Check className="w-2.5 h-2.5" /> : <Icon className="w-2.5 h-2.5 text-gray-400" />}
                </div>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── SECTION C: Nuomos sąlygos ── */}
        <div className="px-4 py-3 border-b border-gray-200/80">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-teal-500/10 flex items-center justify-center">
                <FileText className="w-3.5 h-3.5 text-teal-600" />
              </div>
              <h3 className="text-[13px] font-bold text-gray-900">Nuomos sąlygos</h3>
            </div>
            {!isOccupied ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium bg-gray-100 text-gray-500">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />Laisvas
              </span>
            ) : contractExpired ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium bg-red-50 text-red-600 ring-1 ring-red-100">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />Pasibaigusi
              </span>
            ) : contractEndingSoon ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium bg-amber-50 text-amber-600 ring-1 ring-amber-100">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />Baigiasi
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Aktyvi
              </span>
            )}
          </div>
          <p className="text-[10px] text-gray-400 mb-3 ml-[38px]">Nustatykite mokėjimo tvarką šiam būstui</p>

          {/* Settings row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Euro className="w-3 h-3 text-gray-400" />
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Nuoma</label>
              </div>
              <div className="relative">
                <input type="number" inputMode="numeric" value={formData.rent} onChange={e => updateField('rent', e.target.value)} placeholder="0" min={0} className={`${ltInputCompact} pr-12`} onWheel={e => (e.target as HTMLInputElement).blur()} />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-gray-400">€/mėn.</span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Euro className="w-3 h-3 text-gray-400" />
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Depozitas</label>
              </div>
              <div className="relative">
                <input type="number" inputMode="numeric" value={formData.deposit_amount} onChange={e => updateField('deposit_amount', e.target.value)} placeholder="0" min={0} className={`${ltInputCompact} pr-6`} onWheel={e => (e.target as HTMLInputElement).blur()} />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-gray-400">€</span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Calendar className="w-3 h-3 text-gray-400" />
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Mokėjimo diena</label>
              </div>
              <div className="relative">
                <input type="number" inputMode="numeric" value={formData.payment_due_day} onChange={e => updateField('payment_due_day', e.target.value)} placeholder="1" min={1} max={28} className={`${ltInputCompact} pr-8`} onWheel={e => (e.target as HTMLInputElement).blur()} />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-gray-400">d.</span>
              </div>
              <p className="text-[9px] text-gray-400 mt-1 leading-tight">Kiekvieną mėnesį iki šios dienos nuomininkas turi sumokėti nuomą</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Clock className="w-3 h-3 text-gray-400" />
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Min. terminas</label>
              </div>
              <div className="relative">
                <input type="number" inputMode="numeric" value={formData.min_term_months} onChange={e => updateField('min_term_months', e.target.value)} placeholder="12" min={1} className={`${ltInputCompact} pr-10`} onWheel={e => (e.target as HTMLInputElement).blur()} />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-gray-400">mėn.</span>
              </div>
              <p className="text-[9px] text-gray-400 mt-1 leading-tight">Trumpiausias galimas nuomos laikotarpis</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <AlertTriangle className="w-3 h-3 text-gray-400" />
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Baudos pradžia</label>
              </div>
              <div className="relative">
                <input type="number" inputMode="numeric" value={formData.late_fee_grace_days} onChange={e => updateField('late_fee_grace_days', e.target.value)} placeholder="5" min={0} max={30} className={`${ltInputCompact} pr-8`} onWheel={e => (e.target as HTMLInputElement).blur()} />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-gray-400">d.</span>
              </div>
              <p className="text-[9px] text-gray-400 mt-1 leading-tight">Po kiek dienų nuo mokėjimo termino pradedama skaičiuoti bauda</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Euro className="w-3 h-3 text-gray-400" />
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Vėlavimo bauda</label>
              </div>
              <div className="relative">
                <input type="number" inputMode="numeric" value={formData.late_fee_amount} onChange={e => updateField('late_fee_amount', e.target.value)} placeholder="10" min={0} step="0.5" className={`${ltInputCompact} pr-8`} onWheel={e => (e.target as HTMLInputElement).blur()} />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-gray-400">€</span>
              </div>
              <p className="text-[9px] text-gray-400 mt-1 leading-tight">Suma eurais, kuri pridedama už kiekvieną pavėluotą dieną</p>
            </div>
          </div>

          {/* Financial data when tenant is assigned */}
          {isOccupied && (
            <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-2">
              <div className="px-3 py-2 bg-teal-50/60 rounded-lg border border-teal-100/60">
                <p className="text-[8px] font-semibold text-gray-400 uppercase tracking-wider">Nuoma / mėn.</p>
                <p className={tenant?.monthlyRent ? 'text-[16px] font-extrabold text-gray-800 tabular-nums' : 'text-[16px] font-extrabold text-gray-300 tabular-nums'}>
                  {tenant?.monthlyRent ? `${Number(tenant.monthlyRent).toFixed(0)} €` : '—'}
                </p>
              </div>
              <div className="px-3 py-2 bg-gray-50 rounded-lg border border-gray-200/60">
                <p className="text-[8px] font-semibold text-gray-400 uppercase tracking-wider">Depozitas</p>
                <p className={tenant?.deposit != null ? 'text-[16px] font-extrabold text-gray-800 tabular-nums' : 'text-[16px] font-extrabold text-gray-300 tabular-nums'}>
                  {tenant?.deposit != null ? `${Number(tenant.deposit).toFixed(0)} €` : '—'}
                </p>
              </div>
              {contractStart && (
                <div className="px-3 py-2 bg-gray-50 rounded-lg border border-gray-200/60">
                  <p className="text-[8px] font-semibold text-gray-400 uppercase tracking-wider">Sutartis nuo</p>
                  <p className="text-[13px] font-bold text-gray-800 tabular-nums">{formatDate(contractStart)}</p>
                </div>
              )}
              {contractEnd && (
                <div className="px-3 py-2 bg-gray-50 rounded-lg border border-gray-200/60">
                  <p className="text-[8px] font-semibold text-gray-400 uppercase tracking-wider">Sutartis iki</p>
                  <p className={`text-[13px] font-bold tabular-nums ${contractExpired ? 'text-red-600' : contractEndingSoon ? 'text-amber-600' : 'text-gray-800'}`}>
                    {formatDate(contractEnd)}
                    {daysUntilEnd !== null && !contractExpired && (
                      <span className="text-gray-400 font-normal text-[10px] ml-1">({daysUntilEnd}d.)</span>
                    )}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Income summary — compact */}
          {isOccupied && monthlyRent > 0 && monthsRented > 0 && (
            <div className="mt-2 flex items-center gap-4 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100 text-center">
              <div className="flex-1">
                <p className="text-[8px] font-semibold text-gray-400 uppercase">Viso pajamų</p>
                <p className="text-[13px] font-bold text-emerald-600 tabular-nums">{fmtCurrency(estimatedTotalIncome)}</p>
              </div>
              <div className="w-px h-6 bg-gray-200" />
              <div className="flex-1">
                <p className="text-[8px] font-semibold text-gray-400 uppercase">Nuomota</p>
                <p className="text-[13px] font-bold text-gray-800 tabular-nums">{monthsRented} mėn.</p>
              </div>
              <div className="w-px h-6 bg-gray-200" />
              <div className="flex-1">
                <p className="text-[8px] font-semibold text-gray-400 uppercase">Metinės</p>
                <p className="text-[13px] font-bold text-gray-800 tabular-nums">{fmtCurrency(monthlyRent * 12)}</p>
              </div>
              {depositAmount > 0 && (
                <>
                  <div className="w-px h-6 bg-gray-200" />
                  <div className="flex-1 flex items-center justify-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${depositReturned ? 'bg-amber-500' : depositPaid > 0 ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                    <span className="text-[10px] font-medium text-gray-500">
                      {depositReturned ? 'Grąžintas' :
                        depositPaid >= depositAmount ? 'Sumokėtas' :
                          depositPaid > 0 ? 'Dalinis' :
                            'Nesumokėtas'}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Vacant hint */}
          {!isOccupied && (
            <div className="mt-3 flex items-start gap-2.5 px-3 py-2.5 bg-teal-50/40 rounded-lg border border-teal-100/50">
              <Info className="w-3.5 h-3.5 text-teal-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-medium text-teal-700">Šios sąlygos bus matomos nuomininkui</p>
                <p className="text-[9px] text-teal-600/70 mt-0.5">Kai priskirsite nuomininką, jis matys mokėjimo dieną ir minimalų terminą savo paskyroje</p>
              </div>
            </div>
          )}
        </div>

        {/* ── SECTION D: Pastabos ── */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-7 h-7 rounded-lg bg-teal-500/10 flex items-center justify-center">
              <Lock className="w-3.5 h-3.5 text-teal-600" />
            </div>
            <h3 className="text-[13px] font-bold text-gray-900">Vidinės pastabos</h3>
            <span className={`ml-auto text-[9px] tabular-nums ${formData.notes_internal.length > NOTES_MAX_LENGTH * 0.9 ? 'text-amber-500' : 'text-gray-300'}`}>
              {formData.notes_internal.length}/{NOTES_MAX_LENGTH}
            </span>
          </div>
          <textarea
            value={formData.notes_internal}
            onChange={e => {
              if (e.target.value.length <= NOTES_MAX_LENGTH) {
                updateField('notes_internal', e.target.value);
              }
            }}
            placeholder="Pastabos apie šį būstą (matomos tik jums)..."
            rows={2}
            className={`${ltInputCompact} resize-none min-h-[56px]`}
          />
        </div>
      </div>

      {/* ═══ SAVE — sticky at bottom ═══ */}
      <div className="sticky bottom-0 z-10 -mx-3 px-3 pt-3 pb-3">
        <button
          onClick={handleSave}
          disabled={isSaving || !isDirty}
          className={`w-full flex items-center justify-center gap-2 py-3 text-[13px] font-bold rounded-xl transition-all duration-200 shadow-lg ${saveSuccess
            ? 'bg-emerald-500 text-white ring-1 ring-emerald-400'
            : isDirty
              ? 'bg-teal-500 text-white hover:bg-teal-600 active:scale-[0.995] shadow-[0_4px_14px_rgba(20,184,166,0.35)]'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
            }`}
        >
          {saveSuccess ? (
            <><Check className="w-4 h-4" />Išsaugota!</>
          ) : isSaving ? (
            <><Save className="w-4 h-4 animate-pulse" />Saugoma...</>
          ) : (
            <><Save className="w-4 h-4" />{isDirty ? 'Išsaugoti pakeitimus' : 'Nėra pakeitimų'}</>
          )}
        </button>
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
    console.log('MetersTab received meters:', meters);
    console.log('Meter pricing data:', meters.map((m: any) => ({
      name: m.name,
      price_per_unit: m.price_per_unit,
      fixed_price: m.fixed_price,
      unit: m.unit
    })));

    // Konvertuojame duomenis į naują formatą - naudojame meters prop tiesiogiai
    const meterData: Meter[] = useMemo(() =>
      meters.map((meter: any) => {
        console.log('Processing meter:', meter.name, 'requires_photo:', meter.requires_photo, 'mode:', meter.mode);

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
        case 'per_apartment': return 'Pagal butų sk.';
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
                {sortedMeters.length} skaitliukų — {formatCurrency(totalCosts.total)}
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
              <div className="text-3xl text-neutral-300 mb-3"></div>
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
  const getMeterIcon = (name: string): React.ReactNode => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('elektra') || lowerName.includes('elektros')) return <Zap className="w-4 h-4" />;
    if (lowerName.includes('vanduo') || lowerName.includes('šaltas') || lowerName.includes('karštas')) return <Droplets className="w-4 h-4" />;
    if (lowerName.includes('šildymas') || lowerName.includes('šiluma')) return <Flame className="w-4 h-4" />;
    if (lowerName.includes('dujos') || lowerName.includes('dujų')) return <Flame className="w-4 h-4" />;
    return <Gauge className="w-4 h-4" />;
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
              <div className="text-xs text-neutral-600 mb-1">—</div>
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
  const getMeterIcon = (name: string): React.ReactNode => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('elektra') || lowerName.includes('elektros')) return <Zap className="w-4 h-4" />;
    if (lowerName.includes('vanduo') || lowerName.includes('šaltas') || lowerName.includes('karštas')) return <Droplets className="w-4 h-4" />;
    if (lowerName.includes('šildymas') || lowerName.includes('šiluma')) return <Flame className="w-4 h-4" />;
    if (lowerName.includes('dujos') || lowerName.includes('dujų')) return <Flame className="w-4 h-4" />;
    return <Gauge className="w-4 h-4" />;
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
              <div className="text-xs text-neutral-600 mb-1">—</div>
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



// --- History & Archive Tab ---
const DOCUMENT_TYPES = [
  { value: 'contract', label: 'Nuomos sutartis' },
  { value: 'handover', label: 'Perdavimo aktas' },
  { value: 'invoice', label: 'Sąskaita' },
  { value: 'receipt', label: 'Kvitas' },
  { value: 'photo', label: 'Nuotrauka' },
  { value: 'other', label: 'Kita' },
] as const;

const getDocTypeLabel = (type: string) => DOCUMENT_TYPES.find(t => t.value === type)?.label || type;

const formatFileSize = (bytes: number | null | undefined) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat('lt-LT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(v);

interface PropertyDocument {
  id: string;
  property_id: string;
  name: string;
  type: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  storage_path: string;
  notes: string | null;
  created_at: string;
}

interface InvoiceRecord {
  id: string;
  invoice_number: string | null;
  invoice_date: string | null;
  due_date: string | null;
  amount: number;
  rent_amount: number | null;
  utilities_amount: number | null;
  status: string;
  paid_date: string | null;
  period_start: string | null;
  period_end: string | null;
  line_items: any[] | null;
  created_at: string;
}

interface TenantHistoryRecord {
  id: string;
  tenant_name: string;
  tenant_email: string | null;
  tenant_phone: string | null;
  rent: number | null;
  contract_start: string | null;
  contract_end: string | null;
  end_reason: string | null;
  notes: string | null;
  created_at: string;
}

// Section header with collapse toggle
const SectionHeader: React.FC<{
  icon: React.ReactNode;
  title: string;
  count: number;
  isOpen: boolean;
  onToggle: () => void;
  iconBg?: string;
  action?: React.ReactNode;
}> = ({ icon, title, count, isOpen, onToggle, iconBg = 'bg-teal-500/15', action }) => (
  <div className="flex items-center justify-between">
    <button onClick={onToggle} className="flex items-center gap-3 group flex-1 min-w-0">
      <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}>
        {icon}
      </div>
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-[13px] font-bold text-white">{title}</span>
        <span className="text-[11px] text-gray-300 bg-black/30 px-1.5 py-0.5 rounded-md font-semibold">{count}</span>
      </div>
      <ChevronDown className={`w-4 h-4 text-gray-300 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
    </button>
    {action && <div className="flex-shrink-0 ml-2">{action}</div>}
  </div>
);

const INVOICE_STATUS_MAP: Record<string, { label: string; dot: string; text: string }> = {
  paid: { label: 'Apmokėta', dot: 'bg-emerald-500', text: 'text-emerald-400' },
  unpaid: { label: 'Neapmokėta', dot: 'bg-amber-500', text: 'text-amber-400' },
  overdue: { label: 'Pradelsta', dot: 'bg-red-500', text: 'text-red-400' },
  cancelled: { label: 'Atšaukta', dot: 'bg-gray-500', text: 'text-gray-400' },
};

const END_REASON_MAP: Record<string, string> = {
  expired: 'Sutartis pasibaigė',
  moved_out: 'Išsikraustė',
  evicted: 'Iškeldinta',
  mutual: 'Abipusiu susitarimu',
  other: 'Kita',
};

interface HistoryTabProps {
  propertyId: string;
  currentTenant?: {
    name?: string;
    email?: string;
    phone?: string;
    monthlyRent?: number | string;
    contractStart?: string;
    contractEnd?: string;
    status?: string;
  };
}

const HistoryTab: React.FC<HistoryTabProps> = ({ propertyId, currentTenant }) => {
  // --- State ---
  const [pastTenants, setPastTenants] = useState<TenantHistoryRecord[]>([]);
  const [docs, setDocs] = useState<PropertyDocument[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState('other');
  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Collapsible sections
  const [tenantsOpen, setTenantsOpen] = useState(true);
  const [invoicesOpen, setInvoicesOpen] = useState(true);
  const [docsOpen, setDocsOpen] = useState(true);

  // --- Fetch all data ---
  const fetchAll = useCallback(async () => {
    setIsLoading(true);

    const [tenantsRes, docsRes, invoicesRes] = await Promise.all([
      // Tenant history
      supabase
        .from('tenant_history')
        .select('*')
        .eq('property_id', propertyId)
        .order('contract_end', { ascending: false }),

      // Documents
      supabase
        .from('property_documents')
        .select('*')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false }),

      // Invoices
      supabase
        .from('invoices')
        .select('id, invoice_number, invoice_date, due_date, amount, rent_amount, utilities_amount, status, paid_date, period_start, period_end, line_items, created_at')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false }),
    ]);

    if (!tenantsRes.error && tenantsRes.data) setPastTenants(tenantsRes.data as TenantHistoryRecord[]);
    if (!docsRes.error && docsRes.data) setDocs(docsRes.data as PropertyDocument[]);
    if (!invoicesRes.error && invoicesRes.data) setInvoices(invoicesRes.data as InvoiceRecord[]);

    setIsLoading(false);
  }, [propertyId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // --- Upload file ---
  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Failas per didelis. Maksimalus dydis: 10 MB');
      return;
    }
    setIsUploading(true);
    setUploadError(null);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      const ext = file.name.split('.').pop() || '';
      const storagePath = `${propertyId}/${Date.now()}_${file.name}`;

      const { error: storageError } = await supabase.storage
        .from('property-documents')
        .upload(storagePath, file, { cacheControl: '3600', upsert: false });
      if (storageError) throw new Error(storageError.message);

      const { error: dbError } = await supabase
        .from('property_documents')
        .insert({
          property_id: propertyId,
          name: file.name.replace(`.${ext}`, ''),
          type: selectedType,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type || null,
          storage_path: storagePath,
          uploaded_by: userId,
        });
      if (dbError) {
        await supabase.storage.from('property-documents').remove([storagePath]);
        throw new Error(dbError.message);
      }
      setSelectedType('other');
      await fetchAll();
    } catch (err: any) {
      setUploadError(err.message || 'Klaida įkeliant dokumentą');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [propertyId, selectedType, fetchAll]);

  // --- Download ---
  const handleDownload = useCallback(async (doc: PropertyDocument) => {
    const { data, error } = await supabase.storage
      .from('property-documents')
      .createSignedUrl(doc.storage_path, 60 * 5);
    if (error || !data?.signedUrl) { alert('Klaida: nepavyko gauti failo nuorodos'); return; }
    window.open(data.signedUrl, '_blank');
  }, []);

  // --- Delete doc ---
  const handleDeleteDoc = useCallback(async (doc: PropertyDocument) => {
    if (!confirm(`Ar tikrai norite ištrinti „${doc.name}"?`)) return;
    await supabase.storage.from('property-documents').remove([doc.storage_path]);
    await supabase.from('property_documents').delete().eq('id', doc.id);
    await fetchAll();
  }, [fetchAll]);

  // --- Loading ---
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-400" />
        <span className="ml-3 text-white/60 text-sm">Kraunama istorija...</span>
      </div>
    );
  }

  const isVacant = !currentTenant?.name || currentTenant.name === 'Laisvas' || currentTenant.status === 'vacant';
  const tenantCount = pastTenants.length + (isVacant ? 0 : 1);

  return (
    <div className="space-y-5 pb-4">

      {/* ─── SECTION 1: Tenant History ─── */}
      <div className="bg-white/[0.04] border border-white/[0.10] rounded-xl p-4">

        <div>
          <SectionHeader
            icon={<User className="w-4 h-4 text-teal-400" />}
            title="Nuomininkų istorija"
            count={tenantCount}
            isOpen={tenantsOpen}
            onToggle={() => setTenantsOpen(!tenantsOpen)}
          />

          {tenantsOpen && (
            <div className="mt-3 space-y-2">
              {/* Current tenant */}
              {!isVacant && currentTenant && (
                <div className="relative flex items-center justify-between p-3 rounded-lg overflow-hidden" style={{ backgroundImage: 'url(/images/CardsBackground.webp)', backgroundSize: 'cover', backgroundPosition: 'center' }}>

                  <div className="relative z-10 flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-teal-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-semibold text-gray-800 truncate">{currentTenant.name}</span>
                        <span className="text-[9px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-medium">Dabartinis</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-500 mt-0.5">
                        {currentTenant.contractStart && (
                          <span>Nuo {(() => { const d = new Date(currentTenant.contractStart); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })()}</span>
                        )}
                        {currentTenant.contractEnd && (
                          <><span>•</span><span>Iki {(() => { const d = new Date(currentTenant.contractEnd); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })()}</span></>
                        )}
                        {currentTenant.monthlyRent && (
                          <><span>•</span><span>{fmtCurrency(Number(currentTenant.monthlyRent))}/mėn.</span></>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Past tenants */}
              {pastTenants.map(t => (
                <div key={t.id} className="relative flex items-center justify-between p-3 rounded-lg overflow-hidden" style={{ backgroundImage: 'url(/images/CardsBackground.webp)', backgroundSize: 'cover', backgroundPosition: 'center' }}>

                  <div className="relative z-10 flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-gray-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-semibold text-gray-800 truncate">{t.tenant_name}</span>
                        {t.end_reason && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded-full">
                            {END_REASON_MAP[t.end_reason] || t.end_reason}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-500 mt-0.5">
                        {t.contract_start && (
                          <span>{(() => { const d = new Date(t.contract_start); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })()}</span>
                        )}
                        {t.contract_end && (
                          <><span>→</span><span>{(() => { const d = new Date(t.contract_end); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })()}</span></>
                        )}
                        {t.rent && (
                          <><span>•</span><span>{fmtCurrency(Number(t.rent))}/mėn.</span></>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Empty state */}
              {tenantCount === 0 && (
                <div className="flex flex-col items-center py-6 text-center">
                  <User className="w-8 h-8 text-white/30 mb-2" />
                  <p className="text-[11px] text-white/60">Nuomininkų istorijos dar nėra</p>
                  <p className="text-[10px] text-white/40 mt-1">Buvę nuomininkai bus rodomi čia</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── SECTION 2: Invoice Archive ─── */}
      <div className="bg-white/[0.04] border border-white/[0.10] rounded-xl p-4">

        <div>
          <SectionHeader
            icon={<Euro className="w-4 h-4 text-amber-400" />}
            title="Sąskaitų archyvas"
            count={invoices.length}
            isOpen={invoicesOpen}
            onToggle={() => setInvoicesOpen(!invoicesOpen)}
            iconBg="bg-amber-500/20"
          />

          {invoicesOpen && (
            <div className="mt-3 space-y-2">
              {invoices.length === 0 ? (
                <div className="flex flex-col items-center py-6 text-center">
                  <Euro className="w-8 h-8 text-white/30 mb-2" />
                  <p className="text-[11px] text-white/60">Sąskaitų dar nėra</p>
                  <p className="text-[10px] text-white/40 mt-1">Sukurtos sąskaitos bus rodomos čia</p>
                </div>
              ) : (
                invoices.map(inv => {
                  const st = INVOICE_STATUS_MAP[inv.status] || INVOICE_STATUS_MAP.unpaid;
                  const isExpanded = expandedInvoice === inv.id;
                  return (
                    <div key={inv.id} className="relative rounded-lg overflow-hidden" style={{ backgroundImage: 'url(/images/CardsBackground.webp)', backgroundSize: 'cover', backgroundPosition: 'center' }}>

                      <button
                        onClick={() => setExpandedInvoice(isExpanded ? null : inv.id)}
                        className="relative z-10 w-full flex items-center justify-between p-3 hover:bg-gray-50/50 transition-colors text-left"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Euro className="w-4 h-4 text-amber-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-[12px] font-medium text-gray-800 truncate">
                              {inv.invoice_number ? `Sąskaita ${inv.invoice_number}` : 'Sąskaita'}
                              {inv.period_start && inv.period_end && (
                                <span className="text-gray-500 font-normal ml-1.5">
                                  ({(() => { const d = new Date(inv.period_start); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; })()} – {(() => { const d = new Date(inv.period_end); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; })()})
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] mt-0.5">
                              <span className="flex items-center gap-1">
                                <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                                <span className={st.text}>{st.label}</span>
                              </span>
                              {inv.invoice_date && (
                                <span className="text-gray-500">{(() => { const d = new Date(inv.invoice_date); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })()}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          <span className="text-[13px] font-bold text-gray-800 tabular-nums">{fmtCurrency(Number(inv.amount || 0))}</span>
                          <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="relative z-10 px-3 pb-3 border-t border-gray-200/60">
                          <div className="grid grid-cols-2 gap-3 mt-3 mb-3">
                            {inv.rent_amount != null && Number(inv.rent_amount) > 0 && (
                              <div>
                                <span className="text-[10px] text-gray-500 block">Nuoma</span>
                                <span className="text-[12px] font-semibold text-gray-800">{fmtCurrency(Number(inv.rent_amount))}</span>
                              </div>
                            )}
                            {inv.utilities_amount != null && Number(inv.utilities_amount) > 0 && (
                              <div>
                                <span className="text-[10px] text-gray-500 block">Komunaliniai</span>
                                <span className="text-[12px] font-semibold text-gray-800">{fmtCurrency(Number(inv.utilities_amount))}</span>
                              </div>
                            )}
                            {inv.due_date && (
                              <div>
                                <span className="text-[10px] text-gray-500 block">Mokėti iki</span>
                                <span className="text-[12px] text-gray-800">{(() => { const d = new Date(inv.due_date); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })()}</span>
                              </div>
                            )}
                            {inv.paid_date && (
                              <div>
                                <span className="text-[10px] text-gray-500 block">Apmokėta</span>
                                <span className="text-[12px] text-emerald-600">{(() => { const d = new Date(inv.paid_date); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })()}</span>
                              </div>
                            )}
                          </div>
                          {inv.line_items && inv.line_items.length > 0 && (
                            <div className="mt-2">
                              <span className="text-[10px] text-gray-500 block mb-1.5">Eilutės</span>
                              <div className="space-y-1">
                                {inv.line_items.map((item: any, idx: number) => (
                                  <div key={idx} className="flex items-center justify-between py-1 px-2 bg-gray-100/60 rounded-md">
                                    <span className="text-[11px] text-gray-600 truncate flex-1">{item.description || 'Paslauga'}</span>
                                    <span className="text-[11px] font-medium text-gray-800 ml-2 tabular-nums">{fmtCurrency(Number(item.amount || 0))}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── SECTION 3: Uploaded Documents ─── */}
      <div className="bg-white/[0.04] border border-white/[0.10] rounded-xl p-4">

        <div>
          <SectionHeader
            icon={<FileText className="w-4 h-4 text-cyan-400" />}
            title="Įkelti dokumentai"
            count={docs.length}
            isOpen={docsOpen}
            onToggle={() => setDocsOpen(!docsOpen)}
            iconBg="bg-cyan-500/20"
            action={
              <div className="flex items-center gap-2">
                <select
                  value={selectedType}
                  onChange={e => setSelectedType(e.target.value)}
                  className="px-2 py-1 bg-black/30 border border-white/[0.15] rounded-lg text-[10px] text-white appearance-none cursor-pointer"
                >
                  {DOCUMENT_TYPES.map(t => (
                    <option key={t.value} value={t.value} className="bg-neutral-800 text-white">{t.label}</option>
                  ))}
                </select>
                <input ref={fileInputRef} type="file" className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp" onChange={handleUpload} />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-[11px] font-medium disabled:opacity-50"
                >
                  {isUploading ? (
                    <><div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" /> Įkeliama...</>
                  ) : (
                    <><FileText className="w-3.5 h-3.5" /> Įkelti</>
                  )}
                </button>
              </div>
            }
          />

          {uploadError && <p className="text-red-400 text-[11px] mt-2 px-1">{uploadError}</p>}

          {docsOpen && (
            <div className="mt-3 space-y-2">
              {docs.length === 0 ? (
                <div className="flex flex-col items-center py-6 text-center">
                  <FileText className="w-8 h-8 text-white/30 mb-2" />
                  <p className="text-[11px] text-white/60">Nėra įkeltų dokumentų</p>
                  <p className="text-[10px] text-white/40 mt-1">Spauskite „Įkelti" norėdami pridėti sutartis, aktus ar kitus failus</p>
                </div>
              ) : (
                docs.map(doc => (
                  <div key={doc.id} className="relative flex items-center justify-between p-3 rounded-lg overflow-hidden" style={{ backgroundImage: 'url(/images/CardsBackground.webp)', backgroundSize: 'cover', backgroundPosition: 'center' }}>

                    <div className="relative z-10 flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-8 h-8 bg-cyan-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-cyan-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[12px] font-medium text-gray-800 truncate">{doc.name}</div>
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                          <span>{getDocTypeLabel(doc.type)}</span>
                          {doc.file_size && <><span>•</span><span>{formatFileSize(doc.file_size)}</span></>}
                        </div>
                      </div>
                    </div>
                    <div className="relative z-10 flex items-center gap-2 flex-shrink-0 ml-2">
                      <span className="text-[10px] text-gray-500">{(() => { const d = new Date(doc.created_at); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })()}</span>
                      <button onClick={() => handleDownload(doc)}
                        className="text-[11px] text-teal-600 hover:text-teal-700 font-medium transition-colors">Atsisiųsti</button>
                      <button onClick={() => handleDeleteDoc(doc)}
                        className="text-red-400/60 hover:text-red-400 transition-colors" title="Ištrinti">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
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
  addressInfo?: any;
  meters: MeterItem[];
  onPropertyUpdated?: () => void;
}

const TenantDetailModalPro: React.FC<TenantDetailModalProProps> = ({
  isOpen,
  onClose,
  tenant,
  property,
  moveOut,
  addressInfo,
  meters,
  onPropertyUpdated
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const { user } = useAuth();
  const [meterData, setMeterData] = useState<ExtendedMeter[]>([]);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [propertyNotes, setPropertyNotes] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);
  const [showAddMeter, setShowAddMeter] = useState(false);

  // Track tab views and property open
  useEffect(() => {
    if (!isOpen || !property?.id) return;
    const tabLabels: Record<string, string> = {
      overview: 'Apžvalga',
      property: 'Būstas',
      komunaliniai: 'Komunaliniai',
      documents: 'Dokumentai',
      financials: 'Finansai',
    };
    const label = tabLabels[activeTab] || activeTab;
    import('../../lib/activityTracker').then(({ trackActivity }) => {
      trackActivity('VIEW', {
        tableName: activeTab === 'komunaliniai' ? 'meters' : activeTab === 'documents' ? 'property_documents' : 'properties',
        recordId: property.id,
        description: `Peržiūrėjo skiltį: ${label}`,
      });
    });
  }, [activeTab, isOpen, property?.id]);



  // Tenant last login
  const [tenantLastLogin, setTenantLastLogin] = useState<string | null>(null);

  // Fetch tenant's last sign-in via secure RPC (reads auth.users.last_sign_in_at)
  useEffect(() => {
    const fetchLastLogin = async () => {
      if (!isOpen || !tenant?.email) return;
      try {
        const { data, error } = await supabase
          .rpc('get_tenant_last_sign_in', { tenant_email: tenant.email });
        if (!error && data) {
          setTenantLastLogin(data);
        }
      } catch (e) {
        // Non-critical — silently fail
      }
    };
    fetchLastLogin();
  }, [isOpen, tenant?.email]);

  // Tenant avatar URL
  const [tenantAvatarUrl, setTenantAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchAvatar = async () => {
      if (!isOpen || !tenant?.email) return;
      try {
        // Get user_id from users table, then avatar from profiles
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('email', tenant.email)
          .maybeSingle();
        if (!userData?.id) return;

        const { data: profileData } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', userData.id)
          .maybeSingle();
        if (profileData?.avatar_url) {
          setTenantAvatarUrl(profileData.avatar_url);
        }
      } catch {
        // Non-critical
      }
    };
    fetchAvatar();
  }, [isOpen, tenant?.email]);

  // Photo upload state
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [propertyPhotos, setPropertyPhotos] = useState<string[]>(tenant.photos || []);

  // Document count for overview KPI tile
  const [documentCount, setDocumentCount] = useState(0);
  useEffect(() => {
    if (!property.id) return;
    supabase
      .from('property_documents')
      .select('id', { count: 'exact', head: true })
      .eq('property_id', property.id)
      .then(({ count }) => setDocumentCount(count ?? 0));
  }, [property.id]);

  // Modal states for actions
  const [isTenantModalOpen, setIsTenantModalOpen] = useState(false);
  const [isLeaseModalOpen, setIsLeaseModalOpen] = useState(false);
  const [isEditPropertyModalOpen, setIsEditPropertyModalOpen] = useState(false);
  const [isUnitDrawerOpen, setIsUnitDrawerOpen] = useState(false);

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
      console.log('ï¿½S& Notes saved successfully');
      setIsNotesModalOpen(false);
    } catch (error) {
      console.error('Error saving notes:', error);
      alert('Klaida išsaugant pastabas. Bandykite dar kartï¿½&.');
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

        console.log('ï¿½S& Photos uploaded successfully:', uploadedUrls.length);
      }
    } catch (error) {
      console.error('Error uploading photos:', error);
      alert('Klaida įkeliant nuotraukas. Bandykite dar kartï¿½&.');
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
    console.log('ï¿½xï¿½ Photos reordered:', newPhotos.length);
  }, [property.id]);

  // Handle deleting a photo
  const handleDeletePhoto = useCallback((index: number) => {
    const newPhotos = propertyPhotos.filter((_, i) => i !== index);
    setPropertyPhotos(newPhotos);
    localStorage.setItem(`property_photos_${property.id}`, JSON.stringify(newPhotos));
    console.log('ï¿½xï¸ Photo deleted at index:', index);
  }, [property.id, propertyPhotos]);

  // Handle setting a photo as cover (move to first position)
  const handleSetCover = useCallback((index: number) => {
    if (index === 0) return; // Already cover
    const newPhotos = [...propertyPhotos];
    const [photo] = newPhotos.splice(index, 1);
    newPhotos.unshift(photo);
    setPropertyPhotos(newPhotos);
    localStorage.setItem(`property_photos_${property.id}`, JSON.stringify(newPhotos));
    console.log('â­ Photo set as cover from index:', index);
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

      console.log('ï¿½S& Tenant added successfully');
      setIsTenantModalOpen(false);
      // Would need to refresh data here in real implementation
      alert('Nuomininkas pridï¿½tas sï¿½kmingai!');
    } catch (error) {
      console.error('Error adding tenant:', error);
      alert('Klaida pridï¿½dant nuomininku. Bandykite dar kartï¿½&.');
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

      console.log('ï¿½S& Lease created successfully');
      setIsLeaseModalOpen(false);
      alert('Sutartis sukurta sï¿½kmingai!');
    } catch (error) {
      console.error('Error creating lease:', error);
      alert('Klaida kuriant sutarti. Bandykite dar kart&.');
    }
  }, [leaseForm, property.id]);

  const handleEditProperty = useCallback(() => {
    setActiveTab('property');
  }, []);

  // Save handler for ApartmentSettingsModal
  const handleDrawerSaveProperty = useCallback(async (updates: any) => {
    console.log('[handleDrawerSaveProperty] called with', { propertyId: property.id, updates });
    try {
      const { error, count } = await supabase
        .from('properties')
        .update(updates)
        .eq('id', property.id)
        .select('id')
        .then(res => ({ error: res.error, count: res.data?.length ?? 0 }));

      if (error) throw error;
      if (count === 0) {
        console.error('[handleDrawerSaveProperty] No rows updated — likely RLS policy blocking');
        throw new Error('Nepavyko išsaugoti — nėra prieigos teisių');
      }
      console.log('[handleDrawerSaveProperty] Property updated in DB, calling onPropertyUpdated');
      // Refresh parent data so UI reflects saved values
      onPropertyUpdated?.();
    } catch (error) {
      console.error('Error saving property:', error);
      throw error;
    }
  }, [property.id, onPropertyUpdated]);

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

      console.log('S& Property updated successfully');
      setIsEditPropertyModalOpen(false);
      alert('Būsto duomenys atnaujinti skmingai!');
    } catch (error) {
      console.error('Error updating property:', error);
      alert('Klaida atnaujinant būsto duomenis. Bandykite dar kart&.');
    }
  }, [propertyForm, property.id]);

  const handleAddPayment = useCallback(() => {
    // Navigate to payments or show payment modal
    alert('Mokjimo pridjimo funkcija bus pridta atskirame modulyje.');
  }, []);

  // Initialize meterData with meters prop when component mounts or meters change
  useEffect(() => {
    if (meters && meters.length > 0) {
      const initialMeterData: ExtendedMeter[] = meters.map((meter: any) => ({
        id: meter.id,
        kind: meter.type as any,
        name: meter.name,
        mode: meter.mode || 'Individualūs',
        unit: meter.unit || 'mÂ³',
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
        currentReading: meter.currentReading || undefined,
        tenantPhotoEnabled: meter.tenantPhotoEnabled || false
      }));
      setMeterData(initialMeterData);
      console.log('S& Initialized meterData with', initialMeterData.length, 'meters');
    }
  }, [meters]);

  // Fetch meters from address_meters if meters prop is empty
  useEffect(() => {
    const fetchAddressMeters = async () => {
      if (isOpen && property?.id && meters.length === 0) {
        try {
          console.log('x Fetching address meters for property:', property.id);
          const addressMeters = await getApartmentMeters(property.id);

          if (addressMeters && addressMeters.length > 0) {
            const convertedMeters: ExtendedMeter[] = addressMeters.map((meter: any) => ({
              id: meter.id,
              kind: meter.type as any,
              name: meter.name,
              mode: meter.type === 'communal' ? 'Bendri' : 'Individualūs',
              unit: meter.unit || 'mÂ³',
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
            console.log('S& Loaded', convertedMeters.length, 'meters from address settings');
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

  // Handle adding new meters from UniversalAddMeterModal
  const handleAddMeters = useCallback(async (metersFormData: any[]) => {
    if (!property?.address_id) return;
    try {
      for (const meterForm of metersFormData) {
        const meterName = meterForm.label || meterForm.title || meterForm.custom_name || '';
        const meterType = meterForm.mode === 'individual' ? 'individual' : 'communal';
        const unit = (meterForm.unit === 'custom' ? 'Kitas' : meterForm.unit) || 'm3';

        const { error } = await supabase
          .from('address_meters')
          .insert({
            address_id: property.address_id,
            name: meterName,
            type: meterType,
            unit,
            price_per_unit: meterForm.price_per_unit || 0,
            fixed_price: meterForm.fixed_price || null,
            distribution_method: meterForm.allocation || 'per_apartment',
            description: meterForm.notes || '',
            requires_photo: meterForm.requires_photo || false,
            is_active: true,
          });

        if (error) {
          console.error('Error adding meter:', error);
        }
      }

      // Refresh meter data from address_meters
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
      }

      setShowAddMeter(false);
    } catch (err) {
      console.error('Error in handleAddMeters:', err);
    }
  }, [property?.address_id, property?.id]);

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
        difference: (reading - (meter.previousReading || 0)),
        price_per_unit: meter.price_per_unit || 0, // Required field
        total_sum: (reading - (meter.previousReading || 0)) * (meter.price_per_unit || 0),
        amount: (reading - (meter.previousReading || 0)) * (meter.price_per_unit || 0),
        notes: isCommunalMeter ? 'Bendras skaitliukas - nuomotojo įvestas rodmuo' : 'Nuomotojo įvestas rodmuo'
      };

      console.log('ðŸ“Š Inserting meter reading data:', insertData);
      console.log('ðŸ“Š Is communal meter:', isCommunalMeter);
      console.log('ðŸ“Š Meter type:', meterType);
      console.log('ðŸ“Š Property object:', property);

      // Update the meter reading in the database
      const { data, error } = await supabase
        .from('meter_readings')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('âŒ Error saving reading:', error);
        console.error('âŒ Error code:', error.code, 'Message:', error.message, 'Details:', error.details);
        return;
      }

      console.log('âœ… Reading saved successfully, DB returned:', data);

      // Update local state
      const updatedMeterData = [...meterData];
      (updatedMeterData[meterIndex] as ExtendedMeter).currentReading = reading;
      (updatedMeterData[meterIndex] as ExtendedMeter).value = reading;
      (updatedMeterData[meterIndex] as ExtendedMeter).tenantSubmittedValue = reading;
      setMeterData(updatedMeterData);

      console.log('âœ… Local state updated for meter:', meterId);
      // Remove the alert - it's causing the persistent notification issue

    } catch (error) {
      console.error('Error saving reading:', error);
      alert('Klaida išsaugant rodmenį. Bandykite dar kart&.');
    }
  }, [meterData, property.id]);

  const handleRequestPhoto = useCallback(async (meterId: string) => {
    try {
      console.log('Requesting photo for meter:', meterId);

      // Here you would typically send a notification to the tenant
      // For now, we'll just log it
      alert('Nuomininkui išsiųstas prašymas pateikti nuotrauk&');

    } catch (error) {
      console.error('Error requesting photo:', error);
      alert('Klaida siunÄiant prašym&. Bandykite dar kart&.');
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
        alert('Klaida gaunant istorij&. Bandykite dar kart&.');
        return;
      }

      // Show history in a modal or navigate to history page
      console.log('Meter history:', data);
      alert(`Rasta ${data?.length || 0} rodmenų istorijoje`);

    } catch (error) {
      console.error('Error loading history:', error);
      alert('Klaida gaunant istorij&. Bandykite dar kart&.');
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
      alert('Klaida siunÄiant prašymus. Bandykite dar kart&.');
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
        alert('Klaida patvirtinant rodmenį. Bandykite dar kart&.');
        return;
      }

      // Update local state
      const updatedMeterData = [...meterData];
      (updatedMeterData[meterIndex] as ExtendedMeter).isApproved = true;
      setMeterData(updatedMeterData);

      console.log('S& Reading approved successfully');
      alert('Rodmuo skmingai patvirtintas!');

    } catch (error) {
      console.error('Error approving reading:', error);
      alert('Klaida patvirtinant rodmenį. Bandykite dar kart&.');
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
        alert('Klaida atnaujinant rodmenį. Bandykite dar kart&.');
        return;
      }

      // Update local state
      const updatedMeterData = [...meterData];
      (updatedMeterData[meterIndex] as ExtendedMeter).currentReading = newValue;
      (updatedMeterData[meterIndex] as ExtendedMeter).value = newValue;
      (updatedMeterData[meterIndex] as ExtendedMeter).tenantSubmittedValue = newValue;
      setMeterData(updatedMeterData);

      console.log('S& Reading updated successfully');

    } catch (error) {
      console.error('Error editing reading:', error);
      alert('Klaida atnaujinant rodmenį. Bandykite dar kart&.');
    }
  }, [meterData]);

  const handleSendWarning = useCallback(async (meterId: string) => {
    try {
      console.log('Sending warning for meter:', meterId);

      // Here you would typically send a warning notification to the tenant
      // For now, we'll just log it
      alert('Nuomininkui išsiųstas įspjimas');

    } catch (error) {
      console.error('Error sending warning:', error);
      alert('Klaida siunÄiant įspjim&. Bandykite dar kart&.');
    }
  }, []);

  const tabs = [
    { id: 'overview', label: 'Apžvalga', icon: User },
    { id: 'property', label: 'Būstas', icon: Home },
    { id: 'meters', label: 'Komunaliniai', icon: Droplets },
    { id: 'documents', label: 'Istorija', icon: FileText },
  ];

  if (!isOpen) return null;

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tenant-modal-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />

        <div
          ref={modalRef}
          className="relative rounded-2xl shadow-2xl max-w-[1000px] w-[96vw] h-[90vh] grid grid-rows-[auto_auto_1fr] overflow-hidden"
          style={{
            background: `linear-gradient(135deg, rgba(0, 0, 0, 0.45) 0%, rgba(20, 20, 20, 0.30) 50%, rgba(0, 0, 0, 0.45) 100%), url('/images/ModalBackground.png')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 border-b border-white/10 px-6 py-4 flex items-center justify-between bg-neutral-900/60 backdrop-blur-sm">
            <div>
              <h2 id="tenant-modal-title" className="text-xl font-semibold text-white">
                {tenant.status === 'vacant' ? `Butas ${tenant.apartmentNumber}` : tenant.name}
              </h2>
              <p className="text-sm text-gray-400">
                {property.address}
                {tenant.status === 'vacant' && <span className="ml-2 text-gray-500">• Laisvas</span>}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-white transition-colors"
                aria-label="Uždaryti"
              >
                <X className="size-5" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-white/10 px-6">
            <nav className="flex space-x-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 py-3 px-4 rounded-lg font-medium text-sm transition-colors ${isActive
                      ? 'bg-teal-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-white/10'
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
          <div className="overflow-y-auto p-6" style={{ willChange: 'scroll-position', transform: 'translateZ(0)' }}>
            {activeTab === 'overview' && (
              <OverviewWithLayoutEditor
                property={{
                  ...property,
                  rent: property.rent,
                  deposit_amount: property.deposit_amount,
                }}
                tenant={{
                  name: tenant?.name,
                  phone: tenant?.phone,
                  email: tenant?.email,
                  status: tenant?.status,
                  contractStart: tenant?.contractStart,
                  contractEnd: tenant?.contractEnd,
                  monthlyRent: tenant?.monthlyRent,
                  deposit: tenant?.deposit ?? undefined,
                  paymentDay: 1,
                  overdue: tenant?.outstanding_amount || 0,
                  lastSignIn: tenantLastLogin || undefined,
                  avatarUrl: tenantAvatarUrl || undefined,
                }}
                photos={propertyPhotos}
                meters={meterData}
                documents={new Array(documentCount)}

                canEditLayout={true}
                onAddTenant={handleAddTenant}
                onViewTenant={() => setActiveTab('documents')}
                onSetPrice={() => setActiveTab('property')}
                onSetDeposit={() => setActiveTab('property')}
                onUploadPhoto={handleUploadPhoto}
                onManagePhotos={() => setActiveTab('property')}
                onOpenSettings={handleEditProperty}
                onNavigateTab={(tab) => setActiveTab(tab === 'komunaliniai' ? 'meters' : tab === 'dokumentai' ? 'documents' : tab === 'bustas' ? 'property' : tab)}
                onDeletePhoto={handleDeletePhoto}
                onReorderPhotos={handleReorderPhotos}
                onSetCover={handleSetCover}
                onPropertyUpdated={onPropertyUpdated}
              />
            )}
            {activeTab === 'property' && <PropertyTab property={property} photos={propertyPhotos} tenant={tenant ? { name: tenant.name, monthlyRent: tenant.monthlyRent ? parseFloat(String(tenant.monthlyRent)) : undefined, deposit: tenant.deposit ? parseFloat(String(tenant.deposit)) : undefined, contractStart: tenant.contractStart, contractEnd: tenant.contractEnd, phone: tenant.phone, email: tenant.email } : undefined} onEditProperty={handleEditProperty} onSaveProperty={handleDrawerSaveProperty} onUploadPhoto={handleUploadPhoto} onDeletePhoto={handleDeletePhoto} onReorderPhotos={handleReorderPhotos} onSetCover={handleSetCover} />}

            {activeTab === 'meters' && (
              <KomunaliniaiTab
                propertyId={property.id}
                addressId={property.address_id}
                meters={adaptLegacyMeters(meterData)}
                onAddMeter={() => setShowAddMeter(true)}
                onCollectReadings={() => handleRequestMissing(meterData.filter(m => m.needsPhoto || m.needsReading).map(m => m.id))}
                onSaveReadings={async (readings) => {
                  for (const r of readings) {
                    await handleSaveReading(r.meterId, r.value);
                  }
                }}
                onSavePreviousReadings={async (updates) => {
                  for (const u of updates) {
                    try {
                      // Find the latest reading for this meter and update previous_reading
                      const { data: latestReading, error: fetchErr } = await supabase
                        .from('meter_readings')
                        .select('id, current_reading, price_per_unit')
                        .eq('meter_id', u.meterId)
                        .order('reading_date', { ascending: false })
                        .limit(1)
                        .maybeSingle();

                      if (fetchErr) {
                        console.error('Error fetching latest reading:', fetchErr);
                        continue;
                      }

                      if (latestReading) {
                        // Update the existing reading with new previous reading
                        const consumption = (latestReading.current_reading || 0) - u.previousReading;
                        const totalSum = consumption * (latestReading.price_per_unit || 0);

                        const { error: updateErr } = await supabase
                          .from('meter_readings')
                          .update({
                            previous_reading: u.previousReading,
                            difference: consumption,
                            total_sum: totalSum,
                            amount: totalSum,
                          })
                          .eq('id', latestReading.id);

                        if (updateErr) {
                          console.error('Error updating previous reading:', updateErr);
                        } else {
                          console.log(`âœ… Updated previous reading for meter ${u.meterId} to ${u.previousReading}`);
                          // Update local state
                          const idx = meterData.findIndex(m => m.id === u.meterId);
                          if (idx !== -1) {
                            const updated = [...meterData];
                            (updated[idx] as any).previousReading = u.previousReading;
                            setMeterData(updated);
                          }
                        }
                      } else {
                        // No readings exist yet — create initial reading entry to seed history
                        const meterConfig = meterData.find(m => m.id === u.meterId);
                        const { error: insertErr } = await supabase
                          .from('meter_readings')
                          .insert({
                            property_id: property.id,
                            meter_id: u.meterId,
                            meter_type: meterConfig?.isCommunalMeter ? 'address' : 'apartment',
                            type: mapMeterTypeToDatabase(meterConfig?.type || 'electricity'),
                            reading_date: new Date().toISOString().split('T')[0],
                            current_reading: 0,
                            previous_reading: u.previousReading,
                            difference: 0,
                            price_per_unit: meterConfig?.price_per_unit || 0,
                            total_sum: 0,
                            amount: 0,
                            notes: 'Pradinis rodmuo — nuomotojo įvestas',
                          });
                        if (insertErr) {
                          console.error(`Error creating initial reading for ${u.meterId}:`, insertErr);
                        } else {
                          console.log(`✅ Created initial reading for meter ${u.meterId}: ${u.previousReading}`);
                          const idx = meterData.findIndex(m => m.id === u.meterId);
                          if (idx !== -1) {
                            const updated = [...meterData];
                            (updated[idx] as any).previousReading = u.previousReading;
                            setMeterData(updated);
                          }
                        }
                      }
                    } catch (err) {
                      console.error('Error saving previous reading:', err);
                    }
                  }
                }}
              />
            )}
            {activeTab === 'documents' && (
              <>
                <HistoryTab propertyId={property.id} currentTenant={{ name: tenant.name, email: tenant.email, phone: tenant.phone, monthlyRent: tenant.monthlyRent, contractStart: tenant.contractStart, contractEnd: tenant.contractEnd, status: tenant.status }} />
                {/* Contract termination section */}
                {tenant && (
                  <div className="mt-4">
                    <ContractTerminationSection
                      propertyId={property.id}
                      onTerminationChange={onPropertyUpdated}
                    />
                  </div>
                )}
              </>
            )}
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
                    <h3 className="text-lg font-semibold text-neutral-900">Vidinï¿½s pastabos</h3>
                    <p className="text-sm text-neutral-500">Komentarai apie būstï¿½&</p>
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
                placeholder="Įveskite pastabas apie būstï¿½&... (pvz., remonto istorija, ypatingi nuomininko pageidavimai, svarbi informacija)"
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

        {/* Add Meter Modal */}
        <UniversalAddMeterModal
          isOpen={showAddMeter}
          onClose={() => setShowAddMeter(false)}
          onAddMeters={handleAddMeters}
          existingMeterNames={meterData.map(m => m.name)}
          title="Pridėti skaitliuką"
          allowMultiple={true}
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
                    <LtDateInput
                      value={leaseForm.startDate}
                      onChange={(e) => setLeaseForm(prev => ({ ...prev, startDate: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2F8481]/20 focus:border-[#2F8481]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Pabaigos data</label>
                    <LtDateInput
                      value={leaseForm.endDate}
                      onChange={(e) => setLeaseForm(prev => ({ ...prev, endDate: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2F8481]/20 focus:border-[#2F8481]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Nuomos kaina (ï¿½ï¿½/mï¿½n) *</label>
                  <input
                    type="number"
                    value={leaseForm.monthlyRent}
                    onChange={(e) => setLeaseForm(prev => ({ ...prev, monthlyRent: e.target.value }))}
                    placeholder="500"
                    className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2F8481]/20 focus:border-[#2F8481]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Depozitas (ï¿½ï¿½)</label>
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
    </>
  );
};

export default TenantDetailModalPro;







