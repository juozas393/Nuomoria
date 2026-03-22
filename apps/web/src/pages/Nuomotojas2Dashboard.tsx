import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

// Lazy load heavy components for better performance
const AddAddressModal = React.lazy(() => import('../components/properties/AddAddressModal'));
const AddApartmentModal = React.lazy(() => import('../components/properties/AddApartmentModal').then(module => ({ default: module.AddApartmentModal })));
const TenantListOptimized = React.lazy(() => import('../components/nuomotojas2/TenantListOptimized'));
const tenantModalImport = () => import('../components/nuomotojas2/TenantDetailModalPro');
const TenantDetailModalPro = React.lazy(tenantModalImport);

// Preload TenantDetailModalPro on idle so it opens instantly on click
if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
  (window as any).requestIdleCallback(() => { tenantModalImport(); });
} else {
  setTimeout(() => { tenantModalImport(); }, 1000);
}
import { PlusIcon, Cog6ToothIcon, TrashIcon, BuildingOfficeIcon, PencilSquareIcon, SparklesIcon, WrenchScrewdriverIcon, Bars3Icon, Squares2X2Icon, HomeIcon, CameraIcon } from '@heroicons/react/24/outline';
// VirtualizedList removed for stability - using optimized regular rendering
import { useAuth } from '../context/AuthContext';
import { useProperties, useAddresses, useStats } from '../context/DataContext';
import { resolveCardBgStyle, resolveCardBgStyleLight, resolveCardBgImage } from '../context/CardBgContext';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
// Performance monitoring removed to prevent reload loops
import AddressSettingsModal from '../components/properties/AddressSettingsModal';
import { AddressSettings } from '../data/addressSettingsData';
import { getAddressSettings, saveAddressSettings, getDefaultAddressSettings } from '../data/addressSettingsData';
import { addressApi, propertyApi, meterReadingApi } from '../lib/database';
import { useAgentPermissions } from '../hooks/useAgentPermissions';
import { supabase } from '../lib/supabase';
import { Tenant } from '../types/tenant';
// Context Panel imports removed - using modal instead
// Optimized image loading
// Background image path (optimized - modern cityscape)
const addressImage = '/imagesGen/DashboardImage.webp';
import { OptimizedImage } from '../components/ui/OptimizedImage';
import { formatCurrency } from '../utils/format';
import MessagingPanel from '../components/MessagingPanel';
import { ParticleDrift } from '../components/ui/ParticleDrift';
import { OnboardingTour } from '../components/ui/OnboardingTour';
import { useOnboardingTour } from '../hooks/useOnboardingTour';
import { AgentInvitationsWidget } from '../components/nuomotojas2/AgentInvitationsWidget';
import { WelcomeModal } from '../components/ui/WelcomeModal';
// Using centralized Tenant type from types/tenant.ts

// Define Address interface for display
interface Address {
  id: string;
  full_address: string;
  total_apartments: number;
  floors: number;
  building_type: string;
  year_built?: number;
  chairman_name?: string;
  chairman_phone?: string;
  chairman_email?: string;
  address_settings?: any[];
}

// ═══ Sortable Helper Components ═══
const AddressDragHandle = () => (
  <button
    className="flex-shrink-0 cursor-grab active:cursor-grabbing p-1 -ml-1 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.08] transition-colors touch-none"
    onPointerDown={(e) => e.stopPropagation()}
    title="Pertempti adresą"
  >
    <GripVertical className="w-4 h-4" />
  </button>
);

const ApartmentDragHandle = () => (
  <button
    className="flex-shrink-0 cursor-grab active:cursor-grabbing p-0.5 rounded text-gray-300 hover:text-gray-500 transition-colors touch-none"
    onPointerDown={(e) => e.stopPropagation()}
    title="Pertempti butą"
  >
    <GripVertical className="w-3.5 h-3.5" />
  </button>
);

const SortableAddressCard: React.FC<{ id: string; bgImage?: string; bgStyle?: React.CSSProperties; children: React.ReactNode }> = ({ id, bgImage, bgStyle, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 50 : undefined,
    ...(bgStyle || { backgroundImage: bgImage ? `url('${bgImage}')` : undefined }),
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      data-address-id={id}
      className="rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.25)] border border-white/[0.08] bg-cover bg-center relative"
    >
      {children}
    </div>
  );
};

const SortableApartmentRow: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
};

