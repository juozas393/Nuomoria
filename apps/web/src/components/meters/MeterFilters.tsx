/**
 * ultimate_performance_rules:
 * - Diagnose root cause, not patch symptom
 * - Meet Core Web Vitals thresholds
 * - Optimize images: WebP/AVIF, srcset, lazy, dimension attrs
 * - Keep bundles small, defer noncritical JS
 * - Minimize DOM size, use virtualization
 * - Cache aggressively: HTTP/2, CDN, ServiceWorkers
 * - Real-time performance monitoring setup
 * - Balance performance vs maintainability decisions
 * - Always ask before ambiguous fixes
 * - Continuous image and perf auditing process
 */

import React, { useState, useCallback } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { MeterTypeSection, Unit, DistributionMethod } from '../../types/meters';

export interface MeterFiltersState {
  search: string;
  type: MeterTypeSection | 'all';
  unit: Unit | 'all';
  distributionMethod: DistributionMethod | 'all';
  isActive: boolean | 'all';
  showInactive: boolean;
}

interface MeterFiltersProps {
  filters: MeterFiltersState;
  onFiltersChange: (filters: MeterFiltersState) => void;
  compact?: boolean;
}

export const MeterFilters: React.FC<MeterFiltersProps> = React.memo(({
  filters,
  onFiltersChange,
  compact = false
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const updateFilter = useCallback(<K extends keyof MeterFiltersState>(
    key: K,
    value: MeterFiltersState[K]
  ) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  }, [filters, onFiltersChange]);

  const clearFilters = useCallback(() => {
    onFiltersChange({
      search: '',
      type: 'all',
      unit: 'all',
      distributionMethod: 'all',
      isActive: 'all',
      showInactive: false
    });
    setShowAdvanced(false);
  }, [onFiltersChange]);

  const hasActiveFilters = 
    filters.search ||
    filters.type !== 'all' ||
    filters.unit !== 'all' ||
    filters.distributionMethod !== 'all' ||
    filters.isActive !== 'all' ||
    filters.showInactive;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Ieškoti skaitliukų..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-transparent"
          />
        </div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`p-2 rounded-lg transition-colors ${
            showAdvanced || hasActiveFilters
              ? 'bg-[#2F8481] text-white'
              : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
          }`}
          title="Filtrai"
        >
          <Filter className="w-4 h-4" />
        </button>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
            title="Išvalyti filtrus"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and basic filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Ieškoti skaitliukų..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-transparent"
          />
        </div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
            showAdvanced || hasActiveFilters
              ? 'bg-[#2F8481] text-white'
              : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Filter className="w-4 h-4" />
          Filtrai
        </button>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 rounded-lg transition-colors flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Išvalyti
          </button>
        )}
      </div>

      {/* Advanced filters */}
      {showAdvanced && (
        <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
          {/* Type filters */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Tipas</h4>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => updateFilter('type', filters.type === 'water_cold' ? 'all' : 'water_cold')}
                className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                  filters.type === 'water_cold'
                    ? 'bg-[#2F8481] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Vanduo
              </button>
              <button
                onClick={() => updateFilter('type', filters.type === 'electricity' ? 'all' : 'electricity')}
                className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                  filters.type === 'electricity'
                    ? 'bg-[#2F8481] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Elektra
              </button>
              <button
                onClick={() => updateFilter('type', filters.type === 'heating' ? 'all' : 'heating')}
                className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                  filters.type === 'heating'
                    ? 'bg-[#2F8481] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Šildymas
              </button>
              <button
                onClick={() => updateFilter('type', filters.type === 'internet' ? 'all' : 'internet')}
                className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                  filters.type === 'internet'
                    ? 'bg-[#2F8481] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Internetas
              </button>
            </div>
          </div>

          {/* Unit filters */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Vienetas</h4>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => updateFilter('unit', filters.unit === 'm3' ? 'all' : 'm3')}
                className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                  filters.unit === 'm3'
                    ? 'bg-[#2F8481] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                m³
              </button>
              <button
                onClick={() => updateFilter('unit', filters.unit === 'kWh' ? 'all' : 'kWh')}
                className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                  filters.unit === 'kWh'
                    ? 'bg-[#2F8481] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                kWh
              </button>
              <button
                onClick={() => updateFilter('unit', filters.unit === 'GJ' ? 'all' : 'GJ')}
                className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                  filters.unit === 'GJ'
                    ? 'bg-[#2F8481] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                GJ
              </button>
              <button
                onClick={() => updateFilter('distributionMethod', filters.distributionMethod === 'fixed_split' ? 'all' : 'fixed_split')}
                className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                  filters.distributionMethod === 'fixed_split'
                    ? 'bg-[#2F8481] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Fiksuota
              </button>
            </div>
          </div>

          {/* Status filters */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Statusas</h4>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => updateFilter('isActive', filters.isActive === true ? 'all' : true)}
                className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                  filters.isActive === true
                    ? 'bg-[#2F8481] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Aktyvus
              </button>
              <button
                onClick={() => updateFilter('isActive', filters.isActive === false ? 'all' : false)}
                className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                  filters.isActive === false
                    ? 'bg-[#2F8481] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Neaktyvus
              </button>
            </div>
          </div>

          {/* Show inactive toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="showInactive"
              checked={filters.showInactive}
              onChange={(e) => updateFilter('showInactive', e.target.checked)}
              className="w-4 h-4 text-[#2F8481] border-gray-300 rounded focus:ring-[#2F8481]"
            />
            <label htmlFor="showInactive" className="text-sm text-gray-700">
              Rodyti neaktyvius skaitliukus
            </label>
          </div>
        </div>
      )}
    </div>
  );
});

MeterFilters.displayName = 'MeterFilters';
