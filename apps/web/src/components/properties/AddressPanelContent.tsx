import React, { useState, useEffect } from 'react';
import {
    Building2,
    Users,
    Gauge,
    Bell,
    ChevronRight,
    Pencil,
    Check,
    Save,
    LayoutDashboard
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getAddressIdByAddress, getAddressSettings } from '../../lib/communalMetersApi';
import { MetersTable } from '../properties/MetersTable';
import type { DistributionMethod } from '../../constants/meterDistribution';

// ============================================================
// TYPES
// ============================================================
interface AddressPanelContentProps {
    addressId: string;
    address: string;
    activeSection: string;
}

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
    is_custom: boolean;
    is_inherited: boolean;
    collectionMode: 'landlord_only' | 'tenant_photo';
    landlordReadingEnabled: boolean;
    tenantPhotoEnabled: boolean;
}

const DEFAULT_SETTINGS = {
    buildingInfo: { totalApartments: 0, totalFloors: 1, yearBuilt: null as number | null, buildingType: 'Daugiabutis' },
    contactInfo: { chairmanName: '', chairmanPhone: '', chairmanEmail: '', companyName: '', contactPerson: '', companyPhone: '', companyEmail: '' },
    notificationSettings: { rentReminderDays: 3, meterReminderDays: 5, autoReminders: true }
};

