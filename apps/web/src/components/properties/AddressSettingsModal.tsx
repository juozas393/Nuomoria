import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Building2, Users, Gauge, Bell, Wallet,
  X, Save, Trash2, MapPin,
  AlertTriangle, User, CreditCard, Plus,
  Phone, Check, Loader2, Copy, ChevronDown
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

type TabId = 'general' | 'contacts' | 'financial' | 'notifications' | 'communal';

// ============================================================
// DEFAULT SETTINGS
// ============================================================
const DEFAULT_SETTINGS = {
  buildingInfo: {
    totalApartments: 1,
    totalFloors: 1,
    yearBuilt: null as number | null,
    buildingType: 'Butų namas' as string,
    heatingType: 'central' as string,
    parkingSpaces: 0,
    totalArea: null as number | null,
    managementType: 'Nuomotojas' as string,
    associationNumber: '',
    companyCode: '',
    companyWebsite: '',
  },
  contactInfo: {
    managerName: '',
    managerPhone: '',
    managerEmail: '',
    emergencyContact: '',
    emergencyPhone: '',
    chairmanName: '',
    chairmanPhone: '',
    chairmanEmail: '',
    companyName: '',
    contactPerson: '',
    companyPhone: '',
    companyEmail: '',
    plumberPhone: '',
    electricianPhone: '',
    dispatcherPhone: '',
    customContacts: [] as Array<{ id: string; title: string; content: string; comment: string }>,
  },
  financialSettings: {
    defaultDeposit: 500,
    latePaymentFee: 0,
    gracePeriodDays: 5,
    autoRenewalEnabled: true,
    defaultContractDuration: 12,
    paymentDay: 15,
    depositPolicy: '1month' as string,
    bankAccount: '',
    recipientName: '',
    paymentPurposeTemplate: '',
  },
  notificationSettings: {
    rentReminderEnabled: true,
    rentReminderDays: 3,
    latePaymentEnabled: true,
    meterReminderEnabled: true,
    meterReminderDays: 5,
    meterReadingStartDay: 20,
    meterReadingEndDay: 29,
    contractExpiryEnabled: true,
    contractExpiryReminderDays: 30,
    maintenanceNotifications: true,
    newDocumentNotifications: false,
  },
  communalConfig: {
    enableMeterEditing: true,
    requirePhotos: true,
    historyRetentionMonths: 18,
  },
};

// ============================================================
// SHARED COMPONENTS — Premium Light Theme
// ============================================================
const FormField: React.FC<{
  label: string;
  children: React.ReactNode;
  className?: string;
  helperText?: string;
}> = ({ label, children, className = '', helperText }) => (
  <div className={className}>
    <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-[0.08em] mb-1">
      {label}
    </label>
    {children}
    {helperText && (
      <p className="text-[9px] text-gray-400 mt-1 leading-tight">{helperText}</p>
    )}
  </div>
);

const InputField: React.FC<{
  value: string | number;
  onChange: (val: string) => void;
  type?: string;
  placeholder?: string;
  suffix?: string;
}> = ({ value, onChange, type = 'text', placeholder = '', suffix }) => (
  <div className="relative">
    <input
      type={type}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3.5 py-2 bg-white border border-gray-300/80 rounded-lg text-[13px] text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 focus:bg-white transition-all outline-none shadow-sm"
    />
    {suffix && (
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-medium text-gray-400">
        {suffix}
      </span>
    )}
  </div>
);

const SelectField: React.FC<{
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
}> = ({ value, onChange, options }) => (
  <div className="relative">
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3.5 py-2 bg-white border border-gray-300/80 rounded-lg text-[13px] text-gray-900 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 focus:bg-white transition-all outline-none appearance-none cursor-pointer pr-8 shadow-sm"
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
    <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  </div>
);

const ToggleRow: React.FC<{
  label: string;
  description?: string;
  checked: boolean;
  onChange: (val: boolean) => void;
  children?: React.ReactNode;
}> = ({ label, description, checked, onChange, children }) => (
  <div className={`rounded-xl border p-4 transition-all duration-200 ${checked
    ? 'bg-white border-teal-200/60 shadow-[0_1px_4px_rgba(47,132,129,0.08)]'
    : 'bg-white border-gray-100 hover:border-gray-200'
    }`}>
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-gray-900">{label}</div>
        {description && <div className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">{description}</div>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-[22px] w-10 items-center rounded-full transition-all duration-200 flex-shrink-0 ${checked ? 'bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.3)]' : 'bg-gray-200'
          }`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? 'translate-x-[22px]' : 'translate-x-1'
          }`} />
      </button>
    </div>
    {checked && children && (
      <div className="mt-3 pt-3 border-t border-gray-100/80">
        {children}
      </div>
    )}
  </div>
);

const SegmentedControl: React.FC<{
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
}> = ({ value, onChange, options }) => (
  <div className="flex bg-gray-100/80 rounded-xl p-1 gap-0.5">
    {options.map(o => (
      <button
        key={o.value}
        onClick={() => onChange(o.value)}
        className={`flex-1 px-3 py-2 rounded-lg text-[12px] font-semibold transition-all duration-200 ${value === o.value
          ? 'bg-white text-teal-700 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_0_0_1px_rgba(47,132,129,0.1)]'
          : 'text-gray-400 hover:text-gray-600'
          }`}
      >
        {o.label}
      </button>
    ))}
  </div>
);

