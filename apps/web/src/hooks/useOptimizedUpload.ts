/**
 * Optimized Image Upload Hook
 * 
 * - Validates and optimizes images before upload
 * - Uploads full + thumb variants to Supabase
 * - Tracks progress
 * - Inserts metadata to DB
 */

import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
    optimizeImage,
    validateImage,
    generateStoragePath,
    type OptimizedImage,
    type OptimizeOptions
} from '../utils/imageOptimizer';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface UploadedPhoto {
    id: string;
    propertyId: string;
    fullUrl: string;
    thumbUrl: string;
    fullWidth: number;
    fullHeight: number;
    fullBytes: number;
    thumbBytes: number;
    mime: string;
    orderIndex: number;
    createdAt: string;
}

export interface UploadProgress {
    current: number;
    total: number;
    currentFile: string;
    phase: 'validating' | 'optimizing' | 'uploading' | 'saving' | 'done';
    percentage: number;
}

export interface UploadError {
    file: string;
    error: string;
}

interface UseOptimizedUploadReturn {
    uploadPhotos: (files: File[], propertyId: string) => Promise<UploadedPhoto[]>;
    isUploading: boolean;
    progress: UploadProgress | null;
    errors: UploadError[];
    reset: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const BUCKET_NAME = 'property-photos';
const MAX_CONCURRENT_UPLOADS = 3;
const MAX_PHOTOS_PER_PROPERTY = 20;

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export function useOptimizedUpload(
    options: OptimizeOptions = {}
): UseOptimizedUploadReturn {
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState<UploadProgress | null>(null);
    const [errors, setErrors] = useState<UploadError[]>([]);

    const reset = useCallback(() => {
        setIsUploading(false);
        setProgress(null);
        setErrors([]);
    }, []);

    const uploadPhotos = useCallback(async (
        files: File[],
        propertyId: string
    ): Promise<UploadedPhoto[]> => {
        if (files.length === 0) return [];

        // Check max photos limit
        if (files.length > MAX_PHOTOS_PER_PROPERTY) {
            setErrors([{
                file: 'all',
                error: `Maksimumas ${MAX_PHOTOS_PER_PROPERTY} nuotraukų vienu metu`
            }]);
            return [];
        }

        setIsUploading(true);
        setErrors([]);
        const uploadedPhotos: UploadedPhoto[] = [];
        const uploadErrors: UploadError[] = [];

        try {
            // ═══════════════════════════════════════════════════════════════════════
            // PHASE 1: Validate all files
            // ═══════════════════════════════════════════════════════════════════════
            setProgress({
                current: 0,
                total: files.length,
                currentFile: 'Tikrinama...',
                phase: 'validating',
                percentage: 0,
            });

            const validFiles: File[] = [];
            for (const file of files) {
                const validation = validateImage(file);
                if (!validation.valid) {
                    uploadErrors.push({ file: file.name, error: validation.error! });
                } else {
                    validFiles.push(file);
                }
            }

            if (validFiles.length === 0) {
                setErrors(uploadErrors);
                setIsUploading(false);
                return [];
            }

            // ═══════════════════════════════════════════════════════════════════════
            // PHASE 2: Optimize images (with concurrency)
            // ═══════════════════════════════════════════════════════════════════════
            const optimizedImages: { file: File; optimized: OptimizedImage }[] = [];

            for (let i = 0; i < validFiles.length; i += MAX_CONCURRENT_UPLOADS) {
                const batch = validFiles.slice(i, i + MAX_CONCURRENT_UPLOADS);

                const batchResults = await Promise.allSettled(
                    batch.map(async (file) => {
                        setProgress({
                            current: optimizedImages.length + 1,
                            total: validFiles.length,
                            currentFile: file.name,
                            phase: 'optimizing',
                            percentage: Math.round(((optimizedImages.length + 1) / validFiles.length) * 33),
                        });

                        const optimized = await optimizeImage(file, options);
                        return { file, optimized };
                    })
                );

                for (let j = 0; j < batchResults.length; j++) {
                    const result = batchResults[j];
                    if (result.status === 'fulfilled') {
                        optimizedImages.push(result.value);
                    } else {
                        uploadErrors.push({
                            file: batch[j].name,
                            error: result.reason?.message || 'Optimizacija nepavyko'
                        });
                    }
                }
            }

            // ═══════════════════════════════════════════════════════════════════════
            // PHASE 3: Upload to Supabase Storage
            // ═══════════════════════════════════════════════════════════════════════
            for (let i = 0; i < optimizedImages.length; i += MAX_CONCURRENT_UPLOADS) {
                const batch = optimizedImages.slice(i, i + MAX_CONCURRENT_UPLOADS);

                const batchResults = await Promise.allSettled(
                    batch.map(async ({ file, optimized }, batchIndex) => {
                        const globalIndex = i + batchIndex;

                        setProgress({
                            current: globalIndex + 1,
                            total: optimizedImages.length,
                            currentFile: file.name,
                            phase: 'uploading',
                            percentage: 33 + Math.round(((globalIndex + 1) / optimizedImages.length) * 33),
                        });

                        // Generate paths
                        const photoId = crypto.randomUUID();
                        const fullPath = `properties/${propertyId}/full/${photoId}.webp`;
                        const thumbPath = `properties/${propertyId}/thumb/${photoId}.webp`;

                        // Upload full
                        const { error: fullError } = await supabase.storage
                            .from(BUCKET_NAME)
                            .upload(fullPath, optimized.full, {
                                contentType: 'image/webp',
                                cacheControl: 'public, max-age=31536000, immutable',
                            });

                        if (fullError) throw new Error(`Full upload failed: ${fullError.message}`);

                        // Upload thumb
                        const { error: thumbError } = await supabase.storage
                            .from(BUCKET_NAME)
                            .upload(thumbPath, optimized.thumb, {
                                contentType: 'image/webp',
                                cacheControl: 'public, max-age=31536000, immutable',
                            });

                        if (thumbError) {
                            // Cleanup full if thumb fails
                            await supabase.storage.from(BUCKET_NAME).remove([fullPath]);
                            throw new Error(`Thumb upload failed: ${thumbError.message}`);
                        }

                        // Get public URLs
                        const { data: fullUrlData } = supabase.storage
                            .from(BUCKET_NAME)
                            .getPublicUrl(fullPath);

                        const { data: thumbUrlData } = supabase.storage
                            .from(BUCKET_NAME)
                            .getPublicUrl(thumbPath);

                        return {
                            photoId,
                            fullUrl: fullUrlData.publicUrl,
                            thumbUrl: thumbUrlData.publicUrl,
                            meta: optimized.meta,
                        };
                    })
                );

                for (let j = 0; j < batchResults.length; j++) {
                    const result = batchResults[j];
                    if (result.status === 'rejected') {
                        uploadErrors.push({
                            file: batch[j].file.name,
                            error: result.reason?.message || 'Upload nepavyko'
                        });
                    }
                }

                // ═════════════════════════════════════════════════════════════════════
                // PHASE 4: Save to database
                // ═════════════════════════════════════════════════════════════════════
                const successfulUploads = batchResults.filter(
                    (r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled'
                );

                if (successfulUploads.length > 0) {
                    setProgress({
                        current: uploadedPhotos.length + successfulUploads.length,
                        total: optimizedImages.length,
                        currentFile: 'Išsaugoma...',
                        phase: 'saving',
                        percentage: 66 + Math.round(((uploadedPhotos.length + successfulUploads.length) / optimizedImages.length) * 34),
                    });

                    // Get current max order index
                    const { data: existingPhotos } = await supabase
                        .from('property_photos')
                        .select('order_index')
                        .eq('property_id', propertyId)
                        .order('order_index', { ascending: false })
                        .limit(1);

                    const startOrderIndex = (existingPhotos?.[0]?.order_index ?? -1) + 1;

                    // Insert records
                    const insertData = successfulUploads.map((r, idx) => ({
                        id: r.value.photoId,
                        property_id: propertyId,
                        full_url: r.value.fullUrl,
                        thumb_url: r.value.thumbUrl,
                        full_width: r.value.meta.fullWidth,
                        full_height: r.value.meta.fullHeight,
                        full_bytes: r.value.meta.fullSize,
                        thumb_bytes: r.value.meta.thumbSize,
                        mime: r.value.meta.mime,
                        order_index: startOrderIndex + uploadedPhotos.length + idx,
                    }));

                    const { data: insertedRows, error: insertError } = await supabase
                        .from('property_photos')
                        .insert(insertData)
                        .select();

                    if (insertError) {
                        console.error('DB insert error:', insertError);
                        // Photos are uploaded but not in DB - log for manual fix
                        uploadErrors.push({
                            file: 'database',
                            error: 'Nuotraukos įkeltos, bet nepavyko išsaugoti į duomenų bazę'
                        });
                    } else if (insertedRows) {
                        uploadedPhotos.push(...insertedRows.map((row) => ({
                            id: row.id,
                            propertyId: row.property_id,
                            fullUrl: row.full_url,
                            thumbUrl: row.thumb_url,
                            fullWidth: row.full_width,
                            fullHeight: row.full_height,
                            fullBytes: row.full_bytes,
                            thumbBytes: row.thumb_bytes,
                            mime: row.mime,
                            orderIndex: row.order_index,
                            createdAt: row.created_at,
                        })));
                    }
                }
            }

            setProgress({
                current: optimizedImages.length,
                total: optimizedImages.length,
                currentFile: '',
                phase: 'done',
                percentage: 100,
            });

            console.log(`[Upload] Completed: ${uploadedPhotos.length}/${files.length} photos`);

        } catch (error: any) {
            console.error('[Upload] Fatal error:', error);
            uploadErrors.push({ file: 'system', error: error.message || 'Nenumatyta klaida' });
        } finally {
            setIsUploading(false);
            setErrors(uploadErrors);
        }

        return uploadedPhotos;
    }, [options]);

    return {
        uploadPhotos,
        isUploading,
        progress,
        errors,
        reset,
    };
}

export default useOptimizedUpload;
