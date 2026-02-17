import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { DEFAULT_LAYOUTS, LayoutItem } from './layoutConstants';

// =============================================================================
// TYPES
// =============================================================================

type Breakpoint = 'lg' | 'md' | 'sm';

interface Layouts {
    lg: LayoutItem[];
    md: LayoutItem[];
    sm: LayoutItem[];
}

interface LayoutEditorContextValue {
    // Edit mode state
    isEditing: boolean;
    toggleEdit: () => void;
    startEdit: () => void;
    cancelEdit: () => void;

    // Layout state
    layouts: Layouts;
    setLayouts: (layouts: Layouts) => void;
    updateLayout: (breakpoint: Breakpoint, layout: LayoutItem[]) => void;

    // Save/reset
    saveLayout: () => Promise<void>;
    resetToDefault: () => void;
    hasUnsavedChanges: boolean;

    // Current breakpoint
    currentBreakpoint: Breakpoint;
    setCurrentBreakpoint: (bp: Breakpoint) => void;
}

const LayoutEditorContext = createContext<LayoutEditorContextValue | null>(null);

// =============================================================================
// PROVIDER
// =============================================================================

interface LayoutEditorProviderProps {
    children: ReactNode;
    propertyId: string;
    initialLayouts?: Layouts;
    onSave?: (layouts: Layouts) => Promise<void>;
}

export const LayoutEditorProvider: React.FC<LayoutEditorProviderProps> = ({
    children,
    propertyId,
    initialLayouts,
    onSave,
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [currentBreakpoint, setCurrentBreakpoint] = useState<Breakpoint>('lg');
    const [layouts, setLayouts] = useState<Layouts>(initialLayouts || DEFAULT_LAYOUTS);
    const [savedLayouts, setSavedLayouts] = useState<Layouts>(initialLayouts || DEFAULT_LAYOUTS);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    const toggleEdit = useCallback(() => {
        setIsEditing(prev => !prev);
    }, []);

    const startEdit = useCallback(() => {
        setIsEditing(true);
    }, []);

    const cancelEdit = useCallback(() => {
        // Revert to last saved state
        setLayouts(savedLayouts);
        setHasUnsavedChanges(false);
        setIsEditing(false);
    }, [savedLayouts]);

    const updateLayout = useCallback((breakpoint: Breakpoint, layout: LayoutItem[]) => {
        setLayouts(prev => ({
            ...prev,
            [breakpoint]: layout,
        }));
        setHasUnsavedChanges(true);
    }, []);

    const saveLayout = useCallback(async () => {
        try {
            await onSave?.(layouts);
            setSavedLayouts(layouts);
            setHasUnsavedChanges(false);
            setIsEditing(false);
        } catch (error) {
            console.error('Failed to save layout:', error);
            throw error;
        }
    }, [layouts, onSave]);

    const resetToDefault = useCallback(() => {
        setLayouts(DEFAULT_LAYOUTS);
        setHasUnsavedChanges(true);
    }, []);

    const value: LayoutEditorContextValue = {
        isEditing,
        toggleEdit,
        startEdit,
        cancelEdit,
        layouts,
        setLayouts,
        updateLayout,
        saveLayout,
        resetToDefault,
        hasUnsavedChanges,
        currentBreakpoint,
        setCurrentBreakpoint,
    };

    return (
        <LayoutEditorContext.Provider value={value}>
            {children}
        </LayoutEditorContext.Provider>
    );
};

// =============================================================================
// HOOK
// =============================================================================

export const useLayoutEditor = (): LayoutEditorContextValue => {
    const context = useContext(LayoutEditorContext);
    if (!context) {
        throw new Error('useLayoutEditor must be used within LayoutEditorProvider');
    }
    return context;
};

export default LayoutEditorProvider;
