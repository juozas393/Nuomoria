import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useTenantDashboardData } from '../hooks/useTenantDashboardData';
import TenantAccountHome from '../components/TenantAccountHome';
import MessagingPanel from '../../../components/MessagingPanel';
import {
    Home,
    Euro,
    Calendar,
    Wrench,
    FileText,
    Bell,
    CreditCard,
    Gauge,
    AlertTriangle,
    ChevronDown,
    Check,
    Clock,
    Phone,
    User,
    Download,
    ExternalLink,
    Moon,
    Sun,
    MapPin,
    Building,
    AlertCircle,
    Mail,
    LogOut,
    Settings
} from 'lucide-react';

// Simple toast helper (replace with react-hot-toast if available)
const toast = (message: string, options?: { icon?: string }) => {
    console.log(`Toast: ${options?.icon || ''} ${message}`);
    // Could show a simple notification UI here
};
toast.success = (message: string) => console.log(`✅ ${message}`);
toast.error = (message: string) => console.log(`❌ ${message}`);

/**
 * Nuomininko Skydelis - Premium SaaS Design with Real Data
 * Multi-rental support with rental switcher
 */

// Theme hook
const useTheme = () => {
    const [isDark, setIsDark] = React.useState(() => {
        if (typeof window === 'undefined') return false;
        return localStorage.getItem('tenant-theme') === 'dark';
    });
    React.useEffect(() => {
        localStorage.setItem('tenant-theme', isDark ? 'dark' : 'light');
    }, [isDark]);
    return { isDark, toggleTheme: () => setIsDark(!isDark) };
};

