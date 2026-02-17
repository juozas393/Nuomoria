import React, { useRef, useCallback, forwardRef, useImperativeHandle, useState } from 'react';
import { Zap, Droplets, Flame, MoreHorizontal, AlertTriangle, History, Camera, Trash2, Eye, X, ImageIcon, Check, XCircle } from 'lucide-react';

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
    photoUrl?: string | null;  // Tenant-submitted photo URL
}

interface MeterRowProps {
    meter: MeterData;
    draftValue: string | null;
    onDraftChange: (value: string) => void;
    hasError: boolean;
    onNavigateNext?: () => void;
    onNavigatePrev?: () => void;
    onRowAction?: (action: 'history' | 'photo' | 'delete') => void;
    onPreviousReadingChange?: (meterId: string, value: number) => void;
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
    photo: { color: '#3B82F6', label: 'Laukia' },     // Same as pending (merged)
    pending: { color: '#3B82F6', label: 'Laukia' },
    ok: { color: '#10B981', label: 'Patvirtinta' },
};

// ════════════════════════════════════════════════════════════════════════════
// FORMATTERS - Null = em-dash for clean ledger scan
// ════════════════════════════════════════════════════════════════════════════

const fmt = (v: number | null | undefined): string =>
    v == null ? '—' : v.toLocaleString('lt-LT');

const fmtCost = (v: number | null | undefined): string =>
    (v == null || v === 0) ? '—' : `${v.toFixed(2)} €`;

const fmtConsumption = (v: number | null | undefined, unit: string): string =>
    v == null ? '—' : `${v.toLocaleString('lt-LT')} ${unit}`;

// ════════════════════════════════════════════════════════════════════════════
// METER ROW - Clean Executive Implementation
// ════════════════════════════════════════════════════════════════════════════

