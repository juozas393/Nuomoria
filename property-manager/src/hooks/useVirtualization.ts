import { useState, useEffect, useRef, useCallback } from 'react';

// Debounce hook for search and other input
export function useDebounce<T>(value: T, delay: number): T {
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
}

// Virtualization hook for large lists
interface UseVirtualizationOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

interface VirtualizationResult {
  virtualItems: Array<{
    index: number;
    start: number;
    end: number;
    size: number;
  }>;
  totalSize: number;
  startIndex: number;
  endIndex: number;
}

export function useVirtualization(
  itemCount: number,
  options: UseVirtualizationOptions
): VirtualizationResult {
  const { itemHeight, containerHeight, overscan = 5 } = options;
  const [scrollTop, setScrollTop] = useState(0);

  const totalSize = itemCount * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    itemCount - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const virtualItems = Array.from({ length: endIndex - startIndex + 1 }, (_, index) => {
    const actualIndex = startIndex + index;
    return {
      index: actualIndex,
      start: actualIndex * itemHeight,
      end: (actualIndex + 1) * itemHeight,
      size: itemHeight,
    };
  });

  const handleScroll = useCallback((event: React.UIEvent<HTMLElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  return {
    virtualItems,
    totalSize,
    startIndex,
    endIndex,
  };
}

// Intersection observer hook for lazy loading
export function useIntersectionObserver(
  options: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);
  const elementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
      if (entry.isIntersecting && !hasIntersected) {
        setHasIntersected(true);
      }
    }, options);

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [options, hasIntersected]);

  return { elementRef, isIntersecting, hasIntersected };
}
