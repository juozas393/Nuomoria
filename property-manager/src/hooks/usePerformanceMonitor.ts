import { useEffect, useRef } from 'react';

interface PerformanceMetrics {
  renderTime: number;
  memoryUsage?: number;
  componentName: string;
}

export function usePerformanceMonitor(componentName: string) {
  const renderStartTime = useRef<number>(0);
  const renderCount = useRef<number>(0);

  useEffect(() => {
    renderStartTime.current = performance.now();
    renderCount.current += 1;

    return () => {
      const renderTime = performance.now() - renderStartTime.current;
      
      // Log performance metrics in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`🚀 ${componentName} render #${renderCount.current}: ${renderTime.toFixed(2)}ms`);
        
        // Warn about slow renders
        if (renderTime > 16) { // 60fps threshold
          console.warn(`⚠️ Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`);
        }
      }

      // Track memory usage if available - only in development
      if (process.env.NODE_ENV === 'development' && 'memory' in performance) {
        const memory = (performance as any).memory;
        console.log(`📊 Memory usage: ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`);
      }
    };
  });

  return {
    renderCount: renderCount.current,
    startRender: () => { renderStartTime.current = performance.now(); },
    endRender: () => performance.now() - renderStartTime.current
  };
}

export default usePerformanceMonitor;

