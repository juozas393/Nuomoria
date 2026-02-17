import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { DensityProvider } from './context/DensityContext';
import { AppShell } from './components/ui/AppShell';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RoleGuard } from './components/RoleGuard';
import ErrorBoundary from './components/ErrorBoundary';
import ErrorFallbackPage from './components/ErrorFallbackPage';

// Import global CSS
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

const Properties = React.lazy(() => import(/* webpackChunkName: "properties" */ './pages/Properties'));
const Tenants = React.lazy(() => import(/* webpackChunkName: "tenants" */ './pages/Tenants'));
const TenantDashboard = React.lazy(() => import(/* webpackChunkName: "tenant-dashboard" */ './features/tenant/pages/TenantDashboardPage'));
const TenantSettingsPage = React.lazy(() => import(/* webpackChunkName: "tenant-settings" */ './features/tenant/pages/TenantSettingsPage'));
const MetersPage = React.lazy(() => import(/* webpackChunkName: "meters" */ './pages/Meters'));
const MeterPolicyDemo = React.lazy(() => import(/* webpackChunkName: "meter-demo" */ './pages/MeterPolicyDemo'));
const Invoices = React.lazy(() => import(/* webpackChunkName: "invoices" */ './pages/Invoices'));
const Analytics = React.lazy(() => import(/* webpackChunkName: "analytics" */ './pages/Analytics'));
const Maintenance = React.lazy(() => import(/* webpackChunkName: "maintenance" */ './pages/Maintenance'));
const Profile = React.lazy(() => import(/* webpackChunkName: "profile" */ './pages/Profile'));
const Apartments = React.lazy(() => import(/* webpackChunkName: "apartments" */ './pages/Apartments'));
const Settings = React.lazy(() => import(/* webpackChunkName: "settings" */ './pages/Settings'));
const Users = React.lazy(() => import(/* webpackChunkName: "users" */ './pages/Users'));

// Auth pages - load immediately as they're critical
const SupabaseLogin = React.lazy(() => import(/* webpackChunkName: "auth" */ './pages/SupabaseLogin'));
const ProfessionalLogin = React.lazy(() => import(/* webpackChunkName: "auth" */ './features/auth/pages/LoginPage'));
const OnboardingWrapper = React.lazy(() => import(/* webpackChunkName: "auth" */ './features/auth/pages/OnboardingWrapper'));
const SupabaseAuthCallback = React.lazy(() => import(/* webpackChunkName: "auth" */ './pages/SupabaseAuthCallback'));
const EmailLogin = React.lazy(() => import(/* webpackChunkName: "auth" */ './pages/EmailLogin'));
const MagicLinkVerify = React.lazy(() => import(/* webpackChunkName: "auth" */ './pages/MagicLinkVerify'));

const EmailConfirmation = React.lazy(() => import(/* webpackChunkName: "auth" */ './pages/EmailConfirmation'));
const Welcome = React.lazy(() => import(/* webpackChunkName: "auth" */ './pages/Welcome'));

// Guide page
const GuidePage = React.lazy(() => import(/* webpackChunkName: "guide" */ './pages/GuidePage'));

// Test pages (for development)
const TestModal = React.lazy(() => import('./pages/TestModal'));

// Loading component with skeleton layout
interface LoadingFallbackProps {
  message?: string;
}

// eslint-disable-next-line react/prop-types
const LoadingFallback: React.FC<LoadingFallbackProps> = React.memo(({ message = 'Kraunama...' }) => (
  <div className="min-h-screen bg-gray-50 p-6">
    {/* Top bar skeleton */}
    <div className="flex items-center justify-between mb-8">
      <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse"></div>
      <div className="flex gap-3">
        <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse"></div>
        <div className="h-8 w-32 bg-gray-200 rounded-lg animate-pulse"></div>
      </div>
    </div>
    {/* Stats row skeleton */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="bg-white rounded-xl p-4 shadow-sm">
          <div className="h-3 w-20 bg-gray-200 rounded animate-pulse mb-3"></div>
          <div className="h-6 w-16 bg-gray-200 rounded animate-pulse"></div>
        </div>
      ))}
    </div>
    {/* Content cards skeleton */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="bg-white rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 bg-gray-200 rounded-lg animate-pulse"></div>
            <div className="flex-1">
              <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-3 w-48 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-3 w-full bg-gray-200 rounded animate-pulse"></div>
            <div className="h-3 w-3/4 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
      ))}
    </div>
    {/* Subtle loading text */}
    <p className="text-center text-gray-400 text-xs mt-6">{message}</p>
  </div>
));

