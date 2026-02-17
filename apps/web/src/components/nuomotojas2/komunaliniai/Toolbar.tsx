import React from 'react';
import { Search, Edit3 } from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

export type MeterCategory = 'all' | 'elektra' | 'vanduo' | 'sildymas' | 'dujos';
export type MeterScope = 'all' | 'individual' | 'communal';

interface ToolbarProps {
    searchQuery: string;
    onSearchChange: (query: string) => void;
    categoryFilter: MeterCategory;
    onCategoryChange: (category: MeterCategory) => void;
    scopeFilter: MeterScope;
    onScopeChange: (scope: MeterScope) => void;
    missingCount?: number;
    onEnterAllReadings?: () => void;
}

// =============================================================================
// UNIFIED SEGMENTED CONTROL
// =============================================================================

interface SegmentedProps<T extends string> {
    options: { id: T; label: string }[];
    value: T;
    onChange: (value: T) => void;
}

function Segmented<T extends string>({ options, value, onChange }: SegmentedProps<T>) {
    return (
        <div className="inline-flex h-8 border border-gray-200 rounded-md overflow-hidden">
            {options.map((option, index) => (
                <button
                    key={option.id}
                    onClick={() => onChange(option.id)}
                    className={`
                        px-3 text-sm transition-colors
                        ${index > 0 ? 'border-l border-gray-200' : ''}
                        ${value === option.id
                            ? 'bg-gray-100 text-gray-900 font-medium'
                            : 'bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900'
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
// COMPONENT - UNIFIED TOOLBAR
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
    { id: 'individual', label: 'Ind.' },
    { id: 'communal', label: 'Ben.' },
];

export const Toolbar: React.FC<ToolbarProps> = ({
    searchQuery,
    onSearchChange,
    categoryFilter,
    onCategoryChange,
    scopeFilter,
    onScopeChange,
    missingCount = 0,
    onEnterAllReadings,
}) => {
    return (
        <div className="px-6 py-3 bg-white border-b border-gray-200 flex items-center gap-4">
            {/* Search */}
            <div className="relative w-48">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                    type="text"
                    placeholder="Ieškoti..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full h-8 pl-8 pr-3 text-sm border border-gray-200 rounded-md 
                               bg-white placeholder:text-gray-400
                               focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
            </div>

            {/* Category - Unified style */}
            <Segmented
                options={CATEGORY_OPTIONS}
                value={categoryFilter}
                onChange={onCategoryChange}
            />

            {/* Scope - Same unified style */}
            <Segmented
                options={SCOPE_OPTIONS}
                value={scopeFilter}
                onChange={onScopeChange}
            />

            <div className="flex-1" />

            {/* Secondary Button - Proper button, not text link */}
            {missingCount > 0 && onEnterAllReadings && (
                <button
                    onClick={onEnterAllReadings}
                    className="flex items-center gap-2 h-8 px-3 text-sm font-medium
                               bg-gray-100 text-gray-700 rounded-md
                               hover:bg-gray-200 hover:text-gray-900 transition-colors"
                >
                    <Edit3 className="w-4 h-4" />
                    Įvesti visus ({missingCount})
                </button>
            )}
        </div>
    );
};

export default Toolbar;
