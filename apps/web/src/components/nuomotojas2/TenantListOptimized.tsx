/* eslint-disable react/prop-types */
import React, { useState, useMemo, useCallback, useEffect, useRef, useTransition, useDeferredValue } from 'react';
import { formatCurrency, formatDate, useDebouncedSearch } from '../../utils/format';
import { createCollectionRequestsForAddress } from '../../utils/meterCollection';
// Removed problematic performance hooks
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ChatBubbleLeftRightIcon,
  BuildingOfficeIcon,
  PlusIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import { PropertyDetailsModal } from '../properties/PropertyDetailsModal';
import { Tenant } from '../../types/tenant';

// Performance optimized scroll classes
const scrollClasses = {
  smooth: 'scroll-smooth overscroll-contain scrollbar-gutter-stable',
  auto: 'scroll-auto'
};

// Simple virtualization for large lists
const SimpleVirtualList: React.FC<{
  items: any[];
  renderItem: (item: any, index: number) => React.ReactNode;
}> = ({ items, renderItem }) => {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const itemHeight = 65; // Balanced height per item
  const containerHeight = 780; // Show ~12 items (12 * 65 = 780)
  const overscan = 5;
  
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(items.length, Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan);
  
  const visibleItems = items.slice(startIndex, endIndex);
  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;
  
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);
  
  return (
    <div 
      ref={containerRef}
      style={{ height: containerHeight, overflow: 'auto' }}
      onScroll={handleScroll}
      className="border rounded-lg"
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, index) => (
            <div key={startIndex + index} style={{ height: itemHeight }}>
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Using centralized Tenant type from types/tenant.ts

interface TenantListOptimizedProps {
  tenants: Tenant[];
  onTenantClick: (tenant: Tenant) => void;
  selectedTenant: Tenant | null;
  onChatClick: (address: string) => void;
  onAddApartment: (address: string) => void;
  onSettingsClick: (address: string, addressId?: string) => void;
}

interface AddressGroupProps {
  address: string;
  tenants: Tenant[];
  isExpanded: boolean;
  onToggle: () => void;
  onTenantClick: (tenant: Tenant) => void;
  selectedTenant: Tenant | null;
  onChatClick: (address: string) => void;
  onAddApartment: (address: string) => void;
  onSettingsClick: (address: string, addressId?: string) => void;
}

// Optimized TenantRow component with React.memo
const TenantRow = React.memo<{
  tenant: Tenant;
  isSelected: boolean;
  onSelect: (tenant: Tenant) => void;
// eslint-disable-next-line react/prop-types
}>(({ tenant, isSelected, onSelect }) => {
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Išjungti bet kokius scroll'us ar focus'us
    onSelect(tenant);
  }, [tenant, onSelect]);

  // Real payment progress calculation
  const paidPct = tenant.payment_status === 'paid' ? 100 : 
                  tenant.payment_status === 'overdue' ? 0 : 
                  tenant.payment_status === 'unpaid' ? 0 : 60;
  
  // Real days late calculation based on last payment date
  const calculateDaysLate = () => {
    if (tenant.payment_status !== 'overdue' || !tenant.last_payment_date) return 0;
    const lastPayment = new Date(tenant.last_payment_date);
    const today = new Date();
    const diffTime = today.getTime() - lastPayment.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };
  const daysLate = calculateDaysLate();
  
  // Real deposit check
  const depositLow = tenant.deposit < tenant.monthlyRent;
  
  // Real meters check
  const metersMissing = !tenant.meters_submitted;

  return (
    <div
      data-tenant-id={tenant.id}
      className={`tenant-row group grid grid-cols-[auto,1fr,auto] items-center gap-3 px-3 py-3
                  border-b border-gray-100 hover:bg-gradient-to-r hover:from-[#2F8481]/8 hover:to-[#2F8481]/15
                  transform-gpu transition-all duration-300 ease-out 
                  hover:scale-[1.01] hover:shadow-md cursor-pointer rounded-lg mx-1 my-1
                  ${isSelected ? 'bg-gradient-to-r from-[#2F8481]/15 to-[#2F8481]/8 border-[#2F8481]/40 shadow-md' : ''}`}
      onClick={handleClick}
      style={{
        contentVisibility: 'auto',
        containIntrinsicSize: '65px'
      }}
    >
      {/* Kairė - Avatar */}
      <div className="size-8 rounded-xl bg-gradient-to-br from-[#2F8481] to-[#297a77] text-white grid place-items-center text-sm font-bold flex-shrink-0 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-sm group-hover:shadow-md">
        {tenant.name.charAt(0).toUpperCase()}
      </div>

      {/* Vidurys - Info */}
      <div className="min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="truncate text-sm font-medium text-gray-900">{tenant.name}</div>
          {/* mažos žymos tik jei yra */}
          {depositLow && <span className="chip chip-warn text-xs">Dep &lt; 1 mėn.</span>}
          {metersMissing && <span className="chip chip-warn text-xs">Skaitl. nepateikti</span>}
        </div>
        <div className="truncate text-xs text-neutral-500">
          Butas {tenant.apartmentNumber} • {tenant.address}
        </div>

        {/* Micro-juosta – progreso indikacija šio mėn. apmokėjimui */}
        <div className="mt-0.5 micro-progress">
          <div className="micro-progress-fill" style={{ width: `${paidPct}%` }} />
        </div>
      </div>

      {/* Dešinė - Kainos ir chip'ai */}
      <div className="text-right tabular-nums">
        <div className="text-sm font-semibold text-gray-900">
          {tenant.status === 'vacant' ? '—' : formatCurrency(tenant.monthlyRent)}
        </div>
        <div className="mt-0.5 flex items-center gap-0.5 justify-end flex-wrap">
          {tenant.status !== 'vacant' && (
            <>
              {(tenant.outstanding_amount || 0) > 0 ? (
                <span className="chip chip-danger text-xs">Skola {formatCurrency(tenant.outstanding_amount || 0)}</span>
              ) : (
                <span className="chip chip-ok text-xs">Nėra skolos</span>
              )}
              {daysLate > 0 && <span className="chip chip-danger text-xs">D+{daysLate}</span>}
            </>
          )}
          <span className="chip chip-neutral text-xs">Iki {tenant.contractEnd ? formatDate(tenant.contractEnd) : 'Nenurodyta'}</span>
          <span className={`chip text-xs ${
            tenant.status === 'active' ? 'chip-brand' :
            tenant.status === 'expired' ? 'chip-danger' :
            tenant.status === 'moving_out' ? 'chip-warn' :
            tenant.status === 'vacant' ? 'chip-neutral' :
            'chip-warn'
          }`}>
            {tenant.status === 'active' ? 'Aktyvus' :
             tenant.status === 'expired' ? 'Baigėsi' : 
             tenant.status === 'moving_out' ? 'Išsikrausto' :
             tenant.status === 'vacant' ? 'Laisvas' :
             'Laukia'}
          </span>
        </div>
      </div>
    </div>
  );
});

