import { useEffect, useRef, useState } from "react";

/**
 * Hook for detecting when an element comes into view using IntersectionObserver
 * Optimized for performance with proper cleanup and early returns
 */
export function useInView<T extends HTMLElement>(rootMargin = "200px") {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    // Early return if element is already in view or ref is not set
    if (!ref.current || inView) return;

    const element = ref.current;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          // Disconnect immediately after first intersection to save resources
          observer.disconnect();
        }
      },
      { 
        rootMargin,
        // Only trigger when 50% of element is visible for better UX
        threshold: 0.5
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [inView, rootMargin]);

  return { ref, inView };
}
