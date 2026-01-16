import React from 'react';

export type FilterType = 'all' | 'needs_photo' | 'needs_reading' | 'overdue' | 'individual' | 'communal';

interface FilterChipsProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  stats: {
    all: number;
    needsPhoto: number;
    needsReading: number;
    overdue: number;
    individual: number;
    communal: number;
  };
}

const filterConfig = [
  { key: 'all' as const, label: 'Visi', color: 'bg-neutral-100 text-neutral-700' },
  { key: 'needs_photo' as const, label: 'Reikia foto', color: 'bg-amber-50 text-amber-700' },
  { key: 'needs_reading' as const, label: 'Reikia rodmens', color: 'bg-blue-50 text-blue-700' },
  { key: 'overdue' as const, label: 'Vėluoja', color: 'bg-red-50 text-red-600' },
  { key: 'individual' as const, label: 'Individualūs', color: 'bg-neutral-100 text-neutral-700' },
  { key: 'communal' as const, label: 'Bendri', color: 'bg-neutral-100 text-neutral-700' },
];

export const FilterChips: React.FC<FilterChipsProps> = React.memo(({
  activeFilter,
  onFilterChange,
  stats
}) => {
  const getCount = (filter: FilterType) => {
    switch (filter) {
      case 'all': return stats.all;
      case 'needs_photo': return stats.needsPhoto;
      case 'needs_reading': return stats.needsReading;
      case 'overdue': return stats.overdue;
      case 'individual': return stats.individual;
      case 'communal': return stats.communal;
      default: return 0;
    }
  };

  return (
    <div className="flex items-center gap-2 p-3 bg-neutral-50 border-b border-neutral-200">
      {filterConfig.map(({ key, label, color }) => {
        const count = getCount(key);
        const isActive = activeFilter === key;

        return (
          <button
            key={key}
            onClick={() => onFilterChange(key)}
            className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border text-[12px] font-medium transition-colors ${
              isActive
                ? 'bg-[#2F8481] text-white border-[#2F8481]'
                : `${color} border-neutral-200 hover:bg-neutral-200`
            }`}
          >
            <span>{label}</span>
            <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
              isActive ? 'bg-white/20' : 'bg-neutral-200'
            }`}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
});

FilterChips.displayName = 'FilterChips';
