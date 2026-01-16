import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { getDefaultRouteForRole } from './utils/roleRouting';
import { DataProvider } from './context/DataContext';
import { PerformanceProviders, useUIActions, useDeviceCapabilities } from './context/PerformanceContext';
import { AppShell } from './components/ui/AppShell';
import { PerformanceMonitor } from './components/ui/PerformanceMonitor';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RoleGuard } from './components/RoleGuard';
import ErrorBoundary from './components/ErrorBoundary';
import { logSupabaseConfigurationTest } from './utils/testSupabaseConfig';

// Import performance CSS
import './styles/performance.css';
import './index.css';

// Lazy load pages for better performance
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Properties = React.lazy(() => import('./pages/Properties'));
const Tenants = React.lazy(() => import('./pages/Tenants'));
const TenantDashboard = React.lazy(() => import('./pages/tenant/TenantDashboard'));
const Nuomotojas2Dashboard = React.lazy(() => import('./pages/Nuomotojas2Dashboard'));
const MetersPage = React.lazy(() => import('./pages/Meters'));
const MeterPolicyDemo = React.lazy(() => import('./pages/MeterPolicyDemo'));
const Invoices = React.lazy(() => import('./pages/Invoices'));
const Analytics = React.lazy(() => import('./pages/Analytics'));
const Maintenance = React.lazy(() => import('./pages/Maintenance'));
const Profile = React.lazy(() => import('./pages/Profile'));
const Settings = React.lazy(() => import('./pages/Settings'));

// Database test component
const DatabaseTest = React.lazy(() => import('./components/DatabaseTest'));

// ✅ Production-ready: Login and auth pages
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const DualAuthLogin = React.lazy(() => import('./pages/DualAuthLogin'));
const RegisterPage = React.lazy(() => import('./pages/RegisterPage'));
const ForgotPasswordPage = React.lazy(() => import('./pages/ForgotPasswordPage'));
const SupabaseLogin = React.lazy(() => import('./pages/SupabaseLogin'));
const SupabaseAuthCallback = React.lazy(() => import('./pages/SupabaseAuthCallback'));
const EmailLogin = React.lazy(() => import('./pages/EmailLogin'));
const MagicLinkVerify = React.lazy(() => import('./pages/MagicLinkVerify'));
const Register = React.lazy(() => import('./pages/Register'));
const EmailConfirmation = React.lazy(() => import('./pages/EmailConfirmation'));
const Welcome = React.lazy(() => import('./pages/Welcome'));

// User onboarding
const UserOnboarding = React.lazy(() => import('./pages/UserOnboarding'));

import type { UserRole } from './types/user';

const landlordFacingRoles: UserRole[] = ['admin', 'landlord', 'property_manager', 'maintenance'];

// Loading component with performance optimization
const LoadingFallback: React.FC<{ message?: string }> = ({ message = 'Kraunama...' }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600 text-sm">{message}</p>
    </div>
  </div>
);

const RoleLanding: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If user has no role, redirect to onboarding to select role
  if (!user.role) {
    return <Navigate to="/onboarding" replace />;
  }

  const defaultRoute = getDefaultRouteForRole(user.role);
  return <Navigate to={defaultRoute} replace />;
};

// Performance monitor wrapper
const PerformanceWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLowEnd, shouldReduceAnimations } = useDeviceCapabilities();
  const { setPerformanceMode } = useUIActions();
  
  useEffect(() => {
    // Set performance mode based on device capabilities
    setPerformanceMode(isLowEnd ? 'low' : 'high');
  }, [isLowEnd, setPerformanceMode]);
  
  useEffect(() => {
    // Add performance class to body
    if (isLowEnd || shouldReduceAnimations) {
      document.body.classList.add('low-end-mode');
    }
    
    return () => {
      document.body.classList.remove('low-end-mode');
    };
  }, [isLowEnd, shouldReduceAnimations]);
  
  return (
    <>
      {children}
      {process.env.NODE_ENV === 'development' && <PerformanceMonitor />}
    </>
  );
};

