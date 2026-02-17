import React, { memo, useState, useCallback, useEffect, useRef } from 'react';
import { Camera, Upload, ChevronLeft, ChevronRight, X, Star, Trash2, GripVertical } from 'lucide-react';
import { CardPatternOverlay } from '../../ui/CardPatternOverlay';

// =============================================================================
// TYPES
// =============================================================================

interface PhotosCardLargeProps {
    photos: string[];
    onUpload?: () => void;
    onManage?: () => void;
    onDeletePhoto?: (index: number) => void;
    onReorderPhotos?: (photos: string[]) => void;
    onSetCover?: (index: number) => void;
}

// =============================================================================
// LIGHTBOX COMPONENT
// =============================================================================

interface LightboxProps {
    photos: string[];
    currentIndex: number;
    onClose: () => void;
    onPrev: () => void;
    onNext: () => void;
    onDelete?: (index: number) => void;
    onSetCover?: (index: number) => void;
}

const Lightbox = memo<LightboxProps>(({
    photos,
    currentIndex,
    onClose,
    onPrev,
    onNext,
    onDelete,
    onSetCover,
}) => {
    const isCover = currentIndex === 0;

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            else if (e.key === 'ArrowLeft') onPrev();
            else if (e.key === 'ArrowRight') onNext();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, onPrev, onNext]);

    return (
        <div
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
            onClick={onClose}
        >
            {/* Close button */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white z-10 transition-colors duration-150"
            >
                <X className="w-6 h-6" />
            </button>

            {/* Counter */}
            <div className="absolute top-4 left-4 px-3 py-1.5 bg-white/10 rounded-lg text-white text-sm">
                {currentIndex + 1} / {photos.length}
            </div>

            {/* Action buttons */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
                {onSetCover && !isCover && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onSetCover(currentIndex); }}
                        className="flex items-center gap-1.5 px-3 py-2 bg-amber-500/90 hover:bg-amber-500 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                        <Star className="w-4 h-4" />
                        Nustatyti viršeliu
                    </button>
                )}
                {isCover && (
                    <span className="flex items-center gap-1.5 px-3 py-2 bg-amber-500/80 text-white text-sm font-medium rounded-lg">
                        <Star className="w-4 h-4" />
                        Viršelis
                    </span>
                )}
                {onDelete && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(currentIndex); }}
                        className="flex items-center gap-1.5 px-3 py-2 bg-red-500/90 hover:bg-red-500 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                        Ištrinti
                    </button>
                )}
            </div>

            {/* Navigation */}
            {photos.length > 1 && (
                <>
                    <button
                        onClick={(e) => { e.stopPropagation(); onPrev(); }}
                        className="absolute left-4 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors duration-150"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onNext(); }}
                        className="absolute right-4 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors duration-150"
                    >
                        <ChevronRight className="w-6 h-6" />
                    </button>
                </>
            )}

            {/* Image */}
            <img
                src={photos[currentIndex]}
                alt={`Nuotrauka ${currentIndex + 1}`}
                className="max-w-[90vw] max-h-[85vh] object-contain select-none"
                onClick={(e) => e.stopPropagation()}
                draggable={false}
            />
        </div>
    );
});
Lightbox.displayName = 'Lightbox';

// =============================================================================
// COMPONENT - COMPACT SPACING
// =============================================================================

