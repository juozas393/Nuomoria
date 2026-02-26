import React, { useState, useCallback, useEffect, useRef, memo } from 'react';
import { X, Home, Settings, Save, ChevronDown, Check, AlertCircle, Sparkles, Sliders, FileText, Euro } from 'lucide-react';
import { AmenitiesSection } from './AmenitiesSection';
import { setPropertyAmenities } from '../../lib/amenitiesApi';

// ============================================================================
// ANIMATION CONSTANTS
// ============================================================================
const ANIMATION = {
    hover: 'duration-150 ease-out',
    drawer: 'duration-200 ease-out',
} as const;

// ============================================================================
// TYPES
// ============================================================================
interface ExtendedPropertyInfo {
    id: string;
    address?: string;
    apartment_number?: string;
    rooms?: number;
    area?: number;
    floor?: number;
    floors_total?: number;
    type?: string;
    property_type?: string;
    status?: string;
    under_maintenance?: boolean;
    rent?: number;
    deposit_amount?: number;
    extended_details?: {
        amenities?: string[];
        heating_type?: 'centrinis' | 'dujinis' | 'elektra' | 'grindinis' | 'kita';
        energy_class?: 'A++' | 'A+' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
        furnished?: 'full' | 'partial' | 'none';
        parking_type?: 'street' | 'yard' | 'underground' | 'none';
        parking_spots?: number;
        balcony?: boolean;
        storage?: boolean;
        bathrooms?: number;
        bedrooms?: number;
        min_term_months?: number;
        pets_allowed?: boolean;
        pets_deposit?: number;
        smoking_allowed?: boolean;
        utilities_paid_by?: 'tenant' | 'landlord' | 'mixed';
        payment_due_day?: number;
        notes_internal?: string;
    };
}

interface UnitEditDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    property: ExtendedPropertyInfo;
    onSave: (updates: Partial<ExtendedPropertyInfo>) => Promise<void>;
}

// ============================================================================
// FIELD COMPONENTS
// ============================================================================
interface InputFieldProps {
    label: string;
    value: string | number | undefined;
    onChange: (value: string) => void;
    type?: 'text' | 'number';
    placeholder?: string;
    suffix?: string;
    disabled?: boolean;
    error?: string;
    min?: number;
    max?: number;
    required?: boolean;
    helperText?: string;
}

const InputField = memo<InputFieldProps>(({
    label, value, onChange, type = 'text', placeholder, suffix, disabled,
    error, min, max, required, helperText
}) => {
    const handleWheel = useCallback((e: React.WheelEvent) => {
        if (type === 'number') {
            (e.target as HTMLInputElement).blur();
        }
    }, [type]);

    return (
        <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
                {label}
                {required && <span className="text-red-400 ml-1">*</span>}
            </label>
            <div className="relative">
                <input
                    type={type}
                    inputMode={type === 'number' ? 'numeric' : undefined}
                    value={value ?? ''}
                    onChange={(e) => onChange(e.target.value)}
                    onWheel={handleWheel}
                    placeholder={placeholder}
                    disabled={disabled}
                    min={min}
                    max={max}
                    aria-invalid={!!error}
                    aria-describedby={error ? `${label}-error` : helperText ? `${label}-helper` : undefined}
                    className={`w-full px-3 py-2.5 border rounded-xl focus:outline-none focus:ring-2 transition-colors ${ANIMATION.hover} ${error
                        ? 'border-red-500/50 focus:ring-red-500/20 focus:border-red-500 bg-red-900/10 text-white placeholder-red-300'
                        : 'border-white/10 focus:ring-teal-500/20 focus:border-teal-500 bg-black/20 text-white placeholder-gray-500 hover:border-white/20'
                        } ${disabled ? 'bg-white/5 text-gray-500' : ''
                        } ${suffix ? 'pr-12' : ''}`}
                />
                {suffix && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">{suffix}</span>
                )}
            </div>
            {error && (
                <p id={`${label}-error`} className="mt-1 text-xs text-red-500">{error}</p>
            )}
            {helperText && !error && (
                <p id={`${label}-helper`} className="mt-1 text-xs text-gray-400">{helperText}</p>
            )}
        </div>
    );
});
InputField.displayName = 'InputField';

