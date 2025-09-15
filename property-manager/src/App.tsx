import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
// Performance context temporarily disabled to prevent reload loops
import { AppShell } from './components/ui/AppShell';
// PerformanceMonitor temporarily disabled to prevent reload loops
import { ProtectedRoute } from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

// Import performance CSS
import './styles/performance.css';
import './index.css';

// Optimized lazy loading with preloading for critical pages
const Nuomotojas2Dashboard = React.lazy(() => 
  import('./pages/Nuomotojas2Dashboard').then(module => {
    // Preload related components
    import('./components/properties/AddAddressModal');
    import('./components/properties/AddApartmentModal');
    return { default: module.default };
  })
);

// Lazy load other pages with chunk names for better caching
const Dashboard = React.lazy(() => import(/* webpackChunkName: "dashboard" */ './pages/Dashboard'));
const Properties = React.lazy(() => import(/* webpackChunkName: "properties" */ './pages/Properties'));
const Tenants = React.lazy(() => import(/* webpackChunkName: "tenants" */ './pages/Tenants'));
const TenantDashboard = React.lazy(() => import(/* webpackChunkName: "tenant-dashboard" */ './pages/tenant/TenantDashboard'));
const MetersPage = React.lazy(() => import(/* webpackChunkName: "meters" */ './pages/Meters'));
const MeterPolicyDemo = React.lazy(() => import(/* webpackChunkName: "meter-demo" */ './pages/MeterPolicyDemo'));
const Invoices = React.lazy(() => import(/* webpackChunkName: "invoices" */ './pages/Invoices'));
const Analytics = React.lazy(() => import(/* webpackChunkName: "analytics" */ './pages/Analytics'));
const Maintenance = React.lazy(() => import(/* webpackChunkName: "maintenance" */ './pages/Maintenance'));
const Profile = React.lazy(() => import(/* webpackChunkName: "profile" */ './pages/Profile'));

// Auth pages - load immediately as they're critical
const Login = React.lazy(() => import(/* webpackChunkName: "auth" */ './pages/Login'));
const NewLogin = React.lazy(() => import(/* webpackChunkName: "auth" */ './pages/NewLogin'));
const SupabaseLogin = React.lazy(() => import(/* webpackChunkName: "auth" */ './pages/SupabaseLogin'));
const SupabaseAuthCallback = React.lazy(() => import(/* webpackChunkName: "auth" */ './pages/SupabaseAuthCallback'));
const EmailLogin = React.lazy(() => import(/* webpackChunkName: "auth" */ './pages/EmailLogin'));
const MagicLinkVerify = React.lazy(() => import(/* webpackChunkName: "auth" */ './pages/MagicLinkVerify'));
const Register = React.lazy(() => import(/* webpackChunkName: "auth" */ './pages/Register'));
const EmailConfirmation = React.lazy(() => import(/* webpackChunkName: "auth" */ './pages/EmailConfirmation'));
const Welcome = React.lazy(() => import(/* webpackChunkName: "auth" */ './pages/Welcome'));

// Loading component with performance optimization
interface LoadingFallbackProps {
  message?: string;
}

// eslint-disable-next-line react/prop-types
const LoadingFallback: React.FC<LoadingFallbackProps> = React.memo(({ message = 'Kraunama...' }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600 text-sm">{message}</p>
    </div>
  </div>
));

LoadingFallback.displayName = 'LoadingFallback';

// Performance monitor wrapper - temporarily disabled to prevent reload loops
const PerformanceWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Performance monitoring temporarily disabled to prevent reload loops
  return <>{children}</>;
};

