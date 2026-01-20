/* eslint-disable react/prop-types */
import React, { useCallback, useEffect, useRef, useMemo } from 'react';
import {
  HomeIcon,
  UsersIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  CogIcon,
  BellIcon,
  UserCircleIcon,
  UserIcon,
  DocumentTextIcon,
  WrenchScrewdriverIcon,
  SparklesIcon,
  HomeModernIcon
} from '@heroicons/react/24/outline';
import { smoothScrollTo } from '../utils/smoothScroll';
import type { UserWithPermissions } from '../types/user';
import logoImage from '../assets/logocanv.png';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentPage: string;
  onPageChange: (page: string) => void;
  user: UserWithPermissions | null;
}

// Menu item type with role and group support
interface NavItem {
  name: string;
  page: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  requiredRole?: 'admin';
  featureFlag?: 'dev';
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

// eslint-disable-next-line react/prop-types
const Sidebar: React.FC<SidebarProps> = React.memo(({ isOpen, onClose, currentPage, onPageChange, user }) => {
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Check if user is admin
  const isAdmin = user?.role === 'admin';
  const isDev = process.env.NODE_ENV === 'development';

  // Memoized close handler
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // Memoized page change handler
  const handlePageChange = useCallback((page: string) => {
    onPageChange(page);
    onClose();

    // GitHub-style smooth scroll to top after navigation
    setTimeout(() => {
      smoothScrollTo(document.body, {
        duration: 600,
        offset: 0,
        easing: 'ease-out'
      });
    }, 100);
  }, [onPageChange, onClose]);

  // Smooth scroll to active item when sidebar opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        const activeItem = document.querySelector('[data-active="true"]');
        if (activeItem) {
          activeItem.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest'
          });
        }
      }, 300);
    }
  }, [isOpen, currentPage]);

  // Handle escape key to close sidebar
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (isOpen && sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, handleClose]);

  // New grouped menu structure
  const navigationGroups: NavGroup[] = useMemo(() => [
    {
      title: 'PAGRINDINIS',
      items: [
        { name: 'Apžvalga', page: '', icon: HomeIcon }
      ]
    },
    {
      title: 'TURTAS',
      items: [
        { name: 'Nekilnojamas turtas', page: 'turtas', icon: BuildingOfficeIcon },
        { name: 'Butai', page: 'butai', icon: HomeModernIcon },
        { name: 'Nuomininkai', page: 'nuomininkai', icon: UsersIcon }
      ]
    },
    {
      title: 'OPERACIJOS',
      items: [
        { name: 'Sąskaitos', page: 'saskaitos', icon: DocumentTextIcon },
        { name: 'Remontas', page: 'remontas', icon: WrenchScrewdriverIcon }
      ]
    },
    {
      title: 'ANALITIKA',
      items: [
        { name: 'Ataskaitos', page: 'analitika', icon: ChartBarIcon }
      ]
    },
    {
      title: 'SISTEMA',
      items: [
        { name: 'Nustatymai', page: 'nustatymai', icon: CogIcon },
        { name: 'Profilis', page: 'profilis', icon: UserCircleIcon }
      ]
    },
    // Admin-only section
    ...(isAdmin ? [{
      title: 'ADMIN',
      items: [
        { name: 'Vartotojai', page: 'vartotojai', icon: UserIcon }
      ]
    }] : []),
    // Dev-only section
    ...(isDev ? [{
      title: 'DEV',
      items: [
        { name: 'Depozito testai', page: 'deposit-tests', icon: SparklesIcon }
      ]
    }] : [])
  ], [isAdmin, isDev]);

  // Render navigation item
  const renderNavItem = (item: NavItem, isActive: boolean) => (
    <button
      key={item.page}
      data-active={isActive}
      onClick={() => handlePageChange(item.page)}
      className={`
        w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-150 group
        ${isActive
          ? 'bg-[#2f8481] text-white shadow-sm'
          : 'text-gray-700 hover:text-[#2f8481] hover:bg-gray-50'
        }
      `}
    >
      <div className="flex items-center gap-3">
        <item.icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-[#2f8481]'}`} />
        <span>{item.name}</span>
      </div>
      {item.badge && (
        <span className={`
          inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
          ${isActive
            ? 'bg-white/20 text-white'
            : 'bg-gray-100 text-gray-600'
          }
        `}>
          {item.badge}
        </span>
      )}
    </button>
  );

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      <div
        ref={sidebarRef}
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 shadow-lg
          transform transition-transform duration-300 ease-out
          flex flex-col h-full max-h-screen overflow-hidden
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Logo Header */}
          <div className="flex-shrink-0 flex items-center justify-center p-4 border-b border-gray-100 bg-white">
            <img
              src={logoImage}
              alt="Nuomoria"
              className="w-full object-contain cursor-pointer hover:opacity-80 transition-opacity"
              style={{ maxWidth: '200px', maxHeight: '60px' }}
              onClick={() => onPageChange('')}
            />
          </div>

          {/* User Info */}
          <div className="flex-shrink-0 px-4 py-3 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden bg-[#2f8481]">
                {(user as any)?.avatar_url ? (
                  <img
                    src={(user as any).avatar_url}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white text-sm font-semibold">
                    {user?.first_name?.[0]}{user?.last_name?.[0]}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user ? `${user.first_name} ${user.last_name}` : 'User'}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 truncate">{user?.email}</span>
                </div>
              </div>
              <span className="px-2 py-0.5 text-xs font-medium bg-[#2f8481]/10 text-[#2f8481] rounded-md flex-shrink-0">
                {user?.role === 'landlord' ? 'Nuomotojas' : user?.role || 'User'}
              </span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-3">
            {navigationGroups.map((group, groupIndex) => (
              <div key={group.title} className={groupIndex > 0 ? 'mt-4 pt-4 border-t border-gray-100 mx-3' : 'px-3'}>
                <h3 className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {group.title}
                </h3>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const isActive = currentPage === item.page;
                    return renderNavItem(item, isActive);
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Footer */}
          <div className="flex-shrink-0 p-4 border-t border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-[#2f8481] to-[#3a9b98] rounded-xl cursor-pointer hover:shadow-md transition-shadow">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <SparklesIcon className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">AI Asistentas</p>
                <p className="text-xs text-white/70">Gauk pagalbą</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;