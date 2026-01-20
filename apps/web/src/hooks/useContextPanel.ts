import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

// ============================================================
// TYPES
// ============================================================
export type PanelEntityType = 'address' | 'apartment' | 'tenant' | null;

export interface ContextPanelState {
    isOpen: boolean;
    entityType: PanelEntityType;
    entityId: string | null;
    section: string;
}

export interface UseContextPanelReturn extends ContextPanelState {
    openPanel: (entityType: PanelEntityType, entityId: string, section?: string) => void;
    closePanel: () => void;
    setSection: (section: string) => void;
    isCollapsed: boolean;
    toggleCollapse: () => void;
}

// ============================================================
// HOOK
// ============================================================
export const useContextPanel = (): UseContextPanelReturn => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Read state from URL
    const panelType = searchParams.get('panel') as PanelEntityType;
    const entityId = searchParams.get('id');
    const section = searchParams.get('section') || 'overview';
    const isOpen = panelType !== null && entityId !== null;

    // Open panel with URL update
    const openPanel = useCallback((
        entityType: PanelEntityType,
        id: string,
        initialSection: string = 'overview'
    ) => {
        if (!entityType || !id) return;

        setSearchParams(prev => {
            prev.set('panel', entityType);
            prev.set('id', id);
            prev.set('section', initialSection);
            return prev;
        }, { replace: true });
    }, [setSearchParams]);

    // Close panel with URL cleanup
    const closePanel = useCallback(() => {
        setSearchParams(prev => {
            prev.delete('panel');
            prev.delete('id');
            prev.delete('section');
            return prev;
        }, { replace: true });
    }, [setSearchParams]);

    // Change section
    const setSection = useCallback((newSection: string) => {
        setSearchParams(prev => {
            prev.set('section', newSection);
            return prev;
        }, { replace: true });
    }, [setSearchParams]);

    // Toggle collapsed state
    const toggleCollapse = useCallback(() => {
        setIsCollapsed(prev => !prev);
    }, []);

    return {
        isOpen,
        entityType: panelType,
        entityId,
        section,
        openPanel,
        closePanel,
        setSection,
        isCollapsed,
        toggleCollapse
    };
};

export default useContextPanel;
