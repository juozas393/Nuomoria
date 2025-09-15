import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import Sidebar from '../Sidebar';
import { useUIState, useUIActions } from '../../context/PerformanceContext';
import { useAuth } from '../../context/AuthContext';
import { NotificationBell, NotificationCenter } from '../NotificationCenter';

export const AppShell: React.FC = React.memo(() => {
  const { sidebarOpen } = useUIState();
  const { toggleSidebar } = useUIActions();
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState('nuomotojas2');
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const handlePageChange = (page: string) => {
    setCurrentPage(page);
    navigate(`/${page}`);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen}
        onClose={toggleSidebar}
        currentPage={currentPage}
        onPageChange={handlePageChange}
        user={user}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className={`bg-white border-b border-gray-200 px-6 py-4 relative z-50 transition-all duration-300 ease-out ${sidebarOpen ? 'ml-64' : 'ml-0'}`}>
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
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {user?.first_name?.[0] || user?.email?.[0] || 'U'}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {user?.first_name || user?.email || 'Neprisijungęs'}
                  </span>
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
        <main className={`flex-1 overflow-auto relative transition-all duration-300 ease-out ${sidebarOpen ? 'ml-64' : 'ml-0'}`}>
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
