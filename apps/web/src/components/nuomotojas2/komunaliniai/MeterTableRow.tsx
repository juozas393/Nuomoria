import React, { useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { ChevronDown, ChevronRight, MoreHorizontal, AlertCircle, CheckCircle, Clock, Zap, Droplets, Flame, Camera, Target } from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

export interface MeterData {
    id: string;
    name: string;
    category: 'elektra' | 'vanduo' | 'sildymas' | 'dujos';
    scope: 'individual' | 'communal';
    unit: string;
    unitLabel?: string;
    previousReading: number | null;
    previousReadingDate: string | null;
    currentReading: number | null;
    status: 'missing' | 'photo' | 'pending' | 'ok';
    photoRequired: boolean;
    photoUrl?: string;
    tariff?: number;
    consumption?: number;
    cost?: number;
}

interface MeterTableRowProps {
    meter: MeterData;
    isExpanded: boolean;
    onToggleExpand: () => void;
    draftValue: string | null;
    onDraftChange: (value: string) => void;
    hasError: boolean;
    errorMessage?: string;
    onPhotoUpload?: () => void;
    onViewHistory?: () => void;
    onOpenMenu?: () => void;
    isSelected?: boolean;
    onSelectionChange?: (selected: boolean) => void;
    onNavigateNext?: () => void;
    onNavigatePrev?: () => void;
    showCheckbox?: boolean;
    isOddRow?: boolean;
}

export interface MeterTableRowRef {
    focusInput: () => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const CATEGORY_ICONS = {
    elektra: Zap,
    vanduo: Droplets,
    sildymas: Flame,
    dujos: Flame,
};

const CATEGORY_COLORS = {
    elektra: 'text-yellow-600 bg-yellow-50',
    vanduo: 'text-blue-600 bg-blue-50',
    sildymas: 'text-orange-600 bg-orange-50',
    dujos: 'text-purple-600 bg-purple-50',
};

const STATUS_CONFIG = {
    missing: { label: 'Nepateikta', icon: AlertCircle, bgColor: 'bg-gray-100', textColor: 'text-gray-600' },
    photo: { label: 'Reikia foto', icon: Camera, bgColor: 'bg-amber-100', textColor: 'text-amber-700' },
    pending: { label: 'Laukia', icon: Clock, bgColor: 'bg-blue-100', textColor: 'text-blue-700' },
    ok: { label: 'Tvarkoje', icon: CheckCircle, bgColor: 'bg-green-100', textColor: 'text-green-700' },
};

// =============================================================================
// COMPONENT - PROFESSIONAL TABLE ROW
// =============================================================================

export const MeterTableRow = forwardRef<MeterTableRowRef, MeterTableRowProps>(({
    meter,
    isExpanded,
    onToggleExpand,
    draftValue,
    onDraftChange,
    hasError,
    errorMessage,
    onOpenMenu,
    isSelected = false,
    onSelectionChange,
    onNavigateNext,
    onNavigatePrev,
    showCheckbox = false,
    isOddRow = false,
}, ref) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const CategoryIcon = CATEGORY_ICONS[meter.category];
    const statusConfig = STATUS_CONFIG[meter.status];
    const StatusIcon = statusConfig.icon;

    const displayValue = draftValue !== null ? draftValue : (meter.currentReading?.toString() ?? '');
    const isDirty = draftValue !== null && draftValue !== (meter.currentReading?.toString() ?? '');

    useImperativeHandle(ref, () => ({
        focusInput: () => {
            inputRef.current?.focus();
            inputRef.current?.select();
        }
    }));

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (e.shiftKey) {
                onNavigatePrev?.();
            } else {
                onNavigateNext?.();
            }
        }
        if (e.key === 'Escape') {
            onDraftChange(meter.currentReading?.toString() ?? '');
            e.currentTarget.blur();
        }
        if (e.key === ',') {
            e.preventDefault();
            const input = e.currentTarget;
            const start = input.selectionStart ?? input.value.length;
            const end = input.selectionEnd ?? input.value.length;
            const newValue = input.value.slice(0, start) + '.' + input.value.slice(end);
            onDraftChange(newValue);
        }
    }, [meter.currentReading, onDraftChange, onNavigateNext, onNavigatePrev]);

    const showWarning = draftValue !== null &&
        meter.previousReading !== null &&
        parseFloat(draftValue) < meter.previousReading;

    // Dynamic display
    const consumptionDisplay = (() => {
        if (draftValue && meter.previousReading !== null) {
            const current = parseFloat(draftValue);
            if (!isNaN(current) && current >= meter.previousReading) {
                return `${(current - meter.previousReading).toLocaleString('lt-LT')} ${meter.unit}`;
            }
        }
        if (meter.consumption !== undefined && meter.consumption > 0) {
            return `${meter.consumption.toLocaleString('lt-LT')} ${meter.unit}`;
        }
        return null;
    })();

    const costDisplay = (() => {
        if (draftValue && meter.previousReading !== null && meter.tariff) {
            const current = parseFloat(draftValue);
            if (!isNaN(current) && current >= meter.previousReading) {
                const consumption = current - meter.previousReading;
                return `${(consumption * meter.tariff).toFixed(2)} €`;
            }
        }
        if (meter.cost !== undefined && meter.cost > 0) {
            return `${meter.cost.toFixed(2)} €`;
        }
        return null;
    })();

    // Row background
    const rowBg = isDirty
        ? 'bg-amber-50/60'
        : hasError || showWarning
            ? 'bg-red-50/60'
            : isSelected
                ? 'bg-teal-50/60'
                : isOddRow
                    ? 'bg-gray-50/50'
                    : 'bg-white';

    return (
        <>
            {/* Main Row - Professional: 42px height */}
            <tr className={`border-b border-gray-100 hover:bg-gray-100/50 transition-colors ${rowBg}`}>
                {/* Checkbox - 32px */}
                {showCheckbox && (
                    <td className="w-8 px-3 py-2.5">
                        <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => onSelectionChange?.(e.target.checked)}
                            className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 focus:ring-offset-0"
                        />
                    </td>
                )}

                {/* Meter Name - min 240px, flexible */}
                <td className="min-w-[240px] px-3 py-2.5">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onToggleExpand}
                            className="p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                        >
                            {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-gray-400" />
                            ) : (
                                <ChevronRight className="w-4 h-4 text-gray-400" />
                            )}
                        </button>
                        <div className={`p-1 rounded ${CATEGORY_COLORS[meter.category]}`}>
                            <CategoryIcon className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-medium text-gray-900 truncate" title={meter.name}>
                            {meter.name}
                        </span>
                    </div>
                </td>

                {/* Type - 72px */}
                <td className="w-[72px] px-3 py-2.5">
                    <span className="text-xs font-medium text-gray-500">
                        {meter.scope === 'individual' ? 'Ind.' : 'Ben.'}
                    </span>
                </td>

                {/* Status Badge - 120px */}
                <td className="w-[120px] px-3 py-2.5">
                    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.textColor}`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        <span>{statusConfig.label}</span>
                    </div>
                </td>

                {/* Previous Reading - 90px, right aligned */}
                <td className="w-[90px] px-3 py-2.5 text-right">
                    <span className="text-sm tabular-nums text-gray-600">
                        {meter.previousReading !== null
                            ? meter.previousReading.toLocaleString('lt-LT')
                            : <span className="text-gray-400">—</span>
                        }
                    </span>
                </td>

                {/* Current Reading Input - 140px */}
                <td className="w-[140px] px-3 py-2.5">
                    <div className="relative">
                        <input
                            ref={inputRef}
                            type="text"
                            inputMode="decimal"
                            value={displayValue}
                            onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.');
                                onDraftChange(val);
                            }}
                            onKeyDown={handleKeyDown}
                            onFocus={(e) => e.target.select()}
                            placeholder="Įveskite"
                            className={`
                                w-full h-8 px-2.5 text-sm tabular-nums border rounded-md
                                focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent
                                placeholder:text-gray-400
                                ${hasError || showWarning
                                    ? 'border-red-300 bg-red-50'
                                    : isDirty
                                        ? 'border-amber-300 bg-amber-50'
                                        : 'border-gray-200 bg-white hover:border-gray-300'
                                }
                            `}
                        />
                        {showWarning && (
                            <span className="absolute right-[-20px] top-1/2 -translate-y-1/2" title="Rodmuo mažesnis nei ankstesnis">
                                <AlertCircle className="w-4 h-4 text-red-500" />
                            </span>
                        )}
                    </div>
                    {hasError && errorMessage && (
                        <p className="mt-1 text-xs text-red-600">{errorMessage}</p>
                    )}
                </td>

                {/* Consumption - 110px, right aligned */}
                <td className="w-[110px] px-3 py-2.5 text-right">
                    <span className="text-sm tabular-nums text-gray-600">
                        {consumptionDisplay ?? <span className="text-gray-400">—</span>}
                    </span>
                </td>

                {/* Cost - 90px, right aligned */}
                <td className="w-[90px] px-3 py-2.5 text-right">
                    <span className="text-sm tabular-nums font-medium text-gray-900">
                        {costDisplay ?? <span className="text-gray-400">—</span>}
                    </span>
                </td>

                {/* Actions - 64px */}
                <td className="w-16 px-3 py-2.5">
                    <div className="flex items-center gap-1 justify-end">
                        {meter.status === 'missing' && (
                            <button
                                onClick={() => inputRef.current?.focus()}
                                className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded transition-colors"
                                title="Fokusuoti įvedimą"
                            >
                                <Target className="w-4 h-4" />
                            </button>
                        )}
                        <button
                            onClick={onOpenMenu}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                            title="Daugiau veiksmų"
                        >
                            <MoreHorizontal className="w-4 h-4" />
                        </button>
                    </div>
                </td>
            </tr>

            {/* Expanded Details */}
            {isExpanded && (
                <tr className="bg-gray-50 border-b border-gray-100">
                    <td colSpan={showCheckbox ? 9 : 8} className="px-6 py-4">
                        <div className="grid grid-cols-4 gap-6 text-sm">
                            <div>
                                <span className="text-gray-500 block mb-0.5">Tarifas</span>
                                <span className="font-medium text-gray-900">
                                    {meter.tariff ? `${meter.tariff} €/${meter.unit}` : '—'}
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-500 block mb-0.5">Tipas</span>
                                <span className="font-medium text-gray-900">
                                    {meter.scope === 'individual' ? 'Individualus' : 'Bendras'}
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-500 block mb-0.5">Nuotrauka</span>
                                <span className="font-medium text-gray-900">
                                    {meter.photoRequired ? 'Reikalinga' : 'Nereikalinga'}
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-500 block mb-0.5">Paskutinis įrašas</span>
                                <span className="font-medium text-gray-900">
                                    {meter.previousReadingDate ?? '—'}
                                </span>
                            </div>
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
});

MeterTableRow.displayName = 'MeterTableRow';

export default MeterTableRow;
