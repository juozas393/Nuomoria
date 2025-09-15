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

import { useState, useMemo, useCallback } from 'react';
import { Meter } from '../types/meters';
import { MeterFiltersState } from '../components/meters/MeterFilters';

export const useMeterFilters = (meters: Meter[]) => {
  const [filters, setFilters] = useState<MeterFiltersState>({
    search: '',
    type: 'all',
    unit: 'all',
    distributionMethod: 'all',
    isActive: 'all',
    showInactive: false
  });

  const filteredMeters = useMemo(() => {
    return meters.filter(meter => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const meterName = meter.name || meter.title || '';
        const matchesName = meterName.toLowerCase().includes(searchLower);
        const matchesDescription = meter.description?.toLowerCase().includes(searchLower);
        if (!matchesName && !matchesDescription) return false;
      }

      // Type filter
      if (filters.type !== 'all' && meter.kind !== filters.type) {
        return false;
      }

      // Unit filter
      if (filters.unit !== 'all' && meter.unit !== filters.unit) {
        return false;
      }

      // Distribution method filter
      if (filters.distributionMethod !== 'all' && meter.distribution_method !== filters.distributionMethod) {
        return false;
      }

      // Active status filter
      const meterIsActive = meter.is_active !== undefined ? meter.is_active : meter.active;
      if (filters.isActive !== 'all' && meterIsActive !== filters.isActive) {
        return false;
      }

      // Show inactive filter
      if (!filters.showInactive && !meterIsActive) {
        return false;
      }

      return true;
    });
  }, [meters, filters]);

  const updateFilters = useCallback((newFilters: MeterFiltersState) => {
    setFilters(newFilters);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      search: '',
      type: 'all',
      unit: 'all',
      distributionMethod: 'all',
      isActive: 'all',
      showInactive: false
    });
  }, []);

  const hasActiveFilters = useMemo(() => {
    return (
      filters.search ||
      filters.type !== 'all' ||
      filters.unit !== 'all' ||
      filters.distributionMethod !== 'all' ||
      filters.isActive !== 'all' ||
      filters.showInactive
    );
  }, [filters]);

  const meterCounts = useMemo(() => {
    const total = meters.length;
    const active = meters.filter(m => (m.is_active !== undefined ? m.is_active : m.active)).length;
    const inactive = total - active;
    const individual = meters.filter(m => m.mode === 'individual').length;
    const communal = meters.filter(m => m.mode === 'communal').length;
    const filtered = filteredMeters.length;

    return {
      total,
      active,
      inactive,
      individual,
      communal,
      filtered
    };
  }, [meters, filteredMeters]);

  return {
    filters,
    filteredMeters,
    updateFilters,
    clearFilters,
    hasActiveFilters,
    meterCounts
  };
};