export const MeterRow = forwardRef<MeterRowRef, MeterRowProps>(({
    meter, draftValue, onDraftChange, hasError, onNavigateNext, onNavigatePrev, onRowAction, onPreviousReadingChange, onApprove, onReject,
}, ref) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [showMenu, setShowMenu] = useState(false);
    const [showPhotoModal, setShowPhotoModal] = useState(false);
    const [isZoomed, setIsZoomed] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [isPrevFocused, setIsPrevFocused] = useState(false);
    const [prevDraft, setPrevDraft] = useState<string | null>(null);

    const Icon = ICONS[meter.category];
    const iconColor = ICON_COLORS[meter.category];
    const status = STATUS_CONFIG[meter.status];

    // Derived state
    const displayValue = draftValue !== null ? draftValue : (meter.currentReading?.toString() ?? '');
    const isDirty = draftValue !== null && draftValue !== (meter.currentReading?.toString() ?? '');
    const showWarning = draftValue !== null && meter.previousReading !== null && parseFloat(draftValue) < meter.previousReading;
    // All meters are always editable
    const isEditable = true;
    const needsInput = meter.status === 'missing' && !meter.currentReading;

    // Live calculation
    const consumption = (() => {
        if (draftValue && meter.previousReading !== null) {
            const val = parseFloat(draftValue);
            if (!isNaN(val) && val >= meter.previousReading) return val - meter.previousReading;
        }
        return meter.consumption ?? null;
    })();

    const cost = (() => {
        if (consumption !== null && meter.tariff) return consumption * meter.tariff;
        return (meter.cost && meter.cost > 0) ? meter.cost : null;
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
        ? 'bg-red-50/60'
        : isDirty
            ? 'bg-amber-50/40'
            : 'bg-white hover:bg-slate-50/80';

    return (
        <>
            <tr className={`group transition-colors duration-100 ${rowBg}`}>

                {/* ══════════════════════════════════════════════════════════════
               COLUMN 1: Meter Identity
               - Neutral icon container (bg-slate-50, border-slate-100)
               - Icon has semantic color only
               ══════════════════════════════════════════════════════════════ */}
                <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3.5">
                        {/* Icon - Clean Executive: neutral bg, colored icon */}
                        <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0">
                            <Icon className="w-5 h-5" style={{ color: iconColor }} strokeWidth={2} />
                        </div>

                        <div className="min-w-0">
                            <div className="font-semibold text-slate-900 text-sm leading-tight truncate">
                                {meter.name}
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                                <span>{meter.scope === 'individual' ? 'Individualus' : 'Bendras'}</span>
                                <span className="text-slate-300">·</span>
                                {meter.tariff != null && meter.tariff > 0 ? (
                                    <span className="text-teal-600 font-medium">
                                        {meter.tariff.toLocaleString('lt-LT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €/{meter.fixedPrice ? 'mėn.' : meter.unit}
                                    </span>
                                ) : (
                                    <span>{meter.unit}</span>
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
                            className="flex items-center gap-2 hover:bg-slate-100 rounded-lg px-2 py-1 -mx-2 -my-1 transition-colors group"
                            title="Peržiūrėti nuotrauką"
                        >
                            <span
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: status.color }}
                            />
                            <span className="text-sm text-slate-600 group-hover:text-teal-600">{status.label}</span>
                            <span className="text-xs opacity-70 group-hover:opacity-100">📷</span>
                            <Eye className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                    ) : (
                        <div className="flex items-center gap-2">
                            <span
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: status.color }}
                            />
                            <span className="text-sm text-slate-600">{status.label}</span>
                        </div>
                    )}
                </td>

                {/* ══════════════════════════════════════════════════════════════
               COLUMN 3: Previous Reading - tabular-nums, right aligned
               ══════════════════════════════════════════════════════════════ */}
                <td className="px-4 py-3.5 text-right">
                    {onPreviousReadingChange ? (
                        <div className="relative">
                            <input
                                type="text"
                                inputMode="decimal"
                                value={prevDraft !== null ? prevDraft : (meter.previousReading?.toString() ?? '')}
                                onChange={(e) => {
                                    const cleaned = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.');
                                    setPrevDraft(cleaned);
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
                                placeholder="—"
                                className={`
                                    w-full h-9 px-3 text-sm text-right tabular-nums font-medium rounded-lg
                                    transition-colors duration-150 placeholder:text-slate-300
                                    focus:outline-none
                                    ${isPrevFocused
                                        ? 'bg-white border border-teal-500 ring-2 ring-teal-500/20 text-slate-900'
                                        : 'bg-transparent border border-transparent hover:border-slate-200 hover:bg-slate-50 text-slate-500'
                                    }
                                `}
                            />
                        </div>
                    ) : (
                        <span className="text-sm text-slate-500 tabular-nums font-medium">
                            {fmt(meter.previousReading)}
                        </span>
                    )}
                </td>

                {/* ══════════════════════════════════════════════════════════════
               COLUMN 4: Current Reading - True Inline Editor
               - bg-transparent when idle
               - border reveals on hover/focus
               - tabular-nums, right aligned
               ══════════════════════════════════════════════════════════════ */}
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
                                placeholder="—"
                                className={`
                                w-full h-9 px-3 text-sm text-right tabular-nums font-medium rounded-lg
                                transition-colors duration-150 placeholder:text-slate-300
                                focus:outline-none
                                ${hasError || showWarning
                                        ? 'bg-red-50 border border-red-300 text-red-700 ring-2 ring-red-500/20'
                                        : isDirty
                                            ? 'bg-amber-50 border border-amber-300 text-amber-700'
                                            : isFocused
                                                ? 'bg-white border border-teal-500 ring-2 ring-teal-500/20 text-slate-900'
                                                : needsInput
                                                    ? 'bg-slate-50 border border-slate-200 hover:border-teal-400 text-slate-900'
                                                    : 'bg-transparent border border-transparent hover:border-slate-200 hover:bg-slate-50 text-slate-900'
                                    }
                            `}
                            />
                            {(hasError || showWarning) && (
                                <AlertTriangle className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
                            )}
                        </div>
                    ) : (
                        <div className="h-9 flex items-center justify-end pr-3">
                            <span className="text-sm text-slate-300 tabular-nums">—</span>
                        </div>
                    )}
                </td>

                {/* ══════════════════════════════════════════════════════════════
               COLUMN 5: Consumption - Live calculation feedback
               ══════════════════════════════════════════════════════════════ */}
                <td className="px-4 py-3.5 text-right">
                    <span className={`text-sm tabular-nums font-medium ${consumption && consumption > 0 ? 'text-slate-700' : 'text-slate-300'
                        }`}>
                        {fmtConsumption(consumption, meter.unit)}
                    </span>
                </td>

                {/* ══════════════════════════════════════════════════════════════
               COLUMN 6: Cost - Finalized cost, font-semibold
               ══════════════════════════════════════════════════════════════ */}
                <td className="px-4 py-3.5 text-right">
                    <span className={`text-sm tabular-nums font-semibold ${cost && cost > 0 ? 'text-slate-900' : 'text-slate-300'
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
                        className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                    >
                        <MoreHorizontal className="w-4 h-4" />
                    </button>

                    {showMenu && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                            <div className="absolute top-full right-0 mt-1 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50 min-w-[160px]">
                                <button
                                    onClick={() => { onRowAction?.('history'); setShowMenu(false); }}
                                    className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 font-medium"
                                >
                                    <History className="w-4 h-4 text-slate-400" />
                                    Rodmenų istorija
                                </button>

                                {/* Photo action - View if exists, Add if not */}
                                {meter.photoUrl ? (
                                    <button
                                        onClick={() => { setShowPhotoModal(true); setShowMenu(false); }}
                                        className="w-full px-3 py-2 text-left text-sm text-teal-700 hover:bg-teal-50 flex items-center gap-2.5 font-medium"
                                    >
                                        <Eye className="w-4 h-4 text-teal-500" />
                                        Peržiūrėti nuotrauką
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => { onRowAction?.('photo'); setShowMenu(false); }}
                                        className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 font-medium"
                                    >
                                        <Camera className="w-4 h-4 text-slate-400" />
                                        Pridėti nuotrauką
                                    </button>
                                )}

                                <hr className="my-1 border-slate-100" />
                                <button
                                    onClick={() => { onRowAction?.('delete'); setShowMenu(false); }}
                                    className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2.5 font-medium"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Šalinti skaitiklį
                                </button>
                            </div>
                        </>
                    )}
                </td>
            </tr>

            {/* Photo Lightbox Modal */}
            {
                showPhotoModal && meter.photoUrl && (
                    <tr className="contents">
                        <td colSpan={7}>
                            <div
                                className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
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
                            </div>
                        </td>
                    </tr>
                )}
        </>
    );
});

MeterRow.displayName = 'MeterRow';
export default MeterRow;