// Main App component
function AppContent() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="App">
        <React.Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* ✅ Authentication routes */}
            <Route path="/login" element={
              <React.Suspense fallback={<LoadingFallback message="Kraunamas prisijungimas..." />}>
                <DualAuthLogin />
              </React.Suspense>
            } />
            <Route path="/onboarding" element={
              <React.Suspense fallback={<LoadingFallback message="Kraunamas profilio kūrimas..." />}>
                <UserOnboarding />
              </React.Suspense>
            } />
            <Route path="/auth/callback" element={
              <React.Suspense fallback={<LoadingFallback message="Autentifikuojama..." />}>
                <SupabaseAuthCallback />
              </React.Suspense>
            } />
            <Route path="/email-login" element={
              <React.Suspense fallback={<LoadingFallback message="Kraunamas prisijungimas..." />}>
                <EmailLogin />
              </React.Suspense>
            } />
            <Route path="/auth/verify" element={
              <React.Suspense fallback={<LoadingFallback message="Tikrinama..." />}>
                <MagicLinkVerify />
              </React.Suspense>
            } />
            <Route path="/register" element={
              <React.Suspense fallback={<LoadingFallback message="Kraunama registracija..." />}>
                <RegisterPage />
              </React.Suspense>
            } />
            <Route path="/forgot-password" element={
              <React.Suspense fallback={<LoadingFallback message="Kraunamas slaptažodžio atkūrimas..." />}>
                <ForgotPasswordPage />
              </React.Suspense>
            } />
            <Route path="/welcome" element={
              <React.Suspense fallback={<LoadingFallback message="Sveiki atvykę..." />}>
                <Welcome />
              </React.Suspense>
            } />
            <Route path="/onboarding" element={
              <React.Suspense fallback={<LoadingFallback message="Kraunamas nustatymų vedlys..." />}>
                <UserOnboarding />
              </React.Suspense>
            } />
            <Route path="/auth/old-callback" element={
              <React.Suspense fallback={<LoadingFallback message="Patvirtinama..." />}>
                <EmailConfirmation />
              </React.Suspense>
            } />
            
            {/* Database test route */}
            <Route path="/db-test" element={
              <React.Suspense fallback={<LoadingFallback message="Kraunamas duomenų bazės testas..." />}>
                <DatabaseTest />
              </React.Suspense>
            } />
            
            {/* Protected routes with AppShell */}
            <Route path="/" element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }>
              <Route index element={<RoleLanding />} />
              <Route
                path="dashboard"
                element={
                  <RoleGuard allow={landlordFacingRoles}>
                    <React.Suspense fallback={<LoadingFallback message="Kraunamas dashboard..." />}>
                      <Dashboard />
                    </React.Suspense>
                  </RoleGuard>
                }
              />
              <Route
                path="properties"
                element={
                  <RoleGuard allow={landlordFacingRoles}>
                    <React.Suspense fallback={<LoadingFallback message="Kraunami objektai..." />}>
                      <Properties />
                    </React.Suspense>
                  </RoleGuard>
                }
              />
              <Route
                path="tenants"
                element={
                  <RoleGuard allow={landlordFacingRoles}>
                    <React.Suspense fallback={<LoadingFallback message="Kraunami nuomininkai..." />}>
                      <Tenants />
                    </React.Suspense>
                  </RoleGuard>
                }
              />
              <Route
                path="tenant-dashboard"
                element={
                  <RoleGuard allow={['tenant']}>
                    <React.Suspense fallback={<LoadingFallback message="Kraunamas nuomininko dashboard..." />}>
                      <TenantDashboard />
                    </React.Suspense>
                  </RoleGuard>
                }
              />
              <Route
                path="nuomotojas2"
                element={
                  <RoleGuard allow={landlordFacingRoles}>
                    <React.Suspense fallback={<LoadingFallback message="Kraunamas nuomotojo dashboard..." />}>
                      <Nuomotojas2Dashboard />
                    </React.Suspense>
                  </RoleGuard>
                }
              />
              <Route
                path="meters"
                element={
                  <RoleGuard allow={landlordFacingRoles}>
                    <React.Suspense fallback={<LoadingFallback message="Kraunami skaitliukai..." />}>
                      <MetersPage />
                    </React.Suspense>
                  </RoleGuard>
                }
              />
              <Route
                path="meter-policy-demo"
                element={
                  <RoleGuard allow={landlordFacingRoles}>
                    <React.Suspense fallback={<LoadingFallback message="Kraunama skaitliukų policy demo..." />}>
                      <MeterPolicyDemo />
                    </React.Suspense>
                  </RoleGuard>
                }
              />
              <Route
                path="invoices"
                element={
                  <RoleGuard allow={landlordFacingRoles}>
                    <React.Suspense fallback={<LoadingFallback message="Kraunamos sąskaitos..." />}>
                      <Invoices />
                    </React.Suspense>
                  </RoleGuard>
                }
              />
              <Route
                path="analytics"
                element={
                  <RoleGuard allow={landlordFacingRoles}>
                    <React.Suspense fallback={<LoadingFallback message="Kraunama analitika..." />}>
                      <Analytics />
                    </React.Suspense>
                  </RoleGuard>
                }
              />
              <Route
                path="maintenance"
                element={
                  <RoleGuard allow={landlordFacingRoles}>
                    <React.Suspense fallback={<LoadingFallback message="Kraunama priežiūra..." />}>
                      <Maintenance />
                    </React.Suspense>
                  </RoleGuard>
                }
              />
              <Route path="profile" element={
                <React.Suspense fallback={<LoadingFallback message="Kraunamas profilis..." />}>
                  <Profile />
                </React.Suspense>
              } />
              <Route path="/settings" element={
                <React.Suspense fallback={<LoadingFallback message="Kraunami nustatymai..." />}>
                  <Settings />
                </React.Suspense>
              } />
            </Route>
            
            {/* Catch all route - redirect to login for unauthenticated users */}
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
      // Only preload resources that are actually used and exist
      // Skip preloading images that might not exist to avoid warnings
    };
    
    // Set up performance monitoring
    const setupPerformanceMonitoring = () => {
      // Web Vitals monitoring - only in development
      if (process.env.NODE_ENV === 'development' && 'web-vital' in window) {
        import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
          const sendToAnalytics = (metric: unknown) => {
            if (process.env.NODE_ENV === 'development') {
              console.log('Web Vitals:', metric);
            }
            // In production, send to analytics service
          };
          getCLS(sendToAnalytics);
          getFID(sendToAnalytics);
          getFCP(sendToAnalytics);
          getLCP(sendToAnalytics);
          getTTFB(sendToAnalytics);
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
    
    // Test Supabase configuration (only in development, only once)
    const testSupabaseConfig = () => {
      if (process.env.NODE_ENV === 'development' && !(window as any).__supabaseConfigTested) {
        (window as any).__supabaseConfigTested = true;
        // Run test after a short delay to ensure Supabase client is initialized
        setTimeout(() => {
          logSupabaseConfigurationTest().catch(console.error);
        }, 2000);
      }
    };
    
    preloadCritical();
    setupPerformanceMonitoring();
    setupViewport();
    testSupabaseConfig();
  }, []);

  return (
    <ErrorBoundary>
      <PerformanceProviders>
        <AuthProvider>
          <DataProvider>
            <PerformanceWrapper>
              <AppContent />
            </PerformanceWrapper>
          </DataProvider>
        </AuthProvider>
      </PerformanceProviders>
    </ErrorBoundary>
  );
}

export default App;