/* eslint-disable react/prop-types */
import React, { useCallback, useEffect, useRef } from 'react';
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
  SparklesIcon
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

// eslint-disable-next-line react/prop-types
const Sidebar: React.FC<SidebarProps> = React.memo(({ isOpen, onClose, currentPage, onPageChange, user }) => {
  // Remove console.log to prevent unnecessary re-renders
  
  const sidebarRef = useRef<HTMLDivElement>(null);
  
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
      }, 300); // Wait for sidebar animation
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
  
  const navigationItems = React.useMemo(() => [
    {
      name: 'Pagrindinis',
      page: 'nuomotojas2',
      icon: HomeIcon,
      description: 'Pagrindinis dashboard',
      badge: 'MAIN'
    },
    {
      name: 'Dashboard',
      page: 'dashboard',
      icon: BuildingOfficeIcon,
      description: 'Senasis dashboard'
    },
    {
      name: 'Nuomotojas',
      page: 'nuomotojas',
      icon: BuildingOfficeIcon,
      description: 'Paprastas nuomotojas',
      badge: '8'
    },
    {
      name: 'Nekilnojamas turtas',
      page: 'properties',
      icon: BuildingOfficeIcon,
      description: 'Turto valdymas',
      badge: '12'
    },
    {
      name: 'Butai',
      page: 'apartments',
      icon: BuildingOfficeIcon,
      description: 'Butų valdymas',
      badge: '17'
    },
    {
      name: 'Nuomininkai',
      page: 'tenants',
      icon: UsersIcon,
      description: 'Nuomininkų sąrašas',
      badge: '8'
    },
    {
      name: 'Sąskaitos',
      page: 'invoices',
      icon: DocumentTextIcon,
      description: 'Mokėjimų valdymas',
      badge: '5'
    },
    {
      name: 'Remontas',
      page: 'maintenance',
      icon: WrenchScrewdriverIcon,
      description: 'Techninis aptarnavimas',
      badge: '3'
    },
    {
      name: 'Analitika',
      page: 'analytics',
      icon: ChartBarIcon,
      description: 'Ataskaitos ir analizė'
    },
    {
      name: 'Vartotojai',
      page: 'users',
      icon: UserIcon,
      description: 'Vartotojų valdymas',
      badge: 'ADMIN'
    },
    {
      name: 'Depozito testai',
      page: 'deposit-tests',
      icon: UserCircleIcon,
      description: 'Depozito skaičiavimų testai',
      badge: 'TEST'
    }
  ], []);

  const secondaryItems = React.useMemo(() => [
    {
      name: 'Nustatymai',
      page: 'settings',
      icon: CogIcon,
      description: 'Sistemos konfigūracija'
    },
    {
      name: 'Pagalba',
      page: 'help',
      icon: BellIcon,
      description: 'Dokumentacija ir palaikymas'
    }
  ], []);

  return (
    <>
      {/* Backdrop for click outside */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40"
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
          {/* Header - Fixed height */}
          <div className="flex-shrink-0 flex items-center justify-center p-4 border-b border-gray-200 bg-white">
            <div className="w-full flex justify-center">
              <img
                src={logoImage}
                alt="Nuomoria"
                className="w-full object-contain mx-auto cursor-pointer hover:opacity-80 transition-opacity duration-200"
                style={{ maxWidth: '240px', maxHeight: '80px', width: 'auto', height: 'auto' }}
                onClick={() => onPageChange('nuomotojas2')}
              />
            </div>
          </div>

          {/* User Info - Fixed height */}
          <div className="flex-shrink-0 p-4 border-b border-gray-200 bg-white">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-[#2f8481] rounded-full flex items-center justify-center">
                <UsersIcon className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-black truncate">
                  {user ? `${user.first_name} ${user.last_name}` : 'User'}
                </p>
                <p className="text-xs text-gray-600 truncate">
                  {user?.email || 'Neprisijungęs'}
                </p>
                <div className="mt-1">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#2f8481] text-white">
                    {user?.role || 'User'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation - Scrollable with smooth scroll */}
          <nav className="flex-1 overflow-y-auto smooth-scroll scroll-optimized">
            <div className="px-3 py-4">
              <div className="space-y-1">
                {navigationItems.map((item) => {
                  const isActive = currentPage === item.page;
                  return (
                    <button
                      key={item.name}
                      data-active={isActive}
                      onClick={() => {
                        handlePageChange(item.page);
                      }}
                      className={`
                        w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 group border-l-4 border-transparent
                        ${isActive 
                          ? 'bg-[#2f8481] text-white shadow-md border-l-white' 
                          : 'text-gray-700 hover:text-[#2f8481] hover:bg-gray-50 border-l-transparent'
                        }
                      `}
                    >
                      <div className="flex items-center space-x-3">
                        <item.icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-gray-600 group-hover:text-[#2f8481]'}`} />
                        <span>{item.name}</span>
                      </div>
                      {item.badge && (
                        <span className={`
                          inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                          ${isActive 
                            ? 'bg-white/20 text-white' 
                            : 'bg-gray-200 text-gray-600 group-hover:bg-[#2f8481] group-hover:text-white'
                          }
                        `}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Secondary Navigation */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="px-4 text-xs font-semibold text-black uppercase tracking-wider mb-3">
                  Sistema
                </h3>
                <div className="space-y-1">
                  {secondaryItems.map((item) => (
                    <button
                      key={item.name}
                      onClick={() => {
                        handlePageChange(item.page);
                      }}
                      className="w-full flex items-center space-x-3 px-4 py-3 text-sm font-medium text-black hover:text-[#2f8481] hover:bg-gray-50 rounded-lg transition-all duration-200 group border-l-4 border-transparent hover:border-l-[#2f8481]"
                    >
                      <item.icon className="h-5 w-5 text-black group-hover:text-[#2f8481]" />
                      <span>{item.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </nav>

          {/* Footer - Fixed height */}
          <div className="flex-shrink-0 p-6 border-t border-gray-200 bg-white">
            <div className="flex items-center space-x-3 p-3 bg-[#2f8481] rounded-lg">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <SparklesIcon className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">AI Assistant</p>
                <p className="text-xs text-white/80">Get instant help</p>
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