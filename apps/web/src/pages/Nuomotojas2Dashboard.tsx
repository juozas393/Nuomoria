import React, { useState, useCallback, useMemo } from 'react';

// Lazy load heavy components for better performance
const AddAddressModal = React.lazy(() => import('../components/properties/AddAddressModal'));
const AddApartmentModal = React.lazy(() => import('../components/properties/AddApartmentModal').then(module => ({ default: module.AddApartmentModal })));
const TenantListOptimized = React.lazy(() => import('../components/nuomotojas2/TenantListOptimized'));
const TenantDetailModalPro = React.lazy(() => import('../components/nuomotojas2/TenantDetailModalPro'));
import { PlusIcon, Cog6ToothIcon, TrashIcon, BuildingOfficeIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
// VirtualizedList removed for stability - using optimized regular rendering
import { useAuth } from '../context/AuthContext';
import { useProperties, useAddresses, useStats } from '../context/DataContext';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
// Performance monitoring removed to prevent reload loops
import AddressSettingsModal from '../components/properties/AddressSettingsModal';
import { AddressSettings } from '../data/addressSettingsData';
import { getAddressSettings, saveAddressSettings, getDefaultAddressSettings } from '../data/addressSettingsData';
import { addressApi, propertyApi, meterReadingApi } from '../lib/database';
import { supabase } from '../lib/supabase';
import { Tenant } from '../types/tenant';
// Context Panel imports removed - using modal instead
// Optimized image loading
// Background image path (optimized - modern cityscape)
const addressImage = '/images/DashboardBackground_bw.webp';
import { OptimizedImage } from '../components/ui/OptimizedImage';
import { formatCurrency } from '../utils/format';
import MessagingPanel from '../components/MessagingPanel';
import { ParticleDrift } from '../components/ui/ParticleDrift';

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
}