// ============================================================
// COMPONENT
// ============================================================
export const AddressPanelContent: React.FC<AddressPanelContentProps> = ({
    addressId,
    address,
    activeSection
}) => {
    const [isLoading, setIsLoading] = useState(true);
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    const [addressMeters, setAddressMeters] = useState<LocalMeter[]>([]);
    const [editMode, setEditMode] = useState<Record<string, boolean>>({});
    const [isDirty, setIsDirty] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Load data
    useEffect(() => {
        const loadData = async () => {
            if (!addressId) return;
            setIsLoading(true);

            try {
                // Load settings
                const dbSettings = await getAddressSettings(addressId);
                if (dbSettings) {
                    // Transform API response to match our type expectations
                    const buildingInfo: any = dbSettings.building_info || {};
                    const contactInfo: any = dbSettings.contact_info || {};
                    const notificationSettings: any = dbSettings.notification_settings || {};

                    setSettings({
                        buildingInfo: {
                            totalApartments: buildingInfo.totalApartments ?? DEFAULT_SETTINGS.buildingInfo.totalApartments,
                            totalFloors: buildingInfo.totalFloors ?? DEFAULT_SETTINGS.buildingInfo.totalFloors,
                            yearBuilt: buildingInfo.yearBuilt ?? null,
                            buildingType: buildingInfo.buildingType ?? DEFAULT_SETTINGS.buildingInfo.buildingType
                        },
                        contactInfo: {
                            chairmanName: contactInfo.chairmanName ?? contactInfo.managerName ?? '',
                            chairmanPhone: contactInfo.chairmanPhone ?? contactInfo.managerPhone ?? '',
                            chairmanEmail: contactInfo.chairmanEmail ?? contactInfo.managerEmail ?? '',
                            companyName: contactInfo.companyName ?? '',
                            contactPerson: contactInfo.contactPerson ?? '',
                            companyPhone: contactInfo.companyPhone ?? '',
                            companyEmail: contactInfo.companyEmail ?? ''
                        },
                        notificationSettings: {
                            rentReminderDays: notificationSettings.rentReminderDays ?? DEFAULT_SETTINGS.notificationSettings.rentReminderDays,
                            meterReminderDays: notificationSettings.meterReminderDays ?? DEFAULT_SETTINGS.notificationSettings.meterReminderDays,
                            autoReminders: notificationSettings.autoReminders ?? notificationSettings.maintenanceNotifications ?? true
                        }
                    });
                }

                // Load meters
                const { data: meters } = await supabase
                    .from('address_meters')
                    .select('*')
                    .eq('address_id', addressId)
                    .eq('is_active', true);

                if (meters) {
                    setAddressMeters(meters.map(m => ({
                        id: m.id,
                        name: m.name,
                        type: m.type,
                        unit: m.unit,
                        price_per_unit: m.price_per_unit || 0,
                        fixed_price: m.fixed_price,
                        distribution_method: m.distribution_method,
                        description: m.description || '',
                        is_active: m.is_active,
                        requires_photo: m.requires_photo || false,
                        is_custom: false,
                        is_inherited: false,
                        collectionMode: m.collection_mode || 'landlord_only',
                        landlordReadingEnabled: m.landlord_reading_enabled ?? true,
                        tenantPhotoEnabled: m.tenant_photo_enabled ?? false
                    })));
                }
            } catch (error) {
                console.error('Error loading address data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [addressId]);

    const toggleEditMode = (section: string) => {
        setEditMode(prev => ({ ...prev, [section]: !prev[section] }));
        if (editMode[section]) {
            setIsDirty(true);
        }
    };

    const updateSettings = (section: keyof typeof settings, updates: any) => {
        setSettings(prev => ({
            ...prev,
            [section]: { ...prev[section], ...updates }
        }));
        setIsDirty(true);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2F8481]" />
            </div>
        );
    }

    // ============================================================
    // RENDER SECTIONS
    // ============================================================

    // Overview Section
    if (activeSection === 'overview') {
        return (
            <div className="p-4 space-y-4">
                <h3 className="text-sm font-bold text-gray-900">Trumpa apžvalga</h3>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded-xl p-3">
                        <div className="text-2xl font-bold text-[#2F8481]">{settings.buildingInfo.totalApartments}</div>
                        <div className="text-xs text-gray-500">Butai</div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                        <div className="text-2xl font-bold text-[#2F8481]">{addressMeters.length}</div>
                        <div className="text-xs text-gray-500">Skaitliukai</div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                        <div className="text-2xl font-bold text-[#2F8481]">{settings.buildingInfo.totalFloors}</div>
                        <div className="text-xs text-gray-500">Aukštai</div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                        <div className="text-2xl font-bold text-[#2F8481]">{settings.buildingInfo.yearBuilt || '-'}</div>
                        <div className="text-xs text-gray-500">Statybos metai</div>
                    </div>
                </div>

                {/* Quick Info */}
                {settings.contactInfo.chairmanName && (
                    <div className="bg-blue-50 rounded-xl p-3">
                        <div className="text-xs text-blue-600 font-medium mb-1">Pirmininkas</div>
                        <div className="text-sm font-semibold text-gray-900">{settings.contactInfo.chairmanName}</div>
                        {settings.contactInfo.chairmanPhone && (
                            <div className="text-xs text-gray-500">{settings.contactInfo.chairmanPhone}</div>
                        )}
                    </div>
                )}
            </div>
        );
    }

    // Building Section
    if (activeSection === 'building') {
        return (
            <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-900">Pastato informacija</h3>
                    <button
                        onClick={() => toggleEditMode('building')}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${editMode.building ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        {editMode.building ? <Check className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
                        {editMode.building ? 'Baigti' : 'Redaguoti'}
                    </button>
                </div>

                <div className="space-y-3">
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Butų skaičius</label>
                        {editMode.building ? (
                            <input
                                type="number"
                                value={settings.buildingInfo.totalApartments}
                                onChange={(e) => updateSettings('buildingInfo', { totalApartments: parseInt(e.target.value) || 0 })}
                                className="w-full px-3 py-2 border rounded-lg text-sm"
                            />
                        ) : (
                            <div className="text-sm font-medium">{settings.buildingInfo.totalApartments}</div>
                        )}
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Aukštų skaičius</label>
                        {editMode.building ? (
                            <input
                                type="number"
                                value={settings.buildingInfo.totalFloors}
                                onChange={(e) => updateSettings('buildingInfo', { totalFloors: parseInt(e.target.value) || 1 })}
                                className="w-full px-3 py-2 border rounded-lg text-sm"
                            />
                        ) : (
                            <div className="text-sm font-medium">{settings.buildingInfo.totalFloors}</div>
                        )}
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Statybos metai</label>
                        {editMode.building ? (
                            <input
                                type="number"
                                value={settings.buildingInfo.yearBuilt || ''}
                                onChange={(e) => updateSettings('buildingInfo', { yearBuilt: parseInt(e.target.value) || null })}
                                className="w-full px-3 py-2 border rounded-lg text-sm"
                                placeholder="pvz., 1985"
                            />
                        ) : (
                            <div className="text-sm font-medium">{settings.buildingInfo.yearBuilt || '-'}</div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Contacts Section
    if (activeSection === 'contacts') {
        return (
            <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-900">Kontaktai</h3>
                    <button
                        onClick={() => toggleEditMode('contacts')}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${editMode.contacts ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        {editMode.contacts ? <Check className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
                        {editMode.contacts ? 'Baigti' : 'Redaguoti'}
                    </button>
                </div>

                <div className="space-y-3">
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Pirmininko vardas</label>
                        {editMode.contacts ? (
                            <input
                                type="text"
                                value={settings.contactInfo.chairmanName}
                                onChange={(e) => updateSettings('contactInfo', { chairmanName: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg text-sm"
                            />
                        ) : (
                            <div className="text-sm font-medium">{settings.contactInfo.chairmanName || '-'}</div>
                        )}
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Telefono nr.</label>
                        {editMode.contacts ? (
                            <input
                                type="tel"
                                value={settings.contactInfo.chairmanPhone}
                                onChange={(e) => updateSettings('contactInfo', { chairmanPhone: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg text-sm"
                            />
                        ) : (
                            <div className="text-sm font-medium">{settings.contactInfo.chairmanPhone || '-'}</div>
                        )}
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">El. paštas</label>
                        {editMode.contacts ? (
                            <input
                                type="email"
                                value={settings.contactInfo.chairmanEmail}
                                onChange={(e) => updateSettings('contactInfo', { chairmanEmail: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg text-sm"
                            />
                        ) : (
                            <div className="text-sm font-medium">{settings.contactInfo.chairmanEmail || '-'}</div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Meters Section
    if (activeSection === 'meters') {
        return (
            <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-900">Skaitliukai ({addressMeters.length})</h3>
                    <button className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#2F8481] text-white rounded-lg text-xs font-medium hover:bg-[#297a77] transition-colors">
                        + Pridėti
                    </button>
                </div>

                {addressMeters.length === 0 ? (
                    <div className="text-center py-8">
                        <Gauge className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm text-gray-500">Nėra pridėtų skaitliukų</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {addressMeters.map(meter => (
                            <div key={meter.id} className="bg-gray-50 rounded-xl p-3">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-medium text-gray-900">{meter.name}</span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${meter.type === 'individual' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                                        }`}>
                                        {meter.type === 'individual' ? 'Individualus' : 'Bendras'}
                                    </span>
                                </div>
                                <div className="text-xs text-gray-500">
                                    {meter.price_per_unit} €/{meter.unit}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // Notifications Section
    if (activeSection === 'notifications') {
        return (
            <div className="p-4 space-y-4">
                <h3 className="text-sm font-bold text-gray-900">Pranešimų nustatymai</h3>

                <div className="space-y-3">
                    <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                        <div>
                            <div className="text-sm font-medium text-gray-900">Nuomos priminimas</div>
                            <div className="text-xs text-gray-500">{settings.notificationSettings.rentReminderDays} d. prieš</div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                        <div>
                            <div className="text-sm font-medium text-gray-900">Skaitliukų priminimas</div>
                            <div className="text-xs text-gray-500">{settings.notificationSettings.meterReminderDays} d. prieš</div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                        <div>
                            <div className="text-sm font-medium text-gray-900">Automatiniai priminimai</div>
                            <div className="text-xs text-gray-500">{settings.notificationSettings.autoReminders ? 'Įjungta' : 'Išjungta'}</div>
                        </div>
                        <div className={`w-10 h-6 rounded-full ${settings.notificationSettings.autoReminders ? 'bg-[#2F8481]' : 'bg-gray-300'} relative transition-colors`}>
                            <div className={`absolute w-4 h-4 bg-white rounded-full top-1 transition-all ${settings.notificationSettings.autoReminders ? 'right-1' : 'left-1'}`} />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return null;
};

export default AddressPanelContent;
