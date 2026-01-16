import React, { createContext, useContext, useSyncExternalStore, useCallback, useMemo } from 'react';

// ====== GENERIC SLICE STORE ======

type Listener = () => void;

export function createSliceStore<T>(initialState: T) {
  let state = initialState;
  const listeners = new Set<Listener>();

  const store = {
    get: () => state,
    
    set: (updater: Partial<T> | ((prev: T) => T)) => {
      const newState = typeof updater === 'function' 
        ? updater(state) 
        : { ...state, ...updater };
      
      if (newState !== state) {
        state = newState;
        listeners.forEach(listener => listener());
      }
    },
    
    subscribe: (listener: Listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    
    reset: () => {
      state = initialState;
      listeners.forEach(listener => listener());
    },
  };

  return store;
}

// ====== SLICE CONTEXT CREATOR ======

export function createSliceContext<T>(initialState: T, storeName?: string) {
  const store = createSliceStore(initialState);
  const Context = createContext(store);

  // Provider component
  const Provider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <Context.Provider value={store}>
      {children}
    </Context.Provider>
  );

  // Selector hook - only re-renders when selected data changes
  const useSelector = <S,>(selector: (state: T) => S): S => {
    const store = useContext(Context);
    
    // Memoize the selector to prevent infinite loops
    const memoizedSelector = useMemo(() => selector, []);
    
    return useSyncExternalStore(
      store.subscribe,
      () => memoizedSelector(store.get()),
      () => memoizedSelector(store.get()) // Server-side rendering fallback
    );
  };

  // Setter hook
  const useSetState = () => {
    const store = useContext(Context);
    return store.set;
  };

  // Complete store access (use sparingly)
  const useStore = () => useContext(Context);

  // Debug hook (development only)
  const useDebug = () => {
    const state = useSelector(s => s);
    const setState = useSetState();
    const store = useContext(Context);
    
    return {
      state,
      setState,
      storeName: storeName || 'Anonymous Store',
      reset: () => store.reset(),
    };
  };

  return {
    Provider,
    useSelector,
    useSetState,
    useStore,
    useDebug,
    store, // Direct access for testing
  };
}

// ====== APPLICATION SLICES ======

// User slice pašalintas - naudojame AuthContext

// Properties slice
interface PropertiesState {
  properties: any[];
  selectedProperty: any | null;
  loading: boolean;
  filters: {
    search: string;
    status: string;
    type: string;
  };
  error: string | null;
}

const initialPropertiesState: PropertiesState = {
  properties: [],
  selectedProperty: null,
  loading: false,
  filters: {
    search: '',
    status: 'all',
    type: 'all',
  },
  error: null,
};

export const PropertiesSlice = createSliceContext(initialPropertiesState, 'PropertiesSlice');

// Tenants slice
interface TenantsState {
  tenants: any[];
  selectedTenant: any | null;
  loading: boolean;
  filters: {
    search: string;
    status: string;
    property: string;
  };
  error: string | null;
}

const initialTenantsState: TenantsState = {
  tenants: [],
  selectedTenant: null,
  loading: false,
  filters: {
    search: '',
    status: 'all',
    property: 'all',
  },
  error: null,
};

export const TenantsSlice = createSliceContext(initialTenantsState, 'TenantsSlice');

// Meters slice
interface MetersState {
  meters: any[];
  meterConfigs: any[];
  readings: any[];
  loading: boolean;
  error: string | null;
}

const initialMetersState: MetersState = {
  meters: [],
  meterConfigs: [],
  readings: [],
  loading: false,
  error: null,
};

export const MetersSlice = createSliceContext(initialMetersState, 'MetersSlice');

// UI slice
interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark' | 'auto';
  performanceMode: 'auto' | 'high' | 'low';
  notifications: Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    timestamp: number;
  }>;
  modals: {
    [key: string]: boolean;
  };
}

const initialUIState: UIState = {
  sidebarOpen: false,
  theme: 'auto',
  performanceMode: 'auto',
  notifications: [],
  modals: {},
};

export const UISlice = createSliceContext(initialUIState, 'UISlice');

// ====== PERFORMANCE OPTIMIZED HOOKS ======

// Memoized selectors for common use cases
// useUserInfo pašalintas - naudojame AuthContext

// useUserLoading pašalintas - naudojame AuthContext

export const usePropertiesData = () => {
  const properties = PropertiesSlice.useSelector(state => state.properties);
  const selectedProperty = PropertiesSlice.useSelector(state => state.selectedProperty);
  
  return useMemo(() => ({
    properties,
    selectedProperty,
  }), [properties, selectedProperty]);
};

export const usePropertiesFilters = () => PropertiesSlice.useSelector(state => state.filters);

export const useTenantsData = () => {
  const tenants = TenantsSlice.useSelector(state => state.tenants);
  const selectedTenant = TenantsSlice.useSelector(state => state.selectedTenant);
  
  return useMemo(() => ({
    tenants,
    selectedTenant,
  }), [tenants, selectedTenant]);
};

