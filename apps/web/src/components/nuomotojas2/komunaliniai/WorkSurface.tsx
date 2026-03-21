import React from 'react';
import { ChevronDown, Search, Gauge, Pencil } from 'lucide-react';

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

export type StatusFilter = 'missing' | 'pending' | 'ok';
export type MeterCategory = 'all' | 'elektra' | 'vanduo' | 'sildymas' | 'dujos';
export type MeterScope = 'all' | 'individual' | 'communal';

interface RodmenysModuleProps {
    total: number;
    missingReadings: number;
    pendingApproval: number;
    pendingWithPhoto: number; // For showing camera icon badge
    ok: number;
    activeFilter: StatusFilter | null;
    onFilterChange: (filter: StatusFilter | null) => void;
    searchQuery: string;
    onSearchChange: (q: string) => void;
    categoryFilter: MeterCategory;
    onCategoryChange: (c: MeterCategory) => void;
    scopeFilter: MeterScope;
    onScopeChange: (s: MeterScope) => void;
    missingCount: number;
    onEnterAll: () => void;
    children: React.ReactNode;
    footerLeft?: React.ReactNode;
    footerRight?: React.ReactNode;
    dueDate?: Date;
    bgStyle?: React.CSSProperties;
}

// ════════════════════════════════════════════════════════════════════════════
// SELECT DROPDOWN - Clean Executive Style
// ════════════════════════════════════════════════════════════════════════════