TenantRow.displayName = 'TenantRow';

const AddressGroup: React.FC<AddressGroupProps> = ({
  address,
  tenants,
  isExpanded,
  onToggle,
  onTenantClick,
  selectedTenant,
  onChatClick,
  onAddApartment,
  onSettingsClick
}) => {
  // Išjungti smooth scroll kai modalas atidarytas
  const isModalOpen = selectedTenant !== null;
  const groupRef = useRef<HTMLDivElement>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to show address at top when expanded
  useEffect(() => {
    if (isExpanded && groupRef.current) {
      // Add visual feedback
      groupRef.current.style.boxShadow = '0 0 0 3px rgba(47, 132, 129, 0.3)';
      
      // Išjungti scrollIntoView - neleisti Dashboard'ui "šokinėti"
      // setTimeout(() => {
      //   const element = groupRef.current;
      //   if (element) {
      //     // Scroll to show address at top, tenants below
      //     element.scrollIntoView({ 
      //       behavior: 'smooth',
      //       block: 'start' // Changed from 'center' to 'start'
      //     });
      //     
      //     // Remove visual feedback after scroll
      //     setTimeout(() => {
      //       if (groupRef.current) {
      //         groupRef.current.style.boxShadow = '';
      //       }
      //     }, 1000);
      //   }
      // }, 200); // Delay to ensure DOM is fully updated
    }
  }, [isExpanded]);

  // "Scrolling" vėliava (optimizuota)
  useEffect(() => {
    const el = parentRef.current; if (!el) return;
    let raf = 0, t: number | undefined;
    const onScroll = () => {
      el.dataset.scrolling = '1';
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (t) clearTimeout(t);
        t = window.setTimeout(() => { delete el.dataset.scrolling; }, 80);
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const onRowClick = useCallback((id: string) => {
    const tenant = tenants.find(t => t.id === id);
    if (tenant) {
      // Išjungti bet kokius scroll'us ar focus'us - modalas atsidarys ramiai
      onTenantClick(tenant);
    }
  }, [tenants, onTenantClick]);

  const renderTenantItem = useCallback((tenant: Tenant, index: number) => (
    <div data-tenant-id={tenant.id}>
      <TenantRow 
        tenant={tenant}
        isSelected={selectedTenant?.id === tenant.id}
        onSelect={(tenant: Tenant) => onRowClick(tenant.id)}
      />
    </div>
  ), [selectedTenant, onRowClick]);

      return (
      <div ref={groupRef} data-address-group={address} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {/* Address Header - optimizuotas */}
        <div className="bg-white sticky top-0 z-10 border-b px-4 py-2" style={{ willChange: 'transform' }}>
          <div className="flex items-center justify-between">
            <div 
              className="flex items-center space-x-3 flex-1 cursor-pointer hover:bg-gray-50 rounded-lg p-2 transition-colors duration-200 group"
              onClick={onToggle}
            >
              <BuildingOfficeIcon className="h-5 w-5 text-[#2F8481] flex-shrink-0" />
              <h3 className="text-lg font-semibold text-gray-900 truncate">{address}</h3>
              <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full flex-shrink-0">
                {tenants.length} butų
              </span>
              <div className="text-gray-400 text-sm group-hover:text-gray-600 transition-colors duration-200">
                {isExpanded ? 'Suskleisti' : 'Išskleisti'}
              </div>
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0">
              <button
                onClick={onToggle}
                className="p-2 text-gray-600 hover:text-[#2F8481] hover:bg-gray-100 rounded-lg transition-colors"
              >
                {isExpanded ? (
                  <ChevronUpIcon className="h-5 w-5" />
                ) : (
                  <ChevronDownIcon className="h-5 w-5" />
                )}
              </button>
              <button
                onClick={() => onChatClick(address)}
                className="p-2 text-gray-600 hover:text-[#2F8481] hover:bg-gray-100 rounded-lg transition-colors"
                title="Chat su nuomininkais"
              >
                <ChatBubbleLeftRightIcon className="h-5 w-5" />
              </button>
                              <button
                  onClick={() => {
                    // Find the address_id from the first tenant in this address group
                    const firstTenant = tenants.find(t => t.address === address);
                    const addressId = firstTenant?.address_id;
                    onSettingsClick(address, addressId);
                  }}
                  className="p-2 text-gray-600 hover:text-[#2F8481] hover:bg-gray-100 rounded-lg transition-colors"
                  title="Adreso nustatymai"
                >
                <Cog6ToothIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => onAddApartment(address)}
                className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                title="Pridėti butą prie šio adreso"
              >
                <PlusIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
          
          {/* KPI Bar - Enterprise Look */}
          {isExpanded && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between text-xs text-gray-600">
                <div className="flex items-center space-x-4">
                  <span>Butų: {tenants.length}</span>
                  <span>Užimta: {tenants.filter(t => t.status === 'active').length}</span>
                  <span>Laisva: {tenants.filter(t => t.status === 'expired' || t.status === 'pending').length}</span>
                  <span>Užimtumas: {Math.round((tenants.filter(t => t.status === 'active').length / tenants.length) * 100)}%</span>
                  <span>Skolos: {formatCurrency(tenants.reduce((sum, t) => sum + (t.outstanding_amount || 0), 0))}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="chip chip-success">Užimta</button>
                  <button className="chip chip-neutral">Laisva</button>
                  <button className="chip chip-danger">Skolos</button>
                </div>
              </div>
            </div>
          )}
        </div>

      {/* Tenant Items with Virtualization for large lists */}
      {isExpanded && (
        <div>
                      {tenants.length > 30 ? (
            <div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-1 mb-1">
                <p className="text-xs text-yellow-800">
                  🔍 Virtualized: ~30 items of {tenants.length} total
                </p>
              </div>
                              <SimpleVirtualList
                    items={tenants}
                    renderItem={renderTenantItem}
                  />
            </div>
          ) : (
                          <div className={`${isModalOpen ? scrollClasses.auto : scrollClasses.smooth} divide-y divide-gray-100`}>
              {tenants.map((tenant) => (
                <div key={tenant.id} data-tenant-id={tenant.id}>
                  <TenantRow 
                    tenant={tenant}
                    isSelected={selectedTenant?.id === tenant.id}
                    onSelect={onTenantClick}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const TenantListOptimized: React.FC<TenantListOptimizedProps> = ({
  tenants,
  onTenantClick,
  selectedTenant,
  onChatClick,
  onAddApartment,
  onSettingsClick
}) => {
  // Išjungti smooth scroll kai modalas atidarytas
  const isModalOpen = selectedTenant !== null;
  const [expandedAddresses, setExpandedAddresses] = useState<Set<string>>(new Set());
  const { query: searchQuery, setQuery: setSearchQuery, debouncedQuery } = useDebouncedSearch(200);
  const deferredSearchQuery = useDeferredValue(debouncedQuery);
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [loadingTime, setLoadingTime] = useState<number>(0);
  const [isPending, startTransition] = useTransition();
  const [isCollectingAll, setIsCollectingAll] = useState(false);
  
  // Simple performance tracking without hooks
  const [renderCount, setRenderCount] = useState(0);

  // Handle bulk collection for all addresses
  const handleCollectAllReadings = async () => {
    setIsCollectingAll(true);
    try {
      const uniqueAddresses = Array.from(new Set(tenants.map(t => t.address_id).filter(Boolean))) as string[];
      let totalRequests = 0;
      
      for (const addressId of uniqueAddresses) {
        if (addressId) {
          const requests = await createCollectionRequestsForAddress(addressId);
          totalRequests += requests.length;
        }
      }
      
      if (totalRequests > 0) {
        alert(`Išsiųsta ${totalRequests} prašymų pateikti skaitliukų rodmenis!`);
      } else {
        alert('Nėra skaitliukų, kuriems reikia fotografijų, arba nėra nuomininkų.');
      }
    } catch (error) {
      console.error('Error collecting all readings:', error);
      alert('Klaida siųsiant prašymus. Bandykite vėliau.');
    } finally {
      setIsCollectingAll(false);
    }
  };

  // Simple render tracking
  useEffect(() => {
    setRenderCount(prev => prev + 1);
    setLoadingTime(Date.now());
  }, [tenants.length]);

  // Memoized handlers
  const handleTenantClick = useCallback((tenant: Tenant) => {
    onTenantClick(tenant);
    
    // Išjungti scrollIntoView - neleisti Dashboard'ui "šokinėti"
    // // Find the address group containing this tenant and scroll to it
    // setTimeout(() => {
    //   const tenantElement = document.querySelector(`[data-tenant-id="${tenant.id}"]`);
    //   if (tenantElement) {
    //     const addressGroup = tenantElement.closest('[data-address-group]');
    //     if (addressGroup) {
    //       addressGroup.scrollIntoView({
    //         behavior: 'smooth',
    //         block: 'start' // Show address at top, tenants below
    //       });
    //     }
    //   }
    // }, 50);
  }, [onTenantClick]);

  const handleAddressToggle = useCallback((address: string) => {
    setExpandedAddresses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(address)) {
        // If clicking the same address, close it
        newSet.delete(address);
      } else {
        // If clicking a different address, close all others and open this one
        newSet.clear();
        newSet.add(address);
      }
      return newSet;
    });
  }, []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    startTransition(() => {
      setSearchQuery(e.target.value);
    });
  }, [startTransition, setSearchQuery]);

  const handleStatusFilterChange = useCallback((status: string) => {
    startTransition(() => setStatusFilter(status));
  }, [startTransition]);

  const handleSortChange = useCallback((sort: string) => {
    startTransition(() => setSortBy(sort));
  }, [startTransition]);

  // Filter and sort tenants
  const filteredAndSortedTenants = useMemo(() => {
    const filtered = tenants.filter(tenant => {
      const matchesSearch = deferredSearchQuery === '' || 
        tenant.name.toLowerCase().includes(deferredSearchQuery.toLowerCase()) ||
        tenant.email.toLowerCase().includes(deferredSearchQuery.toLowerCase()) ||
        tenant.phone.includes(deferredSearchQuery) ||
        tenant.address.toLowerCase().includes(deferredSearchQuery.toLowerCase());
      
      const matchesStatus = !statusFilter || tenant.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });

    // Sort tenants
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'address':
          return a.address.localeCompare(b.address);
        case 'status':
          return a.status.localeCompare(b.status);
        case 'contractEnd':
          return new Date(a.contractEnd).getTime() - new Date(b.contractEnd).getTime();
        default:
          return 0;
      }
    });

    return filtered;
  }, [tenants, debouncedQuery, statusFilter, sortBy]);

  // Group tenants by address
  const groupedTenants = useMemo(() => {
    const groups: { [key: string]: Tenant[] } = {};
    filteredAndSortedTenants.forEach(tenant => {
      if (!groups[tenant.address]) {
        groups[tenant.address] = [];
      }
      groups[tenant.address].push(tenant);
    });
    return groups;
  }, [filteredAndSortedTenants]);

  return (
    <div className="space-y-4">
      {/* Performance indicator - simplified */}
      {process.env.NODE_ENV === 'development' && (
        <div className="px-3 py-2 text-xs text-neutral-600 bg-neutral-50 rounded-lg mb-4">
          <div className="flex items-center justify-between">
            <div>
              {tenants.length} nuomininkai • ⚡ Virtualized
              {isPending && <span className="ml-2 text-blue-600">🔄 Atnaujinama...</span>}
            </div>
            <div className="text-xs text-neutral-500">
              Renders: {renderCount}
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters - optimizuotas */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Ieškoti nuomininkų..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="rounded-xl border px-3 py-2 text-sm focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481] w-full"
            />
            {isPending && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-[#2F8481] border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => handleStatusFilterChange(e.target.value)}
            className="rounded-xl border px-3 py-2 text-sm focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481]"
          >
            <option value="">Visi statusai</option>
            <option value="active">Aktyvūs</option>
            <option value="expired">Baigėsi</option>
            <option value="pending">Laukia</option>
          </select>
          
          <select
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value)}
            className="rounded-xl border px-3 py-2 text-sm focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481]"
          >
            <option value="name">Pagal vardą</option>
            <option value="address">Pagal adresą</option>
            <option value="status">Pagal statusą</option>
            <option value="contractEnd">Pagal sutarties pabaigą</option>
          </select>
        </div>
        
        {/* Collection Button */}
        <div className="flex justify-end pt-3 border-t border-gray-200 mt-4">
          <button
            onClick={handleCollectAllReadings}
            disabled={isCollectingAll || tenants.length === 0}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors flex items-center gap-2"
          >
            {isCollectingAll ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Siunčia...
              </>
            ) : (
              <>
                📷 Surinkti visus rodmenis
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tenant Groups */}
      <div className="space-y-4">
        {Object.entries(groupedTenants).map(([address, addressTenants]) => (
          <div key={address} className="rounded-2xl border bg-white overflow-hidden">
            {/* Virtualization indicator for each group */}
            {addressTenants.length > 3 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-1 mb-1">
                <p className="text-xs text-green-800">
                  ⚡ {address} ({addressTenants.length})
                </p>
              </div>
            )}
            <AddressGroup
              address={address}
              tenants={addressTenants}
              isExpanded={expandedAddresses.has(address)}
              onToggle={() => handleAddressToggle(address)}
              onTenantClick={handleTenantClick}
              selectedTenant={selectedTenant}
              onChatClick={onChatClick}
              onAddApartment={onAddApartment}
              onSettingsClick={onSettingsClick}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default TenantListOptimized; 