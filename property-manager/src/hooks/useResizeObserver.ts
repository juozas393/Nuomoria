import { useLayoutEffect, useRef, useState } from "react";

/**
 * Hook for observing element size changes
 * Essential for charts that need to recalculate when becoming visible
 */
export function useResizeObserver<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    
    const update = () => setSize({ width: el.offsetWidth, height: el.offsetHeight });
    update();
    
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return { ref, size };
}