export const useTenantsFilters = () => TenantsSlice.useSelector(state => state.filters);

export const useMetersData = () => {
  const meters = MetersSlice.useSelector(state => state.meters);
  const meterConfigs = MetersSlice.useSelector(state => state.meterConfigs);
  const readings = MetersSlice.useSelector(state => state.readings);
  
  return useMemo(() => ({
    meters,
    meterConfigs,
    readings,
  }), [meters, meterConfigs, readings]);
};

export const useUIState = () => {
  const sidebarOpen = UISlice.useSelector(state => state.sidebarOpen);
  const theme = UISlice.useSelector(state => state.theme);
  const performanceMode = UISlice.useSelector(state => state.performanceMode);
  
  return useMemo(() => ({
    sidebarOpen,
    theme,
    performanceMode,
  }), [sidebarOpen, theme, performanceMode]);
};

export const useNotifications = () => UISlice.useSelector(state => state.notifications);

export const useModals = () => UISlice.useSelector(state => state.modals);

// ====== ACTION CREATORS ======

// useUserActions pašalintas - naudojame AuthContext

export const usePropertiesActions = () => {
  const setState = PropertiesSlice.useSetState();
  
  return {
    setProperties: useCallback((properties: any[]) => {
      setState({ properties, error: null });
    }, [setState]),
    
    setSelectedProperty: useCallback((property: any | null) => {
      setState({ selectedProperty: property });
    }, [setState]),
    
    updateFilters: useCallback((filters: Partial<PropertiesState['filters']>) => {
      setState(prev => ({
        ...prev,
        filters: { ...prev.filters, ...filters }
      }));
    }, [setState]),
    
    setLoading: useCallback((loading: boolean) => {
      setState({ loading });
    }, [setState]),
  };
};

export const useTenantsActions = () => {
  const setState = TenantsSlice.useSetState();
  
  return {
    setTenants: useCallback((tenants: any[]) => {
      setState({ tenants, error: null });
    }, [setState]),
    
    setSelectedTenant: useCallback((tenant: any | null) => {
      setState({ selectedTenant: tenant });
    }, [setState]),
    
    updateFilters: useCallback((filters: Partial<TenantsState['filters']>) => {
      setState(prev => ({
        ...prev,
        filters: { ...prev.filters, ...filters }
      }));
    }, [setState]),
  };
};

export const useUIActions = () => {
  const setState = UISlice.useSetState();
  
  return {
    toggleSidebar: useCallback(() => {
      setState(prev => ({ ...prev, sidebarOpen: !prev.sidebarOpen }));
    }, [setState]),
    setSidebarOpen: useCallback((open: boolean) => {
      setState(prev => ({ ...prev, sidebarOpen: open }));
    }, [setState]),
    
    setTheme: useCallback((theme: UIState['theme']) => {
      setState({ theme });
    }, [setState]),
    
    setPerformanceMode: useCallback((mode: UIState['performanceMode']) => {
      setState({ performanceMode: mode });
    }, [setState]),
    
    addNotification: useCallback((notification: Omit<UIState['notifications'][0], 'id' | 'timestamp'>) => {
      setState(prev => ({
        ...prev,
        notifications: [
          ...prev.notifications,
          {
            ...notification,
            id: Math.random().toString(36).substr(2, 9),
            timestamp: Date.now(),
          }
        ]
      }));
    }, [setState]),
    
    removeNotification: useCallback((id: string) => {
      setState(prev => ({
        ...prev,
        notifications: prev.notifications.filter(n => n.id !== id)
      }));
    }, [setState]),
    
    toggleModal: useCallback((modalId: string, open?: boolean) => {
      setState(prev => ({
        ...prev,
        modals: {
          ...prev.modals,
          [modalId]: open !== undefined ? open : !prev.modals[modalId]
        }
      }));
    }, [setState]),
  };
};

// ====== COMBINED PROVIDER ======

interface PerformanceProvidersProps {
  children: React.ReactNode;
}

export function PerformanceProviders({ children }: PerformanceProvidersProps) {
  return (
    <PropertiesSlice.Provider>
      <TenantsSlice.Provider>
        <MetersSlice.Provider>
          <UISlice.Provider>
            {children}
          </UISlice.Provider>
        </MetersSlice.Provider>
      </TenantsSlice.Provider>
    </PropertiesSlice.Provider>
  );
}

// ====== DEVICE CAPABILITIES ======

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

// ====== DEVELOPMENT TOOLS ======

export function usePerformanceDevTools() {
  const propertiesDebug = PropertiesSlice.useDebug();
  const tenantsDebug = TenantsSlice.useDebug();
  const metersDebug = MetersSlice.useDebug();
  const uiDebug = UISlice.useDebug();
  
  return {
    stores: {
      properties: propertiesDebug,
      tenants: tenantsDebug,
      meters: metersDebug,
      ui: uiDebug,
    },
    resetAll: () => {
      propertiesDebug.reset();
      tenantsDebug.reset();
      metersDebug.reset();
      uiDebug.reset();
    },
  };
}
