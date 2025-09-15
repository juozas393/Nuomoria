// GitHub-style smooth scrolling utility
export const smoothScrollTo = (
  target: HTMLElement | string,
  options: {
    duration?: number;
    offset?: number;
    easing?: 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out';
  } = {}
) => {
  const {
    duration = 800,
    offset = 0,
    easing = 'ease-out'
  } = options;

  const targetElement = typeof target === 'string' 
    ? document.querySelector(target) as HTMLElement
    : target;

  if (!targetElement) {
    console.warn('Target element not found for smooth scroll');
    return;
  }

  // Use programmatic scroll for better performance
  const targetPosition = targetElement.offsetTop - offset;
  
  // Check if smooth scroll is supported
  if ('scrollBehavior' in document.documentElement.style) {
    window.scrollTo({
      top: targetPosition,
      behavior: 'smooth'
    });
    return;
  }

  // Fallback to manual animation
  const startPosition = window.pageYOffset;
  const distance = targetPosition - startPosition;
  const startTime = performance.now();

  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

  const animateScroll = (currentTime: number) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    const easedProgress = easeOutCubic(progress);
    const currentPosition = startPosition + (distance * easedProgress);
    
    window.scrollTo(0, currentPosition);
    
    if (progress < 1) {
      requestAnimationFrame(animateScroll);
    }
  };

  requestAnimationFrame(animateScroll);
};

// Scroll to top with GitHub-style animation
export const scrollToTop = (duration: number = 600) => {
  smoothScrollTo(document.body, { duration, offset: 0 });
};

// Scroll to element with offset for fixed navbar
export const scrollToElement = (
  element: HTMLElement | string,
  offset: number = 80
) => {
  smoothScrollTo(element, { duration: 800, offset });
};

// Throttled scroll handler for performance
export const throttleScroll = (callback: () => void, delay: number = 16) => {
  let timeoutId: NodeJS.Timeout;
  let lastExecTime = 0;
  
  return () => {
    const currentTime = Date.now();
    
    if (currentTime - lastExecTime > delay) {
      callback();
      lastExecTime = currentTime;
    } else {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        callback();
        lastExecTime = Date.now();
      }, delay - (currentTime - lastExecTime));
    }
  };
}; 