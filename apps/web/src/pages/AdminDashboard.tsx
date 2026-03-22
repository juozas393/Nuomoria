import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import {
    Shield,
    Users,
    Building2,
    FileText,
    Activity,
    ChevronDown,
    ChevronUp,
    ArrowUpDown,
    Home,
    Receipt,
    Gauge,
    UserPlus,
    Trash2,
    Pencil,
    Plus,
    RefreshCw,
    Search,
    X,
    Eye,
    Send,
    LogIn,
    ChevronRight,
    Loader2,
    Bell,
    Clock,
    CheckCircle,
    AlertCircle,
    Image,
    TrendingUp,
    Zap,
    BarChart3,
    KeyRound,
    CircleDollarSign,
    CircleOff,
    UsersRound,
    ScrollText,
    Calendar,
    Mail,
    Phone,
    Ban,
    ShieldCheck,
    History,
    AlertTriangle,
} from 'lucide-react';
import { logAuditEvent } from '../lib/auditLogApi';

// ─── Design Tokens — dark premium (matching Nuomoria app) ─── //
const surface1 = 'bg-[rgba(6,10,12,0.92)] backdrop-blur-xl border border-white/[0.06] rounded-2xl';
const surface2 = 'bg-white/[0.04] border border-white/[0.06] rounded-xl';
const glassCard = `${surface1}`;
const glassCardHover = `${surface2} hover:bg-white/[0.08] hover:border-white/[0.10] transition-all duration-200`;
const panelCard = surface1;

// ─── Types ─── //
interface AuditLogEntry {
    id: string;
    user_id: string | null;
    user_email: string | null;
    action: string;
    table_name: string;
    record_id: string | null;
    old_data: Record<string, unknown> | null;
    new_data: Record<string, unknown> | null;
    changed_fields: string[] | null;
    description: string | null;
    created_at: string;
}

interface UserInfo {
    id: string;
    email: string;
    role: string | null;
    first_name: string | null;
    last_name: string | null;
    nickname: string | null;
    is_active: boolean;
    last_login: string | null;
    created_at: string;
}

interface KPIData {
    totalUsers: number;
    totalLandlords: number;
    totalTenantUsers: number;
    totalAddresses: number;
    totalProperties: number;
    totalInvoices: number;
    paidInvoices: number;
    unpaidInvoices: number;
    activeMeters: number;
    totalReadings: number;
    activeTenants: number;
    unreadNotifications: number;
    totalPhotos: number;
    totalDocuments: number;
    pendingInvitations: number;
    totalContracts: number;
    totalRevenue: number;
    outstandingAmount: number;
    occupancyRate: number;
    occupiedProperties: number;
}

// ─── Constants ─── //
const TABLE_LABELS: Record<string, string> = {
    properties: 'Butai',
    addresses: 'Adresai',
    tenants: 'Nuomininkai',
    invoices: 'Sąskaitos',
    meter_readings: 'Skaitliukų rodmenys',
    meters: 'Skaitliukai',
    property_documents: 'Dokumentai',
    tenant_invitations: 'Pakvietimai',
    users: 'Vartotojai',
    pages: 'Puslapiai',
    notifications: 'Pranešimai',
    property_photos: 'Nuotraukos',
    address_meters: 'Skaitliukai (adreso)',
    address_settings: 'Adreso nustatymai',
    user_addresses: 'Prieigos',
    communal_meters: 'Komunaliniai skaitikliai',
    apartment_meters: 'Buto skaitikliai',
};

const ACTION_LABELS: Record<string, { label: string; color: string; bgColor: string; icon: typeof Plus }> = {
    INSERT: { label: 'Sukurta', color: 'text-emerald-700', bgColor: 'bg-emerald-50 border border-emerald-100', icon: Plus },
    UPDATE: { label: 'Atnaujinta', color: 'text-blue-700', bgColor: 'bg-blue-50 border border-blue-100', icon: Pencil },
    DELETE: { label: 'Ištrinta', color: 'text-red-700', bgColor: 'bg-red-50 border border-red-100', icon: Trash2 },
    VIEW: { label: 'Peržiūra', color: 'text-violet-700', bgColor: 'bg-violet-50 border border-violet-100', icon: Eye },
    SUBMIT: { label: 'Pateikta', color: 'text-cyan-700', bgColor: 'bg-cyan-50 border border-cyan-100', icon: Send },
    LOGIN: { label: 'Prisijungė', color: 'text-amber-700', bgColor: 'bg-amber-50 border border-amber-100', icon: LogIn },
    EXPORT: { label: 'Eksportuota', color: 'text-orange-700', bgColor: 'bg-orange-50 border border-orange-100', icon: FileText },
};

const ROLE_LABELS: Record<string, string> = {
    admin: 'Administratorius',
    landlord: 'Nuomotojas',
    tenant: 'Nuomininkas',
};

const TABLE_ICONS: Record<string, typeof Building2> = {
    properties: Home,
    addresses: Building2,
    tenants: Users,
    invoices: Receipt,
    meter_readings: Gauge,
    meters: Gauge,
    property_documents: FileText,
    tenant_invitations: UserPlus,
    users: Users,
    pages: Activity,
    notifications: Send,
    property_photos: Eye,
    address_meters: Gauge,
    address_settings: Activity,
    user_addresses: Users,
    communal_meters: Gauge,
    apartment_meters: Gauge,
};

// Lithuanian field labels
const FIELD_LABELS: Record<string, string> = {
    // Properties
    unit_number: 'Buto numeris', rent: 'Nuoma (€)', deposit_amount: 'Depozitas (€)',
    deposit_paid_amount: 'Sumokėtas depozitas (€)', status: 'Statusas', rooms: 'Kambariai',
    area: 'Plotas (m²)', floor: 'Aukštas', floors_total: 'Aukštų viso', type: 'Tipas',
    payment_status: 'Mokėjimo statusas', street: 'Gatvė', city: 'Miestas', zipcode: 'Pašto kodas',
    country: 'Šalis', email: 'El. paštas', role: 'Rolė', full_name: 'Vardas ir pavardė',
    first_name: 'Vardas', last_name: 'Pavardė', phone: 'Telefonas',
    monthlyRent: 'Mėnesinė nuoma (€)', deposit: 'Depozitas (€)',
    contract_start: 'Sutarties pradžia', contract_end: 'Sutarties pabaiga',
    amount: 'Suma (€)', rent_amount: 'Nuomos suma (€)', utilities_amount: 'Komunalinių suma (€)',
    due_date: 'Terminas', paid_date: 'Apmokėjimo data', value: 'Rodmuo',
    reading_date: 'Data', period: 'Periodas', name: 'Pavadinimas',
    file_name: 'Failo pavadinimas', code: 'Pakvietimo kodas', expires_at: 'Galioja iki',
    is_active: 'Aktyvus', is_communal: 'Komunalinis', price_per_unit: 'Kaina už vnt.',
    distribution_type: 'Paskirstymo tipas',
    // Termination
    termination_status: 'Nutraukimo statusas',
    termination_date: 'Nutraukimo data',
    termination_reason: 'Nutraukimo priežastis',
    termination_requested_at: 'Prašymo data',
    termination_requested_by: 'Prašymo iniciatorius',
    termination_confirmed_at: 'Patvirtinimo data',
    deposit_return_amount: 'Grąžinamas depozitas (€)',
    deposit_deduction_amount: 'Depozito išskaita (€)',
    deposit_deduction_reason: 'Išskaitos priežastis',
    // Tenant
    tenant_name: 'Nuomininko vardas',
    tenant_email: 'Nuomininko el. paštas',
    tenant_phone: 'Nuomininko telefonas',
    inviter_email: 'Kvietėjo el. paštas',
    responded_at: 'Atsakymo data',
    // Notifications
    notification_type: 'Pranešimo tipas',
    is_read: 'Perskaityta',
    title: 'Antraštė',
    message: 'Žinutė',
    // Settings
    settings: 'Nustatymai',
    late_fee: 'Vėlavimo mokestis (€)',
    invoice_number: 'Sąskaitos nr.',
    invoice_date: 'Sąskaitos data',
    apartment_number: 'Buto nr.',
    under_maintenance: 'Remontas',
    deposit_paid: 'Depozitas sumokėtas',
    property_type: 'Tipo klasifikacija',
    // Legacy keys from old logAuditEvent calls
    return: 'Grąžinama (€)',
    date: 'Data',
    reason: 'Priežastis',
    deductions: 'Išskaitymai',
};

const HIDDEN_FIELDS = new Set([
    'id', 'created_at', 'updated_at', 'address_id', 'property_id',
    'user_id', 'owner_id', 'inviter_id', 'meter_id', 'submitted_by',
    'auth_id', 'extended_details', 'lat', 'lng', 'created_by',
    'line_items', 'period_start', 'period_end', 'other_amount',
    'payment_method', 'notes', 'collection_mode', 'tenant_id',
    'token', 'invited_by', 'termination_deductions',
    'termination_requested_by',
    // Technical/internal property fields (from DB trigger full-row data)
    'address', 'manager_id', 'bedding_owner', 'cleaning_cost',
    'cleaning_required', 'bedding_fee_paid', 'deposit_status',
    'contract_status', 'tenant_response', 'tenant_response_date',
    'notification_count', 'notification_status', 'auto_renewal_enabled',
    'planned_move_out_date', 'last_notification_sent',
    'tenant_communication_status', 'original_contract_duration_months',
    'deposit_returned', 'deposit_deductions',
    // Invitation technical fields
    'data', 'kind', 'is_read', 'read_at', 'body',
]);

// Value translations for known enum values
const VALUE_TRANSLATIONS: Record<string, string> = {
    // Property status
    occupied: 'Išnuomotas', vacant: 'Laisvas', reserved: 'Rezervuotas',
    // Termination status
    tenant_requested: 'Nuomininko prašymas', landlord_requested: 'Nuomotojo prašymas',
    confirmed: 'Patvirtinta', terminated: 'Nutraukta', cancelled: 'Atšaukta',
    rejected: 'Atmesta',
    // Invitation status
    pending: 'Laukiama', accepted: 'Priimta', expired: 'Pasibaigęs',
    // Payment status
    paid: 'Apmokėta', overdue: 'Pradelsta', unpaid: 'Neapmokėta',
    // Property type
    apartment: 'Butas', house: 'Namas', room: 'Kambarys', studio: 'Studija',
    // Booleans
    true: 'Taip', false: 'Ne',
    // Roles
    landlord: 'Nuomotojas', tenant: 'Nuomininkas', admin: 'Administratorius',
    // Misc
    active: 'Aktyvi', inactive: 'Neaktyvi',
    no_response: 'Neatsakyta', responsive: 'Atsakingas',
    partial: 'Dalinai', none: 'Nėra',
};

// Currency fields
const CURRENCY_FIELDS_ADMIN = new Set([
    'rent', 'deposit_amount', 'deposit_paid_amount', 'monthlyRent', 'deposit',
    'amount', 'rent_amount', 'utilities_amount', 'late_fee', 'price_per_unit',
    'deposit_return_amount', 'deposit_deduction_amount', 'return',
]);

// Date fields
const DATE_FIELDS_ADMIN = new Set([
    'contract_start', 'contract_end', 'due_date', 'paid_date', 'reading_date',
    'expires_at', 'termination_date', 'termination_requested_at',
    'termination_confirmed_at', 'responded_at', 'invoice_date', 'date',
]);

