import React, { useState, memo, useCallback, useRef, useEffect } from 'react';
import { Search, X, Plus, Check, Loader2, AlertCircle } from 'lucide-react';
import { useAmenities, AmenityGroup, HighlightSegments } from '../../hooks/useAmenities';
import { Amenity } from '../../lib/amenitiesApi';

// ============================================================================
// ANIMATION CONSTANTS
// ============================================================================
const ANIMATION = {
    hover: 'duration-150 ease-out',
} as const;

// ============================================================================
// PROPS
// ============================================================================
interface AmenitiesSectionProps {
    propertyId: string;
    initialAmenityKeys?: string[];
    onAmenitiesChange?: (keys: string[]) => void;
    onToast?: (message: string, type: 'success' | 'error') => void;
}

// ============================================================================
// HIGHLIGHT TEXT COMPONENT
// ============================================================================
const HighlightedText: React.FC<{ text: string; segments: HighlightSegments | null }> = ({ text, segments }) => {
    if (!segments) return <>{text}</>;

    return (
        <>
            {segments.before}
            <mark className="bg-yellow-200 text-gray-900 px-0.5 rounded">{segments.match}</mark>
            {segments.after}
        </>
    );
};

// ============================================================================
// AMENITY CHIP COMPONENT
// ============================================================================
interface AmenityChipProps {
    amenity: Amenity;
    isSelected: boolean;
    onToggle: () => void;
    getHighlightSegments: (text: string) => HighlightSegments | null;
}

const AmenityChip = memo<AmenityChipProps>(({ amenity, isSelected, onToggle, getHighlightSegments }) => (
    <button
        type="button"
        onClick={onToggle}
        aria-pressed={isSelected}
        aria-label={`${amenity.name} - ${isSelected ? 'pasirinkta' : 'nepasirinkta'}`}
        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all ${ANIMATION.hover} ${isSelected
            ? 'bg-teal-50 border-teal-200 text-teal-700 shadow-sm'
            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
            }`}
    >
        <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-colors ${ANIMATION.hover} ${isSelected
            ? 'bg-teal-500 border-teal-500'
            : 'border-2 border-gray-300'
            }`}>
            {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
        </div>
        <span className="text-sm">
            <HighlightedText text={amenity.name} segments={getHighlightSegments(amenity.name)} />
        </span>
    </button>
));
AmenityChip.displayName = 'AmenityChip';

// ============================================================================
// CATEGORY GROUP COMPONENT
// ============================================================================
interface CategoryGroupProps {
    group: AmenityGroup;
    isSelected: (id: string) => boolean;
    onToggle: (amenity: Amenity) => void;
    getHighlightSegments: (text: string) => HighlightSegments | null;
    isExpanded: boolean;
    onToggleExpand: () => void;
    basicCount?: number;
}

