import React, { useState, useEffect, useCallback, memo } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Building2, Users, Gauge, Bell, Wallet,
  X, Save, MapPin, AlertTriangle,
} from 'lucide-react';
import {
  getAddressSettings,
  upsertAddressSettings,
  getAddressIdByAddress,
} from '../../lib/communalMetersApi';
import { supabase } from '../../lib/supabase';
import { type DistributionMethod } from '../../constants/meterDistribution';

// Types & defaults
import type {
  AddressSettingsData,
  AddressSettingsModalProps,
  AddressRow,
  LocalMeter,
  TabId,
} from './addressSettingsTypes';
import { DEFAULT_SETTINGS } from './addressSettingsTypes';

// Tab components
import { GeneralTab } from './tabs/GeneralTab';
import { ContactsTab } from './tabs/ContactsTab';
import { FinancialTab } from './tabs/FinancialTab';
import { NotificationsTab } from './tabs/NotificationsTab';
import { CommunalTab } from './tabs/CommunalTab';

// ============================================================
// TABS CONFIG (static â€” hoisted outside render)
// ============================================================
const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'general', label: 'Bendra info', icon: Building2 },
  { id: 'contacts', label: 'Kontaktai', icon: Users },
  { id: 'financial', label: 'Finansai', icon: Wallet },
  { id: 'notifications', label: 'Pranešimai', icon: Bell },
  { id: 'communal', label: 'Komunaliniai', icon: Gauge },
];