const SelectDropdown: React.FC<{
    label: string;
    value: string;
    options: { id: string; label: string }[];
    onChange: (id: string) => void;
}> = ({ label, value, options, onChange }) => {
    const [open, setOpen] = React.useState(false);
    const selected = options.find(o => o.id === value);

    return (
        <div className="relative">
            <button
                onClick={() => setOpen(!open)}
                className="flex items-center gap-1.5 h-8 px-3 text-sm text-gray-500 hover:text-gray-800 hover:bg-black/[0.04] rounded-lg transition-colors duration-100"
            >
                <span className="text-gray-400 text-xs font-medium">{label}:</span>
                <span className="font-semibold text-gray-700">{selected?.label}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    <div className="absolute top-full left-0 mt-1.5 bg-white backdrop-blur-xl rounded-lg shadow-xl py-1 z-50 min-w-[140px]">
                        {options.map(opt => (
                            <button
                                key={opt.id}
                                onClick={() => { onChange(opt.id); setOpen(false); }}
                                className={`w-full px-3 py-1.5 text-left text-sm font-medium transition-colors ${opt.id === value
                                    ? 'text-teal-600 bg-teal-50'
                                    : 'text-gray-700 hover:bg-gray-50'
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

// ════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════════════════

const CATEGORY_OPTIONS = [
    { id: 'all', label: 'Visi' },
    { id: 'elektra', label: 'Elektra' },
    { id: 'vanduo', label: 'Vanduo' },
    { id: 'sildymas', label: 'Šildymas' },
    { id: 'dujos', label: 'Dujos' }
];

const SCOPE_OPTIONS = [
    { id: 'all', label: 'Visi' },
    { id: 'individual', label: 'Individualūs' },
    { id: 'communal', label: 'Bendri' }
];

// ════════════════════════════════════════════════════════════════════════════
// WORK SURFACE - Clean Executive Implementation
// Following Section 18.5: Minimalist Command Surface
// ════════════════════════════════════════════════════════════════════════════

export const RodmenysModule: React.FC<RodmenysModuleProps> = ({
    total, missingReadings, pendingApproval, pendingWithPhoto, ok,
    activeFilter, onFilterChange, searchQuery, onSearchChange,
    categoryFilter, onCategoryChange, scopeFilter, onScopeChange,
    missingCount, onEnterAll, children, footerLeft, footerRight, bgStyle,
}) => {
    // Note: Removed auto-select for missing filter - "Visi" is now default

    const tabs: { id: StatusFilter | null; label: string; count: number; dot?: string; badge?: string }[] = [
        { id: null, label: 'Visi', count: total },
        { id: 'missing', label: 'Trūksta', count: missingReadings, dot: missingReadings > 0 ? '#94A3B8' : undefined },
        { id: 'pending', label: 'Laukia', count: pendingApproval, dot: pendingApproval > 0 ? '#3B82F6' : undefined, badge: pendingWithPhoto > 0 ? '📷' : undefined },
        { id: 'ok', label: 'Patvirtinta', count: ok, dot: ok > 0 ? '#10B981' : undefined },
    ];

    return (
        <div
            className="flex-1 flex flex-col rounded-2xl shadow-lg overflow-hidden relative"
            style={bgStyle || {
                backgroundImage: 'url(/images/rodikliai_opt.webp)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
            }}
        >
            {/* White frosted overlay — ~30% for prominent background texture */}
            <div className="absolute inset-0 z-0" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.28) 50%, rgba(255,255,255,0.38) 100%)' }} />

            {/* ══════════════════════════════════════════════════════════════
               HEADER
               ══════════════════════════════════════════════════════════════ */}
            <div className="relative z-10 flex items-center justify-between px-5 py-4 bg-white/40 rounded-t-2xl">
                <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 bg-teal-500/10 border border-teal-500/15 rounded-xl flex items-center justify-center">
                        <Gauge className="w-5 h-5 text-teal-600" strokeWidth={2} />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-gray-900 tracking-tight">Rodmenys</h3>
                        {missingCount > 0 && (
                            <p className="text-xs text-gray-500 mt-0.5">
                                {missingCount} laukia įvesties
                            </p>
                        )}
                    </div>
                </div>

                {/* Missing count indicator */}
                {missingCount > 0 && (
                    <div className="flex items-center gap-2 h-9 px-4 text-sm font-medium text-amber-700 bg-amber-50 rounded-lg border border-amber-200">
                        <Pencil className="w-4 h-4" />
                        {missingCount} laukia įvesties
                    </div>
                )}
            </div>

            {/* ══════════════════════════════════════════════════════════════
               COMMAND BAR - Segment tabs + Filters + Search
               ══════════════════════════════════════════════════════════════ */}
            <div className="relative z-20 flex items-center gap-2 px-5 py-2.5 bg-white/30">

                {/* Segment Tabs */}
                <div className="flex items-center gap-0.5 bg-black/[0.04] rounded-lg p-0.5">
                    {tabs.map(({ id, label, count, dot, badge }) => {
                        const isActive = activeFilter === id;
                        const isClickable = count > 0 || id === null;

                        return (
                            <button
                                key={id ?? 'all'}
                                onClick={() => isClickable && onFilterChange(isActive && id !== null ? null : id)}
                                disabled={!isClickable}
                                className={`flex items-center gap-1.5 h-7 px-3 text-sm rounded-md transition-colors duration-100 ${!isClickable
                                    ? 'opacity-40 cursor-default text-gray-300'
                                    : isActive
                                        ? 'bg-white shadow-sm text-gray-900 font-semibold'
                                        : 'text-gray-500 hover:text-gray-700 font-medium'
                                    }`}
                            >
                                {dot && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dot }} />}
                                <span>{label}</span>
                                {badge && <span className="text-xs">{badge}</span>}
                                <span className={`text-xs tabular-nums ${isActive ? 'text-teal-600 font-bold' : 'text-gray-400'}`}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                <div className="flex-1" />

                {/* Filters */}
                <SelectDropdown
                    label="Tipas"
                    value={categoryFilter}
                    options={CATEGORY_OPTIONS}
                    onChange={(id) => onCategoryChange(id as MeterCategory)}
                />
                <SelectDropdown
                    label="Nuosavybė"
                    value={scopeFilter}
                    options={SCOPE_OPTIONS}
                    onChange={(id) => onScopeChange(id as MeterScope)}
                />

                {/* Search */}
                <div className="relative ml-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Ieškoti..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-44 h-8 pl-9 pr-3 text-sm bg-white/60 border border-gray-200 rounded-lg text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-colors duration-150"
                    />
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
               CONTENT AREA
               ══════════════════════════════════════════════════════════════ */}
            <div className="relative z-10 flex-1 overflow-auto bg-white/25">
                {children}
            </div>

            {/* ══════════════════════════════════════════════════════════════
               FOOTER
               ══════════════════════════════════════════════════════════════ */}
            <div className="relative z-10 flex items-center justify-between px-5 py-3 border-t border-gray-200/40 bg-white/40 rounded-b-2xl">
                <span className="text-sm font-medium text-gray-500">{footerLeft}</span>
                <span className="text-sm text-gray-400">{footerRight}</span>
            </div>
        </div>
    );
};

export const WorkSurface = RodmenysModule;
export default RodmenysModule;
