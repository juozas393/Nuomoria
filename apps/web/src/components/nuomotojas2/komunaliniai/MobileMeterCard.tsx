import React from 'react';
import { ChevronRight, Camera, AlertCircle, CheckCircle, Clock, Zap, Droplets, Flame } from 'lucide-react';
import { MeterData } from './MeterTableRow';

// =============================================================================
// TYPES
// =============================================================================

interface MobileMeterCardProps {
    meter: MeterData;
    onClick: () => void;
    draftValue: string | null;
    isDirty: boolean;
    hasError: boolean;
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
    missing: { label: 'Trūksta', icon: AlertCircle, color: 'text-red-600 bg-red-50 border-red-200' },
    photo: { label: 'Foto', icon: Camera, color: 'text-amber-600 bg-amber-50 border-amber-200' },
    pending: { label: 'Laukia', icon: Clock, color: 'text-blue-600 bg-blue-50 border-blue-200' },
    ok: { label: 'OK', icon: CheckCircle, color: 'text-green-600 bg-green-50 border-green-200' },
};

// =============================================================================
// COMPONENT
// =============================================================================

export const MobileMeterCard: React.FC<MobileMeterCardProps> = ({
    meter,
    onClick,
    draftValue,
    isDirty,
    hasError,
}) => {
    const CategoryIcon = CATEGORY_ICONS[meter.category];
    const statusConfig = STATUS_CONFIG[meter.status];
    const StatusIcon = statusConfig.icon;

    return (
        <button
            onClick={onClick}
            className={`w-full p-4 bg-white border rounded-lg text-left transition-colors active:scale-[0.98] ${hasError
                    ? 'border-red-300 bg-red-50/50'
                    : isDirty
                        ? 'border-amber-300 bg-amber-50/50'
                        : 'border-gray-200 hover:border-gray-300'
                }`}
        >
            <div className="flex items-start justify-between">
                {/* Left: Icon + Name */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${CATEGORY_COLORS[meter.category]}`}>
                        <CategoryIcon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-gray-900 truncate">{meter.name}</h3>
                        <p className="text-sm text-gray-500">{meter.unitLabel || meter.unit}</p>
                    </div>
                </div>

                {/* Right: Status + Arrow */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    <div className={`flex items-center gap-1 px-2 py-1 rounded border text-xs font-medium ${statusConfig.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig.label}
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
            </div>

            {/* Bottom row: Readings */}
            <div className="mt-3 grid grid-cols-3 gap-3">
                <div>
                    <p className="text-xs text-gray-500">Ankstesnis</p>
                    <p className="font-medium text-gray-700">
                        {meter.previousReading !== null
                            ? meter.previousReading.toLocaleString('lt-LT')
                            : '—'}
                    </p>
                </div>
                <div>
                    <p className="text-xs text-gray-500">Dabartinis</p>
                    <p className={`font-medium ${hasError ? 'text-red-600' : isDirty ? 'text-amber-600' : 'text-teal-600'}`}>
                        {draftValue !== null
                            ? draftValue || '—'
                            : meter.currentReading !== null
                                ? meter.currentReading.toLocaleString('lt-LT')
                                : '—'}
                    </p>
                </div>
                <div>
                    <p className="text-xs text-gray-500">Kaina</p>
                    <p className="font-medium text-gray-900">
                        {meter.cost !== undefined ? `${meter.cost.toFixed(2)} €` : '—'}
                    </p>
                </div>
            </div>
        </button>
    );
};

// =============================================================================
// MOBILE METER LIST
// =============================================================================

interface MobileMeterListProps {
    meters: MeterData[];
    expandedRows: Set<string>;
    onToggleExpand: (meterId: string) => void;
    getDraft: (meterId: string) => { value: string; hasError: boolean; errorMessage?: string } | null;
    onSelectMeter: (meterId: string) => void;
}

export const MobileMeterList: React.FC<MobileMeterListProps> = ({
    meters,
    getDraft,
    onSelectMeter,
}) => {
    if (meters.length === 0) {
        return (
            <div className="flex items-center justify-center py-12 text-gray-500">
                <p className="text-sm">Nerasta skaitiklių</p>
            </div>
        );
    }

    return (
        <div className="p-4 space-y-3">
            {meters.map(meter => {
                const draft = getDraft(meter.id);
                const isDirty = draft !== null && draft.value !== (meter.currentReading?.toString() ?? '');

                return (
                    <MobileMeterCard
                        key={meter.id}
                        meter={meter}
                        onClick={() => onSelectMeter(meter.id)}
                        draftValue={draft?.value ?? null}
                        isDirty={isDirty}
                        hasError={draft?.hasError ?? false}
                    />
                );
            })}
        </div>
    );
};

export default MobileMeterCard;