const Nuomotojas2Dashboard: React.FC = React.memo(() => {
  const { user } = useAuth();

  // Performance monitoring removed to prevent reload loops

  // Optimized data hooks with RBAC
  const { properties, loading: propertiesLoading, refetch: refetchProperties } = useProperties();
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



  // Derived state with memoization for performance
  const isLoading = propertiesLoading || addressesLoading;

  // Debug loading states removed - issue resolved



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
      contractStart: property.contract_start,
      contractEnd: property.contract_end,
      moveInDate: property.contract_start,
      monthlyRent: property.rent || 0,
      deposit: property.deposit_amount || 0,
      area: property.area || 0,
      rooms: property.rooms || 0,
      photos: [],
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
        companyEmail: property.address.company_email
      } : null,
      meters: [],
      outstanding_amount: property.outstanding_amount || 0,
      last_payment_date: property.last_payment_date || '',
      move_out_notice_date: property.move_out_notice_date || '',
      planned_move_out_date: property.planned_move_out_date || '',
      meters_submitted: property.meter_readings && property.meter_readings.length > 0,
      meters_due_date: property.meters_due_date || '',
      property_type: property.property_type || 'apartment',
      heating_type: property.heating_type || 'central',
      parking_spaces: property.parking_spaces || 0,
      balcony: property.balcony || false,
      furnished: property.furnished || false
    }));
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
      chairman_email: address.chairman_email
    }));
  }, [addresses]);



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
  }, []);

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
      // Delete meter readings first
      await supabase
        .from('meter_readings')
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
      // Starting bulk address deletion - logging removed for production

      // 1. Find all properties for this address
      const propertiesToDelete = properties?.filter(property =>
        property.address?.id === addressToDelete.id ||
        property.address === addressToDelete.full_address
      ) || [];

      const propertyIds = propertiesToDelete.map(p => p.id);
      // Found properties to delete - logging removed for production

      // 2. Bulk delete all related data in parallel
      const deletePromises = [];

      // Delete all meter readings for all properties at once
      if (propertyIds.length > 0) {
        console.log(`🗑️ Bulk deleting meter readings for ${propertyIds.length} properties`);
        deletePromises.push(
          supabase
            .from('meter_readings')
            .delete()
            .in('property_id', propertyIds)
            .then(() => console.log(`✅ Bulk deleted meter readings for ${propertyIds.length} properties`))
        );
      }

      // Delete all properties at once
      if (propertyIds.length > 0) {
        console.log(`🗑️ Bulk deleting ${propertyIds.length} properties`);
        deletePromises.push(
          supabase
            .from('properties')
            .delete()
            .in('id', propertyIds)
            .then(() => console.log(`✅ Bulk deleted ${propertyIds.length} properties`))
        );
      }

      // Delete user_addresses relationships
      console.log(`🗑️ Deleting user_addresses relationships for address: ${addressToDelete.id}`);
      deletePromises.push(
        supabase
          .from('user_addresses')
          .delete()
          .eq('address_id', addressToDelete.id)
          .then(() => console.log(`✅ User addresses relationships deleted for address: ${addressToDelete.id}`))
      );

      // Wait for all deletions to complete
      await Promise.all(deletePromises);

      // Delete the address itself
      console.log(`🗑️ Deleting address: ${addressToDelete.id}`);
      await addressApi.delete(addressToDelete.id);
      console.log(`✅ Address deleted: ${addressToDelete.id}`);

      console.log('🎉 Bulk address deletion completed successfully');

      // Close modal and refresh data
      setShowDeleteAddressModal(false);
      setAddressToDelete(null);
      setSelectedAddress(null);
      await refreshData();

    } catch (error) {
      // Error deleting address - logging removed for production
      // Security: Error notification handled by alert
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
      console.log('🗑️ Starting deletion of ALL addresses');

      if (!addresses || addresses.length === 0) {
        console.log('ℹ️ No addresses to delete');
        setShowDeleteAllAddressesModal(false);
        return;
      }

      const addressIds = addresses.map(addr => addr.id);
      console.log(`📋 Found ${addresses.length} addresses to delete:`, addressIds);

      // 1. Find all properties for all addresses
      const allProperties = properties?.filter(property =>
        addressIds.includes(property.address?.id)
      ) || [];

      const propertyIds = allProperties.map(p => p.id);
      console.log(`📋 Found ${allProperties.length} properties to delete:`, propertyIds);

      // 2. Bulk delete all related data in parallel
      const deletePromises = [];

      // Delete all meter readings for all properties at once
      if (propertyIds.length > 0) {
        console.log(`🗑️ Bulk deleting meter readings for ${propertyIds.length} properties`);
        deletePromises.push(
          supabase
            .from('meter_readings')
            .delete()
            .in('property_id', propertyIds)
            .then(() => console.log(`✅ Bulk deleted meter readings for ${propertyIds.length} properties`))
        );
      }

      // Delete all properties at once
      if (propertyIds.length > 0) {
        console.log(`🗑️ Bulk deleting ${propertyIds.length} properties`);
        deletePromises.push(
          supabase
            .from('properties')
            .delete()
            .in('id', propertyIds)
            .then(() => console.log(`✅ Bulk deleted ${propertyIds.length} properties`))
        );
      }

      // Delete all user_addresses relationships
      console.log(`🗑️ Deleting all user_addresses relationships`);
      deletePromises.push(
        supabase
          .from('user_addresses')
          .delete()
          .in('address_id', addressIds)
          .then(() => console.log(`✅ All user addresses relationships deleted`))
      );

      // Wait for all deletions to complete
      await Promise.all(deletePromises);

      // Delete all addresses at once
      console.log(`🗑️ Bulk deleting ${addresses.length} addresses`);
      await supabase
        .from('addresses')
        .delete()
        .in('id', addressIds);
      console.log(`✅ Bulk deleted ${addresses.length} addresses`);

      console.log('🎉 ALL addresses deletion completed successfully');

      // Close modal and refresh data
      setShowDeleteAllAddressesModal(false);
      setSelectedAddress(null);
      await refreshData();

      // Show success message
      alert(`Sėkmingai ištrinta ${addresses.length} adresų ir ${allProperties.length} butų!`);

    } catch (error) {
      // Error deleting all addresses - logging removed for production
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
  const handleTenantClick = useCallback((tenant: Tenant) => {
    setSelectedTenant(tenant);
    // Security: Tenant details modal functionality implemented
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
    // Find the address object from properties
    const addressObj = properties?.find(property =>
      property.address?.id === addressId ||
      property.address?.full_address === address ||
      property.address === address
    )?.address;

    if (addressObj) {
      setSelectedAddress(addressObj);
      setSelectedAddressId(addressId);

      // Load address settings
      const settings = getAddressSettings(address);
      setAddressSettings(settings);

      setShowAddressSettingsModal(true);
    }
  }, [properties]);

  return (
    <div
      className="min-h-full relative overflow-hidden bg-cover bg-center bg-fixed"
      style={{ backgroundImage: `url('/images/BlueArchBackground.webp')` }}
    >
      {/* Particle drift background — snowfall-style effect */}
      <ParticleDrift />

      {/* Content wrapper */}
      <div className="relative z-10 min-h-full">
        {/* Page Header */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <h1 className="text-3xl font-bold text-gray-900">Pagrindinis dashboard</h1>
              <div className="text-gray-500 text-sm">
                {addressCount} adresai • {propertyCount} butai
              </div>
            </div>
          </div>

          {/* Main Content - with gaming theme background */}
          <div
            className="bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.08)] p-4 bg-cover bg-center border border-gray-200/80"
            style={{ backgroundImage: `url('/images/CardsBackground.webp')` }}
          >
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2F8481]"></div>
                <span className="ml-3 text-gray-600">Kraunama...</span>
              </div>
            ) : (
              <div>
                {addressCount === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-gray-500 text-lg mb-4">Nėra pridėtų adresų</div>
                    <p className="text-gray-500 mb-6">Pradėkite pridėdami pirmąjį adresą</p>
                    <button
                      onClick={() => setShowAddAddressModal(true)}
                      className="inline-flex items-center px-6 py-3 bg-[#2F8481] hover:bg-[#297a77] text-white rounded-xl font-semibold transition-colors shadow-sm"
                    >
                      <PlusIcon className="w-5 h-5 mr-2" />
                      Pridėti pirmąjį adresą
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="mb-6">
                      <h2 className="text-2xl font-bold text-gray-900">Adresų kortelės</h2>
                      <p className="text-gray-600">Pasirinkite adresą, kad peržiūrėtumėte jo nuomininkus</p>
                    </div>

                    {/* Show all addresses - optimized rendering */}
                    <div className="space-y-4">
                      {addressList.map((address) => {
                        // Lazy calculate tenant count only when rendering
                        const addressTenants = allTenants.filter(tenant =>
                          tenant.address === address.full_address ||
                          tenant.address_id === address.id
                        );

                        return (
                          <div key={address.id} data-address-id={address.id} className="rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-gray-200/60 bg-white">
                            {/* Address Header — Gradient */}
                            <div className="bg-gradient-to-r from-[#2F8481] to-[#3a9f9c] px-4 py-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center flex-shrink-0">
                                    <BuildingOfficeIcon className="h-5 w-5 text-white" />
                                  </div>
                                  <div className="min-w-0">
                                    <h3 className="text-[14px] font-bold text-white truncate">{address.full_address}</h3>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className="text-[11px] text-white/70">{addressTenants.length} butų</span>
                                      {addressTenants.length > 0 && (
                                        <>
                                          <span className="text-[11px] text-white/40">•</span>
                                          <span className="text-[11px] text-white/90 font-medium">
                                            {Math.round((addressTenants.filter(t => t.status === 'active').length / addressTenants.length) * 100)}% užimta
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <button
                                    onClick={() => handleAddApartment(address.full_address, address.id)}
                                    className="p-1.5 text-white/70 hover:text-white hover:bg-white/15 rounded-lg transition-colors"
                                    title="Pridėti butą"
                                  >
                                    <PlusIcon className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setEditingAddressId(editingAddressId === address.id ? null : address.id); }}
                                    className={`p-1.5 rounded-lg transition-colors ${editingAddressId === address.id ? 'text-white bg-white/20' : 'text-white/70 hover:text-white hover:bg-white/15'}`}
                                    title={editingAddressId === address.id ? 'Baigti redagavimą' : 'Redaguoti'}
                                  >
                                    <PencilSquareIcon className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleSettingsClick(address.full_address, address.id)}
                                    className="p-1.5 text-white/70 hover:text-white hover:bg-white/15 rounded-lg transition-colors"
                                    title="Nustatymai"
                                  >
                                    <Cog6ToothIcon className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Apartment Rows */}
                            {addressTenants.length > 0 ? (
                              <div className="divide-y divide-gray-200/80">
                                {addressTenants.map((tenant) => {
                                  const isVacant = tenant.status === 'vacant';
                                  const statusConfig = tenant.status === 'active'
                                    ? { label: 'Aktyvus', dotColor: 'bg-emerald-500', textColor: 'text-emerald-700' }
                                    : tenant.status === 'expired'
                                      ? { label: 'Baigėsi', dotColor: 'bg-red-500', textColor: 'text-red-700' }
                                      : tenant.status === 'moving_out'
                                        ? { label: 'Išsikrausto', dotColor: 'bg-amber-500', textColor: 'text-amber-700' }
                                        : isVacant
                                          ? { label: 'Laisvas', dotColor: 'bg-gray-400', textColor: 'text-gray-500' }
                                          : { label: 'Laukia', dotColor: 'bg-blue-500', textColor: 'text-blue-700' };

                                  return (
                                    <div
                                      key={tenant.id}
                                      className="group/row flex items-center gap-2.5 px-3 py-2 hover:bg-[#2F8481]/[0.07] border-l-2 border-l-transparent hover:border-l-[#2F8481] transition-colors cursor-pointer"
                                      onClick={() => handleTenantClick(tenant)}
                                    >
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
                                        <div className="text-[13px] font-semibold text-gray-900 truncate">
                                          {isVacant ? `Butas ${tenant.apartmentNumber}` : tenant.name}
                                        </div>
                                        <div className="text-[11px] text-gray-500 truncate mt-0.5">
                                          {isVacant
                                            ? [tenant.rooms ? tenant.rooms + ' kamb.' : null, tenant.area ? tenant.area + ' m²' : null].filter(Boolean).join(' • ') || 'Laisvas butas'
                                            : `Butas ${tenant.apartmentNumber}${tenant.rooms ? ' • ' + tenant.rooms + ' kamb.' : ''}${tenant.area ? ' • ' + tenant.area + ' m²' : ''}`
                                          }
                                        </div>
                                      </div>

                                      {/* Right — status + price + delete */}
                                      <div className="flex items-center gap-3 flex-shrink-0">
                                        <div className="flex items-center gap-1.5">
                                          <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotColor}`} />
                                          <span className={`text-[10px] font-medium ${statusConfig.textColor}`}>{statusConfig.label}</span>
                                        </div>
                                        {!isVacant && (
                                          <div className="text-[13px] font-bold text-gray-900 tabular-nums">
                                            {formatCurrency(tenant.monthlyRent)}
                                          </div>
                                        )}
                                        {editingAddressId === address.id && (
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
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="px-4 py-8 text-center">
                                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                                  <BuildingOfficeIcon className="h-6 w-6 text-gray-400" />
                                </div>
                                <p className="text-[12px] text-gray-500 mb-2">Nėra butų šiame adrese</p>
                                <button
                                  onClick={() => handleAddApartment(address.full_address, address.id)}
                                  className="inline-flex items-center px-3 py-1.5 bg-[#2F8481] text-white text-[11px] font-semibold rounded-lg hover:bg-[#297a77] transition-colors"
                                >
                                  <PlusIcon className="h-3 w-3 mr-1" />
                                  Pridėti butą
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fixed Action Buttons */}
      <div className="fixed bottom-4 left-4 z-50 flex flex-col gap-2 sm:bottom-6 sm:left-6">
        <button
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
            onClose={() => setSelectedTenant(null)}
            property={{
              id: selectedTenant.id,
              address: selectedTenant.address,
              rooms: selectedTenant.rooms || 0,
              area: selectedTenant.area || 0,
              floor: 0,
              type: 'apartment',
              status: selectedTenant.status
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
              if (process.env.NODE_ENV === 'development') {
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
                if (!apartmentData.tenantName?.trim()) {
                  throw new Error('Nuomininko vardas yra privalomas');
                }
                if (!apartmentData.contractStart) {
                  throw new Error('Sutarties pradžios data yra privaloma');
                }
                if (!apartmentData.contractEnd) {
                  throw new Error('Sutarties pabaigos data yra privaloma');
                }

                // Create single apartment in database
                const { data, error } = await supabase
                  .from('properties')
                  .insert({
                    address_id: selectedAddressIdForApartment,
                    apartment_number: apartmentData.apartmentNumber.trim(),
                    tenant_name: apartmentData.tenantName.trim(),
                    phone: apartmentData.tenantPhone?.trim() || '',
                    email: apartmentData.tenantEmail?.trim() || '',
                    rent: apartmentData.monthlyRent || 0,
                    area: apartmentData.area || 0,
                    rooms: apartmentData.rooms || 0,
                    contract_start: apartmentData.contractStart,
                    contract_end: apartmentData.contractEnd,
                    deposit_amount: apartmentData.deposit || 0,
                    deposit_paid_amount: 0,
                    deposit_paid: false,
                    deposit_returned: false,
                    deposit_deductions: 0,
                    status: apartmentData.tenantName?.trim() ? 'occupied' : 'vacant',
                    auto_renewal_enabled: false,
                    notification_count: 0,
                    original_contract_duration_months: 12
                  })
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
                    type: 'individual', // Default to individual for apartment meters
                    unit: meter.unit,
                    price_per_unit: meter.rate,
                    initial_reading: meter.initialReading || 0,
                    require_photo: meter.photoRequired || false,
                    status: 'active',
                    notes: meter.note || ''
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
                  if (!apt.tenantName?.trim()) {
                    throw new Error(`Buto ${i + 1}: nuomininko vardas yra privalomas`);
                  }
                  if (!apt.contractStart) {
                    throw new Error(`Buto ${i + 1}: sutarties pradžios data yra privaloma`);
                  }
                  if (!apt.contractEnd) {
                    throw new Error(`Buto ${i + 1}: sutarties pabaigos data yra privaloma`);
                  }
                }

                // Create multiple apartments in database
                const apartmentsToInsert = apartmentData.apartments.map((apt: any) => ({
                  address_id: selectedAddressIdForApartment,
                  apartment_number: apt.apartmentNumber.trim(),
                  tenant_name: apt.tenantName.trim(),
                  phone: apt.tenantPhone?.trim() || '',
                  email: apt.tenantEmail?.trim() || '',
                  rent: apt.monthlyRent || 0,
                  area: apt.area || 0,
                  rooms: apt.rooms || 0,
                  contract_start: apt.contractStart,
                  contract_end: apt.contractEnd,
                  deposit_amount: apt.deposit || 0,
                  deposit_paid_amount: 0,
                  deposit_paid: false,
                  deposit_returned: false,
                  deposit_deductions: 0,
                  status: apt.tenantName?.trim() ? 'occupied' : 'vacant',
                  auto_renewal_enabled: false,
                  notification_count: 0,
                  original_contract_duration_months: 12
                }));

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
                      type: 'individual', // Default to individual for apartment meters
                      unit: meter.unit,
                      price_per_unit: meter.rate,
                      initial_reading: meter.initialReading || 0,
                      require_photo: meter.photoRequired || false,
                      status: 'active',
                      notes: meter.note || ''
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

              setShowAddApartmentModal(false);
              // Refresh data after adding apartment(s)
              await refreshData();

            } catch (error) {
              // Error adding apartment(s) - logging removed for production
              alert('Klaida pridedant butą(us)');
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
    </div>
  );
});

Nuomotojas2Dashboard.displayName = 'Nuomotojas2Dashboard';

export default Nuomotojas2Dashboard;