// ============================================================
// MAIN COMPONENT
// ============================================================
const AddressSettingsModal = memo<AddressSettingsModalProps>(({
  isOpen,
  onClose,
  address,
  addressId,
  currentSettings,
  onSave,
  onDelete,
}) => {
  // â”€â”€ State â”€â”€
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [dbAddressId, setDbAddressId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{ bendrija?: string; valdymoImone?: string }>({});
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [addressData, setAddressData] = useState<AddressRow | null>(null);
  const { user } = useAuth();
  const [ownerPhone, setOwnerPhone] = useState<string | null>(null);
  const [phoneInput, setPhoneInput] = useState('');
  const [isSavingPhone, setIsSavingPhone] = useState(false);
  const [phoneSaved, setPhoneSaved] = useState(false);
  const [allAddresses, setAllAddresses] = useState<Array<{ id: string; full_address: string }>>([]);

  // Settings state â€” typed
  const [settings, setSettings] = useState<AddressSettingsData>(() => ({
    ...structuredClone(DEFAULT_SETTINGS),
    ...(currentSettings ? structuredClone(currentSettings) : {}),
  } as AddressSettingsData));

  // Meters state
  const [addressMeters, setAddressMeters] = useState<LocalMeter[]>([]);
  const [initialMeters, setInitialMeters] = useState<LocalMeter[]>([]);

  // â”€â”€ Reset ephemeral state on modal open â”€â”€
  useEffect(() => {
    if (isOpen) {
      setActiveTab('general');
      setIsDirty(false);
      setError(null);
      setValidationErrors({});
      setShowSavedToast(false);
      setPhoneInput('');
      setPhoneSaved(false);
      setSettings({
        ...structuredClone(DEFAULT_SETTINGS),
        ...(currentSettings ? structuredClone(currentSettings) : {}),
      } as AddressSettingsData);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps â€” intentionally reset on open only

  // â”€â”€ Save phone to user profile â”€â”€
  const handleSavePhone = useCallback(async () => {
    if (!user?.id || !phoneInput.trim()) return;
    setIsSavingPhone(true);
    try {
      const { error: usersErr } = await supabase.from('users').update({ phone: phoneInput.trim() }).eq('id', user.id);
      if (usersErr) throw usersErr;
      const { error: profilesErr } = await supabase.from('profiles').update({ phone: phoneInput.trim() }).eq('id', user.id);
      if (profilesErr) throw profilesErr;
      setOwnerPhone(phoneInput.trim());
      setPhoneSaved(true);
      setTimeout(() => setPhoneSaved(false), 3000);
    } catch (err) {
      if (import.meta.env.DEV) console.error('[AddressSettingsModal] Error saving phone:', err);
      setError('Klaida išsaugant telefono numerį.');
    } finally {
      setIsSavingPhone(false);
    }
  }, [user?.id, phoneInput]);

  // â”€â”€ Copy settings from another address â”€â”€
  const copySettingsFrom = useCallback(async (sourceAddressId: string, tab: 'contacts' | 'financial') => {
    try {
      const { data: srcSettings, error: srcErr } = await supabase
        .from('address_settings')
        .select('contact_info, financial_settings, building_info')
        .eq('address_id', sourceAddressId)
        .maybeSingle();

      if (srcErr) throw srcErr;
      if (!srcSettings) return;

      if (tab === 'contacts') {
        const { data: srcAddr, error: addrErr } = await supabase
          .from('addresses')
          .select('chairman_name, chairman_phone, chairman_email, company_name, contact_person, company_phone, company_email, management_type')
          .eq('id', sourceAddressId)
          .maybeSingle();
        if (addrErr) throw addrErr;

        setSettings(prev => ({
          ...prev,
          contactInfo: {
            ...prev.contactInfo,
            ...(srcSettings.contact_info || {}),
            chairmanName: srcAddr?.chairman_name ?? srcSettings.contact_info?.chairmanName ?? '',
            chairmanPhone: srcAddr?.chairman_phone ?? srcSettings.contact_info?.chairmanPhone ?? '',
            chairmanEmail: srcAddr?.chairman_email ?? srcSettings.contact_info?.chairmanEmail ?? '',
            companyName: srcAddr?.company_name ?? srcSettings.contact_info?.companyName ?? '',
            contactPerson: srcAddr?.contact_person ?? srcSettings.contact_info?.contactPerson ?? '',
            companyPhone: srcAddr?.company_phone ?? srcSettings.contact_info?.companyPhone ?? '',
            companyEmail: srcAddr?.company_email ?? srcSettings.contact_info?.companyEmail ?? '',
          },
          buildingInfo: {
            ...prev.buildingInfo,
            managementType: srcAddr?.management_type ?? prev.buildingInfo.managementType,
            associationNumber: srcSettings.building_info?.associationNumber ?? prev.buildingInfo.associationNumber,
            companyCode: srcSettings.building_info?.companyCode ?? prev.buildingInfo.companyCode,
          },
        }));
      } else if (tab === 'financial') {
        setSettings(prev => ({
          ...prev,
          financialSettings: {
            ...prev.financialSettings,
            ...(srcSettings.financial_settings || {}),
          },
        }));
      }
      setIsDirty(true);
    } catch (err) {
      if (import.meta.env.DEV) console.error('[AddressSettingsModal] Error copying settings:', err);
      setError('Klaida kopijuojant nustatymus.');
    }
  }, []);

  // â”€â”€ DATA LOADING â”€â”€
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    const loadAddressData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Collect all async data first, then do one big state update
        let fetchedPhone: string | null = null;
        let fetchedAddresses: Array<{ id: string; full_address: string }> = [];
        let fetchedAddrRow: AddressRow | null = null;
        let fetchedDbSettings: Awaited<ReturnType<typeof getAddressSettings>> = null;
        let fetchedMeters: LocalMeter[] = [];

        // 1. Owner phone
        if (user?.id) {
          const { data: userData, error: userErr } = await supabase
            .from('users')
            .select('phone')
            .eq('id', user.id)
            .maybeSingle();
          if (userErr && import.meta.env.DEV) if (import.meta.env.DEV) console.error('[AddressSettingsModal] Owner phone fetch error:', userErr);
          fetchedPhone = userData?.phone || null;
        }

        // 2. All addresses (for copy feature)
        if (user?.id) {
          const { data: userAddr, error: addrListErr } = await supabase
            .from('addresses')
            .select('id, full_address')
            .eq('created_by', user.id);
          if (addrListErr && import.meta.env.DEV) if (import.meta.env.DEV) console.error('[AddressSettingsModal] Address list fetch error:', addrListErr);
          if (userAddr) {
            fetchedAddresses = userAddr.filter(a => a.id !== (addressId || ''));
          }
        }

        // 3. Resolve addressId
        const resolvedAddressId = addressId || await getAddressIdByAddress(address);
        if (cancelled) return;

        if (resolvedAddressId) {
          // 4. Load address row data
          const { data: addrRow, error: addrRowErr } = await supabase
            .from('addresses')
            .select('*')
            .eq('id', resolvedAddressId)
            .single();
          if (addrRowErr && import.meta.env.DEV) if (import.meta.env.DEV) console.error('[AddressSettingsModal] Address row fetch error:', addrRowErr);
          if (addrRow) fetchedAddrRow = addrRow;

          // 5. Load address settings
          fetchedDbSettings = await getAddressSettings(resolvedAddressId);

          // 6. Load address meters
          const { data: meters, error: metersError } = await supabase
            .from('address_meters')
            .select('id, name, type, unit, price_per_unit, fixed_price, distribution_method, description, is_active, requires_photo, collection_mode, landlord_reading_enabled, tenant_photo_enabled, supplier')
            .eq('address_id', resolvedAddressId)
            .eq('is_active', true);

          if (metersError && import.meta.env.DEV) if (import.meta.env.DEV) console.error('[AddressSettingsModal] Meters fetch error:', metersError);

          if (!metersError && meters) {
            fetchedMeters = meters.map(meter => ({
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
              tenantPhotoEnabled: meter.tenant_photo_enabled ?? false,
              supplier: meter.supplier || undefined,
            }));
          }
        }

        if (cancelled) return;

        // â”€â”€ Single batch state update to avoid race conditions â”€â”€
        setOwnerPhone(fetchedPhone);
        setAllAddresses(fetchedAddresses);
        setDbAddressId(resolvedAddressId);
        setAddressData(fetchedAddrRow);
        setAddressMeters(fetchedMeters);
        setInitialMeters(structuredClone(fetchedMeters));

        // Merge all data sources into settings in ONE call
        setSettings(prev => {
          const merged = structuredClone(prev);

          // From address row
          if (fetchedAddrRow) {
            merged.buildingInfo.totalApartments = fetchedAddrRow.total_apartments ?? merged.buildingInfo.totalApartments;
            merged.buildingInfo.totalFloors = fetchedAddrRow.floors ?? merged.buildingInfo.totalFloors;
            merged.buildingInfo.yearBuilt = fetchedAddrRow.year_built ?? merged.buildingInfo.yearBuilt;
            merged.buildingInfo.buildingType = fetchedAddrRow.building_type ?? merged.buildingInfo.buildingType;
            merged.buildingInfo.managementType = fetchedAddrRow.management_type ?? merged.buildingInfo.managementType;
            merged.contactInfo.chairmanName = fetchedAddrRow.chairman_name ?? '';
            merged.contactInfo.chairmanPhone = fetchedAddrRow.chairman_phone ?? '';
            merged.contactInfo.chairmanEmail = fetchedAddrRow.chairman_email ?? '';
            merged.contactInfo.companyName = fetchedAddrRow.company_name ?? '';
            merged.contactInfo.contactPerson = fetchedAddrRow.contact_person ?? '';
            merged.contactInfo.companyPhone = fetchedAddrRow.company_phone ?? '';
            merged.contactInfo.companyEmail = fetchedAddrRow.company_email ?? '';
          }

          // From DB settings (higher priority)
          if (fetchedDbSettings) {
            Object.assign(merged.buildingInfo, fetchedDbSettings.building_info || {});
            Object.assign(merged.contactInfo, fetchedDbSettings.contact_info || {});
            Object.assign(merged.financialSettings, fetchedDbSettings.financial_settings || {});
            Object.assign(merged.notificationSettings, fetchedDbSettings.notification_settings || {});
            Object.assign(merged.communalConfig, fetchedDbSettings.communal_config || {});
          }

          return merged;
        });
      } catch (err) {
        if (import.meta.env.DEV) console.error('[AddressSettingsModal] Error loading address data:', err);
        setError('Klaida kraunant adreso duomenis.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadAddressData();
    return () => { cancelled = true; };
  }, [isOpen, address, addressId, user?.id]);

  // â”€â”€ HANDLERS â”€â”€
  const handleMetersChange = useCallback((meters: LocalMeter[]) => {
    setAddressMeters(meters);
    setIsDirty(true);
  }, []);

  const handleMeterUpdate = useCallback(async (id: string, updates: Partial<LocalMeter>) => {
    try {
      const dbUpdates: Record<string, unknown> = {};
      if ('supplier' in updates) dbUpdates.supplier = updates.supplier || null;
      if ('price_per_unit' in updates) dbUpdates.price_per_unit = updates.price_per_unit;
      if ('fixed_price' in updates) dbUpdates.fixed_price = updates.fixed_price;
      if ('distribution_method' in updates) dbUpdates.distribution_method = updates.distribution_method;
      if ('name' in updates) dbUpdates.name = updates.name;
      if ('type' in updates) dbUpdates.type = updates.type;
      if ('unit' in updates) dbUpdates.unit = updates.unit;
      if (Object.keys(dbUpdates).length > 0) {
        const { error: updateErr } = await supabase.from('address_meters').update(dbUpdates).eq('id', id);
        if (updateErr) throw updateErr;
      }
    } catch (e) {
      if (import.meta.env.DEV) console.error('[AddressSettingsModal] onMeterUpdate error:', e);
    }
  }, []);

  const updateSettings = useCallback((section: keyof AddressSettingsData, updates: Record<string, unknown>) => {
    setSettings(prev => ({
      ...prev,
      [section]: { ...prev[section], ...updates },
    }));
    setIsDirty(true);
    if (section === 'contactInfo' || section === 'buildingInfo') {
      setValidationErrors({});
    }
  }, []);

  // â”€â”€ Save meters using batch upsert â”€â”€
  const saveMeters = useCallback(async (resolvedAddressId: string) => {
    // 1. Find deleted meters
    const { data: existingMeters, error: fetchErr } = await supabase
      .from('address_meters')
      .select('id')
      .eq('address_id', resolvedAddressId);
    if (fetchErr) throw fetchErr;

    const existingIds = existingMeters?.map(m => m.id) || [];
    const currentIds = addressMeters.filter(m => !m.id.startsWith('temp_')).map(m => m.id);
    const deletedIds = existingIds.filter(id => !currentIds.includes(id));

    // 2. Batch delete
    if (deletedIds.length > 0) {
      const { error: delErr } = await supabase.from('address_meters').delete().in('id', deletedIds);
      if (delErr) throw delErr;
    }

    // 3. Separate new vs existing meters
    const newMeters = addressMeters.filter(m => m.id.startsWith('temp_'));
    const existingToUpdate = addressMeters.filter(m => !m.id.startsWith('temp_'));

    const toDbRow = (meter: LocalMeter, includeId: boolean) => {
      const row: Record<string, unknown> = {
        address_id: resolvedAddressId,
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
        tenant_photo_enabled: meter.tenantPhotoEnabled,
        supplier: meter.supplier || null,
      };
      if (includeId) row.id = meter.id;
      return row;
    };

    // 4. Batch insert new meters
    if (newMeters.length > 0) {
      const { error: insertErr } = await supabase
        .from('address_meters')
        .insert(newMeters.map(m => toDbRow(m, false)));
      if (insertErr) throw insertErr;
    }

    // 5. Batch upsert existing meters
    if (existingToUpdate.length > 0) {
      const { error: upsertErr } = await supabase
        .from('address_meters')
        .upsert(existingToUpdate.map(m => toDbRow(m, true)), { onConflict: 'id' });
      if (upsertErr) throw upsertErr;
    }
  }, [addressMeters]);

  const handleSave = useCallback(async () => {
    if (!dbAddressId) {
      setError('Nepavyko rasti adreso ID.');
      return;
    }

    // Validate contacts
    const ci = settings.contactInfo;
    const newValidationErrors: { bendrija?: string; valdymoImone?: string } = {};

    const bendrijaHasData = (ci.chairmanName || '').trim() || (settings.buildingInfo.associationNumber || '').trim();
    const bendrijaHasContact = (ci.chairmanPhone || '').trim() || (ci.chairmanEmail || '').trim();
    if (bendrijaHasData && !bendrijaHasContact) {
      newValidationErrors.bendrija = 'Užpildykite bent telefoną arba el. paštą';
    }

    const imoneHasData = (ci.companyName || '').trim() || (settings.buildingInfo.companyCode || '').trim() || (ci.contactPerson || '').trim();
    const imoneHasContact = (ci.companyPhone || '').trim() || (ci.companyEmail || '').trim();
    if (imoneHasData && !imoneHasContact) {
      newValidationErrors.valdymoImone = 'Užpildykite bent telefoną arba el. paštą';
    }

    if (Object.keys(newValidationErrors).length > 0) {
      setValidationErrors(newValidationErrors);
      setActiveTab('contacts');
      return;
    }
    setValidationErrors({});
    setIsSaving(true);
    setError(null);

    try {
      // 1. Save address settings (type assertion needed â€” API types are narrower than actual stored JSON)
      await upsertAddressSettings({
        address_id: dbAddressId,
        building_info: {
          ...settings.buildingInfo,
          yearBuilt: settings.buildingInfo.yearBuilt ?? undefined,
        } as Parameters<typeof upsertAddressSettings>[0]['building_info'],
        contact_info: settings.contactInfo,
        financial_settings: settings.financialSettings,
        notification_settings: settings.notificationSettings,
        communal_config: settings.communalConfig,
      });

      // 2. Update addresses table with core fields
      const { error: addrUpdateErr } = await supabase
        .from('addresses')
        .update({
          total_apartments: settings.buildingInfo.totalApartments,
          floors: settings.buildingInfo.totalFloors,
          year_built: settings.buildingInfo.yearBuilt,
          building_type: settings.buildingInfo.buildingType,
          management_type: settings.buildingInfo.managementType,
          chairman_name: settings.contactInfo.chairmanName,
          chairman_phone: settings.contactInfo.chairmanPhone,
          chairman_email: settings.contactInfo.chairmanEmail,
          company_name: settings.contactInfo.companyName,
          contact_person: settings.contactInfo.contactPerson,
          company_phone: settings.contactInfo.companyPhone,
          company_email: settings.contactInfo.companyEmail,
        })
        .eq('id', dbAddressId);
      if (addrUpdateErr) throw addrUpdateErr;

      // 3. Save meters â€” BATCH (replaces N+1 loop)
      await saveMeters(dbAddressId);

      // Reset dirty state
      setIsDirty(false);
      setInitialMeters(structuredClone(addressMeters));

      // Show toast
      setShowSavedToast(true);
      setTimeout(() => setShowSavedToast(false), 3000);

      onSave(settings);
    } catch (err) {
      if (import.meta.env.DEV) console.error('[AddressSettingsModal] Error saving settings:', err);
      setError('Klaida išsaugant nustatymus.');
    } finally {
      setIsSaving(false);
    }
  }, [dbAddressId, settings, addressMeters, onSave, saveMeters]);

  const handleClose = useCallback(() => {
    if (isDirty) {
      // TODO: Replace window.confirm with custom modal in future iteration
      if (window.confirm('Turite neišsaugotų pakeitimų. Ar tikrai norite uždaryti?')) {
        onClose();
      }
    } else {
      onClose();
    }
  }, [isDirty, onClose]);

  const handleDelete = useCallback(() => {
    if (onDelete && dbAddressId) {
      // TODO: Replace window.confirm with custom modal in future iteration
      if (window.confirm(`Ar tikrai norite ištrinti adresą "${address}"?\n\nŠis veiksmas ištrins visus susijusius butus ir duomenis.`)) {
        onDelete(dbAddressId, address);
        onClose();
      }
    }
  }, [onDelete, dbAddressId, address, onClose]);

  if (!isOpen) return null;

  // â”€â”€ Derived values â”€â”€
  const addressParts = address.split(',');
  const streetPart = addressParts[0]?.trim() || address;
  const cityPart = addressParts[1]?.trim() || '';

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div
        className="relative rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.3)] w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden bg-cover bg-center"
        style={{ backgroundImage: `url('/images/DarkBuildingCardBg.png')` }}
      >
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/55 rounded-2xl z-0" />

        {/* â•â•â• HERO â•â•â• */}
        <div className="relative z-10 h-28 bg-gradient-to-r from-[#1a5c5a] via-[#2F8481] to-[#3a9e9b] flex-shrink-0 overflow-hidden">
          <div className="absolute inset-0 opacity-[0.07]" style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px), radial-gradient(circle at 60% 80%, white 1px, transparent 1px)`,
            backgroundSize: '40px 40px, 60px 60px, 50px 50px',
          }} />
          <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/[0.06] rounded-full blur-2xl" />
          <div className="absolute bottom-0 left-0 right-0 px-6 pb-4">
            <div className="flex items-end justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2 py-0.5 bg-white/15 backdrop-blur-sm text-white/90 text-[10px] font-semibold rounded-md border border-white/10">
                    {(() => {
                      const bt = addressData?.building_type || settings.buildingInfo.buildingType || '';
                      const map: Record<string, string> = { apartment: 'Daugiabutis', house: 'Namas', 'Daugiabutis': 'Daugiabutis', 'Namas': 'Namas', 'Kotedžas': 'Kotedžas', 'Komercinis': 'Komercinis', 'Kita': 'Kita' };
                      return map[bt] || bt || 'Butų namas';
                    })()}
                  </span>
                  <span className="px-2 py-0.5 bg-white/20 backdrop-blur-sm text-white text-[10px] font-semibold rounded-md">
                    {settings.buildingInfo.totalApartments} {settings.buildingInfo.totalApartments === 1 ? 'butas' : 'butai'}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white tracking-[-0.01em]">{streetPart}</h2>
                {cityPart && (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <MapPin className="w-3 h-3 text-white/50" />
                    <span className="text-[12px] text-white/60 font-medium">{cityPart}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all"
            aria-label="Uždaryti"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* â•â•â• TABS â•â•â• */}
        <div className="relative z-10 flex-shrink-0 bg-white/[0.08] backdrop-blur-md border-b border-white/[0.08] px-6">
          <div className="flex gap-0.5 -mb-px overflow-x-auto">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-semibold border-b-[2px] transition-all whitespace-nowrap ${isActive
                    ? 'border-teal-400 text-white'
                    : 'border-transparent text-white/40 hover:text-white/70 hover:border-white/20'
                    }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-teal-400' : ''}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* â•â•â• CONTENT â•â•â• */}
        <div className="relative z-10 flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2F8481]" />
            </div>
          ) : (
            <>
              {activeTab === 'general' && (
                <GeneralTab
                  settings={settings}
                  updateSettings={updateSettings}
                  addressData={addressData}
                  streetPart={streetPart}
                  cityPart={cityPart}
                  onDelete={onDelete ? handleDelete : undefined}
                />
              )}
              {activeTab === 'contacts' && (
                <ContactsTab
                  settings={settings}
                  updateSettings={updateSettings}
                  validationErrors={validationErrors}
                  user={user}
                  ownerPhone={ownerPhone}
                  phoneInput={phoneInput}
                  setPhoneInput={setPhoneInput}
                  onSavePhone={handleSavePhone}
                  isSavingPhone={isSavingPhone}
                  phoneSaved={phoneSaved}
                  allAddresses={allAddresses}
                  onCopySettings={copySettingsFrom}
                />
              )}
              {activeTab === 'financial' && (
                <FinancialTab
                  settings={settings}
                  updateSettings={updateSettings}
                  allAddresses={allAddresses}
                  onCopySettings={copySettingsFrom}
                />
              )}
              {activeTab === 'notifications' && (
                <NotificationsTab
                  settings={settings}
                  updateSettings={updateSettings}
                />
              )}
              {activeTab === 'communal' && (
                <CommunalTab
                  settings={settings}
                  updateSettings={updateSettings}
                  meters={addressMeters}
                  onMetersChange={handleMetersChange}
                  onMeterUpdate={handleMeterUpdate}
                />
              )}
            </>
          )}
        </div>

        {/* â•â•â• STICKY FOOTER â•â•â• */}
        <div className="relative z-10 flex-shrink-0 flex items-center justify-between px-6 py-3 bg-white/[0.08] backdrop-blur-md border-t border-white/[0.08]">
          <div className="flex items-center gap-3">
            {isDirty && (
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-amber-400">
                <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
                Neišsaugoti pakeitimai
              </span>
            )}
            {showSavedToast && (
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-400">
                <Save className="w-3 h-3" />
                Išsaugota!
              </span>
            )}
            {error && (
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-red-400">
                <AlertTriangle className="w-3 h-3" />
                {error}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-[12px] font-semibold text-white/50 hover:text-white hover:bg-white/[0.06] rounded-lg transition-all"
            >
              Atšaukti
            </button>
            <button
              onClick={handleSave}
              disabled={!isDirty || isSaving}
              className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 text-white text-[12px] font-semibold rounded-lg hover:bg-teal-700 shadow-sm shadow-teal-500/20 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saugoma...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  Išsaugoti pakeitimus
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
AddressSettingsModal.displayName = 'AddressSettingsModal';

export default AddressSettingsModal;
