import React, { Suspense, Component, ErrorInfo, ReactNode, useMemo } from 'react';
import LazySection from '../LazySection';
import { useResizeObserver } from '../../hooks/useResizeObserver';

// Lazy-loaded chart components
const RevenueChart = React.lazy(() => import('./RevenueChart'));
const OccupancyTrend = React.lazy(() => import('./OccupancyTrend'));
const Donut = React.lazy(() => import('./Donut'));
const ComparisonChart = React.lazy(() => import('./ComparisonChart'));
const CashFlowForecast = React.lazy(() => import('./CashFlowForecast'));

// Error boundary for charts
interface ChartErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ChartErrorBoundaryState {
  hasError: boolean;
}

class ChartErrorBoundary extends Component<ChartErrorBoundaryProps, ChartErrorBoundaryState> {
  constructor(props: ChartErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): ChartErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Chart Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="bg-white rounded-2xl border border-black/10 p-6 text-center">
          <div className="text-red-500 mb-2">⚠️</div>
          <p className="text-sm text-black/70">Grafiko įkėlimas nepavyko</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-2 px-3 py-1 bg-[#2F8481] text-white text-xs rounded-lg hover:opacity-90"
          >
            Bandyti dar kartą
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Chart skeleton component
function ChartSkeleton({ height = 400 }: { height?: number }) {
  return (
    <div 
      className="animate-pulse bg-gradient-to-br from-white to-gray-50 rounded-2xl border border-black/10 shadow-[0_1px_3px_rgba(0,0,0,0.1)]"
      style={{ height }}
    >
      <div className="p-6 h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 bg-black/5 rounded-lg w-48"></div>
          <div className="h-8 bg-black/5 rounded-lg w-24"></div>
        </div>
        <div className="flex-1 bg-black/5 rounded-xl"></div>
        <div className="mt-4 flex justify-center space-x-4">
          <div className="h-4 bg-black/5 rounded w-16"></div>
          <div className="h-4 bg-black/5 rounded w-16"></div>
          <div className="h-4 bg-black/5 rounded w-16"></div>
        </div>
      </div>
    </div>
  );
}

// Chart wrapper with ResizeObserver for proper width detection
function ChartWrapper({ 
  children, 
  height, 
  className = "",
  isVisible = true
}: { 
  children: ReactNode; 
  height: number; 
  className?: string;
  isVisible?: boolean;
}) {
  const { ref, size } = useResizeObserver<HTMLDivElement>();
  const ready = isVisible && size.width > 0;                       // <- tikras plotis
  const remountKey = useMemo(() => `${ready}-${size.width}-${height}`, [ready, size.width, height]);

  return (
    <div ref={ref} className={className} style={{ width: "100%", height }}>
      {ready ? (
        <div key={remountKey} style={{ width: "100%", height: "100%" }}>
          {children}
        </div>
      ) : (
        <ChartSkeleton height={height} />
      )}
    </div>
  );
}

// Lazy chart wrapper with error boundary and suspense
export function LazyRevenueChart(props: any) {
  return (
    <LazySection height={500} rootMargin="100px">
      {(inView) => (
        <ChartErrorBoundary>
          <ChartWrapper height={500} isVisible={inView}>
            <Suspense fallback={<ChartSkeleton height={500} />}>
              <RevenueChart {...props} />
            </Suspense>
          </ChartWrapper>
        </ChartErrorBoundary>
      )}
    </LazySection>
  );
}

export function LazyOccupancyTrend(props: any) {
  return (
    <LazySection height={700} rootMargin="100px">
      {(inView) => (
        <ChartErrorBoundary>
          <ChartWrapper height={700} isVisible={inView}>
            <Suspense fallback={<ChartSkeleton height={700} />}>
              <OccupancyTrend {...props} />
            </Suspense>
          </ChartWrapper>
        </ChartErrorBoundary>
      )}
    </LazySection>
  );
}

export function LazyDonut(props: any) {
  return (
    <LazySection height={400} rootMargin="100px">
      {(inView) => (
        <ChartErrorBoundary>
          <ChartWrapper height={400} isVisible={inView}>
            <Suspense fallback={<ChartSkeleton height={400} />}>
              <Donut {...props} />
            </Suspense>
          </ChartWrapper>
        </ChartErrorBoundary>
      )}
    </LazySection>
  );
}

export function LazyComparisonChart(props: any) {
  return (
    <LazySection height={400} rootMargin="100px">
      {(inView) => (
        <ChartErrorBoundary>
          <ChartWrapper height={400} isVisible={inView}>
            <Suspense fallback={<ChartSkeleton height={400} />}>
              <ComparisonChart {...props} />
            </Suspense>
          </ChartWrapper>
        </ChartErrorBoundary>
      )}
    </LazySection>
  );
}

export function LazyCashFlowForecast(props: any) {
  return (
    <LazySection height={400} rootMargin="100px">
      {(inView) => (
        <ChartErrorBoundary>
          <ChartWrapper height={400} isVisible={inView}>
            <Suspense fallback={<ChartSkeleton height={400} />}>
              <CashFlowForecast {...props} />
            </Suspense>
          </ChartWrapper>
        </ChartErrorBoundary>
      )}
    </LazySection>
  );
}