function formatFieldValue(value: unknown, fieldName?: string): string {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'boolean') return value ? 'Taip' : 'Ne';
    if (typeof value === 'object') {
        if (Array.isArray(value)) {
            if (value.length === 0) return 'Nėra';
            // Format deduction arrays nicely
            if (value.length > 0 && typeof value[0] === 'object' && value[0] !== null) {
                return value.map(item => {
                    if (item.reason && item.amount) return `${item.reason}: €${item.amount}`;
                    return JSON.stringify(item);
                }).join('; ');
            }
            return value.join(', ');
        }
        return JSON.stringify(value);
    }

    const str = String(value);

    // Skip placeholder emails
    if (str.includes('@placeholder.local')) return '—';

    // Translate known enum values
    const translated = VALUE_TRANSLATIONS[str.toLowerCase()];
    if (translated) return translated;

    // Currency formatting
    if (fieldName && CURRENCY_FIELDS_ADMIN.has(fieldName)) {
        const num = Number(str);
        if (!isNaN(num)) return `€${new Intl.NumberFormat('lt-LT', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num)}`;
    }

    // Date formatting
    if (fieldName && DATE_FIELDS_ADMIN.has(fieldName)) {
        try {
            const d = new Date(str);
            if (!isNaN(d.getTime())) {
                return d.toLocaleDateString('lt-LT', { year: 'numeric', month: '2-digit', day: '2-digit' });
            }
        } catch { /* ignore */ }
    }

    // Number formatting for known numeric fields
    if (fieldName && typeof value === 'number' && !CURRENCY_FIELDS_ADMIN.has(fieldName)) {
        return String(value);
    }

    return str;
}

// Auto-generate a smart description from changed_fields when the original is generic
function generateSmartDescription(
    description: string,
    action: string,
    tableName: string,
    changedFields: string[] | null,
    oldData: Record<string, unknown> | null,
    newData: Record<string, unknown> | null,
): string {
    // If description is already descriptive, keep it
    if (description && description !== 'Atnaujintas įrašas' && description !== 'Sukurtas naujas įrašas' && description !== 'Ištrintas įrašas') {
        return description;
    }
    if (!changedFields || changedFields.length === 0) return description || 'Nėra aprašymo';

    const TABLE_LABEL: Record<string, string> = {
        properties: 'Būsto', tenant_invitations: 'Pakvietimo', meters: 'Skaitiklio',
        invoices: 'Sąskaitos', notifications: 'Pranešimo', users: 'Vartotojo',
    };

    const visibleFields = changedFields.filter(f => !HIDDEN_FIELDS.has(f));
    const fieldLabels = visibleFields.map(f => FIELD_LABELS[f] || f).slice(0, 3);
    const tableLabel = TABLE_LABEL[tableName] || '';

    if (action === 'UPDATE' && fieldLabels.length > 0) {
        const changes = visibleFields.slice(0, 2).map(f => {
            const label = FIELD_LABELS[f] || f;
            const oldVal = oldData?.[f];
            const newVal = newData?.[f];
            if (oldVal !== null && oldVal !== undefined && newVal !== null && newVal !== undefined) {
                return `${label}: ${formatFieldValue(oldVal, f)} → ${formatFieldValue(newVal, f)}`;
            }
            if (newVal !== null && newVal !== undefined) {
                return `${label}: ${formatFieldValue(newVal, f)}`;
            }
            return label;
        });
        const suffix = visibleFields.length > 2 ? ` (+${visibleFields.length - 2})` : '';
        return `${tableLabel} atnaujinimas: ${changes.join(', ')}${suffix}`;
    }
    return description || 'Nėra aprašymo';
}

const PAGE_SIZE = 50;

// ─── KPI Gradient configs ─── //
const KPI_ROW1 = [
    { key: 'totalUsers', icon: UsersRound, label: 'Viso vartotojų', gradient: 'from-purple-500 to-violet-600', bgLight: 'bg-purple-50', textColor: 'text-purple-600' },
    { key: 'totalLandlords', icon: KeyRound, label: 'Nuomotojai', gradient: 'from-teal-500 to-emerald-600', bgLight: 'bg-teal-50', textColor: 'text-teal-600' },
    { key: 'totalTenantUsers', icon: Users, label: 'Nuomininkai', gradient: 'from-sky-500 to-blue-600', bgLight: 'bg-sky-50', textColor: 'text-sky-600' },
    { key: 'totalAddresses', icon: Building2, label: 'Adresai', gradient: 'from-blue-500 to-indigo-600', bgLight: 'bg-blue-50', textColor: 'text-blue-600' },
] as const;

const KPI_ROW2 = [
    { key: 'totalProperties', icon: Home, label: 'Butai', gradient: 'from-indigo-500 to-purple-600', bgLight: 'bg-indigo-50', textColor: 'text-indigo-600' },
    { key: 'totalInvoices', icon: Receipt, label: 'Visos sąskaitos', gradient: 'from-amber-500 to-orange-600', bgLight: 'bg-amber-50', textColor: 'text-amber-600' },
    { key: 'paidInvoices', icon: CircleDollarSign, label: 'Apmokėtos sąskaitos', gradient: 'from-emerald-500 to-green-600', bgLight: 'bg-emerald-50', textColor: 'text-emerald-600' },
    { key: 'unpaidInvoices', icon: CircleOff, label: 'Neapmokėtos sąskaitos', gradient: 'from-rose-500 to-red-600', bgLight: 'bg-rose-50', textColor: 'text-rose-600' },
] as const;

const KPI_ROW3 = [
    { key: 'activeMeters', icon: Gauge, label: 'Aktyvūs skaitliukai', gradient: 'from-cyan-500 to-teal-600', bgLight: 'bg-cyan-50', textColor: 'text-cyan-600' },
    { key: 'totalReadings', icon: BarChart3, label: 'Rodmenų įrašai', gradient: 'from-green-500 to-emerald-600', bgLight: 'bg-green-50', textColor: 'text-green-600' },
    { key: 'activeTenants', icon: UserPlus, label: 'Aktyvūs nuomininkai', gradient: 'from-violet-500 to-purple-600', bgLight: 'bg-violet-50', textColor: 'text-violet-600' },
    { key: 'unreadNotifications', icon: Bell, label: 'Neperskaityti', gradient: 'from-pink-500 to-rose-600', bgLight: 'bg-pink-50', textColor: 'text-pink-600' },
] as const;

const KPI_ROW4 = [
    { key: 'totalContracts', icon: ScrollText, label: 'Aktyvios sutartys', gradient: 'from-teal-500 to-cyan-600', bgLight: 'bg-teal-50', textColor: 'text-teal-600' },
] as const;

// ─── Premium KPI Card ─── //
const KPICard = memo<{ icon: typeof Users; label: string; value: number; gradient: string; bgLight: string; textColor: string; onClick?: () => void; isActive?: boolean }>(
    ({ icon: Icon, label, value, gradient, bgLight, textColor, onClick, isActive }) => (
        <div
            className={`${glassCardHover} p-4 group cursor-pointer transition-all duration-300 ${isActive ? 'ring-2 ring-teal-400/50 bg-white/[0.12] scale-[1.02]' : ''}`}
            onClick={onClick}
        >
            <div className="flex items-center gap-3.5">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300`}>
                    <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[22px] font-extrabold text-white tabular-nums leading-none">{value}</p>
                    <p className="text-[10px] font-medium text-gray-400 mt-1 truncate">{label}</p>
                </div>
            </div>
        </div>
    )
);
KPICard.displayName = 'KPICard';

// ─── Status Pill ─── //
const StatusPill = memo<{ icon: typeof CheckCircle; value: number; label: string; color: string; dotColor?: string }>(
    ({ icon: Icon, value, label, color, dotColor }) => (
        <div className={`flex items-center gap-2.5 px-4 py-3 ${color} rounded-xl border transition-all duration-200 hover:scale-[1.02]`}>
            <Icon className="w-4 h-4 flex-shrink-0" />
            <div className="flex-1">
                <p className="text-[13px] font-bold tabular-nums leading-none">{value}</p>
                <p className="text-[9px] mt-0.5 opacity-70">{label}</p>
            </div>
            {dotColor && (
                <span className="relative flex h-2 w-2">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${dotColor} opacity-75`} />
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${dotColor}`} />
                </span>
            )}
        </div>
    )
);
StatusPill.displayName = 'StatusPill';

// ─── Audit Entry with expandable detail ─── //
const AuditEntry = memo<{ entry: AuditLogEntry; showUser?: boolean }>(({ entry, showUser = true }) => {
    const [expanded, setExpanded] = useState(false);
    const actionInfo = ACTION_LABELS[entry.action] || ACTION_LABELS.UPDATE;
    const TableIcon = TABLE_ICONS[entry.table_name] || Activity;
    const ActionIcon = actionInfo.icon;

    const timeAgo = useMemo(() => {
        const diff = Date.now() - new Date(entry.created_at).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Ką tik';
        if (mins < 60) return `prieš ${mins} min.`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `prieš ${hours} val.`;
        const days = Math.floor(hours / 24);
        return `prieš ${days} d.`;
    }, [entry.created_at]);

    const hasDetails = entry.action === 'INSERT' || entry.action === 'DELETE' ||
        (entry.changed_fields && entry.changed_fields.length > 0) ||
        (entry.action === 'UPDATE' && entry.new_data && Object.keys(entry.new_data).length > 0);

    const dataFields = useMemo(() => {
        const data = entry.action === 'DELETE' ? entry.old_data : entry.new_data;
        if (!data) return [];
        return Object.entries(data)
            .filter(([key]) => !HIDDEN_FIELDS.has(key))
            .filter(([, val]) => val !== null && val !== undefined && val !== '')
            .map(([key, val]) => ({ label: FIELD_LABELS[key] || key, value: formatFieldValue(val, key) }));
    }, [entry.action, entry.old_data, entry.new_data]);

    const changedFields = useMemo(() => {
        if (!entry.changed_fields || !entry.new_data) return [];
        return entry.changed_fields
            .filter(f => !HIDDEN_FIELDS.has(f))
            .map(field => ({
                field,
                label: FIELD_LABELS[field] || field,
                oldVal: formatFieldValue(entry.old_data?.[field], field),
                newVal: formatFieldValue(entry.new_data?.[field], field),
                isNewField: entry.old_data?.[field] === null || entry.old_data?.[field] === undefined,
            }));
    }, [entry.changed_fields, entry.old_data, entry.new_data]);

    // Context fields: unchanged fields from new_data (not in changed_fields) for context display
    const contextFields = useMemo(() => {
        if (entry.action !== 'UPDATE' || !entry.new_data) return [];
        const changedSet = new Set(entry.changed_fields || []);
        return Object.entries(entry.new_data)
            .filter(([key]) => !HIDDEN_FIELDS.has(key) && !changedSet.has(key))
            .filter(([, val]) => val !== null && val !== undefined && val !== '')
            .filter(([key]) => FIELD_LABELS[key]) // only show fields we know
            .map(([key, val]) => ({ label: FIELD_LABELS[key], value: formatFieldValue(val, key) }));
    }, [entry.action, entry.new_data, entry.changed_fields]);

    // For old UPDATE entries without changed_fields, show new_data fields as info
    const updateInfoFields = useMemo(() => {
        if (entry.action !== 'UPDATE' || entry.changed_fields || !entry.new_data) return [];
        return Object.entries(entry.new_data)
            .filter(([key]) => !HIDDEN_FIELDS.has(key))
            .filter(([, val]) => val !== null && val !== undefined && val !== '')
            .map(([key, val]) => ({ label: FIELD_LABELS[key] || key, value: formatFieldValue(val, key) }));
    }, [entry.action, entry.changed_fields, entry.new_data]);


    return (
        <div
            className={`group relative bg-white/[0.06] border rounded-2xl overflow-hidden transition-all duration-300 ${hasDetails ? 'cursor-pointer' : ''} ${expanded ? 'border-teal-500/30 bg-white/[0.10]' : 'border-white/[0.10] hover:border-white/[0.15] hover:bg-white/[0.08]'}`}
            onClick={() => hasDetails && setExpanded(!expanded)}
        >
            {/* Compact header row */}
            <div className="flex items-start gap-3 px-4 py-3">
                {/* Icon */}
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${expanded ? 'bg-teal-500/15 border-teal-500/20' : 'bg-white/[0.08] border-white/[0.10]'} border transition-colors`}>
                    <TableIcon className={`w-3.5 h-3.5 ${expanded ? 'text-teal-400' : 'text-gray-400'} transition-colors`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    {/* Top line: action badge + table + time */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide ${actionInfo.color} ${actionInfo.bgColor}`}>
                            <ActionIcon className="w-2.5 h-2.5" />
                            {actionInfo.label}
                        </span>
                        <span className="text-[10px] font-semibold text-gray-300">{TABLE_LABELS[entry.table_name] || entry.table_name}</span>
                        <span className="text-[9px] text-gray-300 ml-auto flex-shrink-0 font-mono hidden lg:inline">{(() => { const d = new Date(entry.created_at); return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; })()}</span>
                    </div>

                    {/* Description */}
                    <p className="text-[11px] text-gray-500 mt-1 leading-snug line-clamp-2">
                        {showUser && <span className="text-gray-500">{entry.user_email || 'Sistema'} · </span>}
                        <span className="text-gray-300">{generateSmartDescription(entry.description || '', entry.action, entry.table_name, entry.changed_fields || null, entry.old_data, entry.new_data)}</span>
                    </p>

                    {/* Mobile timestamp */}
                    <span className="text-[9px] text-gray-300 lg:hidden font-mono mt-0.5 inline-block">{timeAgo}</span>

                    {/* Expand toggle */}
                    {hasDetails && (
                        <div className={`flex items-center gap-1 mt-1.5 text-[9px] font-semibold transition-colors ${expanded ? 'text-teal-400' : 'text-gray-500 group-hover:text-teal-400'}`}>
                            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            {expanded ? 'Slėpti' : 'Detalės'}
                        </div>
                    )}
                </div>
            </div>

            {/* Expanded details panel */}
            {expanded && (
                <div className="border-t border-white/[0.08] bg-white/[0.03] px-4 py-3 space-y-3" onClick={e => e.stopPropagation()}>

                    {/* Changed fields */}
                    {entry.action === 'UPDATE' && changedFields.length > 0 && (
                        <div>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">Pakeitimai</p>
                            <div className="space-y-1.5">
                                {changedFields.map(({ label, oldVal, newVal, isNewField }) => (
                                    <div key={label} className="flex items-center gap-2 bg-white/[0.04] rounded-lg px-3 py-2 border border-white/[0.08]">
                                        <span className="text-[10px] font-medium text-gray-400 min-w-[100px] flex-shrink-0">{label}</span>
                                        <div className="flex items-center gap-1.5 text-[11px] min-w-0">
                                            {isNewField ? (
                                                <span className="text-emerald-600 font-semibold truncate">{newVal}</span>
                                            ) : (
                                                <>
                                                    <span className="text-gray-500 line-through truncate max-w-[120px]" title={oldVal}>{oldVal}</span>
                                                    <span className="text-gray-500 flex-shrink-0">→</span>
                                                    <span className="text-white font-semibold truncate">{newVal}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Context fields */}
                    {contextFields.length > 0 && (
                        <div>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">Kontekstas</p>
                            <div className="flex flex-wrap gap-1.5">
                                {contextFields.map(({ label, value }) => (
                                    <span key={label} className="inline-flex items-center gap-1 px-2 py-1 bg-white/[0.04] rounded-lg border border-white/[0.08] text-[10px]">
                                        <span className="text-gray-400">{label}:</span>
                                        <span className="font-medium text-gray-200">{value}</span>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Update info fields (old entries without changed_fields) */}
                    {entry.action === 'UPDATE' && changedFields.length === 0 && updateInfoFields.length > 0 && (
                        <div>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">Duomenys</p>
                            <div className="flex flex-wrap gap-1.5">
                                {updateInfoFields.map(({ label, value }) => (
                                    <span key={label} className="inline-flex items-center gap-1 px-2 py-1 bg-white/[0.04] rounded-lg border border-white/[0.08] text-[10px]">
                                        <span className="text-gray-400">{label}:</span>
                                        <span className="font-medium text-gray-200">{value}</span>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* INSERT data */}
                    {entry.action === 'INSERT' && dataFields.length > 0 && (
                        <div>
                            <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest mb-2">Sukurti duomenys</p>
                            <div className="flex flex-wrap gap-1.5">
                                {dataFields.map(({ label, value }) => (
                                    <span key={label} className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/10 rounded-lg border border-emerald-500/20 text-[10px]">
                                        <span className="text-emerald-400">{label}:</span>
                                        <span className="font-medium text-emerald-400">{value}</span>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* DELETE data */}
                    {entry.action === 'DELETE' && dataFields.length > 0 && (
                        <div>
                            <p className="text-[9px] font-bold text-red-400 uppercase tracking-widest mb-2">Ištrinti duomenys</p>
                            <div className="flex flex-wrap gap-1.5">
                                {dataFields.map(({ label, value }) => (
                                    <span key={label} className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/10 rounded-lg border border-red-500/20 text-[10px]">
                                        <span className="text-red-400">{label}:</span>
                                        <span className="font-medium text-red-400 line-through">{value}</span>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center gap-2 pt-2 border-t border-white/[0.06]">
                        <span className="text-[8px] text-gray-300 font-mono">
                            {(() => { const d = new Date(entry.created_at); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`; })()}
                        </span>
                        {entry.record_id && (
                            <span className="text-[8px] text-gray-300 font-mono truncate max-w-[180px]" title={entry.record_id}>
                                {entry.record_id.substring(0, 8)}
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
});
AuditEntry.displayName = 'AuditEntry';

