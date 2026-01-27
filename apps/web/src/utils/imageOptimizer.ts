/**
 * Image Optimization Utilities
 * 
 * Production-level image processing:
 * - Auto resize (max 2048px full, 400px thumb)
 * - WebP conversion
 * - EXIF orientation fix
 * - MIME validation
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface OptimizedImage {
    full: Blob;
    thumb: Blob;
    meta: ImageMetadata;
}

export interface ImageMetadata {
    originalSize: number;
    fullSize: number;
    thumbSize: number;
    fullWidth: number;
    fullHeight: number;
    thumbWidth: number;
    thumbHeight: number;
    mime: string;
    compressionRatio: number;
}

export interface OptimizeOptions {
    maxFullSize?: number;      // Max dimension for full (default: 2048)
    maxThumbSize?: number;     // Max dimension for thumb (default: 400)
    fullQuality?: number;      // WebP quality 0-1 (default: 0.85)
    thumbQuality?: number;     // WebP quality 0-1 (default: 0.80)
    maxFileSize?: number;      // Max input file size in bytes (default: 10MB)
}

const DEFAULT_OPTIONS: Required<OptimizeOptions> = {
    maxFullSize: 2048,
    maxThumbSize: 400,
    fullQuality: 0.85,
    thumbQuality: 0.80,
    maxFileSize: 10 * 1024 * 1024, // 10MB
};

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

const ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
];

export function validateImage(file: File): { valid: boolean; error?: string } {
    // Check MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return {
            valid: false,
            error: `Netinkamas failo tipas: ${file.type}. Leidžiami: JPEG, PNG, WebP, HEIC.`
        };
    }

    // Block SVG (XSS risk)
    if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
        return { valid: false, error: 'SVG failai neleidžiami dėl saugumo.' };
    }

    // Check file size
    if (file.size > DEFAULT_OPTIONS.maxFileSize) {
        const sizeMB = (file.size / 1024 / 1024).toFixed(1);
        return {
            valid: false,
            error: `Failas per didelis (${sizeMB}MB). Maksimumas: 10MB.`
        };
    }

    return { valid: true };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXIF ORIENTATION FIX
// ═══════════════════════════════════════════════════════════════════════════════

async function getExifOrientation(file: File): Promise<number> {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const view = new DataView(e.target?.result as ArrayBuffer);

            // Check for JPEG marker
            if (view.getUint16(0, false) !== 0xFFD8) {
                resolve(1);
                return;
            }

            const length = view.byteLength;
            let offset = 2;

            while (offset < length) {
                if (view.getUint16(offset + 2, false) <= 8) {
                    resolve(1);
                    return;
                }

                const marker = view.getUint16(offset, false);
                offset += 2;

                if (marker === 0xFFE1) {
                    // APP1 marker - EXIF data
                    if (view.getUint32(offset + 2, false) !== 0x45786966) {
                        resolve(1);
                        return;
                    }

                    const little = view.getUint16(offset + 8, false) === 0x4949;
                    offset += 8;

                    const tags = view.getUint16(offset + 2, little);
                    offset += 4;

                    for (let i = 0; i < tags; i++) {
                        if (view.getUint16(offset + (i * 12), little) === 0x0112) {
                            resolve(view.getUint16(offset + (i * 12) + 8, little));
                            return;
                        }
                    }
                } else if ((marker & 0xFF00) !== 0xFF00) {
                    break;
                } else {
                    offset += view.getUint16(offset, false);
                }
            }
            resolve(1);
        };
        reader.readAsArrayBuffer(file.slice(0, 65536));
    });
}

function applyExifOrientation(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    orientation: number
): { width: number; height: number } {
    switch (orientation) {
        case 2:
            ctx.transform(-1, 0, 0, 1, width, 0);
            return { width, height };
        case 3:
            ctx.transform(-1, 0, 0, -1, width, height);
            return { width, height };
        case 4:
            ctx.transform(1, 0, 0, -1, 0, height);
            return { width, height };
        case 5:
            ctx.transform(0, 1, 1, 0, 0, 0);
            return { width: height, height: width };
        case 6:
            ctx.transform(0, 1, -1, 0, height, 0);
            return { width: height, height: width };
        case 7:
            ctx.transform(0, -1, -1, 0, height, width);
            return { width: height, height: width };
        case 8:
            ctx.transform(0, -1, 1, 0, 0, width);
            return { width: height, height: width };
        default:
            return { width, height };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// IMAGE LOADING
// ═══════════════════════════════════════════════════════════════════════════════

async function loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Nepavyko užkrauti nuotraukos'));
        img.src = URL.createObjectURL(file);
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESIZE & COMPRESS
// ═══════════════════════════════════════════════════════════════════════════════

async function resizeAndCompress(
    img: HTMLImageElement,
    maxSize: number,
    quality: number,
    orientation: number
): Promise<{ blob: Blob; width: number; height: number }> {
    // Calculate dimensions
    let { width, height } = img;

    // Handle orientation-based dimension swap
    if (orientation >= 5 && orientation <= 8) {
        [width, height] = [height, width];
    }

    // Calculate resize ratio
    const ratio = Math.min(maxSize / Math.max(width, height), 1);
    const targetWidth = Math.round(width * ratio);
    const targetHeight = Math.round(height * ratio);

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context unavailable');

    // Apply EXIF orientation
    if (orientation > 1) {
        // Reset canvas size for rotated images
        if (orientation >= 5 && orientation <= 8) {
            canvas.width = targetHeight;
            canvas.height = targetWidth;
        }
        applyExifOrientation(ctx, targetWidth, targetHeight, orientation);
    }

    // Draw image with high quality
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, 0, 0, targetWidth, targetHeight);

    // Export as WebP
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) {
                    resolve({
                        blob,
                        width: canvas.width,
                        height: canvas.height
                    });
                } else {
                    reject(new Error('Nepavyko konvertuoti nuotraukos'));
                }
            },
            'image/webp',
            quality
        );
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN OPTIMIZATION FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Optimize an image for upload
 * 
 * @param file - Original image file
 * @param options - Optimization options
 * @returns Optimized full + thumbnail blobs with metadata
 */
