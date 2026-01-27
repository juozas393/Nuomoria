import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
    Amenity,
    getAllAmenities,
    getPropertyAmenities,
    createAmenity,
    findExistingAmenity,
    addPropertyAmenity,
    removePropertyAmenity,
    CATEGORY_LABELS,
} from '../lib/amenitiesApi';

// ============================================================================
// TYPES
// ============================================================================
export interface AmenityGroup {
    id: string;
    name: string;
    amenities: Amenity[];
}

export interface HighlightSegments {
    before: string;
    match: string;
    after: string;
}

interface UseAmenitiesOptions {
    propertyId: string;
    initialAmenityKeys?: string[]; // For backward compat with JSONB
}

interface UseAmenitiesReturn {
    // Data
    allAmenities: Amenity[];
    groupedAmenities: AmenityGroup[];
    selectedAmenityIds: Set<string>;
    searchQuery: string;
    searchResults: Amenity[];
    isSearching: boolean;

    // Loading states
    isLoading: boolean;
    isCreating: boolean;
    error: string | null;

    // Actions
    setSearchQuery: (query: string) => void;
    toggleAmenity: (amenity: Amenity) => void;
    addNewAmenity: (name: string) => Promise<Amenity | null>;
    getSelectedAmenityKeys: () => string[]; // For saving to JSONB

    // Helpers
    isSelected: (amenityId: string) => boolean;
    getHighlightSegments: (text: string) => HighlightSegments | null;
}

