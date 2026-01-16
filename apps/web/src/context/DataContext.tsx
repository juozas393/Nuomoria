import React, { createContext, useContext, ReactNode, useCallback } from 'react';
import { useOptimizedQuery } from '../hooks/useOptimizedQuery';
import { propertyApi, addressApi } from '../lib/database';
import { useAuth } from './AuthContext';

interface DataContextType {
  // Properties
  properties: any[] | null;
  propertiesLoading: boolean;
  propertiesError: Error | null;
  refetchProperties: () => void;
  
  // Addresses
  addresses: any[] | null;
  addressesLoading: boolean;
  addressesError: Error | null;
  refetchAddresses: () => void;
  
  // Computed data
  tenantCount: number;
  propertyCount: number;
  addressCount: number;
}

const DataContext = createContext<DataContextType | null>(null);

interface DataProviderProps {
  children: ReactNode;
}

/**
 * Optimized data provider with role-based access control
 * Following ultimate_performance_rules for minimal re-renders and efficient caching
 */
export function DataProvider({ children }: DataProviderProps): React.ReactElement {
  const { user } = useAuth();

  // Real API data with proper loading states and caching
  const [properties, setProperties] = React.useState<any[]>([]);
  const [addresses, setAddresses] = React.useState<any[]>([]);
  const [propertiesLoading, setPropertiesLoading] = React.useState(true);
  const [addressesLoading, setAddressesLoading] = React.useState(true);
  const [propertiesError, setPropertiesError] = React.useState<Error | null>(null);
  const [addressesError, setAddressesError] = React.useState<Error | null>(null);
  
  // Optimized cache with separate timestamps for different data types
  const [lastFetchTime, setLastFetchTime] = React.useState<{
    properties: number;
    addresses: number;
  }>({ properties: 0, addresses: 0 });
  const CACHE_DURATION = 30000; // 30 seconds cache for better performance

  // Load data on mount and when user changes
  React.useEffect(() => {
    const loadData = async () => {
      if (!user) {
        setPropertiesLoading(false);
        setAddressesLoading(false);
        return;
      }

      // Check cache validity - only for very recent fetches
      const now = Date.now();
      const lastFetch = Math.max(lastFetchTime.properties, lastFetchTime.addresses);
      if (now - lastFetch < CACHE_DURATION && lastFetch > 0) {
        setPropertiesLoading(false);
        setAddressesLoading(false);
        return;
      }

      try {
        // Load both properties and addresses in parallel for better performance
        setPropertiesLoading(true);
        setAddressesLoading(true);
        
        const [propertiesData, addressesData] = await Promise.all([
          propertyApi.getAllWithEnhancedMeters(user.id),
          addressApi.getAll(user.id)
        ]);

        setProperties(propertiesData || []);
        setAddresses(addressesData || []);
        setPropertiesError(null);
        setAddressesError(null);
        setLastFetchTime({ properties: now, addresses: now });
      } catch (error) {
        // Security: Don't expose sensitive error details
        const genericError = new Error('Klaida kraunant duomenis. Bandykite dar kartą.');
        setPropertiesError(genericError);
        setAddressesError(genericError);
        setProperties([]);
        setAddresses([]);
      } finally {
        setPropertiesLoading(false);
        setAddressesLoading(false);
      }
    };

    loadData();
  }, [user?.id]); // Only depend on user ID to prevent unnecessary re-renders

  const refetchProperties = React.useCallback(async () => {
    if (!user) return;
    try {
      setPropertiesLoading(true);
      const data = await propertyApi.getAllWithEnhancedMeters(user.id);
      setProperties(data || []);
      setPropertiesError(null);
    } catch (error) {
      // Security: Don't expose sensitive error details
      const genericError = new Error('Klaida kraunant duomenis. Bandykite dar kartą.');
      setPropertiesError(genericError);
    } finally {
      setPropertiesLoading(false);
    }
  }, [user]);

  const refetchAddresses = React.useCallback(async () => {
    if (!user) return;
    try {
      setAddressesLoading(true);
      const data = await addressApi.getAll(user.id);
      setAddresses(data || []);
      setAddressesError(null);
    } catch (error) {
      // Security: Don't expose sensitive error details
      const genericError = new Error('Klaida kraunant duomenis. Bandykite dar kartą.');
      setAddressesError(genericError);
    } finally {
      setAddressesLoading(false);
    }
  }, [user]);

  // Memoized computed values to prevent unnecessary re-renders
  const tenantCount = React.useMemo(() => {
    if (!properties) return 0;
    const count = properties.filter(p => p.tenant_name && p.tenant_name !== 'Laisvas').length;
    // console.log('🔍 tenantCount calculated:', count, 'from', properties.length, 'properties');
    return count;
  }, [properties]);

  const propertyCount = React.useMemo(() => {
    const count = properties?.length || 0;
    // console.log('🔍 propertyCount calculated:', count);
    return count;
  }, [properties]);

  const addressCount = React.useMemo(() => {
    // Count addresses from addresses array, not properties
    if (!addresses || !Array.isArray(addresses)) return 0;
    
    const count = addresses.length;
    // console.log('🔍 addressCount calculated from addresses:', count, 'addresses:', addresses);
    return count;
  }, [addresses]);

  // Memoized context value to prevent unnecessary re-renders
  const contextValue = React.useMemo((): DataContextType => ({
    // Properties
    properties,
    propertiesLoading,
    propertiesError,
    refetchProperties,
    
    // Addresses
    addresses,
    addressesLoading,
    addressesError,
    refetchAddresses,
    
    // Computed data
    tenantCount,
    propertyCount,
    addressCount
  }), [
    properties,
    propertiesLoading,
    propertiesError,
    refetchProperties,
    addresses,
    addressesLoading,
    addressesError,
    refetchAddresses,
    tenantCount,
    propertyCount,
    addressCount
  ]);

  return (
    <DataContext.Provider value={contextValue}>
      {children}
    </DataContext.Provider>
  );
}

export function useData(): DataContextType {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}

// Utility hooks for specific data needs
export function useProperties() {
  const { properties, propertiesLoading, propertiesError, refetchProperties } = useData();
  return { properties, loading: propertiesLoading, error: propertiesError, refetch: refetchProperties };
}

export function useAddresses() {
  const { addresses, addressesLoading, addressesError, refetchAddresses } = useData();
  return { addresses, loading: addressesLoading, error: addressesError, refetch: refetchAddresses };
}

export function useStats() {
  const { tenantCount, propertyCount, addressCount } = useData();
  return { tenantCount, propertyCount, addressCount };
}
