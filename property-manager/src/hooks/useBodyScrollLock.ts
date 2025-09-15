import { useEffect } from "react";

export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;

    const scrollY = window.scrollY;                // išsaugom kur buvom
    const { style } = document.body;
    const prev = {
      overflow: style.overflow,
      position: style.position,
      top: style.top,
      width: style.width,
    };

    // „tikras" lock'as (veikia ir iOS)
    style.overflow = "hidden";
    style.position = "fixed";
    style.top = `-${scrollY}px`;
    style.width = "100%";

    return () => {
      // atkuriam viską
      style.overflow = prev.overflow;
      style.position = prev.position;
      style.top = prev.top;
      style.width = prev.width;
      window.scrollTo(0, scrollY);
    };
  }, [active]);
}
