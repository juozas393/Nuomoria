import { useCallback, useRef } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export function useCache<T>(defaultTTL: number = 30000) {
  const cache = useRef<Map<string, CacheEntry<T>>>(new Map());

  const get = useCallback((key: string): T | null => {
    const entry = cache.current.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      cache.current.delete(key);
      return null;
    }

    return entry.data;
  }, []);

  const set = useCallback((key: string, data: T, ttl?: number): void => {
    cache.current.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || defaultTTL
    });
  }, [defaultTTL]);

  const clear = useCallback((key?: string): void => {
    if (key) {
      cache.current.delete(key);
    } else {
      cache.current.clear();
    }
  }, []);

  const has = useCallback((key: string): boolean => {
    const entry = cache.current.get(key);
    if (!entry) return false;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      cache.current.delete(key);
      return false;
    }

    return true;
  }, []);

  return { get, set, clear, has };
}

export default useCache;


































