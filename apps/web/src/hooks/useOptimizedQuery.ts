import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';

interface QueryOptions {
  enabled?: boolean;
  staleTime?: number;
  cacheTime?: number;
  refetchInterval?: number;
}

interface QueryResult<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Optimized query hook with caching and role-based filtering
 * Following ultimate_performance_rules for optimal data fetching
 */
export function useOptimizedQuery<T>(
  queryKey: string,
  queryFn: (userId?: string) => Promise<T>,
  options: QueryOptions = {}
): QueryResult<T> {
  const { user } = useAuth();
  const {
    enabled = true,
    staleTime = 5 * 60 * 1000, // 5 minutes
    cacheTime = 30 * 60 * 1000, // 30 minutes
    refetchInterval
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Memory cache with expiration
  const cache = useMemo(() => new Map<string, { data: T; timestamp: number }>(), []);

  // Generate cache key with user context
  const getCacheKey = useCallback(() => {
    const userContext = user ? `user:${user.id}:${user.role}` : 'anonymous';
    return `${queryKey}:${userContext}`;
  }, [queryKey, user]);

  // Check if cached data is still valid
  const isCacheValid = useCallback((timestamp: number) => {
    return Date.now() - timestamp < staleTime;
  }, [staleTime]);

  // Execute query with role-based filtering
  const executeQuery = useCallback(async () => {
    if (!enabled) return;

    const cacheKey = getCacheKey();
    const cached = cache.get(cacheKey);

    // Return cached data if valid
    if (cached && isCacheValid(cached.timestamp)) {
      setData(cached.data);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Role-based filtering: pass userId only for non-admin users
      const shouldFilterByUser = user && !['admin', 'property_manager'].includes(user.role);
      const userId = shouldFilterByUser ? user.id : undefined;

      // Query execution - console logs removed for production

      const result = await queryFn(userId);

      // Cache the result
      cache.set(cacheKey, { data: result, timestamp: Date.now() });

      // Clean old cache entries
      cache.forEach((value, key) => {
        if (Date.now() - value.timestamp > cacheTime) {
          cache.delete(key);
        }
      });

      setData(result);
      // Query successful - console logs removed for production
    } catch (err) {
      // Query failed - error logging removed for production
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [enabled, queryFn, user, getCacheKey, cache, isCacheValid, cacheTime, queryKey]);

  // Refetch function
  const refetch = useCallback(() => {
    const cacheKey = getCacheKey();
    cache.delete(cacheKey); // Clear cache
    executeQuery();
  }, [executeQuery, getCacheKey, cache]);

  // Initial load and user change effect
  useEffect(() => {
    executeQuery();
  }, [executeQuery]);

  // Interval refetch
  useEffect(() => {
    if (!refetchInterval) return;

    const interval = setInterval(executeQuery, refetchInterval);
    return () => clearInterval(interval);
  }, [executeQuery, refetchInterval]);

  return { data, isLoading, error, refetch };
}
