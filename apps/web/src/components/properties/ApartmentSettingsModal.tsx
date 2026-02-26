import React, { useState, useCallback, useEffect, useMemo, memo } from 'react';
import LtDateInput from '../ui/LtDateInput';
import {
    X, Home, Save,
    ChevronDown, Calendar, Euro, Shield,
    Clock
} from 'lucide-react';
import { supabase } from '../../lib/supabase';


// ============================================================================
// TYPES
// ============================================================================
interface PropertyData {
    id: string;
    address?: string;
    address_id?: string;
    apartment_number?: string;
    tenant_name?: string;
    phone?: string;
    email?: string;
    rent?: number;
    area?: number;
    rooms?: number;
    floor?: number;
    floors_total?: number;
    type?: string;
    property_type?: string;
    status?: string;
    contract_start?: string;
    contract_end?: string;
    auto_renewal_enabled?: boolean;
    original_contract_duration_months?: number;
    deposit_amount?: number;
    deposit_paid_amount?: number;
    deposit_paid?: boolean;
    deposit_returned?: boolean;
    deposit_deductions?: number;
    deposit_status?: string;
    contract_status?: string;
    payment_status?: string;
    bedding_owner?: string;
    bedding_fee_paid?: boolean;
    cleaning_required?: boolean;
    cleaning_cost?: number;
    tenant_communication_status?: string;
    tenant_response?: string;
    planned_move_out_date?: string;
    notification_status?: string;
    extended_details?: {
        amenities?: string[];
        heating_type?: string;
        energy_class?: string;
        furnished?: string;
        parking_type?: string;
        parking_spots?: number;
        balcony?: boolean;
        storage?: boolean;
        bathrooms?: number;
        bedrooms?: number;
        min_term_months?: number;
        pets_allowed?: boolean;
        pets_deposit?: number;
        smoking_allowed?: boolean;
        utilities_paid_by?: string;
        payment_due_day?: number;
        notes_internal?: string;
        late_fee_amount?: number;
        late_fee_grace_days?: number;
    };
}

interface ApartmentSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    property: PropertyData;
    onSave: (updates: Partial<PropertyData>) => Promise<void>;
    embedded?: boolean;
}

// ============================================================================
// REUSABLE FIELD COMPONENTS (dark theme)
// ============================================================================
const InputField = memo<{
    label: string;
    value: string | number | undefined;
    onChange: (value: string) => void;
    type?: 'text' | 'number' | 'date';
    placeholder?: string;
    suffix?: string;
    prefix?: string;
    disabled?: boolean;
    error?: string;
    helperText?: string;
    min?: number;
    max?: number;
}>(({ label, value, onChange, type = 'text', placeholder, suffix, prefix, disabled, error, helperText, min, max }) => (
    <div>
        <label className="block text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-1.5">{label}</label>
        <div className="relative">
            {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-white/40">{prefix}</span>}
            {type === 'date' ? (
                <LtDateInput
                    value={String(value ?? '')}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled}
                    className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-colors duration-150 ${error ? 'border-red-400/50 focus:ring-red-500/20 focus:border-red-400'
                        : 'border-white/10 focus:ring-teal-500/30 focus:border-teal-500/50'
                        } ${disabled ? 'bg-white/5 text-white/30' : 'bg-white/5 text-white'}`}
                />
            ) : (
                <input
                    type={type}
                    inputMode={type === 'number' ? 'numeric' : undefined}
                    value={value ?? ''}
                    onChange={(e) => onChange(e.target.value)}
                    onWheel={(e) => type === 'number' && (e.target as HTMLInputElement).blur()}
                    placeholder={placeholder}
                    disabled={disabled}
                    min={min}
                    max={max}
                    className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-colors duration-150 ${error ? 'border-red-400/50 focus:ring-red-500/20 focus:border-red-400'
                        : 'border-white/10 focus:ring-teal-500/30 focus:border-teal-500/50'
                        } ${disabled ? 'bg-white/5 text-white/30' : 'bg-white/5 text-white'} ${prefix ? 'pl-8' : ''} ${suffix ? 'pr-12' : ''}`}
                />
            )}
            {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/40">{suffix}</span>}
        </div>
        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
        {helperText && !error && <p className="mt-1 text-xs text-white/30">{helperText}</p>}
    </div>
));
InputField.displayName = 'InputField';