// ─── User Card ─── //
const UserCard = memo<{ user: UserInfo; activityCount: number; isSelected: boolean; isExpanded: boolean; onClick: () => void; onToggleBlock: (userId: string, block: boolean) => void; onChangeRole: (userId: string, role: string) => void }>(
    ({ user, activityCount, isSelected, isExpanded, onClick, onToggleBlock, onChangeRole }) => {
        const isBlocked = user.is_active === false;
        const roleConfig = user.role === 'admin'
            ? { bg: 'bg-gradient-to-br from-purple-500 to-violet-600', badge: 'bg-purple-500/15 text-purple-400 border-purple-500/20' }
            : user.role === 'landlord'
                ? { bg: 'bg-gradient-to-br from-teal-500 to-emerald-600', badge: 'bg-teal-500/15 text-teal-400 border-teal-500/20' }
                : user.role === 'tenant'
                    ? { bg: 'bg-gradient-to-br from-blue-500 to-sky-600', badge: 'bg-blue-500/15 text-blue-400 border-blue-500/20' }
                    : { bg: 'bg-gradient-to-br from-gray-400 to-gray-500', badge: 'bg-white/[0.08] text-gray-400 border-white/[0.10]' };

        return (
            <div className={`bg-white/[0.04] border rounded-xl transition-all duration-200 hover:bg-white/[0.08] ${isBlocked ? 'border-red-500/30 bg-red-500/5' : isSelected ? 'ring-2 ring-teal-400/50 bg-white/[0.08] border-teal-500/30' : 'border-white/[0.08]'}`}>
                <button onClick={onClick} className="w-full p-3 flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl ${isBlocked ? 'bg-gradient-to-br from-red-500 to-rose-600' : roleConfig.bg} flex items-center justify-center flex-shrink-0 shadow-lg ${isSelected ? 'scale-110' : ''} transition-transform duration-300`}>
                        {isBlocked ? <Ban className="w-4 h-4 text-white" /> : (
                            <span className="text-[12px] font-bold text-white">
                                {(user.first_name?.[0] || user.email[0]).toUpperCase()}
                            </span>
                        )}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                        <p className={`text-[12px] font-semibold truncate ${isBlocked ? 'text-red-300 line-through' : 'text-white'}`}>
                            {user.nickname || (user.first_name ? `${user.first_name}${user.last_name ? ` ${user.last_name}` : ''}` : user.email.split('@')[0])}
                        </p>
                        <p className="text-[10px] text-gray-400 truncate">{user.email}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {isBlocked && <span className="text-[8px] font-bold text-red-400 bg-red-500/15 px-1.5 py-0.5 rounded-md">Užblokuotas</span>}
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-semibold border ${roleConfig.badge}`}>
                            {ROLE_LABELS[user.role || ''] || user.role || '?'}
                        </span>
                        {activityCount > 0 && (
                            <span className="bg-white/[0.08] text-gray-400 text-[9px] font-bold px-1.5 py-0.5 rounded-full tabular-nums">{activityCount}</span>
                        )}
                        <ChevronRight className={`w-3.5 h-3.5 transition-all duration-300 ${isExpanded ? 'text-teal-500 rotate-90' : isSelected ? 'text-teal-500' : 'text-gray-300'}`} />
                    </div>
                </button>
                {isExpanded && (
                    <div className="px-3 pb-3 space-y-2 border-t border-white/[0.06] pt-2">
                        <div className="grid grid-cols-2 gap-2 text-[9px]">
                            <div><span className="text-gray-500">El. paštas:</span> <span className="text-gray-300">{user.email}</span></div>
                            <div><span className="text-gray-500">Rolė:</span> <span className="text-gray-300">{ROLE_LABELS[user.role || ''] || '—'}</span></div>
                            <div><span className="text-gray-500">Pask. prisijungimas:</span> <span className="text-gray-300">{user.last_login ? new Date(user.last_login).toLocaleString('lt-LT') : 'Niekada'}</span></div>
                            <div><span className="text-gray-500">Registracija:</span> <span className="text-gray-300">{user.created_at ? new Date(user.created_at).toLocaleDateString('lt-LT') : '—'}</span></div>
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                            {user.role !== 'admin' && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onToggleBlock(user.id, !isBlocked); }}
                                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-bold transition-all ${isBlocked ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25' : 'bg-red-500/15 text-red-400 hover:bg-red-500/25'}`}
                                >
                                    {isBlocked ? <><ShieldCheck className="w-3 h-3" /> Atblokuoti</> : <><Ban className="w-3 h-3" /> Blokuoti</>}
                                </button>
                            )}
                            <select
                                value={user.role || ''}
                                onChange={(e) => { e.stopPropagation(); onChangeRole(user.id, e.target.value); }}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-white/[0.06] border border-white/[0.10] text-gray-300 text-[9px] font-semibold rounded-lg px-2 py-1.5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-teal-500/40"
                            >
                                <option value="landlord" className="bg-gray-900">Nuomotojas</option>
                                <option value="tenant" className="bg-gray-900">Nuomininkas</option>
                                <option value="admin" className="bg-gray-900">Administratorius</option>
                            </select>
                        </div>
                    </div>
                )}
            </div>
        );
    }
);
UserCard.displayName = 'UserCard';

// ─── Shimmer Skeleton ─── //
const ShimmerSkeleton = memo<{ className?: string }>(({ className = '' }) => (
    <div className={`relative overflow-hidden bg-white/[0.06] rounded-xl ${className}`}>
        <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/[0.08] to-transparent animate-[shimmer_1.5s_infinite]" />
    </div>
));
ShimmerSkeleton.displayName = 'ShimmerSkeleton';

