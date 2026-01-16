// Performance testing utilities
export const performanceTest = {
  // Test initial load time
  measureInitialLoad: () => {
    const startTime = performance.now();
    return {
      end: () => {
        const endTime = performance.now();
        const loadTime = endTime - startTime;
        console.log(`🚀 Initial load time: ${loadTime.toFixed(2)}ms`);
        return loadTime;
      }
    };
  },

  // Test component render time
  measureRender: (componentName: string) => {
    const startTime = performance.now();
    return {
      end: () => {
        const endTime = performance.now();
        const renderTime = endTime - startTime;
        console.log(`⚡ ${componentName} render time: ${renderTime.toFixed(2)}ms`);
        
        if (renderTime > 16) {
          console.warn(`⚠️ Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`);
        }
        
        return renderTime;
      }
    };
  },

  // Test memory usage
  measureMemory: () => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      console.log(`📊 Memory usage: ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`);
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit
      };
    }
    return null;
  },

  // Test bundle size (development only)
  measureBundleSize: () => {
    if (process.env.NODE_ENV === 'development') {
      const scripts = document.querySelectorAll('script[src]');
      let totalSize = 0;
      
      scripts.forEach(script => {
        const src = script.getAttribute('src');
        if (src && src.includes('static/js/')) {
          // This is a rough estimate - actual size would need to be measured differently
          console.log(`📦 Script loaded: ${src}`);
        }
      });
    }
  }
};

export default performanceTest;


































