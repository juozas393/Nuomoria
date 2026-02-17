import React, { useState, useCallback, useMemo, useRef, useEffect, createRef } from 'react';
import { Calendar, MoreHorizontal, Download, Settings, Send, CheckCircle, Plus, Gauge, TrendingUp, Clock, ChevronDown, Loader2 } from 'lucide-react';
import { RodmenysModule, StatusFilter, MeterCategory, MeterScope } from './WorkSurface';
import { MeterRow, MeterData, MeterRowRef } from './MeterRow';
import { BulkActionBar } from './BulkActionBar';
import { useBulkEdits, useMetersFilters } from './hooks/useBulkEdits';
import { useMeterReadings } from './useMeterReadings';
import { MeterHistoryPanel } from './MeterHistoryPanel';

// =============================================================================
// TYPES
// =============================================================================

interface KomunaliniaiTabProps {
    propertyId: string;
    addressId?: string;
    meters: MeterData[];
    dueDate?: Date;
    onAddMeter?: () => void;
    onCollectReadings?: () => void;
    onExport?: () => void;
    onSettings?: () => void;
    onSaveReadings?: (readings: { meterId: string; value: number; previousReading?: number }[]) => Promise<void>;
    onSavePreviousReadings?: (updates: { meterId: string; previousReading: number }[]) => Promise<void>;
}

const MONTHS = ['Sausis', 'Vasaris', 'Kovas', 'Balandis', 'Gegužė', 'Birželis', 'Liepa', 'Rugpjūtis', 'Rugsėjis', 'Spalis', 'Lapkritis', 'Gruodis'];



// =============================================================================
// PAGE HEADER - Premium styling
// =============================================================================

