import React, { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import Sidebar from '../Sidebar';
import CompleteProfileModal from '../auth/CompleteProfileModal';
import { useUIState, useUIActions } from '../../context/PerformanceContext';
import { useAuth } from '../../context/AuthContext';
import { NotificationBell, NotificationCenter } from './NotificationCenter';
import { getUserDisplayName, getUserInitials, getUserSecondaryLabel } from '../../utils/userDisplay';
import { getDefaultRouteForRole } from '../../utils/roleRouting';

export const AppShell: React.FC = React.memo(() => {
  const { sidebarOpen } = useUIState();
  const { toggleSidebar, setSidebarOpen } = useUIActions();
  const { user, logout, needsProfileSetup } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const defaultRoute = useMemo(() => getDefaultRouteForRole(user?.role), [user?.role]);
  const defaultPage = useMemo(() => defaultRoute.replace(/^\//, ''), [defaultRoute]);
  const [currentPage, setCurrentPage] = useState(defaultPage);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia('(min-width: 1024px)');

    const updateSidebar = (matches: boolean) => {
      setSidebarOpen(matches);
    };

    updateSidebar(mediaQuery.matches);

    const listener = (event: MediaQueryListEvent) => {
      updateSidebar(event.matches);
    };

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }

    mediaQuery.addListener(listener);
    return () => mediaQuery.removeListener(listener);
  }, [setSidebarOpen]);

  useEffect(() => {
    const page = location.pathname.replace('/', '') || defaultPage;
    setCurrentPage(page);
  }, [location.pathname, defaultPage]);

  const handlePageChange = (page: string) => {
    setCurrentPage(page);
    navigate(`/${page}`);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const displayName = getUserDisplayName(user);
  const userInitials = getUserInitials(user);
  const secondaryLabel = getUserSecondaryLabel(user);
  const avatarUrl = user?.avatar_url ? user.avatar_url.trim() : null;

  return (
    <div className="flex h-screen bg-gray-50">
      <CompleteProfileModal open={needsProfileSetup} />
      {/* Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        currentPage={currentPage}
        onPageChange={handlePageChange}
        user={user}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className={`bg-white border-b border-gray-200 px-6 py-4 relative z-50 transition-all duration-300 ease-out ml-0 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-0'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleSidebar}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h1 className="text-xl font-semibold text-gray-900">Turto valdymas</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <NotificationBell onClick={() => setNotificationsOpen(true)} />
              
              {/* User menu */}
              <div className="relative">
                <button 
                  onClick={() => navigate('/profile')}
                  className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      className="h-8 w-8 rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2F8481]/10 text-sm font-semibold text-[#2F8481]">
                      {userInitials}
                    </div>
                  )}
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-medium text-gray-700">{displayName}</span>
                    <span className="text-xs text-gray-500">{secondaryLabel}</span>
                  </div>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              {/* Logout button */}
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                title="Atsijungti"
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5" />
                <span className="hidden sm:inline">Atsijungti</span>
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className={`flex-1 overflow-auto relative transition-all duration-300 ease-out ml-0 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-0'}`}>
          <Outlet />
        </main>
      </div>

      {/* Notification Center */}
      <NotificationCenter 
        isOpen={notificationsOpen} 
        onClose={() => setNotificationsOpen(false)} 
      />
    </div>
  );
});

AppShell.displayName = 'AppShell';
