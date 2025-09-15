import React, { useState, useEffect } from 'react';
import { 
  XMarkIcon, 
  Cog6ToothIcon,
  BuildingOfficeIcon,
  WrenchScrewdriverIcon,
  CurrencyEuroIcon,
  DocumentTextIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  UserGroupIcon,
  CalendarIcon,
  InformationCircleIcon,
  BoltIcon
} from '@heroicons/react/24/outline';
import { Trash2, X } from 'lucide-react';
import { CommunalConfig, type AddressMeterSettings } from '../../types/communal';
import { CommunalConfigManager } from '../communal/CommunalConfigManager';
// CommunalMetersManager import removed - using MetersTable instead
import { MetersTable } from './MetersTable';
import { 
  getAddressSettings, 
  upsertAddressSettings, 
  getAddressIdByAddress,
  type AddressSettings as DbAddressSettings
} from '../../lib/communalMetersApi';
import { AddressSettings } from '../../data/addressSettingsData';
import { supabase } from '../../lib/supabase';
import { type DistributionMethod } from '../../constants/meterDistribution';

// Define meter interface matching MetersTable
interface LocalMeter {
  id: string;
  name: string;
  type: 'individual' | 'communal';
  unit: 'm3' | 'kWh' | 'GJ' | 'Kitas';
  price_per_unit: number;
  fixed_price?: number;
  distribution_method: DistributionMethod;
  description: string;
  is_active: boolean;
  requires_photo: boolean;
  is_custom?: boolean;
  is_inherited?: boolean;
  collectionMode: 'landlord_only' | 'tenant_photo';
  landlordReadingEnabled: boolean;
  tenantPhotoEnabled: boolean;
}

interface CommunalMeter {
  id: string;
  name: string;
  type: 'individual' | 'communal';
  unit: 'm3' | 'kWh' | 'GJ' | 'Kitas';
  price_per_unit: number;
  fixed_price?: number;
  distribution_method: DistributionMethod;
  description: string;
  is_active: boolean;
  requires_photo: boolean;
  is_custom?: boolean;
  is_inherited?: boolean;
  collectionMode: 'landlord_only' | 'tenant_photo';
}

interface AddressSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  address: string;
  addressId?: string; // Add actual address ID from database
  currentSettings?: AddressSettings;
  onSave: (settings: AddressSettings) => void;
  onDelete?: (addressId: string, address: string) => void;
}

const DEFAULT_SETTINGS: Omit<AddressSettings, 'id' | 'address' | 'createdAt' | 'updatedAt'> = {
  buildingInfo: {
    totalApartments: 12,
    totalFloors: 4,
    yearBuilt: 2000,
    buildingType: 'apartment',
    heatingType: 'central',
    parkingSpaces: 8
  },
  contactInfo: {
    managerName: '',
    managerPhone: '',
    managerEmail: '',
    emergencyContact: '',
    emergencyPhone: ''
  },
  financialSettings: {
    defaultDeposit: 500,
    latePaymentFee: 10,
    gracePeriodDays: 5,
    autoRenewalEnabled: true,
    defaultContractDuration: 12
  },
  notificationSettings: {
    rentReminderDays: 3,
    contractExpiryReminderDays: 30,
    meterReminderDays: 5,
    maintenanceNotifications: true
  },
  communalConfig: {
    enableMeterEditing: true, // Ar nuomotojas gali redaguoti skaitliukus
    requirePhotos: true // Ar nuomininkas turi pateikti nuotraukas
  } as AddressMeterSettings
};

