/**
 * Hooks barrel export
 * Central export point for all custom hooks
 * 
 * Note: Some hooks are not re-exported here to avoid naming conflicts.
 * Import them directly if needed (e.g., usePerformance, usePerformanceOptimized)
 */

// Feature flags & user roles (main exports)
export { 
  useFeatureFlags, 
  useABTest, 
  withFeatureFlag,
  type FeatureFlags 
} from './useFeatureFlags';

export { 
  useUserRole,
  type UserRole 
} from './useUserRole';

// Other commonly used hooks
export * from './useCache';
export * from './useOptimizedQuery';
export * from './useSupabaseAuth';
export * from './useLocalStorage';
export * from './useMeterFilters';
export * from './useBodyScrollLock';
export * from './useScrollAnimation';
export * from './useWebVitals';
export * from './useResizeObserver';

// Performance hooks - export selectively to avoid conflicts
// For usePerformance, usePerformanceMonitor, usePerformanceOptimized, useVirtualization:
// Import directly from specific files if needed