LoadingFallback.displayName = 'LoadingFallback';



// Role-based redirect component for home page
const RoleBasedRedirect: React.FC = () => {
  // useAuth is imported at the top of the file
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingFallback message="Tikrinama rolė..." />;
  }

  // If no user or no role, redirect to onboarding
  if (!user?.role || !['landlord', 'tenant', 'admin'].includes(user.role)) {
    return <Navigate to="/onboarding" replace />;
  }

  // Redirect based on user role
  if (user.role === 'tenant') {
    return <Navigate to="/tenant" replace />;
  }

  // Landlord/admin -> landlord dashboard
  return <Navigate to="/dashboard" replace />;
};

// Main App component
function AppContent() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="App">
        <React.Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<ProfessionalLogin />} />
            <Route path="/login-old" element={<SupabaseLogin />} />
            <Route path="/auth/callback" element={<SupabaseAuthCallback />} />
            <Route path="/onboarding" element={<OnboardingWrapper />} />
            <Route path="/email-login" element={<EmailLogin />} />
            <Route path="/auth/verify" element={<MagicLinkVerify />} />

            <Route path="/welcome" element={<Welcome />} />
            <Route path="/auth/old-callback" element={<EmailConfirmation />} />
            <Route path="/test-modal" element={<TestModal />} />
            <Route path="/pagalba" element={<GuidePage />} />

            {/* Protected routes with AppShell */}
            <Route path="/" element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }>
              {/* Role-based home page redirect */}
              <Route index element={<RoleBasedRedirect />} />

              {/* Landlord-only routes — tenants get redirected to /tenant */}
              <Route path="dashboard" element={
                <RoleGuard allowedRoles={['landlord', 'admin']} redirectTo="/tenant">
                  <ErrorBoundary fallback={<ErrorFallbackPage />}>
                    <React.Suspense fallback={<LoadingFallback message="Kraunamas dashboard..." />}>
                      <Nuomotojas2Dashboard />
                    </React.Suspense>
                  </ErrorBoundary>
                </RoleGuard>
              } />
              <Route path="turtas" element={
                <RoleGuard allowedRoles={['landlord', 'admin']} redirectTo="/tenant">
                  <ErrorBoundary fallback={<ErrorFallbackPage />}>
                    <React.Suspense fallback={<LoadingFallback message="Kraunami objektai..." />}>
                      <Properties />
                    </React.Suspense>
                  </ErrorBoundary>
                </RoleGuard>
              } />
              <Route path="butai" element={
                <RoleGuard allowedRoles={['landlord', 'admin']} redirectTo="/tenant">
                  <ErrorBoundary fallback={<ErrorFallbackPage />}>
                    <React.Suspense fallback={<LoadingFallback message="Kraunami butai..." />}>
                      <Apartments />
                    </React.Suspense>
                  </ErrorBoundary>
                </RoleGuard>
              } />
              <Route path="nuomininkai" element={
                <RoleGuard allowedRoles={['landlord', 'admin']} redirectTo="/tenant">
                  <ErrorBoundary fallback={<ErrorFallbackPage />}>
                    <React.Suspense fallback={<LoadingFallback message="Kraunami nuomininkai..." />}>
                      <Tenants />
                    </React.Suspense>
                  </ErrorBoundary>
                </RoleGuard>
              } />
              <Route path="skaitikliai" element={
                <RoleGuard allowedRoles={['landlord', 'admin']} redirectTo="/tenant">
                  <ErrorBoundary fallback={<ErrorFallbackPage />}>
                    <React.Suspense fallback={<LoadingFallback message="Kraunami skaitliukai..." />}>
                      <MetersPage />
                    </React.Suspense>
                  </ErrorBoundary>
                </RoleGuard>
              } />
              <Route path="saskaitos" element={
                <RoleGuard allowedRoles={['landlord', 'admin']} redirectTo="/tenant">
                  <ErrorBoundary fallback={<ErrorFallbackPage />}>
                    <React.Suspense fallback={<LoadingFallback message="Kraunamos sąskaitos..." />}>
                      <Invoices />
                    </React.Suspense>
                  </ErrorBoundary>
                </RoleGuard>
              } />
              <Route path="analitika" element={
                <RoleGuard allowedRoles={['landlord', 'admin']} redirectTo="/tenant">
                  <ErrorBoundary fallback={<ErrorFallbackPage />}>
                    <React.Suspense fallback={<LoadingFallback message="Kraunama analitika..." />}>
                      <Analytics />
                    </React.Suspense>
                  </ErrorBoundary>
                </RoleGuard>
              } />
              <Route path="remontas" element={
                <RoleGuard allowedRoles={['landlord', 'admin']} redirectTo="/tenant">
                  <ErrorBoundary fallback={<ErrorFallbackPage />}>
                    <React.Suspense fallback={<LoadingFallback message="Kraunama priežiūra..." />}>
                      <Maintenance />
                    </React.Suspense>
                  </ErrorBoundary>
                </RoleGuard>
              } />
              <Route path="profilis" element={
                <RoleGuard allowedRoles={['landlord', 'admin']} redirectTo="/tenant">
                  <ErrorBoundary fallback={<ErrorFallbackPage />}>
                    <React.Suspense fallback={<LoadingFallback message="Kraunamas profilis..." />}>
                      <Profile />
                    </React.Suspense>
                  </ErrorBoundary>
                </RoleGuard>
              } />
              <Route path="nustatymai" element={
                <RoleGuard allowedRoles={['landlord', 'admin']} redirectTo="/tenant">
                  <ErrorBoundary fallback={<ErrorFallbackPage />}>
                    <React.Suspense fallback={<LoadingFallback message="Kraunami nustatymai..." />}>
                      <Settings />
                    </React.Suspense>
                  </ErrorBoundary>
                </RoleGuard>
              } />
              <Route path="vartotojai" element={
                <RoleGuard allowedRoles={['landlord', 'admin']} redirectTo="/tenant">
                  <ErrorBoundary fallback={<ErrorFallbackPage />}>
                    <React.Suspense fallback={<LoadingFallback message="Kraunami vartotojai..." />}>
                      <Users />
                    </React.Suspense>
                  </ErrorBoundary>
                </RoleGuard>
              } />

              {/* Guide page - accessible by all roles */}
              <Route path="pagalba" element={
                <ErrorBoundary fallback={<ErrorFallbackPage />}>
                  <React.Suspense fallback={<LoadingFallback message="Kraunamas gidas..." />}>
                    <GuidePage />
                  </React.Suspense>
                </ErrorBoundary>
              } />
            </Route>

            {/* Tenant routes */}
            <Route path="/tenant" element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={['tenant']} redirectTo="/dashboard">
                  <React.Suspense fallback={<LoadingFallback message="Kraunamas nuomininko dashboard..." />}>
                    <TenantDashboard />
                  </React.Suspense>
                </RoleGuard>
              </ProtectedRoute>
            } />

            <Route path="/tenant/settings" element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={['tenant']} redirectTo="/dashboard">
                  <React.Suspense fallback={<LoadingFallback message="Kraunami nustatymai..." />}>
                    <TenantSettingsPage />
                  </React.Suspense>
                </RoleGuard>
              </ProtectedRoute>
            } />

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
    setupViewport();
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <DataProvider>
          <DensityProvider>
            <AppContent />
          </DensityProvider>
        </DataProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;