const Nuomotojas2Dashboard: React.FC = React.memo(() => {
  const { user } = useAuth();
  const { isAgent, permissions: agentPerms } = useAgentPermissions();
  const burstRef = useRef<(() => void) | null>(null);
  // Landlord names for agents — fetched separately
  const [landlordNames, setLandlordNames] = useState<Record<string, string>>({});
  const tour = useOnboardingTour();
  // Performance monitoring removed to prevent reload loops

  // Optimized data hooks with RBAC
  const { properties, loading: propertiesLoading, refetch: refetchProperties, patchProperty } = useProperties();
  const { addresses, loading: addressesLoading, refetch: refetchAddresses } = useAddresses();
  const { tenantCount, propertyCount, addressCount } = useStats();

  const [showAddAddressModal, setShowAddAddressModal] = useState(false);
  const [showAddApartmentModal, setShowAddApartmentModal] = useState(false);
  const [selectedAddressForApartment, setSelectedAddressForApartment] = useState<string>('');
  const [selectedAddressIdForApartment, setSelectedAddressIdForApartment] = useState<string>('');
  const [addressSettings, setAddressSettings] = useState<AddressSettings | undefined>(undefined);
  const [showAddressSettingsModal, setShowAddressSettingsModal] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string | undefined>(undefined);
  const [showDeleteAddressModal, setShowDeleteAddressModal] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState<any>(null);
  const [showDeleteAllAddressesModal, setShowDeleteAllAddressesModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [apartmentToDelete, setApartmentToDelete] = useState<{ id: string; name: string; apartmentNumber: string } | null>(null);
  const [showDeleteApartmentModal, setShowDeleteApartmentModal] = useState(false);
  const [isDeletingApartment, setIsDeletingApartment] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [renamingApartmentId, setRenamingApartmentId] = useState<string | null>(null);
  const [renamingValue, setRenamingValue] = useState('');
  const [terminationMap, setTerminationMap] = useState<Record<string, string>>({});
  const [metersSubmittedSet, setMetersSubmittedSet] = useState<Set<string>>(new Set());
  const [invoiceStatusMap, setInvoiceStatusMap] = useState<Record<string, { status: string; amount: number }>>({});
  const [maintenanceCountMap, setMaintenanceCountMap] = useState<Record<string, number>>({});

  // Fetch landlord names for agent view
  React.useEffect(() => {
    if (!isAgent || !addresses || addresses.length === 0) return;
    const addressIds = addresses.map((a: any) => a.id);
    
    const fetchLandlordNames = async () => {
      const { data: uaData } = await supabase
        .from('user_addresses')
        .select('address_id, user_id')
        .in('address_id', addressIds)
        .in('role', ['owner', 'landlord']);
      
      if (!uaData || uaData.length === 0) return;
      
      const userIds = [...new Set(uaData.map((ua: any) => ua.user_id))];
      const { data: usersData } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .in('id', userIds);
      
      if (!usersData) return;
      
      const userMap: Record<string, string> = {};
      usersData.forEach((u: any) => {
        const name = [u.first_name, u.last_name].filter(Boolean).join(' ').trim();
        userMap[u.id] = name || u.email || '—';
      });
      
      const result: Record<string, string> = {};
      uaData.forEach((ua: any) => {
        if (userMap[ua.user_id]) {
          result[ua.address_id] = userMap[ua.user_id];
        }
      });
      
      setLandlordNames(result);
    };
    
    fetchLandlordNames();
  }, [isAgent, addresses]);

  // Load termination statuses for all properties
  React.useEffect(() => {
    if (!properties || properties.length === 0) return;
    const propIds = properties.map((p: any) => p.id).filter(Boolean);
    if (propIds.length === 0) return;

    const loadTerminations = async () => {
      const { data } = await supabase
        .from('tenant_invitations')
        .select('property_id, termination_status')
        .in('property_id', propIds)
        .eq('status', 'accepted')
        .not('termination_status', 'is', null);

      if (data && data.length > 0) {
        const map: Record<string, string> = {};
        data.forEach((d: any) => { if (d.property_id && d.termination_status) map[d.property_id] = d.termination_status; });
        setTerminationMap(map);
      } else {
        setTerminationMap({});
      }
    };
    loadTerminations();
  }, [properties]);

  // Load current-month meter readings status — check ALL meters have readings
  React.useEffect(() => {
    if (!properties || properties.length === 0) return;
    const propIds = properties.map((p: any) => p.id).filter(Boolean);
    if (propIds.length === 0) return;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const loadMeterStatus = async () => {
      // Build address_id → property_ids map
      const addressIdMap = new Map<string, string[]>();
      properties.forEach((p: any) => {
        const addrId = p.address_id || p.address?.id;
        if (addrId && p.id) {
          if (!addressIdMap.has(addrId)) addressIdMap.set(addrId, []);
          addressIdMap.get(addrId)!.push(p.id);
        }
      });

      const addressIds = Array.from(addressIdMap.keys());
      if (addressIds.length === 0) { setMetersSubmittedSet(new Set()); return; }

      // Fetch individual (per_consumption) active meter IDs per address
      // Only individual meters are required from tenants — communal meters are read by the landlord
      const { data: metersData } = await supabase
        .from('address_meters')
        .select('id, address_id')
        .in('address_id', addressIds)
        .eq('is_active', true)
        .eq('distribution_method', 'per_consumption');

      if (!metersData || metersData.length === 0) {
        // No individual meters → nothing for tenants to submit → all occupied are "done"
        const submittedAll = new Set<string>();
        propIds.forEach(pid => submittedAll.add(pid));
        setMetersSubmittedSet(submittedAll);
        return;
      }

      // Build: property_id → Set of required meter_ids
      const requiredMetersPerProperty = new Map<string, Set<string>>();
      metersData.forEach((m: any) => {
        const propIdsForAddr = addressIdMap.get(m.address_id) || [];
        propIdsForAddr.forEach(pid => {
          if (!requiredMetersPerProperty.has(pid)) requiredMetersPerProperty.set(pid, new Set());
          requiredMetersPerProperty.get(pid)!.add(m.id);
        });
      });

      // Fetch all current-month readings — get meter_id to know which meters are covered
      const { data: readingsData } = await supabase
        .from('meter_readings')
        .select('property_id, meter_id')
        .in('property_id', propIds)
        .gte('reading_date', monthStart)
        .lte('reading_date', monthEnd)
        .not('current_reading', 'is', null);

      // Build: property_id → Set of meter_ids that HAVE readings
      const submittedMetersPerProperty = new Map<string, Set<string>>();
      if (readingsData) {
        readingsData.forEach((r: any) => {
          if (!r.meter_id || !r.property_id) return;
          if (!submittedMetersPerProperty.has(r.property_id)) submittedMetersPerProperty.set(r.property_id, new Set());
          submittedMetersPerProperty.get(r.property_id)!.add(r.meter_id);
        });
      }

      // Property is "submitted" when ALL required meter_ids have readings
      const submittedSet = new Set<string>();
      console.log('[MeterDebug] requiredMetersPerProperty:', Object.fromEntries(Array.from(requiredMetersPerProperty.entries()).map(([k, v]) => [k, Array.from(v)])));
      console.log('[MeterDebug] submittedMetersPerProperty:', Object.fromEntries(Array.from(submittedMetersPerProperty.entries()).map(([k, v]) => [k, Array.from(v)])));
      requiredMetersPerProperty.forEach((requiredMeterIds, propertyId) => {
        const submittedMeterIds = submittedMetersPerProperty.get(propertyId) || new Set();
        const allSubmitted = Array.from(requiredMeterIds).every(mid => submittedMeterIds.has(mid));
        console.log(`[MeterDebug] Property ${propertyId}: required=${Array.from(requiredMeterIds).join(',')}, submitted=${Array.from(submittedMeterIds).join(',')}, allSubmitted=${allSubmitted}`);
        if (allSubmitted) {
          submittedSet.add(propertyId);
        }
      });

      setMetersSubmittedSet(submittedSet);
    };

    loadMeterStatus();
  }, [properties]);

  // Load maintenance request counts per property
  React.useEffect(() => {
    if (!properties || properties.length === 0) return;
    const propIds = properties.map((p: any) => p.id).filter(Boolean);
    if (propIds.length === 0) return;

    const loadMaintenanceCounts = async () => {
      const { data, error } = await supabase
        .from('maintenance_requests')
        .select('property_id, status')
        .in('property_id', propIds)
        .in('status', ['open', 'in_progress']);

      if (error || !data) { setMaintenanceCountMap({}); return; }

      const map: Record<string, number> = {};
      data.forEach((r: any) => {
        if (r.property_id) {
          map[r.property_id] = (map[r.property_id] || 0) + 1;
        }
      });
      setMaintenanceCountMap(map);
    };
    loadMaintenanceCounts();
  }, [properties]);

  // Load invoice status for current period
  React.useEffect(() => {
    if (!properties || properties.length === 0) return;
    const propIds = properties.map((p: any) => p.id).filter(Boolean);
    if (propIds.length === 0) return;

    const loadInvoiceStatus = async () => {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
      const { data } = await supabase
        .from('invoices')
        .select('property_id, status, amount')
        .in('property_id', propIds)
        .gte('created_at', monthStart)
        .lte('created_at', monthEnd);

      if (data && data.length > 0) {
        const map: Record<string, { status: string; amount: number }> = {};
        data.forEach((inv: any) => {
          if (inv.property_id) {
            map[inv.property_id] = { status: inv.status || 'sent', amount: inv.amount || 0 };
          }
        });
        setInvoiceStatusMap(map);
      } else {
        setInvoiceStatusMap({});
      }
    };

    loadInvoiceStatus();
  }, [properties]);

  // Callback for when property data is updated (e.g., rent saved, tenant removed)
  // Must refetch AND update selectedTenant so the modal/dashboard shows fresh data
  const handlePropertyUpdated = useCallback(async () => {
    await refetchProperties();
    // Re-read the specific property directly from DB to update selectedTenant
    if (selectedTenant) {
      const { data: freshProp } = await supabase
        .from('properties')
        .select('*')
        .eq('id', selectedTenant.id)
        .single();
      if (freshProp) {
        const isVacant = !freshProp.tenant_name || freshProp.tenant_name === '' || freshProp.status === 'vacant';
        setSelectedTenant((prev: any) => ({
          ...prev,
          // Tenant identity fields
          name: freshProp.tenant_name || 'Laisvas',
          email: freshProp.email || '',
          phone: freshProp.phone || '',
          // Status fields
          status: isVacant ? 'vacant' : 'active',
          property_status: freshProp.status || 'vacant',
          // Financial fields
          rent: freshProp.rent,
          monthlyRent: freshProp.rent,
          deposit: freshProp.deposit_amount,
          deposit_amount: freshProp.deposit_amount,
          // Property fields
          rooms: freshProp.rooms,
          area: freshProp.area,
          floor: freshProp.floor,
          under_maintenance: freshProp.under_maintenance,
          property_type: freshProp.property_type,
          // Contract fields
          contractStart: freshProp.contract_start,
          contractEnd: freshProp.contract_end,
          // Extended
          extended_details: freshProp.extended_details || {},
        }));
      }
    }
  }, [refetchProperties, selectedTenant]);

  // Guard ref to prevent double-save from Enter + onBlur race
  const renameSavingRef = useRef(false);

  // Inline apartment rename handler — optimistic local update (no full refetch)
  const handleRenameApartment = useCallback(async (propertyId: string, newName: string) => {
    if (renameSavingRef.current) return; // Already saving
    renameSavingRef.current = true;
    const trimmed = newName.trim();
    if (!trimmed) { setRenamingApartmentId(null); renameSavingRef.current = false; return; }
    const currentProp = properties?.find((p: any) => p.id === propertyId);
    if (currentProp?.apartment_number === trimmed) { setRenamingApartmentId(null); renameSavingRef.current = false; return; }
    // Optimistic local update — instant, no flicker
    patchProperty(propertyId, { apartment_number: trimmed });
    setRenamingApartmentId(null);
    // Save to DB in background (fire-and-forget)
    supabase
      .from('properties')
      .update({ apartment_number: trimmed })
      .eq('id', propertyId)
      .then(({ error }) => {
        if (error) {
          if (import.meta.env.DEV) console.error('Rename error:', error);
          if (currentProp) patchProperty(propertyId, { apartment_number: currentProp.apartment_number });
        }
        renameSavingRef.current = false;
      });
  }, [properties, patchProperty]);


  // Derived state with memoization for performance
  const isLoading = propertiesLoading || addressesLoading;

  // Debug loading states removed - issue resolved

  // Photo cache refresh key — triggers re-read of localStorage when photos are fetched from storage
  const [photoRefreshKey, setPhotoRefreshKey] = useState(0);

  // View mode: 'list' (compact rows) or 'grid' (photo cards)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => {
    return (localStorage.getItem('dashboard-view-mode') as 'list' | 'grid') || 'list';
  });
  const handleViewModeChange = useCallback((mode: 'list' | 'grid') => {
    setViewMode(mode);
    localStorage.setItem('dashboard-view-mode', mode);
  }, []);

  // ═══ Drag-and-Drop Order Persistence ═══
  const [addressOrder, setAddressOrder] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('dashboard-address-order') || '[]'); } catch { return []; }
  });
  const [apartmentOrders, setApartmentOrders] = useState<Record<string, string[]>>(() => {
    try { return JSON.parse(localStorage.getItem('dashboard-apartment-orders') || '{}'); } catch { return {}; }
  });

  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );


  // Optimized tenants conversion - minimal processing for fast rendering
  const allTenants = useMemo(() => {
    if (!properties || !Array.isArray(properties)) return [];

    return properties.map((property: any) => ({
      id: property.id,
      name: property.tenant_name || 'Laisvas',
      phone: property.phone || '',
      email: property.email || '',
      apartmentNumber: property.apartment_number,
      address: typeof property.address === 'string' ? property.address : property.address?.full_address || '',
      address_id: property.address?.id,
      status: (property.tenant_name && property.tenant_name !== 'Laisvas' ? 'active' : 'vacant') as 'active' | 'vacant' | 'expired' | 'pending' | 'moving_out',
      // Keep the real DB property status for PropertyTab (occupied/vacant)
      property_status: property.status || 'vacant',
      contractStart: property.contract_start,
      contractEnd: property.contract_end,
      moveInDate: property.contract_start,
      monthlyRent: property.rent || 0,
      deposit: property.deposit_amount ?? null,
      area: property.area || 0,
      rooms: property.rooms || 0,
      photos: (() => {
        try {
          const stored = localStorage.getItem(`property_photos_${property.id}`);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) return parsed;
          }
        } catch { /* ignore parse errors */ }
        return [];
      })(),
      addressInfo: property.address ? {
        buildingType: property.address.building_type,
        totalApartments: property.address.total_apartments,
        floors: property.address.floors,
        yearBuilt: property.address.year_built,
        managementType: property.address.management_type,
        chairmanName: property.address.chairman_name,
        chairmanPhone: property.address.chairman_phone,
        chairmanEmail: property.address.chairman_email,
        companyName: property.address.company_name,
        contactPerson: property.address.contact_person,
        companyPhone: property.address.company_phone,
        companyEmail: property.address.company_email,
        address_settings: property.address.address_settings,
      } : null,
      meters: [],
      outstanding_amount: property.outstanding_amount || 0,
      last_payment_date: property.last_payment_date || '',
      move_out_notice_date: property.move_out_notice_date || '',
      planned_move_out_date: property.planned_move_out_date || '',
      meters_submitted: metersSubmittedSet.has(property.id),
      invoice_status: invoiceStatusMap[property.id] || null,
      meters_due_date: property.meters_due_date || '',
      property_type: property.property_type || 'apartment',
      heating_type: property.heating_type || 'central',
      parking_spaces: property.parking_spaces || 0,
      balcony: property.balcony || false,
      furnished: property.furnished || false,
      // Property fields needed by TenantDetailModalPro PropertyTab
      rent: property.rent || 0,
      deposit_amount: property.deposit_amount ?? null,
      extended_details: property.extended_details || {},
      under_maintenance: property.under_maintenance ?? false,
      floor: property.floor || 0,
      termination_status: terminationMap[property.id] || null,
      maintenance_count: maintenanceCountMap[property.id] || 0
    }));
  }, [properties, terminationMap, metersSubmittedSet, invoiceStatusMap, maintenanceCountMap, photoRefreshKey]);

  // Background: fetch photos from Supabase storage for properties with no localStorage cache
  useEffect(() => {
    if (!properties || !Array.isArray(properties) || properties.length === 0) return;
    let cancelled = false;

    const fetchMissingPhotos = async () => {
      for (const property of properties) {
        if (cancelled) break;
        const cacheKey = `property_photos_${property.id}`;
        if (localStorage.getItem(cacheKey)) continue; // already cached

        try {
          const { data, error } = await supabase.storage
            .from('property-photos')
            .list(property.id, { limit: 20, sortBy: { column: 'created_at', order: 'asc' } });

          if (error || !data || data.length === 0) continue;

          const urls = data
            .filter((f: any) => !f.id?.endsWith('/') && f.name !== '.emptyFolderPlaceholder')
            .map((f: any) => {
              const { data: { publicUrl } } = supabase.storage
                .from('property-photos')
                .getPublicUrl(`${property.id}/${f.name}`);
              return publicUrl;
            });

          if (urls.length > 0 && !cancelled) {
            localStorage.setItem(cacheKey, JSON.stringify(urls));
          }
        } catch {
          // Non-critical — skip silently
        }
      }
      // Trigger re-render to pick up newly cached photos
      if (!cancelled) setPhotoRefreshKey(k => k + 1);
    };

    fetchMissingPhotos();
    return () => { cancelled = true; };
  }, [properties]);

  // Filter tenants based on selected address
  const tenants = useMemo(() => {
    if (!selectedAddress) return allTenants;
    return allTenants.filter((tenant: any) =>
      tenant.address_id === selectedAddress.id || tenant.address === selectedAddress.full_address
    );
  }, [allTenants, selectedAddress]);

  // Optimized address list - fast calculation
  const addressList = useMemo(() => {
    if (!addresses || !Array.isArray(addresses)) return [];

    return addresses.map(address => ({
      id: address.id,
      full_address: address.full_address,
      total_apartments: 0,
      floors: address.floors || 1,
      building_type: address.building_type || 'Butų namas',
      year_built: address.year_built,
      chairman_name: address.chairman_name,
      chairman_phone: address.chairman_phone,
      chairman_email: address.chairman_email,
      address_settings: address.address_settings,
    }));
  }, [addresses]);

  // ═══ Apply saved order to addresses ═══
  const orderedAddresses = useMemo(() => {
    if (addressOrder.length === 0) return addressList;
    const orderMap = new Map(addressOrder.map((id, i) => [id, i]));
    return [...addressList].sort((a, b) => {
      const ia = orderMap.get(a.id) ?? 999;
      const ib = orderMap.get(b.id) ?? 999;
      return ia - ib;
    });
  }, [addressList, addressOrder]);

  const handleAddressDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setAddressOrder(() => {
      const ids = orderedAddresses.map(a => a.id);
      const oldIdx = ids.indexOf(active.id as string);
      const newIdx = ids.indexOf(over.id as string);
      if (oldIdx === -1 || newIdx === -1) return ids;
      const newOrder = arrayMove(ids, oldIdx, newIdx);
      localStorage.setItem('dashboard-address-order', JSON.stringify(newOrder));
      return newOrder;
    });
  }, [orderedAddresses]);

  const handleApartmentDragEnd = useCallback((addressId: string) => (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setApartmentOrders(prev => {
      const tenants = allTenants.filter(t => t.address_id === addressId || t.address === addressList.find(a => a.id === addressId)?.full_address);
      const ids = tenants.map(t => t.id);
      const currentOrder = prev[addressId] || ids;
      const activeIds = currentOrder.filter(id => ids.includes(id));
      const missing = ids.filter(id => !activeIds.includes(id));
      const fullOrder = [...activeIds, ...missing];
      const oldIdx = fullOrder.indexOf(active.id as string);
      const newIdx = fullOrder.indexOf(over.id as string);
      if (oldIdx === -1 || newIdx === -1) return prev;
      const newOrder = arrayMove(fullOrder, oldIdx, newIdx);
      const updated = { ...prev, [addressId]: newOrder };
      localStorage.setItem('dashboard-apartment-orders', JSON.stringify(updated));
      return updated;
    });
  }, [allTenants, addressList]);

  // ═══ Apply saved order to apartments per address ═══
  const getOrderedTenants = useCallback((addressId: string, tenants: typeof allTenants) => {
    const order = apartmentOrders[addressId];
    if (!order || order.length === 0) return tenants;
    const orderMap = new Map(order.map((id, i) => [id, i]));
    return [...tenants].sort((a, b) => {
      const ia = orderMap.get(a.id) ?? 999;
      const ib = orderMap.get(b.id) ?? 999;
      return ia - ib;
    });
  }, [apartmentOrders]);



  const handleOpenAddressSettings = useCallback((address: string, addressId?: string) => {
    let settings = getAddressSettings(address);

    // If no settings exist for this address, create default ones
    if (!settings) {
      const defaultSettings = getDefaultAddressSettings(address);
      settings = {
        ...defaultSettings,
        id: addressId || `address_${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }

    setAddressSettings(settings);
    setSelectedAddressId(addressId);
    setShowAddressSettingsModal(true);
  }, []);

  const handleCloseAddressSettings = useCallback(() => {
    setShowAddressSettingsModal(false);
    setSelectedAddressId(undefined);
  }, []);

  const handleAddressSettingsSave = useCallback((settings: AddressSettings) => {
    saveAddressSettings(settings);
    setAddressSettings(settings);
    setShowAddressSettingsModal(false);
    // Refetch both addresses and properties so card backgrounds update everywhere
    refetchAddresses();
    refetchProperties();
  }, [refetchAddresses, refetchProperties]);

  const handleAddressSelect = useCallback((address: any) => {
    setSelectedAddress(address);
    // Address selected
  }, []);

  const refreshData = useCallback(() => {
    refetchProperties();
    refetchAddresses();
  }, [refetchProperties, refetchAddresses]);

  const handleDeleteApartment = useCallback((e: React.MouseEvent, tenant: any) => {
    e.stopPropagation(); // Don't open tenant modal
    setApartmentToDelete({
      id: tenant.id,
      name: tenant.name,
      apartmentNumber: tenant.apartmentNumber
    });
    setShowDeleteApartmentModal(true);
  }, []);

  const confirmDeleteApartment = useCallback(async () => {
    if (!apartmentToDelete) return;
    setIsDeletingApartment(true);
    try {
      // Safety check: verify no active tenant exists for this property
      const { data: activeTenant } = await supabase
        .from('tenant_invitations')
        .select('id')
        .eq('property_id', apartmentToDelete.id)
        .eq('status', 'accepted')
        .limit(1);

      if (activeTenant && activeTenant.length > 0) {
        alert('Negalima ištrinti buto — yra aktyvus nuomininkas. Pirma nutraukite sutartį.');
        return;
      }

      // Delete meter readings first
      await supabase
        .from('meter_readings')
        .delete()
        .eq('property_id', apartmentToDelete.id);

      // Delete pending/expired invitations
      await supabase
        .from('tenant_invitations')
        .delete()
        .eq('property_id', apartmentToDelete.id);

      // Delete the property
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', apartmentToDelete.id);

      if (error) throw error;

      setShowDeleteApartmentModal(false);
      setApartmentToDelete(null);
      await refreshData();
    } catch (error) {
      alert('Klaida trinant butą. Bandykite dar kartą.');
    } finally {
      setIsDeletingApartment(false);
    }
  }, [apartmentToDelete, refreshData]);

  const cancelDeleteApartment = useCallback(() => {
    setShowDeleteApartmentModal(false);
    setApartmentToDelete(null);
  }, []);

  const handleDeleteAddress = useCallback((addressId: string, address: string) => {
    setAddressToDelete({ id: addressId, full_address: address });
    setShowDeleteAddressModal(true);
  }, []);

  const confirmDeleteAddress = useCallback(async () => {
    if (!addressToDelete) return;

    try {
      // 1. Find all properties for this address
      const propertiesToDelete = properties?.filter(property =>
        property.address?.id === addressToDelete.id ||
        property.address === addressToDelete.full_address
      ) || [];

      const propertyIds = propertiesToDelete.map(p => p.id);

      // Helper: batch .in() queries to avoid PostgREST URL length limits
      const IN_BATCH = 50;

      // 2. Auto-clean stale accepted invitations for vacant properties
      if (propertyIds.length > 0) {
        const vacantPropertyIds = propertiesToDelete
          .filter((p: any) => !p.tenant_name || p.tenant_name === '' || p.status === 'vacant')
          .map((p: any) => p.id);

        if (vacantPropertyIds.length > 0) {
          for (let i = 0; i < vacantPropertyIds.length; i += IN_BATCH) {
            const batch = vacantPropertyIds.slice(i, i + IN_BATCH);
            await supabase
              .from('tenant_invitations')
              .update({ status: 'terminated', termination_status: 'terminated', termination_confirmed_at: new Date().toISOString() })
              .in('property_id', batch)
              .eq('status', 'accepted');
          }
        }
      }

      // 3. Check for active tenant invitations — block deletion if found (real active tenants)
      if (propertyIds.length > 0) {
        const activeInvitations: any[] = [];
        for (let i = 0; i < propertyIds.length; i += IN_BATCH) {
          const batch = propertyIds.slice(i, i + IN_BATCH);
          const { data, error: invCheckError } = await supabase
            .from('tenant_invitations')
            .select('id, email, property_id')
            .in('property_id', batch)
            .eq('status', 'accepted');
          if (invCheckError) console.error('Error checking tenant invitations:', invCheckError);
          if (data) activeInvitations.push(...data);
        }

        if (activeInvitations.length > 0) {
          alert('Negalima ištrinti adreso — yra aktyvių nuomininkų. Pirma nutraukite sutartį su nuomininku.');
          return;
        }
      }

      // 3. Sequential deletion — order matters for RLS!
      // Step 3a: Delete tenant_invitations (pending/expired) for properties
      if (propertyIds.length > 0) {
        for (let i = 0; i < propertyIds.length; i += IN_BATCH) {
          const batch = propertyIds.slice(i, i + IN_BATCH);
          const { error: invError } = await supabase
            .from('tenant_invitations')
            .delete()
            .in('property_id', batch);
          if (invError) console.error('Error deleting tenant_invitations:', invError);
        }
      }

      // Step 3b: Delete meter_readings (depends on properties existing)
      if (propertyIds.length > 0) {
        for (let i = 0; i < propertyIds.length; i += IN_BATCH) {
          const batch = propertyIds.slice(i, i + IN_BATCH);
          const { error: mrError } = await supabase
            .from('meter_readings')
            .delete()
            .in('property_id', batch);
          if (mrError) console.error('Error deleting meter_readings:', mrError);
        }
      }

      // Step 3c: Delete properties (RLS needs user_addresses to still exist!)
      if (propertyIds.length > 0) {
        for (let i = 0; i < propertyIds.length; i += IN_BATCH) {
          const batch = propertyIds.slice(i, i + IN_BATCH);
          const { error: propError } = await supabase
            .from('properties')
            .delete()
            .in('id', batch);
          if (propError) {
            console.error('Error deleting properties:', propError);
            throw new Error('Nepavyko ištrinti butų');
          }
        }
      }

      // Step 3d: Delete user_addresses (safe now — properties already gone)
      const { error: uaError } = await supabase
        .from('user_addresses')
        .delete()
        .eq('address_id', addressToDelete.id);
      if (uaError) console.error('Error deleting user_addresses:', uaError);

      // Step 3e: Delete the address itself
      await addressApi.delete(addressToDelete.id);

      // Close modal and refresh data
      setShowDeleteAddressModal(false);
      setAddressToDelete(null);
      setSelectedAddress(null);
      await refreshData();

    } catch (error) {
      console.error('Error deleting address:', error);
      alert('Klaida ištrynimo metu');
    }
  }, [addressToDelete, properties, refreshData]);

  const cancelDeleteAddress = useCallback(() => {
    setShowDeleteAddressModal(false);
    setAddressToDelete(null);
  }, []);

  const handleDeleteAllAddresses = useCallback(() => {
    setShowDeleteAllAddressesModal(true);
  }, []);

  const confirmDeleteAllAddresses = useCallback(async () => {
    try {
      if (!addresses || addresses.length === 0) {
        setShowDeleteAllAddressesModal(false);
        return;
      }

      const addressIds = addresses.map(addr => addr.id);

      // 1. Find all properties for all addresses
      const allProperties = properties?.filter(property =>
        addressIds.includes(property.address?.id)
      ) || [];

      const propertyIds = allProperties.map(p => p.id);

      // Helper: batch .in() queries to avoid PostgREST URL length limits
      const IN_BATCH = 50;

      // 2. Auto-clean stale accepted invitations for properties that are already vacant
      //    (handles cases where old tenant removals left orphaned invitation records)
      if (propertyIds.length > 0) {
        const vacantPropertyIds = allProperties
          .filter(p => !p.tenant_name || p.tenant_name === '' || p.status === 'vacant')
          .map(p => p.id);

        if (vacantPropertyIds.length > 0) {
          for (let i = 0; i < vacantPropertyIds.length; i += IN_BATCH) {
            const batch = vacantPropertyIds.slice(i, i + IN_BATCH);
            await supabase
              .from('tenant_invitations')
              .update({ status: 'terminated', termination_status: 'terminated', termination_confirmed_at: new Date().toISOString() })
              .in('property_id', batch)
              .eq('status', 'accepted');
          }
        }
      }

      // 3. Check for active tenant invitations — block deletion if found (real active tenants)
      if (propertyIds.length > 0) {
        const activeInvitations: any[] = [];
        for (let i = 0; i < propertyIds.length; i += IN_BATCH) {
          const batch = propertyIds.slice(i, i + IN_BATCH);
          const { data, error: invCheckError } = await supabase
            .from('tenant_invitations')
            .select('id, email, property_id')
            .in('property_id', batch)
            .eq('status', 'accepted');
          if (invCheckError) console.error('Error checking tenant invitations:', invCheckError);
          if (data) activeInvitations.push(...data);
        }

        if (activeInvitations.length > 0) {
          alert(`Negalima ištrinti — yra ${activeInvitations.length} aktyvių nuomininkų. Pirma nutraukite sutartis su nuomininkais.`);
          return;
        }
      }

      // 3. Sequential deletion — order matters for RLS!
      // Step 3a: Delete tenant_invitations (pending/expired)
      if (propertyIds.length > 0) {
        for (let i = 0; i < propertyIds.length; i += IN_BATCH) {
          const batch = propertyIds.slice(i, i + IN_BATCH);
          const { error: invError } = await supabase
            .from('tenant_invitations')
            .delete()
            .in('property_id', batch);
          if (invError) console.error('Error deleting tenant_invitations:', invError);
        }
      }

      // Step 3b: Delete meter_readings
      if (propertyIds.length > 0) {
        for (let i = 0; i < propertyIds.length; i += IN_BATCH) {
          const batch = propertyIds.slice(i, i + IN_BATCH);
          const { error: mrError } = await supabase
            .from('meter_readings')
            .delete()
            .in('property_id', batch);
          if (mrError) console.error('Error deleting meter_readings:', mrError);
        }
      }

      // Step 3c: Delete properties (RLS needs user_addresses to still exist!)
      if (propertyIds.length > 0) {
        for (let i = 0; i < propertyIds.length; i += IN_BATCH) {
          const batch = propertyIds.slice(i, i + IN_BATCH);
          const { error: propError } = await supabase
            .from('properties')
            .delete()
            .in('id', batch);
          if (propError) {
            console.error('Error deleting properties:', propError);
            throw new Error('Nepavyko ištrinti butų');
          }
        }
      }

      // Step 3d: Delete user_addresses (safe now — properties already gone)
      const { error: uaError } = await supabase
        .from('user_addresses')
        .delete()
        .in('address_id', addressIds);
      if (uaError) console.error('Error deleting user_addresses:', uaError);

      // Step 3e: Delete all addresses
      const { error: addrError } = await supabase
        .from('addresses')
        .delete()
        .in('id', addressIds);
      if (addrError) {
        console.error('Error deleting addresses:', addrError);
        throw new Error('Nepavyko ištrinti adresų');
      }

      // Close modal and refresh data
      setShowDeleteAllAddressesModal(false);
      setSelectedAddress(null);
      await refreshData();

      alert(`Sėkmingai ištrinta ${addresses.length} adresų ir ${allProperties.length} butų!`);

    } catch (error) {
      console.error('Error deleting all addresses:', error);
      alert('Klaida ištrynimo metu');
    }
  }, [addresses, properties, refreshData]);

  const cancelDeleteAllAddresses = useCallback(() => {
    setShowDeleteAllAddressesModal(false);
  }, []);

  // Use body scroll lock for modals
  useBodyScrollLock(showAddAddressModal || showAddApartmentModal || showAddressSettingsModal);

  // Listen for add address modal events from AddressList
  React.useEffect(() => {
    const handleOpenAddAddressModal = () => {
      setShowAddAddressModal(true);
    };

    // Listen for meter synchronization events
    const handleMetersSynchronized = () => {
      // Synchronizing data
      refreshData(); // Reload data after meters are synchronized
    };

    window.addEventListener('openAddAddressModal', handleOpenAddAddressModal);
    window.addEventListener('meters-synchronized', handleMetersSynchronized);

    return () => {
      window.removeEventListener('openAddAddressModal', handleOpenAddAddressModal);
      window.removeEventListener('meters-synchronized', handleMetersSynchronized);
    };
  }, [refreshData]);

  // TenantListOptimized handlers
  const handleTenantClick = useCallback((tenant: Tenant, addressId?: string) => {
    setSelectedTenant(tenant);
    if (addressId) setSelectedAddressId(addressId);
  }, []);

  const handleChatClick = useCallback((address: string) => {
    // Security: Chat functionality implemented
    // Chat clicked
  }, []);

  const handleAddApartment = useCallback((address: string, addressId?: string) => {
    // Add apartment clicked
    setSelectedAddressForApartment(address);
    setSelectedAddressIdForApartment(addressId || '');
    setShowAddApartmentModal(true);
  }, []);

  const handleSettingsClick = useCallback((address: string, addressId?: string) => {
    // Find address from addresses array directly (works even if address has 0 properties)
    const addressObj = addresses?.find(a =>
      a.id === addressId || a.full_address === address
    ) || properties?.find(property =>
      property.address?.id === addressId ||
      property.address?.full_address === address ||
      property.address === address
    )?.address;

    if (addressObj) {
      setSelectedAddress(addressObj);
      setSelectedAddressId(addressId || addressObj.id);

      // Load address settings
      const settings = getAddressSettings(address);
      setAddressSettings(settings);

      setShowAddressSettingsModal(true);
    }
  }, [addresses, properties]);

  return (
    <div
      className="min-h-full relative overflow-hidden bg-cover bg-center bg-fixed"
      style={{ backgroundImage: `url('/imagesGen/DashboardImage.webp')` }}
    >
      {/* Subtle teal ambient glow — matching Introduction page */}
      <div
        className="absolute inset-0 pointer-events-none z-[1]"
        style={{
          background: 'linear-gradient(180deg, rgba(3,20,18,0.55) 0%, rgba(6,30,28,0.40) 40%, rgba(16,185,170,0.08) 70%, rgba(3,20,18,0.50) 100%)',
        }}
      />

      {/* Particle drift background — snowfall-style effect */}
      <ParticleDrift onBurstRef={(fn) => { burstRef.current = fn; }} />

      {/* Content wrapper */}
      <div className="relative z-10 min-h-full">
        {/* Page Header */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <h1 className="text-3xl font-bold text-white">Pagrindinis skydelis</h1>
              <div className="text-gray-400 text-sm">
                {addressCount} adresai • {propertyCount} butai
              </div>
            </div>
            <button
              onClick={() => burstRef.current?.()}
              className="p-2.5 rounded-xl bg-white/[0.06] border border-white/[0.10] text-teal-400 hover:bg-teal-500/20 hover:text-teal-300 active:scale-90 transition-all duration-200"
              title="Spausk savo rizika"
            >
              <SparklesIcon className="w-5 h-5" />
            </button>
          </div>

          {isAgent && <AgentInvitationsWidget />}

          {/* Main Content - dark building background */}
          <div
            className="relative rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.25),0_2px_8px_rgba(0,0,0,0.15)] p-4 bg-cover bg-center border border-white/[0.08] overflow-hidden"
            style={{ backgroundImage: `url('/images/DarkBuildingCardBg.png')` }}
          >
            {/* Dark overlay for readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/50 rounded-2xl" />

            {isLoading ? (
              <div className="relative z-10 flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-400"></div>
                <span className="ml-3 text-white/70">Kraunama...</span>
              </div>
            ) : (
              <div className="relative z-10">
                {addressCount === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-white/70 text-lg mb-4">
                      {isAgent ? 'Nėra priskirtų adresų' : 'Nėra pridėtų adresų'}
                    </div>
                    <p className="text-white/50 mb-6">
                      {isAgent ? 'Nuomotojas dar nepriskyrė jums adresų' : 'Pradėkite pridėdami pirmąjį adresą'}
                    </p>
                    {!isAgent && (
                      <button
                        data-tour="add-address"
                        onClick={() => setShowAddAddressModal(true)}
                        className="inline-flex items-center px-6 py-3 bg-teal-500 hover:bg-teal-600 text-white rounded-xl font-semibold transition-colors shadow-lg"
                      >
                        <PlusIcon className="w-5 h-5 mr-2" />
                        Pridėti pirmąjį adresą
                      </button>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="mb-6 flex items-center justify-between">
                      <div>
                        <h2 className="text-2xl font-bold text-white drop-shadow-sm">Adresų kortelės</h2>
                        <p className="text-white/60">Pasirinkite adresą, kad peržiūrėtumėte jo nuomininkus</p>
                      </div>
                      {/* View mode toggle */}
                      <div className="flex rounded-xl overflow-hidden border border-white/[0.15] bg-white/[0.06] backdrop-blur-sm">
                        <button
                          onClick={() => handleViewModeChange('list')}
                          className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold transition-all ${
                            viewMode === 'list'
                              ? 'bg-teal-500/90 text-white shadow-sm'
                              : 'text-white/60 hover:text-white hover:bg-white/[0.08]'
                          }`}
                          title="Eilutėmis"
                        >
                          <Bars3Icon className="w-4 h-4" />
                          <span className="hidden lg:inline">Eilutėmis</span>
                        </button>
                        <button
                          onClick={() => handleViewModeChange('grid')}
                          className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold transition-all ${
                            viewMode === 'grid'
                              ? 'bg-teal-500/90 text-white shadow-sm'
                              : 'text-white/60 hover:text-white hover:bg-white/[0.08]'
                          }`}
                          title="Kortelėmis"
                        >
                          <Squares2X2Icon className="w-4 h-4" />
                          <span className="hidden lg:inline">Kortelėmis</span>
                        </button>
                      </div>
                    </div>

                    {/* Show all addresses - optimized rendering with drag-and-drop */}
                    <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleAddressDragEnd}>
                    <SortableContext items={orderedAddresses.map(a => a.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-4" data-tour="addresses">
                      {orderedAddresses.map((address) => {
                        // Lazy calculate tenant count only when rendering
                        const rawAddressTenants = allTenants.filter(tenant =>
                          tenant.address === address.full_address ||
                          tenant.address_id === address.id
                        );
                        const addressTenants = getOrderedTenants(address.id, rawAddressTenants);

                        // Use landlord name from separate lookup
                        const landlordName = isAgent ? landlordNames[address.id] : null;

                        return (
                          <SortableAddressCard key={address.id} id={address.id} bgStyle={resolveCardBgStyle(null, address)}>
                            {/* Dark overlay handled by resolveCardBgStyle gradient */}

                            {/* Address Header — Glass over dark bg */}
                            <div className="relative z-10 bg-white/[0.06] backdrop-blur-sm border-b border-white/[0.08] px-4 py-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <AddressDragHandle />
                                  <div className="w-9 h-9 rounded-xl bg-teal-500/20 backdrop-blur flex items-center justify-center flex-shrink-0">
                                    <BuildingOfficeIcon className="h-5 w-5 text-teal-400" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <h3 className="text-[14px] font-bold text-white truncate drop-shadow-sm">{address.full_address}</h3>
                                      {landlordName && (
                                        <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-[#2F8481]/20 text-teal-300 border border-teal-500/30">
                                          Savininkas: {landlordName}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className="text-[11px] text-white/60">{addressTenants.length} butų</span>
                                      {addressTenants.length > 0 && (
                                        <>
                                          <span className="text-[11px] text-white/30">•</span>
                                          <span className="text-[11px] text-teal-300/90 font-medium">
                                            {Math.round((addressTenants.filter(t => t.status === 'active').length / addressTenants.length) * 100)}% užimta
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  {!isAgent && (
                                    <button
                                      onClick={() => handleAddApartment(address.full_address, address.id)}
                                      className="p-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                      title="Pridėti butą"
                                    >
                                      <PlusIcon className="h-4 w-4" />
                                    </button>
                                  )}
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setEditingAddressId(editingAddressId === address.id ? null : address.id); }}
                                    className={`p-1.5 rounded-lg transition-colors ${editingAddressId === address.id ? 'text-white bg-white/15' : 'text-white/50 hover:text-white hover:bg-white/10'}`}
                                    title={editingAddressId === address.id ? 'Baigti redagavimą' : 'Redaguoti'}
                                  >
                                    <PencilSquareIcon className="h-4 w-4" />
                                  </button>
                                  {!isAgent && (
                                    <button
                                      onClick={() => handleSettingsClick(address.full_address, address.id)}
                                      className="p-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                      title="Nustatymai"
                                    >
                                      <Cog6ToothIcon className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Apartment Rows / Grid — conditional on viewMode */}
                            {addressTenants.length > 0 ? (
                              <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleApartmentDragEnd(address.id)}>
                              <SortableContext items={addressTenants.map(t => t.id)} strategy={viewMode === 'list' ? verticalListSortingStrategy : rectSortingStrategy}>
                              {viewMode === 'list' ? (
                              /* ═══ LIST VIEW ═══ */
                              <div className="relative z-10 p-2 flex flex-col gap-1.5">
                                {addressTenants.map((tenant) => {
                                  const isVacant = tenant.status === 'vacant';
                                  const isMaintenance = (tenant as any).under_maintenance === true;
                                  const termStatus = (tenant as any).termination_status;
                                  const statusConfig = isMaintenance
                                    ? { label: 'Remontas', dotColor: 'bg-amber-500', textColor: 'text-amber-600 font-semibold' }
                                    : termStatus === 'tenant_requested'
                                      ? { label: 'Nutraukimas', dotColor: 'bg-red-500 animate-pulse', textColor: 'text-red-600 font-bold' }
                                      : termStatus === 'landlord_requested'
                                        ? { label: 'Nutraukimas', dotColor: 'bg-red-500 animate-pulse', textColor: 'text-red-600 font-bold' }
                                        : termStatus === 'confirmed'
                                          ? { label: 'Patvirtinta', dotColor: 'bg-amber-500', textColor: 'text-amber-600 font-semibold' }
                                          : tenant.status === 'active'
                                            ? { label: 'Aktyvus', dotColor: 'bg-emerald-500', textColor: 'text-emerald-700' }
                                            : tenant.status === 'expired'
                                              ? { label: 'Baigėsi', dotColor: 'bg-red-500', textColor: 'text-red-700' }
                                              : tenant.status === 'moving_out'
                                                ? { label: 'Išsikrausto', dotColor: 'bg-amber-500', textColor: 'text-amber-700' }
                                                : isVacant
                                                  ? { label: 'Laisvas', dotColor: 'bg-gray-400', textColor: 'text-gray-500' }
                                                  : { label: 'Laukia', dotColor: 'bg-blue-500', textColor: 'text-blue-700' };

                                  return (
                                    <SortableApartmentRow key={tenant.id} id={tenant.id}>
                                    <div
                                      className="group/row flex items-center gap-2.5 px-3 py-2 rounded-lg bg-cover bg-center shadow-sm border border-white/60 hover:shadow-md border-l-2 border-l-transparent hover:border-l-[#2F8481] transition-all cursor-pointer"
                                      style={resolveCardBgStyleLight(null, address)}
                                      onClick={() => handleTenantClick(tenant, address.id)}
                                    >
                                      {/* Drag handle */}
                                      <ApartmentDragHandle />
                                      {/* Avatar / Icon */}
                                      {isVacant ? (
                                        <div className="size-7 rounded-md bg-gray-100 text-gray-400 grid place-items-center flex-shrink-0">
                                          <BuildingOfficeIcon className="h-3.5 w-3.5" />
                                        </div>
                                      ) : (
                                        <div className="size-7 rounded-md bg-gradient-to-br from-[#2F8481] to-[#297a77] text-white grid place-items-center text-[11px] font-bold flex-shrink-0">
                                          {tenant.name.charAt(0).toUpperCase()}
                                        </div>
                                      )}

                                      {/* Info */}
                                      <div className="min-w-0 flex-1">
                                        <div className="text-[13px] font-semibold text-gray-900 truncate flex items-center gap-1.5">
                                          {renamingApartmentId === tenant.id ? (
                                            <input
                                              autoFocus
                                              className="bg-white border border-teal-400 rounded px-1.5 py-0.5 text-[13px] font-semibold text-gray-900 w-32 focus:ring-1 focus:ring-teal-500 outline-none"
                                              maxLength={30}
                                              value={renamingValue}
                                              onChange={(e) => setRenamingValue(e.target.value)}
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleRenameApartment(tenant.id, renamingValue);
                                                if (e.key === 'Escape') setRenamingApartmentId(null);
                                              }}
                                              onBlur={() => handleRenameApartment(tenant.id, renamingValue)}
                                              onClick={(e) => e.stopPropagation()}
                                            />
                                          ) : (
                                            <>
                                              <span>{isVacant ? tenant.apartmentNumber : tenant.name}</span>
                                              {!isAgent && (
                                                <button
                                                  className="opacity-0 group-hover/row:opacity-100 p-0.5 text-gray-400 hover:text-teal-600 transition-all"
                                                  title="Pervadinti"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setRenamingApartmentId(tenant.id);
                                                    setRenamingValue(tenant.apartmentNumber || '');
                                                  }}
                                                >
                                                  <PencilSquareIcon className="w-3.5 h-3.5" />
                                                </button>
                                              )}
                                            </>
                                          )}
                                        </div>
                                        <div className="text-[11px] text-gray-500 truncate mt-0.5 flex items-center gap-2">
                                          <span>
                                            {isVacant
                                              ? [tenant.rooms ? tenant.rooms + ' kamb.' : null, tenant.area ? tenant.area + ' m²' : null].filter(Boolean).join(' • ') || 'Laisvas butas'
                                              : `${tenant.apartmentNumber}${tenant.rooms ? ' • ' + tenant.rooms + ' kamb.' : ''}${tenant.area ? ' • ' + tenant.area + ' m²' : ''}`
                                            }
                                          </span>
                                          {!isVacant && (!isAgent || agentPerms.can_view_meters) && (
                                            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold whitespace-nowrap ${(tenant as any).meters_submitted
                                              ? 'bg-teal-50 text-teal-700 border border-teal-200'
                                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                                              }`}>
                                              <span className={`w-1 h-1 rounded-full ${(tenant as any).meters_submitted ? 'bg-teal-500' : 'bg-amber-500'
                                                }`} />
                                              {(tenant as any).meters_submitted ? 'Rodmenys ✓' : 'Laukia rodmenų'}
                                            </span>
                                          )}
                                          {!isVacant && (tenant as any).invoice_status && (!isAgent || agentPerms.can_view_invoices) && (
                                            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold whitespace-nowrap ${
                                              (tenant as any).invoice_status.status === 'paid'
                                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                : (tenant as any).invoice_status.status === 'overdue'
                                                  ? 'bg-red-50 text-red-700 border border-red-200'
                                                  : 'bg-blue-50 text-blue-700 border border-blue-200'
                                            }`}>
                                              <span className={`w-1 h-1 rounded-full ${
                                                (tenant as any).invoice_status.status === 'paid' ? 'bg-emerald-500'
                                                  : (tenant as any).invoice_status.status === 'overdue' ? 'bg-red-500'
                                                    : 'bg-blue-500'
                                              }`} />
                                              {(tenant as any).invoice_status.status === 'paid' ? 'Sąskaita ✓'
                                                : (tenant as any).invoice_status.status === 'overdue' ? 'Pradelsta'
                                                  : 'Išsiųsta'}
                                            </span>
                                          )}
                                          {!isVacant && (tenant as any).maintenance_count > 0 && (!isAgent || agentPerms.can_view_maintenance) && (
                                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold whitespace-nowrap bg-orange-50 text-orange-700 border border-orange-200">
                                              <WrenchScrewdriverIcon className="w-2.5 h-2.5" />
                                              {(tenant as any).maintenance_count}
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      {/* Right — status + price + delete */}
                                      <div className="flex items-center gap-3 flex-shrink-0">
                                        <div className="flex items-center gap-1.5">
                                          <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotColor}`} />
                                          <span className={`text-[10px] font-medium ${statusConfig.textColor}`}>{statusConfig.label}</span>
                                        </div>
                                          {!isVacant && (!isAgent || agentPerms.can_view_financials) && (
                                          <div className="text-[13px] font-bold text-gray-900 tabular-nums">
                                            {formatCurrency(tenant.monthlyRent)}
                                          </div>
                                        )}
                                        {editingAddressId === address.id && isVacant && !isAgent && (
                                          <button
                                            onClick={(e) => handleDeleteApartment(e, tenant)}
                                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Ištrinti butą"
                                          >
                                            <TrashIcon className="h-4 w-4" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                    </SortableApartmentRow>
                                  );
                                })}
                              </div>
                              ) : (
                              /* ═══ GRID VIEW — Compact Professional Cards ═══ */
                              <div className="relative z-10 p-2.5 grid grid-cols-2 lg:grid-cols-3 gap-2.5">
                                {addressTenants.map((tenant) => {
                                  const isVacant = tenant.status === 'vacant';
                                  const isMaintenance = (tenant as any).under_maintenance === true;
                                  const termStatus = (tenant as any).termination_status;
                                  const statusConfig = isMaintenance
                                    ? { label: 'Remontas', color: 'text-amber-600 bg-amber-50 border-amber-200' }
                                    : termStatus === 'tenant_requested' || termStatus === 'landlord_requested'
                                      ? { label: 'Nutraukimas', color: 'text-red-600 bg-red-50 border-red-200' }
                                      : termStatus === 'confirmed'
                                        ? { label: 'Patvirtintas', color: 'text-amber-600 bg-amber-50 border-amber-200' }
                                        : tenant.status === 'active'
                                          ? { label: 'Aktyvus', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' }
                                          : tenant.status === 'expired'
                                            ? { label: 'Baigėsi', color: 'text-red-600 bg-red-50 border-red-200' }
                                            : isVacant
                                              ? { label: 'Laisvas', color: 'text-gray-500 bg-gray-50 border-gray-200' }
                                              : { label: 'Laukia', color: 'text-blue-600 bg-blue-50 border-blue-200' };

                                  const photos = (tenant as any).photos || [];
                                  const firstPhoto = photos.length > 0 ? photos[0] : null;

                                  return (
                                    <SortableApartmentRow key={tenant.id} id={tenant.id}>
                                    <div
                                      className="group/card rounded-xl overflow-hidden bg-white border border-gray-100 hover:border-[#2F8481]/30 hover:shadow-[0_4px_20px_rgba(47,132,129,0.12)] transition-all duration-300 cursor-pointer relative"
                                      onClick={() => handleTenantClick(tenant, address.id)}
                                    >
                                      {/* Drag handle — grid */}
                                      <div className="absolute top-1.5 left-1.5 z-20">
                                        <ApartmentDragHandle />
                                      </div>
                                      {/* Photo area — compact */}
                                      <div 
                                        className="relative h-28 overflow-hidden bg-gray-100 bg-cover bg-center"
                                        style={!firstPhoto ? resolveCardBgStyle(null, address) : undefined}
                                      >
                                        {firstPhoto ? (
                                          <img
                                            src={firstPhoto}
                                            alt={tenant.apartmentNumber}
                                            className="w-full h-full object-cover group-hover/card:scale-[1.04] transition-transform duration-500 ease-out"
                                            loading="lazy"
                                          />
                                        ) : (
                                          <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                                            <HomeIcon className="w-7 h-7 text-gray-300" />
                                          </div>
                                        )}

                                        {/* Apartment number pill — top right */}
                                        <div className="absolute top-2 right-2">
                                          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold text-white bg-black/50 backdrop-blur-sm">
                                            {tenant.apartmentNumber}
                                          </span>
                                        </div>

                                        {/* Photo count */}
                                        {photos.length > 1 && (
                                          <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-sm text-white text-[8px] font-semibold px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                                            <CameraIcon className="w-2.5 h-2.5" />
                                            {photos.length}
                                          </div>
                                        )}
                                      </div>

                                      {/* Info section — compact */}
                                      <div className="px-2.5 py-2">
                                        {/* Name + status row */}
                                        <div className="flex items-center justify-between gap-1 mb-1">
                                          <div className="flex items-center gap-1 min-w-0 flex-1">
                                            {renamingApartmentId === tenant.id ? (
                                              <input
                                                autoFocus
                                                className="bg-white border border-teal-400 rounded px-1.5 py-0.5 text-[11px] font-bold text-gray-900 w-20 focus:ring-1 focus:ring-teal-500 outline-none"
                                                value={renamingValue}
                                                maxLength={30}
                                                onChange={(e) => setRenamingValue(e.target.value)}
                                                onKeyDown={(e) => {
                                                  if (e.key === 'Enter') handleRenameApartment(tenant.id, renamingValue);
                                                  if (e.key === 'Escape') setRenamingApartmentId(null);
                                                }}
                                                onBlur={() => handleRenameApartment(tenant.id, renamingValue)}
                                                onClick={(e) => e.stopPropagation()}
                                              />
                                            ) : (
                                              <>
                                                <span className="text-[11px] font-bold text-gray-900 truncate">
                                                  {isVacant ? tenant.apartmentNumber : tenant.name}
                                                </span>
                                                <button
                                                  className="opacity-0 group-hover/card:opacity-100 p-0.5 text-gray-400 hover:text-teal-600 transition-all flex-shrink-0"
                                                  title="Pervadinti"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setRenamingApartmentId(tenant.id);
                                                    setRenamingValue(tenant.apartmentNumber || '');
                                                  }}
                                                >
                                                  <PencilSquareIcon className="w-3 h-3" />
                                                </button>
                                              </>
                                            )}
                                          </div>
                                          <span className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold border ${statusConfig.color}`}>
                                            {statusConfig.label}
                                          </span>
                                        </div>

                                        {/* Details row */}
                                        <div className="flex items-center justify-between">
                                          <span className="text-[9px] text-gray-400">
                                            {[tenant.rooms ? tenant.rooms + ' kamb.' : null, tenant.area ? tenant.area + ' m²' : null].filter(Boolean).join(' · ') || '—'}
                                          </span>
                                          {!isVacant && (!isAgent || agentPerms.can_view_financials) ? (
                                            <span className="text-[11px] font-bold text-gray-800 tabular-nums">{formatCurrency(tenant.monthlyRent)}</span>
                                          ) : (
                                            <span className="text-[9px] text-gray-300 italic">—</span>
                                          )}
                                        </div>

                                        {/* Status badges — only for active tenants, compact */}
                                        {!isVacant && (
                                          <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                                            {(!isAgent || agentPerms.can_view_meters) && (
                                              <span className={`inline-flex items-center gap-0.5 px-1 py-px rounded text-[8px] font-semibold ${(tenant as any).meters_submitted
                                                ? 'bg-teal-50 text-teal-600 border border-teal-100'
                                                : 'bg-amber-50 text-amber-600 border border-amber-100'
                                            }`}>
                                              <span className={`w-1 h-1 rounded-full ${(tenant as any).meters_submitted ? 'bg-teal-500' : 'bg-amber-500'}`} />
                                              </span>
                                            )}
                                            {(tenant as any).invoice_status && (!isAgent || agentPerms.can_view_invoices) && (
                                              <span className={`inline-flex items-center gap-0.5 px-1 py-px rounded text-[8px] font-semibold ${
                                                (tenant as any).invoice_status.status === 'paid'
                                                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                                  : (tenant as any).invoice_status.status === 'overdue'
                                                    ? 'bg-red-50 text-red-600 border border-red-100'
                                                    : 'bg-blue-50 text-blue-600 border border-blue-100'
                                              }`}>
                                                <span className={`w-1 h-1 rounded-full ${
                                                  (tenant as any).invoice_status.status === 'paid' ? 'bg-emerald-500'
                                                    : (tenant as any).invoice_status.status === 'overdue' ? 'bg-red-500'
                                                      : 'bg-blue-500'
                                                }`} />
                                                {(tenant as any).invoice_status.status === 'paid' ? 'Apmokėta'
                                                  : (tenant as any).invoice_status.status === 'overdue' ? 'Pradelsta'
                                                    : 'Išsiųsta'}
                                              </span>
                                            )}
                                            {(tenant as any).maintenance_count > 0 && (!isAgent || agentPerms.can_view_maintenance) && (
                                              <span className="inline-flex items-center gap-0.5 px-1 py-px rounded text-[8px] font-semibold bg-orange-50 text-orange-600 border border-orange-100">
                                                <WrenchScrewdriverIcon className="w-2 h-2" />
                                                {(tenant as any).maintenance_count}
                                              </span>
                                            )}
                                          </div>
                                        )}

                                        {/* Delete button for vacant in edit mode */}
                                        {editingAddressId === address.id && isVacant && !isAgent && (
                                          <div className="mt-1.5 flex justify-end">
                                            <button
                                              onClick={(e) => { e.stopPropagation(); handleDeleteApartment(e, tenant); }}
                                              className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                              title="Ištrinti butą"
                                            >
                                              <TrashIcon className="h-3 w-3" />
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    </SortableApartmentRow>
                                  );
                                })}

                                {/* ═══ ADD APARTMENT CARD ═══ */}
                                {!isAgent && (
                                <div
                                  className="group/add rounded-xl overflow-hidden border border-dashed border-gray-200 hover:border-[#2F8481]/40 transition-all duration-300 cursor-pointer flex flex-col items-center justify-center bg-gray-50/50 hover:bg-[#2F8481]/[0.04] min-h-[174px]"
                                  onClick={() => handleAddApartment(address.full_address, address.id)}
                                >
                                  <div className="w-9 h-9 rounded-xl bg-[#2F8481]/10 group-hover/add:bg-[#2F8481]/15 flex items-center justify-center mb-2 transition-colors duration-300">
                                    <PlusIcon className="w-4.5 h-4.5 text-[#2F8481]/50 group-hover/add:text-[#2F8481] transition-colors duration-300" />
                                  </div>
                                  <span className="text-[10px] font-semibold text-gray-400 group-hover/add:text-[#2F8481] transition-colors duration-300">Pridėti butą</span>
                                </div>
                                )}
                              </div>
                              )
                              }
                              </SortableContext>
                              </DndContext>
                            ) : (
                              <div className="relative z-10 px-4 py-8 text-center">
                                <div className="w-12 h-12 bg-white/[0.08] rounded-xl flex items-center justify-center mx-auto mb-3">
                                  <BuildingOfficeIcon className="h-6 w-6 text-gray-400" />
                                </div>
                                <p className="text-[12px] text-gray-400 mb-2">
                                  {isAgent ? 'Nėra priskirtų butų šiame adrese' : 'Nėra butų šiame adrese'}
                                </p>
                                {!isAgent && (
                                  <button
                                    onClick={() => handleAddApartment(address.full_address, address.id)}
                                    className="inline-flex items-center px-3 py-1.5 bg-teal-500 text-white text-[11px] font-semibold rounded-lg hover:bg-teal-600 transition-colors"
                                  >
                                    <PlusIcon className="h-3 w-3 mr-1" />
                                    Pridėti butą
                                  </button>
                                )}
                              </div>
                            )}
                          </SortableAddressCard>
                        );
                      })}
                    </div>
                    </SortableContext>
                    </DndContext>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fixed Action Buttons — hidden for agents */}
      {!isAgent && (
        <div className="fixed bottom-4 left-4 z-50 flex flex-col gap-2 sm:bottom-6 sm:left-6">
          <button
            data-tour="add-address"
            onClick={() => setShowAddAddressModal(true)}
            className="flex items-center justify-center w-12 h-12 sm:w-auto sm:h-auto sm:px-4 sm:py-3 bg-[#2F8481] text-white rounded-full sm:rounded-lg hover:bg-[#297a77] transition-colors duration-200 shadow-lg hover:shadow-xl"
            title="Pridėti adresą"
          >
            <PlusIcon className="w-6 h-6 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline sm:ml-2 font-medium text-sm whitespace-nowrap">Pridėti adresą</span>
          </button>

          <button
            onClick={handleDeleteAllAddresses}
            className="flex items-center justify-center w-12 h-12 sm:w-auto sm:h-auto sm:px-4 sm:py-3 bg-red-600 text-white rounded-full sm:rounded-lg hover:bg-red-700 transition-colors duration-200 shadow-lg hover:shadow-xl"
            title="Ištrinti visus adresus (TESTAVIMUI)"
          >
            <TrashIcon className="w-6 h-6 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline sm:ml-2 font-medium text-sm whitespace-nowrap">Ištrinti visus</span>
          </button>
        </div>
      )}



      {/* Apartment functionality moved to Address Modal */}

      {/* Delete Apartment Confirmation Modal */}
      {showDeleteApartmentModal && apartmentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={cancelDeleteApartment} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrashIcon className="w-8 h-8 text-red-600" />
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Ištrinti butą?
              </h3>

              <p className="text-sm text-gray-600 mb-6">
                Ar tikrai norite ištrinti butą <strong>Nr. {apartmentToDelete.apartmentNumber}</strong>
                {apartmentToDelete.name !== 'Laisvas' && (
                  <> (nuomininkas: <strong>{apartmentToDelete.name}</strong>)</>
                )}?
                <br />
                <span className="text-red-600 font-medium">
                  Bus ištrinti visi susiję skaitiklių rodmenys ir duomenys!
                </span>
              </p>

              <div className="flex gap-3 justify-center">
                <button
                  onClick={cancelDeleteApartment}
                  disabled={isDeletingApartment}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  Atšaukti
                </button>
                <button
                  onClick={confirmDeleteApartment}
                  disabled={isDeletingApartment}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {isDeletingApartment ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      Trinama...
                    </>
                  ) : (
                    'Ištrinti'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Address Confirmation Modal */}
      {showDeleteAddressModal && addressToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={cancelDeleteAddress} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Ištrinti adresą?
              </h3>

              <p className="text-sm text-gray-600 mb-6">
                Ar tikrai norite ištrinti adresą <strong>{addressToDelete.full_address}</strong>?
                <br />
                <span className="text-red-600 font-medium">
                  Šis veiksmas ištrins visus butus, nuomininkus ir susijusius duomenis!
                </span>
              </p>

              <div className="flex gap-3 justify-center">
                <button
                  onClick={cancelDeleteAddress}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                >
                  Atšaukti
                </button>
                <button
                  onClick={confirmDeleteAddress}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                >
                  Ištrinti
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Addresses Confirmation Modal */}
      {showDeleteAllAddressesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={cancelDeleteAllAddresses} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrashIcon className="w-8 h-8 text-red-600" />
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Ištrinti VISUS adresus?
              </h3>

              <p className="text-sm text-gray-600 mb-6">
                Ar tikrai norite ištrinti <strong>VISUS</strong> adresus?
                <br />
                <span className="text-red-600 font-medium">
                  Šis veiksmas ištrins visus adresus, butus, nuomininkus ir visus susijusius duomenis!
                  <br />
                  <strong>Šis veiksmas negrįžtamas!</strong>
                </span>
              </p>

              <div className="flex gap-3 justify-center">
                <button
                  onClick={cancelDeleteAllAddresses}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                >
                  Atšaukti
                </button>
                <button
                  onClick={confirmDeleteAllAddresses}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                >
                  Ištrinti VISUS
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Address Settings Modal */}
      <AddressSettingsModal
        isOpen={showAddressSettingsModal}
        onClose={handleCloseAddressSettings}
        onSave={handleAddressSettingsSave}
        onDelete={handleDeleteAddress}
        addressId={selectedAddressId}
        address={addressSettings?.address || selectedAddress?.full_address || "Test Address"}
      />

      {/* Tenant Detail Modal */}
      {selectedTenant && (
        <React.Suspense fallback={<div className="fixed inset-0 bg-black/50 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div></div>}>
          <TenantDetailModalPro
            tenant={selectedTenant}
            isOpen={!!selectedTenant}
            onClose={() => { setSelectedTenant(null); setPhotoRefreshKey(k => k + 1); }}
            property={{
              id: selectedTenant.id,
              address: selectedTenant.address,
              address_id: selectedAddressId,
              apartment_number: selectedTenant.apartmentNumber || '',
              rooms: selectedTenant.rooms || 0,
              area: selectedTenant.area || 0,
              floor: (selectedTenant as any).floor || 0,
              type: (selectedTenant as any).property_type || 'apartment',
              status: (selectedTenant as any).property_status || selectedTenant.status,
              rent: (selectedTenant as any).rent || selectedTenant.monthlyRent || 0,
              deposit_amount: (selectedTenant as any).deposit_amount ?? selectedTenant.deposit ?? null,
              extended_details: {
                ...((selectedTenant as any).extended_details || {}),
                // Resolve card background from address settings for the modal
                card_background: (() => {
                  const addr = orderedAddresses.find(a => a.id === selectedAddressId);
                  const s = addr?.address_settings;
                  if (!s) return undefined;
                  const settings = Array.isArray(s) ? s[0] : s;
                  return settings?.building_info?.card_background;
                })(),
              },
              under_maintenance: (selectedTenant as any).under_maintenance ?? false,
            }}
            moveOut={{
              notice: '',
              planned: '',
              status: 'none'
            }}

            meters={selectedTenant.meters ? Array.from(selectedTenant.meters.values()).map((meter: any) => {
              // Passing meter to TenantDetailModalPro
              return {
                id: meter.id,
                name: meter.name,
                type: meter.type,
                serialNumber: meter.serialNumber,
                lastReading: meter.lastReading,
                lastReadingDate: meter.lastReadingDate,
                requires_photo: meter.requires_photo,
                price_per_unit: meter.price_per_unit,
                fixed_price: meter.fixed_price,
                distribution_method: meter.distribution_method,
                description: meter.description,
                unit: meter.unit,
                currentReading: meter.currentReading,
                status: meter.status,
                isFixedMeter: meter.isFixedMeter,
                isCommunalMeter: meter.isCommunalMeter,
                costPerApartment: meter.costPerApartment
              };
            }) : []}
            onPropertyUpdated={handlePropertyUpdated}
          />
        </React.Suspense>
      )}

      {/* Add Address Modal */}
      <React.Suspense fallback={<div className="fixed inset-0 bg-black/50 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div></div>}>
        <AddAddressModal
          isOpen={showAddAddressModal}
          onClose={() => setShowAddAddressModal(false)}
          onSave={async (addressData) => {
            try {
              // Saving address data

              // Get current user session
              const { data: { user }, error: authError } = await supabase.auth.getUser();
              if (authError || !user) {
                throw new Error('Neprisijungęs vartotojas. Prašome prisijungti.');
              }

              // Check if address already exists (in user's accessible addresses via user_addresses)
              // Helper function to normalize address for comparison
              const normalizeAddr = (addr: string): string => {
                return addr
                  .toLowerCase()
                  .trim()
                  .replace(/\s+/g, ' ')
                  .replace(/g\.\s*/g, 'g. ')
                  .replace(/pr\.\s*/g, 'pr. ')
                  .replace(/al\.\s*/g, 'al. ')
                  .replace(/[ąĄ]/g, 'a')
                  .replace(/[čČ]/g, 'c')
                  .replace(/[ęĘ]/g, 'e')
                  .replace(/[ėĖ]/g, 'e')
                  .replace(/[įĮ]/g, 'i')
                  .replace(/[šŠ]/g, 's')
                  .replace(/[ųŲ]/g, 'u')
                  .replace(/[ūŪ]/g, 'u')
                  .replace(/[žŽ]/g, 'z');
              };

              const { data: userAddressLinks, error: checkError } = await supabase
                .from('user_addresses')
                .select('address_id, addresses!inner(id, full_address)')
                .eq('user_id', user.id);

              if (checkError) {
                console.error('Error checking existing addresses:', checkError);
                // Continue with creation if check fails (non-blocking)
              }

              // Check for duplicate using normalization
              const normalizedInput = normalizeAddr(addressData.address.fullAddress);
              const duplicateAddress = userAddressLinks?.find((ua: any) => {
                const existingAddr = ua.addresses?.full_address;
                if (!existingAddr) return false;
                return normalizeAddr(existingAddr) === normalizedInput;
              });

              if (duplicateAddress) {
                // Silently close modal and scroll to existing address
                setShowAddAddressModal(false);
                await refreshData();
                setTimeout(() => {
                  const addressElement = document.querySelector(`[data-address-id="${duplicateAddress.address_id}"]`);
                  if (addressElement) {
                    addressElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
                }, 300);
                return;
              }

              // Save address to database
              const { data, error } = await supabase
                .from('addresses')
                .insert({
                  full_address: addressData.address.fullAddress,
                  city: addressData.address.city,
                  postal_code: addressData.location.postalCode,
                  coordinates_lat: addressData.location.coordinates?.lat,
                  coordinates_lng: addressData.location.coordinates?.lng,
                  created_by: user.id
                })
                .select()
                .single();

              if (error) {
                // Error saving address - logging removed for production
                throw error;
              }

              // Address saved successfully

              setShowAddAddressModal(false);
              // Refresh data after adding address
              await refreshData();
              // Show success message
              // Address added successfully

            } catch (error: any) {
              // Error in onSave - logging removed for production
              if (import.meta.env.DEV) {
                console.error('Error saving address:', error);
              }

              // Check for Supabase error structure
              const errorCode = error?.code || error?.status || error?.statusCode;
              const errorMsg = error?.message || error?.error?.message || '';

              let errorMessage = 'Klaida išsaugant adresą. Bandykite dar kartą.';

              if (errorCode === 403 || errorCode === 'PGRST301' || errorMsg.includes('403') || errorMsg.includes('permission denied') || errorMsg.includes('row-level security')) {
                errorMessage = 'Klaida: neturite teisių išsaugoti adreso. Prašome:\n1. Patikrinkite, ar esate prisijungę\n2. Jei problema išlieka, atsijunkite ir prisijunkite iš naujo\n3. Jei problema tęsiasi, susisiekite su administratoriumi';
              } else if (errorCode === 400 || errorMsg.includes('400')) {
                errorMessage = 'Klaida: neteisingi duomenys. Patikrinkite visus laukus ir bandykite dar kartą.';
              } else if (errorMsg.includes('network') || errorMsg.includes('fetch')) {
                errorMessage = 'Klaida: ryšio problema. Patikrinkite interneto ryšį ir bandykite dar kartą.';
              }

              alert(errorMessage);
            }
          }}
        />
      </React.Suspense>

      {/* Add Apartment Modal */}
      <React.Suspense fallback={<div className="fixed inset-0 bg-black/50 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div></div>}>
        <AddApartmentModal
          isOpen={showAddApartmentModal}
          onClose={() => setShowAddApartmentModal(false)}
          address={selectedAddressForApartment}
          addressId={selectedAddressIdForApartment}
          onAdd={async (apartmentData: any) => {
            try {
              // Validate required fields
              if (!selectedAddressIdForApartment) {
                throw new Error('Nepasirinktas adresas');
              }

              if (apartmentData.type === 'single') {
                // Validate single apartment data
                if (!apartmentData.apartmentNumber?.trim()) {
                  throw new Error('Buto numeris yra privalomas');
                }

                // Create single apartment in database
                const insertData: Record<string, any> = {
                  address_id: selectedAddressIdForApartment,
                  apartment_number: apartmentData.apartmentNumber.trim(),
                  tenant_name: apartmentData.tenantName?.trim() || '',
                  phone: apartmentData.tenantPhone?.trim() || '',
                  email: apartmentData.tenantEmail?.trim() || '',
                  rent: apartmentData.monthlyRent || 0,
                  area: apartmentData.area || 0,
                  rooms: apartmentData.rooms || 0,
                  deposit_amount: apartmentData.deposit || 0,
                  deposit_paid_amount: 0,
                  deposit_paid: false,
                  deposit_returned: false,
                  deposit_deductions: 0,
                  status: apartmentData.tenantName?.trim() ? 'occupied' : 'vacant',
                  auto_renewal_enabled: false,
                  notification_count: 0,
                  original_contract_duration_months: 12
                };
                if (apartmentData.contractStart) insertData.contract_start = apartmentData.contractStart;
                if (apartmentData.contractEnd) insertData.contract_end = apartmentData.contractEnd;

                const { data, error } = await supabase
                  .from('properties')
                  .insert(insertData)
                  .select();

                if (error) {
                  // Error adding apartment - logging removed for production
                  if (error.code === '23505') {
                    throw new Error('Butas su tokiu numeriu jau egzistuoja šiame adrese');
                  } else if (error.code === '23503') {
                    throw new Error('Klaida: adresas nerastas arba neturite teisių');
                  } else if (error.code === '42501') {
                    throw new Error('Klaida: neturite teisių pridėti butą');
                  }
                  throw new Error(`Duomenų bazės klaida: ${error.message}`);
                }

                // Apartment added successfully

                // Create meters for the new apartment
                if (data && data.length > 0 && apartmentData.meters && apartmentData.meters.length > 0) {
                  const propertyId = data[0].id;
                  const metersToInsert = apartmentData.meters.map((meter: any) => ({
                    property_id: propertyId,
                    name: meter.name,
                    type: 'individual',
                    unit: meter.unit,
                    price_per_unit: meter.rate || 0,
                    distribution_method: 'per_consumption',
                    requires_photo: meter.photoRequired || false,
                    is_active: true,
                    is_custom: false,
                    description: meter.note || ''
                  }));

                  const { error: metersError } = await supabase
                    .from('apartment_meters')
                    .insert(metersToInsert);

                  if (metersError) {
                    // Error creating apartment meters - logging removed for production
                    // Don't throw error here, apartment was created successfully
                  } else {
                    // Apartment meters created successfully
                  }
                }

              } else if (apartmentData.type === 'multiple') {
                // Validate multiple apartments data
                for (let i = 0; i < apartmentData.apartments.length; i++) {
                  const apt = apartmentData.apartments[i];
                  if (!apt.apartmentNumber?.trim()) {
                    throw new Error(`Buto ${i + 1}: numeris yra privalomas`);
                  }
                }

                // Create multiple apartments in database
                const apartmentsToInsert = apartmentData.apartments.map((apt: any) => {
                  const aptData: Record<string, any> = {
                    address_id: selectedAddressIdForApartment,
                    apartment_number: apt.apartmentNumber.trim(),
                    tenant_name: apt.tenantName?.trim() || '',
                    phone: apt.tenantPhone?.trim() || '',
                    email: apt.tenantEmail?.trim() || '',
                    rent: apt.monthlyRent || 0,
                    area: apt.area || 0,
                    rooms: apt.rooms || 0,
                    deposit_amount: apt.deposit || 0,
                    deposit_paid_amount: 0,
                    deposit_paid: false,
                    deposit_returned: false,
                    deposit_deductions: 0,
                    status: apt.tenantName?.trim() ? 'occupied' : 'vacant',
                    auto_renewal_enabled: false,
                    notification_count: 0,
                    original_contract_duration_months: 12
                  };
                  if (apt.contractStart) aptData.contract_start = apt.contractStart;
                  if (apt.contractEnd) aptData.contract_end = apt.contractEnd;
                  return aptData;
                });

                const { data, error } = await supabase
                  .from('properties')
                  .insert(apartmentsToInsert)
                  .select();

                if (error) {
                  // Error adding apartments - logging removed for production
                  if (error.code === '23505') {
                    throw new Error('Vienas ar keli butai su tokiu numeriu jau egzistuoja šiame adrese');
                  } else if (error.code === '23503') {
                    throw new Error('Klaida: adresas nerastas arba neturite teisių');
                  } else if (error.code === '42501') {
                    throw new Error('Klaida: neturite teisių pridėti butus');
                  }
                  throw new Error(`Duomenų bazės klaida: ${error.message}`);
                }

                // Apartments added successfully

                // Create meters for all new apartments
                if (data && data.length > 0 && apartmentData.meters && apartmentData.meters.length > 0) {
                  const metersToInsert = [];

                  for (let i = 0; i < data.length; i++) {
                    const property = data[i];
                    const propertyMeters = apartmentData.meters.map((meter: any) => ({
                      property_id: property.id,
                      name: meter.name,
                      type: 'individual',
                      unit: meter.unit,
                      price_per_unit: meter.rate || 0,
                      distribution_method: 'per_consumption',
                      requires_photo: meter.photoRequired || false,
                      is_active: true,
                      is_custom: false,
                      description: meter.note || ''
                    }));

                    metersToInsert.push(...propertyMeters);
                  }

                  const { error: metersError } = await supabase
                    .from('apartment_meters')
                    .insert(metersToInsert);

                  if (metersError) {
                    // Error creating apartment meters - logging removed for production
                    // Don't throw error here, apartments were created successfully
                  } else {
                    // Apartment meters created successfully for all apartments
                  }
                }
              }

              // Don't close modal here — modal controls its own close for multi-add flow
              // Refresh data so newly added apartment(s) appear in list
              await refreshData();

            } catch (error) {
              const msg = error instanceof Error ? error.message : 'Nežinoma klaida';
              alert(`Klaida pridedant butą(us): ${msg}`);
            }
          }}
        />
      </React.Suspense>

      {/* Floating Chat */}
      {user?.id && (
        <MessagingPanel
          currentUserId={user.id}
          currentUserName={user.email?.split('@')[0]}
        />
      )}

      {/* First-time user guided tour */}
      <OnboardingTour
        isActive={tour.isActive}
        currentStep={tour.currentStep}
        currentStepIndex={tour.currentStepIndex}
        totalSteps={tour.totalSteps}
        isFirstStep={tour.isFirstStep}
        isLastStep={tour.isLastStep}
        onNext={tour.nextStep}
        onPrev={tour.prevStep}
        onSkip={tour.skipTour}
      />
      
      {/* First-Login Welcome Protocol */}
      <WelcomeModal />
    </div>
  );
});

Nuomotojas2Dashboard.displayName = 'Nuomotojas2Dashboard';

export default Nuomotojas2Dashboard;