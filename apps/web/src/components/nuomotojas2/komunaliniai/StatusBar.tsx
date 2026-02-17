import React from 'react';

// =============================================================================
// TYPES
// =============================================================================

interface StatusBarProps {
    total: number;
    missingReadings: number;
    missingPhotos: number;
    pendingApproval: number;
    ok: number;
    activeFilter: StatusFilter | null;
    onFilterChange: (filter: StatusFilter | null) => void;
}

export type StatusFilter = 'missing' | 'photo' | 'pending' | 'ok';

// =============================================================================
// COMPONENT - GMAIL-STYLE SEGMENTED STATUS BAR
// =============================================================================

export const StatusBar: React.FC<StatusBarProps> = ({
    total,
    missingReadings,
    missingPhotos,
    pendingApproval,
    ok,
    activeFilter,
    onFilterChange,
}) => {
    const segments: { id: StatusFilter | null; label: string; count: number }[] = [
        { id: null, label: 'Visi', count: total },
        { id: 'missing', label: 'Trūksta', count: missingReadings },
        { id: 'photo', label: 'Nuotraukos', count: missingPhotos },
        { id: 'pending', label: 'Laukia', count: pendingApproval },
        { id: 'ok', label: 'Tvarkoje', count: ok },
    ];

    return (
        <div className="px-6 py-3 bg-white border-b border-gray-100 flex items-center">
            {/* Label */}
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mr-6">
                Rodmenys
            </span>

            {/* Segments - Gmail style */}
            <div className="flex items-center gap-6">
                {segments.map(({ id, label, count }) => {
                    const isActive = activeFilter === id;
                    const isClickable = count > 0 || id === null;
                    const hasAttention = id === 'missing' && count > 0;

                    return (
                        <button
                            key={id ?? 'all'}
                            onClick={() => isClickable && onFilterChange(isActive ? null : id)}
                            disabled={!isClickable}
                            className={`
                                relative pb-3 -mb-3 text-sm transition-colors
                                ${!isClickable ? 'cursor-default opacity-40' : 'cursor-pointer'}
                                ${isActive
                                    ? 'text-gray-900 font-semibold'
                                    : 'text-gray-600 hover:text-gray-900'
                                }
                            `}
                        >
                            <span>{label}</span>
                            <span className={`
                                ml-1.5 tabular-nums
                                ${hasAttention && !isActive ? 'text-red-600 font-semibold' : ''}
                            `}>
                                ({count})
                            </span>

                            {/* Underline indicator */}
                            <span className={`
                                absolute left-0 right-0 bottom-0 h-0.5 rounded-full transition-colors
                                ${isActive ? 'bg-gray-900' : 'bg-transparent group-hover:bg-gray-200'}
                            `} />
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default StatusBar;
