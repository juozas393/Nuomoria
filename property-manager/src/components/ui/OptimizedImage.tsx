/* eslint-disable react/prop-types */
import React, { useState, useCallback } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  loading?: 'lazy' | 'eager';
  placeholder?: string;
  onLoad?: () => void;
  onError?: () => void;
  // Optional: provide alternative formats if you have them
  avifSrc?: string;
  webpSrc?: string;
  // Set to false if you don't have alternative formats
  useAlternativeFormats?: boolean;
}

/**
 * Optimized image component following ultimate_performance_rules
 * - Lazy loading by default
 * - WebP/AVIF support with fallback
 * - Proper dimensions to prevent layout shift
 * - Loading states and error handling
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = React.memo(({
  src,
  alt,
  className = '',
  width,
  height,
  loading = 'lazy',
  placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PC9zdmc+',
  onLoad,
  onError,
  avifSrc,
  webpSrc,
  useAlternativeFormats = false // Disabled by default since most bundled images won't have alternatives
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  }, [onError]);

  if (hasError) {
    return (
      <div 
        className={`bg-gray-200 flex items-center justify-center ${className}`}
        style={{ width, height }}
      >
        <span className="text-gray-500 text-sm">Image failed to load</span>
      </div>
    );
  }

  // If not using alternative formats, just render a simple img tag
  if (!useAlternativeFormats) {
    return (
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        decoding="async"
        fetchPriority={loading === 'eager' ? 'high' : 'auto'}
        className={`transition-opacity duration-200 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        } ${className}`}
        onLoad={handleLoad}
        onError={handleError}
        style={{
          // Prevent layout shift (CLS)
          aspectRatio: width && height ? `${width}/${height}` : undefined
        }}
      />
    );
  }

  // Use alternative formats if provided or generate from src
  const avifSource = avifSrc || src.replace(/\.[^/.]+$/, '.avif');
  const webpSource = webpSrc || src.replace(/\.[^/.]+$/, '.webp');

  return (
    <picture>
      {/* AVIF format for modern browsers - smallest file size */}
      <source 
        type="image/avif" 
        srcSet={avifSource}
      />
      {/* WebP format for broad browser support - good compression */}
      <source 
        type="image/webp" 
        srcSet={webpSource}
      />
      {/* Fallback to original format */}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        decoding="async"
        fetchPriority={loading === 'eager' ? 'high' : 'auto'}
        className={`transition-opacity duration-200 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        } ${className}`}
        onLoad={handleLoad}
        onError={handleError}
        style={{
          // Prevent layout shift (CLS)
          aspectRatio: width && height ? `${width}/${height}` : undefined
        }}
      />
    </picture>
  );
});

OptimizedImage.displayName = 'OptimizedImage';

export default OptimizedImage;