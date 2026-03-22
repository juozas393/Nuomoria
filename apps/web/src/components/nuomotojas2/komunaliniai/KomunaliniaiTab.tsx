import React, { useState, useCallback, useMemo, useRef, useEffect, createRef } from 'react';
import { Calendar, MoreHorizontal, Download, Settings, Send, CheckCircle, Plus, Gauge, TrendingUp, Clock, ChevronDown, Loader2, Bell, AlertTriangle, FileText } from 'lucide-react';
import { RodmenysModule, StatusFilter, MeterCategory, MeterScope } from './WorkSurface';
import { MeterRow, MeterData, MeterRowRef } from './MeterRow';
import { BulkActionBar } from './BulkActionBar';
import { useBulkEdits, useMetersFilters } from './hooks/useBulkEdits';
import { useMeterReadings } from './useMeterReadings';
import { MeterHistoryPanel } from './MeterHistoryPanel';
import { InvoiceGeneratorModal } from './InvoiceGeneratorModal';
import { supabase } from '../../../lib/supabase';

// =============================================================================
// TYPES
// =============================================================================

interface KomunaliniaiTabProps {
    propertyId: string;
    addressId?: string;
    meters: MeterData[];
    dueDate?: Date;
    rent?: number;
    tenantName?: string;
    apartmentNumber?: string;
    paymentDueDay?: number; // per-apartment override from extended_details
    onAddMeter?: () => void;
    onCollectReadings?: () => void;
    onExport?: () => void;
    onSettings?: () => void;
    onSaveReadings?: (readings: { meterId: string; value: number; previousReading?: number }[]) => Promise<void>;
    onSavePreviousReadings?: (updates: { meterId: string; previousReading: number }[]) => Promise<void>;
    bgStyle?: React.CSSProperties;
}

const MONTHS = ['Sausis', 'Vasaris', 'Kovas', 'Balandis', 'Gegužė', 'Birželis', 'Liepa', 'Rugpjūtis', 'Rugsėjis', 'Spalis', 'Lapkritis', 'Gruodis'];



// =============================================================================
// PAGE HEADER - Premium styling
// =============================================================================

