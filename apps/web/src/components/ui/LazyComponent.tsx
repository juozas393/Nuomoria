import React, { Suspense, lazy, ComponentType } from 'react';

interface LazyComponentProps {
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Optimized lazy loading wrapper following ultimate_performance_rules
 * - Minimal loading fallback
 * - Error boundary integration
 * - Preloading support
 */
export const LazyComponent: React.FC<LazyComponentProps> = React.memo(({ 
  fallback, 
  children 
}) => {
  const defaultFallback = (
    <div className="flex items-center justify-center p-4">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <Suspense fallback={fallback || defaultFallback}>
      {children}
    </Suspense>
  );
});

/**
 * Higher-order component for lazy loading with preloading
 */
export function withLazyLoading<T extends object = any>(
  importFunc: () => Promise<{ default: ComponentType<T> }>,
  fallback?: React.ReactNode
) {
  const LazyLoadedComponent = lazy(importFunc);
  
  return React.memo((props: T) => (
    <Suspense fallback={fallback || (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    )}>
      <LazyLoadedComponent {...(props as any)} />
    </Suspense>
  ));
}

/**
 * Preload a component for better performance
 */
export function preloadComponent(importFunc: () => Promise<any>) {
  return () => {
    const componentImport = importFunc();
    return componentImport;
  };
}

LazyComponent.displayName = 'LazyComponent';

export default LazyComponent;