const AddressSettingsModal: React.FC<AddressSettingsModalProps> = ({
  isOpen,
  onClose,
  address,
  addressId,
  currentSettings,
  onSave,
  onDelete
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'meters' | 'communal' | 'financial' | 'notifications'>('general');
  const [settings, setSettings] = useState<AddressSettings>(
    currentSettings || {
      id: `address_${Date.now()}`,
      address,
      ...DEFAULT_SETTINGS,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  );
  const [dbAddressId, setDbAddressId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addressMeters, setAddressMeters] = useState<LocalMeter[]>([]);

  // Load address settings and meters from database when modal opens
  useEffect(() => {
    const loadAddressData = async () => {
      if (!isOpen) return;
      
      setIsLoading(true);
      try {
        // Get address ID from address string
        const resolvedAddressId = addressId || await getAddressIdByAddress(address);
        setDbAddressId(resolvedAddressId);
        
        if (resolvedAddressId) {
          // Load address settings
          const dbSettings = await getAddressSettings(resolvedAddressId);
          if (dbSettings) {
            // Convert database format to component format
            const convertedSettings: AddressSettings = {
              id: dbSettings.id,
              address,
              buildingInfo: dbSettings.building_info,
              contactInfo: dbSettings.contact_info,
              financialSettings: dbSettings.financial_settings,
              notificationSettings: dbSettings.notification_settings,
              communalConfig: dbSettings.communal_config,
              createdAt: dbSettings.created_at,
              updatedAt: dbSettings.updated_at
            };
            setSettings(convertedSettings);
          }

          // Load address meters
          const { data: meters, error: metersError } = await supabase
            .from('address_meters')
            .select('*')
            .eq('address_id', resolvedAddressId)
            .eq('is_active', true);

          if (metersError) {
            console.error('Error loading meters:', metersError);
          } else if (meters) {
            // Convert to component format
            const convertedMeters: LocalMeter[] = meters.map(meter => ({
              id: meter.id,
              name: meter.name,
              type: meter.type as 'individual' | 'communal',
              unit: meter.unit as 'm3' | 'kWh' | 'GJ' | 'Kitas',
              price_per_unit: meter.price_per_unit || 0,
              fixed_price: meter.fixed_price,
              distribution_method: meter.distribution_method as DistributionMethod,
              description: meter.description || '',
              is_active: meter.is_active,
              requires_photo: meter.requires_photo || false,
              is_custom: false,
              is_inherited: false,
              collectionMode: meter.type === 'individual' ? 'tenant_photo' : 'landlord_only',
              landlordReadingEnabled: meter.type === 'individual' ? true : false,
              tenantPhotoEnabled: meter.type === 'individual' ? true : false
            }));
            setAddressMeters(convertedMeters);
          }
        }
      } catch (error) {
        console.error('Error loading address data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAddressData();
  }, [isOpen, address, addressId]);

  // Update settings when currentSettings changes
  useEffect(() => {
    if (currentSettings) {
      setSettings(currentSettings);
    }
  }, [currentSettings]);

  const handleSave = async () => {
    if (!dbAddressId) {
      setError('Nepavyko rasti adreso ID. Bandykite dar kartą.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const updatedSettings = {
        ...settings,
        updatedAt: new Date().toISOString()
      };

      // Save address settings
      await upsertAddressSettings({
        address_id: dbAddressId,
        building_info: settings.buildingInfo,
        contact_info: settings.contactInfo,
        financial_settings: settings.financialSettings,
        notification_settings: settings.notificationSettings,
        communal_config: settings.communalConfig
      });

      // Save meters changes
      await handleSaveMeters();

      // Sync meter changes to current address apartments first
      await syncMetersToCurrentAddress();

      // Sync meter changes to all addresses (global sync)
      await syncMetersToAllAddresses();

      // Call the original onSave callback but don't close modal immediately
      onSave(updatedSettings);
      
      // Show success message briefly before closing
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (error) {
      console.error('Error saving address settings:', error);
      setError('Klaida išsaugant nustatymus. Bandykite dar kartą.');
    } finally {
      setIsSaving(false);
    }
  };

  // Sync meter changes to current address apartments only
  const syncMetersToCurrentAddress = async () => {
    if (!dbAddressId) return;

    try {
      console.log('🔄 Sinchronizuojami skaitliukai dabartinio adreso butuose...');
      
      // Get properties for current address
      const { data: properties, error: propertiesError } = await supabase
        .from('properties')
        .select('id')
        .eq('address_id', dbAddressId);

      if (propertiesError) throw propertiesError;

      if (properties && properties.length > 0) {
        // First, delete all existing apartment meters for these properties
        const deletePromises = properties.map(async (property) => {
          const { error: deleteError } = await supabase
            .from('apartment_meters')
            .delete()
            .eq('property_id', property.id);
          
          if (deleteError) throw deleteError;
        });

        await Promise.all(deletePromises);

        // Then create apartment meters for each property
        const apartmentMeterPromises = properties.map(async (property) => {
          const apartmentMetersToInsert = addressMeters
            .filter(meter => meter.type === 'individual') // Only individual meters for apartments
            .map(meter => ({
              property_id: property.id,
              meter_name: meter.name,
              meter_type: meter.type,
              unit: meter.unit,
              price_per_unit: meter.price_per_unit,
              fixed_price: meter.fixed_price,
              serial_number: null,
              is_active: meter.is_active,
              requires_photo: meter.requires_photo,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }));

          if (apartmentMetersToInsert.length > 0) {
            const { error: apartmentInsertError } = await supabase
              .from('apartment_meters')
              .insert(apartmentMetersToInsert);

            if (apartmentInsertError) throw apartmentInsertError;
          }
        });

        await Promise.all(apartmentMeterPromises);
        console.log(`✅ Skaitliukai sinchronizuoti dabartinio adreso butuose`);
      }
    } catch (error) {
      console.error('❌ Klaida sinchronizuojant dabartinio adreso skaitiklius:', error);
    }
  };

  // Sync meter changes to all addresses
  const syncMetersToAllAddresses = async () => {
    try {
      console.log('🔄 Sinchronizuojami skaitliukai visuose adresuose...');
      
      // Get all addresses
      const { data: allAddresses, error: addressError } = await supabase
        .from('addresses')
        .select('id');

      if (addressError) throw addressError;

      // For each address, update with current meter configuration
      if (allAddresses && allAddresses.length > 0) {
        const syncPromises = allAddresses.map(async (addr) => {
          if (addr.id === dbAddressId) return; // Skip current address (already saved)

          try {
            // Delete existing meters for this address
            await supabase
              .from('address_meters')
              .delete()
              .eq('address_id', addr.id);

            // Insert updated meters
            const metersToInsert = addressMeters.map(meter => ({
              address_id: addr.id,
              name: meter.name,
              type: meter.type,
              unit: meter.unit,
              price_per_unit: meter.price_per_unit,
              fixed_price: meter.fixed_price,
              distribution_method: meter.distribution_method,
              description: meter.description,
              requires_photo: meter.requires_photo,
              is_active: meter.is_active,
              is_custom: meter.is_custom || false,
              is_inherited: true // Mark as inherited from global settings
            }));

            if (metersToInsert.length > 0) {
              const { error: insertError } = await supabase
                .from('address_meters')
                .insert(metersToInsert);

              if (insertError) throw insertError;
            }

            // Also create apartment meters for each property in this address
            const { data: properties, error: propertiesError } = await supabase
              .from('properties')
              .select('id')
              .eq('address_id', addr.id);

            if (propertiesError) throw propertiesError;

            if (properties && properties.length > 0) {
              // First, delete all existing apartment meters for these properties
              const deletePromises = properties.map(async (property) => {
                const { error: deleteError } = await supabase
                  .from('apartment_meters')
                  .delete()
                  .eq('property_id', property.id);
                
                if (deleteError) throw deleteError;
              });

              await Promise.all(deletePromises);

              // Then create apartment meters for each property
              const apartmentMeterPromises = properties.map(async (property) => {
                const apartmentMetersToInsert = addressMeters
                  .filter(meter => meter.type === 'individual') // Only individual meters for apartments
                  .map(meter => ({
                    property_id: property.id,
                    meter_name: meter.name,
                    meter_type: meter.type,
                    unit: meter.unit,
                    price_per_unit: meter.price_per_unit,
                    fixed_price: meter.fixed_price,
                    serial_number: null,
                    is_active: meter.is_active,
                    requires_photo: meter.requires_photo,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  }));

                if (apartmentMetersToInsert.length > 0) {
                  const { error: apartmentInsertError } = await supabase
                    .from('apartment_meters')
                    .insert(apartmentMetersToInsert);

                  if (apartmentInsertError) throw apartmentInsertError;
                }
              });

              await Promise.all(apartmentMeterPromises);
            }

            console.log(`✅ Skaitliukai sinchronizuoti adresui: ${addr.id}`);
          } catch (error) {
            console.error(`❌ Klaida sinchronizuojant adresą ${addr.id}:`, error);
          }
        });

        await Promise.all(syncPromises);
        console.log('✅ Visi skaitliukai sėkmingai sinchronizuoti!');
        
        // Dispatch event to refresh data in other components
        window.dispatchEvent(new CustomEvent('meters-synchronized'));
      }
    } catch (error) {
      console.error('❌ Klaida sinchronizuojant skaitlikius:', error);
    }
  };

  const handleCommunalConfigChange = (config: CommunalConfig) => {
    // This function handles the full communal config
    // For now, we'll keep the existing communal config structure
    setSettings(prev => ({
      ...prev,
      communalConfig: config as any // Type assertion for compatibility
    }));
  };

  const handleMeterSettingsChange = (meterSettings: AddressMeterSettings) => {
    setSettings(prev => ({
      ...prev,
      communalConfig: meterSettings
    }));
  };

  // Handle meters changes
  const handleMetersChange = (meters: LocalMeter[]) => {
    setAddressMeters(meters);
  };

  const handleMeterDelete = async (meterId: string) => {
    if (!dbAddressId) return;
    
    try {
      // Delete from database
      const { error } = await supabase
        .from('address_meters')
        .delete()
        .eq('id', meterId)
        .eq('address_id', dbAddressId);

      if (error) throw error;

      // Update local state
      setAddressMeters(prev => prev.filter(m => m.id !== meterId));
      
      console.log('✅ Meter deleted successfully');
    } catch (error) {
      console.error('Error deleting meter:', error);
      alert('Klaida trinant skaitiklį. Bandykite dar kartą.');
    }
  };

  const handleMeterUpdate = async (meterId: string, updates: Partial<CommunalMeter>) => {
    if (!dbAddressId) return;
    
    try {
      // Update in database
      const { error } = await supabase
        .from('address_meters')
        .update(updates)
        .eq('id', meterId)
        .eq('address_id', dbAddressId);

      if (error) throw error;

      // Update local state
      setAddressMeters(prev => prev.map(m => 
        m.id === meterId ? { ...m, ...updates } : m
      ));
      
      console.log('✅ Meter updated successfully');
    } catch (error) {
      console.error('Error updating meter:', error);
      alert('Klaida atnaujinant skaitiklį. Bandykite dar kartą.');
    }
  };

  const handleSaveMeters = async () => {
    if (!dbAddressId) return;

    try {
      // First, get all existing meters for this address
      const { data: existingMeters, error: fetchError } = await supabase
        .from('address_meters')
        .select('id')
        .eq('address_id', dbAddressId);

      if (fetchError) throw fetchError;

      // Find meters that were deleted (exist in DB but not in current state)
      const currentMeterIds = addressMeters
        .filter(meter => !meter.id.startsWith('temp_') && !meter.id.includes('_' + Date.now()))
        .map(meter => meter.id);
      
      const deletedMeterIds = existingMeters
        ?.filter(existing => !currentMeterIds.includes(existing.id))
        .map(meter => meter.id) || [];

      // Delete removed meters from database
      if (deletedMeterIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('address_meters')
          .delete()
          .in('id', deletedMeterIds);

        if (deleteError) throw deleteError;
        console.log(`🗑️ Deleted ${deletedMeterIds.length} meters from database`);
      }

      // Save all current meter changes to database
      for (const meter of addressMeters) {
        if (meter.id.startsWith('temp_') || meter.id.includes('_' + Date.now())) {
          // New meter - insert
          const { error } = await supabase
            .from('address_meters')
            .insert([{
              address_id: dbAddressId,
              name: meter.name,
              type: meter.type,
              unit: meter.unit,
              price_per_unit: meter.price_per_unit,
              fixed_price: meter.fixed_price,
              distribution_method: meter.distribution_method,
              description: meter.description,
              is_active: meter.is_active,
              requires_photo: meter.requires_photo
            }]);

          if (error) throw error;
        } else {
          // Existing meter - update
          const { error } = await supabase
            .from('address_meters')
            .update({
              name: meter.name,
              type: meter.type,
              unit: meter.unit,
              price_per_unit: meter.price_per_unit,
              fixed_price: meter.fixed_price,
              distribution_method: meter.distribution_method,
              description: meter.description,
              is_active: meter.is_active,
              requires_photo: meter.requires_photo
            })
            .eq('id', meter.id)
            .eq('address_id', dbAddressId);

          if (error) throw error;
        }
      }

      console.log('✅ All meters saved successfully');
    } catch (error) {
      console.error('Error saving meters:', error);
      alert('Klaida išsaugant skaitliukus. Bandykite dar kartą.');
    }
  };

  const tabs = [
    { id: 'general', label: 'Bendri nustatymai', icon: BuildingOfficeIcon },
    { id: 'meters', label: 'Skaitliukai', icon: BoltIcon },
    { id: 'communal', label: 'Komunaliniai', icon: BoltIcon },
    { id: 'financial', label: 'Finansai', icon: CurrencyEuroIcon },
    { id: 'notifications', label: 'Pranešimai', icon: InformationCircleIcon }
  ] as const;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-5xl max-h-[85vh] overflow-hidden">
        {/* Compact Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#2F8481] rounded-lg flex items-center justify-center">
              <Cog6ToothIcon className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Adreso nustatymai</h2>
              <p className="text-xs text-gray-600">{address}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {onDelete && (
              <button
                onClick={() => {
                  console.log('Delete button clicked');
                  console.log('📍 Address:', address);
                  console.log('🆔 Address ID:', addressId);
                  
                  const confirmDelete = window.confirm(
                    `Ar tikrai norite ištrinti adresą "${address}"?\n\nŠis veiksmas ištrins visus susijusius butus ir duomenis.`
                  );
                  
                  if (confirmDelete && addressId) {
                    console.log('✅ Confirmed delete for address ID:', addressId);
                    onDelete(addressId, address);
                    onClose();
                  } else {
                    console.log('❌ Delete cancelled or no address ID');
                  }
                }}
                className="px-2 py-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded text-xs transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                <span>Ištrinti</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 rounded transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Compact Tab Navigation */}
        <div className="border-b border-gray-200">
          <div className="flex px-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'text-[#2F8481] border-[#2F8481]'
                      : 'text-gray-600 border-transparent hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'general' && (
            <div className="space-y-4">
              {/* Building Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                  <BuildingOfficeIcon className="w-4 h-4 mr-2 text-[#2F8481]" />
                  Pastato informacija
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Butų skaičius
                    </label>
                    <input
                      type="number"
                      value={settings.buildingInfo.totalApartments}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        buildingInfo: {
                          ...prev.buildingInfo,
                          totalApartments: parseInt(e.target.value) || 0
                        }
                      }))}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-[#2F8481] focus:border-[#2F8481]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Aukštų skaičius
                    </label>
                    <input
                      type="number"
                      value={settings.buildingInfo.totalFloors}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        buildingInfo: {
                          ...prev.buildingInfo,
                          totalFloors: parseInt(e.target.value) || 0
                        }
                      }))}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-[#2F8481] focus:border-[#2F8481]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Statybos metai
                    </label>
                    <input
                      type="number"
                      value={settings.buildingInfo.yearBuilt || ''}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        buildingInfo: {
                          ...prev.buildingInfo,
                          yearBuilt: parseInt(e.target.value) || undefined
                        }
                      }))}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-[#2F8481] focus:border-[#2F8481]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Pastato tipas
                    </label>
                    <select
                      value={settings.buildingInfo.buildingType}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        buildingInfo: {
                          ...prev.buildingInfo,
                          buildingType: e.target.value as 'apartment' | 'house' | 'commercial'
                        }
                      }))}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-[#2F8481] focus:border-[#2F8481]"
                    >
                      <option value="apartment">Butai</option>
                      <option value="house">Namas</option>
                      <option value="commercial">Komercinis</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Šildymo tipas
                    </label>
                    <select
                      value={settings.buildingInfo.heatingType}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        buildingInfo: {
                          ...prev.buildingInfo,
                          heatingType: e.target.value as 'central' | 'individual' | 'district'
                        }
                      }))}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-[#2F8481] focus:border-[#2F8481]"
                    >
                      <option value="central">Centrinis</option>
                      <option value="individual">Individualus</option>
                      <option value="district">Rajoninis</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Stovėjimo vietos
                    </label>
                    <input
                      type="number"
                      value={settings.buildingInfo.parkingSpaces || ''}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        buildingInfo: {
                          ...prev.buildingInfo,
                          parkingSpaces: parseInt(e.target.value) || undefined
                        }
                      }))}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-[#2F8481] focus:border-[#2F8481]"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                  <UserGroupIcon className="w-4 h-4 mr-2 text-[#2F8481]" />
                  Kontaktinė informacija
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Valdytojo vardas
                    </label>
                    <input
                      type="text"
                      value={settings.contactInfo.managerName}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        contactInfo: {
                          ...prev.contactInfo,
                          managerName: e.target.value
                        }
                      }))}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-[#2F8481] focus:border-[#2F8481]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Valdytojo telefonas
                    </label>
                    <input
                      type="tel"
                      value={settings.contactInfo.managerPhone}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        contactInfo: {
                          ...prev.contactInfo,
                          managerPhone: e.target.value
                        }
                      }))}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-[#2F8481] focus:border-[#2F8481]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Valdytojo el. paštas
                    </label>
                    <input
                      type="email"
                      value={settings.contactInfo.managerEmail}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        contactInfo: {
                          ...prev.contactInfo,
                          managerEmail: e.target.value
                        }
                      }))}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-[#2F8481] focus:border-[#2F8481]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Avarinis kontaktas
                    </label>
                    <input
                      type="text"
                      value={settings.contactInfo.emergencyContact}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        contactInfo: {
                          ...prev.contactInfo,
                          emergencyContact: e.target.value
                        }
                      }))}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-[#2F8481] focus:border-[#2F8481]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Avarinis telefonas
                    </label>
                    <input
                      type="tel"
                      value={settings.contactInfo.emergencyPhone}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        contactInfo: {
                          ...prev.contactInfo,
                          emergencyPhone: e.target.value
                        }
                      }))}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-[#2F8481] focus:border-[#2F8481]"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'meters' && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                  <BoltIcon className="w-4 h-4 mr-2 text-[#2F8481]" />
                  Skaitliukų nustatymai
                </h3>
                <p className="text-xs text-gray-600 mb-3">
                  Konfigūruokite, kaip veiks skaitliukų sistema šiame adrese
                </p>

                <div className="space-y-4">
                  {/* Skaitliukų redagavimo nustatymas */}
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Turi būti skaitliukai</h4>
                      <p className="text-xs text-gray-600">Ar nuomotojas gali redaguoti skaitliukus</p>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.communalConfig?.enableMeterEditing ?? true}
                        onChange={(e) => handleMeterSettingsChange({
                          ...settings.communalConfig,
                          enableMeterEditing: e.target.checked
                        })}
                        className="h-4 w-4 text-[#2F8481] focus:ring-[#2F8481] border-gray-300 rounded"
                      />
                    </div>
                  </div>

                  {/* Nuotraukų reikalavimo nustatymas */}
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Reikia nuotraukos</h4>
                      <p className="text-xs text-gray-600">Ar nuomininkas turi pateikti nuotraukas</p>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.communalConfig?.requirePhotos ?? true}
                        onChange={(e) => handleMeterSettingsChange({
                          ...settings.communalConfig,
                          requirePhotos: e.target.checked
                        })}
                        className="h-4 w-4 text-[#2F8481] focus:ring-[#2F8481] border-gray-300 rounded"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'communal' && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                  <BoltIcon className="w-4 h-4 mr-2 text-[#2F8481]" />
                  Komunaliniai skaitliukai
                </h3>
                <p className="text-xs text-gray-600 mb-3">
                  Konfigūruokite skaitliukus, kurie bus naudojami visiems butams šiame adrese
                </p>

                <MetersTable
                  meters={addressMeters}
                  onMetersChange={handleMetersChange}
                  onPresetApply={(meters) => setAddressMeters(meters)}
                  onMeterDelete={handleMeterDelete}
                  onMeterUpdate={handleMeterUpdate}
                />
              </div>
            </div>
          )}

          {activeTab === 'financial' && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                  <CurrencyEuroIcon className="w-4 h-4 mr-2 text-[#2F8481]" />
                  Finansiniai nustatymai
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Numatytasis depozitas (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={settings.financialSettings.defaultDeposit}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        financialSettings: {
                          ...prev.financialSettings,
                          defaultDeposit: parseFloat(e.target.value) || 0
                        }
                      }))}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-[#2F8481] focus:border-[#2F8481]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Vėlavimo mokestis (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={settings.financialSettings.latePaymentFee}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        financialSettings: {
                          ...prev.financialSettings,
                          latePaymentFee: parseFloat(e.target.value) || 0
                        }
                      }))}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-[#2F8481] focus:border-[#2F8481]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Atidėjimo laikotarpis (dienos)
                    </label>
                    <input
                      type="number"
                      value={settings.financialSettings.gracePeriodDays}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        financialSettings: {
                          ...prev.financialSettings,
                          gracePeriodDays: parseInt(e.target.value) || 0
                        }
                      }))}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-[#2F8481] focus:border-[#2F8481]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Automatinis pratęsimas
                    </label>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.financialSettings.autoRenewalEnabled}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          financialSettings: {
                            ...prev.financialSettings,
                            autoRenewalEnabled: e.target.checked
                          }
                        }))}
                        className="h-3 w-3 text-[#2F8481] focus:ring-[#2F8481] border-gray-300 rounded"
                      />
                      <span className="ml-2 text-xs text-gray-700">Įjungtas</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Numatytasis sutarties laikotarpis (mėn.)
                    </label>
                    <input
                      type="number"
                      value={settings.financialSettings.defaultContractDuration}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        financialSettings: {
                          ...prev.financialSettings,
                          defaultContractDuration: parseInt(e.target.value) || 12
                        }
                      }))}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-[#2F8481] focus:border-[#2F8481]"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                  <InformationCircleIcon className="w-4 h-4 mr-2 text-[#2F8481]" />
                  Pranešimų nustatymai
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Nuomos priminimas (dienos prieš)
                    </label>
                    <input
                      type="number"
                      value={settings.notificationSettings.rentReminderDays}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        notificationSettings: {
                          ...prev.notificationSettings,
                          rentReminderDays: parseInt(e.target.value) || 0
                        }
                      }))}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-[#2F8481] focus:border-[#2F8481]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Sutarties pabaigos priminimas (dienos prieš)
                    </label>
                    <input
                      type="number"
                      value={settings.notificationSettings.contractExpiryReminderDays}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        notificationSettings: {
                          ...prev.notificationSettings,
                          contractExpiryReminderDays: parseInt(e.target.value) || 0
                        }
                      }))}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-[#2F8481] focus:border-[#2F8481]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Skaitliukų priminimas (dienos prieš)
                    </label>
                    <input
                      type="number"
                      value={settings.notificationSettings.meterReminderDays}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        notificationSettings: {
                          ...prev.notificationSettings,
                          meterReminderDays: parseInt(e.target.value) || 0
                        }
                      }))}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-[#2F8481] focus:border-[#2F8481]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Priežiūros pranešimai
                    </label>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.notificationSettings.maintenanceNotifications}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          notificationSettings: {
                            ...prev.notificationSettings,
                            maintenanceNotifications: e.target.checked
                          }
                        }))}
                        className="h-3 w-3 text-[#2F8481] focus:ring-[#2F8481] border-gray-300 rounded"
                      />
                      <span className="ml-2 text-xs text-gray-700">Įjungti</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="px-4 py-2 bg-red-50 border-t border-red-200">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 text-red-600">⚠️</div>
              <p className="text-sm text-red-700">{error}</p>
              <button
                onClick={() => setError(null)}
                className="ml-auto p-1 hover:bg-red-100 rounded"
              >
                <X className="w-3 h-3 text-red-600" />
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200">
          <div>
            {onDelete && addressId && (
              <button
                onClick={() => onDelete(addressId, address)}
                disabled={isSaving}
                className="px-3 py-1.5 text-red-700 bg-red-50 border border-red-200 rounded text-xs hover:bg-red-100 transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-3 h-3" />
                Ištrinti adresą
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="px-3 py-1.5 text-gray-700 bg-gray-100 rounded text-xs hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Atšaukti
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || isLoading}
              className="px-4 py-1.5 bg-[#2F8481] text-white rounded text-xs hover:bg-[#297a77] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSaving && (
                <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              {isSaving ? 'Saugoma...' : 'Išsaugoti'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddressSettingsModal;
