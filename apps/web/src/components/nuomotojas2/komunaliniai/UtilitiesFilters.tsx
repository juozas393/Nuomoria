import React from 'react';
import { Search, X, Edit3 } from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

export type MeterCategory = 'all' | 'elektra' | 'vanduo' | 'sildymas' | 'dujos';
export type MeterScope = 'all' | 'individual' | 'communal';

interface UtilitiesFiltersProps {
    searchQuery: string;
    onSearchChange: (query: string) => void;
    categoryFilter: MeterCategory;
    onCategoryChange: (category: MeterCategory) => void;
    scopeFilter: MeterScope;
    onScopeChange: (scope: MeterScope) => void;
    // New: "Įvesti visus" in filter bar
    missingCount?: number;
    onEnterAllReadings?: () => void;
}

// =============================================================================
// SEGMENTED CONTROL COMPONENT
// =============================================================================

interface SegmentedControlProps<T extends string> {
    options: { id: T; label: string }[];
    value: T;
    onChange: (value: T) => void;
}

function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>) {
    return (
        <div className="inline-flex bg-gray-100 rounded-lg p-0.5">
            {options.map((option) => (
                <button
                    key={option.id}
                    onClick={() => onChange(option.id)}
                    className={`
                        px-3 py-1.5 text-sm font-medium rounded-md transition-colors
                        ${value === option.id
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }
                    `}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}

// =============================================================================
// COMPONENT - PROFESSIONAL FILTER BAR
// =============================================================================

const CATEGORY_OPTIONS: { id: MeterCategory; label: string }[] = [
    { id: 'all', label: 'Visi' },
    { id: 'elektra', label: 'Elektra' },
    { id: 'vanduo', label: 'Vanduo' },
    { id: 'sildymas', label: 'Šildymas' },
    { id: 'dujos', label: 'Dujos' },
];

const SCOPE_OPTIONS: { id: MeterScope; label: string }[] = [
    { id: 'all', label: 'Visi' },
    { id: 'individual', label: 'Individualūs' },
    { id: 'communal', label: 'Bendri' },
];

export const UtilitiesFilters: React.FC<UtilitiesFiltersProps> = ({
    searchQuery,
    onSearchChange,
    categoryFilter,
    onCategoryChange,
    scopeFilter,
    onScopeChange,
    missingCount = 0,
    onEnterAllReadings,
}) => {
    const hasActiveFilters = categoryFilter !== 'all' || scopeFilter !== 'all' || searchQuery.length > 0;

    const clearFilters = () => {
        onSearchChange('');
        onCategoryChange('all');
        onScopeChange('all');
    };

    return (
        <div className="px-4 py-3 bg-white border-b border-gray-200 flex items-center gap-4 flex-wrap">
            {/* Search Input */}
            <div className="relative w-[280px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                    type="text"
                    placeholder="Ieškoti skaitliuko..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full h-9 pl-10 pr-3 text-sm border border-gray-200 rounded-lg 
                               focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent
                               placeholder:text-gray-400"
                />
            </div>

            {/* Divider */}
            <div className="w-px h-6 bg-gray-200" />

            {/* Category Segmented Control */}
            <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Tipas:</span>
                <SegmentedControl
                    options={CATEGORY_OPTIONS}
                    value={categoryFilter}
                    onChange={onCategoryChange}
                />
            </div>

            {/* Divider */}
            <div className="w-px h-6 bg-gray-200" />

            {/* Scope Segmented Control */}
            <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Nuosavybė:</span>
                <SegmentedControl
                    options={SCOPE_OPTIONS}
                    value={scopeFilter}
                    onChange={onScopeChange}
                />
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
                <button
                    onClick={clearFilters}
                    className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                    <X className="w-3.5 h-3.5" />
                    Valyti filtrus
                </button>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* "Įvesti visus" Secondary Button */}
            {missingCount > 0 && onEnterAllReadings && (
                <button
                    onClick={onEnterAllReadings}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium 
                               bg-gray-100 text-gray-700 rounded-lg 
                               hover:bg-gray-200 transition-colors"
                >
                    <Edit3 className="w-4 h-4" />
                    Įvesti visus ({missingCount})
                </button>
            )}
        </div>
    );
};

export default UtilitiesFilters;
