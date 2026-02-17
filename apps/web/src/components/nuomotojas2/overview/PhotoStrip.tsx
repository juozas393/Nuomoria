import React, { memo, useState, useCallback } from 'react';
import { Camera, Upload, Eye, ImagePlus, Image } from 'lucide-react';

// ============================================================================
// CONSTANTS - Standardized animation timings
// ============================================================================
const ANIMATION = {
    hover: 'duration-150 ease-out',      // 150ms for hover
    press: 'duration-100 ease-out',      // 100ms for press/active
    modal: 'duration-200 ease-out',      // 200ms for modals/drawers
} as const;

const cardStyle = {
    backgroundImage: `url('/images/CardsBackground.webp')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
};

// ============================================================================
// TYPES
// ============================================================================
interface PhotoStripProps {
    photos: string[];
    maxVisible?: number;
    onViewAll?: () => void;
    onUpload?: () => void;
    onSetCover?: (index: number) => void;
    isLoading?: boolean;
}

// ============================================================================
// SKELETON COMPONENT
// ============================================================================
const PhotoSkeleton = memo(() => (
    <div className="animate-pulse">
        <div className="grid grid-cols-5 gap-2">
            <div className="col-span-2 aspect-[4/3] rounded-xl bg-gray-200" />
            <div className="aspect-[4/3] rounded-lg bg-gray-200" />
            <div className="aspect-[4/3] rounded-lg bg-gray-200" />
            <div className="aspect-[4/3] rounded-lg bg-gray-200" />
        </div>
    </div>
));
PhotoSkeleton.displayName = 'PhotoSkeleton';

// ============================================================================
// THUMBNAIL COMPONENT (memoized)
// ============================================================================
interface ThumbnailProps {
    src: string;
    alt: string;
    isCover?: boolean;
    showOverlay?: boolean;
    overlayText?: string;
    onClick?: () => void;
    priority?: boolean;
}

const Thumbnail = memo<ThumbnailProps>(({
    src,
    alt,
    isCover = false,
    showOverlay = false,
    overlayText,
    onClick,
    priority = false,
}) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);

    const handleLoad = useCallback(() => setIsLoaded(true), []);
    const handleError = useCallback(() => setHasError(true), []);

    if (hasError) return null;

    return (
        <div
            className={`relative overflow-hidden cursor-pointer group ${isCover ? 'col-span-2 aspect-[4/3] rounded-xl' : 'aspect-[4/3] rounded-lg'
                }`}
            onClick={onClick}
        >
            {/* Skeleton while loading */}
            {!isLoaded && (
                <div className="absolute inset-0 bg-gray-200 animate-pulse" />
            )}

            {/* Image with optimized loading */}
            <img
                src={src}
                alt={alt}
                loading={priority ? 'eager' : 'lazy'}
                decoding="async"
                onLoad={handleLoad}
                onError={handleError}
                className={`w-full h-full object-cover transition-transform ${ANIMATION.hover} group-hover:scale-105 ${isLoaded ? 'opacity-100' : 'opacity-0'
                    }`}
            />

            {/* Hover overlay - using opacity only for performance */}
            <div className={`absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors ${ANIMATION.hover}`} />

            {/* Cover badge */}
            {isCover && isLoaded && (
                <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 rounded-md text-[10px] text-white font-medium backdrop-blur-sm">
                    Viršelis
                </div>
            )}

            {/* Remaining count overlay */}
            {showOverlay && overlayText && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-[1px]">
                    <span className="text-white font-bold text-lg">{overlayText}</span>
                </div>
            )}
        </div>
    );
});
Thumbnail.displayName = 'Thumbnail';

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export const PhotoStrip = memo<PhotoStripProps>(({
    photos = [],
    maxVisible = 4,
    onViewAll,
    onUpload,
    isLoading = false,
}) => {
    const validPhotos = photos.filter((p) => p && typeof p === 'string' && p.startsWith('http'));
    const coverPhoto = validPhotos[0];
    const thumbnails = validPhotos.slice(1, maxVisible);
    const remainingCount = Math.max(0, validPhotos.length - maxVisible);
    const hasPhotos = validPhotos.length > 0;

    // Loading state
    if (isLoading) {
        return (
            <div className="rounded-2xl border border-gray-100 p-5" style={cardStyle}>
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 animate-pulse" />
                    <div className="space-y-2">
                        <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
                        <div className="h-3 w-32 bg-gray-100 rounded animate-pulse" />
                    </div>
                </div>
                <PhotoSkeleton />
            </div>
        );
    }

    // Empty state
    if (!hasPhotos) {
        return (
            <div className="rounded-2xl border border-gray-100 p-5" style={cardStyle}>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/80 backdrop-blur-sm flex items-center justify-center">
                            <Camera className="w-5 h-5 text-gray-400" />
                        </div>
                        <div>
                            <h3 className="text-[15px] font-semibold text-gray-900">Nuotraukos</h3>
                            <p className="text-[13px] text-gray-400">Nėra įkeltų nuotraukų</p>
                        </div>
                    </div>
                    {onUpload && (
                        <button
                            onClick={onUpload}
                            className={`inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 active:scale-[0.98] text-white text-[13px] font-semibold rounded-xl transition-colors ${ANIMATION.hover}`}
                        >
                            <Upload className="w-4 h-4" />
                            Įkelti nuotraukas
                        </button>
                    )}
                </div>

                {/* Empty placeholder grid */}
                <div className="grid grid-cols-5 gap-2">
                    <div
                        className={`col-span-2 aspect-[4/3] rounded-xl bg-white/60 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-white/80 hover:border-gray-300 transition-colors ${ANIMATION.hover}`}
                        onClick={onUpload}
                    >
                        <Image className="w-8 h-8 text-gray-300 mb-2" />
                        <span className="text-[12px] text-gray-400 font-medium">Viršelis</span>
                    </div>
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className={`aspect-[4/3] rounded-lg bg-white/60 border-2 border-dashed border-gray-200 flex items-center justify-center cursor-pointer hover:bg-white/80 hover:border-gray-300 transition-colors ${ANIMATION.hover}`}
                            onClick={onUpload}
                        >
                            <ImagePlus className="w-5 h-5 text-gray-300" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // Gallery with photos
    return (
        <div className="rounded-2xl border border-gray-100 p-5" style={cardStyle}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
                        <Camera className="w-5 h-5 text-teal-600" />
                    </div>
                    <div>
                        <h3 className="text-[15px] font-semibold text-gray-900">Nuotraukos</h3>
                        <p className="text-[13px] text-gray-500">
                            {validPhotos.length} nuotrauk{validPhotos.length === 1 ? 'a' : 'os'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {onUpload && (
                        <button
                            onClick={onUpload}
                            className={`inline-flex items-center gap-1.5 px-3 py-2 text-gray-600 hover:text-gray-900 text-[13px] font-medium rounded-lg hover:bg-white/80 active:scale-[0.98] transition-colors ${ANIMATION.hover}`}
                        >
                            <Upload className="w-4 h-4" />
                            Įkelti
                        </button>
                    )}
                    {onViewAll && (
                        <button
                            onClick={onViewAll}
                            className={`inline-flex items-center gap-1.5 px-3 py-2 bg-white/80 hover:bg-white text-gray-700 text-[13px] font-medium rounded-lg active:scale-[0.98] transition-colors ${ANIMATION.hover}`}
                        >
                            <Eye className="w-4 h-4" />
                            Peržiūrėti
                        </button>
                    )}
                </div>
            </div>

            {/* Gallery grid */}
            <div className="grid grid-cols-5 gap-2">
                {/* Cover image - priority loaded */}
                <Thumbnail
                    src={coverPhoto}
                    alt="Viršelis"
                    isCover={true}
                    priority={true}
                    onClick={onViewAll}
                />

                {/* Thumbnails - lazy loaded */}
                {thumbnails.map((photo, idx) => (
                    <Thumbnail
                        key={idx}
                        src={photo}
                        alt={`Nuotrauka ${idx + 2}`}
                        onClick={onViewAll}
                    />
                ))}

                {/* Remaining count OR add placeholder */}
                {remainingCount > 0 ? (
                    <div
                        className={`aspect-[4/3] rounded-lg bg-white/80 flex items-center justify-center cursor-pointer hover:bg-white transition-colors ${ANIMATION.hover}`}
                        onClick={onViewAll}
                    >
                        <span className="text-gray-600 font-bold text-lg">+{remainingCount}</span>
                    </div>
                ) : thumbnails.length < 3 ? (
                    <div
                        className={`aspect-[4/3] rounded-lg bg-white/60 border-2 border-dashed border-gray-200 flex items-center justify-center cursor-pointer hover:bg-white/80 hover:border-gray-300 transition-colors ${ANIMATION.hover}`}
                        onClick={onUpload}
                    >
                        <ImagePlus className="w-5 h-5 text-gray-300" />
                    </div>
                ) : null}
            </div>
        </div>
    );
});

PhotoStrip.displayName = 'PhotoStrip';

export default PhotoStrip;
