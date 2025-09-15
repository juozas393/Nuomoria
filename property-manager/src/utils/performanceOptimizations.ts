/**
 * Performance optimization utilities following ultimate_performance_rules
 * - Bundle size optimization
 * - Image optimization
 * - Code splitting helpers
 * - Memory management
 */

// Bundle size optimization
export const bundleOptimizations = {
  // Tree shaking helpers
  importOnly: <T>(module: T, key: keyof T) => module[key],
  
  // Dynamic imports with error handling
  dynamicImport: async (importFunc: () => Promise<any>) => {
    try {
      return await importFunc();
    } catch (error) {
      // Security: Don't log sensitive import errors
      if (process.env.NODE_ENV === 'development') {
        console.error('Dynamic import failed:', error);
      }
      return null;
    }
  },

  // Preload critical resources
  preloadResource: (href: string, as: string = 'script') => {
    if (typeof window === 'undefined') return;
    
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    link.as = as;
    document.head.appendChild(link);
  }
};

// Image optimization utilities
export const imageOptimizations = {
  // Generate responsive image srcSet
  generateSrcSet: (baseSrc: string, sizes: number[] = [320, 640, 1024, 1920]) => {
    const baseName = baseSrc.replace(/\.[^/.]+$/, '');
    return sizes.map(size => `${baseName}-${size}w.webp ${size}w`).join(', ');
  },

  // Lazy loading intersection observer
  createLazyObserver: (callback: (entries: IntersectionObserverEntry[]) => void) => {
    if (typeof window === 'undefined') return null;
    
    return new IntersectionObserver(callback, {
      rootMargin: '50px 0px',
      threshold: 0.1
    });
  },

  // WebP support detection
  supportsWebP: (): Promise<boolean> => {
    return new Promise((resolve) => {
      const webP = new Image();
      webP.onload = webP.onerror = () => {
        resolve(webP.height === 2);
      };
      webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
    });
  }
};

// Memory management utilities
export const memoryOptimizations = {
  // Debounce function for performance
  debounce: <T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): ((...args: Parameters<T>) => void) => {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  },

  // Throttle function for performance
  throttle: <T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): ((...args: Parameters<T>) => void) => {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  // Clean up event listeners
  cleanupEventListeners: (element: Element, events: string[]) => {
    events.forEach(event => {
      element.removeEventListener(event, () => {});
    });
  },

  // WeakMap for memory-efficient caching
  createWeakCache: <K extends object, V>() => new WeakMap<K, V>()
};

// Code splitting helpers
export const codeSplittingHelpers = {
  // Route-based code splitting
  createRouteLoader: (importFunc: () => Promise<any>) => {
    return () => importFunc().catch(error => {
      // Security: Don't log sensitive route errors
      if (process.env.NODE_ENV === 'development') {
        console.error('Route loading failed:', error);
      }
      return { default: () => null };
    });
  },

  // Component preloading
  preloadComponent: (importFunc: () => Promise<any>) => {
    const componentPromise = importFunc();
    return componentPromise;
  },

  // Chunk optimization
  optimizeChunks: (chunks: string[]) => {
    return chunks.map(chunk => ({
      name: chunk,
      priority: chunk.includes('auth') ? 'high' : 'normal'
    }));
  }
};

// Performance monitoring
export const performanceMonitoring = {
  // Measure function execution time
  measureTime: <T>(name: string, fn: () => T): T => {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    
    if (process.env.NODE_ENV === 'development') {
      // Security: Don't log sensitive performance data
      if (process.env.NODE_ENV === 'development') {
        console.log(`${name} took ${(end - start).toFixed(2)}ms`);
      }
    }
    
    return result;
  },

  // Measure async function execution time
  measureAsyncTime: async <T>(name: string, fn: () => Promise<T>): Promise<T> => {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    
  if (process.env.NODE_ENV === 'development') {
      // Security: Don't log sensitive performance data
      if (process.env.NODE_ENV === 'development') {
        console.log(`${name} took ${(end - start).toFixed(2)}ms`);
      }
    }
    
    return result;
  },

  // Memory usage monitoring
  getMemoryUsage: () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit
      };
    }
    return null;
  }
};

// Core Web Vitals optimization
export const webVitalsOptimizations = {
  // Optimize LCP (Largest Contentful Paint)
  optimizeLCP: () => {
    // Preload critical resources
    const criticalResources = [
      '/src/assets/address.jpg',
      '/src/assets/logocanv.png'
    ];
    
    criticalResources.forEach(resource => {
      bundleOptimizations.preloadResource(resource, 'image');
    });
  },

  // Optimize FID (First Input Delay)
  optimizeFID: () => {
    // Defer non-critical JavaScript
    const scripts = document.querySelectorAll('script[src]');
    scripts.forEach(script => {
      if (!script.hasAttribute('defer') && !script.hasAttribute('async')) {
        script.setAttribute('defer', '');
      }
    });
  },

  // Optimize CLS (Cumulative Layout Shift)
  optimizeCLS: () => {
    // Add dimensions to images
    const images = document.querySelectorAll('img:not([width]):not([height])');
    images.forEach(img => {
      if (!img.getAttribute('width') && !img.getAttribute('height')) {
        img.setAttribute('width', '200');
        img.setAttribute('height', '200');
      }
    });
  }
};

// Initialize performance optimizations
export const initializePerformanceOptimizations = () => {
  if (typeof window !== 'undefined') {
    webVitalsOptimizations.optimizeLCP();
    webVitalsOptimizations.optimizeFID();
    webVitalsOptimizations.optimizeCLS();
  }
};

export default {
  bundleOptimizations,
  imageOptimizations,
  memoryOptimizations,
  codeSplittingHelpers,
  performanceMonitoring,
  webVitalsOptimizations,
  initializePerformanceOptimizations
};