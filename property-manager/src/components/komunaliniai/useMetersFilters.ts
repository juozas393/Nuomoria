import { useState, useMemo, useCallback } from 'react';
import { Meter } from './TenantMetersModal';
import { FilterType } from './FilterChips';

export const useMetersFilters = (meters: Meter[]) => {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const filteredAndSortedMeters = useMemo(() => {
    let filtered = meters;

    // Filtering
    switch (activeFilter) {
      case 'needs_photo':
        filtered = meters.filter(m => m.needsPhoto);
        break;
      case 'needs_reading':
        filtered = meters.filter(m => m.needsReading);
        break;
      case 'overdue':
        filtered = meters.filter(m => m.status === 'overdue');
        break;
      case 'individual':
        filtered = meters.filter(m => m.mode === 'Individualūs');
        break;
      case 'communal':
        filtered = meters.filter(m => m.mode === 'Bendri');
        break;
      default:
        filtered = meters;
    }

    // Sorting: needs action -> overdue -> ok -> alphabetical
    return filtered.sort((a, b) => {
      const aNeedsAction = a.needsPhoto || a.needsReading;
      const bNeedsAction = b.needsPhoto || b.needsReading;
      
      if (aNeedsAction && !bNeedsAction) return -1;
      if (!aNeedsAction && bNeedsAction) return 1;
      
      if (a.status === 'overdue' && b.status !== 'overdue') return -1;
      if (a.status !== 'overdue' && b.status === 'overdue') return 1;
      
      return a.name.localeCompare(b.name);
    });
  }, [meters, activeFilter]);

  const stats = useMemo(() => {
    const needsPhoto = meters.filter(m => m.needsPhoto).length;
    const needsReading = meters.filter(m => m.needsReading).length;
    const overdue = meters.filter(m => m.status === 'overdue').length;
    const individual = meters.filter(m => m.mode === 'Individualūs').length;
    const communal = meters.filter(m => m.mode === 'Bendri').length;

    return {
      all: meters.length,
      needsPhoto,
      needsReading,
      overdue,
      individual,
      communal
    };
  }, [meters]);

  const handleFilterChange = useCallback((filter: FilterType) => {
    setActiveFilter(filter);
  }, []);

  return {
    activeFilter,
    filteredAndSortedMeters,
    stats,
    handleFilterChange
  };
};