const PageHeader: React.FC<{
    year: number; month: number; onPeriod: (y: number, m: number) => void;
    missing: number; pending: number;
    onCollect?: () => void; onReview?: () => void; onAdd?: () => void; onExport?: () => void; onSettings?: () => void;
    onRequestReadings?: () => void; isRequestingSent?: boolean; isRequestWarning?: boolean;
    lastRequestSentAt?: string | null;
}> = ({ year, month, onPeriod, missing, pending, onCollect, onReview, onAdd, onExport, onSettings, onRequestReadings, isRequestingSent, isRequestWarning, lastRequestSentAt }) => {
    const [showPicker, setShowPicker] = useState(false);
    const [showMenu, setShowMenu] = useState(false);

    const formatSentTime = (isoDate: string) => {
        const d = new Date(isoDate);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        if (diffMins < 1) return 'ką tik';
        if (diffMins < 60) return `prieš ${diffMins} min.`;
        if (diffHours < 24) return `prieš ${diffHours} val.`;
        return d.toLocaleDateString('lt-LT', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    };

    const cta = useMemo(() => {
        if (isRequestingSent) return { label: 'Išsiųsta!', count: 0, icon: CheckCircle, onClick: undefined, sent: true };
        if (lastRequestSentAt && missing > 0) return { label: 'Siųsti dar kartą', count: missing, icon: Send, onClick: onRequestReadings, sent: false, alreadySent: true };
        if (missing > 0) return { label: 'Prašyti rodmenų', count: missing, icon: Send, onClick: onRequestReadings, sent: false };
        if (pending > 0) return { label: 'Peržiūrėti', count: pending, icon: CheckCircle, onClick: onReview, sent: false };
        return { label: 'Pridėti', count: 0, icon: Plus, onClick: onAdd, sent: false };
    }, [missing, pending, onCollect, onReview, onAdd, isRequestingSent, lastRequestSentAt]);

    return (
        <div className="px-6 py-5 flex items-center gap-5 border-b border-white/[0.08]">
            <h1 className="text-xl font-bold text-white tracking-tight">Komunaliniai</h1>

            {/* Period selector */}
            <div className="relative">
                <button
                    onClick={() => setShowPicker(!showPicker)}
                    className="flex items-center gap-2.5 h-10 px-4 bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.12] rounded-xl transition-colors duration-150"
                >
                    <Calendar className="w-4 h-4 text-white/50" />
                    <span className="font-semibold text-white/80">{MONTHS[month]} {year}</span>
                    <ChevronDown className={`w-4 h-4 text-white/40 transition-transform duration-200 ${showPicker ? 'rotate-180' : ''}`} />
                </button>
                {showPicker && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowPicker(false)} />
                        <div className="absolute top-full left-0 mt-2 bg-[#1a1f25] backdrop-blur-xl rounded-2xl shadow-xl border border-white/[0.12] p-5 z-50 min-w-[320px]">
                            <div className="flex items-center justify-between mb-4">
                                <button onClick={() => onPeriod(year - 1, month)} className="w-9 h-9 flex items-center justify-center hover:bg-white/[0.08] rounded-lg text-white/50 font-bold transition-colors">←</button>
                                <span className="font-bold text-white text-lg">{year}</span>
                                <button onClick={() => onPeriod(year + 1, month)} className="w-9 h-9 flex items-center justify-center hover:bg-white/[0.08] rounded-lg text-white/50 font-bold transition-colors">→</button>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                {MONTHS.map((m, i) => (
                                    <button
                                        key={i}
                                        onClick={() => { onPeriod(year, i); setShowPicker(false); }}
                                        className={`px-4 py-2.5 text-sm font-semibold rounded-xl transition-colors duration-150 ${i === month
                                            ? 'bg-teal-600 text-white shadow-sm'
                                            : 'text-white/60 hover:bg-white/[0.08]'
                                            }`}
                                    >
                                        {m}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>

            <div className="flex-1" />

            {/* Warning indicator */}
            {missing > 0 && (
                <div className="hidden lg:flex items-center gap-2.5 px-4 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-bold text-amber-300">{missing} laukia įvesties</span>
                </div>
            )}

            {/* More menu */}
            <div className="relative">
                <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="w-10 h-10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.08] rounded-xl transition-colors duration-150"
                >
                    <MoreHorizontal className="w-5 h-5" />
                </button>
                {showMenu && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                        <div className="absolute top-full right-0 mt-2 bg-[#1a1f25] backdrop-blur-xl rounded-xl shadow-xl border border-white/[0.12] py-1.5 z-50 min-w-[220px]">
                            <button onClick={() => { onExport?.(); setShowMenu(false); }} className="w-full px-4 py-2.5 text-left text-sm text-white/70 hover:bg-white/[0.06] flex items-center gap-3 font-medium transition-colors">
                                <Download className="w-4 h-4 text-white/40" />Eksportuoti
                            </button>
                            <button onClick={() => { onSettings?.(); setShowMenu(false); }} className="w-full px-4 py-2.5 text-left text-sm text-white/70 hover:bg-white/[0.06] flex items-center gap-3 font-medium transition-colors">
                                <Settings className="w-4 h-4 text-white/40" />Nustatymai
                            </button>
                            <hr className="my-1.5 border-white/[0.08]" />
                            <button onClick={() => { onAdd?.(); setShowMenu(false); }} className="w-full px-4 py-2.5 text-left text-sm text-teal-400 hover:bg-teal-500/10 flex items-center gap-3 font-bold transition-colors">
                                <Plus className="w-4 h-4" />Pridėti skaitliuką
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* Sent time indicator */}
            {lastRequestSentAt && !isRequestingSent && (
                <div className="hidden lg:flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[11px] font-medium text-emerald-300">Išsiųsta {formatSentTime(lastRequestSentAt)}</span>
                </div>
            )}

            {/* Main CTA */}
            <button
                onClick={cta.onClick}
                disabled={cta.sent}
                className={`
                    flex items-center gap-2.5 h-11 px-5 
                    ${cta.sent
                        ? 'bg-emerald-600 cursor-default'
                        : 'bg-teal-600 hover:bg-teal-700 hover:shadow-md hover:shadow-teal-500/20'
                    }
                    text-white rounded-xl font-bold text-sm 
                    transition-all duration-300
                    shadow-sm
                `}
            >
                <cta.icon className="w-4 h-4" />
                <span>{cta.label}</span>
                {cta.count > 0 && (
                    <span className="bg-teal-500 px-2.5 py-0.5 rounded-lg text-xs font-bold">{cta.count}</span>
                )}
            </button>
        </div>
    );
};

// =============================================================================
// EMPTY STATE
// =============================================================================

const EmptyState: React.FC<{ onAdd?: () => void }> = ({ onAdd }) => (
    <div className="flex-1 flex items-center justify-center py-24 bg-slate-50">
        <div className="text-center max-w-md">
            <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-6 ring-4 ring-slate-200/50">
                <Gauge className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Nėra skaitiklių</h3>
            <p className="text-gray-500 mb-8 leading-relaxed">Pridėkite skaitiklius ir pradėkite sekti komunalinių paslaugų suvartojimą automatiškai.</p>
            <button
                onClick={onAdd}
                className="inline-flex items-center gap-2.5 h-12 px-6 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-sm transition-colors duration-150 shadow-sm hover:shadow-lg hover:shadow-teal-500/20"
            >
                <Plus className="w-5 h-5" />
                Pridėti pirmą skaitliuką
            </button>
        </div>
    </div>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const KomunaliniaiTab: React.FC<KomunaliniaiTabProps> = ({ propertyId, addressId, meters, dueDate, rent, tenantName, apartmentNumber, paymentDueDay, onAddMeter, onCollectReadings, onExport, onSettings, onSaveReadings, onSavePreviousReadings, bgStyle }) => {
    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth());
    const [isSaving, setIsSaving] = useState(false);
    const [requestSent, setRequestSent] = useState(false);

    // Abnormal reading confirmation (landlord says "I verified this is correct")
    const [confirmedAbnormal, setConfirmedAbnormal] = useState<Set<string>>(new Set());
    // Invoice modal state
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [requestWarning, setRequestWarning] = useState<string | null>(null);
    const [lastRequestSentAt, setLastRequestSentAt] = useState<string | null>(null);
    // Confirmation modal before saving abnormal readings
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    // Confirmation modal before sending reading request
    const [showSendConfirm, setShowSendConfirm] = useState(false);
    // Confirmation modal before generating invoice with missing readings
    const [showInvoiceConfirm, setShowInvoiceConfirm] = useState(false);

    // History panel state
    const [historyMeter, setHistoryMeter] = useState<{ id: string; name: string; unit: string } | null>(null);

    // Hook for period-aware meter data
    const hook = useMeterReadings(propertyId, addressId, year, month);

    // Fetch meterReadingEndDay + paymentDay from address_settings
    const [meterReadingDay, setMeterReadingDay] = useState<number | null>(null);
    const [addressPaymentDay, setAddressPaymentDay] = useState<number | null>(null);
    useEffect(() => {
        if (!addressId) return;
        let cancelled = false;
        supabase
            .from('address_settings')
            .select('notification_settings, financial_settings')
            .eq('address_id', addressId)
            .maybeSingle()
            .then(({ data }) => {
                if (!cancelled) {
                    if (data?.notification_settings) {
                        const endDay = data.notification_settings.meterReadingEndDay || data.notification_settings.meterReadingDay;
                        if (endDay) setMeterReadingDay(endDay);
                    }
                    if (data?.financial_settings?.paymentDay) {
                        setAddressPaymentDay(data.financial_settings.paymentDay);
                    }
                }
            });
        return () => { cancelled = true; };
    }, [addressId]);

    // Check if meter reading request was already sent for this period
    useEffect(() => {
        if (!propertyId) return;
        let cancelled = false;
        const periodStr = `${year}-${String(month + 1).padStart(2, '0')}`;
        supabase
            .from('notifications')
            .select('created_at')
            .eq('kind', 'meter_reading_request')
            .filter('data->>property_id', 'eq', propertyId)
            .filter('data->>period', 'eq', periodStr)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
            .then(({ data }) => {
                if (!cancelled) {
                    setLastRequestSentAt(data?.created_at || null);
                    if (data?.created_at) setRequestSent(true);
                }
            });
        return () => { cancelled = true; };
    }, [propertyId, year, month]);

    // State for meter status overrides (for approve/reject workflow)
    const [meterOverrides, setMeterOverrides] = useState<Record<string, Partial<MeterData>>>({});

    // Merge hook period data with legacy meters:
    // - If hook has meter configs (from address_meters), use hook meters as primary
    // - Overlay hook's period-aware previousReading/currentReading on top of legacy data
    // - Legacy meters serve as fallback structure, hook provides period-specific readings
    const baseMeters = useMemo(() => {
        if (import.meta.env.DEV) console.log(`[KomunaliniaiTab] baseMeters decision:`, {
            hookMetersCount: hook.meters.length,
            legacyMetersCount: meters.length,
            addressId,
            propertyId,
            year,
            month: month + 1,
            hookIsLoading: hook.isLoading,
            usingSource: hook.meters.length > 0 ? 'HOOK (period-aware)' : 'LEGACY (static)'
        });
        if (hook.meters.length > 0) {
            // Hook has DB configs — use hook meters (they have correct per-period previousReading)
            return hook.meters;
        }
        // While hook is still loading in DB-backed mode, don't flash legacy meters
        if (hook.isLoading && addressId) {
            return [];
        }
        // No hook configs — but we can still overlay period readings on legacy meters
        // This handles the case where address_meters doesn't exist but meter_readings does
        return meters;
    }, [hook.meters, hook.isLoading, meters, addressId, propertyId, year, month]);

    // Clear overrides when period changes (must be in useEffect, not render-time)
    const periodKey = `${year}-${month}`;
    const prevPeriodRef = useRef(periodKey);
    useEffect(() => {
        if (prevPeriodRef.current !== periodKey) {
            prevPeriodRef.current = periodKey;
            setMeterOverrides({});
            if (import.meta.env.DEV) console.log(`[KomunaliniaiTab] Period changed to ${year}-${month + 1}, cleared overrides`);
        }
    }, [periodKey, year, month]);

    // Apply overrides to meters
    const activeMeters = useMemo(() =>
        baseMeters.map(m => ({
            ...m,
            ...meterOverrides[m.id]
        })),
        [baseMeters, meterOverrides]
    );

    const { setDraft, clearDraft, clearAllDrafts, getDraft, dirtyCount, errorCount, hasErrors, getDirtyValues, getClearedMeterIds } = useBulkEdits();
    const { attentionFilter, setAttentionFilter, searchQuery, setSearchQuery, categoryFilter, setCategoryFilter, scopeFilter, setScopeFilter, applyFilters } = useMetersFilters();

    const counts = useMemo(() => {
        // New simplified status system:
        // - 'missing' = no reading submitted
        // - 'pending' = reading submitted (was 'pending' or 'photo'), waiting for approval  
        // - 'ok' = approved
        const missing = activeMeters.filter(m => m.status === 'missing').length;
        const pending = activeMeters.filter(m => m.status === 'pending' || m.status === 'photo').length;
        const ok = activeMeters.filter(m => m.status === 'ok').length;
        const pendingWithPhoto = activeMeters.filter(m => (m.status === 'pending' || m.status === 'photo') && m.photoUrl).length;

        return {
            total: activeMeters.length,
            missing,
            pending,
            pendingWithPhoto,
            ok,
        };
    }, [activeMeters]);

    const computedDueDate = useMemo(() => {
        if (dueDate) return dueDate;
        if (meterReadingDay) return new Date(year, month, meterReadingDay);
        return new Date(year, month + 1, 0); // fallback: last day of month
    }, [dueDate, year, month, meterReadingDay]);
    const filteredMeters = useMemo(() => applyFilters(activeMeters), [activeMeters, applyFilters]);
    const missingMeters = useMemo(() => filteredMeters.filter(m => m.status === 'missing'), [filteredMeters]);

    const rowRefs = useRef<Map<string, React.RefObject<MeterRowRef>>>(new Map());
    useMemo(() => { filteredMeters.forEach(m => { if (!rowRefs.current.has(m.id)) rowRefs.current.set(m.id, createRef<MeterRowRef>()); }); }, [filteredMeters]);

    const handlePeriod = useCallback((y: number, m: number) => { setYear(y); setMonth(m); clearAllDrafts(); }, [clearAllDrafts]);
    const handleEnterAll = useCallback(() => { if (missingMeters.length > 0) setTimeout(() => rowRefs.current.get(missingMeters[0].id)?.current?.focusInput(), 50); }, [missingMeters]);
    const handleNext = useCallback((id: string) => { const i = missingMeters.findIndex(m => m.id === id); if (i >= 0 && i < missingMeters.length - 1) rowRefs.current.get(missingMeters[i + 1].id)?.current?.focusInput(); }, [missingMeters]);
    const handlePrev = useCallback((id: string) => { const i = missingMeters.findIndex(m => m.id === id); if (i > 0) rowRefs.current.get(missingMeters[i - 1].id)?.current?.focusInput(); }, [missingMeters]);

    // Approve reading - changes status to 'ok'
    const handleApprove = useCallback((meterId: string, reading: number) => {
        setMeterOverrides(prev => ({
            ...prev,
            [meterId]: { status: 'ok', currentReading: reading }
        }));
        if (import.meta.env.DEV) console.log(`[KomunaliniaiTab] Approved meter ${meterId} with reading ${reading}`);
    }, []);

    // Reject reading - delete from DB, change local status back to 'missing'
    const handleReject = useCallback(async (meterId: string) => {
        // Delete reading from DB first
        try {
            await hook.deleteReading(meterId);
        } catch (e) {
            if (import.meta.env.DEV) console.error('[KomunaliniaiTab] Failed to delete reading on reject:', e);
        }
        // Update local state
        setMeterOverrides(prev => ({
            ...prev,
            [meterId]: { status: 'missing', currentReading: null, photoUrl: null }
        }));
        // Refetch to sync
        hook.refetch();
        if (import.meta.env.DEV) console.log(`[KomunaliniaiTab] Rejected meter ${meterId} — deleted from DB`);
    }, [hook]);

    // Update previous reading
    const handlePreviousReadingChange = useCallback((meterId: string, value: number) => {
        setMeterOverrides(prev => ({
            ...prev,
            [meterId]: {
                ...(prev[meterId] || {}),
                previousReading: value
            }
        }));
        if (import.meta.env.DEV) console.log(`[KomunaliniaiTab] Updated previous reading for meter ${meterId} to ${value}`);
    }, []);

    // History panel handler + delete reading + confirm abnormal
    const handleRowAction = useCallback(async (meterId: string, action: string) => {
        if (action === 'history') {
            const meter = activeMeters.find(m => m.id === meterId);
            if (meter) {
                setHistoryMeter({ id: meter.id, name: meter.name, unit: meter.unit });
            }
        } else if (action === 'confirm') {
            // Landlord confirms abnormal reading is correct
            setConfirmedAbnormal(prev => new Set(prev).add(meterId));
        } else if (action === 'delete') {
            // Delete the current period reading from DB
            const success = await hook.deleteReading(meterId);
            if (success) {
                // Properly clear the draft entry (remove it entirely, not set to '')
                clearDraft(meterId);
                // Force meter state to 'missing' with cleared values via overrides
                setMeterOverrides(prev => ({
                    ...prev,
                    [meterId]: { status: 'missing' as const, currentReading: null, consumption: null, cost: null }
                }));
                // Refetch to get clean state from DB
                await hook.refetch();
                // After refetch, clear the override so fresh DB state takes over
                setMeterOverrides(prev => {
                    const next = { ...prev };
                    delete next[meterId];
                    return next;
                });
                if (import.meta.env.DEV) console.log(`[KomunaliniaiTab] ✅ Deleted reading for meter ${meterId}`);
            } else {
                if (import.meta.env.DEV) console.error(`[KomunaliniaiTab] ❌ Failed to delete reading for meter ${meterId}`);
            }
        }
    }, [activeMeters, hook, clearDraft]);

    // Request readings from tenants — show confirmation modal first
    const handleRequestReadings = useCallback(() => {
        setShowSendConfirm(true);
    }, []);

    // Actual send logic — called from send confirmation modal
    const executeSendReadings = useCallback(async () => {
        setShowSendConfirm(false);
        if (import.meta.env.DEV) console.log('[KomunaliniaiTab] executeSendReadings, addressId:', addressId, 'propertyId:', propertyId);
        if (!addressId) {
            if (import.meta.env.DEV) console.warn('[KomunaliniaiTab] No addressId — cannot send notifications');
            return;
        }
        try {
            // Find tenant user_id via accepted invitation → user email lookup
            let tenantUserIds: string[] = [];

            const { data: invitation, error: invErr } = await supabase
                .from('tenant_invitations')
                .select('email, full_name')
                .eq('property_id', propertyId)
                .eq('status', 'accepted')
                .order('responded_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (!invErr && invitation?.email) {
                const { data: userRow } = await supabase
                    .from('users')
                    .select('id')
                    .ilike('email', invitation.email)
                    .maybeSingle();

                if (userRow?.id) {
                    tenantUserIds = [userRow.id];
                }
            }

            // Fallback: try tenants table
            if (tenantUserIds.length === 0) {
                const { data: directTenants } = await supabase
                    .from('tenants')
                    .select('user_id')
                    .eq('property_id', propertyId)
                    .not('user_id', 'is', null);

                if (directTenants && directTenants.length > 0) {
                    tenantUserIds = directTenants.map(t => t.user_id).filter(Boolean);
                }
            }

            if (tenantUserIds.length === 0) {
                setRequestWarning('Šiam butui nepriskirtas nuomininkas. Pirmiausia pridėkite nuomininką.');
                setTimeout(() => setRequestWarning(null), 5000);
                return;
            }

            const MONTHS = ['Sausis', 'Vasaris', 'Kovas', 'Balandis', 'Gegužė', 'Birželis', 'Liepa', 'Rugpjūtis', 'Rugsėjis', 'Spalis', 'Lapkritis', 'Gruodis'];
            const periodLabel = `${MONTHS[month]} ${year}`;
            const deadline = new Date(year, month + 1, 0).toISOString().split('T')[0];
            const individualMeters = activeMeters.filter(m => m.scope === 'individual' && m.status === 'missing');

            const notifications = tenantUserIds.map(uid => ({
                user_id: uid,
                kind: 'meter_reading_request',
                title: 'Prašome pateikti skaitliukų rodmenis',
                body: `Nuomotojas prašo pateikti skaitliukų rodmenis už ${periodLabel}. Terminas: ${deadline}. Skaitliukai: ${individualMeters.length}.`,
                data: {
                    property_id: propertyId,
                    address_id: addressId,
                    period: `${year}-${String(month + 1).padStart(2, '0')}`,
                    deadline,
                    meters: individualMeters.map(m => ({ id: m.id, name: m.name, unit: m.unit, category: m.category })),
                },
            }));

            const { error } = await supabase.from('notifications').insert(notifications);
            if (error) {
                if (import.meta.env.DEV) console.error('[KomunaliniaiTab] Failed to send notifications:', error);
                return;
            }

            setRequestSent(true);
            setLastRequestSentAt(new Date().toISOString());
            setTimeout(() => setRequestSent(false), 5000);

            // Log to audit
            try {
                const { data: authUser } = await supabase.auth.getUser();
                const period = `${year}-${String(month + 1).padStart(2, '0')}`;
                await supabase.from('audit_log').insert({
                    user_id: authUser?.user?.id, user_email: authUser?.user?.email,
                    action: 'SUBMIT', table_name: 'notifications', record_id: propertyId,
                    description: `Išsiuntė rodmenų prašymą ${tenantUserIds.length} nuomininkui(-ams) už ${period}`,
                    new_data: { tenant_count: tenantUserIds.length, period, meter_count: individualMeters.length },
                });
            } catch { /* non-blocking */ }
        } catch (e) {
            if (import.meta.env.DEV) console.error('[KomunaliniaiTab] Error requesting readings:', e);
        }
    }, [addressId, propertyId, year, month, activeMeters]);

    // Save all dirty readings
    const prevDirtyCount = useMemo(() => Object.values(meterOverrides).filter(o => o.previousReading !== undefined).length, [meterOverrides]);

    const handleSave = useCallback(async () => {
        const dirtyValues = getDirtyValues(); // Current reading drafts
        const prevReadingUpdates = Object.entries(meterOverrides)
            .filter(([_, override]) => override.previousReading !== undefined)
            .map(([meterId, override]) => ({
                meterId,
                previousReading: override.previousReading as number
            }));

        // Detect meters where user cleared the input (need to delete from DB)
        const metersWithReadings = activeMeters.filter(m => m.status !== 'missing' && m.currentReading != null).map(m => m.id);
        const clearedMeterIds = getClearedMeterIds(metersWithReadings);

        if (import.meta.env.DEV) console.log(`[KomunaliniaiTab] handleSave called:`, {
            dirtyCount: dirtyValues.length,
            prevCount: prevReadingUpdates.length,
            clearedCount: clearedMeterIds.length,
            addressId,
            hookMetersLen: hook.meters.length,
            period: `${year}-${month + 1}`,
        });

        if (dirtyValues.length === 0 && prevReadingUpdates.length === 0 && clearedMeterIds.length === 0) {
            if (import.meta.env.DEV) console.log('[KomunaliniaiTab] Nothing to save or delete, aborting');
            return;
        }

        setIsSaving(true);
        try {
            if (addressId && hook.meters.length > 0) {
                // ====================================================
                // DB-BACKED MODE: Save ALL changes via hook.saveReading
                // ====================================================
                if (import.meta.env.DEV) console.log('[KomunaliniaiTab] DB-backed save mode');

                // Build a unified set of meters to save
                const metersToSave = new Map<string, { currentReading: number | null; previousReading: number | null }>();

                // Add current reading changes from drafts
                for (const { meterId, value } of dirtyValues) {
                    const meter = activeMeters.find(m => m.id === meterId);
                    // Use override previous reading if available, else existing
                    const prevOverride = meterOverrides[meterId]?.previousReading;
                    metersToSave.set(meterId, {
                        currentReading: value,
                        previousReading: prevOverride ?? meter?.previousReading ?? null,
                    });
                }

                // Add previous reading changes (may overlap with current changes)
                for (const { meterId, previousReading } of prevReadingUpdates) {
                    const existing = metersToSave.get(meterId);
                    if (existing) {
                        // Already saving current reading — just update previous
                        existing.previousReading = previousReading;
                    } else {
                        // Only previous reading changed — keep current as-is (null if never entered)
                        const meter = activeMeters.find(m => m.id === meterId);
                        const currentDraft = getDraft(meterId);
                        const currentVal = currentDraft?.value ? parseFloat(currentDraft.value) : (meter?.currentReading ?? null);
                        metersToSave.set(meterId, {
                            currentReading: currentVal,
                            previousReading,
                        });
                    }
                }

                // Save each meter via hook
                let savedCount = 0;
                for (const [meterId, values] of metersToSave) {
                    if (import.meta.env.DEV) console.log(`[KomunaliniaiTab] Saving meter ${meterId}: current=${values.currentReading}, prev=${values.previousReading}`);
                    const success = await hook.saveReading(meterId, values.currentReading, values.previousReading);
                    if (success) savedCount++;
                    if (import.meta.env.DEV) console.log(`[KomunaliniaiTab] ${success ? '✅' : '❌'} meter ${meterId}`);
                }

                // Delete cleared meters from DB (previous_reading is carry-forward from prior month)
                for (const meterId of clearedMeterIds) {
                    if (!metersToSave.has(meterId)) {
                        if (import.meta.env.DEV) console.log(`[KomunaliniaiTab] Deleting cleared meter ${meterId}`);
                        await hook.deleteReading(meterId);
                    }
                }

                // Refetch to get updated data from DB
                await hook.refetch();
                if (import.meta.env.DEV) console.log(`[KomunaliniaiTab] Refetch complete. Saved ${savedCount}/${metersToSave.size}, deleted ${clearedMeterIds.length}`);

                // Clear all local state — hook.meters now has fresh DB data
                clearAllDrafts();
                setMeterOverrides({});
            } else {
                // ====================================================
                // LEGACY MODE: Use parent callbacks
                // ====================================================
                if (import.meta.env.DEV) console.log('[KomunaliniaiTab] Legacy save mode');

                if (onSaveReadings && dirtyValues.length > 0) {
                    await onSaveReadings(dirtyValues);
                }

                if (onSavePreviousReadings && prevReadingUpdates.length > 0) {
                    await onSavePreviousReadings(prevReadingUpdates);
                }

                // Update local overrides for legacy mode
                setMeterOverrides(prev => {
                    const updates: Record<string, Partial<MeterData>> = { ...prev };
                    for (const { meterId, value } of dirtyValues) {
                        updates[meterId] = {
                            ...(prev[meterId] || {}),
                            currentReading: value,
                            status: 'pending'
                        };
                    }
                    // Clear saved previousReading entries
                    for (const { meterId } of prevReadingUpdates) {
                        if (updates[meterId]) {
                            const { previousReading, ...rest } = updates[meterId] as any;
                            updates[meterId] = Object.keys(rest).length > 0 ? rest : {};
                        }
                    }
                    return Object.fromEntries(
                        Object.entries(updates).filter(([_, v]) => Object.keys(v || {}).length > 0)
                    );
                });
                clearAllDrafts();
            }

            if (import.meta.env.DEV) console.log(`[KomunaliniaiTab] ✅ Save complete for period ${year}-${month + 1}`);
        } catch (e) {
            if (import.meta.env.DEV) console.error('[KomunaliniaiTab] ❌ Error saving readings:', e);
        } finally {
            setIsSaving(false);
        }
    }, [onSaveReadings, onSavePreviousReadings, getDirtyValues, getDraft, clearAllDrafts, getClearedMeterIds, meterOverrides, addressId, hook, activeMeters, year, month]);

    // Auto-save: debounce 1.5s after changes
    const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const handleSaveRef = useRef(handleSave);
    handleSaveRef.current = handleSave;

    // Count cleared meters that need deletion (for auto-save trigger)
    const clearedCount = useMemo(() => {
        const metersWithReadings = activeMeters.filter(m => m.status !== 'missing' && m.currentReading != null).map(m => m.id);
        return getClearedMeterIds(metersWithReadings).length;
    }, [activeMeters, getClearedMeterIds]);

    useEffect(() => {
        const totalDirty = dirtyCount + prevDirtyCount + clearedCount;
        if (totalDirty === 0 || hasErrors || isSaving) return;

        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = setTimeout(() => {
            // Check for abnormal readings among dirty meters (adaptive thresholds)
            const dirtyValues = getDirtyValues();
            const BASE_THRESHOLDS: Record<string, number> = { vanduo: 50, elektra: 500, sildymas: 1000, dujos: 200 };
            const hasAbnormal = dirtyValues.some(({ meterId, value }) => {
                const meter = activeMeters.find(m => m.id === meterId);
                if (!meter || confirmedAbnormal.has(meterId)) return false;
                const prev = meter.previousReading ?? 0;
                const consumption = value - prev;
                let threshold = BASE_THRESHOLDS[meter.category] ?? 500;
                // Adaptive: check localStorage for previously confirmed consumption
                try {
                    const stored = localStorage.getItem(`nuomoria_confirmed_consumption_${meterId}`);
                    if (stored) {
                        const confirmedVal = parseFloat(stored);
                        if (!isNaN(confirmedVal) && confirmedVal > 0) threshold = Math.max(threshold, confirmedVal * 1.5);
                    }
                } catch { /* noop */ }
                return consumption > threshold;
            });

            if (hasAbnormal) {
                setShowConfirmModal(true);
            } else {
                handleSaveRef.current();
            }
        }, 1000);

        return () => {
            if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        };
    }, [dirtyCount, prevDirtyCount, clearedCount, hasErrors, isSaving, getDirtyValues, activeMeters, confirmedAbnormal]);

    // Loading state when hook is fetching
    if (hook.isLoading && activeMeters.length === 0) {
        return (
            <div className="flex flex-col h-full -m-6">
                <PageHeader year={year} month={month} onPeriod={handlePeriod} missing={0} pending={0} onAdd={onAddMeter} onExport={onExport} onSettings={onSettings} onRequestReadings={handleRequestReadings} isRequestingSent={requestSent} isRequestWarning={!!requestWarning} lastRequestSentAt={lastRequestSentAt} />
                {requestSent && (
                    <div className="mx-6 mt-3 flex items-center gap-2.5 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl animate-in fade-in duration-300">
                        <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span className="text-sm font-semibold text-emerald-300">Pranešimas nuomininkams išsiųstas sėkmingai!</span>
                    </div>
                )}
                {requestWarning && (
                    <div className="mx-6 mt-3 flex items-center gap-2.5 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl animate-in fade-in duration-300">
                        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                        <span className="text-sm font-semibold text-amber-300">{requestWarning}</span>
                    </div>
                )}
                <div className="flex-1 flex items-center justify-center py-24">
                    <div className="text-center">
                        <Loader2 className="w-8 h-8 text-teal-500 animate-spin mx-auto mb-3" />
                        <p className="text-sm text-white/50">Kraunami rodmenys...</p>
                    </div>
                </div>
            </div>
        );
    }

    // Only show empty state if we have NO meters AND no mock data
    if (activeMeters.length === 0) {
        return (
            <div className="flex flex-col h-full -m-6">
                <PageHeader year={year} month={month} onPeriod={handlePeriod} missing={0} pending={0} onAdd={onAddMeter} onExport={onExport} onSettings={onSettings} onRequestReadings={handleRequestReadings} isRequestingSent={requestSent} isRequestWarning={!!requestWarning} lastRequestSentAt={lastRequestSentAt} />
                {requestSent && (
                    <div className="mx-6 mt-3 flex items-center gap-2.5 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                        <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span className="text-sm font-semibold text-emerald-300">Pranešimas nuomininkams išsiųstas sėkmingai!</span>
                    </div>
                )}
                {requestWarning && (
                    <div className="mx-6 mt-3 flex items-center gap-2.5 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                        <span className="text-sm font-semibold text-amber-300">{requestWarning}</span>
                    </div>
                )}
                <EmptyState onAdd={onAddMeter} />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full -m-6">
            <PageHeader year={year} month={month} onPeriod={handlePeriod} missing={counts.missing} pending={counts.pending} onCollect={handleRequestReadings} onAdd={onAddMeter} onExport={onExport} onSettings={onSettings} onRequestReadings={handleRequestReadings} isRequestingSent={requestSent} isRequestWarning={!!requestWarning} lastRequestSentAt={lastRequestSentAt} />
            {requestSent && (
                <div className="mx-6 mt-3 flex items-center gap-2.5 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                    <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span className="text-sm font-semibold text-emerald-300">Pranešimas nuomininkams išsiųstas sėkmingai!</span>
                </div>
            )}
            {requestWarning && (
                <div className="mx-6 mt-3 flex items-center gap-2.5 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <span className="text-sm font-semibold text-amber-300">{requestWarning}</span>
                </div>
            )}

            <div className="flex-1 flex flex-col p-5 min-h-0">
                <RodmenysModule
                    total={counts.total} missingReadings={counts.missing} pendingApproval={counts.pending} pendingWithPhoto={counts.pendingWithPhoto} ok={counts.ok}
                    activeFilter={attentionFilter as StatusFilter | null} onFilterChange={setAttentionFilter}
                    searchQuery={searchQuery} onSearchChange={setSearchQuery}
                    categoryFilter={categoryFilter} onCategoryChange={setCategoryFilter}
                    scopeFilter={scopeFilter} onScopeChange={setScopeFilter}
                    missingCount={counts.missing} onEnterAll={handleEnterAll} dueDate={computedDueDate}
                    footerLeft={`${filteredMeters.length} skaitikliai`}
                    footerRight={`Rodoma: ${filteredMeters.length} iš ${activeMeters.length}`}
                    bgStyle={bgStyle}
                >
                    {filteredMeters.length > 0 ? (
                        <table className="w-full">
                            {/* Executive table header (Rule 18.4) */}
                            <thead className="sticky top-0 z-10 bg-white/60 backdrop-blur-sm border-b border-gray-200/50">
                                <tr>
                                    <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Skaitiklis</th>
                                    <th className="w-28 px-4 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Būsena</th>
                                    <th className="w-24 px-4 py-3 text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Ankst.</th>
                                    <th className="w-32 px-4 py-3 text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Dabartinis</th>
                                    <th className="w-28 px-4 py-3 text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Suvart.</th>
                                    <th className="w-24 px-4 py-3 text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Kaina</th>
                                    <th className="w-10 px-2 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredMeters.map((meter) => (
                                    <MeterRow
                                        key={meter.id}
                                        ref={rowRefs.current.get(meter.id)}
                                        meter={meter}
                                        draftValue={getDraft(meter.id)?.value ?? null}
                                        onDraftChange={(v) => setDraft(meter.id, v, meter.previousReading)}
                                        hasError={getDraft(meter.id)?.hasError ?? false}
                                        onNavigateNext={() => handleNext(meter.id)}
                                        onNavigatePrev={() => handlePrev(meter.id)}
                                        onPreviousReadingChange={handlePreviousReadingChange}
                                        onApprove={handleApprove}
                                        onReject={handleReject}
                                        isAbnormalConfirmed={confirmedAbnormal.has(meter.id)}
                                        onRowAction={(action) => handleRowAction(meter.id, action)}
                                    />
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="flex-1 flex items-center justify-center py-20">
                            <div className="text-center">
                                <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 ring-4 ring-slate-200/50">
                                    <TrendingUp className="w-7 h-7 text-slate-400" />
                                </div>
                                <p className="text-gray-500 font-medium">Nerasta skaitiklių pagal pasirinktus filtrus</p>
                            </div>
                        </div>
                    )}
                </RodmenysModule>
            </div>

            {/* Generate Invoice Button — show when readings exist */}
            {activeMeters.length > 0 && activeMeters.some(m => m.status !== 'missing') && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200/30 bg-white/[0.02]">
                    <div className="text-[11px] text-gray-400">
                        {activeMeters.filter(m => m.status !== 'missing').length} / {activeMeters.length} rodmenų pateikta
                    </div>
                    <button
                        onClick={() => {
                            const submittedCount = activeMeters.filter(m => m.status !== 'missing').length;
                            const totalCount = activeMeters.length;
                            const missingCount = totalCount - submittedCount;
                            if (missingCount > 0) {
                                setShowInvoiceConfirm(true);
                                return;
                            }
                            setShowInvoiceModal(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-500 text-white text-[12px] font-bold rounded-lg hover:bg-teal-600 transition-colors active:scale-[0.98] shadow-sm"
                    >
                        <FileText className="w-3.5 h-3.5" />
                        Generuoti sąskaitą
                    </button>
                </div>
            )}

            {/* Auto-save indicator (replaces manual BulkActionBar) */}
            {isSaving && (
                <div className="flex items-center justify-center gap-2 py-2.5 px-4 bg-white/[0.04] border-t border-white/[0.08]">
                    <Loader2 className="w-3.5 h-3.5 text-teal-400 animate-spin" />
                    <span className="text-[12px] font-medium text-white/50">Saugoma...</span>
                </div>
            )}

            {/* ═══ CONFIRMATION MODAL ═══ */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center" onClick={() => setShowConfirmModal(false)}>
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="px-5 py-4 border-b border-gray-100 bg-amber-50">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center">
                                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                                </div>
                                <div>
                                    <h3 className="text-[14px] font-bold text-gray-900">Patikrinkite rodmenis</h3>
                                    <p className="text-[11px] text-gray-500">Rasti neįprasti skaičiai — ar tikrai teisingi?</p>
                                </div>
                            </div>
                        </div>

                        {/* Readings list */}
                        <div className="px-5 py-3 max-h-[300px] overflow-y-auto">
                            {(() => {
                                const dirtyValues = getDirtyValues();
                                const THRESHOLDS: Record<string, number> = { vanduo: 50, elektra: 500, sildymas: 1000, dujos: 200 };
                                return dirtyValues.map(({ meterId, value }) => {
                                    const meter = activeMeters.find(m => m.id === meterId);
                                    if (!meter) return null;
                                    const prev = meter.previousReading ?? 0;
                                    const consumption = value - prev;
                                    const threshold = THRESHOLDS[meter.category] ?? 500;
                                    const abnormal = consumption > threshold && !confirmedAbnormal.has(meterId);
                                    const cost = meter.tariff ? consumption * meter.tariff : null;
                                    return (
                                        <div key={meterId} className={`flex items-center justify-between py-2 border-b border-gray-100 last:border-0 ${abnormal ? 'bg-red-50/50 -mx-5 px-5 rounded-lg' : ''}`}>
                                            <div className="flex items-center gap-2">
                                                {abnormal && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                                                <div>
                                                    <p className="text-[12px] font-semibold text-gray-800">{meter.name}</p>
                                                    <p className="text-[10px] text-gray-400">
                                                        {prev} → {value} = <span className={abnormal ? 'text-red-600 font-bold' : ''}>{consumption} {meter.unit}</span>
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={`text-[13px] font-bold tabular-nums ${abnormal ? 'text-red-600' : 'text-gray-800'}`}>
                                                    {cost !== null ? `${cost.toFixed(2)} €` : '—'}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                });
                            })()}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50">
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                className="flex-1 py-2.5 text-[12px] font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                            >
                                Atšaukti
                            </button>
                            <button
                                onClick={() => {
                                    setShowConfirmModal(false);
                                    // Confirm all abnormal meters, persist to localStorage, and save
                                    const dirtyValues = getDirtyValues();
                                    const BASE_THRESHOLDS: Record<string, number> = { vanduo: 50, elektra: 500, sildymas: 1000, dujos: 200 };
                                    const abnormalEntries = dirtyValues
                                        .filter(({ meterId, value }) => {
                                            const meter = activeMeters.find(m => m.id === meterId);
                                            if (!meter) return false;
                                            const consumption = value - (meter.previousReading ?? 0);
                                            let threshold = BASE_THRESHOLDS[meter.category] ?? 500;
                                            try {
                                                const stored = localStorage.getItem(`nuomoria_confirmed_consumption_${meterId}`);
                                                if (stored) {
                                                    const cv = parseFloat(stored);
                                                    if (!isNaN(cv) && cv > 0) threshold = Math.max(threshold, cv * 1.5);
                                                }
                                            } catch { /* noop */ }
                                            return consumption > threshold;
                                        })
                                        .map(({ meterId, value }) => {
                                            const meter = activeMeters.find(m => m.id === meterId);
                                            return { meterId, consumption: value - (meter?.previousReading ?? 0) };
                                        });
                                    // Persist confirmed consumption to localStorage
                                    try {
                                        for (const { meterId, consumption } of abnormalEntries) {
                                            localStorage.setItem(`nuomoria_confirmed_consumption_${meterId}`, String(consumption));
                                        }
                                    } catch { /* noop */ }
                                    setConfirmedAbnormal(prev => {
                                        const next = new Set(prev);
                                        abnormalEntries.forEach(({ meterId }) => next.add(meterId));
                                        return next;
                                    });
                                    handleSaveRef.current();
                                }}
                                className="flex-1 py-2.5 text-[12px] font-bold text-white bg-teal-500 rounded-xl hover:bg-teal-600 transition-colors active:scale-[0.98]"
                            >
                                Patvirtinti ir išsaugoti
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ SEND REQUEST CONFIRMATION MODAL ═══ */}
            {showSendConfirm && (() => {
                const missingIndividual = activeMeters.filter(m => m.scope === 'individual' && m.status === 'missing');
                const allFilled = missingIndividual.length === 0;
                return (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center" onClick={() => setShowSendConfirm(false)}>
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                        <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
                            <div className="px-5 py-4 border-b border-gray-100 bg-teal-50">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-xl bg-teal-100 flex items-center justify-center">
                                        <Send className="w-4 h-4 text-teal-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-[14px] font-bold text-gray-900">Prašyti rodmenų</h3>
                                        <p className="text-[11px] text-gray-500">
                                            {allFilled ? 'Visi individualūs skaitliukai užpildyti' : `${missingIndividual.length} skaitliukai laukia rodmenų`}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="px-5 py-3">
                                {allFilled ? (
                                    <p className="text-[12px] text-gray-500 py-2">Nuomininkas jau pateikė visus individualius rodmenis. Ar vis tiek norite siųsti priminimą?</p>
                                ) : (
                                    <div className="space-y-1.5">
                                        <p className="text-[11px] text-gray-400 mb-2">Nuomininkui bus išsiųstas prašymas pateikti:</p>
                                        {missingIndividual.map(m => (
                                            <div key={m.id} className="flex items-center gap-2 py-1.5 px-3 bg-gray-50 rounded-lg">
                                                <Gauge className="w-3.5 h-3.5 text-teal-500" />
                                                <span className="text-[12px] font-medium text-gray-700">{m.name}</span>
                                                <span className="text-[10px] text-gray-400 ml-auto">{m.unit}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50">
                                <button onClick={() => setShowSendConfirm(false)} className="flex-1 py-2.5 text-[12px] font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                                    Atšaukti
                                </button>
                                <button onClick={executeSendReadings} className="flex-1 py-2.5 text-[12px] font-bold text-white bg-teal-500 rounded-xl hover:bg-teal-600 transition-colors active:scale-[0.98] inline-flex items-center justify-center gap-1.5">
                                    <Send className="w-3.5 h-3.5" />Siųsti
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* ═══ INVOICE MISSING READINGS MODAL ═══ */}
            {showInvoiceConfirm && (() => {
                const submitted = activeMeters.filter(m => m.status !== 'missing');
                const missing = activeMeters.filter(m => m.status === 'missing');
                return (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center" onClick={() => setShowInvoiceConfirm(false)}>
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                        <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
                            <div className="px-5 py-4 border-b border-gray-100 bg-amber-50">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center">
                                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-[14px] font-bold text-gray-900">Ne visi rodmenys pateikti</h3>
                                        <p className="text-[11px] text-gray-500">{submitted.length} iš {activeMeters.length} skaitliukų turi rodmenis</p>
                                    </div>
                                </div>
                            </div>
                            <div className="px-5 py-3">
                                <p className="text-[11px] text-gray-400 mb-2">Trūksta rodmenų:</p>
                                <div className="space-y-1.5">
                                    {missing.map(m => (
                                        <div key={m.id} className="flex items-center gap-2 py-1.5 px-3 bg-amber-50/50 rounded-lg border border-amber-100">
                                            <Gauge className="w-3.5 h-3.5 text-amber-500" />
                                            <span className="text-[12px] font-medium text-gray-700">{m.name}</span>
                                            <span className="text-[10px] text-amber-500 ml-auto">{m.scope === 'individual' ? 'Individualus' : 'Bendras'}</span>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-[11px] text-gray-400 mt-3">Sąskaita bus generuojama tik su esamais duomenimis.</p>
                            </div>
                            <div className="flex gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50">
                                <button onClick={() => setShowInvoiceConfirm(false)} className="flex-1 py-2.5 text-[12px] font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                                    Atšaukti
                                </button>
                                <button onClick={() => { setShowInvoiceConfirm(false); setShowInvoiceModal(true); }} className="flex-1 py-2.5 text-[12px] font-bold text-white bg-teal-500 rounded-xl hover:bg-teal-600 transition-colors active:scale-[0.98] inline-flex items-center justify-center gap-1.5">
                                    <FileText className="w-3.5 h-3.5" />Tęsti
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Meter History Panel */}
            <MeterHistoryPanel
                meterName={historyMeter?.name || ''}
                meterId={historyMeter?.id || ''}
                unit={historyMeter?.unit || ''}
                isOpen={historyMeter !== null}
                onClose={() => setHistoryMeter(null)}
                fetchHistory={hook.fetchMeterHistory}
            />

            {/* Invoice Generator Modal */}
            <InvoiceGeneratorModal
                isOpen={showInvoiceModal}
                onClose={() => setShowInvoiceModal(false)}
                propertyId={propertyId}
                addressId={addressId}
                apartmentNumber={apartmentNumber || ''}
                tenantName={tenantName || ''}
                rent={rent || 0}
                paymentDueDay={paymentDueDay || addressPaymentDay || 15}
                meters={activeMeters.filter(m => m.status !== 'missing').map(m => ({
                    id: m.id,
                    name: m.name,
                    category: m.category,
                    consumption: m.consumption ?? null,
                    cost: m.cost ?? null,
                    unit: m.unit,
                    tariff: m.tariff,
                }))}
                year={year}
                month={month}
            />
        </div>
    );
};

export default KomunaliniaiTab;
