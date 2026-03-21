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
import { PasswordGate } from './components/PasswordGate';

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

const Properties = React.lazy(() => import('./pages/Properties'));
const Tenants = React.lazy(() => import('./pages/Tenants'));
const TenantLayout = React.lazy(() => import('./features/tenant/layouts/TenantLayout'));
const TenantDashboard = React.lazy(() => import('./features/tenant/pages/TenantDashboardPage'));
const TenantSettingsPage = React.lazy(() => import('./features/tenant/pages/TenantSettingsPage'));
const TenantMeters = React.lazy(() => import('./pages/tenant/TenantMeters'));
const TenantInvoices = React.lazy(() => import('./pages/tenant/TenantInvoices'));
const TenantContractPage = React.lazy(() => import('./pages/tenant/TenantContractPage'));
const MetersPage = React.lazy(() => import('./pages/Meters'));
const MeterPolicyDemo = React.lazy(() => import('./pages/MeterPolicyDemo'));
const Invoices = React.lazy(() => import('./pages/Invoices'));
const Analytics = React.lazy(() => import('./pages/Analytics'));
const Maintenance = React.lazy(() => import('./pages/Maintenance'));
const Profile = React.lazy(() => import('./pages/Profile'));
const Apartments = React.lazy(() => import('./pages/Apartments'));
const Settings = React.lazy(() => import('./pages/Settings'));
const Users = React.lazy(() => import('./pages/Users'));
const AgentsPage = React.lazy(() => import('./pages/AgentsPage'));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));
const AdminPerformancePage = React.lazy(() => import('./pages/AdminPerformancePage'));

// Auth pages
const SupabaseLogin = React.lazy(() => import('./pages/SupabaseLogin'));
const ProfessionalLogin = React.lazy(() => import('./features/auth/pages/LoginPage'));
const RegisterPage = React.lazy(() => import('./features/auth/pages/RegisterPage'));
const OnboardingWrapper = React.lazy(() => import('./features/auth/pages/OnboardingWrapper'));
const SupabaseAuthCallback = React.lazy(() => import('./pages/SupabaseAuthCallback'));
const EmailLogin = React.lazy(() => import('./pages/EmailLogin'));
const MagicLinkVerify = React.lazy(() => import('./pages/MagicLinkVerify'));

const EmailConfirmation = React.lazy(() => import('./pages/EmailConfirmation'));
const Welcome = React.lazy(() => import('./pages/Welcome'));

// Landing page
const LandingPage = React.lazy(() => import('./pages/LandingPage'));

// Guide page
const GuidePage = React.lazy(() => import('./pages/GuidePage'));
const PricingPage = React.lazy(() => import('./pages/PricingPage'));

