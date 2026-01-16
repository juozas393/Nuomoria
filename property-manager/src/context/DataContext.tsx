import React, { createContext, useContext, ReactNode, useCallback } from 'react';
import { useOptimizedQuery } from '../hooks/useOptimizedQuery';
import { propertyApi, addressApi, Property, Address } from '../lib/database';
import { useAuth } from './AuthContext';
import { CACHE_DURATION, ERROR_MESSAGES } from '../constants/app';
import { FRONTEND_MODE, getModeStatus } from '../config/frontendMode';

interface DataContextType {
  // Properties
  properties: Property[] | null;
  propertiesLoading: boolean;
  propertiesError: Error | null;
  refetchProperties: () => void;
  
  // Addresses
  addresses: Address[] | null;
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
  const [properties, setProperties] = React.useState<Property[]>([]);
  const [addresses, setAddresses] = React.useState<Address[]>([]);
  const [propertiesLoading, setPropertiesLoading] = React.useState(true);
  const [addressesLoading, setAddressesLoading] = React.useState(true);
  const [propertiesError, setPropertiesError] = React.useState<Error | null>(null);
  const [addressesError, setAddressesError] = React.useState<Error | null>(null);
  
  // Optimized cache with separate timestamps for different data types
  // Using useRef to avoid effect dependency issues
  const lastFetchTimeRef = React.useRef<{
    properties: number;
    addresses: number;
  }>({ properties: 0, addresses: 0 });

  // Load data on mount and when user changes
  React.useEffect(() => {
    const loadData = async () => {
      // ⚠️ FRONTEND MODE - Skip all API calls
      if (FRONTEND_MODE) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`${getModeStatus()}: Using mock data, no API calls`);
        }
        setPropertiesLoading(false);
        setAddressesLoading(false);
        setProperties([]);
        setAddresses([]);
        setPropertiesError(null);
        setAddressesError(null);
        return;
      }

      // Check cache validity - only for very recent fetches
      const now = Date.now();
      const lastFetch = Math.max(lastFetchTimeRef.current.properties, lastFetchTimeRef.current.addresses);
      if (now - lastFetch < CACHE_DURATION && lastFetch > 0) {
        setPropertiesLoading(false);
        setAddressesLoading(false);
        return;
      }

      try {
        // Load both properties and addresses in parallel for better performance
        setPropertiesLoading(true);
        setAddressesLoading(true);
        
        // TypeScript check: user must exist at this point
        if (!user?.id) {
          throw new Error('User not authenticated');
        }
        
        const [propertiesData, addressesData] = await Promise.all([
          propertyApi.getAllWithEnhancedMeters(user.id),
          addressApi.getAll(user.id)
        ]);

        setProperties(propertiesData || []);
        setAddresses(addressesData || []);
        setPropertiesError(null);
        setAddressesError(null);
        lastFetchTimeRef.current = { properties: now, addresses: now };
      } catch (error) {
        // Security: Don't expose sensitive error details
        const genericError = new Error(ERROR_MESSAGES.GENERIC);
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
    // ⚠️ FRONTEND MODE - Skip all database fetches
    if (FRONTEND_MODE) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`${getModeStatus()}: Skipping property refetch in frontend mode`);
      }
      return;
    }
    try {
      setPropertiesLoading(true);
      
      // TypeScript check: user must exist at this point
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      
      const data = await propertyApi.getAllWithEnhancedMeters(user.id);
      setProperties(data || []);
      setPropertiesError(null);
      // Update cache timestamp
      lastFetchTimeRef.current.properties = Date.now();
    } catch (error) {
      // Security: Don't expose sensitive error details
      const genericError = new Error(ERROR_MESSAGES.GENERIC);
      setPropertiesError(genericError);
    } finally {
      setPropertiesLoading(false);
    }
  }, [user]);

  const refetchAddresses = React.useCallback(async () => {
    // ⚠️ FRONTEND MODE - Skip all database fetches
    if (FRONTEND_MODE) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`${getModeStatus()}: Skipping address refetch in frontend mode`);
      }
      return;
    }
    try {
      setAddressesLoading(true);
      
      // TypeScript check: user must exist at this point
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      
      const data = await addressApi.getAll(user.id);
      setAddresses(data || []);
      setAddressesError(null);
      // Update cache timestamp
      lastFetchTimeRef.current.addresses = Date.now();
    } catch (error) {
      // Security: Don't expose sensitive error details
      const genericError = new Error(ERROR_MESSAGES.GENERIC);
      setAddressesError(genericError);
    } finally {
      setAddressesLoading(false);
    }
  }, [user]);

  // Memoized computed values to prevent unnecessary re-renders
  const tenantCount = React.useMemo(() => {
    if (!properties) return 0;
    return properties.filter(p => p.tenant_name && p.tenant_name !== 'Laisvas').length;
  }, [properties]);

  const propertyCount = React.useMemo(() => {
    return properties?.length || 0;
  }, [properties]);

  const addressCount = React.useMemo(() => {
    // Count addresses from addresses array, not properties
    if (!addresses || !Array.isArray(addresses)) return 0;
    return addresses.length;
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