// ============================================================================
// HOOK
// ============================================================================
export function useAmenities({
    propertyId,
    initialAmenityKeys = [],
}: UseAmenitiesOptions): UseAmenitiesReturn {
    // State
    const [allAmenities, setAllAmenities] = useState<Amenity[]>([]);
    const [selectedAmenityIds, setSelectedAmenityIds] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQueryState] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Refs for debounce
    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [debouncedQuery, setDebouncedQuery] = useState('');

    // Track if initial load is complete - prevents re-fetch when parent updates initialAmenityKeys
    const hasLoadedRef = useRef(false);
    const initialKeysRef = useRef(initialAmenityKeys);

    // ========================================================================
    // LOAD DATA - Only runs once per propertyId
    // ========================================================================
    useEffect(() => {
        // Skip if already loaded for this property
        if (hasLoadedRef.current) return;

        let cancelled = false;

        async function loadData() {
            setIsLoading(true);
            setError(null);

            try {
                // Fetch all amenities
                const amenities = await getAllAmenities();
                if (cancelled) return;
                setAllAmenities(amenities);

                // Try to get property amenities from junction table
                try {
                    const propertyAmenityIds = await getPropertyAmenities(propertyId);
                    if (!cancelled && propertyAmenityIds.length > 0) {
                        setSelectedAmenityIds(new Set(propertyAmenityIds));
                    } else if (!cancelled && initialKeysRef.current.length > 0) {
                        // Fallback: map JSONB keys to amenity IDs
                        const keyToId = new Map(amenities.map(a => [a.key, a.id]));
                        const ids = initialKeysRef.current
                            .map(key => keyToId.get(key))
                            .filter((id): id is string => !!id);
                        setSelectedAmenityIds(new Set(ids));
                    }
                } catch {
                    // Property amenities table might not have data yet
                    console.warn('[useAmenities] Could not load property amenities, using JSONB fallback');
                    if (!cancelled && initialKeysRef.current.length > 0) {
                        const keyToId = new Map(amenities.map(a => [a.key, a.id]));
                        const ids = initialKeysRef.current
                            .map(key => keyToId.get(key))
                            .filter((id): id is string => !!id);
                        setSelectedAmenityIds(new Set(ids));
                    }
                }

                // Mark as loaded
                hasLoadedRef.current = true;
            } catch (err) {
                console.error('[useAmenities] Error loading data:', err);
                if (!cancelled) {
                    setError('Nepavyko užkrauti patogumų sąrašo');
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        }

        loadData();

        return () => {
            cancelled = true;
        };
    }, [propertyId]); // Only propertyId - no initialAmenityKeys to prevent re-fetch

    // ========================================================================
    // DEBOUNCED SEARCH
    // ========================================================================
    const setSearchQuery = useCallback((query: string) => {
        setSearchQueryState(query);

        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        searchTimeoutRef.current = setTimeout(() => {
            setDebouncedQuery(query.trim().toLowerCase());
        }, 250);
    }, []);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, []);

    // ========================================================================
    // COMPUTED: GROUPED AMENITIES
    // ========================================================================
    const groupedAmenities = useMemo((): AmenityGroup[] => {
        const groups = new Map<string, Amenity[]>();

        for (const amenity of allAmenities) {
            const category = amenity.category || 'custom';
            if (!groups.has(category)) {
                groups.set(category, []);
            }
            groups.get(category)!.push(amenity);
        }

        // Order: kitchen, appliances, building, comfort, outdoor, custom
        const order = ['kitchen', 'appliances', 'building', 'comfort', 'outdoor', 'custom'];

        return order
            .filter(cat => groups.has(cat))
            .map(cat => ({
                id: cat,
                name: CATEGORY_LABELS[cat] || cat,
                amenities: groups.get(cat)!,
            }));
    }, [allAmenities]);

    // ========================================================================
    // COMPUTED: SEARCH RESULTS
    // ========================================================================
    const searchResults = useMemo((): Amenity[] => {
        if (!debouncedQuery) return [];

        return allAmenities.filter(amenity =>
            amenity.name.toLowerCase().includes(debouncedQuery)
        );
    }, [allAmenities, debouncedQuery]);

    const isSearching = debouncedQuery.length > 0;

    // ========================================================================
    // TOGGLE AMENITY
    // ========================================================================
    const toggleAmenity = useCallback((amenity: Amenity) => {
        setSelectedAmenityIds(prev => {
            const next = new Set(prev);
            const wasSelected = next.has(amenity.id);

            if (wasSelected) {
                next.delete(amenity.id);
                // Optimistic: remove from DB
                removePropertyAmenity(propertyId, amenity.id).catch(err => {
                    console.error('[useAmenities] Failed to remove amenity:', err);
                    // Rollback
                    setSelectedAmenityIds(p => new Set([...p, amenity.id]));
                });
            } else {
                next.add(amenity.id);
                // Optimistic: add to DB
                addPropertyAmenity(propertyId, amenity.id).catch(err => {
                    console.error('[useAmenities] Failed to add amenity:', err);
                    // Rollback
                    setSelectedAmenityIds(p => {
                        const rollback = new Set(p);
                        rollback.delete(amenity.id);
                        return rollback;
                    });
                });
            }

            return next;
        });
    }, [propertyId]);

    // ========================================================================
    // ADD NEW AMENITY
    // ========================================================================
    const addNewAmenity = useCallback(async (name: string): Promise<Amenity | null> => {
        const trimmed = name.trim();
        if (!trimmed) return null;

        setIsCreating(true);
        setError(null);

        try {
            // Check for existing (case-insensitive)
            const existing = await findExistingAmenity(trimmed);
            if (existing) {
                // Just select the existing one
                setSelectedAmenityIds(prev => new Set([...prev, existing.id]));
                await addPropertyAmenity(propertyId, existing.id);
                return existing;
            }

            // Create new
            const newAmenity = await createAmenity(trimmed, 'custom');

            // Add to local state
            setAllAmenities(prev => [...prev, newAmenity]);
            setSelectedAmenityIds(prev => new Set([...prev, newAmenity.id]));

            // Add to property
            await addPropertyAmenity(propertyId, newAmenity.id);

            // Clear search
            setSearchQueryState('');
            setDebouncedQuery('');

            return newAmenity;
        } catch (err) {
            console.error('[useAmenities] Error creating amenity:', err);
            setError('Nepavyko sukurti naujo patogumo');
            return null;
        } finally {
            setIsCreating(false);
        }
    }, [propertyId]);

    // ========================================================================
    // GET SELECTED KEYS (for JSONB backward compat)
    // ========================================================================
    const getSelectedAmenityKeys = useCallback((): string[] => {
        const idToKey = new Map(allAmenities.map(a => [a.id, a.key]));
        return Array.from(selectedAmenityIds)
            .map(id => idToKey.get(id))
            .filter((key): key is string => !!key);
    }, [allAmenities, selectedAmenityIds]);

    // ========================================================================
    // HELPERS
    // ========================================================================
    const isSelected = useCallback((amenityId: string): boolean => {
        return selectedAmenityIds.has(amenityId);
    }, [selectedAmenityIds]);

    // Return highlight segments for the component to render
    const getHighlightSegments = useCallback((text: string): HighlightSegments | null => {
        if (!debouncedQuery) return null;

        const index = text.toLowerCase().indexOf(debouncedQuery);
        if (index === -1) return null;

        return {
            before: text.slice(0, index),
            match: text.slice(index, index + debouncedQuery.length),
            after: text.slice(index + debouncedQuery.length),
        };
    }, [debouncedQuery]);

    return {
        allAmenities,
        groupedAmenities,
        selectedAmenityIds,
        searchQuery,
        searchResults,
        isSearching,
        isLoading,
        isCreating,
        error,
        setSearchQuery,
        toggleAmenity,
        addNewAmenity,
        getSelectedAmenityKeys,
        isSelected,
        getHighlightSegments,
    };
}
