import React, { useRef, useCallback, forwardRef, useImperativeHandle, useState } from 'react';
import { createPortal } from 'react-dom';
import { Zap, Droplets, Flame, MoreHorizontal, AlertTriangle, History, Camera, Trash2, Eye, X, ImageIcon, Check, XCircle } from 'lucide-react';
import { fmtTariff } from '../../../constants/meterTemplates';

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

export interface MeterData {
    id: string;
    name: string;
    category: 'elektra' | 'vanduo' | 'sildymas' | 'dujos';
    scope: 'individual' | 'communal';
    unit: string;
    previousReading: number | null;
    currentReading: number | null;
    status: 'missing' | 'photo' | 'pending' | 'ok';
    tariff?: number | null;
    fixedPrice?: number;
    consumption?: number | null;
    cost?: number | null;
    photoUrl?: string | null;
    supplier?: string | null;
    distributionMethod?: string | null;
    apartmentArea?: number | null;
    totalArea?: number | null;
    totalApartments?: number | null;
}

interface MeterRowProps {
    meter: MeterData;
    draftValue: string | null;
    onDraftChange: (value: string) => void;
    hasError: boolean;
    onNavigateNext?: () => void;
    onNavigatePrev?: () => void;
    onRowAction?: (action: 'history' | 'photo' | 'delete' | 'confirm') => void;
    onPreviousReadingChange?: (meterId: string, value: number) => void;
    onTariffChange?: (meterId: string, newTariff: number) => void;
    isAbnormalConfirmed?: boolean;
    // Approval workflow for tenant-submitted readings
    onApprove?: (meterId: string, currentReading: number) => void;
    onReject?: (meterId: string, reason?: string) => void;
}

export interface MeterRowRef {
    focusInput: () => void;
}

// ════════════════════════════════════════════════════════════════════════════
// DESIGN SYSTEM - Clean Executive Standard
// ════════════════════════════════════════════════════════════════════════════

const ICONS = { elektra: Zap, vanduo: Droplets, sildymas: Flame, dujos: Flame };

// Semantic colors - icon only, container stays neutral
const ICON_COLORS: Record<string, string> = {
    elektra: '#D97706',   // Amber-600
    vanduo: '#0891B2',    // Cyan-600
    sildymas: '#DC2626',  // Red-600
    dujos: '#7C3AED',     // Violet-600
};

// Status: clean dot + text, no pills
// Simplified system: 'photo' also shows as 'Laukia' with same color as 'pending'
const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
    missing: { color: '#94A3B8', label: 'Neįvesta' },
    photo: { color: '#F59E0B', label: 'Įvesta' },     // Same as pending (merged)
    pending: { color: '#F59E0B', label: 'Įvesta' },
    ok: { color: '#10B981', label: 'Patvirtinta' },
};

// ════════════════════════════════════════════════════════════════════════════
// FORMATTERS - Null previous = 0, null current = em-dash
// ════════════════════════════════════════════════════════════════════════════

const fmt = (v: number | null | undefined): string =>
    v == null ? '0' : v.toLocaleString('lt-LT');

const fmtCost = (v: number | null | undefined): string =>
    (v == null || v === 0) ? '—' : `${v.toFixed(2)} €`;

const fmtConsumption = (v: number | null | undefined, unit: string): string =>
    v == null ? '—' : `${v.toLocaleString('lt-LT')} ${unit}`;

// ════════════════════════════════════════════════════════════════════════════
// METER ROW - Clean Executive Implementation
// ════════════════════════════════════════════════════════════════════════════

