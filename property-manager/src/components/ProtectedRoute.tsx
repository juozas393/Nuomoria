import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();
  const [waitOver, setWaitOver] = React.useState(false);

  React.useEffect(() => {
    // Security: Don't log sensitive user data in production
    const t = setTimeout(() => {
      // waitOver timeout reached - logging removed for production
      setWaitOver(true);
    }, 15000); // Increased to 15s to give more time for session restoration
    return () => clearTimeout(t);
  }, [loading, isAuthenticated, user]);

  // Show loading while checking authentication
  if (loading && !waitOver) {
    // showing loading screen - logging removed for production
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm">Tikrinama autentifikacija...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    // not authenticated, redirecting to login - logging removed for production
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Render protected content if authenticated
  // authenticated, rendering children - logging removed for production
  return <>{children}</>;
};
