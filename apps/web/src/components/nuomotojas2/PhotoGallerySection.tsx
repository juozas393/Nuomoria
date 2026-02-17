import React, { useState, memo, useCallback, useMemo, useEffect, useRef, lazy, Suspense } from 'react';
import { Camera, Plus, ChevronLeft, ChevronRight, Layers, Edit3, X, Star, Trash2, Check, GripVertical } from 'lucide-react';

// ============================================================================
// CONSTANTS - Use specific transitions for performance
// ============================================================================
const ANIMATION = {
    // Specific transitions instead of transition-colors
    hover: 'transition-colors transition-opacity duration-150 ease-out',
    press: 'transition-transform duration-100 ease-out',
    modal: 'transition-opacity duration-200 ease-out',
} as const;

const cardStyle = {
    backgroundImage: `url('/images/CardsBackground.webp')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
};

const RECOMMENDED_PHOTOS = 8;
const MAX_VISIBLE_PHOTOS = 7; // 1 cover + 6 thumbnails in 2x3 grid

// Layout configurations - ALL use same container size, only grid differs
type LayoutType = 'bento' | 'grid-2x2' | 'split-1-3' | 'horizontal';

// Fixed container height — fills full width
const CONTAINER_CLASS = 'h-[280px] w-full';

interface LayoutConfig {
    key: LayoutType;
    label: string;
    icon: React.ReactNode;
    gridClass: string; // Grid layout inside the fixed container
    getItemClass: (index: number) => string;
    maxPhotos: number; // How many photos this layout can display
}

const LAYOUTS: LayoutConfig[] = [
    {
        key: 'split-1-3',
        label: '1 + 6',
        icon: (
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="2" y="2" width="11" height="20" rx="1" />
                <rect x="15" y="2" width="3.5" height="6" rx="1" />
                <rect x="19.5" y="2" width="3.5" height="6" rx="1" />
                <rect x="15" y="9" width="3.5" height="6" rx="1" />
                <rect x="19.5" y="9" width="3.5" height="6" rx="1" />
                <rect x="15" y="16" width="3.5" height="6" rx="1" />
                <rect x="19.5" y="16" width="3.5" height="6" rx="1" />
            </svg>
        ),
        // Hero left (full height, 60%), 2x3 grid of thumbnails right (40%)
        gridClass: 'grid grid-cols-[50%_1fr_1fr] grid-rows-3',
        maxPhotos: 7, // 1 hero + 6 thumbnails (2×3)
        getItemClass: (index: number) => {
            if (index === 0) return 'row-span-3'; // Cover takes full height
            return ''; // Thumbnails auto-fill 2x3 grid
        },
    },
    {
        key: 'bento',
        label: 'Bento',
        icon: (
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="2" y="2" width="11" height="11" rx="1" />
                <rect x="15" y="2" width="7" height="5" rx="1" />
                <rect x="15" y="9" width="7" height="4" rx="1" />
                <rect x="2" y="15" width="6" height="7" rx="1" />
                <rect x="9.5" y="15" width="6" height="7" rx="1" />
                <rect x="17" y="15" width="5" height="7" rx="1" />
            </svg>
        ),
        // Hero top-left (2 cols, 2 rows), 2 small right, 3 across bottom
        gridClass: 'grid grid-cols-3 grid-rows-[1fr_1fr_0.7fr]',
        maxPhotos: 6, // 1 hero (2×2) + 2 right + 3 bottom
        getItemClass: (index: number) => {
            if (index === 0) return 'col-span-2 row-span-2';
            return '';
        },
    },
    {
        key: 'grid-2x2',
        label: 'Tinklelis',
        icon: (
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="2" y="2" width="9" height="9" rx="1" />
                <rect x="13" y="2" width="9" height="9" rx="1" />
                <rect x="2" y="13" width="9" height="9" rx="1" />
                <rect x="13" y="13" width="9" height="9" rx="1" />
            </svg>
        ),
        // 2x2 equal grid
        gridClass: 'grid grid-cols-2 grid-rows-2',
        maxPhotos: 4, // 2×2 grid
        getItemClass: () => '',
    },
    {
        key: 'horizontal',
        label: 'Eilė',
        icon: (
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="2" y="4" width="5" height="16" rx="1" />
                <rect x="8" y="4" width="5" height="16" rx="1" />
                <rect x="14" y="4" width="5" height="16" rx="1" />
                <rect x="20" y="4" width="2" height="16" rx="0.5" />
            </svg>
        ),
        // 4 equal columns — single row
        gridClass: 'grid grid-cols-4 grid-rows-1',
        maxPhotos: 4, // 4 columns × 1 row
        getItemClass: () => '',
    },
];

// ============================================================================
// TYPES
// ============================================================================
interface PhotoGallerySectionProps {
    photos: string[];
    propertyId: string;
    onUploadPhoto?: () => void;
    onReorderPhotos?: (photos: string[]) => void;
    onDeletePhoto?: (index: number) => void;
    onSetCover?: (index: number) => void;
    isVacant?: boolean;
    isLoading?: boolean;
}

// ============================================================================
// SKELETON COMPONENTS
// ============================================================================
const PhotoSkeleton = memo(() => (
    <div className="animate-pulse">
        <div className="grid grid-cols-5 gap-1.5">
            <div className="col-span-2 aspect-[2/1] rounded-lg bg-gray-200" />
            {[1, 2, 3].map(i => (
                <div key={i} className="aspect-square rounded-lg bg-gray-200" />
            ))}
        </div>
    </div>
));
PhotoSkeleton.displayName = 'PhotoSkeleton';

// ============================================================================
// PHOTO ITEM COMPONENT (Memoized)
// ============================================================================
interface PhotoItemProps {
    photo: string;
    index: number;
    isCover: boolean;
    isBentoHero: boolean;
    editMode: boolean;
    isSelected: boolean;
    isDragging: boolean;
    isDragOver: boolean;
    onSelect: () => void;
    onDelete: () => void;
    onSetCover: () => void;
    onClick: () => void;
    onDragStart: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: () => void;
    onDragEnd: () => void;
}

const PhotoItem = memo<PhotoItemProps>(({
    photo,
    index,
    isCover,
    isBentoHero,
    editMode,
    isSelected,
    isDragging,
    isDragOver,
    onSelect,
    onDelete,
    onSetCover,
    onClick,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
}) => {
    const [isLoaded, setIsLoaded] = useState(false);

    return (
        <div
            className={`relative group rounded-lg overflow-hidden border bg-white shadow-sm h-full w-full ${ANIMATION.hover}
                ${editMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer hover:shadow-md hover:-translate-y-[1px] transition-transform'}
                ${isDragging ? 'opacity-50 scale-95' : ''}
                ${isDragOver ? 'ring-2 ring-teal-500/40' : ''}
                ${isSelected ? 'ring-2 ring-teal-500 border-teal-500' : 'border-gray-200/80 hover:border-gray-300/80'}
            `}
            draggable={editMode}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onDragEnd={onDragEnd}
            onClick={editMode ? onSelect : onClick}
        >
            {/* Skeleton while loading */}
            {!isLoaded && (
                <div className="absolute inset-0 bg-gray-200 animate-pulse" />
            )}

            <img
                src={photo}
                alt={`Nuotrauka ${index + 1}`}
                loading={isCover ? 'eager' : 'lazy'}
                decoding="async"
                onLoad={() => setIsLoaded(true)}
                className={`w-full h-full object-cover transition-opacity ${ANIMATION.hover} ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
            />

            {/* Cover badge */}
            {isCover && isLoaded && !editMode && (
                <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-md text-white text-[10px] font-medium">
                    <Star className="w-3 h-3" />
                    Viršelis
                </div>
            )}

            {/* Selection checkbox in edit mode */}
            {editMode && (
                <div className={`absolute top-2 left-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors duration-150
                    ${isSelected ? 'bg-teal-500 border-teal-500' : 'bg-white/80 border-gray-300 hover:border-teal-400'}
                `}>
                    {isSelected && <Check className="w-4 h-4 text-white" />}
                </div>
            )}

            {/* Drag handle in edit mode */}
            {editMode && (
                <div className="absolute top-2 right-2 w-6 h-6 bg-white/80 backdrop-blur-sm rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <GripVertical className="w-4 h-4 text-gray-500" />
                </div>
            )}

            {/* Hover overlay (view mode) */}
            {!editMode && (
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    <span className="text-white font-medium text-sm">Peržiūrėti</span>
                </div>
            )}
        </div>
    );
});
PhotoItem.displayName = 'PhotoItem';