const Card: React.FC<{
  title?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}> = ({ title, icon, children, className = '' }) => (
  <div
    className={`rounded-2xl border border-white/60 shadow-[0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden bg-white/95 bg-cover bg-center ${className}`}
    style={{ backgroundImage: `url('/images/CardsBackground.webp')` }}
  >
    {title && (
      <div className="flex items-center gap-2.5 px-5 py-3 border-b border-gray-200/40">
        <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center">
          {icon}
        </div>
        <h4 className="text-[13px] font-bold text-gray-900">{title}</h4>
      </div>
    )}
    <div className="p-5">{children}</div>
  </div>
);

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
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [dbAddressId, setDbAddressId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{ bendrija?: string; valdymoImone?: string }>({});
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [addressData, setAddressData] = useState<any>(null);
  const { user } = useAuth();
  const [ownerPhone, setOwnerPhone] = useState<string | null>(null);
  const [phoneInput, setPhoneInput] = useState('');
  const [isSavingPhone, setIsSavingPhone] = useState(false);
  const [phoneSaved, setPhoneSaved] = useState(false);
  const [allAddresses, setAllAddresses] = useState<Array<{ id: string; full_address: string }>>([]);
  const [copyDropdownTab, setCopyDropdownTab] = useState<string | null>(null);

  // Save phone to user profile
  const handleSavePhone = async () => {
    if (!user?.id || !phoneInput.trim()) return;
    setIsSavingPhone(true);
    try {
      // Update users table
      await supabase.from('users').update({ phone: phoneInput.trim() }).eq('id', user.id);
      // Update profiles table too
      await supabase.from('profiles').update({ phone: phoneInput.trim() }).eq('id', user.id);
      setOwnerPhone(phoneInput.trim());
      setPhoneSaved(true);
      setTimeout(() => setPhoneSaved(false), 3000);
    } catch (err) {
      console.error('Error saving phone:', err);
    } finally {
      setIsSavingPhone(false);
    }
  };

  // Settings state
  const [settings, setSettings] = useState({
    ...DEFAULT_SETTINGS,
    ...(currentSettings || {})
  });

  // Copy settings from another address
  const copySettingsFrom = async (sourceAddressId: string, tab: 'contacts' | 'financial') => {
    try {
      const { data: srcSettings } = await supabase
        .from('address_settings')
        .select('contact_info, financial_settings, building_info')
        .eq('address_id', sourceAddressId)
        .maybeSingle();

      if (tab === 'contacts' && srcSettings) {
        // Also fetch contact fields from address row
        const { data: srcAddr } = await supabase
          .from('addresses')
          .select('chairman_name, chairman_phone, chairman_email, company_name, contact_person, company_phone, company_email, management_type')
          .eq('id', sourceAddressId)
          .maybeSingle();

        setSettings((prev: typeof settings) => ({
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
          }
        }));
        setIsDirty(true);
      } else if (tab === 'financial' && srcSettings) {
        setSettings((prev: typeof settings) => ({
          ...prev,
          financialSettings: {
            ...prev.financialSettings,
            ...(srcSettings.financial_settings || {}),
          }
        }));
        setIsDirty(true);
      }
    } catch (err) {
      console.error('Error copying settings:', err);
    } finally {
      setCopyDropdownTab(null);
    }
  };

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
        // Fetch owner phone from users table
        if (user?.id) {
          const { data: userData } = await supabase
            .from('users')
            .select('phone')
            .eq('id', user.id)
            .maybeSingle();
          setOwnerPhone(userData?.phone || null);
        }

        // Fetch all user addresses for copy feature
        if (user?.id) {
          const { data: userAddr } = await supabase
            .from('addresses')
            .select('id, full_address')
            .eq('created_by', user.id);
          if (userAddr) {
            // Exclude current address
            setAllAddresses(userAddr.filter(a => a.id !== (addressId || '')));
          }
        }
        const resolvedAddressId = addressId || await getAddressIdByAddress(address);
        setDbAddressId(resolvedAddressId);

        if (resolvedAddressId) {
          // Load address row data
          const { data: addrRow } = await supabase
            .from('addresses')
            .select('*')
            .eq('id', resolvedAddressId)
            .single();

          if (addrRow) {
            setAddressData(addrRow);
            // Merge address row fields into buildingInfo
            setSettings((prev: typeof settings) => ({
              ...prev,
              buildingInfo: {
                ...prev.buildingInfo,
                totalApartments: addrRow.total_apartments ?? prev.buildingInfo.totalApartments,
                totalFloors: addrRow.floors ?? prev.buildingInfo.totalFloors,
                yearBuilt: addrRow.year_built ?? prev.buildingInfo.yearBuilt,
                buildingType: addrRow.building_type ?? prev.buildingInfo.buildingType,
                managementType: addrRow.management_type ?? prev.buildingInfo.managementType,
              },
              contactInfo: {
                ...prev.contactInfo,
                chairmanName: addrRow.chairman_name ?? '',
                chairmanPhone: addrRow.chairman_phone ?? '',
                chairmanEmail: addrRow.chairman_email ?? '',
                companyName: addrRow.company_name ?? '',
                contactPerson: addrRow.contact_person ?? '',
                companyPhone: addrRow.company_phone ?? '',
                companyEmail: addrRow.company_email ?? '',
              }
            }));
          }

          // Load address settings from address_settings table
          const dbSettings = await getAddressSettings(resolvedAddressId);
          if (dbSettings) {
            setSettings((prev: typeof settings) => ({
              ...prev,
              buildingInfo: { ...prev.buildingInfo, ...(dbSettings.building_info || {}) },
              contactInfo: { ...prev.contactInfo, ...(dbSettings.contact_info || {}) },
              financialSettings: { ...prev.financialSettings, ...(dbSettings.financial_settings || {}) },
              notificationSettings: { ...prev.notificationSettings, ...(dbSettings.notification_settings || {}) },
              communalConfig: { ...prev.communalConfig, ...(dbSettings.communal_config || {}) },
            }));
          }

          // Load address meters
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
    // Clear validation errors when editing relevant sections
    if (section === 'contactInfo' || section === 'buildingInfo') {
      setValidationErrors({});
    }
  }, []);

  const handleSave = async () => {
    if (!dbAddressId) {
      setError('Nepavyko rasti adreso ID.');
      return;
    }

    // Validate contacts: if any field filled, require phone or email
    const ci = settings.contactInfo;
    const newValidationErrors: { bendrija?: string; valdymoImone?: string } = {};

    // Bendrijos kontaktai: if chairmanName or associationNumber filled, need phone or email
    const bendrijaHasData = (ci.chairmanName || '').trim() || (settings.buildingInfo.associationNumber || '').trim();
    const bendrijaHasContact = (ci.chairmanPhone || '').trim() || (ci.chairmanEmail || '').trim();
    if (bendrijaHasData && !bendrijaHasContact) {
      newValidationErrors.bendrija = 'Užpildykite bent telefoną arba el. paštą';
    }

    // Valdymo įmonės kontaktai: if companyName, companyCode, or contactPerson filled, need phone or email
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
      // Save address settings
      await upsertAddressSettings({
        address_id: dbAddressId,
        building_info: settings.buildingInfo,
        contact_info: settings.contactInfo,
        financial_settings: settings.financialSettings,
        notification_settings: settings.notificationSettings,
        communal_config: settings.communalConfig
      });

      // Also update the addresses table with core fields
      await supabase
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

      // Save meters
      await saveMeters();

      // Reset dirty state
      setIsDirty(false);
      setInitialMeters(JSON.parse(JSON.stringify(addressMeters)));

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

    const { data: existingMeters } = await supabase
      .from('address_meters')
      .select('id')
      .eq('address_id', dbAddressId);

    const existingIds = existingMeters?.map(m => m.id) || [];
    const currentIds = addressMeters.filter(m => !m.id.startsWith('temp_')).map(m => m.id);
    const deletedIds = existingIds.filter(id => !currentIds.includes(id));

    if (deletedIds.length > 0) {
      await supabase.from('address_meters').delete().in('id', deletedIds);
    }

    for (const meter of addressMeters) {
      const meterData = {
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
      };

      if (meter.id.startsWith('temp_')) {
        await supabase.from('address_meters').insert([meterData]);
      } else {
        await supabase.from('address_meters').update(meterData).eq('id', meter.id);
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
      if (window.confirm(`Ar tikrai norite ištrinti adresą "${address}"?\n\nŠis veiksmas ištrins visus susijusius butus ir duomenis.`)) {
        onDelete(dbAddressId, address);
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  // ============================================================
  // TABS CONFIG
  // ============================================================
  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: 'general', label: 'Bendra info', icon: Building2 },
    { id: 'contacts', label: 'Kontaktai', icon: Users },
    { id: 'financial', label: 'Finansai', icon: Wallet },
    { id: 'notifications', label: 'Pranešimai', icon: Bell },
    { id: 'communal', label: 'Komunaliniai', icon: Gauge },
  ];

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

        {/* ═══ HERO — Teal gradient with mesh ═══ */}
        <div className="relative z-10 h-28 bg-gradient-to-r from-[#1a5c5a] via-[#2F8481] to-[#3a9e9b] flex-shrink-0 overflow-hidden">
          {/* Subtle mesh overlay */}
          <div className="absolute inset-0 opacity-[0.07]" style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px), radial-gradient(circle at 60% 80%, white 1px, transparent 1px)`,
            backgroundSize: '40px 40px, 60px 60px, 50px 50px',
          }} />
          {/* Right-side decorative glow */}
          <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/[0.06] rounded-full blur-2xl" />

          {/* Content */}
          <div className="absolute bottom-0 left-0 right-0 px-6 pb-4">
            <div className="flex items-end justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2 py-0.5 bg-white/15 backdrop-blur-sm text-white/90 text-[10px] font-semibold rounded-md border border-white/10">
                    {addressData?.building_type || settings.buildingInfo.buildingType || 'Butų namas'}
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

          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ═══ TABS — Glass style on dark bg ═══ */}
        <div className="relative z-10 flex-shrink-0 bg-white/[0.08] backdrop-blur-md border-b border-white/[0.08] px-6">
          <div className="flex gap-0.5 -mb-px overflow-x-auto">
            {tabs.map(tab => {
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

        {/* ═══ CONTENT ═══ */}
        <div className="relative z-10 flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2F8481]" />
            </div>
          ) : (
            <>
              {/* ─── TAB: GENERAL ─── */}
              {activeTab === 'general' && (
                <div className="space-y-4">
                  {/* Building info card */}
                  <Card title="Pastato informacija" icon={<Building2 className="w-4 h-4 text-[#2F8481]" />}>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField label="Adresas" className="col-span-2">
                        <div className="w-full px-3.5 py-2 bg-gray-100/60 border border-gray-200/50 rounded-lg text-[13px] text-gray-400 cursor-not-allowed select-none">{streetPart || '—'}</div>
                      </FormField>
                      <FormField label="Miestas">
                        <div className="w-full px-3.5 py-2 bg-gray-100/60 border border-gray-200/50 rounded-lg text-[13px] text-gray-400 cursor-not-allowed select-none">{cityPart || addressData?.city || '—'}</div>
                      </FormField>
                      <FormField label="Pašto kodas">
                        <div className="w-full px-3.5 py-2 bg-gray-100/60 border border-gray-200/50 rounded-lg text-[13px] text-gray-400 cursor-not-allowed select-none">{addressData?.postal_code || '—'}</div>
                      </FormField>
                      <FormField label="Pastato tipas" helperText="Pasirinkite pastato paskirtį">
                        <SelectField
                          value={settings.buildingInfo.buildingType}
                          onChange={(v) => updateSettings('buildingInfo', { buildingType: v })}
                          options={[
                            { value: 'Butų namas', label: 'Butų namas' },
                            { value: 'Namas', label: 'Namas' },
                            { value: 'Komercinis', label: 'Komercinis' },
                          ]}
                        />
                      </FormField>
                      <FormField label="Butų skaičius" helperText="Kiek butų yra šiame adrese">
                        <InputField
                          type="number"
                          value={settings.buildingInfo.totalApartments}
                          onChange={(v) => updateSettings('buildingInfo', { totalApartments: parseInt(v) || 0 })}
                        />
                      </FormField>
                      <FormField label="Aukštų skaičius" helperText="Bendras pastato aukštų skaičius">
                        <InputField
                          type="number"
                          value={settings.buildingInfo.totalFloors}
                          onChange={(v) => updateSettings('buildingInfo', { totalFloors: parseInt(v) || 0 })}
                        />
                      </FormField>
                      <FormField label="Statybos metai" helperText="Pastato statybos arba rekonstrukcijos metai">
                        <InputField
                          type="number"
                          value={settings.buildingInfo.yearBuilt ?? ''}
                          onChange={(v) => updateSettings('buildingInfo', { yearBuilt: v ? parseInt(v) : null })}
                          placeholder="pvz. 1985"
                        />
                      </FormField>
                      <FormField label="Šildymo tipas" helperText="Pastato šildymo sistema">
                        <SelectField
                          value={settings.buildingInfo.heatingType}
                          onChange={(v) => updateSettings('buildingInfo', { heatingType: v })}
                          options={[
                            { value: 'Centrinis', label: 'Centrinis' },
                            { value: 'Individualus', label: 'Individualus' },
                            { value: 'Rajoninis', label: 'Rajoninis' },
                          ]}
                        />
                      </FormField>
                      <FormField label="Stovėjimo vietos" helperText="Automobilių stovėjimo vietų skaičius">
                        <InputField
                          type="number"
                          value={settings.buildingInfo.parkingSpaces ?? ''}
                          onChange={(v) => updateSettings('buildingInfo', { parkingSpaces: v ? parseInt(v) : null })}
                        />
                      </FormField>
                      <FormField label="Bendras plotas" helperText="Visas pastato naudingasis plotas">
                        <InputField
                          type="number"
                          value={settings.buildingInfo.totalArea ?? ''}
                          onChange={(v) => updateSettings('buildingInfo', { totalArea: v ? parseFloat(v) : null })}
                          suffix="m²"
                        />
                      </FormField>
                    </div>
                  </Card>

                  {/* Danger zone */}
                  {onDelete && (
                    <div className="bg-red-50 rounded-2xl border border-red-100 p-5">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <AlertTriangle className="w-4 h-4 text-red-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-bold text-red-900">Pavojinga zona</h4>
                          <p className="text-xs text-red-600/80 mt-1">
                            Ištrynus adresą, visi susiję butai, nuomininkai ir duomenys bus pašalinti negrįžtamai.
                          </p>
                          <button
                            onClick={handleDelete}
                            className="mt-3 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 hover:text-white bg-red-50 hover:bg-red-600 border border-red-200 hover:border-red-600 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Ištrinti adresą
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ─── TAB: CONTACTS ─── */}
              {activeTab === 'contacts' && (
                <div className="space-y-4">
                  {/* Copy from another address */}
                  {allAddresses.length > 0 && (
                    <div className="relative">
                      <button
                        onClick={() => setCopyDropdownTab(copyDropdownTab === 'contacts' ? null : 'contacts')}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-gray-500 hover:text-teal-600 bg-gray-50 hover:bg-teal-50/60 border border-gray-200/60 rounded-lg transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Kopijuoti iš kito adreso
                        <ChevronDown className={`w-3 h-3 transition-transform ${copyDropdownTab === 'contacts' ? 'rotate-180' : ''}`} />
                      </button>
                      {copyDropdownTab === 'contacts' && (
                        <div className="absolute z-20 mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-lg py-1">
                          {allAddresses.map(a => (
                            <button
                              key={a.id}
                              onClick={() => copySettingsFrom(a.id, 'contacts')}
                              className="w-full text-left px-3 py-2 text-[12px] text-gray-700 hover:bg-teal-50 hover:text-teal-700 transition-colors"
                            >
                              {a.full_address}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Nuomotojo kontaktai — imami iš paskyros */}
                  <Card title="Nuomotojo kontaktai" icon={<User className="w-4 h-4 text-[#2F8481]" />}>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField label="Vardas ir pavardė">
                          <div className="w-full px-3.5 py-2 bg-gray-100/60 border border-gray-200/50 rounded-lg text-[13px] text-gray-700 select-none">
                            {user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || '—' : '—'}
                          </div>
                        </FormField>
                        <FormField label="El. paštas">
                          <div className="w-full px-3.5 py-2 bg-gray-100/60 border border-gray-200/50 rounded-lg text-[13px] text-gray-700 select-none">
                            {user?.email || '—'}
                          </div>
                        </FormField>
                        <FormField label="Telefonas" className="col-span-2">
                          {ownerPhone ? (
                            <div className="w-full px-3.5 py-2 bg-gray-100/60 border border-gray-200/50 rounded-lg text-[13px] text-gray-700 select-none flex items-center gap-2">
                              <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                              {ownerPhone}
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                  <input
                                    type="tel"
                                    value={phoneInput}
                                    onChange={(e) => setPhoneInput(e.target.value)}
                                    placeholder="+370..."
                                    className="w-full pl-9 pr-3.5 py-2 bg-white border border-gray-200 rounded-lg text-[13px] text-gray-700 placeholder-gray-400 focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition-all"
                                  />
                                </div>
                                <button
                                  onClick={handleSavePhone}
                                  disabled={!phoneInput.trim() || isSavingPhone}
                                  className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                                >
                                  {isSavingPhone ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : phoneSaved ? (
                                    <Check className="w-3.5 h-3.5" />
                                  ) : (
                                    <Save className="w-3.5 h-3.5" />
                                  )}
                                  {isSavingPhone ? 'Saugoma...' : phoneSaved ? 'Išsaugota!' : 'Išsaugoti'}
                                </button>
                              </div>
                              <p className="text-[10px] text-gray-400 leading-tight">Įveskite telefono numerį — jis bus automatiškai pridėtas prie jūsų profilio</p>
                            </div>
                          )}
                        </FormField>
                      </div>
                      <p className="text-[9px] text-gray-400 leading-tight">Kontaktinė informacija imama iš jūsų paskyros. El. paštas ir telefonas bus matomi nuomininkams.</p>
                    </div>
                  </Card>

                  {/* Bendrijos kontaktai — visada matomi, neprivalomi */}
                  <Card title="Bendrijos kontaktai" icon={<Users className="w-4 h-4 text-[#2F8481]" />}>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField label="Pirmininko vardas" helperText="Bendrijos pirmininko arba atstovo vardas ir pavardė">
                          <InputField
                            value={settings.contactInfo.chairmanName}
                            onChange={(v) => updateSettings('contactInfo', { chairmanName: v })}
                            placeholder="Vardas Pavardė"
                          />
                        </FormField>
                        <FormField label="Registracijos nr." helperText="Juridinių asmenų registre įregistruotas bendrijos numeris">
                          <InputField
                            value={settings.buildingInfo.associationNumber}
                            onChange={(v) => updateSettings('buildingInfo', { associationNumber: v })}
                            placeholder="pvz. 302345678"
                          />
                        </FormField>
                        <FormField label="Telefonas" helperText="Telefono numeris bendravimui su bendrija">
                          <InputField
                            type="tel"
                            value={settings.contactInfo.chairmanPhone}
                            onChange={(v) => updateSettings('contactInfo', { chairmanPhone: v })}
                            placeholder="+370..."
                          />
                        </FormField>
                        <FormField label="El. paštas" helperText="El. paštas oficialiai korespondencijai su bendrija">
                          <InputField
                            type="email"
                            value={settings.contactInfo.chairmanEmail}
                            onChange={(v) => updateSettings('contactInfo', { chairmanEmail: v })}
                            placeholder="el.pastas@pvz.lt"
                          />
                        </FormField>
                      </div>
                      {validationErrors.bendrija ? (
                        <p className="text-[10px] text-red-500 font-medium flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{validationErrors.bendrija}</p>
                      ) : (
                        <p className="text-[9px] text-gray-400 leading-tight">Užpildykite bent telefoną arba el. paštą, kad bendrijos kontaktai būtų rodomi nuomininkams.</p>
                      )}
                    </div>
                  </Card>

                  {/* Valdymo įmonės kontaktai — visada matomi, neprivalomi */}
                  <Card title="Valdymo įmonės kontaktai" icon={<Building2 className="w-4 h-4 text-[#2F8481]" />}>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField label="Įmonės pavadinimas" helperText="Oficialus valdymo įmonės pavadinimas">
                          <InputField
                            value={settings.contactInfo.companyName}
                            onChange={(v) => updateSettings('contactInfo', { companyName: v })}
                            placeholder="UAB ..."
                          />
                        </FormField>
                        <FormField label="Įmonės kodas" helperText="Valdymo įmonės juridinio asmens kodas">
                          <InputField
                            value={settings.buildingInfo.companyCode}
                            onChange={(v) => updateSettings('buildingInfo', { companyCode: v })}
                            placeholder="pvz. 123456789"
                          />
                        </FormField>
                        <FormField label="Kontaktinis asmuo" helperText="Atsakingas asmuo su kuriuo bendraujama">
                          <InputField
                            value={settings.contactInfo.contactPerson}
                            onChange={(v) => updateSettings('contactInfo', { contactPerson: v })}
                            placeholder="Vardas Pavardė"
                          />
                        </FormField>
                        <FormField label="Telefonas" helperText="Įmonės kontaktinis telefono numeris">
                          <InputField
                            type="tel"
                            value={settings.contactInfo.companyPhone}
                            onChange={(v) => updateSettings('contactInfo', { companyPhone: v })}
                            placeholder="+370..."
                          />
                        </FormField>
                        <FormField label="El. paštas" className="col-span-2" helperText="Įmonės el. paštas korespondencijai">
                          <InputField
                            type="email"
                            value={settings.contactInfo.companyEmail}
                            onChange={(v) => updateSettings('contactInfo', { companyEmail: v })}
                            placeholder="info@imone.lt"
                          />
                        </FormField>
                      </div>
                      {validationErrors.valdymoImone ? (
                        <p className="text-[10px] text-red-500 font-medium flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{validationErrors.valdymoImone}</p>
                      ) : (
                        <p className="text-[9px] text-gray-400 leading-tight">Užpildykite bent telefoną arba el. paštą, kad valdymo įmonės kontaktai būtų rodomi nuomininkams.</p>
                      )}
                    </div>
                  </Card>

                  {/* Avariniai / papildomi kontaktai */}
                  <Card title="Papildomi kontaktai" icon={<AlertTriangle className="w-4 h-4 text-amber-500" />}>
                    <div className="space-y-3">
                      {/* Contact rows */}
                      {(settings.contactInfo.customContacts || []).length > 0 ? (
                        <div className="space-y-2">
                          {/* Header */}
                          <div className="grid grid-cols-[1fr_1fr_1fr_32px] gap-2 px-1">
                            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.08em]">Pavadinimas</span>
                            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.08em]">Kontaktas</span>
                            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.08em]">Komentaras</span>
                            <span />
                          </div>
                          {/* Rows */}
                          {(settings.contactInfo.customContacts || []).map((contact: { id: string; title: string; content: string; comment: string }, index: number) => (
                            <div key={contact.id} className="grid grid-cols-[1fr_1fr_1fr_32px] gap-2 items-start">
                              <InputField
                                value={contact.title}
                                onChange={(v) => {
                                  const updated = [...(settings.contactInfo.customContacts || [])];
                                  updated[index] = { ...updated[index], title: v };
                                  updateSettings('contactInfo', { customContacts: updated });
                                }}
                                placeholder="pvz. Santechnikas"
                              />
                              <InputField
                                value={contact.content}
                                onChange={(v) => {
                                  const updated = [...(settings.contactInfo.customContacts || [])];
                                  updated[index] = { ...updated[index], content: v };
                                  updateSettings('contactInfo', { customContacts: updated });
                                }}
                                placeholder="+370... / el. paštas"
                              />
                              <InputField
                                value={contact.comment}
                                onChange={(v) => {
                                  const updated = [...(settings.contactInfo.customContacts || [])];
                                  updated[index] = { ...updated[index], comment: v };
                                  updateSettings('contactInfo', { customContacts: updated });
                                }}
                                placeholder="Pastaba..."
                              />
                              <button
                                onClick={() => {
                                  const updated = (settings.contactInfo.customContacts || []).filter((_: any, i: number) => i !== index);
                                  updateSettings('contactInfo', { customContacts: updated });
                                }}
                                className="mt-1.5 w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-gray-400 text-center py-3">Nėra pridėtų kontaktų</p>
                      )}

                      {/* Add button */}
                      <button
                        onClick={() => {
                          const newContact = { id: crypto.randomUUID(), title: '', content: '', comment: '' };
                          updateSettings('contactInfo', {
                            customContacts: [...(settings.contactInfo.customContacts || []), newContact]
                          });
                        }}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-semibold text-teal-600 bg-teal-50/60 hover:bg-teal-50 border border-teal-200/50 rounded-lg transition-colors active:scale-[0.98]"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Pridėti kontaktą
                      </button>

                      <p className="text-[9px] text-gray-400 leading-tight">Pridėkite avarinius, specialistų ar kitus svarbius kontaktus, kuriuos matys nuomininkai</p>
                    </div>
                  </Card>
                </div>
              )}

              {/* ─── TAB: FINANCIAL ─── */}
              {activeTab === 'financial' && (
                <div className="space-y-4">
                  {/* Copy from another address */}
                  {allAddresses.length > 0 && (
                    <div className="relative">
                      <button
                        onClick={() => setCopyDropdownTab(copyDropdownTab === 'financial' ? null : 'financial')}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-gray-500 hover:text-teal-600 bg-gray-50 hover:bg-teal-50/60 border border-gray-200/60 rounded-lg transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Kopijuoti iš kito adreso
                        <ChevronDown className={`w-3 h-3 transition-transform ${copyDropdownTab === 'financial' ? 'rotate-180' : ''}`} />
                      </button>
                      {copyDropdownTab === 'financial' && (
                        <div className="absolute z-20 mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-lg py-1">
                          {allAddresses.map(a => (
                            <button
                              key={a.id}
                              onClick={() => copySettingsFrom(a.id, 'financial')}
                              className="w-full text-left px-3 py-2 text-[12px] text-gray-700 hover:bg-teal-50 hover:text-teal-700 transition-colors"
                            >
                              {a.full_address}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <Card title="Mokėjimo nustatymai" icon={<CreditCard className="w-4 h-4 text-[#2F8481]" />}>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField label="Mokėjimo diena" helperText="Kiekvieną mėnesį iki šios dienos nuomininkas turi sumokėti nuomą">
                        <InputField
                          type="number"
                          value={settings.financialSettings.paymentDay}
                          onChange={(v) => updateSettings('financialSettings', { paymentDay: parseInt(v) || 15 })}
                        />
                      </FormField>
                      <FormField label="Baudos pradžia" helperText="Po kiek dienų nuo mokėjimo termino pradedama skaičiuoti bauda">
                        <InputField
                          type="number"
                          value={settings.financialSettings.gracePeriodDays}
                          onChange={(v) => updateSettings('financialSettings', { gracePeriodDays: parseInt(v) || 0 })}
                          suffix="d."
                        />
                      </FormField>
                      <FormField label="Vėlavimo bauda" helperText="Suma eurais, kuri pridedama už kiekvieną pavėluotą dieną">
                        <InputField
                          type="number"
                          value={settings.financialSettings.latePaymentFee}
                          onChange={(v) => updateSettings('financialSettings', { latePaymentFee: parseFloat(v) || 0 })}
                          suffix="€"
                        />
                      </FormField>
                      <FormField label="Depozito politika" helperText="Kiek mėnesių nuomos sumos sudaro depozitas">
                        <SelectField
                          value={settings.financialSettings.depositPolicy || '1month'}
                          onChange={(v) => updateSettings('financialSettings', { depositPolicy: v })}
                          options={[
                            { value: '1month', label: '1 mėn. nuoma' },
                            { value: '2months', label: '2 mėn. nuoma' },
                            { value: 'custom', label: 'Individuali suma' },
                          ]}
                        />
                      </FormField>
                      <FormField label="Numatytasis depozitas" helperText="Standartinė depozito suma naujiems nuomininkams">
                        <InputField
                          type="number"
                          value={settings.financialSettings.defaultDeposit}
                          onChange={(v) => updateSettings('financialSettings', { defaultDeposit: parseFloat(v) || 0 })}
                          suffix="€"
                        />
                      </FormField>
                      <FormField label="Sutarties trukmė" helperText="Standartinė nuomos sutarties trukmė mėnesiais">
                        <InputField
                          type="number"
                          value={settings.financialSettings.defaultContractDuration}
                          onChange={(v) => updateSettings('financialSettings', { defaultContractDuration: parseInt(v) || 12 })}
                          suffix="mėn."
                        />
                      </FormField>
                    </div>
                  </Card>

                  <Card title="Gavėjo duomenys" icon={<Wallet className="w-4 h-4 text-[#2F8481]" />}>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField label="Banko sąskaita (IBAN)" className="col-span-2" helperText="Sąskaita, į kurią nuomininkai perves mokėjimus">
                        <InputField
                          value={settings.financialSettings.bankAccount || ''}
                          onChange={(v) => updateSettings('financialSettings', { bankAccount: v })}
                          placeholder="LT00 0000 0000 0000 0000"
                        />
                      </FormField>
                      <FormField label="Gavėjo vardas" helperText="Vardas arba įmonės pavadinimas, kuris rodomas sąskaitoje">
                        <InputField
                          value={settings.financialSettings.recipientName || ''}
                          onChange={(v) => updateSettings('financialSettings', { recipientName: v })}
                          placeholder="Vardas Pavardė arba įmonė"
                        />
                      </FormField>
                      <FormField label="Mokėjimo paskirtis" helperText="Tekstas, kuris bus įrašytas kaip mokėjimo paskirtis">
                        <InputField
                          value={settings.financialSettings.paymentPurposeTemplate || ''}
                          onChange={(v) => updateSettings('financialSettings', { paymentPurposeTemplate: v })}
                          placeholder="Nuomos mokestis už {period}"
                        />
                      </FormField>
                    </div>
                  </Card>

                  {/* Auto-renewal toggle */}
                  <ToggleRow
                    label="Automatinis sutarties atnaujinimas"
                    description="Pasibaigus sutarties terminui, automatiškai pratęsti tokiomis pačiomis sąlygomis"
                    checked={settings.financialSettings.autoRenewalEnabled}
                    onChange={(v) => updateSettings('financialSettings', { autoRenewalEnabled: v })}
                  />
                </div>
              )}

              {/* ─── TAB: NOTIFICATIONS ─── */}
              {activeTab === 'notifications' && (
                <div className="space-y-3">
                  <ToggleRow
                    label="Mokėjimo priminimai"
                    description="Automatiškai priminti nuomininkams apie artėjantį mokėjimą"
                    checked={settings.notificationSettings.rentReminderEnabled}
                    onChange={(v) => updateSettings('notificationSettings', { rentReminderEnabled: v })}
                  >
                    <FormField label="Priminti prieš">
                      <div className="flex items-center gap-2">
                        <InputField
                          type="number"
                          value={settings.notificationSettings.rentReminderDays}
                          onChange={(v) => updateSettings('notificationSettings', { rentReminderDays: parseInt(v) || 0 })}
                        />
                        <span className="text-sm text-gray-500 whitespace-nowrap">dienų iki mokėjimo</span>
                      </div>
                    </FormField>
                  </ToggleRow>

                  <ToggleRow
                    label="Vėlavimo pranešimai"
                    description="Pranešti kai mokėjimas vėluoja"
                    checked={settings.notificationSettings.latePaymentEnabled}
                    onChange={(v) => updateSettings('notificationSettings', { latePaymentEnabled: v })}
                  />

                  <ToggleRow
                    label="Skaitliukų priminimas"
                    description="Priminti nuomininkams pateikti skaitliukų rodmenis"
                    checked={settings.notificationSettings.meterReminderEnabled}
                    onChange={(v) => updateSettings('notificationSettings', { meterReminderEnabled: v })}
                  >
                    <FormField label="Rodmenų pateikimo laikotarpis">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-gray-500 whitespace-nowrap">Nuo</span>
                        <InputField
                          type="number"
                          value={settings.notificationSettings.meterReadingStartDay ?? 20}
                          onChange={(v) => {
                            const day = Math.min(28, Math.max(1, parseInt(v) || 20));
                            updateSettings('notificationSettings', { meterReadingStartDay: day });
                          }}
                        />
                        <span className="text-[11px] text-gray-500 whitespace-nowrap">iki</span>
                        <InputField
                          type="number"
                          value={settings.notificationSettings.meterReadingEndDay ?? 29}
                          onChange={(v) => {
                            const day = Math.min(31, Math.max(1, parseInt(v) || 29));
                            updateSettings('notificationSettings', { meterReadingEndDay: day });
                          }}
                        />
                        <span className="text-[11px] text-gray-500 whitespace-nowrap">mėn. d.</span>
                      </div>
                    </FormField>
                    <FormField label="Priminti prieš">
                      <div className="flex items-center gap-2">
                        <InputField
                          type="number"
                          value={settings.notificationSettings.meterReminderDays}
                          onChange={(v) => updateSettings('notificationSettings', { meterReminderDays: parseInt(v) || 0 })}
                        />
                        <span className="text-sm text-gray-500 whitespace-nowrap">dienų iki termino</span>
                      </div>
                    </FormField>
                  </ToggleRow>

                  <ToggleRow
                    label="Sutarties pabaigos pranešimas"
                    description="Pranešti prieš nustatytą laiką iki sutarties pabaigos"
                    checked={settings.notificationSettings.contractExpiryEnabled}
                    onChange={(v) => updateSettings('notificationSettings', { contractExpiryEnabled: v })}
                  >
                    <FormField label="Pranešti prieš">
                      <div className="flex items-center gap-2">
                        <InputField
                          type="number"
                          value={settings.notificationSettings.contractExpiryReminderDays}
                          onChange={(v) => updateSettings('notificationSettings', { contractExpiryReminderDays: parseInt(v) || 0 })}
                        />
                        <span className="text-sm text-gray-500 whitespace-nowrap">dienų</span>
                      </div>
                    </FormField>
                  </ToggleRow>

                  <ToggleRow
                    label="Techninės priežiūros pranešimai"
                    description="Gauti pranešimus apie priežiūros užklausas"
                    checked={settings.notificationSettings.maintenanceNotifications}
                    onChange={(v) => updateSettings('notificationSettings', { maintenanceNotifications: v })}
                  />

                  <ToggleRow
                    label="Nauji dokumentai"
                    description="Pranešti kai įkeliami nauji dokumentai"
                    checked={settings.notificationSettings.newDocumentNotifications}
                    onChange={(v) => updateSettings('notificationSettings', { newDocumentNotifications: v })}
                  />
                </div>
              )}

              {/* ─── TAB: COMMUNAL ─── */}
              {activeTab === 'communal' && (
                <div className="space-y-4">
                  <Card title="Skaitliukų valdymas" icon={<Gauge className="w-4 h-4 text-[#2F8481]" />}>
                    <MetersTable
                      meters={addressMeters}
                      onMetersChange={handleMetersChange}
                    />
                  </Card>

                  {/* Tenant history retention */}
                  <Card title="Nuomininkų istorija" icon={<Users className="w-4 h-4 text-[#2F8481]" />}>
                    <div className="space-y-3">
                      <FormField label="Istorijos saugojimo laikotarpis" helperText="Po kiek mėnesių automatiškai pašalinti senus nuomininkų įrašus">
                        <div className="flex items-center gap-2">
                          <SelectField
                            value={String(settings.communalConfig.historyRetentionMonths || 18)}
                            onChange={(v) => updateSettings('communalConfig', { historyRetentionMonths: parseInt(v) || 18 })}
                            options={[
                              { value: '3', label: '3 mėn.' },
                              { value: '6', label: '6 mėn.' },
                              { value: '12', label: '1 metai' },
                              { value: '18', label: '18 mėn.' },
                            ]}
                          />
                        </div>
                      </FormField>
                      <p className="text-[9px] text-gray-400 leading-tight">Nuomininkų istorija saugoma kiekvienam butui. Senesnė istorija bus automatiškai ištrinta pagal pasirinktą laikotarpį.</p>
                    </div>
                  </Card>
                </div>
              )}
            </>
          )}
        </div>

        {/* ═══ STICKY FOOTER ═══ */}
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
    </div >
  );
};

export default AddressSettingsModal;
