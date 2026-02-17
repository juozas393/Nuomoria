import { useState, useCallback, useMemo } from 'react';
import { MeterData } from '../MeterRow';
import { AttentionFilter } from '../AttentionSummary';
import { MeterCategory, MeterScope } from '../UtilitiesFilters';

// =============================================================================
// TYPES
// =============================================================================

interface DraftEdit {
    value: string;
    hasError: boolean;
    errorMessage?: string;
}

interface UseBulkEditsReturn {
    drafts: Record<string, DraftEdit>;
    setDraft: (meterId: string, value: string, previousReading: number | null) => void;
    clearDraft: (meterId: string) => void;
    clearAllDrafts: () => void;
    getDraft: (meterId: string) => DraftEdit | null;
    dirtyCount: number;
    errorCount: number;
    hasErrors: boolean;
    getDirtyValues: () => { meterId: string; value: number }[];
}

// =============================================================================
// HOOK
// =============================================================================

export const useBulkEdits = (): UseBulkEditsReturn => {
    const [drafts, setDrafts] = useState<Record<string, DraftEdit>>({});

    const setDraft = useCallback((meterId: string, value: string, previousReading: number | null) => {
        setDrafts(prev => {
            const numValue = parseFloat(value);
            let hasError = false;
            let errorMessage: string | undefined;

            // Validate: current reading must be >= previous
            if (value && !isNaN(numValue) && previousReading !== null && numValue < previousReading) {
                hasError = true;
                errorMessage = 'Negali būti mažiau nei ankstesnis';
            }

            return {
                ...prev,
                [meterId]: { value, hasError, errorMessage }
            };
        });
    }, []);

    const clearDraft = useCallback((meterId: string) => {
        setDrafts(prev => {
            const { [meterId]: _, ...rest } = prev;
            return rest;
        });
    }, []);

    const clearAllDrafts = useCallback(() => {
        setDrafts({});
    }, []);

    const getDraft = useCallback((meterId: string): DraftEdit | null => {
        return drafts[meterId] || null;
    }, [drafts]);

    const dirtyCount = useMemo(() => {
        return Object.keys(drafts).filter(key => drafts[key].value !== '').length;
    }, [drafts]);

    const errorCount = useMemo(() => {
        return Object.values(drafts).filter(d => d.hasError).length;
    }, [drafts]);

    const hasErrors = errorCount > 0;

    const getDirtyValues = useCallback(() => {
        return Object.entries(drafts)
            .filter(([_, draft]) => draft.value !== '' && !draft.hasError)
            .map(([meterId, draft]) => ({
                meterId,
                value: parseFloat(draft.value)
            }));
    }, [drafts]);

    return {
        drafts,
        setDraft,
        clearDraft,
        clearAllDrafts,
        getDraft,
        dirtyCount,
        errorCount,
        hasErrors,
        getDirtyValues,
    };
};

// =============================================================================
// FILTERS HOOK
// =============================================================================

interface UseMetersFiltersReturn {
    // Attention filter
    attentionFilter: AttentionFilter | null;
    setAttentionFilter: (filter: AttentionFilter | null) => void;

    // Search
    searchQuery: string;
    setSearchQuery: (query: string) => void;

    // Category
    categoryFilter: MeterCategory;
    setCategoryFilter: (category: MeterCategory) => void;

    // Scope
    scopeFilter: MeterScope;
    setScopeFilter: (scope: MeterScope) => void;

    // Apply filters
    applyFilters: (meters: MeterData[]) => MeterData[];

    // Reset
    resetFilters: () => void;
}

export const useMetersFilters = (): UseMetersFiltersReturn => {
    const [attentionFilter, setAttentionFilter] = useState<AttentionFilter | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<MeterCategory>('all');
    const [scopeFilter, setScopeFilter] = useState<MeterScope>('all');

    const applyFilters = useCallback((meters: MeterData[]): MeterData[] => {
        let filtered = meters;

        // Attention filter - 'pending' now includes both 'pending' and 'photo' statuses
        if (attentionFilter) {
            if (attentionFilter === 'pending') {
                // Merged status: pending includes both 'pending' and 'photo'
                filtered = filtered.filter(m => m.status === 'pending' || m.status === 'photo');
            } else {
                filtered = filtered.filter(m => m.status === attentionFilter);
            }
        }

        // Search
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(m => m.name.toLowerCase().includes(q));
        }

        // Category
        if (categoryFilter !== 'all') {
            filtered = filtered.filter(m => m.category === categoryFilter);
        }

        // Scope
        if (scopeFilter !== 'all') {
            filtered = filtered.filter(m => m.scope === scopeFilter);
        }

        return filtered;
    }, [attentionFilter, searchQuery, categoryFilter, scopeFilter]);

    const resetFilters = useCallback(() => {
        setAttentionFilter(null);
        setSearchQuery('');
        setCategoryFilter('all');
        setScopeFilter('all');
    }, []);

    return {
        attentionFilter,
        setAttentionFilter,
        searchQuery,
        setSearchQuery,
        categoryFilter,
        setCategoryFilter,
        scopeFilter,
        setScopeFilter,
        applyFilters,
        resetFilters,
    };
};

export default useBulkEdits;
