import React, { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock";
import { useFocusTrap } from "../../utils/nuomotojas2Utils";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";

import { Tenant } from "../../types/tenant";
import { type Meter } from "../komunaliniai";
import { X, User, Home, FileText, Droplets, Phone, Calendar, Euro, MapPin, Camera, Clock } from 'lucide-react';
import { getMeterTypeLabel } from '../../constants/meterDistribution';

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
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                tenant.status === 'active' ? 'bg-emerald-50 text-emerald-700' :
                tenant.status === 'expired' ? 'bg-rose-50 text-rose-700' :
                'bg-amber-50 text-amber-700'
              }`}>
                {tenant.status === 'active' ? 'Aktyvus' : 
                 tenant.status === 'expired' ? 'Baigėsi' : 'Laukia'}
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
            <p className="text-sm text-neutral-500">{property.address}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {property.rooms !== undefined && (
            <div className="text-center">
              <div className="text-2xl font-bold text-[#2F8481]">{property.rooms}</div>
              <div className="text-xs text-neutral-500">Kambariai</div>
            </div>
          )}
          {property.area !== undefined && (
            <div className="text-center">
              <div className="text-2xl font-bold text-[#2F8481]">{property.area}</div>
              <div className="text-xs text-neutral-500">m²</div>
            </div>
          )}
          {property.floor !== undefined && (
            <div className="text-center">
              <div className="text-2xl font-bold text-[#2F8481]">{property.floor}</div>
              <div className="text-xs text-neutral-500">Aukštas</div>
            </div>
          )}
          {property.type && (
            <div className="text-center">
              <div className="text-lg font-semibold text-neutral-900">{property.type}</div>
              <div className="text-xs text-neutral-500">Tipas</div>
            </div>
          )}
        </div>
      </div>

      {/* Move Out Info (if applicable) */}
      {moveOut.status && (
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
            {moveOut.notice && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-neutral-600">Pateikto prašymo data:</span>
                <span className="text-sm font-medium text-neutral-900">{formatDate(moveOut.notice)}</span>
              </div>
            )}
            {moveOut.planned && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-neutral-600">Planuojama data:</span>
                <span className="text-sm font-medium text-neutral-900">{formatDate(moveOut.planned)}</span>
        </div>
      )}
            <div className="flex justify-between items-center">
              <span className="text-sm text-neutral-600">Būsena:</span>
              <span className="text-sm font-medium text-neutral-900">{moveOut.status}</span>
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
              <span className="text-sm font-medium text-neutral-900">{property.type}</span>
            </div>
          )}
          
          {property.status && (
            <div className="flex justify-between items-center py-3">
              <span className="text-sm text-neutral-600">Būsena</span>
              <span className="text-sm font-medium text-neutral-900">{property.status}</span>
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
              <div className="text-lg font-semibold text-neutral-900">{property.type}</div>
              <div className="text-xs text-neutral-500">Tipas</div>
            </div>
          )}
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
  const [activeTab, setActiveTab] = useState('overview');
  const { user } = useAuth();
  const [meterData, setMeterData] = useState<ExtendedMeter[]>([]);

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
              property={property}
              moveOut={moveOut}
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
                    </div>
  );
};

export default TenantDetailModalPro;







