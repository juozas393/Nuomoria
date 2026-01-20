import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Building2, Users, Gauge, Bell,
  LayoutDashboard, AlertTriangle, X, Check,
  Pencil, ChevronRight, Save, Trash2
} from 'lucide-react';
import { MetersTable } from './MetersTable';
import {
  getAddressSettings,
  upsertAddressSettings,
  getAddressIdByAddress,
  type AddressSettings as DbAddressSettings
} from '../../lib/communalMetersApi';
import { supabase } from '../../lib/supabase';
import { type DistributionMethod } from '../../constants/meterDistribution';

// ============================================================
// TYPES
// ============================================================
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

interface AddressSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  address: string;
  addressId?: string;
  currentSettings?: any;
  onSave: (settings: any) => void;
  onDelete?: (addressId: string, address: string) => void;
}

type Section = 'overview' | 'building' | 'contacts' | 'meters' | 'notifications';

// ============================================================
// DEFAULT SETTINGS
// ============================================================
const DEFAULT_SETTINGS = {
  buildingInfo: {
    totalApartments: 12,
    totalFloors: 4,
    yearBuilt: 2000,
    buildingType: 'apartment' as const,
    heatingType: 'central' as const,
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
  }
};

// ============================================================
// MAIN COMPONENT
// ============================================================
const AddressSettingsModal: React.FC<AddressSettingsModalProps> = ({
  isOpen,
  onClose,
  address,
  addressId,
  currentSettings,
  onSave,
  onDelete
}) => {
  // State
  const [activeSection, setActiveSection] = useState<Section>('overview');
  const [dbAddressId, setDbAddressId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSavedToast, setShowSavedToast] = useState(false);

  // Edit mode for each section
  const [editMode, setEditMode] = useState<Record<string, boolean>>({
    building: false,
    contacts: false,
    notifications: false
  });

  // Settings state
  const [settings, setSettings] = useState({
    ...DEFAULT_SETTINGS,
    ...(currentSettings || {})
  });

  // Meters state
  const [addressMeters, setAddressMeters] = useState<LocalMeter[]>([]);
  const [initialMeters, setInitialMeters] = useState<LocalMeter[]>([]);

  // ============================================================
  // DATA LOADING
  // ============================================================
  useEffect(() => {
    const loadAddressData = async () => {
      if (!isOpen) return;

      setIsLoading(true);
      try {
        const resolvedAddressId = addressId || await getAddressIdByAddress(address);
        setDbAddressId(resolvedAddressId);

        if (resolvedAddressId) {
          // Load address settings
          const dbSettings = await getAddressSettings(resolvedAddressId);
          if (dbSettings) {
            setSettings({
              buildingInfo: dbSettings.building_info || DEFAULT_SETTINGS.buildingInfo,
              contactInfo: dbSettings.contact_info || DEFAULT_SETTINGS.contactInfo,
              financialSettings: dbSettings.financial_settings || DEFAULT_SETTINGS.financialSettings,
              notificationSettings: dbSettings.notification_settings || DEFAULT_SETTINGS.notificationSettings
            });
          }

          // Load address meters - optimized with explicit columns
          const { data: meters, error: metersError } = await supabase
            .from('address_meters')
            .select('id, name, type, unit, price_per_unit, fixed_price, distribution_method, description, is_active, requires_photo, collection_mode, landlord_reading_enabled, tenant_photo_enabled')
            .eq('address_id', resolvedAddressId)
            .eq('is_active', true);

          if (!metersError && meters) {
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
              collectionMode: meter.collection_mode || 'landlord_only',
              landlordReadingEnabled: meter.landlord_reading_enabled ?? true,
              tenantPhotoEnabled: meter.tenant_photo_enabled ?? false
            }));
            setAddressMeters(convertedMeters);
            setInitialMeters(JSON.parse(JSON.stringify(convertedMeters)));
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

  // ============================================================
  // DIRTY STATE TRACKING
  // ============================================================
  const checkDirty = useCallback(() => {
    const metersChanged = JSON.stringify(addressMeters) !== JSON.stringify(initialMeters);
    return metersChanged || Object.values(editMode).some(v => v);
  }, [addressMeters, initialMeters, editMode]);

  useEffect(() => {
    setIsDirty(checkDirty());
  }, [checkDirty]);

  // ============================================================
  // HANDLERS
  // ============================================================
  const handleMetersChange = useCallback((meters: LocalMeter[]) => {
    setAddressMeters(meters);
    setIsDirty(true);
  }, []);

  const updateSettings = useCallback((section: keyof typeof settings, updates: any) => {
    setSettings((prev: typeof settings) => ({
      ...prev,
      [section]: { ...prev[section], ...updates }
    }));
    setIsDirty(true);
  }, []);

  const toggleEditMode = useCallback((section: string) => {
    setEditMode(prev => ({ ...prev, [section]: !prev[section] }));
  }, []);

  const handleSave = async () => {
    if (!dbAddressId) {
      setError('Nepavyko rasti adreso ID.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Save address settings
      await upsertAddressSettings({
        address_id: dbAddressId,
        building_info: settings.buildingInfo,
        contact_info: settings.contactInfo,
        financial_settings: settings.financialSettings,
        notification_settings: settings.notificationSettings,
        communal_config: { enableMeterEditing: true, requirePhotos: true }
      });

      // Save meters
      await saveMeters();

      // Reset dirty state
      setIsDirty(false);
      setInitialMeters(JSON.parse(JSON.stringify(addressMeters)));
      setEditMode({ building: false, contacts: false, notifications: false });

      // Show toast
      setShowSavedToast(true);
      setTimeout(() => setShowSavedToast(false), 3000);

      onSave(settings);
    } catch (error) {
      console.error('Error saving settings:', error);
      setError('Klaida išsaugant nustatymus.');
    } finally {
      setIsSaving(false);
    }
  };

  const saveMeters = async () => {
    if (!dbAddressId) return;

    // Get existing meters
    const { data: existingMeters } = await supabase
      .from('address_meters')
      .select('id')
      .eq('address_id', dbAddressId);

    const existingIds = existingMeters?.map(m => m.id) || [];
    const currentIds = addressMeters.filter(m => !m.id.startsWith('temp_')).map(m => m.id);
    const deletedIds = existingIds.filter(id => !currentIds.includes(id));

    // Delete removed meters
    if (deletedIds.length > 0) {
      await supabase.from('address_meters').delete().in('id', deletedIds);
    }

    // Upsert meters
    for (const meter of addressMeters) {
      if (meter.id.startsWith('temp_')) {
        // Insert new
        await supabase.from('address_meters').insert([{
          address_id: dbAddressId,
          name: meter.name,
          type: meter.type,
          unit: meter.unit,
          price_per_unit: meter.price_per_unit,
          fixed_price: meter.fixed_price,
          distribution_method: meter.distribution_method,
          description: meter.description,
          is_active: meter.is_active,
          requires_photo: meter.requires_photo,
          collection_mode: meter.collectionMode,
          landlord_reading_enabled: meter.landlordReadingEnabled,
          tenant_photo_enabled: meter.tenantPhotoEnabled
        }]);
      } else {
        // Update existing
        await supabase.from('address_meters').update({
          name: meter.name,
          type: meter.type,
          unit: meter.unit,
          price_per_unit: meter.price_per_unit,
          fixed_price: meter.fixed_price,
          distribution_method: meter.distribution_method,
          description: meter.description,
          is_active: meter.is_active,
          requires_photo: meter.requires_photo,
          collection_mode: meter.collectionMode,
          landlord_reading_enabled: meter.landlordReadingEnabled,
          tenant_photo_enabled: meter.tenantPhotoEnabled
        }).eq('id', meter.id);
      }
    }
  };

  const handleClose = () => {
    if (isDirty) {
      if (window.confirm('Turite neišsaugotų pakeitimų. Ar tikrai norite uždaryti?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const handleDelete = () => {
    if (onDelete && dbAddressId) {
      if (window.confirm(`Ar tikrai norite ištrinti adresą "${address}" ?\n\nŠis veiksmas ištrins visus susijusius butus ir duomenis.`)) {
        onDelete(dbAddressId, address);
        onClose();
      }
    }
  };

  // ============================================================
  // NAVIGATION
  // ============================================================
  const sections = [
    { id: 'overview' as Section, label: 'Apžvalga', icon: LayoutDashboard },
    { id: 'building' as Section, label: 'Pastatas', icon: Building2 },
    { id: 'contacts' as Section, label: 'Kontaktai', icon: Users },
    { id: 'meters' as Section, label: 'Skaitliukai', icon: Gauge },
    { id: 'notifications' as Section, label: 'Pranešimai', icon: Bell },
  ];

  if (!isOpen) return null;

  // ============================================================
  // RENDER
  // ============================================================
  // New generated background image
  const settingsBg = '/images/SettingsBackground.png';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      {/* Modal Container - Navigation on RIGHT */}
      <div className="relative rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex overflow-hidden bg-white">

        {/* Main Content Area (LEFT/CENTER) */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-[#1a2e2d] to-[#2F8481]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">{address.split(',')[0]}</h2>
                <p className="text-xs text-white/70">{address}</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2F8481]" />
              </div>
            ) : (
              <>
                {/* Overview */}
                {activeSection === 'overview' && (
                  <div className="space-y-3">
                    <h3 className="text-[15px] font-bold text-gray-900">Apžvalga</h3>

                    {/* Summary Cards - Glassmorphism */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* Building Card */}
                      <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 border border-white/40 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-[#2F8481]" />
                            <span className="text-[13px] font-semibold text-gray-900">Pastatas</span>
                          </div>
                          <button
                            onClick={() => setActiveSection('building')}
                            className="text-xs text-[#2F8481] hover:underline flex items-center gap-1"
                          >
                            Redaguoti <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Butai</span>
                            <span className="font-medium">{settings.buildingInfo.totalApartments}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Aukštai</span>
                            <span className="font-medium">{settings.buildingInfo.totalFloors}</span>
                          </div>
                        </div>
                      </div>

                      {/* Meters Card */}
                      <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 border border-white/40 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Gauge className="w-3.5 h-3.5 text-[#2F8481]" />
                            <span className="text-[13px] font-semibold text-gray-900">Skaitliukai</span>
                          </div>
                          <button
                            onClick={() => setActiveSection('meters')}
                            className="text-xs text-[#2F8481] hover:underline flex items-center gap-1"
                          >
                            Valdyti <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Iš viso</span>
                            <span className="font-medium">{addressMeters.length}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Individualūs</span>
                            <span className="font-medium">{addressMeters.filter(m => m.type === 'individual').length}</span>
                          </div>
                        </div>
                      </div>


                      {/* Notifications Card */}
                      <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 border border-white/40 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Bell className="w-3.5 h-3.5 text-[#2F8481]" />
                            <span className="text-[13px] font-semibold text-gray-900">Pranešimai</span>
                          </div>
                          <button
                            onClick={() => setActiveSection('notifications')}
                            className="text-xs text-[#2F8481] hover:underline flex items-center gap-1"
                          >
                            Redaguoti <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Nuomos priminimas</span>
                            <span className="font-medium">{settings.notificationSettings.rentReminderDays} d. prieš</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Skaitliukų priminimas</span>
                            <span className="font-medium">{settings.notificationSettings.meterReminderDays} d. prieš</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Building Section */}
                {activeSection === 'building' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[15px] font-bold text-gray-900">Pastato informacija</h3>
                      <button
                        onClick={() => toggleEditMode('building')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${editMode.building
                          ? 'bg-green-100 text-green-700'
                          : 'bg-white/80 text-gray-700 hover:bg-white'
                          }`}
                      >
                        {editMode.building ? <Check className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
                        {editMode.building ? 'Baigti' : 'Redaguoti'}
                      </button>
                    </div>

                    <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/40 shadow-sm">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Butų skaičius</label>
                          {editMode.building ? (
                            <input
                              type="number"
                              value={settings.buildingInfo.totalApartments}
                              onChange={(e) => updateSettings('buildingInfo', { totalApartments: parseInt(e.target.value) || 0 })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#2F8481] focus:border-transparent"
                            />
                          ) : (
                            <p className="text-sm font-medium text-gray-900">{settings.buildingInfo.totalApartments}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Aukštų skaičius</label>
                          {editMode.building ? (
                            <input
                              type="number"
                              value={settings.buildingInfo.totalFloors}
                              onChange={(e) => updateSettings('buildingInfo', { totalFloors: parseInt(e.target.value) || 0 })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#2F8481] focus:border-transparent"
                            />
                          ) : (
                            <p className="text-sm font-medium text-gray-900">{settings.buildingInfo.totalFloors}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Statybos metai</label>
                          {editMode.building ? (
                            <input
                              type="number"
                              value={settings.buildingInfo.yearBuilt || ''}
                              onChange={(e) => updateSettings('buildingInfo', { yearBuilt: parseInt(e.target.value) || null })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#2F8481] focus:border-transparent"
                            />
                          ) : (
                            <p className="text-sm font-medium text-gray-900">{settings.buildingInfo.yearBuilt || '-'}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Pastato tipas</label>
                          {editMode.building ? (
                            <select
                              value={settings.buildingInfo.buildingType}
                              onChange={(e) => updateSettings('buildingInfo', { buildingType: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#2F8481] focus:border-transparent"
                            >
                              <option value="apartment">Butai</option>
                              <option value="house">Namas</option>
                              <option value="commercial">Komercinis</option>
                            </select>
                          ) : (
                            <p className="text-sm font-medium text-gray-900">
                              {settings.buildingInfo.buildingType === 'apartment' ? 'Butai' :
                                settings.buildingInfo.buildingType === 'house' ? 'Namas' : 'Komercinis'}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Šildymo tipas</label>
                          {editMode.building ? (
                            <select
                              value={settings.buildingInfo.heatingType}
                              onChange={(e) => updateSettings('buildingInfo', { heatingType: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#2F8481] focus:border-transparent"
                            >
                              <option value="central">Centrinis</option>
                              <option value="individual">Individualus</option>
                              <option value="district">Rajoninis</option>
                            </select>
                          ) : (
                            <p className="text-sm font-medium text-gray-900">
                              {settings.buildingInfo.heatingType === 'central' ? 'Centrinis' :
                                settings.buildingInfo.heatingType === 'individual' ? 'Individualus' : 'Rajoninis'}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Stovėjimo vietos</label>
                          {editMode.building ? (
                            <input
                              type="number"
                              value={settings.buildingInfo.parkingSpaces || ''}
                              onChange={(e) => updateSettings('buildingInfo', { parkingSpaces: parseInt(e.target.value) || null })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#2F8481] focus:border-transparent"
                            />
                          ) : (
                            <p className="text-sm font-medium text-gray-900">{settings.buildingInfo.parkingSpaces || '-'}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Contacts Section */}
                {activeSection === 'contacts' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">Kontaktinė informacija</h3>
                      <button
                        onClick={() => toggleEditMode('contacts')}
                        className={`flex items - center gap - 2 px - 3 py - 1.5 rounded - lg text - sm font - medium transition - colors ${editMode.contacts
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          } `}
                      >
                        {editMode.contacts ? <Check className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
                        {editMode.contacts ? 'Baigti' : 'Redaguoti'}
                      </button>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Vadybininkas</h4>
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Vardas</label>
                          {editMode.contacts ? (
                            <input
                              type="text"
                              value={settings.contactInfo.managerName}
                              onChange={(e) => updateSettings('contactInfo', { managerName: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#2F8481] focus:border-transparent"
                            />
                          ) : (
                            <p className="text-sm font-medium text-gray-900">{settings.contactInfo.managerName || '-'}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Telefonas</label>
                          {editMode.contacts ? (
                            <input
                              type="tel"
                              value={settings.contactInfo.managerPhone}
                              onChange={(e) => updateSettings('contactInfo', { managerPhone: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#2F8481] focus:border-transparent"
                            />
                          ) : (
                            <p className="text-sm font-medium text-gray-900">{settings.contactInfo.managerPhone || '-'}</p>
                          )}
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-gray-500 mb-1">El. paštas</label>
                          {editMode.contacts ? (
                            <input
                              type="email"
                              value={settings.contactInfo.managerEmail}
                              onChange={(e) => updateSettings('contactInfo', { managerEmail: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#2F8481] focus:border-transparent"
                            />
                          ) : (
                            <p className="text-sm font-medium text-gray-900">{settings.contactInfo.managerEmail || '-'}</p>
                          )}
                        </div>
                      </div>

                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Avarinis kontaktas</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Vardas</label>
                          {editMode.contacts ? (
                            <input
                              type="text"
                              value={settings.contactInfo.emergencyContact}
                              onChange={(e) => updateSettings('contactInfo', { emergencyContact: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#2F8481] focus:border-transparent"
                            />
                          ) : (
                            <p className="text-sm font-medium text-gray-900">{settings.contactInfo.emergencyContact || '-'}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Telefonas</label>
                          {editMode.contacts ? (
                            <input
                              type="tel"
                              value={settings.contactInfo.emergencyPhone}
                              onChange={(e) => updateSettings('contactInfo', { emergencyPhone: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#2F8481] focus:border-transparent"
                            />
                          ) : (
                            <p className="text-sm font-medium text-gray-900">{settings.contactInfo.emergencyPhone || '-'}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Meters Section */}
                {activeSection === 'meters' && (
                  <div className="space-y-4 h-full flex flex-col min-h-0">
                    <h3 className="text-lg font-semibold text-gray-900">Skaitliukai</h3>
                    <p className="text-sm text-gray-500">Valdykite adreso skaitliukų konfigūraciją.</p>

                    <div className="flex-1 min-h-0">
                      <MetersTable
                        meters={addressMeters}
                        onMetersChange={handleMetersChange}
                      />
                    </div>
                  </div>
                )}


                {/* Notifications Section */}
                {activeSection === 'notifications' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">Pranešimų nustatymai</h3>
                      <button
                        onClick={() => toggleEditMode('notifications')}
                        className={`flex items - center gap - 2 px - 3 py - 1.5 rounded - lg text - sm font - medium transition - colors ${editMode.notifications
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          } `}
                      >
                        {editMode.notifications ? <Check className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
                        {editMode.notifications ? 'Baigti' : 'Redaguoti'}
                      </button>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Nuomos priminimas (d. prieš)</label>
                          {editMode.notifications ? (
                            <input
                              type="number"
                              value={settings.notificationSettings.rentReminderDays}
                              onChange={(e) => updateSettings('notificationSettings', { rentReminderDays: parseInt(e.target.value) || 0 })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#2F8481] focus:border-transparent"
                            />
                          ) : (
                            <p className="text-sm font-medium text-gray-900">{settings.notificationSettings.rentReminderDays} d.</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Sutarties pabaigos priminimas (d. prieš)</label>
                          {editMode.notifications ? (
                            <input
                              type="number"
                              value={settings.notificationSettings.contractExpiryReminderDays}
                              onChange={(e) => updateSettings('notificationSettings', { contractExpiryReminderDays: parseInt(e.target.value) || 0 })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#2F8481] focus:border-transparent"
                            />
                          ) : (
                            <p className="text-sm font-medium text-gray-900">{settings.notificationSettings.contractExpiryReminderDays} d.</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Skaitliukų priminimas (d. prieš)</label>
                          {editMode.notifications ? (
                            <input
                              type="number"
                              value={settings.notificationSettings.meterReminderDays}
                              onChange={(e) => updateSettings('notificationSettings', { meterReminderDays: parseInt(e.target.value) || 0 })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#2F8481] focus:border-transparent"
                            />
                          ) : (
                            <p className="text-sm font-medium text-gray-900">{settings.notificationSettings.meterReminderDays} d.</p>
                          )}
                        </div>
                        <div className="flex items-end">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={settings.notificationSettings.maintenanceNotifications}
                              onChange={(e) => updateSettings('notificationSettings', { maintenanceNotifications: e.target.checked })}
                              disabled={!editMode.notifications}
                              className="w-4 h-4 text-[#2F8481] rounded focus:ring-[#2F8481]"
                            />
                            <span className="text-sm text-gray-700">Techninės priežiūros pranešimai</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Sticky Footer with Save/Cancel */}
          <div className="flex items-center justify-between px-6 py-3 bg-white border-t border-gray-200">
            <div className="flex items-center gap-3">
              {isDirty && (
                <span className="flex items-center gap-1.5 text-xs text-amber-600">
                  <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                  Neišsaugoti pakeitimai
                </span>
              )}
              {showSavedToast && (
                <span className="flex items-center gap-1.5 text-xs text-green-600">
                  <Check className="w-3.5 h-3.5" />
                  Išsaugota!
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Atšaukti
              </button>
              <button
                onClick={handleSave}
                disabled={!isDirty || isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-[#2F8481] text-white text-sm font-semibold rounded-lg hover:bg-[#297a77] shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saugoma...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Išsaugoti
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT SIDEBAR - Contextual Navigation */}
        <div className="w-56 bg-[#1a2e2d] flex flex-col border-l border-gray-800">
          {/* Section Title */}
          <div className="px-4 py-4 border-b border-white/10">
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">Nustatymai</h3>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-1">
            {sections.map(section => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${isActive
                    ? 'bg-[#2F8481] text-white shadow-md'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                >
                  <Icon className="w-4 h-4" />
                  {section.label}
                </button>
              );
            })}
          </nav>

          {/* Quick Stats / Health */}
          <div className="px-4 py-3 border-t border-white/10">
            <div className="text-xs font-medium text-white/50 mb-2">Būsena</div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/70">Skaitliukai</span>
                <span className="text-xs font-semibold text-green-400">{addressMeters.length} aktyvūs</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/70">Kontaktai</span>
                <span className={`text-xs font-semibold ${settings.contactInfo.managerName ? 'text-green-400' : 'text-amber-400'}`}>
                  {settings.contactInfo.managerName ? 'Užpildyta' : 'Trūksta'}
                </span>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="p-3 border-t border-white/10">
            {onDelete && (
              <button
                onClick={handleDelete}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Ištrinti adresą
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddressSettingsModal;
