import React, { Suspense, lazy, ComponentType } from 'react';
import LoadingSpinner from './LoadingSpinner';
import SkeletonCard from './SkeletonCard';

interface LazyLoaderProps {
  component: ComponentType<any>;
  fallback?: React.ReactNode;
  skeletonType?: 'card' | 'table-row' | 'list-item' | 'tenant-row' | 'address-group' | 'stats';
  skeletonCount?: number;
  loadingText?: string;
  className?: string;
}

// LazyShow component for conditional rendering with lazy loading
export const LazyShow: React.FC<{ 
  show: boolean; 
  children: React.ReactNode; 
  fallback?: React.ReactNode;
  className?: string;
}> = ({ show, children, fallback, className = '' }) => {
  if (!show) return null;
  
  return (
    <div className={className}>
      {children}
    </div>
  );
};

// Optimized lazy loader with better performance
const LazyLoader: React.FC<LazyLoaderProps> = ({
  component,
  fallback,
  skeletonType = 'card',
  skeletonCount = 3,
  loadingText,
  className = ''
}) => {
  const LazyComponent = lazy(() => {
    return new Promise<{ default: ComponentType<any> }>((resolve) => {
      // Simulate network delay for better UX
      setTimeout(() => {
        resolve({ default: component });
      }, 100);
    });
  });

  const defaultFallback = (
    <div className={`w-full ${className}`}>
      {loadingText && (
        <div className="text-center mb-4">
          <LoadingSpinner 
            variant="dots" 
            size="md" 
            color="primary" 
            text={loadingText}
          />
        </div>
      )}
      <SkeletonCard 
        type={skeletonType} 
        count={skeletonCount}
        className="space-y-4"
      />
    </div>
  );

  return (
    <Suspense fallback={fallback || defaultFallback}>
      <LazyComponent />
    </Suspense>
  );
};

// Pre-configured lazy loaders for common use cases
export const LazyTenantList = lazy(() => import('../nuomotojas2/TenantListOptimized'));
export const LazyGlobalChat = lazy(() => import('../properties/GlobalChatComponent'));
export const LazyAIAssistant = lazy(() => import('../tenant/AIAssistant'));

// Optimized wrapper components
export const TenantListLoader: React.FC = () => (
  <LazyLoader
    component={LazyTenantList}
    skeletonType="tenant-row"
    skeletonCount={5}
    loadingText="Kraunama nuomininkų sąrašas..."
    className="space-y-4"
  />
);

export const GlobalChatLoader: React.FC = () => (
  <LazyLoader
    component={LazyGlobalChat}
    skeletonType="card"
    skeletonCount={2}
    loadingText="Kraunamas pokalbis..."
    className="h-full"
  />
);

export const AIAssistantLoader: React.FC = () => (
  <LazyLoader
    component={LazyAIAssistant}
    skeletonType="card"
    skeletonCount={1}
    loadingText="Kraunamas AI asistentas..."
    className="h-full"
  />
);

export default LazyLoader; 