export const MeterRow = forwardRef<MeterRowRef, MeterRowProps>(({
    meter, draftValue, onDraftChange, hasError, onNavigateNext, onNavigatePrev, onRowAction, onPreviousReadingChange, onTariffChange, isAbnormalConfirmed, onApprove, onReject,
}, ref) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [showMenu, setShowMenu] = useState(false);
    const [showPhotoModal, setShowPhotoModal] = useState(false);
    const [isZoomed, setIsZoomed] = useState(false);
    const [isEditingTariff, setIsEditingTariff] = useState(false);
    const [tariffDraft, setTariffDraft] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [isPrevFocused, setIsPrevFocused] = useState(false);
    const [prevDraft, setPrevDraft] = useState<string | null>(null);

    const Icon = ICONS[meter.category];
    const iconColor = ICON_COLORS[meter.category];
    const status = STATUS_CONFIG[meter.status];

    // Derived state
    const displayValue = draftValue !== null ? draftValue : (meter.currentReading?.toString() ?? '');
    const isDirty = draftValue !== null && draftValue !== (meter.currentReading?.toString() ?? '');
    const prevValue = meter.previousReading ?? 0;
    const showWarning = draftValue !== null && parseFloat(draftValue) < prevValue;
    // Always editable — null previous treated as 0
    const isEditable = true;
    const needsInput = meter.status === 'missing' && !meter.currentReading;

    // Live calculation
    const consumption = (() => {
        // Fixed-price meters (e.g. Liftas 5€/mėn.) — consumption is irrelevant
        if (meter.fixedPrice && meter.fixedPrice > 0) return null;
        // If status is 'missing' and no draft — this meter has no reading, force null
        if (meter.status === 'missing' && !draftValue) return null;
        if (draftValue) {
            const val = parseFloat(draftValue);
            if (!isNaN(val) && val >= prevValue) return val - prevValue;
        }
        return meter.consumption ?? null;
    })();

    const cost = (() => {
        // Fixed-price meters — always show the fixed price (no reading needed)
        if (meter.fixedPrice && meter.fixedPrice > 0) return meter.fixedPrice;
        // If status is 'missing' and no draft, cost is always null (clean/deleted state)
        if (meter.status === 'missing' && !draftValue) return null;
        // If no current reading and no draft, cost should be null (clean state)
        if (!draftValue && meter.currentReading == null) return null;
        // For communal meters, always use the stored per-apartment cost from DB
        if (meter.scope === 'communal' && meter.cost && meter.cost > 0) return meter.cost;
        // For individual meters, recalculate live
        if (consumption !== null && meter.tariff) return consumption * meter.tariff;
        return (meter.cost && meter.cost > 0) ? meter.cost : null;
    })();

    // Abnormal consumption detection — adaptive threshold
    const isAbnormal = (() => {
        if (consumption === null || consumption <= 0) return false;
        // If confirmed by landlord this session, treat as normal
        if (isAbnormalConfirmed) return false;
        // Base thresholds per category
        const baseThresholds: Record<string, number> = {
            vanduo: 50, elektra: 500, sildymas: 1000, dujos: 200,
        };
        let threshold = baseThresholds[meter.category] ?? 500;
        // Adaptive: check if this meter had previously confirmed consumption
        try {
            const stored = localStorage.getItem(`nuomoria_confirmed_consumption_${meter.id}`);
            if (stored) {
                const confirmedVal = parseFloat(stored);
                if (!isNaN(confirmedVal) && confirmedVal > 0) {
                    // Allow up to 1.5× the previously confirmed consumption
                    threshold = Math.max(threshold, confirmedVal * 1.5);
                }
            }
        } catch { /* localStorage unavailable */ }
        return consumption > threshold;
    })();

    useImperativeHandle(ref, () => ({
        focusInput: () => { inputRef.current?.focus(); inputRef.current?.select(); }
    }));

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.shiftKey ? onNavigatePrev?.() : onNavigateNext?.();
        }
        if (e.key === 'Escape') {
            onDraftChange(meter.currentReading?.toString() ?? '');
            e.currentTarget.blur();
        }
        if (e.key === ',') {
            e.preventDefault();
            const input = e.currentTarget;
            const pos = input.selectionStart ?? input.value.length;
            onDraftChange(input.value.slice(0, pos) + '.' + input.value.slice(input.selectionEnd ?? pos));
        }
    }, [meter.currentReading, onDraftChange, onNavigateNext, onNavigatePrev]);

    // Row background based on state
    const rowBg = hasError || showWarning
        ? 'bg-red-50'
        : isAbnormal
            ? 'bg-amber-50'
            : isDirty
                ? 'bg-amber-50'
                : 'hover:bg-black/[0.02]';

    return (
        <>
            <tr className={`group transition-colors duration-100 select-none cursor-default ${rowBg}`}>

                {/* ══════════════════════════════════════════════════════════════
               COLUMN 1: Meter Identity
               - Neutral icon container (bg-slate-50, border-slate-100)
               - Icon has semantic color only
               ══════════════════════════════════════════════════════════════ */}
                <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3.5">
                        {/* Icon - Clean Executive: neutral bg, colored icon */}
                        <div className="w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
                            <Icon className="w-5 h-5" style={{ color: iconColor }} strokeWidth={2} />
                        </div>

                        <div className="min-w-0">
                            <div className="font-semibold text-gray-900 text-sm leading-tight truncate">
                                {meter.name}
                            </div>
                            <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5">
                                <span>{meter.scope === 'individual' ? 'Individualus' : 'Bendras'}</span>
                                {meter.scope === 'communal' && meter.distributionMethod && (
                                    <>
                                        <span className="text-gray-300">·</span>
                                        <span className="text-teal-500/80 font-medium">
                                            {meter.distributionMethod === 'per_apartment' ? 'Pagal butus'
                                                : meter.distributionMethod === 'per_area' ? 'Pagal plotą'
                                                    : meter.distributionMethod === 'fixed' ? 'Fiksuota kaina'
                                                        : meter.distributionMethod === 'per_consumption' ? 'Pagal suvart.'
                                                            : meter.distributionMethod}
                                        </span>
                                        {meter.distributionMethod === 'per_area' && meter.totalArea != null && meter.totalArea > 0 && (
                                            meter.apartmentArea != null && meter.apartmentArea > 0 ? (
                                                <span className="text-gray-400" title={`Jūsų dalis: ${meter.apartmentArea} m² iš ${meter.totalArea} m² (${((meter.apartmentArea / meter.totalArea) * 100).toFixed(1)}%)`}>
                                                    ({meter.apartmentArea} / {meter.totalArea} m²)
                                                </span>
                                            ) : (
                                                <span className="text-amber-500/70 text-[9px]" title="Nustatykite buto plotą, kad būtų galima teisingai paskirstyti">
                                                    (plotas nenustatytas)
                                                </span>
                                            )
                                        )}
                                        {meter.distributionMethod === 'per_apartment' && meter.totalApartments != null && meter.totalApartments > 0 && (
                                            <span className="text-gray-400" title={`Padalinta po lygiai tarp ${meter.totalApartments} butų`}>
                                                (1 / {meter.totalApartments})
                                            </span>
                                        )}
                                    </>
                                )}
                                <span className="text-gray-300">·</span>
                                {isEditingTariff ? (
                                    <span className="inline-flex items-center gap-1">
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            autoFocus
                                            value={tariffDraft}
                                            onChange={(e) => setTariffDraft(e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.'))}
                                            onBlur={() => {
                                                const val = parseFloat(tariffDraft);
                                                if (!isNaN(val) && val > 0 && onTariffChange) {
                                                    onTariffChange(meter.id, val);
                                                }
                                                setIsEditingTariff(false);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') { e.currentTarget.blur(); }
                                                if (e.key === 'Escape') { setIsEditingTariff(false); }
                                            }}
                                            className="w-16 px-1.5 py-0.5 text-xs text-teal-600 bg-teal-50 border border-teal-200 rounded focus:outline-none focus:ring-1 focus:ring-teal-400 tabular-nums text-right"
                                        />
                                        <span className="text-teal-600 font-medium">€/{meter.fixedPrice ? 'mėn.' : meter.unit}</span>
                                    </span>
                                ) : meter.tariff != null && meter.tariff > 0 ? (
                                    <button
                                        onClick={() => {
                                            if (onTariffChange) {
                                                setTariffDraft(meter.tariff!.toString());
                                                setIsEditingTariff(true);
                                            }
                                        }}
                                        className={`text-teal-600 font-medium ${onTariffChange ? 'hover:text-teal-500 hover:underline cursor-pointer' : ''}`}
                                        title={onTariffChange ? 'Spustelėkite, kad redaguotumėte tarifą' : undefined}
                                    >
                                        {fmtTariff(meter.tariff)} €/{meter.fixedPrice ? 'mėn.' : meter.unit}
                                    </button>
                                ) : (
                                    <span>{meter.unit}</span>
                                )}
                                {meter.supplier && (
                                    <>
                                        <span className="text-gray-300">·</span>
                                        <span className="text-gray-400 truncate max-w-[120px]" title={meter.supplier}>{meter.supplier}</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </td>

                {/* ══════════════════════════════════════════════════════════════
               COLUMN 2: Status - Dot + Text pattern (clickable if photo exists)
               Shows camera icon when photo evidence available
               ══════════════════════════════════════════════════════════════ */}
                <td className="px-4 py-3.5">
                    {meter.photoUrl ? (
                        <button
                            onClick={() => setShowPhotoModal(true)}
                            className="flex items-center gap-2 hover:bg-black/[0.04] rounded-lg px-2 py-1 -mx-2 -my-1 transition-colors group"
                            title="Peržiūrėti nuotrauką"
                        >
                            <span
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: status.color }}
                            />
                            <span className="text-sm text-gray-600 group-hover:text-teal-600">{status.label}</span>
                            <span className="text-xs opacity-70 group-hover:opacity-100">📷</span>
                            <Eye className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                    ) : (
                        <div className="flex items-center gap-2">
                            <span
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: status.color }}
                            />
                            <span className="text-sm text-gray-500">{status.label}</span>
                        </div>
                    )}
                </td>

                {/* ══════════════════════════════════════════════════════════════
               COLUMNS 3-5: For fixed-price meters, merge into single label
               ══════════════════════════════════════════════════════════════ */}
                {meter.fixedPrice && meter.fixedPrice > 0 ? (
                    <td colSpan={3} className="px-4 py-3.5 text-center">
                        <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-sm text-gray-500">
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                            Fiksuota kaina
                        </span>
                    </td>
                ) : (
                    <>
                        {/* COLUMN 3: Previous Reading */}
                        <td className="px-4 py-3.5 text-right">
                            {onPreviousReadingChange ? (
                                <div className="relative">
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={prevDraft !== null ? prevDraft : (prevValue.toString())}
                                        onChange={(e) => {
                                            const cleaned = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.');
                                            setPrevDraft(cleaned);
                                            const numVal = parseFloat(cleaned);
                                            if (!isNaN(numVal)) {
                                                onPreviousReadingChange(meter.id, numVal);
                                            }
                                        }}
                                        onFocus={(e) => { e.target.select(); setIsPrevFocused(true); }}
                                        onBlur={() => {
                                            setIsPrevFocused(false);
                                            if (prevDraft !== null && prevDraft !== '') {
                                                const numVal = parseFloat(prevDraft);
                                                if (!isNaN(numVal)) {
                                                    onPreviousReadingChange(meter.id, numVal);
                                                }
                                            }
                                            setPrevDraft(null);
                                        }}
                                        placeholder="0"
                                        className={`
                                            w-full h-9 px-3 text-sm text-right tabular-nums font-medium rounded-lg
                                            transition-colors duration-150 placeholder:text-gray-300
                                            focus:outline-none
                                            ${isPrevFocused
                                                ? 'bg-white border border-teal-500 ring-2 ring-teal-500/20 text-gray-900 cursor-text'
                                                : 'bg-transparent border border-transparent hover:border-gray-200 hover:bg-white/60 text-gray-500 cursor-default'
                                            }
                                        `}
                                    />
                                </div>
                            ) : (
                                <span className="text-sm text-gray-500 tabular-nums font-medium">
                                    {fmt(meter.previousReading)}
                                </span>
                            )}
                        </td>

                        {/* COLUMN 4: Current Reading */}
                        <td className="px-4 py-3.5">
                            {isEditable ? (
                                <div className="relative">
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        inputMode="decimal"
                                        value={displayValue}
                                        onChange={(e) => onDraftChange(e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.'))}
                                        onKeyDown={handleKeyDown}
                                        onFocus={(e) => { e.target.select(); setIsFocused(true); }}
                                        onBlur={() => setIsFocused(false)}
                                        placeholder="0"
                                        className={`
                                         w-full h-9 px-3 text-sm text-right tabular-nums font-medium rounded-lg
                                         transition-colors duration-150 placeholder:text-gray-300
                                         focus:outline-none
                                         ${hasError || showWarning
                                                ? 'bg-red-50 border border-red-300 text-red-600 ring-2 ring-red-200 cursor-text'
                                                : isDirty
                                                    ? 'bg-amber-50 border border-amber-300 text-amber-700 cursor-text'
                                                    : isFocused
                                                        ? 'bg-white border border-teal-500 ring-2 ring-teal-500/20 text-gray-900 cursor-text'
                                                        : needsInput
                                                            ? 'bg-white/60 border border-gray-200 hover:border-teal-400 text-gray-900 cursor-text'
                                                            : 'bg-transparent border border-transparent hover:border-gray-200 hover:bg-white/60 text-gray-900 cursor-default'
                                            }
                                    `}
                                    />
                                    {(hasError || showWarning) && (
                                        <AlertTriangle className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
                                    )}
                                </div>
                            ) : (
                                <div className="h-9 flex items-center justify-end pr-3">
                                    <span className="text-sm text-gray-300 tabular-nums">—</span>
                                </div>
                            )}
                        </td>

                        {/* COLUMN 5: Consumption */}
                        <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                                {isAbnormal && (
                                    <span title="Neįprastai didelis suvartojimas — patikrinkite rodmenį">
                                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                    </span>
                                )}
                                <span className={`text-sm tabular-nums font-medium ${isAbnormal ? 'text-amber-600 font-semibold' : consumption && consumption > 0 ? 'text-gray-700' : 'text-gray-300'
                                    }`}>
                                    {fmtConsumption(consumption, meter.unit)}
                                </span>
                            </div>
                        </td>
                    </>
                )}

                {/* ══════════════════════════════════════════════════════════════
               COLUMN 6: Cost - Finalized cost, font-semibold
               ══════════════════════════════════════════════════════════════ */}
                <td className="px-4 py-3.5 text-right">
                    <span className={`text-sm tabular-nums font-semibold ${isAbnormal ? 'text-red-600' : cost && cost > 0 ? 'text-gray-900' : 'text-gray-300'
                        }`}>
                        {fmtCost(cost)}
                    </span>
                </td>

                {/* ══════════════════════════════════════════════════════════════
               COLUMN 7: Actions Menu - shadow-lg, rounded-lg
               ══════════════════════════════════════════════════════════════ */}
                <td className="px-3 py-3.5 text-center relative">
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-black/[0.04] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                    >
                        <MoreHorizontal className="w-4 h-4" />
                    </button>

                    {showMenu && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                            <div className="absolute top-full right-0 mt-1 bg-white backdrop-blur-xl rounded-lg shadow-xl border border-gray-100 py-1 z-50 min-w-[160px]">
                                <button
                                    onClick={() => { onRowAction?.('history'); setShowMenu(false); }}
                                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 font-medium"
                                >
                                    <History className="w-4 h-4 text-gray-400" />
                                    Rodmenų istorija
                                </button>

                                {/* Photo action - View if exists, Add if not */}
                                {meter.photoUrl ? (
                                    <button
                                        onClick={() => { setShowPhotoModal(true); setShowMenu(false); }}
                                        className="w-full px-3 py-2 text-left text-sm text-teal-600 hover:bg-teal-50 flex items-center gap-2.5 font-medium"
                                    >
                                        <Eye className="w-4 h-4 text-teal-500" />
                                        Peržiūrėti nuotrauką
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => { onRowAction?.('photo'); setShowMenu(false); }}
                                        className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 font-medium"
                                    >
                                        <Camera className="w-4 h-4 text-gray-400" />
                                        Pridėti nuotrauką
                                    </button>
                                )}

                                {isAbnormal && (
                                    <button
                                        onClick={() => { onRowAction?.('confirm'); setShowMenu(false); }}
                                        className="w-full px-3 py-2 text-left text-sm text-emerald-600 hover:bg-emerald-50 flex items-center gap-2.5 font-medium"
                                    >
                                        <Check className="w-4 h-4 text-emerald-500" />
                                        Patvirtinti rodmenį
                                    </button>
                                )}

                                <hr className="my-1 border-gray-100" />
                                <button
                                    onClick={() => { onRowAction?.('delete'); setShowMenu(false); }}
                                    className="w-full px-3 py-2 text-left text-sm text-red-500 hover:bg-red-50 flex items-center gap-2.5 font-medium"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Ištrinti rodmenį
                                </button>
                            </div>
                        </>
                    )}
                </td>
            </tr>

            {/* Photo Lightbox Modal — rendered via portal to escape parent modal */}
            {
                showPhotoModal && meter.photoUrl && createPortal(
                    <div
                        className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setShowPhotoModal(false)}
                    >
                        <div
                            className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center">
                                        <ImageIcon className="w-5 h-5 text-teal-600" />
                                    </div>
                                    <div>
                                        <div className="font-semibold text-slate-900">{meter.name}</div>
                                        <div className="text-xs text-slate-500">Nuomininko pateikta nuotrauka</div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowPhotoModal(false)}
                                    className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Image - clickable to zoom in/out */}
                            <div
                                className={`p-4 bg-slate-100 ${isZoomed ? 'overflow-auto max-h-[70vh]' : ''}`}
                                onClick={() => setIsZoomed(!isZoomed)}
                            >
                                <img
                                    src={meter.photoUrl ?? ''}
                                    alt={`${meter.name} nuotrauka`}
                                    className={`rounded-lg mx-auto shadow-lg transition-colors duration-300 ${isZoomed
                                        ? 'max-w-none cursor-zoom-out transform scale-150'
                                        : 'max-w-full max-h-[50vh] object-contain cursor-zoom-in hover:shadow-xl'
                                        }`}
                                />
                            </div>

                            {/* Meter Reading Comparison */}
                            <div className="px-5 py-4 border-t border-slate-100 bg-white">
                                <div className="grid grid-cols-3 gap-4 mb-4">
                                    {/* Previous Reading */}
                                    <div className="bg-slate-50 rounded-xl p-3 text-center">
                                        <div className="text-xs text-slate-500 font-medium mb-1">Ankstesnis</div>
                                        <div className="text-lg font-bold text-slate-700 tabular-nums">
                                            {fmt(meter.previousReading)}
                                        </div>
                                        <div className="text-xs text-slate-400">{meter.unit}</div>
                                    </div>

                                    {/* Current Reading - highlighted */}
                                    <div className="bg-teal-50 border-2 border-teal-200 rounded-xl p-3 text-center">
                                        <div className="text-xs text-teal-600 font-medium mb-1">Nuomininko įvestas</div>
                                        <div className="text-xl font-bold text-teal-700 tabular-nums">
                                            {fmt(meter.currentReading)}
                                        </div>
                                        <div className="text-xs text-teal-500">{meter.unit}</div>
                                    </div>

                                    {/* Consumption */}
                                    <div className="bg-amber-50 rounded-xl p-3 text-center">
                                        <div className="text-xs text-amber-600 font-medium mb-1">Suvartojimas</div>
                                        <div className="text-lg font-bold text-amber-700 tabular-nums">
                                            {meter.previousReading !== null && meter.currentReading !== null
                                                ? (meter.currentReading - meter.previousReading).toLocaleString('lt-LT')
                                                : '—'}
                                        </div>
                                        <div className="text-xs text-amber-500">{meter.unit}</div>
                                    </div>
                                </div>

                                {/* Cost calculation if tariff exists */}
                                {meter.tariff && meter.previousReading !== null && meter.currentReading !== null && (
                                    <div className="flex items-center justify-center gap-2 mb-4 py-2 px-4 bg-slate-50 rounded-lg">
                                        <span className="text-sm text-slate-500">Apskaičiuota suma:</span>
                                        <span className="text-lg font-bold text-slate-900 tabular-nums">
                                            {((meter.currentReading - meter.previousReading) * meter.tariff).toFixed(2)} €
                                        </span>
                                        <span className="text-xs text-slate-400">
                                            ({meter.tariff} €/{meter.unit})
                                        </span>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex items-center gap-3">
                                    {/* Reject Button */}
                                    <button
                                        onClick={() => {
                                            onReject?.(meter.id);
                                            setShowPhotoModal(false);
                                        }}
                                        className="flex-1 h-11 flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 font-semibold rounded-xl transition-colors border border-red-200"
                                    >
                                        <XCircle className="w-5 h-5" />
                                        Atmesti
                                    </button>

                                    {/* Approve Button */}
                                    <button
                                        onClick={() => {
                                            if (meter.currentReading !== null) {
                                                onApprove?.(meter.id, meter.currentReading);
                                            }
                                            setShowPhotoModal(false);
                                        }}
                                        className="flex-1 h-11 flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl transition-colors shadow-sm"
                                    >
                                        <Check className="w-5 h-5" />
                                        Patvirtinti rodmenį
                                    </button>
                                </div>

                                {/* Hint that photo is clickable for zoom */}
                                <p className="text-center text-xs text-slate-400 mt-3">
                                    🔍 Paspauskite nuotrauką, kad {isZoomed ? 'sumažintumėte' : 'padidintumėte'}
                                </p>
                            </div>
                        </div>
                    </div>,
                    document.body
                )
            }
        </>
    );
});

MeterRow.displayName = 'MeterRow';
export default MeterRow;