interface SelectFieldProps {
    label: string;
    value: string | undefined;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
    placeholder?: string;
}

const SelectField = memo<SelectFieldProps>(({ label, value, onChange, options, placeholder }) => (
    <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">{label}</label>
        <div className="relative">
            <select
                value={value ?? ''}
                onChange={(e) => onChange(e.target.value)}
                className={`w-full px-3 py-2.5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-black/20 text-white appearance-none cursor-pointer transition-colors ${ANIMATION.hover} hover:border-white/20`}
            >
                {placeholder && <option value="" className="bg-gray-900">{placeholder}</option>}
                {options.map(opt => (
                    <option key={opt.value} value={opt.value} className="bg-gray-900 text-white">{opt.label}</option>
                ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
        </div>
    </div>
));
SelectField.displayName = 'SelectField';

interface ToggleFieldProps {
    label: string;
    description?: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}

const ToggleField = memo<ToggleFieldProps>(({ label, description, checked, onChange }) => (
    <div className="flex items-center justify-between py-2">
        <div>
            <span className="text-sm font-medium text-gray-300">{label}</span>
            {description && <p className="text-xs text-gray-500">{description}</p>}
        </div>
        <button
            type="button"
            onClick={() => onChange(!checked)}
            className={`relative w-11 h-6 rounded-full transition-colors ${ANIMATION.hover} ${checked ? 'bg-teal-600' : 'bg-white/10'
                }`}
        >
            <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${ANIMATION.hover} ${checked ? 'translate-x-5' : 'translate-x-0'
                    }`}
            />
        </button>
    </div>
));
ToggleField.displayName = 'ToggleField';

// ============================================================================
// MIN TERM PRESETS
// ============================================================================
const MIN_TERM_PRESETS = [
    { value: '3', label: '3 mėn.' },
    { value: '6', label: '6 mėn.' },
    { value: '12', label: '12 mėn.' },
    { value: 'custom', label: 'Kita...' },
];

// ============================================================================
// SECTION CARD - Matching main modal style
// ============================================================================
interface SectionCardProps {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
}

const SectionCard = memo<SectionCardProps>(({ title, icon, children }) => (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-sm backdrop-blur-sm">
        <div className="p-3 border-b border-white/5 flex items-center gap-2">
            <div className="w-7 h-7 bg-white/5 rounded-lg flex items-center justify-center text-gray-300">
                {icon}
            </div>
            <h3 className="text-sm font-semibold text-white">{title}</h3>
        </div>
        <div className="p-4">{children}</div>
    </div>
));
SectionCard.displayName = 'SectionCard';

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export const UnitEditDrawer: React.FC<UnitEditDrawerProps> = ({
    isOpen,
    onClose,
    property,
    onSave,
}) => {
    const [activeTab, setActiveTab] = useState<'property' | 'rental'>('property');
    const [isSaving, setIsSaving] = useState(false);
    // Toast state for notifications
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const drawerRef = useRef<HTMLDivElement>(null);

    // Form state
    const [formData, setFormData] = useState({
        type: property.type || property.property_type || 'apartment',
        rooms: property.rooms?.toString() || '',
        area: property.area?.toString() || '',
        floor: property.floor?.toString() || '',
        floors_total: property.floors_total?.toString() || '',
        status: property.status || 'vacant',
        under_maintenance: (property as any).under_maintenance ?? false,
        rent: property.rent?.toString() || '',
        deposit_amount: property.deposit_amount?.toString() || '',
        // Extended details
        bedrooms: property.extended_details?.bedrooms?.toString() || '',
        bathrooms: property.extended_details?.bathrooms?.toString() || '',
        balcony: property.extended_details?.balcony ?? false,
        storage: property.extended_details?.storage ?? false,
        parking_type: (property.extended_details?.parking_type || 'none') as 'none' | 'street' | 'yard' | 'underground',
        heating_type: property.extended_details?.heating_type || '',
        furnished: property.extended_details?.furnished || '',
        amenities: property.extended_details?.amenities || [],
        // Rules
        pets_allowed: property.extended_details?.pets_allowed ?? false,
        smoking_allowed: property.extended_details?.smoking_allowed ?? false,
        min_term_months: property.extended_details?.min_term_months?.toString() || '',
        payment_due_day: property.extended_details?.payment_due_day?.toString() || '',
        notes_internal: property.extended_details?.notes_internal || '',
    });

    // Reset form when property changes
    useEffect(() => {
        if (isOpen) {
            setFormData({
                type: property.type || property.property_type || 'apartment',
                rooms: property.rooms?.toString() || '',
                area: property.area?.toString() || '',
                floor: property.floor?.toString() || '',
                floors_total: property.floors_total?.toString() || '',
                status: property.status || 'vacant',
                under_maintenance: (property as any).under_maintenance ?? false,
                rent: property.rent?.toString() || '',
                deposit_amount: property.deposit_amount?.toString() || '',
                bedrooms: property.extended_details?.bedrooms?.toString() || '',
                bathrooms: property.extended_details?.bathrooms?.toString() || '',
                balcony: property.extended_details?.balcony ?? false,
                storage: property.extended_details?.storage ?? false,
                parking_type: (property.extended_details?.parking_type || 'none') as 'none' | 'street' | 'yard' | 'underground',
                heating_type: property.extended_details?.heating_type || '',
                furnished: property.extended_details?.furnished || '',
                amenities: property.extended_details?.amenities || [],
                pets_allowed: property.extended_details?.pets_allowed ?? false,
                smoking_allowed: property.extended_details?.smoking_allowed ?? false,
                min_term_months: property.extended_details?.min_term_months?.toString() || '',
                payment_due_day: property.extended_details?.payment_due_day?.toString() || '',
                notes_internal: property.extended_details?.notes_internal || '',
            });
            setActiveTab('property');
        }
    }, [isOpen, property]);

    // Escape key handler
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) onClose();
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    // Body scroll lock
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    // Validation
    const validation = React.useMemo(() => {
        const errors: Record<string, string> = {};

        // Required fields
        if (!formData.type) errors.type = 'Būtina pasirinkti tipą';

        // Rooms validation
        if (formData.rooms && parseInt(formData.rooms) < 1) {
            errors.rooms = 'Mažiausiai 1 kambarys';
        }

        // Area validation
        if (formData.area && parseFloat(formData.area) <= 0) {
            errors.area = 'Plotas turi būti didesnis už 0';
        }

        // Floor validation (only for apartments)
        if (formData.type === 'apartment' || formData.type === 'studio') {
            if (formData.floor && formData.floors_total) {
                const floor = parseInt(formData.floor);
                const total = parseInt(formData.floors_total);
                if (floor > total) {
                    errors.floor = 'Aukštas negali viršyti bendro aukštų skaičiaus';
                }
            }
            if (formData.floors_total && parseInt(formData.floors_total) < 1) {
                errors.floors_total = 'Mažiausiai 1 aukštas';
            }
        }

        // Payment day validation
        if (formData.payment_due_day) {
            const day = parseInt(formData.payment_due_day);
            if (day < 1 || day > 28) {
                errors.payment_due_day = 'Rekomenduojama 1-28 diena';
            }
        }

        return errors;
    }, [formData]);

    // Check if form has errors
    const hasErrors = Object.keys(validation).length > 0;

    // Tab-level error indicators
    const propertyTabHasErrors = ['type', 'rooms', 'area', 'floor', 'floors_total'].some(f => validation[f]);
    const rentalTabHasErrors = ['payment_due_day', 'min_term_months'].some(f => validation[f]);

    // Dirty state tracking
    const [initialFormData, setInitialFormData] = useState<typeof formData | null>(null);

    useEffect(() => {
        if (isOpen && !initialFormData) {
            setInitialFormData(formData);
        }
        if (!isOpen) {
            setInitialFormData(null);
        }
    }, [isOpen, formData, initialFormData]);

    const isDirty = React.useMemo(() => {
        if (!initialFormData) return false;
        return JSON.stringify(formData) !== JSON.stringify(initialFormData);
    }, [formData, initialFormData]);

    const updateField = useCallback(<K extends keyof typeof formData>(field: K, value: typeof formData[K]) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    }, []);

    // Handle amenities change from AmenitiesSection
    const handleAmenitiesChange = useCallback((keys: string[]) => {
        setFormData(prev => ({
            ...prev,
            amenities: keys
        }));
    }, []);

    // Toast handler
    const handleToast = useCallback((message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    }, []);

    const handleSave = useCallback(async () => {
        setIsSaving(true);
        try {
            await onSave({
                property_type: formData.type,
                rooms: formData.rooms ? parseInt(formData.rooms) : undefined,
                area: formData.area ? parseFloat(formData.area) : undefined,
                floor: formData.floor ? parseInt(formData.floor) : undefined,
                floors_total: formData.floors_total ? parseInt(formData.floors_total) : undefined,
                rent: formData.rent ? parseFloat(formData.rent) : undefined,
                deposit_amount: formData.deposit_amount ? parseFloat(formData.deposit_amount) : undefined,
                under_maintenance: formData.under_maintenance,
                extended_details: {
                    bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : undefined,
                    bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : undefined,
                    balcony: formData.balcony,
                    storage: formData.storage,
                    parking_type: formData.parking_type as any,
                    heating_type: formData.heating_type as any,
                    furnished: formData.furnished as any,
                    amenities: formData.amenities,
                    pets_allowed: formData.pets_allowed,
                    smoking_allowed: formData.smoking_allowed,
                    min_term_months: formData.min_term_months ? parseInt(formData.min_term_months) : undefined,
                    payment_due_day: formData.payment_due_day ? parseInt(formData.payment_due_day) : undefined,
                    notes_internal: formData.notes_internal || undefined,
                },
            });
            onClose();
        } catch (error) {
            console.error('Error saving property:', error);
        } finally {
            setIsSaving(false);
        }
    }, [formData, onSave, onClose]);

    if (!isOpen) return null;

    const tabs = [
        { id: 'property' as const, label: 'Būsto duomenys', icon: Home },
        { id: 'rental' as const, label: 'Nuomos sąlygos', icon: Settings },
    ];

    return (
        <div className="fixed inset-0 z-50">
            {/* Backdrop */}
            <div
                className={`absolute inset-0 bg-black/40 backdrop-blur-sm ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />

            {/* Drawer - matching main modal style */}
            <div
                ref={drawerRef}
                className={`absolute right-0 top-0 h-full w-[520px] max-w-[95vw] bg-[#0A0A0A] shadow-2xl flex flex-col will-change-transform transition-transform duration-200 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full'
                    }`}
                style={{
                    backgroundImage: `url('/images/modal_bg_dark.svg')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            >
                {/* Toast Notification */}
                {toast && (
                    <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg animate-in fade-in slide-in-from-top-2 duration-200 ${toast.type === 'success'
                        ? 'bg-teal-600 text-white'
                        : 'bg-red-600 text-white'
                        }`}>
                        {toast.type === 'success' ? (
                            <Check className="w-4 h-4" />
                        ) : (
                            <AlertCircle className="w-4 h-4" />
                        )}
                        <span className="text-sm font-medium">{toast.message}</span>
                    </div>
                )}

                {/* Header - matching main modal style */}
                <div className="bg-transparent border-b border-white/10">
                    <div className="flex items-center justify-between px-5 py-3">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-sm">
                                <Home className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-base font-semibold text-white">Būsto nustatymai</h2>
                                <p className="text-xs text-gray-400">{property.address}</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Tabs - pill style matching main modal */}
                    <div className="flex gap-1 px-5 pb-3">
                        {tabs.map(tab => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            const hasTabErrors = tab.id === 'property' ? propertyTabHasErrors : rentalTabHasErrors;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${ANIMATION.hover} ${isActive
                                        ? 'bg-teal-500/10 text-teal-400'
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    <Icon className="w-3.5 h-3.5" />
                                    {tab.label}
                                    {hasTabErrors && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Content - with padding for card sections */}
                <div className="flex-1 overflow-y-auto p-4">
                    {/* TAB 1: Būsto duomenys */}
                    {activeTab === 'property' && (
                        <div className="space-y-4">
                            {/* Pagrindinė info */}
                            <SectionCard title="Pagrindinė informacija" icon={<Home className="w-4 h-4" />}>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <InputField
                                            label="Kambariai"
                                            value={formData.rooms}
                                            onChange={(v) => updateField('rooms', v)}
                                            type="number"
                                            placeholder="2"
                                            min={1}
                                        />
                                        <InputField
                                            label="Plotas"
                                            value={formData.area}
                                            onChange={(v) => updateField('area', v)}
                                            type="number"
                                            placeholder="50"
                                            suffix="m²"
                                        />
                                    </div>

                                    <InputField
                                        label="Aukštas"
                                        value={formData.floor}
                                        onChange={(v) => updateField('floor', v)}
                                        type="number"
                                        placeholder="3"
                                        min={0}
                                        helperText="Kelintame aukšte yra būstas"
                                    />
                                    <div className="grid grid-cols-2 gap-4">
                                        <InputField
                                            label="Miegamieji"
                                            value={formData.bedrooms}
                                            onChange={(v) => updateField('bedrooms', v)}
                                            type="number"
                                            placeholder="1"
                                        />
                                        <InputField
                                            label="Vonios kambariai"
                                            value={formData.bathrooms}
                                            onChange={(v) => updateField('bathrooms', v)}
                                            type="number"
                                            placeholder="1"
                                        />
                                    </div>
                                </div>
                            </SectionCard>

                            {/* Ypatybės */}
                            <SectionCard title="Parametrai" icon={<Sliders className="w-4 h-4" />}>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <ToggleField
                                            label="Balkonas"
                                            checked={formData.balcony}
                                            onChange={(v) => updateField('balcony', v)}
                                        />
                                        <ToggleField
                                            label="Sandėliukas"
                                            checked={formData.storage}
                                            onChange={(v) => updateField('storage', v)}
                                        />
                                    </div>
                                    <SelectField
                                        label="Parkavimas"
                                        value={formData.parking_type}
                                        onChange={(v) => updateField('parking_type', v as 'none' | 'street' | 'yard' | 'underground')}
                                        options={[
                                            { value: 'none', label: 'Nėra' },
                                            { value: 'street', label: 'Gatvėje' },
                                            { value: 'yard', label: 'Kieme' },
                                            { value: 'underground', label: 'Požeminis' },
                                        ]}
                                    />
                                    <SelectField
                                        label="Šildymas"
                                        value={formData.heating_type}
                                        onChange={(v) => updateField('heating_type', v)}
                                        placeholder="Pasirinkite..."
                                        options={[
                                            { value: 'centrinis', label: 'Centrinis šildymas' },
                                            { value: 'dujinis', label: 'Dujinis' },
                                            { value: 'elektra', label: 'Elektrinis' },
                                            { value: 'grindinis', label: 'Grindinis šildymas' },
                                            { value: 'kita', label: 'Kita' },
                                        ]}
                                    />
                                    <SelectField
                                        label="Įrengimas"
                                        value={formData.furnished}
                                        onChange={(v) => updateField('furnished', v)}
                                        placeholder="Pasirinkite..."
                                        options={[
                                            { value: 'full', label: 'Pilnai įrengtas' },
                                            { value: 'partial', label: 'Dalinai įrengtas' },
                                            { value: 'none', label: 'Be baldų' },
                                        ]}
                                    />
                                </div>
                            </SectionCard>

                            {/* Patogumai */}
                            <SectionCard title="Patogumai" icon={<Sparkles className="w-4 h-4" />}>
                                <AmenitiesSection
                                    propertyId={property.id}
                                    initialAmenityKeys={formData.amenities}
                                    onAmenitiesChange={handleAmenitiesChange}
                                    onToast={handleToast}
                                />
                            </SectionCard>
                        </div>
                    )}

                    {/* TAB 2: Nuomos sąlygos */}
                    {activeTab === 'rental' && (
                        <div className="space-y-4">
                            {/* Būsena */}
                            <SectionCard title="Būsto būsena" icon={<Home className="w-4 h-4" />}>
                                <div>
                                    <label className="text-[10px] font-medium text-gray-400 mb-1 block">Dabartinė būsena</label>
                                    <div className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold ${property.status === 'occupied'
                                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                                        : 'bg-white/[0.06] text-gray-400 border border-white/[0.10]'
                                        }`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${property.status === 'occupied' ? 'bg-emerald-400' : 'bg-gray-500'}`} />
                                        {property.status === 'occupied' ? 'Išnuomotas' : 'Laisvas'}
                                    </div>
                                    <p className="text-[9px] text-gray-500 mt-1">Būsena nustatoma automatiškai pagal nuomininką</p>
                                </div>
                                {/* Under maintenance toggle */}
                                <div className="mt-2">
                                    <ToggleField
                                        label="Vyksta remontas"
                                        description="Nuosavybė šiuo metu remontuojama"
                                        checked={formData.under_maintenance}
                                        onChange={(v) => updateField('under_maintenance', v)}
                                    />
                                </div>
                            </SectionCard>

                            {/* Taisyklės */}
                            <SectionCard title="Nuomos taisyklės" icon={<FileText className="w-4 h-4" />}>
                                <div className="space-y-2">
                                    <ToggleField
                                        label="Leidžiami gyvūnai"
                                        description="Nuomininkai gali turėti augintinių"
                                        checked={formData.pets_allowed}
                                        onChange={(v) => updateField('pets_allowed', v)}
                                    />
                                    <ToggleField
                                        label="Leidžiama rūkyti"
                                        description="Rūkymas būste leidžiamas"
                                        checked={formData.smoking_allowed}
                                        onChange={(v) => updateField('smoking_allowed', v)}
                                    />
                                </div>
                            </SectionCard>

                            {/* Sąlygos */}
                            <SectionCard title="Mokėjimo sąlygos" icon={<Euro className="w-4 h-4" />}>
                                <div className="grid grid-cols-2 gap-4">
                                    <InputField
                                        label="Nuoma"
                                        value={formData.rent}
                                        onChange={(v) => updateField('rent', v)}
                                        type="number"
                                        placeholder="0"
                                        suffix="€/mėn."
                                    />
                                    <InputField
                                        label="Depozitas"
                                        value={formData.deposit_amount}
                                        onChange={(v) => updateField('deposit_amount', v)}
                                        type="number"
                                        placeholder="0"
                                        suffix="€"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4 mt-3">
                                    <InputField
                                        label="Min. nuomos terminas"
                                        value={formData.min_term_months}
                                        onChange={(v) => updateField('min_term_months', v)}
                                        type="number"
                                        placeholder="12"
                                        suffix="mėn."
                                    />
                                    <InputField
                                        label="Mokėjimo diena"
                                        value={formData.payment_due_day}
                                        onChange={(v) => updateField('payment_due_day', v)}
                                        type="number"
                                        placeholder="1"
                                    />
                                </div>
                            </SectionCard>

                            {/* Pastabos */}
                            <SectionCard title="Vidinės pastabos" icon={<FileText className="w-4 h-4" />}>
                                <textarea
                                    value={formData.notes_internal}
                                    onChange={(e) => updateField('notes_internal', e.target.value)}
                                    placeholder="Pastabos apie šį būstą (matomos tik jums)..."
                                    rows={4}
                                    className={`w-full px-3 py-2.5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-black/20 text-white placeholder-gray-500 resize-none transition-colors ${ANIMATION.hover} hover:border-white/20`}
                                />
                                <p className="text-xs text-gray-400 mt-2">Šios pastabos matomos tik jums, ne nuomininkams</p>
                            </SectionCard>
                        </div>
                    )}
                </div>

                {/* Footer with save states */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-[#0A0A0A]/80 backdrop-blur-sm">
                    <div className="text-xs text-gray-400">
                        {isDirty && (
                            <span className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                Yra neišsaugotų pakeitimų
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className={`px-4 py-2.5 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors ${ANIMATION.hover}`}
                        >
                            Atšaukti
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving || !isDirty || hasErrors}
                            title={hasErrors ? 'Ištaisykite klaidas prieš išsaugant' : !isDirty ? 'Nėra pakeitimų' : undefined}
                            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg transition-colors ${ANIMATION.hover} active:scale-[0.98] ${isSaving || !isDirty || hasErrors
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-teal-600 text-white hover:bg-teal-700'
                                }`}
                        >
                            <Save className="w-4 h-4" />
                            {isSaving ? 'Saugoma...' : 'Išsaugoti'}
                        </button>
                    </div>
                </div>
            </div>
        </div >
    );
};

export default UnitEditDrawer;
