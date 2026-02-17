import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

// =============================================================================
// TYPES
// =============================================================================

export type DensityLevel = 'comfortable' | 'compact' | 'ultra';

interface DensityContextValue {
    density: DensityLevel;
    setDensity: (level: DensityLevel) => void;
    // Computed values for convenience
    isCompact: boolean;
    isUltra: boolean;
}

interface DensityProviderProps {
    children: ReactNode;
}

// =============================================================================
// STORAGE KEY
// =============================================================================

const DENSITY_STORAGE_KEY = 'nuomoria-density-preference';

// =============================================================================
// CONTEXT
// =============================================================================

const DensityContext = createContext<DensityContextValue | null>(null);

// =============================================================================
// PROVIDER
// =============================================================================

export const DensityProvider: React.FC<DensityProviderProps> = ({ children }) => {
    const [density, setDensityState] = useState<DensityLevel>('comfortable');

    // Load from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem(DENSITY_STORAGE_KEY);
        if (saved && ['comfortable', 'compact', 'ultra'].includes(saved)) {
            setDensityState(saved as DensityLevel);
        }
    }, []);

    // Apply data-density attribute to document
    useEffect(() => {
        document.documentElement.setAttribute('data-density', density);
    }, [density]);

    const setDensity = useCallback((level: DensityLevel) => {
        setDensityState(level);
        localStorage.setItem(DENSITY_STORAGE_KEY, level);
    }, []);

    const value: DensityContextValue = {
        density,
        setDensity,
        isCompact: density === 'compact',
        isUltra: density === 'ultra',
    };

    return (
        <DensityContext.Provider value={value}>
            {children}
        </DensityContext.Provider>
    );
};

// =============================================================================
// HOOK
// =============================================================================

export const useDensity = (): DensityContextValue => {
    const context = useContext(DensityContext);
    if (!context) {
        // Return default if not in provider (for backward compat)
        return {
            density: 'comfortable',
            setDensity: () => { },
            isCompact: false,
            isUltra: false,
        };
    }
    return context;
};

// =============================================================================
// DENSITY CONFIG VALUES
// =============================================================================

export const DENSITY_CONFIG = {
    comfortable: {
        cardPadding: 16,
        cardHeaderHeight: 40,
        iconSize: 36,
        iconSizeSmall: 16,
        rowGap: 12,
        textBase: 14,
        textSm: 13,
        textXs: 11,
        buttonHeight: 36,
        buttonHeightSm: 32,
    },
    compact: {
        cardPadding: 12,
        cardHeaderHeight: 32,
        iconSize: 28,
        iconSizeSmall: 14,
        rowGap: 8,
        textBase: 13,
        textSm: 12,
        textXs: 10,
        buttonHeight: 32,
        buttonHeightSm: 28,
    },
    ultra: {
        cardPadding: 8,
        cardHeaderHeight: 28,
        iconSize: 24,
        iconSizeSmall: 12,
        rowGap: 6,
        textBase: 12,
        textSm: 11,
        textXs: 10,
        buttonHeight: 28,
        buttonHeightSm: 24,
    },
} as const;

// Helper to get config for current density
export const useDensityConfig = () => {
    const { density } = useDensity();
    return DENSITY_CONFIG[density];
};