export const PhotosCardLarge = memo<PhotosCardLargeProps>(({
    photos,
    onUpload,
    onManage,
    onDeletePhoto,
    onReorderPhotos,
    onSetCover,
}) => {
    const count = photos.length;
    const mainPhoto = photos[0];
    const isEmpty = count === 0;

    // Lightbox state
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);

    // Drag-and-drop state
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    const openLightbox = useCallback((index: number) => {
        setLightboxIndex(index);
        setLightboxOpen(true);
    }, []);

    const closeLightbox = useCallback(() => {
        setLightboxOpen(false);
    }, []);

    const goToPrev = useCallback(() => {
        setLightboxIndex(i => i > 0 ? i - 1 : photos.length - 1);
    }, [photos.length]);

    const goToNext = useCallback(() => {
        setLightboxIndex(i => i < photos.length - 1 ? i + 1 : 0);
    }, [photos.length]);

    const handleLightboxDelete = useCallback((index: number) => {
        if (!onDeletePhoto) return;
        onDeletePhoto(index);
        // Adjust lightbox index after deletion
        if (photos.length <= 1) {
            closeLightbox();
        } else if (index >= photos.length - 1) {
            setLightboxIndex(Math.max(0, photos.length - 2));
        }
    }, [onDeletePhoto, photos.length, closeLightbox]);

    const handleSetCover = useCallback((index: number) => {
        if (onSetCover) {
            onSetCover(index);
        } else if (onReorderPhotos) {
            // Fallback: move photo to first position
            const newPhotos = [...photos];
            const [photo] = newPhotos.splice(index, 1);
            newPhotos.unshift(photo);
            onReorderPhotos(newPhotos);
        }
        setLightboxIndex(0);
    }, [onSetCover, onReorderPhotos, photos]);

    // Drag handlers for reordering
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

    const canDrag = !!onReorderPhotos;

    return (
        <div className="relative bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden h-full flex flex-col">
            <CardPatternOverlay />

            {/* COMPACT: p-2.5 instead of p-4 */}
            <div className="relative p-2.5 flex flex-col h-full">
                {/* Header - COMPACT */}
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-primary-light rounded-lg flex items-center justify-center">
                            <Camera className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <div>
                            <span className="text-xs font-bold text-gray-900">Nuotraukos</span>
                            <span className="text-[10px] text-gray-500 ml-1.5">{count} nuotraukos</span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-0.5">
                        <button
                            onClick={onUpload}
                            className="flex items-center gap-1 px-1.5 py-1 text-[10px] text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded transition-colors"
                        >
                            <Upload className="w-3 h-3" />
                            Įkelti
                        </button>
                        {count > 0 && onManage && (
                            <button
                                onClick={onManage}
                                className="flex items-center gap-1 px-1.5 py-1 text-[10px] text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded transition-colors"
                            >
                                <GripVertical className="w-3 h-3" />
                                Tvarkyti
                            </button>
                        )}
                    </div>
                </div>

                {/* Photo grid - fills remaining space */}
                <div className="flex-1 min-h-0 overflow-hidden">
                    {isEmpty ? (
                        /* Empty state - COMPACT */
                        <div className="flex items-center justify-center h-full min-h-[100px] bg-gray-50 rounded-lg border border-dashed border-gray-200">
                            <div className="text-center">
                                <Camera className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                <p className="text-sm text-gray-500 mb-2">Nėra nuotraukų</p>
                                <button
                                    onClick={onUpload}
                                    className="h-8 px-4 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors"
                                >
                                    Įkelti nuotraukas
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* Gallery layout matching Būstas tab bento - scales with card size */
                        <div className="grid grid-cols-3 grid-rows-[1fr_1fr_0.7fr] gap-1.5 h-full [&>*]:min-h-0">
                            {/* Main/Cover photo - hero top-left */}
                            <div
                                className={`relative col-span-2 row-span-2 rounded-xl overflow-hidden bg-gray-100 cursor-pointer group
                                    ${dragOverIndex === 0 && draggedIndex !== 0 ? 'ring-2 ring-teal-500/40' : ''}
                                    ${draggedIndex === 0 ? 'opacity-50 scale-95' : ''}
                                `}
                                draggable={canDrag}
                                onDragStart={(e) => handleDragStart(e, 0)}
                                onDragOver={(e) => handleDragOver(e, 0)}
                                onDrop={() => handleDrop(0)}
                                onDragEnd={handleDragEnd}
                                onClick={() => openLightbox(0)}
                            >
                                <img
                                    src={mainPhoto}
                                    alt="Viršelis"
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-teal-500 text-white text-[10px] font-bold uppercase rounded shadow-sm">
                                    Viršelis
                                </span>
                                {canDrag && (
                                    <div className="absolute top-2 right-2 w-5 h-5 bg-white/80 backdrop-blur-sm rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <GripVertical className="w-3 h-3 text-gray-500" />
                                    </div>
                                )}
                            </div>

                            {/* 5 Thumbnails - 2 right + 3 bottom */}
                            {[0, 1, 2, 3, 4].map((idx) => {
                                const photo = photos[idx + 1];
                                const actualIndex = idx + 1;
                                const isLast = idx === 4 && count > 6;
                                const overflowCount = count - 6;

                                return (
                                    <div
                                        key={idx}
                                        className={`relative rounded-lg overflow-hidden min-h-0 group ${photo
                                            ? `bg-gray-100 cursor-pointer ${dragOverIndex === actualIndex && draggedIndex !== actualIndex ? 'ring-2 ring-teal-500/40' : ''} ${draggedIndex === actualIndex ? 'opacity-50 scale-95' : ''}`
                                            : 'bg-gray-50 border-2 border-dashed border-gray-200 cursor-pointer'
                                            }`}
                                        draggable={photo && canDrag ? true : false}
                                        onDragStart={photo ? (e) => handleDragStart(e, actualIndex) : undefined}
                                        onDragOver={photo ? (e) => handleDragOver(e, actualIndex) : undefined}
                                        onDrop={photo ? () => handleDrop(actualIndex) : undefined}
                                        onDragEnd={photo ? handleDragEnd : undefined}
                                        onClick={photo ? () => openLightbox(actualIndex) : onUpload}
                                    >
                                        {photo ? (
                                            <>
                                                <img
                                                    src={photo}
                                                    alt={`Nuotrauka ${idx + 2}`}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                />
                                                {isLast && overflowCount > 0 && (
                                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-[1px]">
                                                        <span className="text-white text-lg font-bold">+{overflowCount}</span>
                                                    </div>
                                                )}
                                                {canDrag && !isLast && (
                                                    <div className="absolute top-1 right-1 w-4 h-4 bg-white/80 backdrop-blur-sm rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <GripVertical className="w-3 h-3 text-gray-500" />
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <Camera className="w-4 h-4 text-gray-300 group-hover:text-teal-400 transition-colors" />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Lightbox */}
            {lightboxOpen && photos.length > 0 && (
                <Lightbox
                    photos={photos}
                    currentIndex={lightboxIndex}
                    onClose={closeLightbox}
                    onPrev={goToPrev}
                    onNext={goToNext}
                    onDelete={onDeletePhoto ? handleLightboxDelete : undefined}
                    onSetCover={(onSetCover || onReorderPhotos) ? handleSetCover : undefined}
                />
            )}
        </div>
    );
});

PhotosCardLarge.displayName = 'PhotosCardLarge';

export default PhotosCardLarge;
