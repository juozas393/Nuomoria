import React from 'react';
import { ChevronDown } from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

export type MeterCategory = 'all' | 'elektra' | 'vanduo' | 'sildymas' | 'dujos';
export type MeterScope = 'all' | 'individual' | 'communal';

interface WorkSurfaceHeaderProps {
    // Status counts
    total: number;
    missingReadings: number;
    missingPhotos: number;
    pendingApproval: number;
    ok: number;
    activeFilter: StatusFilter | null;
    onFilterChange: (filter: StatusFilter | null) => void;
    // Filters
    categoryFilter: MeterCategory;
    onCategoryChange: (category: MeterCategory) => void;
    scopeFilter: MeterScope;
    onScopeChange: (scope: MeterScope) => void;
    // Action
    missingCount: number;
    onEnterAll: () => void;
}

export type StatusFilter = 'missing' | 'photo' | 'pending' | 'ok';

// =============================================================================
// DROPDOWN COMPONENT
// =============================================================================

interface DropdownProps {
    label: string;
    value: string;
    options: { id: string; label: string }[];
    onChange: (id: string) => void;
}

const Dropdown: React.FC<DropdownProps> = ({ label, value, options, onChange }) => {
    const [open, setOpen] = React.useState(false);
    const selected = options.find(o => o.id === value);

    return (
        <div className="relative">
            <button
                onClick={() => setOpen(!open)}
                className="flex items-center gap-2 h-8 px-3 text-sm bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
            >
                <span className="text-gray-500">{label}:</span>
                <span className="font-medium text-gray-900">{selected?.label}</span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>

            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50 min-w-[140px]">
                        {options.map(opt => (
                            <button
                                key={opt.id}
                                onClick={() => { onChange(opt.id); setOpen(false); }}
                                className={`w-full px-3 py-2 text-left text-sm transition-colors ${opt.id === value ? 'bg-gray-100 font-medium text-gray-900' : 'text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

// =============================================================================
// WORK SURFACE HEADER - STATUS + FILTERS IN ONE BAR
// =============================================================================

const CATEGORY_OPTIONS = [
    { id: 'all', label: 'Visi' },
    { id: 'elektra', label: 'Elektra' },
    { id: 'vanduo', label: 'Vanduo' },
    { id: 'sildymas', label: 'Šildymas' },
    { id: 'dujos', label: 'Dujos' },
];

const SCOPE_OPTIONS = [
    { id: 'all', label: 'Visi' },
    { id: 'individual', label: 'Individualūs' },
    { id: 'communal', label: 'Bendri' },
];

export const WorkSurfaceHeader: React.FC<WorkSurfaceHeaderProps> = ({
    total,
    missingReadings,
    missingPhotos,
    pendingApproval,
    ok,
    activeFilter,
    onFilterChange,
    categoryFilter,
    onCategoryChange,
    scopeFilter,
    onScopeChange,
    missingCount,
    onEnterAll,
}) => {
    const segments: { id: StatusFilter | null; label: string; count: number }[] = [
        { id: null, label: 'Visi', count: total },
        { id: 'missing', label: 'Trūksta', count: missingReadings },
        { id: 'photo', label: 'Nuotraukos', count: missingPhotos },
        { id: 'pending', label: 'Laukia', count: pendingApproval },
        { id: 'ok', label: 'Tvarkoje', count: ok },
    ];

    return (
        <div className="border-b border-gray-200">
            {/* Status Bar with underline track */}
            <div className="px-5 pt-4 pb-0 flex items-end gap-6 border-b-2 border-gray-100">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">
                    Rodmenys
                </span>

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
                                relative pb-3 text-sm transition-colors
                                ${!isClickable ? 'cursor-default opacity-40' : 'cursor-pointer'}
                                ${isActive ? 'text-gray-900 font-semibold' : 'text-gray-500 hover:text-gray-700'}
                            `}
                        >
                            <span>{label}</span>
                            <span className={`ml-1 tabular-nums ${hasAttention && !isActive ? 'text-red-600 font-semibold' : ''}`}>
                                ({count})
                            </span>

                            {/* Active underline - 2px brand color */}
                            {isActive && (
                                <span className="absolute left-0 right-0 -bottom-0.5 h-0.5 bg-teal-600 rounded-full" />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Hint line */}
            {missingCount > 0 && (
                <div className="px-5 py-2 text-sm text-gray-500 flex items-center justify-between">
                    <span>Trūksta {missingCount} rodmenų šiam periodui.</span>
                    <button onClick={() => onFilterChange('missing')} className="text-gray-700 font-medium hover:underline">
                        Rodyti
                    </button>
                </div>
            )}

            {/* Toolbar with dropdowns */}
            <div className="px-5 py-3 flex items-center gap-3">
                <Dropdown
                    label="Tipas"
                    value={categoryFilter}
                    options={CATEGORY_OPTIONS}
                    onChange={(id) => onCategoryChange(id as MeterCategory)}
                />

                <Dropdown
                    label="Nuosavybė"
                    value={scopeFilter}
                    options={SCOPE_OPTIONS}
                    onChange={(id) => onScopeChange(id as MeterScope)}
                />

                <div className="flex-1" />

                {/* Secondary Button - Proper button */}
                {missingCount > 0 && (
                    <button
                        onClick={onEnterAll}
                        className="h-8 px-4 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        Įvesti visus ({missingCount})
                    </button>
                )}
            </div>
        </div>
    );
};

export default WorkSurfaceHeader;
