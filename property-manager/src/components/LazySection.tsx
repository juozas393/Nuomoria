import React from "react";
import { useInView } from "../hooks/useInView";

interface LazySectionProps {
  children: React.ReactNode | ((inView: boolean) => React.ReactNode);
  height?: number;
  rootMargin?: string;
  className?: string;
}

/**
 * LazySection - Mounts children only when they come into view
 * Prevents unnecessary rendering of off-screen components
 */
export default function LazySection({ 
  children, 
  height = 360, 
  rootMargin = "200px",
  className = ""
}: LazySectionProps) {
  const { ref, inView } = useInView<HTMLDivElement>(rootMargin);
  
  return (
    <div 
      ref={ref} 
      className={className}
      style={{ minHeight: height }}
    >
      {inView ? (typeof children === 'function' ? children(inView) : children) : <SectionSkeleton height={height} />}
    </div>
  );
}

/**
 * SectionSkeleton - Loading placeholder with fixed height to prevent CLS
 * Uses project colors and smooth animation
 */
function SectionSkeleton({ height }: { height: number }) {
  return (
    <div 
      className="animate-pulse bg-gradient-to-br from-white to-gray-50 rounded-2xl border border-black/10 shadow-[0_1px_3px_rgba(0,0,0,0.1)]"
      style={{ height }}
    >
      {/* Skeleton content with project styling */}
      <div className="p-6 h-full flex flex-col">
        {/* Header skeleton */}
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 bg-black/5 rounded-lg w-48"></div>
          <div className="h-8 bg-black/5 rounded-lg w-24"></div>
        </div>
        
        {/* Chart area skeleton */}
        <div className="flex-1 bg-black/5 rounded-xl"></div>
        
        {/* Footer skeleton */}
        <div className="mt-4 flex justify-center space-x-4">
          <div className="h-4 bg-black/5 rounded w-16"></div>
          <div className="h-4 bg-black/5 rounded w-16"></div>
          <div className="h-4 bg-black/5 rounded w-16"></div>
        </div>
      </div>
    </div>
  );
}