export async function optimizeImage(
    file: File,
    options: OptimizeOptions = {}
): Promise<OptimizedImage> {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    // Validate
    const validation = validateImage(file);
    if (!validation.valid) {
        throw new Error(validation.error);
    }

    // Load image
    const img = await loadImage(file);

    // Get EXIF orientation
    const orientation = await getExifOrientation(file);

    // Generate full size
    const full = await resizeAndCompress(img, opts.maxFullSize, opts.fullQuality, orientation);

    // Generate thumbnail
    const thumb = await resizeAndCompress(img, opts.maxThumbSize, opts.thumbQuality, orientation);

    // Clean up
    URL.revokeObjectURL(img.src);

    // Calculate metadata
    const meta: ImageMetadata = {
        originalSize: file.size,
        fullSize: full.blob.size,
        thumbSize: thumb.blob.size,
        fullWidth: full.width,
        fullHeight: full.height,
        thumbWidth: thumb.width,
        thumbHeight: thumb.height,
        mime: 'image/webp',
        compressionRatio: Number(((1 - (full.blob.size / file.size)) * 100).toFixed(1)),
    };

    console.log(`[ImageOptimizer] Optimized: ${file.name}`);
    console.log(`  Original: ${(file.size / 1024).toFixed(0)}KB ${img.naturalWidth}x${img.naturalHeight}`);
    console.log(`  Full: ${(full.blob.size / 1024).toFixed(0)}KB ${full.width}x${full.height}`);
    console.log(`  Thumb: ${(thumb.blob.size / 1024).toFixed(0)}KB ${thumb.width}x${thumb.height}`);
    console.log(`  Compression: ${meta.compressionRatio}%`);

    return {
        full: full.blob,
        thumb: thumb.blob,
        meta,
    };
}

/**
 * Batch optimize multiple images with concurrency limit
 */
export async function optimizeImages(
    files: File[],
    options: OptimizeOptions = {},
    concurrency = 3,
    onProgress?: (completed: number, total: number, current: string) => void
): Promise<OptimizedImage[]> {
    const results: OptimizedImage[] = [];
    let completed = 0;

    // Process in batches
    for (let i = 0; i < files.length; i += concurrency) {
        const batch = files.slice(i, i + concurrency);
        const batchResults = await Promise.all(
            batch.map(async (file) => {
                const result = await optimizeImage(file, options);
                completed++;
                onProgress?.(completed, files.length, file.name);
                return result;
            })
        );
        results.push(...batchResults);
    }

    return results;
}

/**
 * Check if image needs optimization
 */
export function needsOptimization(file: File, maxSize = 2048): boolean {
    // Always optimize if over 1.5MB
    if (file.size > 1.5 * 1024 * 1024) return true;

    // Always optimize non-WebP
    if (file.type !== 'image/webp') return true;

    return false;
}

/**
 * Generate a unique filename for storage
 */
export function generateStoragePath(
    propertyId: string,
    variant: 'full' | 'thumb',
    extension = 'webp'
): string {
    const uuid = crypto.randomUUID();
    return `properties/${propertyId}/${variant}/${uuid}.${extension}`;
}
