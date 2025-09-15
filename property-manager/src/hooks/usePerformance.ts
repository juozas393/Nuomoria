import { useState, useEffect, useCallback, useRef } from 'react';

// Throttle function for performance
function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): T {
  let inThrottle: boolean;
  return ((...args: any[]) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  }) as T;
}

// Debounce function for performance
function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): T {
  let timeoutId: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  }) as T;
}

interface PerformanceMonitorOptions {
  trackRenderTime?: boolean;
  trackLoadTime?: boolean;
  maxRenderTime?: number;
  throttleScroll?: boolean;
  throttleResize?: boolean;
}

export const usePerformanceMonitor = (
  componentName: string,
  options: PerformanceMonitorOptions = {}
) => {
  const [renderCount, setRenderCount] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [renderTime, setRenderTime] = useState(0);
  const [loadTime, setLoadTime] = useState(0);
  const startTime = useRef<number>(Date.now());
  const renderStartTime = useRef<number>(0);

  // Throttled scroll handler
  const handleScroll = useCallback(
    throttle(() => {
      // Handle scroll events efficiently
      if (options.throttleScroll) {
        // Only track scroll performance if needed
        console.log('Scroll event throttled');
      }
    }, 16), // ~60fps
    [options.throttleScroll]
  );

  // Throttled resize handler
  const handleResize = useCallback(
    throttle(() => {
      // Handle resize events efficiently
      if (options.throttleResize) {
        console.log('Resize event throttled');
      }
    }, 100), // 10fps for resize
    [options.throttleResize]
  );

  useEffect(() => {
    // Track render time
    if (options.trackRenderTime) {
      renderStartTime.current = performance.now();
    }

    setRenderCount(prev => prev + 1);

    // Track load time
    if (!isLoaded) {
      const loadTime = Date.now() - startTime.current;
      setLoadTime(loadTime);
      setIsLoaded(true);
    }

    // Track render time
    if (options.trackRenderTime) {
      const endTime = performance.now();
      const renderTime = endTime - renderStartTime.current;
      setRenderTime(renderTime);

      // Warn if render time is too high
      if (options.maxRenderTime && renderTime > options.maxRenderTime) {
        console.warn(
          `${componentName} render time: ${renderTime.toFixed(2)}ms (exceeds ${options.maxRenderTime}ms)`
        );
      }
    }
  }, [componentName, isLoaded, options.trackRenderTime, options.maxRenderTime]);

  // Add event listeners for throttled events
  useEffect(() => {
    if (options.throttleScroll) {
      window.addEventListener('scroll', handleScroll, { passive: true });
    }
    if (options.throttleResize) {
      window.addEventListener('resize', handleResize, { passive: true });
    }

    return () => {
      if (options.throttleScroll) {
        window.removeEventListener('scroll', handleScroll);
      }
      if (options.throttleResize) {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, [handleScroll, handleResize, options.throttleScroll, options.throttleResize]);

  return {
    renderCount,
    isLoaded,
    renderTime,
    loadTime,
    performance: {
      renderTime,
      loadTime,
      renderCount
    }
  };
};

// Debounce hook
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Loading state hook
export const useLoadingState = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState<string>('');

  const startLoading = useCallback((text: string = 'Kraunama...') => {
    setIsLoading(true);
    setLoadingText(text);
  }, []);

  const stopLoading = useCallback(() => {
    setIsLoading(false);
    setLoadingText('');
  }, []);

  return { isLoading, loadingText, startLoading, stopLoading };
};

// Optimized fetch hook
export const useOptimizedFetch = <T>(
  url: string,
  options: RequestInit = {}
) => {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(url, {
        ...options,
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [url, options]);

  useEffect(() => {
    fetchData();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
};

// Virtual scroll hook for large lists
export const useVirtualScroll = <T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan: number = 5
) => {
  const [scrollTop, setScrollTop] = useState(0);
  
  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.floor((scrollTop + containerHeight) / itemHeight) + overscan
  );
  
  const visibleItems = items.slice(startIndex, endIndex + 1);
  const offsetY = startIndex * itemHeight;
  
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);
  
  return {
    visibleItems,
    offsetY,
    totalHeight,
    handleScroll,
    scrollTop
  };
};

// Memoization hook for expensive calculations
export const useMemoizedValue = <T>(
  factory: () => T,
  dependencies: any[]
): T => {
  const [value, setValue] = useState<T>(factory);
  
  useEffect(() => {
    const newValue = factory();
    setValue(newValue);
  }, dependencies);
  
  return value;
};

// Performance optimization hook
export const usePerformanceOptimization = () => {
  const [renderCounts, setRenderCounts] = useState<Record<string, number>>({});
  
  const trackRender = useCallback((componentName: string) => {
    setRenderCounts(prev => ({
      ...prev,
      [componentName]: (prev[componentName] || 0) + 1
    }));
  }, []);
  
  const getRenderStats = useCallback(() => {
    const total = Object.values(renderCounts).reduce((sum, count) => sum + count, 0);
    const average = total / Object.keys(renderCounts).length || 0;
    
    return {
      total,
      average,
      byComponent: renderCounts,
      highRenderComponents: Object.entries(renderCounts)
        .filter(([_, count]) => count > 10)
        .sort(([_, a], [__, b]) => b - a)
    };
  }, [renderCounts]);
  
  return { trackRender, getRenderStats };
}; 