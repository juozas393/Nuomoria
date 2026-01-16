import { useState, useEffect, useCallback, useMemo, useRef, useDeferredValue } from 'react';

// ====== DEVICE DETECTION ======

export function useDeviceCapabilities() {
  return useMemo(() => {
    const cores = (navigator as any).hardwareConcurrency || 4;
    const memory = (navigator as any).deviceMemory || 4;
    const connection = (navigator as any).connection;
    
    const isLowEnd = cores <= 4 || memory <= 4;
    const isSlowConnection = connection?.effectiveType === '2g' || connection?.effectiveType === 'slow-2g';
    
    return {
      isLowEnd,
      isSlowConnection,
      cores,
      memory,
      shouldReduceAnimations: isLowEnd || isSlowConnection,
      shouldVirtualize: true, // Always virtualize for performance
    };
  }, []);
}

// ====== INTERSECTION OBSERVER FOR PERFORMANCE ======

export function useIntersectionObserver<T extends HTMLElement>(
  options: IntersectionObserverInit = {},
  classOnVisible = 'will-change-transform'
) {
  const ref = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting;
        setIsVisible(visible);
        
        if (visible) {
          element.classList.add(classOnVisible);
        } else {
          element.classList.remove(classOnVisible);
        }
      },
      { rootMargin: '50px', ...options }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [classOnVisible]);

  return { ref, isVisible };
}

// ====== OPTIMIZED SCROLL HANDLER ======

export function useOptimizedScroll(
  callback: (scrollY: number) => void,
  element?: HTMLElement | Window
) {
  const ticking = useRef(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const target = element ?? window;
    
    const handleScroll = () => {
      if (ticking.current) return;
      
      ticking.current = true;
      requestAnimationFrame(() => {
        const scrollY = (target as Window).scrollY ?? (target as HTMLElement).scrollTop ?? 0;
        
        // Only call callback if scroll position actually changed
        if (Math.abs(scrollY - lastScrollY.current) > 1) {
          callback(scrollY);
          lastScrollY.current = scrollY;
        }
        
        ticking.current = false;
      });
    };

    target.addEventListener('scroll', handleScroll, { passive: true });
    return () => target.removeEventListener('scroll', handleScroll as any);
  }, [callback, element]);
}

// ====== DEBOUNCED SEARCH WITH DEFERRED VALUE ======

export function useOptimizedSearch<T>(
  items: T[],
  searchFn: (item: T, query: string) => boolean,
  debounceMs = 300
) {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  
  const filteredItems = useMemo(() => {
    if (!deferredQuery.trim()) return items;
    return items.filter(item => searchFn(item, deferredQuery));
  }, [items, deferredQuery, searchFn]);

  return {
    query,
    setQuery,
    filteredItems,
    isSearching: query !== deferredQuery,
  };
}

// ====== OPTIMIZED DATA FETCHING ======

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class PerformanceCache {
  private cache = new Map<string, CacheEntry<any>>();
  
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }
  
  set<T>(key: string, data: T, ttl = 5 * 60 * 1000) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }
  
  clear() {
    this.cache.clear();
  }
  
  size() {
    return this.cache.size;
  }
}

const globalCache = new PerformanceCache();

export function useOptimizedData<T>(
  fetcher: () => Promise<T>,
  cacheKey: string,
  options: {
    ttl?: number;
    enabled?: boolean;
    refetchOnWindowFocus?: boolean;
  } = {}
) {
  const { ttl = 5 * 60 * 1000, enabled = true, refetchOnWindowFocus = false } = options;
  
  const [data, setData] = useState<T | null>(() => globalCache.get(cacheKey));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const fetcherRef = useRef(fetcher);
  
  fetcherRef.current = fetcher;

  const fetchData = useCallback(async (force = false) => {
    if (!enabled) return;

    // Check cache first
    if (!force) {
      const cached = globalCache.get<T>(cacheKey);
      if (cached) {
        setData(cached);
        return cached;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetcherRef.current();
      globalCache.set(cacheKey, result, ttl);
      setData(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [cacheKey, ttl, enabled]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refetch on window focus
  useEffect(() => {
    if (!refetchOnWindowFocus) return;

    const handleFocus = () => fetchData();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchData, refetchOnWindowFocus]);

  const refetch = useCallback(() => fetchData(true), [fetchData]);

  return {
    data,
    loading,
    error,
    refetch,
    clearCache: () => globalCache.clear(),
  };
}

// ====== VIRTUALIZATION HELPERS ======

export function useVirtualizedList<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan = 5
) {
  const [scrollTop, setScrollTop] = useState(0);
  
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );
    
    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);
  
  const virtualItems = useMemo(() => {
    const { startIndex, endIndex } = visibleRange;
    return Array.from({ length: endIndex - startIndex + 1 }, (_, index) => {
      const actualIndex = startIndex + index;
      return {
        index: actualIndex,
        item: items[actualIndex],
        top: actualIndex * itemHeight,
        height: itemHeight,
      };
    });
  }, [visibleRange, items, itemHeight]);
  
  const handleScroll = useCallback((event: React.UIEvent<HTMLElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);
  
  return {
    virtualItems,
    totalHeight: items.length * itemHeight,
    handleScroll,
    visibleRange,
  };
}

// ====== PERFORMANCE MONITORING ======

export function usePerformanceMonitor() {
  const [metrics, setMetrics] = useState({
    renderCount: 0,
    lastRenderTime: 0,
    averageRenderTime: 0,
  });
  
  useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      setMetrics(prev => ({
        renderCount: prev.renderCount + 1,
        lastRenderTime: renderTime,
        averageRenderTime: (prev.averageRenderTime * prev.renderCount + renderTime) / (prev.renderCount + 1),
      }));
    };
  });
  
  return metrics;
}

// ====== MEMORY CLEANUP ======

export function useMemoryCleanup() {
  useEffect(() => {
    const cleanup = () => {
      // Clear caches periodically
      if (globalCache.size() > 100) {
        globalCache.clear();
      }
      
      // Force garbage collection if available
      if ('gc' in window) {
        (window as any).gc();
      }
    };
    
    const interval = setInterval(cleanup, 5 * 60 * 1000); // Every 5 minutes
    return () => clearInterval(interval);
  }, []);
}