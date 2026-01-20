import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Bars3Icon,
  XMarkIcon,
  MagnifyingGlassIcon,
  BellIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  QuestionMarkCircleIcon,
  ArrowRightOnRectangleIcon,
  HomeIcon,
  BuildingOfficeIcon,
  UsersIcon,
  DocumentTextIcon,
  WrenchScrewdriverIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';

interface AmazingNavbarProps {
  onMenuToggle: () => void;
  currentPage: string;
  sidebarOpen?: boolean;
}

const AmazingNavbar: React.FC<AmazingNavbarProps> = React.memo(({ onMenuToggle, currentPage, sidebarOpen = false }) => {
  const { user, logout } = useAuth();

  // Debug info
  console.log('AmazingNavbar - sidebarOpen:', sidebarOpen);


  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Memoized handlers
  const handleLogout = useCallback(() => {
    console.log('Logout clicked');
    logout();
    setUserMenuOpen(false);
  }, [logout]);

  const handleMenuToggle = useCallback(() => {
    console.log('Hamburger clicked!');
    onMenuToggle();
  }, [onMenuToggle]);

  const handleSearchToggle = useCallback(() => {
    setSearchOpen(!searchOpen);
  }, [searchOpen]);

  const handleNotificationsToggle = useCallback(() => {
    setNotificationsOpen(!notificationsOpen);
  }, [notificationsOpen]);

  const handleUserMenuToggle = useCallback(() => {
    setUserMenuOpen(!userMenuOpen);
  }, [userMenuOpen]);

  // Page information
  const getPageInfo = (page: string) => {
    const pages = {
      dashboard: { title: 'Dashboard', icon: HomeIcon, subtitle: 'Main page' },
      properties: { title: 'Properties', icon: BuildingOfficeIcon, subtitle: 'Property management' },
      tenants: { title: 'Tenants', icon: UsersIcon, subtitle: 'Tenant list' },
      invoices: { title: 'Invoices', icon: DocumentTextIcon, subtitle: 'Payment management' },
      maintenance: { title: 'Maintenance', icon: WrenchScrewdriverIcon, subtitle: 'Technical maintenance' },
      analytics: { title: 'Analytics', icon: ChartBarIcon, subtitle: 'Reports and analysis' }
    };
    return pages[page as keyof typeof pages] || pages.dashboard;
  };

  const pageInfo = getPageInfo(currentPage);
  const PageIcon = pageInfo.icon;

  // Notifications data
  const notifications = [
    {
      id: 1,
      title: 'New payment received',
      message: 'Vokiečių 117 - 850€ payment successfully received',
      time: '2 min',
      unread: true,
      type: 'payment',
      amount: '850€',
      priority: 'high'
    },
    {
      id: 2,
      title: 'Maintenance request',
      message: 'Vokiečių 117 - plumbing issues require attention',
      time: '15 min',
      unread: true,
      type: 'maintenance',
      priority: 'medium'
    },
    {
      id: 3,
      title: 'New tenant',
      message: 'Jonas Jonaitis - Vokiečių 117 lease agreement signed',
      time: '1 hour',
      unread: false,
      type: 'tenant',
      priority: 'low'
    }
  ];

  const unreadCount = notifications.filter(n => n.unread).length;

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setNotificationsOpen(false);
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-primary-100 text-primary-800 border-primary-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'payment': return DocumentTextIcon;
      case 'maintenance': return WrenchScrewdriverIcon;
      case 'tenant': return UsersIcon;
      default: return BellIcon;
    }
  };

  return (
    <nav className="bg-white border-b border-gray-200 shadow-soft">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            <button
              onClick={handleMenuToggle}
              className="flex-shrink-0 p-3 sm:p-4 rounded-lg text-gray-600 hover:text-primary-600 hover:bg-primary-50 active:bg-primary-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 z-10 min-w-[48px] min-h-[48px] touch-manipulation border border-gray-200 hover:border-primary-300"
              aria-label="Toggle menu"
              style={{ touchAction: 'manipulation' }}
            >
              {sidebarOpen ? (
                <XMarkIcon className="h-5 w-5 sm:h-6 sm:w-6" />
              ) : (
                <Bars3Icon className="h-5 w-5 sm:h-6 sm:w-6" />
              )}
            </button>

            {/* Page info - hidden on mobile, visible on desktop */}
            <div className="hidden md:flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                <PageIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-black">{pageInfo.title}</h1>
                <p className="text-sm text-gray-500">{pageInfo.subtitle}</p>
              </div>
            </div>

            {/* Mobile page title */}
            <div className="md:hidden flex items-center space-x-2 ml-2">
              <div className="w-6 h-6 bg-primary-500 rounded flex items-center justify-center">
                <PageIcon className="h-4 w-4 text-white" />
              </div>
              <h1 className="text-lg font-semibold text-black truncate">{pageInfo.title}</h1>
            </div>
          </div>

          {/* Center - Search */}
          <div className="flex-1 hidden lg:block max-w-lg mx-4">
            <div className="relative" ref={searchRef}>
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search properties, tenants, invoices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-xl text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
              />
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Search button for mobile */}
            <button
              onClick={handleSearchToggle}
              className="lg:hidden p-2 rounded-lg text-gray-600 hover:text-primary-600 hover:bg-primary-50 transition-all duration-200"
            >
              <MagnifyingGlassIcon className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>

            {/* Notifications */}
            <div className="relative" ref={notificationsRef}>
              <button
                onClick={handleNotificationsToggle}
                className="relative p-2 rounded-lg text-gray-600 hover:text-primary-600 hover:bg-primary-50 transition-all duration-200"
              >
                <BellIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications dropdown */}
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-strong border border-gray-200 z-50">
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-black">Notifications</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.map((notification) => {
                      const TypeIcon = getTypeIcon(notification.type);
                      return (
                        <div
                          key={notification.id}
                          className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition-all duration-200 ${notification.unread ? 'bg-blue-50' : ''
                            }`}
                        >
                          <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0">
                              <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                                <TypeIcon className="h-4 w-4 text-primary-600" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-black">{notification.title}</p>
                              <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-xs text-gray-500">{notification.time}</span>
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(notification.priority)}`}>
                                  {notification.priority}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="p-4 border-t border-gray-200">
                    <button className="w-full text-sm text-primary-600 hover:text-primary-700 font-medium">
                      View all notifications
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Profile */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={handleUserMenuToggle}
                className="flex items-center space-x-2 p-2 rounded-lg text-gray-600 hover:text-primary-600 hover:bg-primary-50 transition-all duration-200 border-b-2 border-transparent hover:border-b-primary-500"
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center overflow-hidden bg-primary-500">
                  {(user as any)?.avatar_url ? (
                    <img
                      src={(user as any).avatar_url}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-white text-xs sm:text-sm font-semibold">
                      {user?.first_name?.[0]}{user?.last_name?.[0]}
                    </span>
                  )}
                </div>
                <span className="hidden md:block text-sm font-medium text-black">
                  {(() => {
                    const fn = user?.first_name && user.first_name !== 'User' ? user.first_name : null;
                    const ln = user?.last_name && user.last_name !== 'Name' ? user.last_name : null;
                    if (fn && ln) return `${fn} ${ln}`;
                    if (fn) return fn;
                    if ((user as any)?.username) return (user as any).username;
                    return user?.email || 'Vartotojas';
                  })()}
                </span>
                <QuestionMarkCircleIcon className="h-4 w-4 text-gray-400" />
              </button>

              {/* Profile dropdown */}
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-strong border border-gray-200 z-50">
                  <div className="p-4 border-b border-gray-200">
                    <p className="text-sm font-medium text-black">
                      {(() => {
                        const fn = user?.first_name && user.first_name !== 'User' ? user.first_name : null;
                        const ln = user?.last_name && user.last_name !== 'Name' ? user.last_name : null;
                        if (fn && ln) return `${fn} ${ln}`;
                        if (fn) return fn;
                        if ((user as any)?.username) return (user as any).username;
                        return user?.email || 'Vartotojas';
                      })()}
                    </p>
                    <p className="text-sm text-gray-500">{user?.email}</p>
                  </div>
                  <div className="p-2">
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        window.location.href = '/profilis';
                      }}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200"
                    >
                      <UserCircleIcon className="h-4 w-4" />
                      <span>Profilis</span>
                    </button>
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        window.location.href = '/nustatymai';
                      }}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200"
                    >
                      <Cog6ToothIcon className="h-4 w-4" />
                      <span>Nustatymai</span>
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                    >
                      <ArrowRightOnRectangleIcon className="h-4 w-4" />
                      <span>Atsijungti</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile search */}
        {searchOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-xl text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
              />
            </div>
          </div>
        )}
      </div>
    </nav>
  );
});

export default AmazingNavbar; 