// ─── Main Admin Dashboard ─── //
const AdminDashboard: React.FC = () => {
    const { user } = useAuth();
    const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
    const [users, setUsers] = useState<UserInfo[]>([]);
    const [kpi, setKpi] = useState<KPIData>({ totalUsers: 0, totalLandlords: 0, totalTenantUsers: 0, totalAddresses: 0, totalProperties: 0, totalInvoices: 0, paidInvoices: 0, unpaidInvoices: 0, activeMeters: 0, totalReadings: 0, activeTenants: 0, unreadNotifications: 0, totalPhotos: 0, totalDocuments: 0, pendingInvitations: 0, occupiedProperties: 0, totalContracts: 0, totalRevenue: 0, outstandingAmount: 0, occupancyRate: 0 });
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    // Contracts & Terminations
    const [contracts, setContracts] = useState<any[]>([]);
    const [contractHistory, setContractHistory] = useState<any[]>([]);
    const [terminations, setTerminations] = useState<any[]>([]);
    const [contractTab, setContractTab] = useState<'active' | 'pending' | 'history' | 'terminations'>('active');
    const [contractsLoading, setContractsLoading] = useState(false);

    // Filters
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [tableFilter, setTableFilter] = useState<string>('');
    const [actionFilter, setActionFilter] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

    // KPI drill-down with pagination
    const [activeKpi, setActiveKpi] = useState<string | null>(null);
    const [kpiDetail, setKpiDetail] = useState<Record<string, unknown>[]>([]);
    const [kpiDetailLoading, setKpiDetailLoading] = useState(false);
    const [kpiDetailLoadingMore, setKpiDetailLoadingMore] = useState(false);
    const [kpiDetailHasMore, setKpiDetailHasMore] = useState(false);
    const KPI_DETAIL_PAGE = 50;

    const activeKpiRef = React.useRef(activeKpi);
    activeKpiRef.current = activeKpi;

    // Fallback direct queries when RPC returns empty
    const fetchKpiDetailFallback = useCallback(async (kpiKey: string, limit: number): Promise<Record<string, unknown>[]> => {
        try {
            if (kpiKey === 'activeTenants') {
                const { data } = await supabase.from('tenant_invitations').select('id, full_name, email, phone, status, rent, deposit, contract_start, contract_end, property_label, invited_by_email, created_at').eq('status', 'accepted').order('created_at', { ascending: false }).limit(limit);
                return (data || []).map(d => ({ ...d, street: d.property_label }));
            }
            if (kpiKey === 'pendingInvitations') {
                const { data } = await supabase.from('tenant_invitations').select('id, full_name, email, phone, status, rent, deposit, contract_start, contract_end, property_label, expires_at, created_at').eq('status', 'pending').order('created_at', { ascending: false }).limit(limit);
                return (data || []).map(d => ({ ...d, street: d.property_label }));
            }
            if (kpiKey === 'totalUsers' || kpiKey === 'totalLandlords' || kpiKey === 'totalTenantUsers') {
                let q = supabase.from('users').select('id, email, role, first_name, last_name, is_active, last_login, created_at').order('created_at', { ascending: false }).limit(limit);
                if (kpiKey === 'totalLandlords') q = q.eq('role', 'landlord');
                if (kpiKey === 'totalTenantUsers') q = q.eq('role', 'tenant');
                const { data } = await q;
                return (data || []) as Record<string, unknown>[];
            }
            if (kpiKey === 'unreadNotifications') {
                const { data } = await supabase.from('notifications').select('id, body, kind, user_id, created_at, is_read').eq('is_read', false).order('created_at', { ascending: false }).limit(limit);
                return (data || []) as Record<string, unknown>[];
            }
            if (kpiKey === 'totalReadings') {
                const { data } = await supabase.from('meter_readings').select('id, meter_id, current_reading, previous_reading, reading_date, period, total_sum, type, property_id, properties:property_id(apartment_number, address_id)').order('reading_date', { ascending: false }).limit(limit);
                return (data || []).map((d: any) => ({ ...d, value: d.current_reading, meter_name: d.type || 'Skaitiklis', meter_unit: '', street: d.properties?.apartment_number ? `But. ${d.properties.apartment_number}` : '—' })) as Record<string, unknown>[];
            }
            if (kpiKey === 'activeMeters') {
                const { data } = await supabase.from('apartment_meters').select('id, name, type, unit, price_per_unit, is_active, property_id, properties:property_id(apartment_number, addresses:address_id(full_address, city))').eq('is_active', true).order('created_at', { ascending: false }).limit(limit);
                return (data || []).map((d: any) => ({ ...d, street: d.properties?.addresses?.full_address || d.properties?.apartment_number || '—' })) as Record<string, unknown>[];
            }
            if (kpiKey === 'totalAddresses') {
                const { data } = await supabase.from('addresses').select('id, full_address, street, city, building_type, total_apartments, user_id, created_at').order('created_at', { ascending: false }).limit(limit);
                // Enrich with owner email
                const userIds = [...new Set((data || []).map((d: any) => d.user_id).filter(Boolean))];
                let ownerMap = new Map<string, string>();
                if (userIds.length > 0) {
                    const { data: owners } = await supabase.from('users').select('id, email').in('id', userIds);
                    ownerMap = new Map((owners || []).map((o: any) => [o.id, o.email]));
                }
                return (data || []).map((d: any) => ({ ...d, owner_email: ownerMap.get(d.user_id) || null, property_count: d.total_apartments || 0 })) as Record<string, unknown>[];
            }
            if (kpiKey === 'totalProperties' || kpiKey === 'occupiedProperties') {
                let q = supabase.from('properties').select('id, apartment_number, status, rooms, area, rent, deposit_amount, address_id, addresses:address_id(full_address, street, city)').order('created_at', { ascending: false }).limit(limit);
                if (kpiKey === 'occupiedProperties') q = q.eq('status', 'occupied');
                const { data } = await q;
                // Enrich with tenant name from accepted invitations
                const propIds = (data || []).map((d: any) => d.id);
                let tenantMap = new Map<string, string>();
                if (propIds.length > 0) {
                    const { data: tenants } = await supabase.from('tenant_invitations').select('property_id, full_name, email').eq('status', 'accepted').in('property_id', propIds);
                    tenantMap = new Map((tenants || []).map((t: any) => [t.property_id, t.full_name || t.email]));
                }
                return (data || []).map((d: any) => ({ ...d, street: (d.addresses as any)?.full_address || (d.addresses as any)?.street || '—', tenant_name: tenantMap.get(d.id) || null })) as Record<string, unknown>[];
            }
            if (kpiKey === 'totalInvoices' || kpiKey === 'paidInvoices' || kpiKey === 'unpaidInvoices') {
                let q = supabase.from('invoices').select('id, invoice_number, amount, rent_amount, utilities_amount, other_amount, status, invoice_date, due_date, paid_date, paid_amount, payment_method, late_fee, notes, property_id, tenant_id, properties:property_id(apartment_number, rent, deposit_amount, addresses:address_id(full_address, city))').order('invoice_date', { ascending: false }).limit(limit);
                if (kpiKey === 'paidInvoices') q = q.eq('status', 'paid');
                if (kpiKey === 'unpaidInvoices') q = q.eq('status', 'unpaid');
                const { data } = await q;
                // Enrich with tenant name and address
                const propIds = (data || []).filter((d: any) => d.property_id).map((d: any) => d.property_id);
                let tenantMap = new Map<string, string>();
                if (propIds.length > 0) {
                    const { data: tenants } = await supabase.from('tenant_invitations').select('property_id, full_name, email').eq('status', 'accepted').in('property_id', propIds);
                    tenantMap = new Map((tenants || []).map((t: any) => [t.property_id, t.full_name || t.email]));
                }
                return (data || []).map((d: any) => ({
                    ...d,
                    street: (d.properties as any)?.addresses?.full_address || '',
                    apartment_number: (d.properties as any)?.apartment_number || '',
                    tenant_name: tenantMap.get(d.property_id) || null,
                })) as Record<string, unknown>[];
            }
        } catch { /* ignore */ }
        return [];
    }, []);

    const fetchKpiDetail = useCallback(async (kpiKey: string) => {
        if (activeKpiRef.current === kpiKey) { setActiveKpi(null); return; }
        setActiveKpi(kpiKey);
        setKpiDetailLoading(true);
        try {
            const { data, error } = await supabase.rpc('get_admin_kpi_detail', { kpi_key: kpiKey, page_offset: 0, page_limit: KPI_DETAIL_PAGE });
            if (error) throw error;
            let arr = Array.isArray(data) ? data : [];
            // Fallback if RPC returned empty but KPI count is > 0
            if (arr.length === 0) {
                arr = await fetchKpiDetailFallback(kpiKey, KPI_DETAIL_PAGE);
            }
            setKpiDetail(arr);
            setKpiDetailHasMore(arr.length >= KPI_DETAIL_PAGE);
        } catch (err) {
            if (import.meta.env.DEV) console.error('KPI detail fetch error:', err);
            // Try fallback on RPC error
            const fallback = await fetchKpiDetailFallback(kpiKey, KPI_DETAIL_PAGE);
            setKpiDetail(fallback);
            setKpiDetailHasMore(fallback.length >= KPI_DETAIL_PAGE);
        } finally {
            setKpiDetailLoading(false);
        }
    }, [fetchKpiDetailFallback]);

    const loadMoreKpiDetail = useCallback(async () => {
        const key = activeKpiRef.current;
        if (!key || kpiDetailLoadingMore || !kpiDetailHasMore) return;
        setKpiDetailLoadingMore(true);
        try {
            const { data, error } = await supabase.rpc('get_admin_kpi_detail', {
                kpi_key: key, page_offset: kpiDetail.length, page_limit: KPI_DETAIL_PAGE
            });
            if (error) throw error;
            const arr = Array.isArray(data) ? data : [];
            setKpiDetail(prev => [...prev, ...arr]);
            setKpiDetailHasMore(arr.length >= KPI_DETAIL_PAGE);
        } catch (err) {
            if (import.meta.env.DEV) console.error('KPI detail load more error:', err);
        } finally {
            setKpiDetailLoadingMore(false);
        }
    }, [kpiDetail.length, kpiDetailLoadingMore, kpiDetailHasMore]);

    const handleKpiDetailScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        const el = e.currentTarget;
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 60) {
            loadMoreKpiDetail();
        }
    }, [loadMoreKpiDetail]);

    // Build query with filters
    const buildLogQuery = useCallback((offset = 0) => {
        let q = supabase
            .from('audit_log')
            .select('*')
            .order('created_at', { ascending: sortOrder === 'asc' })
            .range(offset, offset + PAGE_SIZE - 1);

        if (selectedUserId) q = q.eq('user_id', selectedUserId);
        if (tableFilter) q = q.eq('table_name', tableFilter);
        if (actionFilter) q = q.eq('action', actionFilter);

        return q;
    }, [sortOrder, selectedUserId, tableFilter, actionFilter]);

    // Initial load — optimized: single RPC for all KPI counts
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // Only 3 queries instead of 15: logs + users + single RPC for all counts
            const [logsRes, usersRes, kpiRes] = await Promise.all([
                buildLogQuery(0),
                supabase.from('users').select('id, email, role, first_name, last_name, nickname, is_active, last_login, created_at'),
                supabase.rpc('get_admin_kpi_stats'),
            ]);

            if (logsRes.data) {
                setAuditLogs(logsRes.data);
                setHasMore(logsRes.data.length === PAGE_SIZE);
            }
            if (usersRes.data) {
                setUsers(usersRes.data);
            }

            const allUsers = usersRes.data ?? [];
            const stats = kpiRes.data || {};
            setKpi({
                totalUsers: allUsers.length,
                totalLandlords: allUsers.filter(u => u.role === 'landlord').length,
                totalTenantUsers: allUsers.filter(u => u.role === 'tenant').length,
                totalAddresses: stats.total_addresses ?? 0,
                totalProperties: stats.total_properties ?? 0,
                totalInvoices: stats.total_invoices ?? 0,
                paidInvoices: stats.paid_invoices ?? 0,
                unpaidInvoices: stats.unpaid_invoices ?? 0,
                activeMeters: stats.active_meters ?? 0,
                totalReadings: stats.total_readings ?? 0,
                activeTenants: stats.active_tenants ?? 0,
                unreadNotifications: stats.unread_notifications ?? 0,
                totalPhotos: stats.total_photos ?? 0,
                totalDocuments: stats.total_documents ?? 0,
                pendingInvitations: stats.pending_invitations ?? 0,
                occupiedProperties: stats.occupied_properties ?? 0,
                totalContracts: 0, totalRevenue: 0, outstandingAmount: 0, occupancyRate: 0, // updated by fetchContracts
            });
        } catch (err) {
            if (import.meta.env.DEV) console.error('Admin fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [buildLogQuery]);

    // Fetch contracts data
    const fetchContracts = useCallback(async () => {
        setContractsLoading(true);
        try {
            const [invRes, histRes, addrRes, termRes] = await Promise.all([
                supabase.from('tenant_invitations').select('*, properties:property_id(id, apartment_number, address_id)').order('created_at', { ascending: false }).limit(200),
                supabase.from('tenant_history').select('*').order('created_at', { ascending: false }).limit(100),
                supabase.from('addresses').select('id, full_address, city'),
                supabase.from('properties').select('id, apartment_number, status, termination_status, termination_date, termination_reason, termination_requested_at, termination_requested_by, termination_confirmed_at, deposit_amount, deposit_paid_amount, rent, address_id').not('termination_status', 'is', null).order('termination_requested_at', { ascending: false }).limit(100),
            ]);
            // Enrich invitations with address info
            const addrMap = new Map((addrRes.data || []).map((a: any) => [a.id, a]));
            const enriched = (invRes.data || []).map((inv: any) => {
                const addrId = inv.properties?.address_id;
                const addr = addrId ? addrMap.get(addrId) : null;
                return { ...inv, _address: addr, _aptNum: inv.properties?.apartment_number };
            });
            setContracts(enriched);
            if (histRes.data) setContractHistory(histRes.data);
            // Enrich terminations with address
            const enrichedTerms = (termRes.data || []).map((t: any) => ({ ...t, _address: addrMap.get(t.address_id) }));
            setTerminations(enrichedTerms);

            // Calculate financial metrics
            const accepted = enriched.filter((c: any) => c.status === 'accepted');
            const totalMonthlyRent = accepted.reduce((sum: number, c: any) => sum + (Number(c.rent) || 0), 0);
            // Fetch invoice totals for financial overview
            const [paidRes, unpaidRes] = await Promise.all([
                supabase.from('invoices').select('amount').eq('status', 'paid'),
                supabase.from('invoices').select('amount').eq('status', 'unpaid'),
            ]);
            const totalPaid = (paidRes.data || []).reduce((s: number, i: any) => s + (Number(i.amount) || 0), 0);
            const totalUnpaid = (unpaidRes.data || []).reduce((s: number, i: any) => s + (Number(i.amount) || 0), 0);

            setKpi(prev => ({
                ...prev,
                totalContracts: accepted.length,
                totalRevenue: totalPaid,
                outstandingAmount: totalUnpaid,
                occupancyRate: prev.totalProperties > 0 ? Math.round((prev.occupiedProperties / prev.totalProperties) * 100) : 0,
            }));
        } catch (err) {
            if (import.meta.env.DEV) console.error('Contracts fetch error:', err);
        } finally {
            setContractsLoading(false);
        }
    }, []);

    // Load more (pagination)
    const loadMore = useCallback(async () => {
        if (loadingMore || !hasMore) return;
        setLoadingMore(true);
        try {
            const res = await buildLogQuery(auditLogs.length);
            if (res.data) {
                setAuditLogs(prev => [...prev, ...res.data!]);
                setHasMore(res.data.length === PAGE_SIZE);
            }
        } finally {
            setLoadingMore(false);
        }
    }, [buildLogQuery, auditLogs.length, loadingMore, hasMore]);

    useEffect(() => {
        fetchData();
        fetchContracts();
    }, [fetchData, fetchContracts]);

    // Count activities per user
    const userActivityCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        auditLogs.forEach(log => {
            if (log.user_id) {
                counts[log.user_id] = (counts[log.user_id] || 0) + 1;
            }
        });
        return counts;
    }, [auditLogs]);

    // Client-side search filter
    const filteredLogs = useMemo(() => {
        if (!searchQuery) return auditLogs;
        const q = searchQuery.toLowerCase();
        return auditLogs.filter(
            (log) =>
                log.user_email?.toLowerCase().includes(q) ||
                log.description?.toLowerCase().includes(q) ||
                log.table_name.toLowerCase().includes(q)
        );
    }, [auditLogs, searchQuery]);

    // Selected user info
    const selectedUser = useMemo(() => {
        if (!selectedUserId) return null;
        return users.find(u => u.id === selectedUserId) || null;
    }, [selectedUserId, users]);

    // Expanded user detail
    const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
    // Expanded KPI detail row
    const [expandedDetailId, setExpandedDetailId] = useState<string | null>(null);

    // Handle user selection (toggle)
    const handleUserClick = useCallback((userId: string) => {
        setSelectedUserId(prev => prev === userId ? null : userId);
        setExpandedUserId(prev => prev === userId ? null : userId);
    }, []);

    // Block/unblock user
    const handleToggleBlock = useCallback(async (userId: string, block: boolean) => {
        if (!confirm(block ? 'Ar tikrai norite užblokuoti šį vartotoją?' : 'Ar tikrai norite atblokuoti šį vartotoją?')) return;
        const { error } = await supabase.from('users').update({ is_active: !block }).eq('id', userId);
        if (error) { alert('Klaida: ' + error.message); return; }
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: !block } : u));
        logAuditEvent(userId, 'users', 'UPDATE', block ? `Vartotojas užblokuotas` : `Vartotojas atblokuotas`, { is_active: !block }).catch(() => {});
    }, []);

    // Change user role
    const handleChangeRole = useCallback(async (userId: string, newRole: string) => {
        if (!confirm(`Pakeisti rolę į "${ROLE_LABELS[newRole] || newRole}"?`)) return;
        const { error } = await supabase.from('users').update({ role: newRole }).eq('id', userId);
        if (error) { alert('Klaida: ' + error.message); return; }
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
        logAuditEvent(userId, 'users', 'UPDATE', `Vartotojo rolė pakeista: ${ROLE_LABELS[newRole] || newRole}`, { role: newRole }).catch(() => {});
    }, []);

    // Computed contract lists
    const activeContracts = useMemo(() => contracts.filter(c => c.status === 'accepted'), [contracts]);
    const pendingContracts = useMemo(() => contracts.filter(c => c.status === 'pending' && c.expires_at && new Date(c.expires_at) > new Date()), [contracts]);
    const contractTabItems = contractTab === 'active' ? activeContracts : contractTab === 'pending' ? pendingContracts : contractTab === 'terminations' ? terminations : contractHistory;

    if (loading) {
        return (
            <div className="min-h-full relative overflow-hidden bg-cover bg-center bg-fixed" style={{ backgroundImage: `url('/imagesGen/DashboardImage.webp')` }}>
                <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(3,12,10,0.92) 0%, rgba(6,20,18,0.88) 40%, rgba(8,25,22,0.85) 70%, rgba(3,12,10,0.92) 100%)' }} />
                <div className="relative z-10 p-4 lg:p-6 space-y-5">
                    {/* Shimmer header */}
                    <div className="flex items-center gap-4">
                        <ShimmerSkeleton className="w-12 h-12 !rounded-2xl" />
                        <div className="space-y-2">
                            <ShimmerSkeleton className="h-5 w-48" />
                            <ShimmerSkeleton className="h-3 w-32" />
                        </div>
                    </div>
                    {/* Shimmer KPI row */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className={`${glassCard} p-4`}>
                                <div className="flex items-center gap-3.5">
                                    <ShimmerSkeleton className="w-11 h-11 !rounded-xl" />
                                    <div className="space-y-2">
                                        <ShimmerSkeleton className="h-6 w-14" />
                                        <ShimmerSkeleton className="h-3 w-20" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {[5, 6, 7, 8].map((i) => (
                            <div key={i} className={`${glassCard} p-4`}>
                                <div className="flex items-center gap-3.5">
                                    <ShimmerSkeleton className="w-11 h-11 !rounded-xl" />
                                    <div className="space-y-2">
                                        <ShimmerSkeleton className="h-6 w-14" />
                                        <ShimmerSkeleton className="h-3 w-20" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    {/* Shimmer content */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                        <div className={`${panelCard} p-4 space-y-3`}>
                            <ShimmerSkeleton className="h-5 w-32" />
                            {[1, 2, 3].map((i) => (
                                <ShimmerSkeleton key={i} className="h-14 w-full" />
                            ))}
                        </div>
                        <div className={`${panelCard} p-4 lg:col-span-2 space-y-3`}>
                            <ShimmerSkeleton className="h-5 w-48" />
                            {[1, 2, 3, 4, 5].map((i) => (
                                <ShimmerSkeleton key={i} className="h-16 w-full" />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-full relative overflow-hidden bg-cover bg-center bg-fixed" style={{ backgroundImage: `url('/imagesGen/DashboardImage.webp')` }}>
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(3,12,10,0.92) 0%, rgba(6,20,18,0.88) 40%, rgba(8,25,22,0.85) 70%, rgba(3,12,10,0.92) 100%)' }} />
            <div className="relative z-10 p-4 lg:p-6 space-y-5 max-w-7xl mx-auto">

                {/* ─── Hero Header ─── */}
                <div className={`${panelCard} p-5 relative overflow-hidden`}>
                    {/* Decorative gradient blobs */}
                    <div className="absolute -top-12 -right-12 w-40 h-40 bg-gradient-to-br from-purple-500/15 to-violet-500/10 rounded-full blur-3xl" />
                    <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-gradient-to-br from-teal-500/10 to-cyan-500/8 rounded-full blur-3xl" />

                    <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
                                <Shield className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-[18px] font-extrabold text-white tracking-tight">Administravimo panelė</h1>
                                <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1.5">
                                    <Zap className="w-3 h-3 text-teal-500" />
                                    {selectedUser
                                        ? `${selectedUser.first_name || selectedUser.email.split('@')[0]} veiksmai`
                                        : 'Visos sistemos veikla ir statistika'}
                                </p>
                            </div>
                        </div>
                        <a
                            href="/admin/performance"
                            className="flex items-center gap-2 px-4 py-2 bg-white/[0.06] hover:bg-white/[0.10] text-gray-300 hover:text-white text-[11px] font-bold rounded-xl transition-all duration-200 border border-white/[0.08]"
                        >
                            <BarChart3 className="w-3.5 h-3.5" />
                            Našumas
                        </a>
                        <button
                            onClick={fetchData}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-[11px] font-bold rounded-xl hover:from-teal-600 hover:to-emerald-600 transition-all duration-300 active:scale-[0.97] shadow-lg shadow-teal-500/25"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Atnaujinti
                        </button>
                    </div>
                </div>

                {/* ─── Financial Overview ─── */}
                <div className={`${panelCard} p-5`}>
                    <div className="flex items-center gap-2.5 mb-4">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-md shadow-emerald-500/20">
                            <CircleDollarSign className="w-4 h-4 text-white" />
                        </div>
                        <h2 className="text-[13px] font-bold text-white">Finansinė apžvalga</h2>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
                            <p className="text-[10px] text-emerald-400 font-medium">Surinkta pajamų</p>
                            <p className="text-[22px] font-extrabold text-white mt-1 tabular-nums">€{kpi.totalRevenue.toLocaleString('lt-LT', { minimumFractionDigits: 0 })}</p>
                        </div>
                        <div className={`${kpi.outstandingAmount > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-emerald-500/10 border-emerald-500/20'} border rounded-xl px-4 py-3`}>
                            <p className={`text-[10px] ${kpi.outstandingAmount > 0 ? 'text-red-400' : 'text-emerald-400'} font-medium`}>Nesumokėta</p>
                            <p className="text-[22px] font-extrabold text-white mt-1 tabular-nums">€{kpi.outstandingAmount.toLocaleString('lt-LT', { minimumFractionDigits: 0 })}</p>
                        </div>
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3">
                            <p className="text-[10px] text-blue-400 font-medium">Užimtumas</p>
                            <p className="text-[22px] font-extrabold text-white mt-1 tabular-nums">{kpi.occupancyRate}%</p>
                            <p className="text-[9px] text-gray-500 mt-0.5">{kpi.occupiedProperties} iš {kpi.totalProperties} butų</p>
                        </div>
                        <div className="bg-teal-500/10 border border-teal-500/20 rounded-xl px-4 py-3">
                            <p className="text-[10px] text-teal-400 font-medium">Mėn. nuoma (aktyvios)</p>
                            <p className="text-[22px] font-extrabold text-white mt-1 tabular-nums">€{activeContracts.reduce((s, c: any) => s + (Number(c.rent) || 0), 0).toLocaleString('lt-LT', { minimumFractionDigits: 0 })}</p>
                            <p className="text-[9px] text-gray-500 mt-0.5">{activeContracts.length} sutartys</p>
                        </div>
                    </div>
                </div>

                {/* ─── KPI Cards — Row 1: Users ─── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {KPI_ROW1.map(cfg => (
                        <KPICard
                            key={cfg.key}
                            icon={cfg.icon}
                            label={cfg.label}
                            value={kpi[cfg.key as keyof KPIData]}
                            gradient={cfg.gradient}
                            bgLight={cfg.bgLight}
                            textColor={cfg.textColor}
                            onClick={() => fetchKpiDetail(cfg.key)}
                            isActive={activeKpi === cfg.key}
                        />
                    ))}
                </div>

                {/* ─── KPI Cards — Row 2: Properties & Invoices ─── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {KPI_ROW2.map(cfg => (
                        <KPICard
                            key={cfg.key}
                            icon={cfg.icon}
                            label={cfg.label}
                            value={kpi[cfg.key as keyof KPIData]}
                            gradient={cfg.gradient}
                            bgLight={cfg.bgLight}
                            textColor={cfg.textColor}
                            onClick={() => fetchKpiDetail(cfg.key)}
                            isActive={activeKpi === cfg.key}
                        />
                    ))}
                </div>

                {/* ─── KPI Cards — Row 3: Operations ─── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {KPI_ROW3.map(cfg => (
                        <KPICard
                            key={cfg.key}
                            icon={cfg.icon}
                            label={cfg.label}
                            value={kpi[cfg.key as keyof KPIData]}
                            gradient={cfg.gradient}
                            bgLight={cfg.bgLight}
                            textColor={cfg.textColor}
                            onClick={() => fetchKpiDetail(cfg.key)}
                            isActive={activeKpi === cfg.key}
                        />
                    ))}
                </div>

                {/* ─── Sutartys KPI ─── */}
                <div className={`${panelCard} p-4`}>
                    <div className="flex items-center gap-2.5 mb-3">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-md shadow-teal-500/20">
                            <ScrollText className="w-3.5 h-3.5 text-white" />
                        </div>
                        <h2 className="text-[13px] font-bold text-white">Sutartys ir nutraukimai</h2>
                    </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <KPICard
                        icon={ScrollText}
                        label="Aktyvios sutartys"
                        value={activeContracts.length}
                        gradient="from-teal-500 to-cyan-600"
                        bgLight="bg-teal-50"
                        textColor="text-teal-600"
                        onClick={() => setActiveKpi(prev => prev === 'totalContracts' ? null : 'totalContracts')}
                        isActive={activeKpi === 'totalContracts'}
                    />
                    <KPICard
                        icon={Clock}
                        label="Laukiančios"
                        value={pendingContracts.length}
                        gradient="from-amber-500 to-orange-600"
                        bgLight="bg-amber-50"
                        textColor="text-amber-600"
                        onClick={() => { setContractTab('pending'); setActiveKpi(prev => prev === 'totalContracts' ? null : 'totalContracts'); }}
                        isActive={activeKpi === 'totalContracts' && contractTab === 'pending'}
                    />
                    <KPICard
                        icon={FileText}
                        label="Sutarčių istorija"
                        value={contractHistory.length}
                        gradient="from-gray-500 to-slate-600"
                        bgLight="bg-gray-50"
                        textColor="text-gray-600"
                        onClick={() => { setContractTab('history'); setActiveKpi(prev => prev === 'totalContracts' ? null : 'totalContracts'); }}
                        isActive={activeKpi === 'totalContracts' && contractTab === 'history'}
                    />
                    <KPICard
                        icon={AlertCircle}
                        label="Nutraukimai"
                        value={terminations.length}
                        gradient="from-red-500 to-rose-600"
                        bgLight="bg-red-50"
                        textColor="text-red-600"
                        onClick={() => { setContractTab('terminations' as any); setActiveKpi(prev => prev === 'totalContracts' ? null : 'totalContracts'); }}
                        isActive={activeKpi === 'totalContracts' && contractTab === ('terminations' as any)}
                    />
                </div>
                </div>

                {/* ─── Contracts Detail Panel ─── */}
                {activeKpi === 'totalContracts' && (
                    <div className={`${panelCard} p-5 transition-all duration-300`}>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-md">
                                    <ScrollText className="w-4 h-4 text-white" />
                                </div>
                                <h2 className="text-[13px] font-bold text-white">Sutartys</h2>
                                <span className="text-[10px] text-gray-400 bg-white/[0.06] px-2 py-0.5 rounded-full font-semibold">{contractTabItems.length}</span>
                            </div>
                            <div className="flex items-center gap-1 bg-white/[0.04] rounded-lg p-0.5">
                                {([['active', 'Aktyvios'], ['pending', 'Laukiančios'], ['history', 'Istorija'], ['terminations', 'Nutraukimai']] as const).map(([key, label]) => (
                                    <button key={key} onClick={() => setContractTab(key)} className={`px-3 py-1.5 text-[10px] font-semibold rounded-md transition-all ${contractTab === key ? 'bg-teal-500/20 text-teal-400' : 'text-gray-400 hover:text-white hover:bg-white/[0.06]'}`}>
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {contractsLoading ? (
                            <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-teal-400" /></div>
                        ) : contractTabItems.length === 0 ? (
                            <p className="text-[11px] text-gray-500 text-center py-6">Nėra sutarčių šioje kategorijoje</p>
                        ) : (
                            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin">
                                {contractTab === 'terminations' ? contractTabItems.map((t: any) => {
                                    const addr = t._address;
                                    const statusMap: Record<string, { label: string; color: string }> = {
                                        pending: { label: 'Prašoma', color: 'text-amber-400 bg-amber-500/15' },
                                        confirmed: { label: 'Patvirtinta', color: 'text-red-400 bg-red-500/15' },
                                        rejected: { label: 'Atmesta', color: 'text-gray-400 bg-gray-500/15' },
                                        cancelled: { label: 'Atšaukta', color: 'text-gray-400 bg-gray-500/15' },
                                        completed: { label: 'Užbaigta', color: 'text-emerald-400 bg-emerald-500/15' },
                                    };
                                    const ts = statusMap[String(t.termination_status)] || { label: String(t.termination_status), color: 'text-gray-400 bg-gray-500/15' };
                                    const deposit = Number(t.deposit_amount) || 0;
                                    const depositPaid = Number(t.deposit_paid_amount) || 0;

                                    return (
                                        <div key={t.id} className="bg-white/[0.06] rounded-xl border border-white/[0.08] px-4 py-3 hover:bg-white/[0.10] transition-colors space-y-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center flex-shrink-0">
                                                        <AlertCircle className="w-4 h-4 text-red-500" />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-[12px] font-semibold text-white truncate">
                                                            {addr?.full_address || '—'}{t.apartment_number ? `, but. ${t.apartment_number}` : ''}
                                                        </p>
                                                        <p className="text-[9px] text-gray-400 mt-0.5">
                                                            Iniciatorius: {t.termination_requested_by === 'tenant' ? 'Nuomininkas' : t.termination_requested_by === 'landlord' ? 'Nuomotojas' : t.termination_requested_by || '—'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 flex-shrink-0">
                                                    <div className="text-right">
                                                        {t.termination_date && (
                                                            <div className="flex items-center gap-1.5 text-[10px] text-gray-300">
                                                                <Calendar className="w-3 h-3 text-gray-500" />
                                                                {new Date(t.termination_date).toLocaleDateString('lt-LT')}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <span className={`text-[9px] font-bold px-2 py-1 rounded-lg ${ts.color}`}>{ts.label}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 pl-11 text-[9px] text-gray-500 flex-wrap">
                                                {t.termination_reason && <span>Priežastis: <span className="text-gray-300">{t.termination_reason}</span></span>}
                                                {deposit > 0 && <span>Depozitas: <span className="text-gray-300">€{deposit}</span></span>}
                                                {depositPaid > 0 && <span>Grąžinta: <span className="text-emerald-400">€{depositPaid}</span></span>}
                                                {deposit > 0 && deposit !== depositPaid && <span>Išskaičiuota: <span className="text-red-400">€{deposit - depositPaid}</span></span>}
                                                {t.termination_requested_at && <span>Prašyta: {new Date(t.termination_requested_at).toLocaleDateString('lt-LT')}</span>}
                                                {t.termination_confirmed_at && <span>Patvirtinta: {new Date(t.termination_confirmed_at).toLocaleDateString('lt-LT')}</span>}
                                                {t.rent > 0 && <span>Nuoma buvo: €{Number(t.rent)}</span>}
                                            </div>
                                            {/* Deposit warning */}
                                            {deposit > 0 && depositPaid === 0 && t.termination_status === 'confirmed' && (
                                                <div className="flex items-center gap-2 pl-11 mt-1">
                                                    <span className="flex items-center gap-1 text-[9px] font-bold text-amber-400 bg-amber-500/10 px-2 py-1 rounded-lg">
                                                        <AlertTriangle className="w-3 h-3" />
                                                        Depozitas negrąžintas — €{deposit}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                }) : (contractTab === 'active' || contractTab === 'pending') ? contractTabItems.map((c: any) => {
                                    const addr = c._address;
                                    const aptNum = c._aptNum;
                                    const isExpired = c.contract_end && new Date(c.contract_end) < new Date();
                                    const isEndingSoon = c.contract_end && !isExpired && new Date(c.contract_end) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                                    const statusColor = c.status === 'pending' ? 'text-amber-400 bg-amber-500/15' : isExpired ? 'text-red-400 bg-red-500/15' : isEndingSoon ? 'text-yellow-400 bg-yellow-500/15' : 'text-emerald-400 bg-emerald-500/15';
                                    const statusLabel = c.status === 'pending' ? 'Laukiama' : isExpired ? 'Pasibaigusi' : isEndingSoon ? 'Baigiasi' : 'Aktyvi';
                                    return (
                                        <div key={c.id} className="bg-white/[0.06] rounded-xl border border-white/[0.08] px-4 py-3 hover:bg-white/[0.10] transition-colors">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    <div className="w-8 h-8 rounded-lg bg-teal-500/15 flex items-center justify-center flex-shrink-0">
                                                        <UserPlus className="w-4 h-4 text-teal-500" />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-[12px] font-semibold text-white truncate">{c.full_name || c.email}</p>
                                                        <p className="text-[9px] text-gray-400 mt-0.5 truncate">{addr?.full_address || '—'}{aptNum ? `, but. ${aptNum}` : ''} · {addr?.city || ''}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 flex-shrink-0">
                                                    <div className="text-right">
                                                        <div className="flex items-center gap-1.5 text-[10px] text-gray-300">
                                                            <Calendar className="w-3 h-3 text-gray-500" />
                                                            {c.contract_start ? new Date(c.contract_start).toLocaleDateString('lt-LT') : '—'} — {c.contract_end ? new Date(c.contract_end).toLocaleDateString('lt-LT') : '—'}
                                                        </div>
                                                        <div className="flex items-center gap-3 mt-1 justify-end">
                                                            {c.rent > 0 && <span className="text-[10px] font-bold text-white">€{Number(c.rent)}</span>}
                                                            {c.deposit > 0 && <span className="text-[9px] text-gray-400">Dep: €{Number(c.deposit)}</span>}
                                                        </div>
                                                    </div>
                                                    <span className={`text-[9px] font-bold px-2 py-1 rounded-lg ${statusColor}`}>{statusLabel}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 mt-2 pl-11 text-[9px] text-gray-500">
                                                {c.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{c.email}</span>}
                                                {c.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</span>}
                                                {c.invited_by_email && <span>Nuomotojas: {c.invited_by_email}</span>}
                                                {c.property_label && <span className="flex items-center gap-1"><Home className="w-3 h-3" />{c.property_label}</span>}
                                            </div>
                                        </div>
                                    );
                                }) : contractTabItems.map((h: any) => (
                                    <div key={h.id} className="bg-white/[0.06] rounded-xl border border-white/[0.08] px-4 py-3 hover:bg-white/[0.10] transition-colors">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <div className="w-8 h-8 rounded-lg bg-gray-500/15 flex items-center justify-center flex-shrink-0">
                                                    <Clock className="w-4 h-4 text-gray-400" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[12px] font-semibold text-white truncate">{h.tenant_name || h.tenant_email || '—'}</p>
                                                    <p className="text-[9px] text-gray-400 mt-0.5">{h.tenant_email || ''} {h.tenant_phone ? `· ${h.tenant_phone}` : ''}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 flex-shrink-0">
                                                <div className="text-right">
                                                    <div className="flex items-center gap-1.5 text-[10px] text-gray-300">
                                                        <Calendar className="w-3 h-3 text-gray-500" />
                                                        {h.contract_start ? new Date(h.contract_start).toLocaleDateString('lt-LT') : '—'} — {h.contract_end ? new Date(h.contract_end).toLocaleDateString('lt-LT') : '—'}
                                                    </div>
                                                    {h.rent > 0 && <p className="text-[10px] font-bold text-white mt-1">€{Number(h.rent)}</p>}
                                                </div>
                                                <span className="text-[9px] font-bold px-2 py-1 rounded-lg text-gray-400 bg-gray-500/15">
                                                    {h.end_reason === 'expired' ? 'Pasibaigė' : h.end_reason === 'moved_out' ? 'Išsikraustė' : h.end_reason === 'evicted' ? 'Iškeldinta' : h.end_reason === 'mutual' ? 'Abipusis' : h.end_reason || 'Baigta'}
                                                </span>
                                            </div>
                                        </div>
                                        {h.notes && <p className="text-[9px] text-gray-500 mt-2 pl-11">Pastaba: {h.notes}</p>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ─── KPI Detail Panel ─── */}
                {activeKpi && activeKpi !== 'totalContracts' && (
                    <div className={`${panelCard} p-5 transition-all duration-300`}>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-md">
                                    <Eye className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-[13px] font-bold text-white">
                                        {[...KPI_ROW1, ...KPI_ROW2, ...KPI_ROW3].find(k => k.key === activeKpi)?.label || 'Detalės'}
                                    </h2>
                                    <p className="text-[9px] text-gray-400">{kpiDetail.length} įrašų</p>
                                </div>
                            </div>
                            <button onClick={() => setActiveKpi(null)} className="w-7 h-7 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] flex items-center justify-center transition-colors">
                                <X className="w-3.5 h-3.5 text-gray-400" />
                            </button>
                        </div>

                        {kpiDetailLoading ? (
                            <div className="space-y-2">
                                {[1, 2, 3].map(i => <div key={i} className="h-10 bg-white/[0.04] rounded-lg animate-pulse" />)}
                            </div>
                        ) : kpiDetail.length === 0 ? (
                            <p className="text-[11px] text-gray-400 text-center py-6">Nėra duomenų</p>
                        ) : (
                            <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1" onScroll={handleKpiDetailScroll}>
                                {kpiDetail.map((item, idx) => {
                                    const r = item as Record<string, unknown>;
                                    // Smart rendering per KPI type
                                    if (activeKpi?.includes('Invoice') || activeKpi?.includes('invoice') || activeKpi === 'totalInvoices' || activeKpi === 'paidInvoices' || activeKpi === 'unpaidInvoices') {
                                        const statusMap: Record<string, { label: string; color: string }> = {
                                            paid: { label: 'Apmokėta', color: 'text-emerald-400 bg-emerald-500/15' },
                                            unpaid: { label: 'Neapmokėta', color: 'text-amber-400 bg-amber-500/15' },
                                            overdue: { label: 'Pradelsta', color: 'text-red-400 bg-red-500/15' },
                                            pending: { label: 'Laukiama', color: 'text-amber-400 bg-amber-500/15' },
                                            sent: { label: 'Išsiųsta', color: 'text-blue-400 bg-blue-500/15' },
                                        };
                                        const s = statusMap[String(r.status)] || { label: String(r.status), color: 'text-gray-400 bg-white/[0.08]' };

                                        // Late fee calculation
                                        const dueDate = r.due_date ? new Date(String(r.due_date)) : null;
                                        const graceDays = Number(r.grace_period_days) || 0;
                                        const lateFeePerDay = Number(r.late_payment_fee) || 0;
                                        const paymentDay = Number(r.payment_day) || 0;
                                        const isUnpaid = ['unpaid', 'overdue', 'pending', 'sent'].includes(String(r.status));

                                        let overdueDays = 0;
                                        let lateFeeTotal = 0;
                                        if (isUnpaid && dueDate && lateFeePerDay > 0) {
                                            const now = new Date();
                                            const feeStartDate = new Date(dueDate);
                                            feeStartDate.setDate(feeStartDate.getDate() + graceDays);
                                            if (now > feeStartDate) {
                                                overdueDays = Math.floor((now.getTime() - feeStartDate.getTime()) / (1000 * 60 * 60 * 24));
                                                lateFeeTotal = overdueDays * lateFeePerDay;
                                            }
                                        }

                                        const rentAmt = Number(r.rent_amount || 0);
                                        const utilAmt = Number(r.utilities_amount || 0);
                                        const totalAmt = Number(r.amount || 0);

                                        const isExp = expandedDetailId === String(r.id || idx);
                                        const fmtEur = (v: number) => new Intl.NumberFormat('lt-LT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(v);
                                        return (
                                            <div key={idx} className="bg-white/[0.04] rounded-xl border border-white/[0.06] hover:bg-white/[0.08] transition-all overflow-hidden">
                                                <button onClick={() => setExpandedDetailId(isExp ? null : String(r.id || idx))} className="w-full px-4 py-3 flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center flex-shrink-0"><Receipt className="w-4 h-4 text-amber-500" /></div>
                                                    <div className="flex-1 min-w-0 text-left">
                                                        <p className="text-[12px] font-semibold text-white truncate">
                                                            {r.invoice_number ? String(r.invoice_number) : `Sąskaita #${idx + 1}`}
                                                            {r.street ? <span className="text-gray-400 font-normal"> — {String(r.street)}{r.apartment_number ? `, ${String(r.apartment_number)}` : ''}</span> : ''}
                                                        </p>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-md ${s.color}`}>{s.label}</span>
                                                            {Boolean(r.invoice_date) && <span className="text-[9px] text-gray-500">Išrašyta: {new Date(String(r.invoice_date)).toLocaleDateString('lt-LT')}</span>}
                                                            {Boolean(r.tenant_name) && <span className="text-[9px] text-gray-500">· {String(r.tenant_name)}</span>}
                                                        </div>
                                                    </div>
                                                    <p className="text-[14px] font-bold text-white tabular-nums flex-shrink-0">{fmtEur(totalAmt)}</p>
                                                    <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isExp ? 'rotate-180' : ''}`} />
                                                </button>
                                                {isExp && (
                                                    <div className="px-4 pb-3 pt-0 border-t border-white/[0.06] space-y-2">
                                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-[10px] pt-2">
                                                            <div><span className="text-gray-500">Nuoma</span><p className="font-semibold text-gray-200 tabular-nums">{fmtEur(rentAmt)}</p></div>
                                                            <div><span className="text-gray-500">Komunalinės</span><p className="font-semibold text-gray-200 tabular-nums">{fmtEur(utilAmt)}</p></div>
                                                            <div><span className="text-gray-500">Kita</span><p className="font-semibold text-gray-200 tabular-nums">{fmtEur(Number(r.other_amount || 0))}</p></div>
                                                            <div><span className="text-gray-500">Viso</span><p className="font-bold text-white tabular-nums">{fmtEur(totalAmt)}</p></div>
                                                        </div>
                                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-[10px]">
                                                            {dueDate && <div><span className="text-gray-500">Terminas</span><p className="font-semibold text-gray-300">{dueDate.toLocaleDateString('lt-LT')}</p></div>}
                                                            {Boolean(r.paid_date) && <div><span className="text-gray-500">Apmokėta</span><p className="font-semibold text-emerald-400">{new Date(String(r.paid_date)).toLocaleDateString('lt-LT')}{r.payment_method ? ` (${String(r.payment_method)})` : ''}</p></div>}
                                                            {Boolean(r.tenant_name) && <div><span className="text-gray-500">Nuomininkas</span><p className="font-semibold text-gray-300">{String(r.tenant_name)}</p></div>}
                                                            {paymentDay > 0 && <div><span className="text-gray-500">Mokėjimo diena</span><p className="font-semibold text-gray-300">{paymentDay} d.</p></div>}
                                                        </div>
                                                        {lateFeeTotal > 0 && (
                                                            <div className="flex items-center gap-2 text-[10px] bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                                                                <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                                                                <span className="font-semibold text-red-400">Bauda: {fmtEur(lateFeeTotal)} ({overdueDays} d. × {lateFeePerDay}€/d.)</span>
                                                            </div>
                                                        )}
                                                        {Boolean(r.notes) && <p className="text-[9px] text-gray-500">Pastaba: {String(r.notes)}</p>}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }
                                    if (activeKpi === 'totalAddresses') {
                                        return (
                                            <div key={idx} className="flex items-center gap-3 bg-white/[0.04] rounded-xl border border-white/[0.06] px-3 py-2.5 hover:bg-white/[0.08] transition-all cursor-pointer">
                                                <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center flex-shrink-0"><Building2 className="w-4 h-4 text-blue-500" /></div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[11px] font-semibold text-white truncate">{String(r.street || '—')}, {String(r.city || '')}</p>
                                                    <p className="text-[9px] text-gray-400 mt-0.5">{r.owner_email ? String(r.owner_email) : 'Nėra savininko'}</p>
                                                </div>
                                                <span className="text-[10px] font-bold text-gray-300 bg-white/[0.06] px-2 py-1 rounded-lg">{String(r.property_count || 0)} butai</span>
                                            </div>
                                        );
                                    }
                                    if (activeKpi === 'totalProperties' || activeKpi === 'occupiedProperties') {
                                        const propStatus: Record<string, { label: string; color: string }> = {
                                            occupied: { label: 'Išnuomotas', color: 'text-emerald-600 bg-emerald-50' },
                                            vacant: { label: 'Laisvas', color: 'text-gray-500 bg-gray-50' },
                                            reserved: { label: 'Rezervuotas', color: 'text-amber-600 bg-amber-500/15' },
                                        };
                                        const ps = propStatus[String(r.status)] || { label: String(r.status), color: 'text-gray-600 bg-gray-50' };
                                        return (
                                            <div key={idx} className="flex items-center gap-3 bg-white/[0.04] rounded-xl border border-white/[0.06] px-3 py-2.5 hover:bg-white/[0.08] transition-all cursor-pointer">
                                                <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center flex-shrink-0"><Home className="w-4 h-4 text-indigo-500" /></div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[11px] font-semibold text-white truncate">{r.street ? `${r.street}${r.apartment_number ? ` - ${r.apartment_number}` : ''}` : `Butas ${r.apartment_number || ''}`}</p>
                                                    <p className="text-[9px] text-gray-400 mt-0.5">{r.tenant_name ? `Nuomininkas: ${r.tenant_name}` : 'Nėra nuomininko'}{r.rent ? ` · €${Number(r.rent)}` : ''}</p>
                                                </div>
                                                <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-md ${ps.color}`}>{ps.label}</span>
                                            </div>
                                        );
                                    }
                                    if (activeKpi === 'activeMeters') {
                                        return (
                                            <div key={idx} className="flex items-center gap-3 bg-white/[0.04] rounded-xl border border-white/[0.06] px-3 py-2.5 hover:bg-white/[0.08] transition-all cursor-pointer">
                                                <div className="w-8 h-8 rounded-lg bg-cyan-500/15 flex items-center justify-center flex-shrink-0"><Gauge className="w-4 h-4 text-cyan-500" /></div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[11px] font-semibold text-white truncate">{String(r.name || '—')}</p>
                                                    <p className="text-[9px] text-gray-400 mt-0.5">{r.street ? String(r.street) : '—'} · {String(r.type || '')} ({String(r.unit || '')})</p>
                                                </div>
                                                {r.price_per_unit ? <span className="text-[10px] font-bold text-gray-300 bg-white/[0.06] px-2 py-1 rounded-lg">€{Number(r.price_per_unit)}/{String(r.unit || 'vnt')}</span> : null}
                                            </div>
                                        );
                                    }
                                    if (activeKpi === 'totalReadings') {
                                        return (
                                            <div key={idx} className="flex items-center gap-3 bg-white/[0.04] rounded-xl border border-white/[0.06] px-3 py-2.5 hover:bg-white/[0.08] transition-all cursor-pointer">
                                                <div className="w-8 h-8 rounded-lg bg-green-500/15 flex items-center justify-center flex-shrink-0"><BarChart3 className="w-4 h-4 text-green-500" /></div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[11px] font-semibold text-white truncate">{String(r.meter_name || '—')}</p>
                                                    <p className="text-[9px] text-gray-400 mt-0.5">{r.street ? String(r.street) : '—'} · {String(r.period || '—')}</p>
                                                </div>
                                                <div className="text-right flex-shrink-0">
                                                    <p className="text-[12px] font-bold text-white tabular-nums">{String(r.value || '—')} {String(r.meter_unit || '')}</p>
                                                    <p className="text-[9px] text-gray-400">{r.reading_date ? new Date(String(r.reading_date)).toLocaleDateString('lt-LT') : '—'}</p>
                                                </div>
                                            </div>
                                        );
                                    }
                                    if (activeKpi === 'activeTenants' || activeKpi === 'pendingInvitations') {
                                        return (
                                            <div key={idx} className="flex items-center gap-3 bg-white/[0.04] rounded-xl border border-white/[0.06] px-3 py-2.5 hover:bg-white/[0.08] transition-all cursor-pointer">
                                                <div className="w-8 h-8 rounded-lg bg-violet-500/15 flex items-center justify-center flex-shrink-0"><UserPlus className="w-4 h-4 text-violet-500" /></div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[11px] font-semibold text-white truncate">{String(r.full_name || r.email || '—')}</p>
                                                    <p className="text-[9px] text-gray-400 mt-0.5">{r.street ? `${r.street}${r.apartment_number ? ` - ${r.apartment_number}` : ''}` : '—'}</p>
                                                </div>
                                                <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-md ${r.status === 'accepted' ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-500/15'}`}>
                                                    {r.status === 'accepted' ? 'Priimta' : 'Laukiama'}
                                                </span>
                                            </div>
                                        );
                                    }
                                    if (activeKpi === 'unreadNotifications') {
                                        return (
                                            <div key={idx} className="flex items-center gap-3 bg-white/[0.04] rounded-xl border border-white/[0.06] px-3 py-2.5 hover:bg-white/[0.08] transition-all cursor-pointer">
                                                <div className="w-8 h-8 rounded-lg bg-rose-500/15 flex items-center justify-center flex-shrink-0"><Bell className="w-4 h-4 text-rose-500" /></div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[11px] font-semibold text-white truncate">{String(r.body || 'Pranešimas')}</p>
                                                    <p className="text-[9px] text-gray-400 mt-0.5">{r.user_email ? String(r.user_email) : '—'} · {String(r.kind || '')}</p>
                                                </div>
                                                <span className="text-[9px] text-gray-400 font-mono flex-shrink-0">{r.created_at ? new Date(String(r.created_at)).toLocaleDateString('lt-LT') : '—'}</span>
                                            </div>
                                        );
                                    }
                                    // Fallback: users
                                    return (
                                        <div key={idx} className="flex items-center gap-3 bg-white/[0.04] rounded-xl border border-white/[0.06] px-3 py-2.5 hover:bg-white/[0.08] transition-all cursor-pointer">
                                            <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center flex-shrink-0"><Users className="w-4 h-4 text-purple-500" /></div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[11px] font-semibold text-white truncate">{r.first_name || r.last_name ? `${r.first_name || ''} ${r.last_name || ''}`.trim() : String(r.email || '—')}</p>
                                                <p className="text-[9px] text-gray-400 mt-0.5">{String(r.email || '')}</p>
                                            </div>
                                            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-md ${r.role === 'admin' ? 'text-purple-600 bg-purple-50' : r.role === 'landlord' ? 'text-teal-600 bg-teal-50' : r.role === 'tenant' ? 'text-sky-600 bg-sky-50' : 'text-gray-500 bg-gray-50'}`}>
                                                {r.role === 'admin' ? 'Admin' : r.role === 'landlord' ? 'Nuomotojas' : r.role === 'tenant' ? 'Nuomininkas' : String(r.role || '—')}
                                            </span>
                                        </div>
                                    );
                                })}
                                {kpiDetailLoadingMore && (
                                    <div className="flex items-center justify-center py-3 gap-2">
                                        <Loader2 className="w-4 h-4 text-teal-500 animate-spin" />
                                        <span className="text-[10px] text-gray-400">Kraunama daugiau...</span>
                                    </div>
                                )}
                                {!kpiDetailHasMore && kpiDetail.length > 0 && !kpiDetailLoadingMore && (
                                    <p className="text-[9px] text-gray-300 text-center py-2">Visi įrašai užkrauti</p>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* ─── System Status ─── */}
                <div className={`${panelCard} p-5`}>
                    <div className="flex items-center gap-2.5 mb-4">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/20">
                            <TrendingUp className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h2 className="text-[13px] font-bold text-white">Sistemos būsena</h2>
                            <p className="text-[9px] text-gray-400">Realaus laiko apžvalga</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-6 gap-2.5">
                        <StatusPill
                            icon={CheckCircle}
                            value={kpi.occupiedProperties}
                            label="Išnuomoti butai"
                            color="bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
                            dotColor="bg-emerald-500"
                        />
                        <StatusPill
                            icon={Home}
                            value={kpi.totalProperties - kpi.occupiedProperties}
                            label="Laisvi butai"
                            color="bg-white/[0.06] text-gray-400 border-white/[0.10]"
                        />
                        <StatusPill
                            icon={Clock}
                            value={kpi.pendingInvitations}
                            label="Laukiantys pakvietimai"
                            color="bg-amber-500/15 text-amber-400 border-amber-500/20"
                            dotColor={kpi.pendingInvitations > 0 ? 'bg-amber-500' : undefined}
                        />
                        <StatusPill
                            icon={FileText}
                            value={kpi.totalDocuments}
                            label="Dokumentai"
                            color="bg-blue-500/15 text-blue-400 border-blue-500/20"
                        />
                        <StatusPill
                            icon={Image}
                            value={kpi.totalPhotos}
                            label="Nuotraukos"
                            color="bg-violet-500/15 text-violet-400 border-violet-500/20"
                        />
                        <StatusPill
                            icon={AlertCircle}
                            value={kpi.unreadNotifications}
                            label="Neperskaityta"
                            color="bg-rose-500/15 text-rose-400 border-rose-500/20"
                            dotColor={kpi.unreadNotifications > 0 ? 'bg-rose-500' : undefined}
                        />
                    </div>
                </div>

                {/* ─── Main content: Users + Activity Log ─── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {/* Users List */}
                    <div className={`${panelCard} p-4`}>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20">
                                    <Users className="w-3.5 h-3.5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-[13px] font-bold text-white">Vartotojai</h2>
                                </div>
                                <span className="text-[10px] text-gray-400 bg-white/[0.06] px-2 py-0.5 rounded-full font-semibold">
                                    {users.length}
                                </span>
                            </div>
                            {selectedUserId && (
                                <button
                                    onClick={() => setSelectedUserId(null)}
                                    className="flex items-center gap-1 text-[10px] text-teal-400 hover:text-teal-300 font-semibold transition-colors bg-teal-500/15 px-2 py-1 rounded-lg hover:bg-teal-500/25"
                                >
                                    <X className="w-3 h-3" />
                                    Rodyti visus
                                </button>
                            )}
                        </div>
                        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin">
                            {users.map((u) => (
                                <UserCard
                                    key={u.id}
                                    user={u}
                                    activityCount={userActivityCounts[u.id] || 0}
                                    isSelected={selectedUserId === u.id}
                                    isExpanded={expandedUserId === u.id}
                                    onClick={() => handleUserClick(u.id)}
                                    onToggleBlock={handleToggleBlock}
                                    onChangeRole={handleChangeRole}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Activity Log */}
                    <div className={`${panelCard} p-4 lg:col-span-2`}>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md shadow-violet-500/20">
                                    <Activity className="w-3.5 h-3.5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-[13px] font-bold text-white">
                                        {selectedUser
                                            ? `${selectedUser.first_name || selectedUser.email.split('@')[0]} — veiksmų žurnalas`
                                            : 'Veiksmų žurnalas'}
                                    </h2>
                                </div>
                                <span className="text-[10px] text-gray-400 bg-white/[0.06] px-2 py-0.5 rounded-full font-semibold">
                                    {filteredLogs.length}{hasMore ? '+' : ''}
                                </span>
                            </div>
                            <button
                                onClick={() => setSortOrder((o) => (o === 'desc' ? 'asc' : 'desc'))}
                                className="flex items-center gap-1.5 text-[10px] text-gray-400 hover:text-gray-200 transition-colors bg-white/[0.06] hover:bg-white/[0.10] px-2.5 py-1.5 rounded-lg font-medium"
                            >
                                <ArrowUpDown className="w-3 h-3" />
                                {sortOrder === 'desc' ? 'Naujausi' : 'Seniausi'}
                            </button>
                        </div>

                        {/* Filters */}
                        <div className="flex items-center gap-2 mb-4 flex-wrap">
                            <div className="relative flex-1 min-w-[160px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Ieškoti..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-8.5 pr-8 py-2 bg-white/[0.06] border border-white/[0.10] rounded-xl text-[11px] text-white placeholder-gray-500 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400/60 transition-all outline-none"
                                    style={{ paddingLeft: '2.125rem' }}
                                />
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md hover:bg-white/[0.10] transition-colors">
                                        <X className="w-3 h-3 text-gray-400 hover:text-gray-600" />
                                    </button>
                                )}
                            </div>
                            <select
                                value={tableFilter}
                                onChange={(e) => setTableFilter(e.target.value)}
                                className="px-3 py-2 bg-white/[0.06] border border-white/[0.10] rounded-xl text-[11px] text-gray-300 appearance-none cursor-pointer focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400/60 transition-all outline-none font-medium"
                            >
                                <option value="">Visos lentelės</option>
                                {Object.entries(TABLE_LABELS).map(([key, label]) => (
                                    <option key={key} value={key}>{label}</option>
                                ))}
                            </select>
                            <select
                                value={actionFilter}
                                onChange={(e) => setActionFilter(e.target.value)}
                                className="px-3 py-2 bg-white/[0.06] border border-white/[0.10] rounded-xl text-[11px] text-gray-300 appearance-none cursor-pointer focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400/60 transition-all outline-none font-medium"
                            >
                                <option value="">Visi veiksmai</option>
                                <option value="INSERT">Sukurta</option>
                                <option value="UPDATE">Atnaujinta</option>
                                <option value="DELETE">Ištrinta</option>
                                <option value="VIEW">Peržiūra</option>
                                <option value="SUBMIT">Pateikta</option>
                                <option value="LOGIN">Prisijungimai</option>
                            </select>
                        </div>

                        {/* Log entries */}
                        <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1 scrollbar-thin">
                            {filteredLogs.length === 0 ? (
                                <div className="text-center py-16">
                                    <div className="w-14 h-14 rounded-2xl bg-white/[0.06] flex items-center justify-center mx-auto mb-3">
                                        <Activity className="w-7 h-7 text-gray-300" />
                                    </div>
                                    <p className="text-[13px] font-semibold text-gray-400">
                                        {selectedUser ? 'Šis vartotojas dar neatliko jokių veiksmų' : 'Nėra veiksmų žurnalo įrašų'}
                                    </p>
                                    <p className="text-[10px] text-gray-300 mt-1">Veiksmai bus fiksuojami automatiškai</p>
                                </div>
                            ) : (
                                <>
                                    {filteredLogs.map((entry) => (
                                        <AuditEntry key={entry.id} entry={entry} showUser={!selectedUserId} />
                                    ))}
                                    {/* Load more */}
                                    {hasMore && !searchQuery && (
                                        <button
                                            onClick={loadMore}
                                            disabled={loadingMore}
                                            className="w-full py-3 text-center text-[11px] font-bold text-teal-400 hover:text-teal-300 bg-teal-500/10 hover:bg-teal-500/20 rounded-xl border border-teal-500/20 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {loadingMore ? (
                                                <>
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    Kraunama...
                                                </>
                                            ) : (
                                                <>Rodyti daugiau ({PAGE_SIZE})</>
                                            )}
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default AdminDashboard;