// Main App component
function AppContent() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="App">
        <React.Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<SupabaseLogin />} />
            <Route path="/auth/callback" element={<SupabaseAuthCallback />} />
            <Route path="/email-login" element={<EmailLogin />} />
            <Route path="/auth/verify" element={<MagicLinkVerify />} />
            <Route path="/register" element={<Register />} />
            <Route path="/welcome" element={<Welcome />} />
            <Route path="/auth/old-callback" element={<EmailConfirmation />} />
            
            {/* Protected routes with AppShell */}
            <Route path="/" element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="/nuomotojas2" replace />} />
              <Route path="dashboard" element={
                <React.Suspense fallback={<LoadingFallback message="Kraunamas dashboard..." />}>
                  <Dashboard />
                </React.Suspense>
              } />
              <Route path="properties" element={
                <React.Suspense fallback={<LoadingFallback message="Kraunami objektai..." />}>
                  <Properties />
                </React.Suspense>
              } />
              <Route path="tenants" element={
                <React.Suspense fallback={<LoadingFallback message="Kraunami nuomininkai..." />}>
                  <Tenants />
                </React.Suspense>
              } />
              <Route path="tenant-dashboard" element={
                <React.Suspense fallback={<LoadingFallback message="Kraunamas nuomininko dashboard..." />}>
                  <TenantDashboard />
                </React.Suspense>
              } />
              <Route path="nuomotojas2" element={
                <React.Suspense fallback={<LoadingFallback message="Kraunamas nuomotojo dashboard..." />}>
                  <Nuomotojas2Dashboard />
                </React.Suspense>
              } />
              <Route path="meters" element={
                <React.Suspense fallback={<LoadingFallback message="Kraunami skaitliukai..." />}>
                  <MetersPage />
                </React.Suspense>
              } />
              <Route path="meter-policy-demo" element={
                <React.Suspense fallback={<LoadingFallback message="Kraunama skaitliukų policy demo..." />}>
                  <MeterPolicyDemo />
                </React.Suspense>
              } />
              <Route path="invoices" element={
                <React.Suspense fallback={<LoadingFallback message="Kraunamos sąskaitos..." />}>
                  <Invoices />
                </React.Suspense>
              } />
              <Route path="analytics" element={
                <React.Suspense fallback={<LoadingFallback message="Kraunama analitika..." />}>
                  <Analytics />
                </React.Suspense>
              } />
              <Route path="maintenance" element={
                <React.Suspense fallback={<LoadingFallback message="Kraunama priežiūra..." />}>
                  <Maintenance />
                </React.Suspense>
              } />
              <Route path="profile" element={
                <React.Suspense fallback={<LoadingFallback message="Kraunamas profilis..." />}>
                  <Profile />
                </React.Suspense>
              } />
            </Route>
            
            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </React.Suspense>
      </div>
    </Router>
  );
}

// Root App with all providers
function App() {
  useEffect(() => {
    // Performance optimizations on app start
    
    // Preload critical resources
    const preloadCritical = () => {
      // Only preload resources that are actually used
      // Check if logo exists before preloading
      const logoExists = document.querySelector('link[href="/logo192.png"]');
      if (!logoExists) {
        const logoPreload = document.createElement('link');
        logoPreload.rel = 'preload';
        logoPreload.as = 'image';
        logoPreload.href = '/logo192.png';
        logoPreload.onerror = () => {
          // Remove preload if image doesn't exist
          document.head.removeChild(logoPreload);
        };
        document.head.appendChild(logoPreload);
      }
    };
    
    // Set up performance monitoring
    const setupPerformanceMonitoring = () => {
      // Web Vitals monitoring
      if ('web-vital' in window) {
        import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
          getCLS(console.log);
          getFID(console.log);
          getFCP(console.log);
          getLCP(console.log);
          getTTFB(console.log);
        });
      }
      
      // Memory usage monitoring (disabled for performance)
      // if ('memory' in performance) {
      //   const logMemoryUsage = () => {
      //     const memory = (performance as any).memory;
      //     console.log('Memory Usage:', {
      //       used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
      //       total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
      //       limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024),
      //     });
      //   };
      //   
      //   // Log memory usage every 30 seconds in development
      //   if (process.env.NODE_ENV === 'development') {
      //     const interval = setInterval(logMemoryUsage, 30000);
      //     return () => clearInterval(interval);
      //   }
      // }
    };
    
    // Set up viewport meta for mobile optimization
    const setupViewport = () => {
      let viewport = document.querySelector('meta[name="viewport"]');
      if (!viewport) {
        viewport = document.createElement('meta');
        viewport.setAttribute('name', 'viewport');
        document.head.appendChild(viewport);
      }
      viewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes');
    };
    
    preloadCritical();
    // setupPerformanceMonitoring(); // Temporarily disabled to prevent reload loops
    setupViewport();
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <DataProvider>
          <PerformanceWrapper>
            <AppContent />
          </PerformanceWrapper>
        </DataProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;