const PageHeader: React.FC<{
    year: number; month: number; onPeriod: (y: number, m: number) => void;
    missing: number; pending: number;
    onCollect?: () => void; onReview?: () => void; onAdd?: () => void; onExport?: () => void; onSettings?: () => void;
}> = ({ year, month, onPeriod, missing, pending, onCollect, onReview, onAdd, onExport, onSettings }) => {
    const [showPicker, setShowPicker] = useState(false);
    const [showMenu, setShowMenu] = useState(false);

    const cta = useMemo(() => {
        if (missing > 0) return { label: 'Surinkti rodmenis', count: missing, icon: Send, onClick: onCollect };
        if (pending > 0) return { label: 'Peržiūrėti', count: pending, icon: CheckCircle, onClick: onReview };
        return { label: 'Pridėti', count: 0, icon: Plus, onClick: onAdd };
    }, [missing, pending, onCollect, onReview, onAdd]);

    return (
        <div className="px-6 py-5 flex items-center gap-5 bg-white border-b border-slate-200">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Komunaliniai</h1>

            {/* Period selector */}
            <div className="relative">
                <button
                    onClick={() => setShowPicker(!showPicker)}
                    className="flex items-center gap-2.5 h-10 px-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors duration-150"
                >
                    <Calendar className="w-4 h-4 text-slate-500" />
                    <span className="font-semibold text-gray-700">{MONTHS[month]} {year}</span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${showPicker ? 'rotate-180' : ''}`} />
                </button>
                {showPicker && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowPicker(false)} />
                        <div className="absolute top-full left-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 p-5 z-50 min-w-[320px]">
                            <div className="flex items-center justify-between mb-4">
                                <button onClick={() => onPeriod(year - 1, month)} className="w-9 h-9 flex items-center justify-center hover:bg-slate-100 rounded-lg text-slate-500 font-bold transition-colors">←</button>
                                <span className="font-bold text-gray-900 text-lg">{year}</span>
                                <button onClick={() => onPeriod(year + 1, month)} className="w-9 h-9 flex items-center justify-center hover:bg-slate-100 rounded-lg text-slate-500 font-bold transition-colors">→</button>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                {MONTHS.map((m, i) => (
                                    <button
                                        key={i}
                                        onClick={() => { onPeriod(year, i); setShowPicker(false); }}
                                        className={`px-4 py-2.5 text-sm font-semibold rounded-xl transition-colors duration-150 ${i === month
                                            ? 'bg-teal-600 text-white shadow-sm'
                                            : 'text-gray-600 hover:bg-slate-100'
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
                <div className="hidden lg:flex items-center gap-2.5 px-4 py-2.5 bg-orange-50 border border-orange-200 rounded-xl">
                    <Clock className="w-4 h-4 text-orange-600" />
                    <span className="text-sm font-bold text-orange-700">{missing} laukia įvesties</span>
                </div>
            )}

            {/* More menu */}
            <div className="relative">
                <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="w-10 h-10 flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors duration-150"
                >
                    <MoreHorizontal className="w-5 h-5" />
                </button>
                {showMenu && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                        <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-50 min-w-[180px]">
                            <button onClick={() => { onExport?.(); setShowMenu(false); }} className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-slate-50 flex items-center gap-3 font-medium transition-colors">
                                <Download className="w-4 h-4 text-slate-400" />Eksportuoti
                            </button>
                            <button onClick={() => { onSettings?.(); setShowMenu(false); }} className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-slate-50 flex items-center gap-3 font-medium transition-colors">
                                <Settings className="w-4 h-4 text-slate-400" />Nustatymai
                            </button>
                            <hr className="my-1.5 border-slate-100" />
                            <button onClick={() => { onAdd?.(); setShowMenu(false); }} className="w-full px-4 py-2.5 text-left text-sm text-teal-600 hover:bg-teal-50 flex items-center gap-3 font-bold transition-colors">
                                <Plus className="w-4 h-4" />Pridėti skaitiklį
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* Main CTA */}
            <button
                onClick={cta.onClick}
                className="
                    flex items-center gap-2.5 h-11 px-5 
                    bg-teal-600 hover:bg-teal-700 text-white 
                    rounded-xl font-bold text-sm 
                    transition-colors duration-150
                    shadow-sm hover:shadow-md hover:shadow-teal-500/20
                "
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
                Pridėti pirmą skaitiklį
            </button>
        </div>
    </div>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const KomunaliniaiTab: React.FC<KomunaliniaiTabProps> = ({ propertyId, addressId, meters, dueDate, onAddMeter, onCollectReadings, onExport, onSettings, onSaveReadings, onSavePreviousReadings }) => {
    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth());
    const [isSaving, setIsSaving] = useState(false);

    // History panel state
    const [historyMeter, setHistoryMeter] = useState<{ id: string; name: string; unit: string } | null>(null);

    // Hook for period-aware meter data
    const hook = useMeterReadings(propertyId, addressId, year, month);

    // State for meter status overrides (for approve/reject workflow)
    const [meterOverrides, setMeterOverrides] = useState<Record<string, Partial<MeterData>>>({});

    // Merge hook period data with legacy meters:
    // - If hook has meter configs (from address_meters), use hook meters as primary
    // - Overlay hook's period-aware previousReading/currentReading on top of legacy data
    // - Legacy meters serve as fallback structure, hook provides period-specific readings
    const baseMeters = useMemo(() => {
        console.log(`[KomunaliniaiTab] baseMeters decision:`, {
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
            console.log(`[KomunaliniaiTab] Period changed to ${year}-${month + 1}, cleared overrides`);
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

    const { setDraft, clearAllDrafts, getDraft, dirtyCount, errorCount, hasErrors, getDirtyValues } = useBulkEdits();
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

    const computedDueDate = useMemo(() => dueDate ?? new Date(year, month + 1, 0), [dueDate, year, month]);
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
        console.log(`[KomunaliniaiTab] Approved meter ${meterId} with reading ${reading}`);
    }, []);

    // Reject reading - changes status back to 'missing', clears readings and photo
    const handleReject = useCallback((meterId: string) => {
        setMeterOverrides(prev => ({
            ...prev,
            [meterId]: { status: 'missing', currentReading: null, photoUrl: null }
        }));
        console.log(`[KomunaliniaiTab] Rejected meter ${meterId}`);
    }, []);

    // Update previous reading
    const handlePreviousReadingChange = useCallback((meterId: string, value: number) => {
        setMeterOverrides(prev => ({
            ...prev,
            [meterId]: {
                ...(prev[meterId] || {}),
                previousReading: value
            }
        }));
        console.log(`[KomunaliniaiTab] Updated previous reading for meter ${meterId} to ${value}`);
    }, []);

    // History panel handler
    const handleRowAction = useCallback((meterId: string, action: string) => {
        if (action === 'history') {
            const meter = activeMeters.find(m => m.id === meterId);
            if (meter) {
                setHistoryMeter({ id: meter.id, name: meter.name, unit: meter.unit });
            }
        }
    }, [activeMeters]);

    // Save all dirty readings
    const prevDirtyCount = useMemo(() => Object.values(meterOverrides).filter(o => o.previousReading !== undefined).length, [meterOverrides]);

    const handleSave = useCallback(async () => {
        const dirtyValues = getDirtyValues();
        const hasPrevChanges = Object.values(meterOverrides).some(o => o.previousReading !== undefined);
        console.log(`[KomunaliniaiTab] handleSave called:`, {
            dirtyCount: dirtyValues.length,
            hasPrevChanges,
            addressId,
            hasHookSave: !!hook.saveReading,
            period: `${year}-${month + 1}`,
            dirtyValues,
        });
        if (dirtyValues.length === 0 && !hasPrevChanges) {
            console.log('[KomunaliniaiTab] Nothing to save, aborting');
            return;
        }

        setIsSaving(true);
        try {
            // Use hook's saveReading if addressId is available AND hook has loaded meter configs (DB-backed mode)
            // Without loaded configs, hook.saveReading will silently fail (can't find config)
            if (addressId && hook.saveReading && hook.meters.length > 0) {
                console.log('[KomunaliniaiTab] Using HOOK save path (DB-backed)');
                for (const { meterId, value } of dirtyValues) {
                    const meter = activeMeters.find(m => m.id === meterId);
                    const prevReading = meter?.previousReading ?? null;
                    console.log(`[KomunaliniaiTab] Saving meter ${meterId}: current=${value}, prev=${prevReading}`);
                    const success = await hook.saveReading(meterId, value, prevReading);
                    console.log(`[KomunaliniaiTab] Save result for ${meterId}: ${success ? 'SUCCESS' : 'FAILED'}`);
                }

                // Save previous reading changes too
                const prevReadingUpdates = Object.entries(meterOverrides)
                    .filter(([_, override]) => override.previousReading !== undefined);
                for (const [meterId, override] of prevReadingUpdates) {
                    const meter = activeMeters.find(m => m.id === meterId);
                    const currentReading = meter?.currentReading;
                    if (currentReading != null) {
                        await hook.saveReading(meterId, currentReading, override.previousReading as number);
                    }
                }

                // Refetch to get updated data from DB
                await hook.refetch();
                console.log('[KomunaliniaiTab] Refetch complete after save');
            } else {
                console.log('[KomunaliniaiTab] Using LEGACY save path (no addressId or no hook)');
                // Legacy mode: use parent callbacks
                if (onSaveReadings) {
                    await onSaveReadings(dirtyValues);
                }
                if (onSavePreviousReadings) {
                    const prevReadingUpdates = Object.entries(meterOverrides)
                        .filter(([_, override]) => override.previousReading !== undefined)
                        .map(([meterId, override]) => ({
                            meterId,
                            previousReading: override.previousReading as number
                        }));
                    if (prevReadingUpdates.length > 0) {
                        await onSavePreviousReadings(prevReadingUpdates);
                    }
                }
            }

            // Only update local overrides if NOT using hook (hook refetch handles it)
            if (!(addressId && hook.saveReading && hook.meters.length > 0)) {
                setMeterOverrides(prev => {
                    const updates: Record<string, Partial<MeterData>> = { ...prev };
                    for (const { meterId, value } of dirtyValues) {
                        updates[meterId] = {
                            ...(prev[meterId] || {}),
                            currentReading: value,
                            status: 'ok'
                        };
                    }
                    return updates;
                });
            }

            clearAllDrafts();
            console.log(`[KomunaliniaiTab] ✅ Saved ${dirtyValues.length} readings for period ${year}-${month + 1}`);
        } catch (e) {
            console.error('[KomunaliniaiTab] ❌ Error saving readings:', e);
        } finally {
            setIsSaving(false);
        }
    }, [onSaveReadings, onSavePreviousReadings, getDirtyValues, clearAllDrafts, meterOverrides, addressId, hook, activeMeters, year, month]);

    // Loading state when hook is fetching
    if (hook.isLoading && activeMeters.length === 0) {
        return (
            <div className="flex flex-col h-full bg-white">
                <PageHeader year={year} month={month} onPeriod={handlePeriod} missing={0} pending={0} onAdd={onAddMeter} onExport={onExport} onSettings={onSettings} />
                <div className="flex-1 flex items-center justify-center py-24">
                    <div className="text-center">
                        <Loader2 className="w-8 h-8 text-teal-500 animate-spin mx-auto mb-3" />
                        <p className="text-sm text-slate-500">Kraunami rodmenys...</p>
                    </div>
                </div>
            </div>
        );
    }

    // Only show empty state if we have NO meters AND no mock data
    if (activeMeters.length === 0) {
        return (
            <div className="flex flex-col h-full bg-white">
                <PageHeader year={year} month={month} onPeriod={handlePeriod} missing={0} pending={0} onAdd={onAddMeter} onExport={onExport} onSettings={onSettings} />
                <EmptyState onAdd={onAddMeter} />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-100/80">
            <PageHeader year={year} month={month} onPeriod={handlePeriod} missing={counts.missing} pending={counts.pending} onCollect={onCollectReadings} onAdd={onAddMeter} onExport={onExport} onSettings={onSettings} />

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
                >
                    {filteredMeters.length > 0 ? (
                        <table className="w-full">
                            {/* Executive table header (Rule 18.4) */}
                            <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Skaitiklis</th>
                                    <th className="w-28 px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Būsena</th>
                                    <th className="w-24 px-4 py-3 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Ankst.</th>
                                    <th className="w-32 px-4 py-3 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Dabartinis</th>
                                    <th className="w-28 px-4 py-3 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Suvart.</th>
                                    <th className="w-24 px-4 py-3 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Kaina</th>
                                    <th className="w-10 px-2 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
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

            <BulkActionBar dirtyCount={dirtyCount + prevDirtyCount} hasErrors={hasErrors} errorCount={errorCount} onSave={handleSave} onDiscard={clearAllDrafts} isSaving={isSaving} />

            {/* Meter History Panel */}
            <MeterHistoryPanel
                meterName={historyMeter?.name || ''}
                meterId={historyMeter?.id || ''}
                unit={historyMeter?.unit || ''}
                isOpen={historyMeter !== null}
                onClose={() => setHistoryMeter(null)}
                fetchHistory={hook.fetchMeterHistory}
            />
        </div>
    );
};

export default KomunaliniaiTab;