const SelectField = memo<{
    label: string;
    value: string | undefined;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
    placeholder?: string;
}>(({ label, value, onChange, options, placeholder }) => (
    <div>
        <label className="block text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-1.5">{label}</label>
        <div className="relative">
            <select
                value={value ?? ''}
                onChange={(e) => onChange(e.target.value)}
                className="w-full px-3 py-2.5 border border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500/50 bg-white/5 text-white appearance-none cursor-pointer transition-colors duration-150"
            >
                {placeholder && <option value="">{placeholder}</option>}
                {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
        </div>
    </div>
));
SelectField.displayName = 'SelectField';

const ToggleField = memo<{
    label: string;
    description?: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}>(({ label, description, checked, onChange }) => (
    <div className="flex items-center justify-between py-1.5">
        <div>
            <span className="text-sm font-medium text-white/80">{label}</span>
            {description && <p className="text-xs text-white/40">{description}</p>}
        </div>
        <button
            type="button"
            onClick={() => onChange(!checked)}
            className={`relative w-11 h-6 rounded-full transition-colors duration-150 ${checked ? 'bg-teal-500' : 'bg-white/20'}`}
        >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-150 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
    </div>
));
ToggleField.displayName = 'ToggleField';

const SectionCard = memo<{ title: string; icon: React.ReactNode; children: React.ReactNode; className?: string }>(
    ({ title, icon, children, className = '' }) => (
        <div className={`border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm ${className}`}
            style={{
                background: `linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%), url('/images/CardsBackground.webp')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
            }}
        >
            <div className="px-5 py-3.5 border-b border-white/5 flex items-center gap-2.5 bg-black/30">
                <div className="w-7 h-7 bg-white/10 rounded-lg flex items-center justify-center text-white/60">{icon}</div>
                <h3 className="text-sm font-semibold text-white">{title}</h3>
            </div>
            <div className="p-5 bg-black/40">{children}</div>
        </div>
    )
);
SectionCard.displayName = 'SectionCard';

// Status badge helper
const StatusBadge = memo<{ status: string; variant?: 'green' | 'yellow' | 'red' | 'gray' }>(
    ({ status, variant = 'gray' }) => {
        const colors = {
            green: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
            yellow: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
            red: 'bg-red-500/20 text-red-300 border-red-500/30',
            gray: 'bg-white/10 text-white/60 border-white/20',
        };
        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors[variant]}`}>
                {status}
            </span>
        );
    }
);
StatusBadge.displayName = 'StatusBadge';

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const ApartmentSettingsModal: React.FC<ApartmentSettingsModalProps> = ({
    isOpen,
    onClose,
    property,
    onSave,
    embedded = false,
}) => {
    const [isSaving, setIsSaving] = useState(false);

    // ============================================================
    // FORM STATE
    // ============================================================
    const [form, setForm] = useState({
        contract_start: property.contract_start || '',
        contract_end: property.contract_end || '',
        contract_status: property.contract_status || 'active',
        auto_renewal: property.auto_renewal_enabled ?? false,
        duration_months: property.original_contract_duration_months?.toString() || '12',
        rent: property.rent?.toString() || '',
        payment_day: property.extended_details?.payment_due_day?.toString() || '15',
        late_fee: property.extended_details?.late_fee_amount?.toString() || '10',
        late_fee_starts: property.extended_details?.late_fee_grace_days?.toString() || '5',
        deposit_amount: property.deposit_amount?.toString() || '',
        deposit_paid_amount: property.deposit_paid_amount?.toString() || '0',
        deposit_paid: property.deposit_paid ?? false,
        deposit_returned: property.deposit_returned ?? false,
        deposit_deductions: property.deposit_deductions?.toString() || '0',
        deposit_status: property.deposit_status || 'unpaid',
    });

    // Load contract dates from DB if props don't have them
    useEffect(() => {
        if (isOpen && property.id && !property.contract_start) {
            const loadDates = async () => {
                try {
                    const { data, error } = await supabase
                        .from('properties')
                        .select('contract_start, contract_end, contract_status, rent, deposit_amount, deposit_paid, deposit_returned, deposit_deductions, deposit_status, deposit_paid_amount, auto_renewal_enabled, original_contract_duration_months, extended_details')
                        .eq('id', property.id)
                        .maybeSingle();
                    if (!error && data) {
                        setForm(prev => ({
                            ...prev,
                            contract_start: data.contract_start || prev.contract_start,
                            contract_end: data.contract_end || prev.contract_end,
                            contract_status: data.contract_status || prev.contract_status,
                            rent: data.rent ? String(data.rent) : prev.rent,
                            deposit_amount: data.deposit_amount ? String(data.deposit_amount) : prev.deposit_amount,
                            deposit_paid_amount: data.deposit_paid_amount ? String(data.deposit_paid_amount) : prev.deposit_paid_amount,
                            deposit_paid: data.deposit_paid ?? prev.deposit_paid,
                            deposit_returned: data.deposit_returned ?? prev.deposit_returned,
                            deposit_deductions: data.deposit_deductions ? String(data.deposit_deductions) : prev.deposit_deductions,
                            deposit_status: data.deposit_status || prev.deposit_status,
                            auto_renewal: data.auto_renewal_enabled ?? prev.auto_renewal,
                            duration_months: data.original_contract_duration_months ? String(data.original_contract_duration_months) : prev.duration_months,
                            payment_day: (data.extended_details as any)?.payment_due_day ? String((data.extended_details as any).payment_due_day) : prev.payment_day,
                            late_fee: (data.extended_details as any)?.late_fee_amount ? String((data.extended_details as any).late_fee_amount) : prev.late_fee,
                            late_fee_starts: (data.extended_details as any)?.late_fee_grace_days ? String((data.extended_details as any).late_fee_grace_days) : prev.late_fee_starts,
                        }));
                    }
                } catch (err) {
                    console.error('Error loading property details:', err);
                }
            };
            loadDates();
        }
    }, [isOpen, property.id, property.contract_start]);

    // Reset when property/open changes
    useEffect(() => {
        if (isOpen) {
            setForm({
                contract_start: property.contract_start || '',
                contract_end: property.contract_end || '',
                contract_status: property.contract_status || 'active',
                auto_renewal: property.auto_renewal_enabled ?? false,
                duration_months: property.original_contract_duration_months?.toString() || '12',
                rent: property.rent?.toString() || '',
                payment_day: property.extended_details?.payment_due_day?.toString() || '15',
                late_fee: property.extended_details?.late_fee_amount?.toString() || '10',
                late_fee_starts: property.extended_details?.late_fee_grace_days?.toString() || '5',
                deposit_amount: property.deposit_amount?.toString() || '',
                deposit_paid_amount: property.deposit_paid_amount?.toString() || '0',
                deposit_paid: property.deposit_paid ?? false,
                deposit_returned: property.deposit_returned ?? false,
                deposit_deductions: property.deposit_deductions?.toString() || '0',
                deposit_status: property.deposit_status || 'unpaid',
            });
        }
    }, [isOpen, property]);

    // Initial form snapshot for dirty tracking
    const [initialForm, setInitialForm] = useState<string>('');
    useEffect(() => {
        if (isOpen && !initialForm) {
            setInitialForm(JSON.stringify(form));
        }
        if (!isOpen) setInitialForm('');
    }, [isOpen, form, initialForm]);

    const isDirty = useMemo(() => {
        if (!initialForm) return false;
        return JSON.stringify(form) !== initialForm;
    }, [form, initialForm]);

    // Escape key (skip in embedded mode)
    useEffect(() => {
        if (embedded) return;
        const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape' && isOpen) onClose(); };
        document.addEventListener('keydown', handleEsc);
        return () => document.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose, embedded]);

    // Body scroll lock (skip in embedded mode)
    useEffect(() => {
        if (embedded) return;
        if (isOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = '';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen, embedded]);

    const updateField = useCallback(<K extends keyof typeof form>(field: K, value: (typeof form)[K]) => {
        setForm(prev => ({ ...prev, [field]: value }));
    }, []);

    // ============================================================
    // SAVE
    // ============================================================
    const handleSave = useCallback(async () => {
        setIsSaving(true);
        try {
            const updates: any = {
                rent: form.rent ? parseFloat(form.rent) : null,
                contract_start: form.contract_start || null,
                contract_end: form.contract_end || null,
                contract_status: form.contract_status,
                auto_renewal_enabled: form.auto_renewal,
                original_contract_duration_months: form.duration_months ? parseInt(form.duration_months) : 12,
                deposit_amount: form.deposit_amount ? parseFloat(form.deposit_amount) : 0,
                deposit_paid_amount: form.deposit_paid_amount ? parseFloat(form.deposit_paid_amount) : 0,
                deposit_paid: form.deposit_paid,
                deposit_returned: form.deposit_returned,
                deposit_deductions: form.deposit_deductions ? parseFloat(form.deposit_deductions) : 0,
                deposit_status: form.deposit_status,
                extended_details: {
                    ...property.extended_details,
                    payment_due_day: form.payment_day ? parseInt(form.payment_day) : undefined,
                    late_fee_amount: form.late_fee ? parseFloat(form.late_fee) : undefined,
                    late_fee_grace_days: form.late_fee_starts ? parseInt(form.late_fee_starts) : undefined,
                },
            };

            await onSave(updates);
            onClose();
        } catch (error) {
            console.error('Error saving apartment settings:', error);
        } finally {
            setIsSaving(false);
        }
    }, [form, onSave, onClose]);

    // Deposit status helpers
    const depositStatusVariant = useMemo((): 'green' | 'yellow' | 'red' | 'gray' => {
        if (form.deposit_returned) return 'gray';
        if (form.deposit_paid) return 'green';
        if (parseFloat(form.deposit_paid_amount || '0') > 0) return 'yellow';
        return 'red';
    }, [form.deposit_returned, form.deposit_paid, form.deposit_paid_amount]);

    const depositStatusLabel = useMemo(() => {
        if (form.deposit_returned) return 'Grąžintas';
        if (form.deposit_paid) return 'Sumokėtas';
        if (parseFloat(form.deposit_paid_amount || '0') > 0) return 'Dalinis';
        return 'Nesumokėtas';
    }, [form.deposit_returned, form.deposit_paid, form.deposit_paid_amount]);

    if (!isOpen) return null;

    // ============================================================
    // RENDER — flat layout, no sub-tabs
    // ============================================================
    const settingsContent = (
        <div className={embedded ? 'flex flex-col h-full' : 'relative rounded-2xl shadow-2xl w-full max-w-3xl h-[90vh] flex flex-col overflow-hidden bg-neutral-900'}>

            {/* ═══ HEADER (only in standalone mode) ═══ */}
            {!embedded && (
                <div className="bg-neutral-900/80 border-b border-white/10 flex-shrink-0 backdrop-blur-sm">
                    <div className="px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-sm">
                                <Home className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-white">
                                    Butas {property.apartment_number || '—'}
                                </h2>
                                <p className="text-xs text-white/50">{property.address || 'Adresas nenurodytas'}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="w-9 h-9 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 rounded-xl transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}

            {/* ═══ SCROLLABLE CONTENT — all sections flat ═══ */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">

                {/* ═══ SECTION 1: SUTARTIS ═══ */}
                <SectionCard title="Sutartis" icon={<Calendar className="w-4 h-4" />}>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <InputField
                                label="Pradžia"
                                value={form.contract_start}
                                onChange={(v) => updateField('contract_start', v)}
                                type="date"
                            />
                            <InputField
                                label="Pabaiga"
                                value={form.contract_end}
                                onChange={(v) => updateField('contract_end', v)}
                                type="date"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <SelectField
                                label="Statusas"
                                value={form.contract_status}
                                onChange={(v) => updateField('contract_status', v)}
                                options={[
                                    { value: 'active', label: 'Aktyvi' },
                                    { value: 'expiring_soon', label: 'Baigiasi' },
                                    { value: 'expired', label: 'Pasibaigusi' },
                                    { value: 'terminated', label: 'Nutraukta' },
                                ]}
                            />
                            <InputField
                                label="Trukmė"
                                value={form.duration_months}
                                onChange={(v) => updateField('duration_months', v)}
                                type="number"
                                suffix="mėn."
                            />
                        </div>

                        <ToggleField
                            label="Automatinis atnaujinimas"
                            description="Sutartis automatiškai pratęsiama tokiam pačiam terminui"
                            checked={form.auto_renewal}
                            onChange={(v) => updateField('auto_renewal', v)}
                        />
                    </div>
                </SectionCard>

                {/* ═══ SECTION 2: MOKĖJIMAI ═══ */}
                <SectionCard title="Mokėjimai" icon={<Euro className="w-4 h-4" />}>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <InputField
                                label="Nuomos kaina"
                                value={form.rent}
                                onChange={(v) => updateField('rent', v)}
                                type="number"
                                prefix="€"
                                placeholder="450"
                            />
                            <InputField
                                label="Mokėjimo diena"
                                value={form.payment_day}
                                onChange={(v) => updateField('payment_day', v)}
                                type="number"
                                min={1}
                                max={28}
                                helperText="Kiekvieną mėnesį iki šios dienos nuomininkas turi sumokėti nuomą"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <InputField
                                label="Vėlavimo bauda"
                                value={form.late_fee}
                                onChange={(v) => updateField('late_fee', v)}
                                type="number"
                                prefix="€"
                                helperText="Suma eurais, kuri pridedama už kiekvieną pavėluotą dieną"
                            />
                            <InputField
                                label="Baudos pradžia"
                                value={form.late_fee_starts}
                                onChange={(v) => updateField('late_fee_starts', v)}
                                type="number"
                                suffix="d."
                                helperText="Po kiek dienų nuo mokėjimo termino pradedama skaičiuoti bauda"
                            />
                        </div>
                    </div>
                </SectionCard>

                {/* ═══ SECTION 3: DEPOZITAS ═══ */}
                <SectionCard title="Depozitas" icon={<Shield className="w-4 h-4" />}>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-white/60">Būsena</span>
                            <StatusBadge status={depositStatusLabel} variant={depositStatusVariant} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <InputField
                                label="Depozito suma"
                                value={form.deposit_amount}
                                onChange={(v) => updateField('deposit_amount', v)}
                                type="number"
                                prefix="€"
                                placeholder="450"
                            />
                            <InputField
                                label="Sumokėta"
                                value={form.deposit_paid_amount}
                                onChange={(v) => updateField('deposit_paid_amount', v)}
                                type="number"
                                prefix="€"
                            />
                        </div>

                        <InputField
                            label="Atskaitymai"
                            value={form.deposit_deductions}
                            onChange={(v) => updateField('deposit_deductions', v)}
                            type="number"
                            prefix="€"
                            helperText="Suma atskaityta iš depozito (nuostoliai, remontas)"
                        />

                        <div className="grid grid-cols-2 gap-3">
                            <ToggleField
                                label="Pilnai sumokėtas"
                                checked={form.deposit_paid}
                                onChange={(v) => updateField('deposit_paid', v)}
                            />
                            <ToggleField
                                label="Grąžintas"
                                checked={form.deposit_returned}
                                onChange={(v) => updateField('deposit_returned', v)}
                            />
                        </div>
                    </div>
                </SectionCard>
            </div>

            {/* ═══ STICKY FOOTER ═══ */}
            <div className={`flex items-center justify-between px-6 py-4 border-t border-white/10 flex-shrink-0 ${embedded ? 'bg-neutral-900/60 backdrop-blur-sm' : 'bg-neutral-900'}`}>
                <div className="text-xs text-white/40">
                    {isDirty && (
                        <span className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                            Yra neišsaugotų pakeitimų
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    {!embedded && (
                        <button
                            onClick={onClose}
                            className="px-4 py-2.5 text-sm font-medium text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                        >
                            Atšaukti
                        </button>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={isSaving || !isDirty}
                        className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg transition-colors active:scale-[0.98] ${isSaving || !isDirty
                            ? 'bg-white/10 text-white/30 cursor-not-allowed'
                            : 'bg-teal-600 text-white hover:bg-teal-700 shadow-sm'
                            }`}
                    >
                        <Save className="w-4 h-4" />
                        {isSaving ? 'Saugoma...' : 'Išsaugoti pakeitimus'}
                    </button>
                </div>
            </div>
        </div>
    );

    // Wrap in overlay if not embedded
    if (embedded) {
        return settingsContent;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            {settingsContent}
        </div>
    );
};

export default ApartmentSettingsModal;
