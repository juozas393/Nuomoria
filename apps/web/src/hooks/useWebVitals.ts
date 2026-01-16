import { useEffect } from 'react';

interface WebVitalsMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
}

/**
 * Web Vitals monitoring hook following ultimate_performance_rules
 * Tracks LCP, FID, CLS automatically
 */
export const useWebVitals = (enabled: boolean = process.env.NODE_ENV === 'development') => {
  useEffect(() => {
    if (!enabled) return;

    const trackMetric = (metric: WebVitalsMetric) => {
      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        const emoji = metric.rating === 'good' ? '✅' : metric.rating === 'needs-improvement' ? '⚠️' : '❌';
        console.log(`${emoji} ${metric.name}: ${metric.value.toFixed(2)}ms (${metric.rating})`);
      }

      // In production, send to analytics
      if (process.env.NODE_ENV === 'production') {
        // Send to your analytics service
        // gtag('event', metric.name, { value: metric.value });
      }
    };

    // Track Web Vitals using native APIs
    const trackLCP = () => {
      if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          
          trackMetric({
            name: 'LCP',
            value: lastEntry.startTime,
            rating: lastEntry.startTime < 1500 ? 'good' : lastEntry.startTime < 2500 ? 'needs-improvement' : 'poor'
          });
        });
        
        observer.observe({ type: 'largest-contentful-paint', buffered: true });
        return () => observer.disconnect();
      }
    };

    const trackFID = () => {
      if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            trackMetric({
              name: 'FID',
              value: entry.processingStart - entry.startTime,
              rating: entry.processingStart - entry.startTime < 100 ? 'good' : 
                     entry.processingStart - entry.startTime < 300 ? 'needs-improvement' : 'poor'
            });
          });
        });
        
        observer.observe({ type: 'first-input', buffered: true });
        return () => observer.disconnect();
      }
    };

    const trackCLS = () => {
      if ('PerformanceObserver' in window) {
        let clsValue = 0;
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });
          
          trackMetric({
            name: 'CLS',
            value: clsValue,
            rating: clsValue < 0.1 ? 'good' : clsValue < 0.25 ? 'needs-improvement' : 'poor'
          });
        });
        
        observer.observe({ type: 'layout-shift', buffered: true });
        return () => observer.disconnect();
      }
    };

    // Initialize tracking
    const cleanupFunctions = [
      trackLCP(),
      trackFID(), 
      trackCLS()
    ].filter(Boolean) as Array<() => void>;

    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [enabled]);
};