// ============================================================================
// MANAGE MODE TOOLBAR
// ============================================================================
interface ManageToolbarProps {
    selectedCount: number;
    onSetCover: () => void;
    onDelete: () => void;
    onDone: () => void;
    canSetCover: boolean;
}

const ManageToolbar = memo<ManageToolbarProps>(({
    selectedCount,
    onSetCover,
    onDelete,
    onDone,
    canSetCover,
}) => (
    <div className="sticky bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-100 p-3 flex items-center justify-between gap-3">
        <div className="text-sm text-gray-600">
            {selectedCount > 0 ? `${selectedCount} pažymėta` : 'Pasirinkite nuotraukas'}
        </div>
        <div className="flex items-center gap-2">
            {selectedCount === 1 && canSetCover && (
                <button
                    onClick={onSetCover}
                    className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors ${ANIMATION.hover}`}
                >
                    <Star className="w-4 h-4" />
                    Viršelis
                </button>
            )}
            {selectedCount > 0 && (
                <button
                    onClick={onDelete}
                    className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors ${ANIMATION.hover}`}
                >
                    <Trash2 className="w-4 h-4" />
                    Ištrinti
                </button>
            )}
            <button
                onClick={onDone}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors ${ANIMATION.hover} active:scale-[0.98]`}
            >
                <Check className="w-4 h-4" />
                Baigti
            </button>
        </div>
    </div>
));
ManageToolbar.displayName = 'ManageToolbar';

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export const PhotoGallerySection: React.FC<PhotoGallerySectionProps> = ({
    photos,
    propertyId,
    onUploadPhoto,
    onReorderPhotos,
    onDeletePhoto,
    onSetCover,
    isVacant = true,
    isLoading = false,
}) => {
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const [editMode, setEditMode] = useState(false);
    const [selectedPhotos, setSelectedPhotos] = useState<Set<number>>(new Set());
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    // Zoom state for lightbox
    const [zoomLevel, setZoomLevel] = useState(1);
    const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
    const [wasPanning, setWasPanning] = useState(false);
    const imageContainerRef = useRef<HTMLDivElement>(null);

    // Layout state with localStorage persistence
    const [selectedLayout, setSelectedLayout] = useState<LayoutType>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(`photoLayout_${propertyId}`);
            if (saved && LAYOUTS.some(l => l.key === saved)) {
                return saved as LayoutType;
            }
        }
        return 'bento'; // Default to bento layout (matches overview card)
    });
    const [layoutPickerOpen, setLayoutPickerOpen] = useState(false);

    const handleLayoutChange = useCallback((layout: LayoutType) => {
        setSelectedLayout(layout);
        localStorage.setItem(`photoLayout_${propertyId}`, layout);
        setLayoutPickerOpen(false);
    }, [propertyId]);

    const currentLayout = useMemo(() =>
        LAYOUTS.find(l => l.key === selectedLayout) || LAYOUTS[0],
        [selectedLayout]
    );

    // ESC key to close lightbox
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!lightboxOpen) return;
            if (e.key === 'Escape') {
                closeLightbox();
            } else if (e.key === 'ArrowLeft') {
                setLightboxIndex(i => i > 0 ? i - 1 : photos.length - 1);
                setZoomLevel(1);
                setPanPosition({ x: 0, y: 0 });
            } else if (e.key === 'ArrowRight') {
                setLightboxIndex(i => i < photos.length - 1 ? i + 1 : 0);
                setZoomLevel(1);
                setPanPosition({ x: 0, y: 0 });
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [lightboxOpen, photos.length]);

    // Smooth panning handlers
    const handlePanStart = useCallback((e: React.MouseEvent) => {
        if (zoomLevel <= 1) return;
        e.preventDefault();
        setIsPanning(true);
        panStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            panX: panPosition.x,
            panY: panPosition.y,
        };
    }, [zoomLevel, panPosition]);

    const handlePanMove = useCallback((e: React.MouseEvent) => {
        if (!isPanning || zoomLevel <= 1) return;
        e.preventDefault();
        const dx = e.clientX - panStartRef.current.x;
        const dy = e.clientY - panStartRef.current.y;
        setPanPosition({
            x: panStartRef.current.panX + dx,
            y: panStartRef.current.panY + dy,
        });
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
            setWasPanning(true);
        }
    }, [isPanning, zoomLevel]);

    const handlePanEnd = useCallback(() => {
        if (isPanning) {
            setIsPanning(false);
        }
    }, [isPanning]);

    // Handlers
    const openLightbox = useCallback((index: number) => {
        setLightboxIndex(index);
        setZoomLevel(1);
        setPanPosition({ x: 0, y: 0 });
        setLightboxOpen(true);
    }, []);

    const closeLightbox = useCallback(() => {
        setLightboxOpen(false);
        setZoomLevel(1);
        setPanPosition({ x: 0, y: 0 });
    }, []);

    const toggleEditMode = useCallback(() => {
        setEditMode(prev => !prev);
        setSelectedPhotos(new Set());
    }, []);

    const togglePhotoSelection = useCallback((index: number) => {
        setSelectedPhotos(prev => {
            const next = new Set(prev);
            if (next.has(index)) {
                next.delete(index);
            } else {
                next.add(index);
            }
            return next;
        });
    }, []);

    const handleSetCoverSelected = useCallback(() => {
        const selected = Array.from(selectedPhotos);
        if (selected.length === 1 && onSetCover) {
            onSetCover(selected[0]);
        } else if (selected.length === 1 && onReorderPhotos) {
            // Move selected photo to first position
            const newPhotos = [...photos];
            const [photo] = newPhotos.splice(selected[0], 1);
            newPhotos.unshift(photo);
            onReorderPhotos(newPhotos);
        }
        setSelectedPhotos(new Set());
    }, [selectedPhotos, onSetCover, onReorderPhotos, photos]);

    const handleDeleteSelected = useCallback(() => {
        const sorted = Array.from(selectedPhotos).sort((a, b) => b - a);
        sorted.forEach(index => onDeletePhoto?.(index));
        setSelectedPhotos(new Set());
    }, [selectedPhotos, onDeletePhoto]);

    // Drag handlers
    const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverIndex(index);
    }, []);

    const handleDrop = useCallback((index: number) => {
        if (draggedIndex !== null && draggedIndex !== index && onReorderPhotos) {
            const newPhotos = [...photos];
            const [dragged] = newPhotos.splice(draggedIndex, 1);
            newPhotos.splice(index, 0, dragged);
            onReorderPhotos(newPhotos);
        }
        setDraggedIndex(null);
        setDragOverIndex(null);
    }, [draggedIndex, photos, onReorderPhotos]);

    const handleDragEnd = useCallback(() => {
        setDraggedIndex(null);
        setDragOverIndex(null);
    }, []);

    // Lightbox handlers
    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.2 : 0.2;
        setZoomLevel(prev => {
            const newZoom = Math.max(1, Math.min(4, prev + delta));
            if (newZoom <= 1) setPanPosition({ x: 0, y: 0 });
            return newZoom;
        });
    }, []);

    const handleImageClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        if (wasPanning) {
            setWasPanning(false);
            return;
        }
        setZoomLevel(prev => prev === 1 ? 2 : prev < 2.5 ? 3 : 1);
        if (zoomLevel >= 2.5) setPanPosition({ x: 0, y: 0 });
    }, [wasPanning, zoomLevel]);

    const needsMorePhotos = photos.length < RECOMMENDED_PHOTOS;

    // Loading state
    if (isLoading) {
        return (
            <div className="rounded-2xl border border-gray-100 overflow-hidden shadow-sm" style={cardStyle}>
                <div className="p-4 border-b border-gray-50">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gray-100 rounded-lg animate-pulse" />
                        <div className="space-y-1">
                            <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
                            <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
                        </div>
                    </div>
                </div>
                <div className="p-4">
                    <PhotoSkeleton />
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-gray-100 overflow-hidden shadow-sm" style={cardStyle}>
            {/* Header */}
            <div className="p-4 border-b border-gray-50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-white/80 backdrop-blur-sm rounded-lg flex items-center justify-center">
                            <Camera className="w-4 h-4 text-gray-600" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-gray-900">Būsto nuotraukos</h3>
                            <p className="text-xs text-gray-500">
                                {photos.length} nuotrauk{photos.length === 1 ? 'a' : 'os'}
                                {needsMorePhotos && photos.length > 0 && (
                                    <span className="text-amber-600 ml-1">(Rekomenduojama: {RECOMMENDED_PHOTOS}+)</span>
                                )}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Layout picker */}
                        {photos.length >= 2 && !editMode && (
                            <div className="relative">
                                <button
                                    onClick={() => setLayoutPickerOpen(!layoutPickerOpen)}
                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white/80 text-gray-600 hover:bg-white transition-colors ${ANIMATION.hover}`}
                                >
                                    <Layers className="w-3.5 h-3.5" />
                                    Išdėstymas
                                </button>
                                {layoutPickerOpen && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setLayoutPickerOpen(false)} />
                                        <div className="absolute right-0 top-full mt-2 z-50 bg-white rounded-xl shadow-xl border border-gray-100 p-2 min-w-[160px]">
                                            {LAYOUTS.map(layout => (
                                                <button
                                                    key={layout.key}
                                                    onClick={() => handleLayoutChange(layout.key)}
                                                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-colors ${ANIMATION.hover} ${selectedLayout === layout.key
                                                        ? 'bg-teal-50 text-teal-700 font-medium'
                                                        : 'hover:bg-gray-50 text-gray-700'
                                                        }`}
                                                >
                                                    {layout.icon}
                                                    {layout.label}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Upload button */}
                        <button
                            onClick={onUploadPhoto}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-colors ${ANIMATION.hover} active:scale-[0.98]`}
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Įkelti
                        </button>

                        {/* Manage mode toggle */}
                        {photos.length > 0 && !editMode && (
                            <button
                                onClick={toggleEditMode}
                                className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium bg-white/80 text-gray-600 hover:bg-white transition-colors ${ANIMATION.hover}`}
                            >
                                <Edit3 className="w-3.5 h-3.5" />
                                Tvarkyti
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Photo Grid */}
            <div className="p-4">
                {photos.length === 0 ? (
                    // Empty state
                    <div className="flex flex-col items-center justify-center py-12">
                        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                            <Camera className="w-8 h-8 text-gray-400" />
                        </div>
                        <h4 className="text-gray-700 font-semibold mb-1">Nėra nuotraukų</h4>
                        <p className="text-sm text-gray-500 mb-6 text-center max-w-xs">
                            Pridėkite bent 3 nuotraukas, kad būstas atrodytų patraukliai potencialiems nuomininkams
                        </p>
                        <button
                            onClick={onUploadPhoto}
                            className={`flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors ${ANIMATION.hover} active:scale-[0.98] font-semibold`}
                        >
                            <Plus className="w-5 h-5" />
                            Įkelti nuotraukas
                        </button>
                    </div>
                ) : (() => {
                    const maxVisible = currentLayout.maxPhotos;
                    const visiblePhotos = editMode ? photos : photos.slice(0, maxVisible);
                    const remainingCount = photos.length - maxVisible;
                    const showMoreOverlay = !editMode && remainingCount > 0;

                    return (
                        <div className={editMode
                            ? 'grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 auto-rows-[80px]'
                            : `${CONTAINER_CLASS} ${currentLayout.gridClass} gap-1.5 overflow-hidden [&>*]:min-h-0`}>
                            {visiblePhotos.map((photo, idx) => {
                                const itemClass = editMode ? '' : currentLayout.getItemClass(idx);
                                const isLastVisible = idx === maxVisible - 1 && showMoreOverlay;

                                return (
                                    <div
                                        key={`${photo}-${idx}`}
                                        className={`relative min-h-0 overflow-hidden ${itemClass}`}
                                    >
                                        <PhotoItem
                                            photo={photo}
                                            index={idx}
                                            isCover={idx === 0}
                                            isBentoHero={false}
                                            editMode={editMode}
                                            isSelected={selectedPhotos.has(idx)}
                                            isDragging={draggedIndex === idx}
                                            isDragOver={dragOverIndex === idx && draggedIndex !== idx}
                                            onSelect={() => togglePhotoSelection(idx)}
                                            onDelete={() => onDeletePhoto?.(idx)}
                                            onSetCover={() => { }}
                                            onClick={() => openLightbox(idx)}
                                            onDragStart={(e) => handleDragStart(e, idx)}
                                            onDragOver={(e) => handleDragOver(e, idx)}
                                            onDrop={() => handleDrop(idx)}
                                            onDragEnd={handleDragEnd}
                                        />
                                        {/* +X overlay on last visible photo */}
                                        {isLastVisible && (
                                            <div
                                                className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center cursor-pointer hover:bg-black/70 transition-colors duration-150"
                                                onClick={() => openLightbox(idx)}
                                            >
                                                <span className="text-white text-2xl font-bold">+{remainingCount}</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Fill empty slots with add photo tiles */}
                            {!editMode && photos.length < maxVisible &&
                                Array.from({ length: maxVisible - photos.length }).map((_, i) => (
                                    <button
                                        key={`add-${i}`}
                                        onClick={onUploadPhoto}
                                        className="rounded-lg border-2 border-dashed border-gray-200 bg-white/60 flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-teal-400 hover:text-teal-600 hover:bg-teal-50/50 transition-colors duration-150"
                                    >
                                        <Plus className="w-5 h-5" />
                                        <span className="text-xs font-medium">Pridėti</span>
                                    </button>
                                ))
                            }
                        </div>
                    );
                })()}
            </div>

            {/* Manage Mode Toolbar */}
            {editMode && (
                <ManageToolbar
                    selectedCount={selectedPhotos.size}
                    onSetCover={handleSetCoverSelected}
                    onDelete={handleDeleteSelected}
                    onDone={toggleEditMode}
                    canSetCover={selectedPhotos.size === 1 && !selectedPhotos.has(0)}
                />
            )}

            {/* Lightbox Modal */}
            {lightboxOpen && (
                <div
                    className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
                    onClick={closeLightbox}
                    onWheel={handleWheel}
                >
                    <button
                        onClick={closeLightbox}
                        className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white z-10 transition-colors duration-150"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    {photos.length > 1 && (
                        <>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setLightboxIndex(i => i > 0 ? i - 1 : photos.length - 1);
                                    setZoomLevel(1);
                                    setPanPosition({ x: 0, y: 0 });
                                }}
                                className="absolute left-4 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors duration-150"
                            >
                                <ChevronLeft className="w-6 h-6" />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setLightboxIndex(i => i < photos.length - 1 ? i + 1 : 0);
                                    setZoomLevel(1);
                                    setPanPosition({ x: 0, y: 0 });
                                }}
                                className="absolute right-4 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors duration-150"
                            >
                                <ChevronRight className="w-6 h-6" />
                            </button>
                        </>
                    )}

                    <div className="absolute top-4 left-4 px-3 py-1.5 bg-white/10 rounded-lg text-white text-sm">
                        {lightboxIndex + 1} / {photos.length}
                    </div>

                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-white/10 rounded-lg text-white text-sm">
                        {Math.round(zoomLevel * 100)}%
                    </div>

                    {/* Image container with panning support */}
                    <div
                        ref={imageContainerRef}
                        className="relative flex items-center justify-center"
                        onMouseDown={handlePanStart}
                        onMouseMove={handlePanMove}
                        onMouseUp={handlePanEnd}
                        onMouseLeave={handlePanEnd}
                        onClick={(e) => e.stopPropagation()}
                        style={{ touchAction: 'none' }}
                    >
                        <img
                            src={photos[lightboxIndex]}
                            alt={`Nuotrauka ${lightboxIndex + 1}`}
                            className={`max-w-[90vw] max-h-[90vh] object-contain select-none ${isPanning ? '' : `transition-transform ${ANIMATION.modal}`}`}
                            style={{
                                transform: `scale(${zoomLevel}) translate(${panPosition.x / zoomLevel}px, ${panPosition.y / zoomLevel}px)`,
                                cursor: zoomLevel > 1 ? (isPanning ? 'grabbing' : 'grab') : 'zoom-in'
                            }}
                            onClick={handleImageClick}
                            draggable={false}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default PhotoGallerySection;