const TenantDashboardPage: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const { isDark, toggleTheme } = useTheme();
    const [contractOpen, setContractOpen] = useState(false);
    const [selectorOpen, setSelectorOpen] = useState(false);
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [inviteCode, setInviteCode] = useState('');
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);

    const dashboard = useTenantDashboardData(user?.id || '');
    const {
        rentals,
        selectedRentalId,
        selectedRental,
        hero,
        kpis,
        upcomingInvoices,
        notifications,
        contractDetails,
        loading,
        error,
        selectRental,
    } = dashboard;

    // Format helpers
    const formatDate = (dateStr: string) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('lt-LT', { month: 'long', day: 'numeric' });
    };

    const formatCurrency = (amount: number) => `${amount} €`;

    // Card base styles - frosted glass effect
    const cardBase = isDark
        ? 'bg-gray-900/90 backdrop-blur-xl border border-white/10'
        : 'bg-white/90 backdrop-blur-xl border border-gray-200/60 shadow-sm';

    // Action handlers
    const handlePayRent = () => {
        if (hero.status === 'paid') {
            toast.success('Nuoma jau apmokėta šiam mėnesiui! 🎉');
            return;
        }
        toast('Mokėjimai bus prieinami netrukus', { icon: '🔧' });
        // navigate('/tenant/payments');
    };

    const handleViewInvoice = () => {
        if (upcomingInvoices.length === 0) {
            toast('Sąskaita dar nesukurta', { icon: '📄' });
            return;
        }
        toast('Sąskaitos peržiūra bus prieinama netrukus', { icon: '📄' });
        // navigate(`/tenant/invoices/${upcomingInvoices[0].id}`);
    };

    const handleSubmitMeters = () => {
        if (selectedRental) {
            toast('Skaitiklių pateikimas bus prieinamas netrukus', { icon: '📊' });
            // navigate(`/tenant/meters?rental=${selectedRental.id}`);
        }
    };

    const handleReportIssue = () => {
        toast('Gedimų pranešimas bus prieinamas netrukus', { icon: '🔧' });
        // navigate('/tenant/maintenance/new');
    };

    const handleViewDocuments = () => {
        toast('Dokumentų peržiūra bus prieinama netrukus', { icon: '📁' });
        // navigate('/tenant/documents');
    };

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    // User info - use fields from UserWithPermissions type
    const userName = (user as any)?.user_metadata?.full_name || user?.first_name || user?.email?.split('@')[0] || 'Naudotojas';
    const userAvatar = (user as any)?.user_metadata?.avatar_url || (user as any)?.avatar_url;

    // Loading state
    if (loading) {
        return (
            <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
                <div className="text-center">
                    <div className="w-10 h-10 border-4 border-[#2F8481] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-gray-500">Kraunama...</p>
                </div>
            </div>
        );
    }

    // No blocking empty state - dashboard always shows
    // If no rentals, we'll show a "Prisijungti prie būsto" card in the main view
    const hasRentals = rentals.length > 0;

    return (
        <div className={`min-h-screen relative ${isDark ? 'text-white' : 'text-gray-900'}`}>

            {/* Background Layer - KEPT AS IS */}
            <div className="fixed inset-0 z-0">
                {!isDark ? (
                    <>
                        <img src="/images/tenant-bg.png" alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-white/60" />
                    </>
                ) : (
                    <div className="w-full h-full bg-gray-900" />
                )}
            </div>

            {/* Header */}
            <header className={`sticky top-0 z-50 ${cardBase} border-b`}>
                <div className="max-w-6xl mx-auto px-4 sm:px-6">
                    <div className="flex items-center justify-between h-14">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-gradient-to-br from-[#2F8481] to-[#1a5553] rounded-xl flex items-center justify-center">
                                <Home className="w-5 h-5 text-white" />
                            </div>
                            <span className="font-semibold text-lg">Nuomininko skydelis</span>
                        </div>

                        {/* Rental Selector - show if multiple rentals */}
                        {rentals.length > 1 && (
                            <div className="relative">
                                <button
                                    onClick={() => setSelectorOpen(!selectorOpen)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-100 hover:bg-gray-200'} transition-colors`}
                                >
                                    <MapPin className="w-4 h-4 text-[#2F8481]" />
                                    <span className="text-sm font-medium truncate max-w-[200px]">
                                        {selectedRentalId === 'all'
                                            ? 'Visi būstai'
                                            : selectedRental
                                                ? `${selectedRental.address}`
                                                : 'Pasirinkite'}
                                    </span>
                                    <ChevronDown className={`w-4 h-4 transition-transform ${selectorOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {selectorOpen && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setSelectorOpen(false)} />
                                        <div className={`absolute right-0 top-full mt-2 w-72 ${cardBase} rounded-xl shadow-xl z-50 overflow-hidden`}>
                                            {/* All rentals option */}
                                            <button
                                                onClick={() => { selectRental('all'); setSelectorOpen(false); }}
                                                className={`w-full flex items-center gap-3 px-4 py-3 text-left ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'} ${selectedRentalId === 'all' ? 'bg-[#2F8481]/10' : ''}`}
                                            >
                                                <div className="w-8 h-8 bg-[#2F8481]/10 rounded-lg flex items-center justify-center">
                                                    <Building className="w-4 h-4 text-[#2F8481]" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="font-medium">Visi būstai</div>
                                                    <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Bendra apžvalga</div>
                                                </div>
                                                {selectedRentalId === 'all' && <Check className="w-4 h-4 text-[#2F8481]" />}
                                            </button>

                                            <div className={`border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`} />

                                            {rentals.map((rental) => (
                                                <button
                                                    key={rental.id}
                                                    onClick={() => { selectRental(rental.id); setSelectorOpen(false); }}
                                                    className={`w-full flex items-center gap-3 px-4 py-3 text-left ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'} ${selectedRentalId === rental.id ? 'bg-[#2F8481]/10' : ''}`}
                                                >
                                                    <div className="w-8 h-8 bg-[#2F8481]/10 rounded-lg flex items-center justify-center">
                                                        <Home className="w-4 h-4 text-[#2F8481]" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-medium truncate">{rental.address}</div>
                                                        <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{rental.unitLabel}</div>
                                                    </div>
                                                    <span className={`px-2 py-0.5 text-xs rounded-full ${rental.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                                                        {rental.status === 'active' ? 'Aktyvi' : 'Baigta'}
                                                    </span>
                                                    {selectedRentalId === rental.id && <Check className="w-4 h-4 text-[#2F8481]" />}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        <div className="flex items-center gap-2">
                            <button onClick={toggleTheme} className={`p-2 rounded-lg ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition-colors`}>
                                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                            </button>
                            <button className={`relative p-2 rounded-lg ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition-colors`}>
                                <Bell className="w-5 h-5" />
                                {notifications.length > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />}
                            </button>

                            {/* Profile Menu */}
                            <div className="relative">
                                <button
                                    onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                                    className={`flex items-center gap-2 p-1.5 rounded-lg ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition-colors`}
                                >
                                    {userAvatar ? (
                                        <img src={userAvatar} alt="" className="w-8 h-8 rounded-lg object-cover" />
                                    ) : (
                                        <div className="w-8 h-8 bg-[#2F8481] rounded-lg flex items-center justify-center">
                                            <User className="w-4 h-4 text-white" />
                                        </div>
                                    )}
                                    <ChevronDown className={`w-4 h-4 transition-transform ${profileMenuOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {profileMenuOpen && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setProfileMenuOpen(false)} />
                                        <div className={`absolute right-0 top-full mt-2 w-56 ${cardBase} rounded-xl shadow-xl z-50 overflow-hidden`}>
                                            {/* User Info */}
                                            <div className={`px-4 py-3 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                                                <div className="font-medium truncate">{userName}</div>
                                                <div className={`text-xs truncate ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                                    {user?.email}
                                                </div>
                                            </div>

                                            {/* Menu Items */}
                                            <div className="py-1">
                                                <button
                                                    onClick={() => {
                                                        setProfileMenuOpen(false);
                                                        navigate('/profile');
                                                    }}
                                                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}
                                                >
                                                    <User className="w-4 h-4 text-gray-500" />
                                                    <span>Profilis</span>
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setProfileMenuOpen(false);
                                                        navigate('/settings');
                                                    }}
                                                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}
                                                >
                                                    <Settings className="w-4 h-4 text-gray-500" />
                                                    <span>Nustatymai</span>
                                                </button>
                                            </div>

                                            {/* Logout */}
                                            <div className={`border-t ${isDark ? 'border-white/10' : 'border-gray-200'} py-1`}>
                                                <button
                                                    onClick={() => {
                                                        setProfileMenuOpen(false);
                                                        handleLogout();
                                                    }}
                                                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-red-600 ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}
                                                >
                                                    <LogOut className="w-4 h-4" />
                                                    <span>Atsijungti</span>
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">

                {/* HERO Section - Different content based on rentals */}
                {hasRentals ? (
                    /* Payment Status Hero */
                    <section className="relative overflow-hidden rounded-2xl">
                        <div className="absolute inset-0 bg-gradient-to-br from-[#2F8481] via-[#35918e] to-[#1a6b68]" />
                        <div className="absolute -top-20 -right-20 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
                        <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-black/10 rounded-full blur-2xl" />

                        <div className="relative z-10 p-6 sm:p-8">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div className="text-white">
                                    <p className="text-white/70 text-xs font-medium uppercase tracking-wider mb-1">
                                        {selectedRentalId === 'all' ? 'Bendra nuoma' : 'Mėnesio nuoma'}
                                    </p>
                                    <div className="flex items-baseline gap-3 mb-2">
                                        <span className="text-4xl sm:text-5xl font-bold">{formatCurrency(hero.amount)}</span>
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${hero.status === 'paid' ? 'bg-emerald-400/20 text-emerald-100' :
                                            hero.status === 'overdue' ? 'bg-red-400/20 text-red-100' : 'bg-amber-400/20 text-amber-100'
                                            }`}>
                                            {hero.status === 'paid' && <Check className="w-3.5 h-3.5" />}
                                            {hero.status === 'pending' && <Clock className="w-3.5 h-3.5" />}
                                            {hero.status === 'overdue' && <AlertCircle className="w-3.5 h-3.5" />}
                                            {hero.status === 'paid' ? 'Apmokėta' : hero.status === 'overdue' ? 'Vėluoja' : 'Laukia apmokėjimo'}
                                        </span>
                                    </div>
                                    {hero.nextDueDate && (
                                        <p className="text-white/60 text-sm">
                                            {hero.status === 'overdue' ? (
                                                <>Vėluoja <span className="text-red-300 font-medium">{hero.daysOverdue} d.</span></>
                                            ) : (
                                                <>Kitas mokėjimas: <span className="text-white">{formatDate(hero.nextDueDate)}</span>
                                                    {hero.daysUntilDue !== null && <span className="ml-1">(liko {hero.daysUntilDue} d.)</span>}</>
                                            )}
                                        </p>
                                    )}
                                </div>
                                <div className="flex gap-3">
                                    {hero.status !== 'paid' && (
                                        <button onClick={handlePayRent} className="flex items-center gap-2 px-5 py-2.5 bg-white text-[#2F8481] rounded-xl text-sm font-semibold hover:bg-white/90 transition-all">
                                            <CreditCard className="w-4 h-4" />
                                            Apmokėti nuomą
                                        </button>
                                    )}
                                    <button onClick={handleViewInvoice} className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-medium border border-white/20 transition-all">
                                        <ExternalLink className="w-4 h-4" />
                                        Peržiūrėti sąskaitą
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>
                ) : (
                    /* Account Home - No active rentals */
                    <TenantAccountHome
                        user={user}
                        isDark={isDark}
                        cardBase={cardBase}
                        inviteCode={inviteCode}
                        setInviteCode={setInviteCode}
                    />
                )}

                {/* KPI Cards - show only if has rentals */}
                {hasRentals && (
                    <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            {
                                icon: Calendar,
                                label: 'Kitas mokėjimas',
                                value: kpis.nextPaymentDate ? formatDate(kpis.nextPaymentDate) : '—',
                                sub: kpis.daysUntilPayment !== null ? `Liko ${kpis.daysUntilPayment} d.` : '',
                                color: 'text-blue-600',
                                bg: 'bg-blue-100'
                            },
                            {
                                icon: Wrench,
                                label: 'Atviros užklausos',
                                value: String(kpis.openMaintenanceCount),
                                sub: kpis.openMaintenanceCount === 0 ? 'Viskas tvarkoje' : `${kpis.inProgressCount} vykdomos`,
                                color: 'text-orange-600',
                                bg: 'bg-orange-100'
                            },
                            {
                                icon: FileText,
                                label: 'Dokumentai',
                                value: String(kpis.documentsCount),
                                sub: 'Sutartys ir aktai',
                                color: 'text-purple-600',
                                bg: 'bg-purple-100'
                            },
                            {
                                icon: Euro,
                                label: 'Depozitas',
                                value: formatCurrency(kpis.depositAmount),
                                sub: kpis.depositPaid ? 'Sumokėtas' : 'Nesumokėtas',
                                color: 'text-[#2F8481]',
                                bg: 'bg-[#2F8481]/10'
                            },
                        ].map((kpi, i) => (
                            <div key={i} className={`${cardBase} rounded-2xl p-5 hover:shadow-md transition-shadow`}>
                                <div className={`w-10 h-10 ${kpi.bg} rounded-xl flex items-center justify-center mb-3`}>
                                    <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                                </div>
                                <div className="text-2xl font-bold mb-0.5">{kpi.value}</div>
                                <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{kpi.label}</div>
                                {kpi.sub && <div className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{kpi.sub}</div>}
                            </div>
                        ))}
                    </section>
                )}

                {/* Greiti Veiksmai - show only if has rentals */}
                {hasRentals && (
                    <section className={`${cardBase} rounded-2xl p-6`}>
                        <h2 className="text-lg font-semibold mb-4">Greiti veiksmai</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                { icon: CreditCard, label: 'Apmokėti nuomą', desc: 'Atsiskaitykite už šį mėnesį', gradient: 'from-[#2F8481] to-[#1a6b68]', onClick: handlePayRent },
                                { icon: Gauge, label: 'Pateikti rodmenis', desc: 'Įkelkite skaitiklių rodmenis', gradient: 'from-blue-500 to-blue-600', onClick: handleSubmitMeters },
                                { icon: AlertTriangle, label: 'Pranešti gedimą', desc: 'Sukurti remonto užklausą', gradient: 'from-orange-500 to-red-500', onClick: handleReportIssue },
                                { icon: FileText, label: 'Peržiūrėti dokumentus', desc: 'Sutartys, sąskaitos ir kt.', gradient: 'from-purple-500 to-purple-600', onClick: handleViewDocuments },
                            ].map((action, i) => (
                                <button
                                    key={i}
                                    onClick={action.onClick}
                                    className={`group text-left p-4 rounded-xl ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-50 hover:bg-gray-100'} border ${isDark ? 'border-white/10' : 'border-gray-200'} transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#2F8481]/50`}
                                >
                                    <div className={`w-11 h-11 bg-gradient-to-br ${action.gradient} rounded-xl flex items-center justify-center mb-3 group-hover:scale-105 transition-transform shadow-md`}>
                                        <action.icon className="w-5 h-5 text-white" />
                                    </div>
                                    <div className="font-medium mb-0.5">{action.label}</div>
                                    <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{action.desc}</div>
                                </button>
                            ))}
                        </div>
                    </section>
                )}

                {/* Two Column Layout: Payments + Notifications - show only if has rentals */}
                {hasRentals && (
                    <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Payments Table */}
                        <div className={`${cardBase} rounded-2xl p-6`}>
                            <h2 className="text-lg font-semibold mb-4">Artimiausi mokėjimai</h2>
                            {upcomingInvoices.length > 0 ? (
                                <div className="space-y-3">
                                    {upcomingInvoices.map((payment) => (
                                        <div key={payment.id} className={`flex items-center justify-between p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${payment.status === 'paid' ? 'bg-emerald-100' : payment.status === 'overdue' ? 'bg-red-100' : 'bg-amber-100'
                                                    }`}>
                                                    {payment.status === 'paid' ? <Check className="w-4 h-4 text-emerald-600" /> :
                                                        payment.status === 'overdue' ? <AlertCircle className="w-4 h-4 text-red-600" /> :
                                                            <Clock className="w-4 h-4 text-amber-600" />}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-sm">{payment.periodLabel}</div>
                                                    <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                                        {formatCurrency(payment.amount)}
                                                        {selectedRentalId === 'all' && payment.rentalLabel && (
                                                            <span className="ml-1">• {payment.rentalLabel}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${payment.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                                                    payment.status === 'overdue' ? 'bg-red-100 text-red-700' :
                                                        'bg-amber-100 text-amber-700'
                                                    }`}>
                                                    {payment.status === 'paid' ? 'Apmokėta' : payment.status === 'overdue' ? 'Vėluoja' : 'Laukia'}
                                                </span>
                                                <button className="text-[#2F8481] hover:underline text-sm font-medium">Atidaryti</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className={`text-center py-8 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                    <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                    <p>Kol kas nėra sąskaitų</p>
                                </div>
                            )}
                        </div>

                        {/* Notifications */}
                        <div className={`${cardBase} rounded-2xl p-6`}>
                            <h2 className="text-lg font-semibold mb-4">Pranešimai</h2>
                            {notifications.length > 0 ? (
                                <div className="space-y-3">
                                    {notifications.map((notif) => (
                                        <div key={notif.id} className={`flex gap-3 p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${notif.type === 'payment_due' ? 'bg-amber-100' :
                                                notif.type === 'payment_received' ? 'bg-emerald-100' :
                                                    'bg-[#2F8481]/10'
                                                }`}>
                                                {notif.type === 'payment_due' ? <Clock className="w-4 h-4 text-amber-600" /> :
                                                    notif.type === 'payment_received' ? <Check className="w-4 h-4 text-emerald-600" /> :
                                                        <Bell className="w-4 h-4 text-[#2F8481]" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-sm">{notif.title}</div>
                                                <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'} line-clamp-1`}>{notif.message}</div>
                                                <div className={`text-xs ${isDark ? 'text-gray-600' : 'text-gray-400'} mt-1`}>{notif.relativeTime}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className={`text-center py-8 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                    <Bell className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                    <p>Pranešimų nėra</p>
                                </div>
                            )}
                        </div>
                    </section>
                )}

                {/* Sutarties Informacija - Accordion - show only if has rentals */}
                {hasRentals && contractDetails && (
                    <section className={`${cardBase} rounded-2xl overflow-hidden`}>
                        <button
                            onClick={() => setContractOpen(!contractOpen)}
                            className={`w-full flex items-center justify-between p-6 text-left ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50/50'} transition-colors`}
                        >
                            <div>
                                <h2 className="text-lg font-semibold">Sutarties informacija</h2>
                                {!contractOpen && (
                                    <p className={`text-sm mt-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                                        {formatCurrency(contractDetails.monthlyRent)}/mėn • Depozitas {formatCurrency(contractDetails.deposit)} • Iki {formatDate(contractDetails.endDate)}
                                    </p>
                                )}
                            </div>
                            <ChevronDown className={`w-5 h-5 transition-transform ${contractOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {contractOpen && (
                            <div className={`px-6 pb-6 pt-2 border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                                    {[
                                        { label: 'Būstas', value: selectedRental ? `${selectedRental.address}, ${selectedRental.unitLabel}` : '—' },
                                        { label: 'Mėnesio nuoma', value: `${contractDetails.monthlyRent} €` },
                                        { label: 'Depozitas', value: `${contractDetails.deposit} € (${contractDetails.depositPaid ? 'sumokėtas' : 'nesumokėtas'})` },
                                        { label: 'Mokėjimo diena', value: `Kiekvieno mėnesio ${contractDetails.paymentDay} d.` },
                                        { label: 'Sutarties pradžia', value: formatDate(contractDetails.startDate) },
                                        { label: 'Galiojimas iki', value: formatDate(contractDetails.endDate) },
                                    ].map((item, i) => (
                                        <div key={i}>
                                            <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'} mb-1`}>{item.label}</div>
                                            <div className="font-medium">{item.value}</div>
                                        </div>
                                    ))}
                                </div>

                                {selectedRental?.landlordName && (
                                    <div className={`pt-4 border-t ${isDark ? 'border-white/10' : 'border-gray-200'} mb-4`}>
                                        <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} mb-2`}>Nuomotojo kontaktai</div>
                                        <div className="flex flex-wrap gap-4 text-sm">
                                            <span className="flex items-center gap-1.5"><User className="w-4 h-4" />{selectedRental.landlordName}</span>
                                            {selectedRental.landlordPhone && (
                                                <a href={`tel:${selectedRental.landlordPhone}`} className="flex items-center gap-1.5 text-[#2F8481] hover:underline">
                                                    <Phone className="w-4 h-4" />{selectedRental.landlordPhone}
                                                </a>
                                            )}
                                            {selectedRental.landlordEmail && (
                                                <a href={`mailto:${selectedRental.landlordEmail}`} className="flex items-center gap-1.5 text-[#2F8481] hover:underline">
                                                    <Mail className="w-4 h-4" />{selectedRental.landlordEmail}
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {contractDetails.hasContractDocument && (
                                    <button className="flex items-center gap-2 text-sm text-[#2F8481] hover:underline font-medium">
                                        <Download className="w-4 h-4" />
                                        Atsisiųsti sutartį
                                    </button>
                                )}
                            </div>
                        )}
                    </section>
                )}

            </main>

            {/* Floating Chat */}
            {user?.id && (
                <MessagingPanel
                    currentUserId={user.id}
                    currentUserName={userName}
                />
            )}
        </div>
    );
};

export default TenantDashboardPage;