const CategoryGroup = memo<CategoryGroupProps>(({
    group,
    isSelected,
    onToggle,
    getHighlightSegments,
    isExpanded,
    onToggleExpand,
    basicCount = 5,
}) => {
    const basicAmenities = group.amenities.slice(0, basicCount);
    const extendedAmenities = group.amenities.slice(basicCount);
    const itemsToShow = isExpanded ? group.amenities : basicAmenities;
    const selectedCount = group.amenities.filter(a => isSelected(a.id)).length;

    return (
        <div className="space-y-2">
            {/* Category Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        {group.name}
                    </span>
                    {selectedCount > 0 && (
                        <span className="text-[10px] font-semibold text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded-full">
                            {selectedCount}
                        </span>
                    )}
                </div>
                {extendedAmenities.length > 0 && (
                    <button
                        type="button"
                        onClick={onToggleExpand}
                        className="text-xs text-teal-600 hover:text-teal-700 font-medium transition-colors"
                    >
                        {isExpanded ? 'Mažiau' : `Daugiau (${extendedAmenities.length})`}
                    </button>
                )}
            </div>

            {/* Amenity Grid */}
            <div className="grid grid-cols-2 gap-2">
                {itemsToShow.map(amenity => (
                    <AmenityChip
                        key={amenity.id}
                        amenity={amenity}
                        isSelected={isSelected(amenity.id)}
                        onToggle={() => onToggle(amenity)}
                        getHighlightSegments={getHighlightSegments}
                    />
                ))}
            </div>
        </div>
    );
});
CategoryGroup.displayName = 'CategoryGroup';

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export const AmenitiesSection: React.FC<AmenitiesSectionProps> = ({
    propertyId,
    initialAmenityKeys = [],
    onAmenitiesChange,
    onToast,
}) => {
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

    const {
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
    } = useAmenities({
        propertyId,
        initialAmenityKeys,
    });

    // Track initial render to avoid calling onAmenitiesChange on mount
    const isInitialMount = useRef(true);

    // Sync parent form state whenever selected amenities change
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }
        // Notify parent with updated keys
        onAmenitiesChange?.(getSelectedAmenityKeys());
    }, [selectedAmenityIds, getSelectedAmenityKeys, onAmenitiesChange]);

    // Simple toggle handler - useEffect handles parent notification
    const handleToggle = useCallback((amenity: Amenity) => {
        toggleAmenity(amenity);
    }, [toggleAmenity]);

    // Add new amenity handler
    const handleAddNew = useCallback(async () => {
        const trimmed = searchQuery.trim();
        if (!trimmed) return;

        const result = await addNewAmenity(trimmed);
        if (result) {
            onToast?.(`Patogumas "${result.name}" pridėtas`, 'success');
            // Note: useEffect will automatically notify parent of selection change
        } else {
            onToast?.('Nepavyko pridėti patogumo', 'error');
        }
    }, [searchQuery, addNewAmenity, onToast]);

    // Toggle category expansion
    const toggleCategory = useCallback((categoryId: string) => {
        setExpandedCategories(prev => {
            const next = new Set(prev);
            if (next.has(categoryId)) {
                next.delete(categoryId);
            } else {
                next.add(categoryId);
            }
            return next;
        });
    }, []);

    // Check if exact match exists
    const exactMatchExists = searchQuery.trim()
        ? searchResults.some(a => a.name.toLowerCase() === searchQuery.trim().toLowerCase())
        : true;

    // Loading state
    if (isLoading) {
        return (
            <div className="space-y-3">
                <div className="flex items-center gap-3 text-gray-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Kraunami patogumai...</span>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="flex items-center gap-3 text-red-500 bg-red-50 px-4 py-3 rounded-xl">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Ieškoti patogumų..."
                    aria-label="Ieškoti patogumų"
                    className={`w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm 
                        focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 
                        transition-all ${ANIMATION.hover}`}
                />
                {searchQuery && (
                    <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                        aria-label="Išvalyti paiešką"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Search Results Mode */}
            {isSearching ? (
                <div className="space-y-3">
                    {searchResults.length > 0 ? (
                        <>
                            <p className="text-xs text-gray-400">
                                Rasta: {searchResults.length} {searchResults.length === 1 ? 'patogumas' : 'patogumai'}
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                                {searchResults.map(amenity => (
                                    <AmenityChip
                                        key={amenity.id}
                                        amenity={amenity}
                                        isSelected={isSelected(amenity.id)}
                                        onToggle={() => handleToggle(amenity)}
                                        getHighlightSegments={getHighlightSegments}
                                    />
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                            <p className="text-sm text-gray-500 mb-3">
                                Nerasta patogumų pagal „{searchQuery}"
                            </p>
                            {!exactMatchExists && (
                                <button
                                    type="button"
                                    onClick={handleAddNew}
                                    disabled={isCreating}
                                    className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium 
                                        text-teal-700 bg-teal-50 rounded-lg border border-teal-200 
                                        hover:bg-teal-100 transition-all ${ANIMATION.hover}
                                        disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    {isCreating ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Plus className="w-4 h-4" />
                                    )}
                                    Pridėti „{searchQuery.trim()}"
                                </button>
                            )}
                        </div>
                    )}

                    {/* Show Add button even with results if no exact match */}
                    {searchResults.length > 0 && !exactMatchExists && (
                        <button
                            type="button"
                            onClick={handleAddNew}
                            disabled={isCreating}
                            className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm 
                                font-medium text-teal-700 bg-teal-50 rounded-xl border border-teal-200 
                                hover:bg-teal-100 transition-all ${ANIMATION.hover}
                                disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            {isCreating ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Plus className="w-4 h-4" />
                            )}
                            Pridėti naują: „{searchQuery.trim()}"
                        </button>
                    )}
                </div>
            ) : (
                /* Grouped View */
                <div className="space-y-5">
                    {groupedAmenities.map(group => (
                        <CategoryGroup
                            key={group.id}
                            group={group}
                            isSelected={isSelected}
                            onToggle={handleToggle}
                            getHighlightSegments={getHighlightSegments}
                            isExpanded={expandedCategories.has(group.id)}
                            onToggleExpand={() => toggleCategory(group.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default AmenitiesSection;
