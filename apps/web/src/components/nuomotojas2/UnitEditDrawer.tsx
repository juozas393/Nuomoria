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
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
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
                    className={`w-full px-3 py-2.5 border rounded-xl focus:outline-none focus:ring-2 transition-all ${ANIMATION.hover} ${error
                        ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                        : 'border-gray-200 focus:ring-teal-500/20 focus:border-teal-500'
                        } ${disabled ? 'bg-gray-50 text-gray-500' : 'bg-white'
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
        <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
        <div className="relative">
            <select
                value={value ?? ''}
                onChange={(e) => onChange(e.target.value)}
                className={`w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white appearance-none cursor-pointer transition-all ${ANIMATION.hover}`}
            >
                {placeholder && <option value="">{placeholder}</option>}
                {options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
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
            <span className="text-sm font-medium text-gray-700">{label}</span>
            {description && <p className="text-xs text-gray-500">{description}</p>}
        </div>
        <button
            type="button"
            onClick={() => onChange(!checked)}
            className={`relative w-11 h-6 rounded-full transition-colors ${ANIMATION.hover} ${checked ? 'bg-teal-500' : 'bg-gray-200'
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
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-3 border-b border-gray-50 flex items-center gap-2">
            <div className="w-7 h-7 bg-gray-50 rounded-lg flex items-center justify-center text-gray-600">
                {icon}
            </div>
            <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
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
                type: formData.type,
                rooms: formData.rooms ? parseInt(formData.rooms) : undefined,
                area: formData.area ? parseFloat(formData.area) : undefined,
                floor: formData.floor ? parseInt(formData.floor) : undefined,
                floors_total: formData.floors_total ? parseInt(formData.floors_total) : undefined,
                status: formData.status,
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
                className={`absolute right-0 top-0 h-full w-[520px] max-w-[95vw] bg-gray-50 shadow-2xl flex flex-col will-change-transform transition-transform duration-200 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full'
                    }`}
                style={{
                    backgroundImage: `url('/images/FormsBackground.png')`,
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
                <div className="bg-white border-b border-gray-100">
                    <div className="flex items-center justify-between px-5 py-3">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-sm">
                                <Home className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-base font-semibold text-gray-900">Būsto nustatymai</h2>
                                <p className="text-xs text-gray-500">{property.address}</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
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
                                    className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${ANIMATION.hover} ${isActive
                                        ? 'bg-teal-50 text-teal-700'
                                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
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
                                        onChange={(v) => updateField('parking_type', v)}
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
                                <SelectField
                                    label="Dabartinė būsena"
                                    value={formData.status}
                                    onChange={(v) => updateField('status', v)}
                                    options={[
                                        { value: 'vacant', label: 'Laisvas' },
                                        { value: 'occupied', label: 'Išnuomotas' },
                                        { value: 'reserved', label: 'Rezervuotas' },
                                        { value: 'maintenance', label: 'Remontas' },
                                    ]}
                                />
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
                                    className={`w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none transition-all ${ANIMATION.hover}`}
                                />
                                <p className="text-xs text-gray-400 mt-2">Šios pastabos matomos tik jums, ne nuomininkams</p>
                            </SectionCard>
                        </div>
                    )}
                </div>

                {/* Footer with save states */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
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
                            className={`px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all ${ANIMATION.hover}`}
                        >
                            Atšaukti
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving || !isDirty || hasErrors}
                            title={hasErrors ? 'Ištaisykite klaidas prieš išsaugant' : !isDirty ? 'Nėra pakeitimų' : undefined}
                            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg transition-all ${ANIMATION.hover} active:scale-[0.98] ${isSaving || !isDirty || hasErrors
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