// Test pages — only loaded in development
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
  if (!user?.role || !['landlord', 'tenant', 'admin', 'property_manager'].includes(user.role)) {
    return <Navigate to="/onboarding" replace />;
  }

  // Redirect based on user role
  if (user.role === 'tenant') {
    return <Navigate to="/tenant" replace />;
  }

  if (user.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  // Landlord & property_manager -> landlord dashboard
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
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<ProfessionalLogin />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/login-old" element={<SupabaseLogin />} />
            <Route path="/auth/callback" element={<SupabaseAuthCallback />} />
            <Route path="/onboarding" element={<OnboardingWrapper />} />
            <Route path="/email-login" element={<EmailLogin />} />
            <Route path="/auth/verify" element={<MagicLinkVerify />} />

            <Route path="/welcome" element={<Welcome />} />
            <Route path="/auth/old-callback" element={<EmailConfirmation />} />
            {import.meta.env.DEV && <Route path="/test-modal" element={<TestModal />} />}
            <Route path="/pagalba" element={<GuidePage />} />
            <Route path="/kainos" element={<PricingPage />} />

            {/* Protected routes with AppShell — Suspense is inside AppShell for content-area-only loading */}
            <Route element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }>

              {/* Landlord/Admin routes — protected by RoleGuard */}
              <Route path="dashboard" element={<RoleGuard allowedRoles={['landlord', 'admin', 'property_manager']} redirectTo="/tenant"><ErrorBoundary fallback={<ErrorFallbackPage />}><Nuomotojas2Dashboard /></ErrorBoundary></RoleGuard>} />
              {/* Redirects — these pages are now integrated into Dashboard */}
              <Route path="turtas" element={<Navigate to="/dashboard" replace />} />
              <Route path="butai" element={<Navigate to="/dashboard" replace />} />
              <Route path="nuomininkai" element={<Navigate to="/dashboard" replace />} />
              <Route path="Skaitikliai" element={<RoleGuard allowedRoles={['landlord', 'admin', 'property_manager']} redirectTo="/tenant"><ErrorBoundary fallback={<ErrorFallbackPage />}><MetersPage /></ErrorBoundary></RoleGuard>} />
              <Route path="saskaitos" element={<RoleGuard allowedRoles={['landlord', 'admin', 'property_manager']} redirectTo="/tenant"><ErrorBoundary fallback={<ErrorFallbackPage />}><Invoices /></ErrorBoundary></RoleGuard>} />
              <Route path="analitika" element={<RoleGuard allowedRoles={['landlord', 'admin', 'property_manager']} redirectTo="/tenant"><ErrorBoundary fallback={<ErrorFallbackPage />}><Analytics /></ErrorBoundary></RoleGuard>} />
              <Route path="remontas" element={<RoleGuard allowedRoles={['landlord', 'admin', 'property_manager']} redirectTo="/tenant"><ErrorBoundary fallback={<ErrorFallbackPage />}><Maintenance /></ErrorBoundary></RoleGuard>} />
              <Route path="nustatymai" element={<RoleGuard allowedRoles={['landlord', 'admin', 'property_manager']} redirectTo="/tenant"><ErrorBoundary fallback={<ErrorFallbackPage />}><Settings /></ErrorBoundary></RoleGuard>} />
              <Route path="agentai" element={<RoleGuard allowedRoles={['landlord', 'admin', 'property_manager']} redirectTo="/tenant"><ErrorBoundary fallback={<ErrorFallbackPage />}><AgentsPage /></ErrorBoundary></RoleGuard>} />
              <Route path="vartotojai" element={<RoleGuard allowedRoles={['landlord', 'admin', 'property_manager']} redirectTo="/tenant"><ErrorBoundary fallback={<ErrorFallbackPage />}><Users /></ErrorBoundary></RoleGuard>} />

              {/* Admin-only dashboard */}
              <Route path="admin" element={
                <RoleGuard allowedRoles={['admin']} redirectTo="/dashboard">
                  <ErrorBoundary fallback={<ErrorFallbackPage />}><AdminDashboard /></ErrorBoundary>
                </RoleGuard>
              } />
              <Route path="admin/performance" element={
                <RoleGuard allowedRoles={['admin']} redirectTo="/dashboard">
                  <ErrorBoundary fallback={<ErrorFallbackPage />}><AdminPerformancePage /></ErrorBoundary>
                </RoleGuard>
              } />

              {/* Shared routes — accessible by all authenticated roles */}
              <Route path="profilis" element={<ErrorBoundary fallback={<ErrorFallbackPage />}><Profile /></ErrorBoundary>} />
              <Route path="pagalba" element={<ErrorBoundary fallback={<ErrorFallbackPage />}><GuidePage /></ErrorBoundary>} />

              {/* Tenant routes — inside AppShell (sidebar + header) */}
              <Route path="tenant" element={
                <RoleGuard allowedRoles={['tenant']} redirectTo="/dashboard">
                  <ErrorBoundary fallback={<ErrorFallbackPage />}><TenantDashboard /></ErrorBoundary>
                </RoleGuard>
              } />
              <Route path="tenant/settings" element={
                <RoleGuard allowedRoles={['tenant']} redirectTo="/dashboard">
                  <ErrorBoundary fallback={<ErrorFallbackPage />}><TenantSettingsPage /></ErrorBoundary>
                </RoleGuard>
              } />
              <Route path="tenant/meters" element={
                <RoleGuard allowedRoles={['tenant']} redirectTo="/dashboard">
                  <ErrorBoundary fallback={<ErrorFallbackPage />}><TenantMeters /></ErrorBoundary>
                </RoleGuard>
              } />
              <Route path="tenant/invoices" element={
                <RoleGuard allowedRoles={['tenant']} redirectTo="/dashboard">
                  <ErrorBoundary fallback={<ErrorFallbackPage />}><TenantInvoices /></ErrorBoundary>
                </RoleGuard>
              } />
              <Route path="tenant/contract" element={
                <RoleGuard allowedRoles={['tenant']} redirectTo="/dashboard">
                  <ErrorBoundary fallback={<ErrorFallbackPage />}><TenantContractPage /></ErrorBoundary>
                </RoleGuard>
              } />
            </Route>

            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/" replace />} />
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
    <PasswordGate>
      <ErrorBoundary>
        <AuthProvider>
          <DataProvider>
            <DensityProvider>
              <AppContent />
            </DensityProvider>
          </DataProvider>
        </AuthProvider>
      </ErrorBoundary>
    </PasswordGate>
  );
}

export default App;