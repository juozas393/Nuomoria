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
import { Plus, Grid, List, BarChart3, AlertCircle } from 'lucide-react';
import { Meter } from '../../types/meters';
import { MeterCard } from './MeterCard';
import { MeterFilters } from './MeterFilters';
import { UniversalAddMeterModal } from './UniversalAddMeterModal';
import { useMeterFilters } from '../../hooks/useMeterFilters';

interface UniversalMetersListProps {
  meters: Meter[];
  onAddMeters?: (meters: any[]) => void;
  onEditMeter?: (meter: Meter) => void;
  onDeleteMeter?: (meterId: string) => void;
  onToggleActive?: (meterId: string, isActive: boolean) => void;
  title?: string;
  showAddButton?: boolean;
  showFilters?: boolean;
  showStats?: boolean;
  viewMode?: 'grid' | 'list';
  compact?: boolean;
}

export const UniversalMetersList: React.FC<UniversalMetersListProps> = React.memo(({
  meters,
  onAddMeters,
  onEditMeter,
  onDeleteMeter,
  onToggleActive,
          title = "Skaitliukai",
  showAddButton = true,
  showFilters = true,
  showStats = true,
  viewMode: initialViewMode = 'grid',
  compact = false
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(initialViewMode);
  const [showAddModal, setShowAddModal] = useState(false);
  
  const {
    filters,
    filteredMeters,
    updateFilters,
    clearFilters,
    hasActiveFilters,
    meterCounts
  } = useMeterFilters(meters);

  const handleAddMeters = useCallback((metersData: any[]) => {
    if (onAddMeters) {
      onAddMeters(metersData);
    }
    setShowAddModal(false);
  }, [onAddMeters]);

  const StatCard: React.FC<{ label: string; value: number; color?: string }> = ({ label, value, color = "gray" }) => (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{label}</p>
          <p className={`text-2xl font-semibold text-${color}-600`}>{value}</p>
        </div>
        <BarChart3 className={`w-8 h-8 text-${color}-400`} />
      </div>
    </div>
  );

  if (compact) {
    return (
      <div className="space-y-4">
        {showFilters && (
          <MeterFilters
            filters={filters}
            onFiltersChange={updateFilters}
            compact={true}
          />
        )}
        
        <div className="space-y-3">
          {filteredMeters.map(meter => (
            <MeterCard
              key={meter.id}
              meter={meter}
              onEdit={onEditMeter}
              onDelete={onDeleteMeter}
              onToggleActive={onToggleActive}
              compact={true}
            />
          ))}
        </div>

        {filteredMeters.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Nerasta skaitliukų pagal pasirinktus filtrus</p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-2 text-[#2F8481] hover:underline"
              >
                Išvalyti filtrus
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center border border-gray-300 rounded-lg">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-[#2F8481] text-white' : 'text-gray-600 hover:bg-gray-50'}`}
              title="Tinklelio vaizdas"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-[#2F8481] text-white' : 'text-gray-600 hover:bg-gray-50'}`}
              title="Sąrašo vaizdas"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Add Button */}
          {showAddButton && onAddMeters && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-[#2F8481] text-white rounded-lg hover:bg-[#297a77] transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Pridėti skaitiklį
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      {showStats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard label="Iš viso" value={meterCounts.total} color="blue" />
          <StatCard label="Aktyvūs" value={meterCounts.active} color="green" />
          <StatCard label="Neaktyvūs" value={meterCounts.inactive} color="red" />
          <StatCard label="Individualūs" value={meterCounts.individual} color="purple" />
          <StatCard label="Bendri" value={meterCounts.communal} color="orange" />
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <MeterFilters
            filters={filters}
            onFiltersChange={updateFilters}
            compact={false}
          />
        </div>
      )}

      {/* Results Info */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Rodoma: <span className="font-medium">{filteredMeters.length}</span> iš <span className="font-medium">{meters.length}</span> skaitliukų
        </p>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-[#2F8481] hover:underline"
          >
            Išvalyti visus filtrus
          </button>
        )}
      </div>

      {/* Meters List */}
      <div className={
        viewMode === 'grid' 
          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          : "space-y-4"
      }>
        {filteredMeters.map(meter => (
          <MeterCard
            key={meter.id}
            meter={meter}
            onEdit={onEditMeter}
            onDelete={onDeleteMeter}
            onToggleActive={onToggleActive}
            compact={viewMode === 'list'}
          />
        ))}
      </div>

      {/* Empty State */}
      {filteredMeters.length === 0 && (
        <div className="text-center py-12">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nerasta skaitliukų</h3>
          <p className="text-gray-600 mb-6">
            {hasActiveFilters 
              ? "Nerasta skaitliukų pagal pasirinktus filtrus. Pakeiskite filtrus arba pridėkite naują skaitliuką."
              : "Dar neturite pridėję jokių skaitliukų. Pradėkite pridėdami pirmą skaitliuką."
            }
          </p>
          <div className="flex items-center justify-center gap-4">
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Išvalyti filtrus
              </button>
            )}
            {showAddButton && onAddMeters && (
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-[#2F8481] text-white rounded-lg hover:bg-[#297a77] transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Pridėti skaitiklį
              </button>
            )}
          </div>
        </div>
      )}

      {/* Add Meter Modal */}
      {showAddModal && onAddMeters && (
        <UniversalAddMeterModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onAddMeters={handleAddMeters}
          existingMeterNames={meters.map(m => m.name || m.title || '').filter(Boolean)}
          title="Pridėti naują skaitiklį"
          allowMultiple={true}
        />
      )}
    </div>
  );
});

UniversalMetersList.displayName = 'UniversalMetersList';
