import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
    Home,
    Gauge,
    FileText,
    Settings,
    LogOut,
    User,
    ChevronDown,
    Menu,
    X,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { NotificationBell, NotificationCenter } from '../../../components/NotificationCenter';

/* ─── Nav items ─── */
interface NavItem {
    path: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
    { path: '/tenant', label: 'Skydelis', icon: Home },
    { path: '/tenant/meters', label: 'Skaitikliai', icon: Gauge },
    { path: '/tenant/invoices', label: 'Sąskaitos', icon: FileText },
    { path: '/tenant/contract', label: 'Sutartis', icon: FileText },
    { path: '/tenant/settings', label: 'Nustatymai', icon: Settings },
];

/* ─── Helpers ─── */
function getUserInitials(user: any): string {
    const name = user?.user_metadata?.full_name || user?.first_name;
    if (name) {
        const parts = name.split(' ').filter(Boolean);
        return parts.map((p: string) => p[0]).join('').toUpperCase().slice(0, 2);
    }
    if (user?.email) return user.email.split('@')[0].slice(0, 2).toUpperCase();
    return 'U';
}

function getUserDisplayName(user: any): string {
    return user?.user_metadata?.full_name || user?.first_name || user?.email?.split('@')[0] || 'Naudotojas';
}

/* ─── Component ─── */
const TenantHeader: React.FC = React.memo(() => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const userMenuRef = useRef<HTMLDivElement>(null);

    const initials = getUserInitials(user);
    const displayName = getUserDisplayName(user);
    const avatarUrl = (user as any)?.user_metadata?.avatar_url || (user as any)?.avatar_url;

    // Active path detection
    const isActive = useCallback((path: string) => {
        if (path === '/tenant') return location.pathname === '/tenant';
        return location.pathname.startsWith(path);
    }, [location.pathname]);

    // Close user menu on outside click
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

    const handleLogout = useCallback(() => {
        setUserMenuOpen(false);
        logout();
        navigate('/login');
    }, [logout, navigate]);

    return (
        <>
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200/60">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-14">
                        {/* ── LEFT: Logo + Brand ── */}
                        <div className="flex items-center gap-3">
                            <Link to="/tenant" className="flex items-center gap-2.5 group">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2F8481] to-[#267370] flex items-center justify-center shadow-sm">
                                    <Home className="w-4 h-4 text-white" />
                                </div>
                                <span className="text-[15px] font-bold text-gray-900 hidden sm:block">
                                    Nuomoria
                                </span>
                            </Link>

                            {/* Desktop nav */}
                            <nav className="hidden lg:flex items-center ml-6 gap-1">
                                {NAV_ITEMS.map(item => {
                                    const active = isActive(item.path);
                                    return (
                                        <Link
                                            key={item.path}
                                            to={item.path}
                                            className={`
                                            flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-200
                                            ${active
                                                    ? 'bg-[#2F8481]/10 text-[#2F8481]'
                                                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/80'
                                                }
                                        `}
                                        >
                                            <item.icon className={`w-4 h-4 ${active ? 'text-[#2F8481]' : 'text-gray-400'}`} />
                                            {item.label}
                                        </Link>
                                    );
                                })}
                            </nav>
                        </div>

                        {/* ── RIGHT: Notifications + User + Mobile toggle ── */}
                        <div className="flex items-center gap-1.5">
                            {/* Notification bell */}
                            <NotificationBell onClick={() => setNotificationsOpen(true)} />

                            {/* Divider */}
                            <div className="w-px h-6 bg-gray-200/80 mx-1.5 hidden sm:block" />

                            {/* User menu */}
                            <div className="relative" ref={userMenuRef}>
                                <button
                                    onClick={() => setUserMenuOpen(p => !p)}
                                    className={`
                                    flex items-center gap-2 py-1 pl-1 pr-2.5 rounded-xl transition-all duration-200
                                    ${userMenuOpen ? 'bg-gray-100/80 ring-1 ring-gray-200/60' : 'hover:bg-gray-50'}
                                `}
                                >
                                    <div className="relative flex-shrink-0">
                                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#2F8481] to-[#267370] flex items-center justify-center overflow-hidden shadow-sm">
                                            {avatarUrl ? (
                                                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-white text-[10px] font-bold leading-none select-none">
                                                    {initials}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <span className="hidden sm:block text-[13px] font-medium text-gray-700 max-w-[120px] truncate">
                                        {displayName}
                                    </span>
                                    <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 hidden sm:block ${userMenuOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {/* User dropdown */}
                                {userMenuOpen && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                                        <div
                                            className="absolute right-0 mt-2 w-64 rounded-2xl bg-white border border-gray-200/80 shadow-xl shadow-black/[0.06] overflow-hidden z-50"
                                            style={{ animation: 'tenantHeaderDrop 180ms cubic-bezier(0.16,1,0.3,1)' }}
                                        >
                                            {/* User info */}
                                            <div className="p-3.5 bg-gradient-to-br from-gray-50 to-white border-b border-gray-100">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2F8481] to-[#267370] flex items-center justify-center flex-shrink-0 overflow-hidden shadow-md shadow-[#2F8481]/15">
                                                        {avatarUrl ? (
                                                            <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="text-white text-sm font-bold">{initials}</span>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
                                                        <p className="text-xs text-gray-500 truncate mt-0.5">{user?.email}</p>
                                                        <span className="inline-flex items-center mt-1 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide rounded-full bg-[#2F8481]/10 text-[#2F8481]">
                                                            Nuomininkas
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Menu items */}
                                            <div className="py-1.5">
                                                <button
                                                    onClick={() => { setUserMenuOpen(false); navigate('/tenant/settings'); }}
                                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors group"
                                                >
                                                    <User className="w-[18px] h-[18px] text-gray-400 group-hover:text-[#2F8481] transition-colors" />
                                                    <span>Profilis ir nustatymai</span>
                                                </button>
                                            </div>

                                            {/* Logout */}
                                            <div className="border-t border-gray-100 py-1.5">
                                                <button
                                                    onClick={handleLogout}
                                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                                >
                                                    <LogOut className="w-[18px] h-[18px]" />
                                                    <span>Atsijungti</span>
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Mobile menu toggle */}
                            <button
                                onClick={() => setMobileMenuOpen(p => !p)}
                                className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:text-[#2F8481] hover:bg-[#2F8481]/5 transition-colors ml-1"
                                aria-label="Meniu"
                            >
                                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    {/* Mobile nav */}
                    {mobileMenuOpen && (
                        <nav className="lg:hidden pb-3 pt-1 border-t border-gray-100 mt-1">
                            <div className="flex flex-col gap-1">
                                {NAV_ITEMS.map(item => {
                                    const active = isActive(item.path);
                                    return (
                                        <Link
                                            key={item.path}
                                            to={item.path}
                                            onClick={() => setMobileMenuOpen(false)}
                                            className={`
                                            flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors
                                            ${active
                                                    ? 'bg-[#2F8481]/10 text-[#2F8481]'
                                                    : 'text-gray-600 hover:bg-gray-100'
                                                }
                                        `}
                                        >
                                            <item.icon className={`w-5 h-5 ${active ? 'text-[#2F8481]' : 'text-gray-400'}`} />
                                            {item.label}
                                        </Link>
                                    );
                                })}
                            </div>
                        </nav>
                    )}
                </div>

                <style>{`
                @keyframes tenantHeaderDrop {
                    from { opacity: 0; transform: translateY(-8px) scale(0.96); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
            </header>
            {/* Notification Center */}
            <NotificationCenter
                isOpen={notificationsOpen}
                onClose={() => setNotificationsOpen(false)}
            />
        </>
    );
});

TenantHeader.displayName = 'TenantHeader';
export default TenantHeader;
