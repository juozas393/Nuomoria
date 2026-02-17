import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  UserCircleIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  QuestionMarkCircleIcon,
  HomeIcon,
  BuildingOfficeIcon,
  HomeModernIcon,
  UsersIcon,
  DocumentTextIcon,
  WrenchScrewdriverIcon,
  ChartBarIcon,
  Bars3Icon,
  XMarkIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import Sidebar from '../Sidebar';
import { useAuth } from '../../context/AuthContext';
import { NotificationBell, NotificationCenter } from '../NotificationCenter';

/* ─── page config: label + icon ─── */
interface PageMeta {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const PAGE_META: Record<string, PageMeta> = {
  '': { label: 'Apžvalga', icon: HomeIcon },
  'dashboard': { label: 'Apžvalga', icon: HomeIcon },
  'turtas': { label: 'Nekilnojamas turtas', icon: BuildingOfficeIcon },
  'butai': { label: 'Butai', icon: HomeModernIcon },
  'nuomininkai': { label: 'Nuomininkai', icon: UsersIcon },
  'saskaitos': { label: 'Sąskaitos', icon: DocumentTextIcon },
  'remontas': { label: 'Remontas', icon: WrenchScrewdriverIcon },
  'analitika': { label: 'Ataskaitos', icon: ChartBarIcon },
  'nustatymai': { label: 'Nustatymai', icon: Cog6ToothIcon },
  'profilis': { label: 'Profilis', icon: UserCircleIcon },
  'vartotojai': { label: 'Vartotojai', icon: UsersIcon },
  'tenant': { label: 'Nuomininko sritis', icon: HomeIcon },
  'pagalba': { label: 'Pagalba', icon: QuestionMarkCircleIcon },
  'deposit-tests': { label: 'Depozito testai', icon: DocumentTextIcon },
};

const DEFAULT_META: PageMeta = { label: '', icon: HomeIcon };

/* ─── helpers ─── */
function getUserInitials(user: any): string {
  if (user?.username) return user.username.slice(0, 2).toUpperCase();
  const fn = user?.first_name && user.first_name !== 'User' ? user.first_name : null;
  const ln = user?.last_name && user.last_name !== 'Name' ? user.last_name : null;
  if (fn || ln) return ((fn?.[0] || '') + (ln?.[0] || '')).toUpperCase() || '?';
  if (user?.email) return user.email.split('@')[0].slice(0, 2).toUpperCase();
  return 'U';
}

function getUserDisplayName(user: any): string {
  if (user?.username) return user.username;
  const fn = user?.first_name && user.first_name !== 'User' ? user.first_name : null;
  const ln = user?.last_name && user.last_name !== 'Name' ? user.last_name : null;
  if (fn && ln) return `${fn} ${ln}`;
  if (fn) return fn;
  return user?.email || 'Vartotojas';
}

function getUserRoleLabel(user: any): string {
  if (user?.role === 'landlord') return 'Nuomotojas';
  if (user?.role === 'tenant') return 'Nuomininkas';
  if (user?.role === 'admin') return 'Administratorius';
  return user?.role || 'Vartotojas';
}

/* ─── AppShell ─── */
export const AppShell: React.FC = React.memo(() => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const toggleSidebar = useCallback(() => setSidebarOpen(prev => !prev), []);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [currentPage, setCurrentPage] = useState('');
  const userMenuRef = useRef<HTMLDivElement>(null);

  /* Derive page meta from route */
  const pageMeta = useMemo(() => {
    const slug = location.pathname.replace(/^\/+/, '').split('/')[0] || '';
    const meta = PAGE_META[slug];
    if (meta) return meta;
    return { label: slug.charAt(0).toUpperCase() + slug.slice(1), icon: DEFAULT_META.icon };
  }, [location.pathname]);

  const handlePageChange = useCallback((page: string) => {
    setCurrentPage(page);
    navigate(`/${page}`);
  }, [navigate]);

  const handleLogout = useCallback(() => {
    setUserMenuOpen(false);
    logout();
    navigate('/login');
  }, [logout, navigate]);

  /* Close dropdown on outside click */
  useEffect(() => {
    if (!userMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [userMenuOpen]);

  const initials = getUserInitials(user);
  const displayName = getUserDisplayName(user);
  const roleLabel = getUserRoleLabel(user);
  const avatarUrl = (user as any)?.avatar_url;
  const PageIcon = pageMeta.icon;

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

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* ═══ HEADER ═══ */}
        <header
          className={`
            relative z-30 bg-white/80 backdrop-blur-xl border-b border-gray-200/60
            transition-[margin-left] duration-300 ease-out
            ${sidebarOpen ? 'lg:ml-64' : 'ml-0'}
          `}
        >
          {/* Main bar */}
          <div className="flex items-center justify-between h-16 px-4 lg:px-6">
            {/* ── LEFT: toggle + page context ── */}
            <div className="flex items-center gap-4">
              {/* Menu toggle — clean + animated */}
              <button
                onClick={toggleSidebar}
                className="relative w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:text-[#2F8481] hover:bg-[#2F8481]/5 active:scale-95 transition-all duration-200"
                aria-label={sidebarOpen ? 'Uždaryti meniu' : 'Atidaryti meniu'}
              >
                <div className="relative w-5 h-5">
                  {/* Hamburger icon */}
                  <Bars3Icon
                    className={`absolute inset-0 w-5 h-5 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${sidebarOpen ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'
                      }`}
                  />
                  {/* X icon */}
                  <XMarkIcon
                    className={`absolute inset-0 w-5 h-5 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${sidebarOpen ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'
                      }`}
                  />
                </div>
              </button>

              {/* Page icon + title */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#2F8481]/8 flex items-center justify-center" style={{ backgroundColor: 'rgba(47,132,129,0.08)' }}>
                  <PageIcon className="w-[18px] h-[18px] text-[#2F8481]" />
                </div>
                <div>
                  <h1 className="text-[15px] font-semibold text-gray-900 leading-tight">
                    {pageMeta.label}
                  </h1>
                  <p className="text-[11px] text-gray-400 font-medium leading-tight mt-0.5 hidden sm:block">
                    {roleLabel} · Nuomoria
                  </p>
                </div>
              </div>
            </div>

            {/* ── CENTER: spacer ── */}
            <div className="hidden lg:flex flex-1" />

            {/* ── RIGHT: notifications + user ── */}
            <div className="flex items-center gap-1.5">
              {/* Notifications */}
              <div className="p-1">
                <NotificationBell onClick={() => setNotificationsOpen(true)} />
              </div>

              {/* Divider */}
              <div className="w-px h-6 bg-gray-200/80 mx-2 hidden sm:block" />

              {/* User */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(p => !p)}
                  className={`
                    flex items-center gap-2.5 py-1.5 pl-1.5 pr-3 rounded-xl
                    transition-all duration-200
                    ${userMenuOpen
                      ? 'bg-gray-100/80 ring-1 ring-gray-200/60'
                      : 'hover:bg-gray-50'
                    }
                  `}
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2F8481] to-[#297a77] flex items-center justify-center overflow-hidden shadow-sm shadow-[#2F8481]/20">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white text-xs font-bold leading-none select-none">
                          {initials}
                        </span>
                      )}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white" />
                  </div>

                  <div className="hidden sm:flex items-center gap-1.5">
                    <span className="text-sm font-medium text-gray-700 max-w-[130px] truncate">
                      {displayName}
                    </span>
                    <svg
                      className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* Dropdown */}
                {userMenuOpen && (
                  <div
                    className="absolute right-0 mt-2 w-72 rounded-2xl bg-white border border-gray-200/80 shadow-xl shadow-black/[0.06] overflow-hidden z-[60]"
                    style={{ animation: 'headerDrop 180ms cubic-bezier(0.16,1,0.3,1)' }}
                  >
                    {/* User info */}
                    <div className="p-4 bg-gradient-to-br from-gray-50 to-white border-b border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#2F8481] to-[#297a77] flex items-center justify-center flex-shrink-0 overflow-hidden shadow-md shadow-[#2F8481]/15">
                          {avatarUrl ? (
                            <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-white text-sm font-bold">{initials}</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
                          <p className="text-xs text-gray-500 truncate mt-0.5">{user?.email}</p>
                          <span className="inline-flex items-center mt-1.5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide rounded-full bg-[#2F8481]/10 text-[#2F8481]">
                            {roleLabel}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Menu items */}
                    <div className="py-1.5">
                      {[
                        { label: 'Profilis', icon: UserCircleIcon, action: () => { setUserMenuOpen(false); navigate('/profilis'); } },
                        { label: 'Nustatymai', icon: Cog6ToothIcon, action: () => { setUserMenuOpen(false); navigate('/nustatymai'); } },
                        { label: 'Pagalba', icon: QuestionMarkCircleIcon, action: () => { setUserMenuOpen(false); navigate('/pagalba'); } },
                      ].map(item => (
                        <button
                          key={item.label}
                          onClick={item.action}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors group"
                        >
                          <item.icon className="w-[18px] h-[18px] text-gray-400 group-hover:text-[#2F8481] transition-colors" />
                          <span>{item.label}</span>
                        </button>
                      ))}
                    </div>

                    {/* Logout */}
                    <div className="border-t border-gray-100 py-1.5">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <ArrowRightOnRectangleIcon className="w-[18px] h-[18px]" />
                        <span>Atsijungti</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Clean bottom separator — already provided by border-b on header */}
        </header>

        {/* Page content */}
        <main className={`flex-1 overflow-auto relative transition-[margin-left] duration-300 ease-out ${sidebarOpen ? 'lg:ml-64' : 'ml-0'}`}>
          <Outlet />
        </main>
      </div>

      {/* Notification Center */}
      <NotificationCenter
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
      />

      <style>{`
        @keyframes headerDrop {
          from { opacity: 0; transform: translateY(-8px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
});

AppShell.displayName = 'AppShell';
