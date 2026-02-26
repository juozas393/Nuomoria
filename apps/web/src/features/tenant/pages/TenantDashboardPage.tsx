import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useTenantDashboardData } from '../hooks/useTenantDashboardData';
import { usePendingInvitations } from '../hooks/usePendingInvitations';
import TenantAccountHome from '../components/TenantAccountHome';
import PendingInvitationCard from '../components/PendingInvitationCard';
import { PayRentModal } from '../components/PayRentModal';
import TenantTerminationRequest from '../components/TenantTerminationRequest';
import MessagingPanel from '../../../components/MessagingPanel';
import { ParticleDrift } from '../../../components/ui/ParticleDrift';
import {
    Home,
    Euro,
    Calendar,
    Wrench,
    FileText,
    Bell,
    Inbox,
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
    MapPin,
    Building,
    AlertCircle,
    Mail,
    Shield,
    Thermometer,
    Users,
    Layers,
    Maximize2,
    DoorOpen,
    Wallet,
    Copy,
    CalendarDays,
    Plus,
    KeyRound,
    Loader2,
    X,
} from 'lucide-react';
import { tenantInvitationApi } from '../../../lib/database';

/**
 * Nuomininko Skydelis — Light Theme (matching Landlord Dashboard)
 * Uses BlueArchBackground.webp + ParticleDrift + white cards with CardsBackground.webp
 * Multi-rental support with rental switcher
 */

const TenantDashboardPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [contractOpen, setContractOpen] = useState(false);
    const [selectorOpen, setSelectorOpen] = useState(false);
    const [payModalOpen, setPayModalOpen] = useState(false);
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [joinCode, setJoinCode] = useState('');
    const [isJoining, setIsJoining] = useState(false);
    const [joinError, setJoinError] = useState<string | null>(null);
    const [joinSuccess, setJoinSuccess] = useState(false);

    const dashboard = useTenantDashboardData(user?.id || '');
    const {
        invitations: pendingInvitations,
        loading: invitationsLoading,
        acceptInvitation,
        declineInvitation,
        hasInvitations: hasPendingInvitations,
        refreshInvitations
    } = usePendingInvitations();
    const {
        rentals,
        selectedRentalId,
        selectedRental,
        hero,
        kpis,
        upcomingInvoices,
        notifications,
        contractDetails,
        contacts,
        propertyInfo,
        paymentInfo,
        stripeEnabled,
        loading,
        error,
        selectRental,
    } = dashboard;

    const handleJoinByCode = async () => {
        if (!joinCode.trim()) return;
        setIsJoining(true);
        setJoinError(null);
        try {
            await tenantInvitationApi.joinByCode(joinCode.trim());
            setJoinSuccess(true);
            setJoinCode('');
            setTimeout(() => {
                setShowJoinModal(false);
                setJoinSuccess(false);
                dashboard.refresh();
            }, 1500);
        } catch (err: any) {
            setJoinError(err.message || 'Nepavyko prisijungti');
        } finally {
            setIsJoining(false);
        }
    };

    // Format helpers
    const formatDate = (dateStr: string) => {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const formatCurrency = (amount: number) => `${amount} €`;

    // Card background — CardsBackground.webp matching landlord
    const cardBgStyle: React.CSSProperties = {
        backgroundImage: `url('/images/CardsBackground.webp')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
    };

    // White card base — matching landlord dashboard cards
    const cardBase = 'bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-gray-200/60';

    // Action handlers
    const handlePayRent = () => {
        if (stripeEnabled) {
            setPayModalOpen(true);
        } else {
            navigate('/tenant/invoices');
        }
    };

    const handleViewInvoice = () => {
        navigate('/tenant/invoices');
    };

    const handleSubmitMeters = () => {
        navigate('/tenant/meters');
    };

    const handleReportIssue = () => {
        // TODO: Gedimų pranešimas
    };

    const handleViewDocuments = () => {
        // TODO: Dokumentų peržiūra
    };

    // User info
    const userName = (user as any)?.user_metadata?.full_name || user?.first_name || user?.email?.split('@')[0] || 'Naudotojas';

    // Loading state — light theme
    if (loading) {
        return (
            <div
                className="min-h-full relative overflow-hidden bg-cover bg-center bg-fixed"
                style={{ backgroundImage: `url('/imagesGen/DashboardImage.jpg')` }}
            >
                <ParticleDrift />
                <div className="relative z-10 flex items-center justify-center min-h-screen">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2F8481] mx-auto mb-3" />
                        <span className="text-gray-600">Kraunama...</span>
                    </div>
                </div>
            </div>
        );
    }

    const hasRentals = rentals.length > 0;

    return (
        <div
            className="min-h-full relative overflow-hidden bg-cover bg-center bg-fixed"
            style={{ backgroundImage: `url('/imagesGen/DashboardImage.jpg')` }}
        >
            {/* Particle drift background — matching landlord */}
            <ParticleDrift />

            {/* Content wrapper */}
            <div className="relative z-10 min-h-full">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
                    {/* Page Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-gray-200/80 flex items-center justify-center">
                                <Home className="w-5 h-5 text-[#2F8481]" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-gray-900 leading-tight">Sveiki, {userName.split(' ')[0]}</h1>
                                <p className="text-xs text-gray-500">
                                    {hasRentals
                                        ? `${rentals.length} ${rentals.length === 1 ? 'aktyvus būstas' : 'aktyvūs būstai'}`
                                        : 'Nuomininko skydelis'
                                    }
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {hasRentals && (
                                <button
                                    onClick={() => { setShowJoinModal(true); setJoinError(null); setJoinCode(''); }}
                                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#2F8481] hover:bg-[#267370] text-white text-xs font-bold transition-all duration-200 active:scale-[0.97] shadow-lg shadow-[#2F8481]/25"
                                >
                                    <Plus className="w-4 h-4" />
                                    Pridėti būstą
                                </button>
                            )}

                            {/* Rental Selector — in header area */}
                            {rentals.length > 1 && (
                                <div className="relative">
                                    <button
                                        onClick={() => setSelectorOpen(!selectorOpen)}
                                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/80 backdrop-blur-sm hover:bg-white border border-gray-200/80 shadow-sm transition-colors"
                                    >
                                        <MapPin className="w-4 h-4 text-[#2F8481]" />
                                        <span className="text-sm font-medium truncate max-w-[200px] text-gray-700">
                                            {selectedRentalId === 'all'
                                                ? 'Visi būstai'
                                                : selectedRental
                                                    ? `${selectedRental.address}`
                                                    : 'Pasirinkite'}
                                        </span>
                                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${selectorOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {selectorOpen && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={() => setSelectorOpen(false)} />
                                            <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl ring-1 ring-black/5 z-50 overflow-hidden">
                                                {/* All rentals option */}
                                                <button
                                                    onClick={() => { selectRental('all'); setSelectorOpen(false); }}
                                                    className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 ${selectedRentalId === 'all' ? 'bg-gray-50' : ''}`}
                                                >
                                                    <div className="w-8 h-8 bg-[#E8F5F4] rounded-lg flex items-center justify-center">
                                                        <Building className="w-4 h-4 text-[#2F8481]" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="font-medium text-gray-900">Visi būstai</div>
                                                        <div className="text-xs text-gray-500">Bendra apžvalga</div>
                                                    </div>
                                                    {selectedRentalId === 'all' && <Check className="w-4 h-4 text-[#2F8481]" />}
                                                </button>

                                                <div className="border-t border-gray-100" />

                                                {rentals.map((rental) => (
                                                    <button
                                                        key={rental.id}
                                                        onClick={() => { selectRental(rental.id); setSelectorOpen(false); }}
                                                        className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 ${selectedRentalId === rental.id ? 'bg-gray-50' : ''}`}
                                                    >
                                                        <div className="w-8 h-8 bg-[#E8F5F4] rounded-lg flex items-center justify-center">
                                                            <Home className="w-4 h-4 text-[#2F8481]" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="font-medium truncate text-gray-900">{rental.address}</div>
                                                            <div className="text-xs text-gray-500">{rental.unitLabel}</div>
                                                        </div>
                                                        <span className={`px-2 py-0.5 text-xs rounded-full ${rental.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
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
                        </div>
                    </div>

                    {/* Main Content Card — dark building container like landlord */}
                    <div
                        className="relative rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.25),0_2px_8px_rgba(0,0,0,0.15)] p-4 bg-cover bg-center border border-white/[0.08] overflow-hidden mb-8"
                        style={{ backgroundImage: `url('/imagesGen/tenantdashboard.jpg')` }}
                    >
                        {/* Dark overlay for readability */}
                        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/50 rounded-2xl" />
                        {!hasRentals ? (
                            /* No active rentals — unified inline layout */
                            <div className="relative z-10 space-y-4">
                                {/* Welcome Hero */}
                                <section className="relative overflow-hidden rounded-2xl shadow-xl shadow-[#2F8481]/15">
                                    <div className="absolute inset-0 bg-gradient-to-br from-[#2F8481] via-[#348f8c] to-[#3aa8a4]" />
                                    <div className="absolute -top-20 -right-20 w-56 h-56 bg-white/8 rounded-full blur-3xl" />
                                    <div className="absolute -bottom-16 -left-16 w-44 h-44 bg-white/8 rounded-full blur-3xl" />
                                    <div className="relative z-10 p-6 sm:p-8">
                                        <p className="text-white/70 text-xs font-medium uppercase tracking-wider mb-1">Nuomininko paskyra</p>
                                        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2">{userName}</h2>
                                        <p className="text-white/60 text-sm max-w-md leading-relaxed">
                                            Šiuo metu neturite aktyvaus būsto. Prisijunkite su kvietimo kodu arba priimkite kvietimą.
                                        </p>
                                    </div>
                                </section>

                                {/* Pending Email-based Invitations */}
                                {hasPendingInvitations && (
                                    <section className="rounded-xl bg-gradient-to-r from-[#2F8481]/10 to-[#3a9f9c]/10 border border-[#2F8481]/20 p-4">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-10 h-10 bg-[#2F8481]/15 rounded-xl flex items-center justify-center flex-shrink-0">
                                                <Inbox className="w-5 h-5 text-[#2F8481]" />
                                            </div>
                                            <div>
                                                <div className="font-semibold text-gray-900 text-sm">Gauti kvietimai</div>
                                                <div className="text-xs text-gray-500">
                                                    Turite {pendingInvitations.length} {pendingInvitations.length === 1 ? 'naują kvietimą' : 'naujus kvietimus'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            {pendingInvitations.map((invitation) => (
                                                <PendingInvitationCard
                                                    key={invitation.id}
                                                    invitation={invitation}
                                                    onAccept={async (id) => {
                                                        const result = await acceptInvitation(id);
                                                        if (result.success) {
                                                            dashboard.refresh();
                                                        }
                                                        return result;
                                                    }}
                                                    onDecline={declineInvitation}
                                                    isDark={false}
                                                    cardBase="bg-white"
                                                />
                                            ))}
                                        </div>
                                    </section>
                                )}

                                {/* Join By Code Card */}
                                <section className={`${cardBase} p-6`} style={cardBgStyle}>
                                    <div className="flex items-center gap-3 mb-5">
                                        <div className="w-10 h-10 rounded-xl bg-[#2F8481] flex items-center justify-center shadow-md">
                                            <Home className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900 text-[15px]">Prisijungti prie būsto</h3>
                                            <p className="text-xs text-gray-500">Gavote kvietimo kodą iš nuomotojo? Įveskite jį žemiau.</p>
                                        </div>
                                    </div>

                                    {joinSuccess && (
                                        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm mb-4">
                                            <Check className="w-4 h-4" />
                                            Sėkmingai prisijungta!
                                        </div>
                                    )}

                                    {joinError && (
                                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm mb-4">
                                            <AlertCircle className="w-4 h-4" />
                                            {joinError}
                                        </div>
                                    )}

                                    <div className="space-y-2.5">
                                        <div className="relative">
                                            <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <input
                                                type="text"
                                                value={joinCode}
                                                onChange={(e) => {
                                                    setJoinCode(e.target.value.toUpperCase());
                                                    setJoinError(null);
                                                }}
                                                placeholder="XXXX - XXXX"
                                                maxLength={9}
                                                className="w-full pl-10 pr-4 py-3 rounded-xl text-center font-mono text-base tracking-[0.2em] bg-gray-900/[0.03] border border-gray-200 focus:border-[#2F8481] focus:ring-2 focus:ring-[#2F8481]/20 text-gray-900 outline-none transition-colors placeholder:text-gray-300"
                                                onKeyDown={(e) => { if (e.key === 'Enter') handleJoinByCode(); }}
                                            />
                                        </div>
                                        <button
                                            onClick={handleJoinByCode}
                                            disabled={!joinCode.trim() || joinCode.replace(/-/g, '').length < 8 || isJoining || joinSuccess}
                                            className="w-full px-5 py-3 bg-[#2F8481] hover:bg-[#297a77] text-white rounded-xl font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-sm"
                                        >
                                            {isJoining ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Jungiamasi...
                                                </>
                                            ) : (
                                                <>
                                                    <Home className="w-4 h-4" />
                                                    Prisijungti
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    <div className="mt-4 pt-3.5 border-t border-gray-100">
                                        <p className="text-[11px] text-gray-500 leading-relaxed">
                                            Jei nuomotojas žino jūsų el. paštą (<strong className="text-gray-500">{user?.email}</strong>),
                                            kvietimas pasirodys automatiškai viršuje.
                                        </p>
                                    </div>
                                </section>
                            </div>
                        ) : (
                            <div className="relative z-10 space-y-4">
                                {/* Pending Invitations Banner — visible when tenant already has rentals */}
                                {hasPendingInvitations && (
                                    <section className="rounded-xl bg-white/[0.08] backdrop-blur-sm border border-white/[0.12] p-4">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-10 h-10 bg-teal-500/15 rounded-xl flex items-center justify-center flex-shrink-0">
                                                <Inbox className="w-5 h-5 text-teal-400" />
                                            </div>
                                            <div>
                                                <div className="font-semibold text-white text-sm">Nauji kvietimai</div>
                                                <div className="text-xs text-white/60">
                                                    Turite {pendingInvitations.length} {pendingInvitations.length === 1 ? 'naują kvietimą' : 'naujus kvietimus'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            {pendingInvitations.map((invitation) => (
                                                <PendingInvitationCard
                                                    key={invitation.id}
                                                    invitation={invitation}
                                                    onAccept={async (id) => {
                                                        const result = await acceptInvitation(id);
                                                        if (result.success) {
                                                            dashboard.refresh();
                                                        }
                                                        return result;
                                                    }}
                                                    onDecline={declineInvitation}
                                                    isDark={false}
                                                    cardBase="bg-white"
                                                />
                                            ))}
                                        </div>
                                    </section>
                                )}

                                {/* HERO — Payment Status */}
                                <section className="relative overflow-hidden rounded-2xl shadow-xl shadow-[#2F8481]/15">
                                    <div className="absolute inset-0 bg-gradient-to-br from-[#2F8481] via-[#348f8c] to-[#3aa8a4]" />
                                    <div className="absolute -top-20 -right-20 w-56 h-56 bg-white/8 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
                                    <div className="absolute -bottom-16 -left-16 w-44 h-44 bg-white/8 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s' }} />
                                    <div className="absolute top-1/2 right-1/4 w-32 h-32 bg-cyan-300/10 rounded-full blur-2xl" />

                                    <div className="relative z-10 p-6 sm:p-8">
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                            <div className="text-white">
                                                <p className="text-white/70 text-xs font-medium uppercase tracking-wider mb-1">
                                                    {selectedRentalId === 'all' ? 'Bendra nuoma' : 'Mėnesio nuoma'}
                                                </p>
                                                <div className="flex items-baseline gap-3 mb-2">
                                                    <span className="text-4xl sm:text-5xl font-bold">{formatCurrency(hero.amount)}</span>
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${hero.status === 'paid' ? 'bg-white/20 text-white' :
                                                        hero.status === 'overdue' ? 'bg-red-500/30 text-red-100' : 'bg-amber-500/30 text-amber-100'
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
                                                            <>Vėluoja <span className="text-red-200 font-medium">{hero.daysOverdue} d.</span></>
                                                        ) : (
                                                            <>Kitas mokėjimas: <span className="text-white/90">{formatDate(hero.nextDueDate)}</span>
                                                                {hero.daysUntilDue !== null && <span className="ml-1">(liko {hero.daysUntilDue} d.)</span>}</>
                                                        )}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex gap-3">
                                                {hero.status !== 'paid' && (
                                                    <button onClick={handlePayRent} className="flex items-center gap-2 px-5 py-2.5 bg-white text-[#2F8481] rounded-xl text-sm font-semibold hover:bg-white/90 transition-colors shadow-sm">
                                                        <CreditCard className="w-4 h-4" />
                                                        Apmokėti nuomą
                                                    </button>
                                                )}
                                                <button onClick={handleViewInvoice} className="flex items-center gap-2 px-5 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-sm font-medium border border-white/30 transition-colors">
                                                    <ExternalLink className="w-4 h-4" />
                                                    Peržiūrėti sąskaitą
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                {/* Meter Reading Request Banner */}
                                {notifications.filter(n => n.type === 'meter_reading_request').length > 0 && (
                                    <section className="rounded-xl bg-white/[0.08] backdrop-blur-sm border border-white/[0.12] p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-teal-500/15 rounded-xl flex items-center justify-center flex-shrink-0">
                                                <Bell className="w-5 h-5 text-teal-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-semibold text-white text-sm">
                                                    {notifications.find(n => n.type === 'meter_reading_request')?.title || 'Prašome pateikti skaitiklių rodmenis'}
                                                </div>
                                                <div className="text-xs text-white/60 mt-0.5">
                                                    {notifications.find(n => n.type === 'meter_reading_request')?.message}
                                                </div>
                                            </div>
                                            <button
                                                onClick={handleSubmitMeters}
                                                className="flex items-center gap-2 px-4 py-2 bg-teal-500 text-white rounded-lg text-sm font-semibold hover:bg-teal-600 transition-colors active:scale-[0.98] flex-shrink-0"
                                            >
                                                <Gauge className="w-4 h-4" />
                                                Pateikti
                                            </button>
                                        </div>
                                    </section>
                                )}

                                {/* KPI Cards */}
                                <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                    {[
                                        {
                                            icon: Calendar,
                                            label: 'Kitas mokėjimas',
                                            value: kpis.nextPaymentDate ? formatDate(kpis.nextPaymentDate) : '—',
                                            sub: kpis.daysUntilPayment !== null ? `Liko ${kpis.daysUntilPayment} d.` : '',
                                            color: 'text-[#2F8481]',
                                            bg: 'bg-[#E8F5F4]',
                                            accent: 'border-l-[#2F8481]'
                                        },
                                        {
                                            icon: Wrench,
                                            label: 'Atviros užklausos',
                                            value: String(kpis.openMaintenanceCount),
                                            sub: kpis.openMaintenanceCount === 0 ? 'Viskas tvarkoje' : `${kpis.inProgressCount} vykdomos`,
                                            color: 'text-orange-600',
                                            bg: 'bg-orange-50',
                                            accent: 'border-l-orange-400'
                                        },
                                        {
                                            icon: FileText,
                                            label: 'Dokumentai',
                                            value: String(kpis.documentsCount),
                                            sub: 'Sutartys ir aktai',
                                            color: 'text-blue-600',
                                            bg: 'bg-blue-50',
                                            accent: 'border-l-blue-400'
                                        },
                                        {
                                            icon: Euro,
                                            label: 'Depozitas',
                                            value: formatCurrency(kpis.depositAmount),
                                            sub: kpis.depositPaid ? 'Sumokėtas' : 'Nesumokėtas',
                                            color: kpis.depositPaid ? 'text-emerald-600' : 'text-amber-600',
                                            bg: kpis.depositPaid ? 'bg-emerald-50' : 'bg-amber-50',
                                            accent: kpis.depositPaid ? 'border-l-emerald-400' : 'border-l-amber-400'
                                        },
                                    ].map((kpi, i) => (
                                        <div key={i} className={`${cardBase} p-4 hover:shadow-md transition-all duration-200 border-l-[3px] ${kpi.accent}`} style={cardBgStyle}>
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className={`w-8 h-8 ${kpi.bg} rounded-lg flex items-center justify-center`}>
                                                    <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                                                </div>
                                                <span className="text-xs font-medium text-gray-500">{kpi.label}</span>
                                            </div>
                                            <div className="text-xl font-bold text-gray-900 mb-0.5">{kpi.value}</div>
                                            {kpi.sub && <div className="text-[11px] text-gray-400">{kpi.sub}</div>}
                                        </div>
                                    ))}
                                </section>

                                {/* Greiti Veiksmai */}
                                <section className={`${cardBase} p-6`} style={cardBgStyle}>
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-1.5 h-5 bg-[#2F8481] rounded-full" />
                                        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Greiti veiksmai</h2>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                        {[
                                            { icon: CreditCard, label: 'Apmokėti nuomą', desc: 'Atsiskaitykite už šį mėnesį', color: 'text-teal-600', bg: 'bg-teal-50', hoverBg: 'hover:bg-teal-50', border: 'hover:border-teal-200', onClick: handlePayRent },
                                            { icon: Gauge, label: 'Pateikti rodmenis', desc: 'Įkelkite skaitiklių rodmenis', color: 'text-[#2F8481]', bg: 'bg-[#E8F5F4]', hoverBg: 'hover:bg-[#E8F5F4]', border: 'hover:border-[#2F8481]/30', onClick: handleSubmitMeters },
                                            { icon: AlertTriangle, label: 'Pranešti gedimą', desc: 'Sukurti remonto užklausą', color: 'text-orange-600', bg: 'bg-orange-50', hoverBg: 'hover:bg-orange-50', border: 'hover:border-orange-200', onClick: handleReportIssue },
                                            { icon: FileText, label: 'Dokumentai', desc: 'Sutartys, sąskaitos ir kt.', color: 'text-blue-600', bg: 'bg-blue-50', hoverBg: 'hover:bg-blue-50', border: 'hover:border-blue-200', onClick: handleViewDocuments },
                                        ].map((action, i) => (
                                            <button
                                                key={i}
                                                onClick={action.onClick}
                                                className={`group text-left p-4 rounded-xl bg-white/80 ${action.hoverBg} border border-gray-100 ${action.border} transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-teal-200 active:scale-[0.98]`}
                                            >
                                                <div className={`w-10 h-10 ${action.bg} rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-200`}>
                                                    <action.icon className={`w-5 h-5 ${action.color}`} />
                                                </div>
                                                <div className="font-semibold text-sm mb-0.5 text-gray-900">{action.label}</div>
                                                <div className="text-[11px] text-gray-400 leading-relaxed">{action.desc}</div>
                                            </button>
                                        ))}
                                    </div>
                                </section>

                                {/* Two Column Layout: Payments + Notifications */}
                                <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    {/* Payments Table */}
                                    <div className={`${cardBase} p-6`} style={cardBgStyle}>
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="w-1.5 h-5 bg-[#2F8481] rounded-full" />
                                            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Artimiausi mokėjimai</h2>
                                        </div>
                                        {upcomingInvoices.length > 0 ? (
                                            <div className="space-y-3">
                                                {upcomingInvoices.map((payment) => (
                                                    <div key={payment.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${payment.status === 'paid' ? 'bg-emerald-100' : payment.status === 'overdue' ? 'bg-red-100' : 'bg-amber-100'
                                                                }`}>
                                                                {payment.status === 'paid' ? <Check className="w-4 h-4 text-emerald-600" /> :
                                                                    payment.status === 'overdue' ? <AlertCircle className="w-4 h-4 text-red-600" /> :
                                                                        <Clock className="w-4 h-4 text-amber-600" />}
                                                            </div>
                                                            <div>
                                                                <div className="font-medium text-sm text-gray-900">{payment.periodLabel}</div>
                                                                <div className="text-xs text-gray-500">
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
                                                            <button className="text-[#2F8481] hover:underline text-sm font-medium transition-colors">Atidaryti</button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-8 text-gray-500">
                                                <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                                <p>Kol kas nėra sąskaitų</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Notifications */}
                                    <div className={`${cardBase} p-6`} style={cardBgStyle}>
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="w-1.5 h-5 bg-amber-400 rounded-full" />
                                            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Pranešimai</h2>
                                        </div>
                                        {notifications.length > 0 ? (
                                            <div className="space-y-3">
                                                {notifications.map((notif) => (
                                                    <div key={notif.id} className="flex gap-3 p-3 rounded-xl bg-gray-50">
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${notif.type === 'payment_due' ? 'bg-amber-100' :
                                                            notif.type === 'payment_received' ? 'bg-emerald-100' :
                                                                'bg-gray-100'
                                                            }`}>
                                                            {notif.type === 'payment_due' ? <Clock className="w-4 h-4 text-amber-600" /> :
                                                                notif.type === 'payment_received' ? <Check className="w-4 h-4 text-emerald-600" /> :
                                                                    <Bell className="w-4 h-4 text-gray-500" />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="font-medium text-sm text-gray-900">{notif.title}</div>
                                                            <div className="text-xs text-gray-500 line-clamp-1">{notif.message}</div>
                                                            <div className="text-xs text-gray-400 mt-1">{notif.relativeTime}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-8 text-gray-500">
                                                <Bell className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                                <p>Pranešimų nėra</p>
                                            </div>
                                        )}
                                    </div>
                                </section>

                                {/* Sutarties Informacija — Accordion */}
                                {contractDetails && (
                                    <section className={`${cardBase} overflow-hidden`} style={cardBgStyle}>
                                        <button
                                            onClick={() => setContractOpen(!contractOpen)}
                                            className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 transition-colors"
                                        >
                                            <div>
                                                <h2 className="text-lg font-semibold text-gray-900">Sutarties informacija</h2>
                                                {!contractOpen && (
                                                    <p className="text-sm mt-1 text-gray-500">
                                                        {formatCurrency(contractDetails.monthlyRent)}/mėn • Depozitas {formatCurrency(contractDetails.deposit)} • Iki {formatDate(contractDetails.endDate)}
                                                    </p>
                                                )}
                                            </div>
                                            <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${contractOpen ? 'rotate-180' : ''}`} />
                                        </button>

                                        {contractOpen && (
                                            <div className="px-6 pb-6 pt-2 border-t border-gray-200">
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
                                                            <div className="text-xs text-gray-500 mb-1">{item.label}</div>
                                                            <div className="font-medium text-gray-900">{item.value}</div>
                                                        </div>
                                                    ))}
                                                </div>


                                                {contractDetails.hasContractDocument && (
                                                    <button className="flex items-center gap-2 text-sm text-[#2F8481] hover:underline font-medium transition-colors">
                                                        <Download className="w-4 h-4" />
                                                        Atsisiųsti sutartį
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </section>
                                )}

                                {/* Sutarties nutraukimas — tenant request */}
                                {selectedRental && selectedRentalId !== 'all' && (
                                    <TenantTerminationRequest
                                        propertyId={selectedRental.id}
                                        cardBase={cardBase}
                                        cardBgStyle={cardBgStyle}
                                    />
                                )}

                                {/* Kontaktai */}
                                {(contacts.landlord || contacts.chairman || contacts.managementCompany || contacts.customContacts.length > 0) && (
                                    <section className={`${cardBase} p-6`} style={cardBgStyle}>
                                        <div className="flex items-center gap-2 mb-5">
                                            <div className="w-9 h-9 bg-[#E8F5F4] rounded-xl flex items-center justify-center">
                                                <Users className="w-5 h-5 text-[#2F8481]" />
                                            </div>
                                            <h2 className="text-lg font-semibold text-gray-900">Kontaktai</h2>
                                        </div>

                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                            {/* Nuomotojas */}
                                            {contacts.landlord && (
                                                <div className="p-4 rounded-xl bg-gray-50/80 border border-gray-100">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <div className="w-7 h-7 bg-[#2F8481]/10 rounded-lg flex items-center justify-center">
                                                            <User className="w-3.5 h-3.5 text-[#2F8481]" />
                                                        </div>
                                                        <span className="text-sm font-semibold text-gray-900">Nuomotojas</span>
                                                    </div>
                                                    <div className="space-y-1.5 text-sm">
                                                        {contacts.landlord.name && (
                                                            <div className="text-gray-700 font-medium">{contacts.landlord.name}</div>
                                                        )}
                                                        {contacts.landlord.phone && (
                                                            <a href={`tel:${contacts.landlord.phone}`} className="flex items-center gap-1.5 text-[#2F8481] hover:underline transition-colors">
                                                                <Phone className="w-3.5 h-3.5" />{contacts.landlord.phone}
                                                            </a>
                                                        )}
                                                        {contacts.landlord.email && (
                                                            <a href={`mailto:${contacts.landlord.email}`} className="flex items-center gap-1.5 text-[#2F8481] hover:underline transition-colors">
                                                                <Mail className="w-3.5 h-3.5" />{contacts.landlord.email}
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Bendrijos pirmininkas */}
                                            {contacts.chairman && (
                                                <div className="p-4 rounded-xl bg-gray-50/80 border border-gray-100">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center">
                                                            <Shield className="w-3.5 h-3.5 text-amber-600" />
                                                        </div>
                                                        <span className="text-sm font-semibold text-gray-900">Bendrijos pirmininkas</span>
                                                    </div>
                                                    <div className="space-y-1.5 text-sm">
                                                        {contacts.chairman.name && (
                                                            <div className="text-gray-700 font-medium">{contacts.chairman.name}</div>
                                                        )}
                                                        {contacts.chairman.phone && (
                                                            <a href={`tel:${contacts.chairman.phone}`} className="flex items-center gap-1.5 text-[#2F8481] hover:underline transition-colors">
                                                                <Phone className="w-3.5 h-3.5" />{contacts.chairman.phone}
                                                            </a>
                                                        )}
                                                        {contacts.chairman.email && (
                                                            <a href={`mailto:${contacts.chairman.email}`} className="flex items-center gap-1.5 text-[#2F8481] hover:underline transition-colors">
                                                                <Mail className="w-3.5 h-3.5" />{contacts.chairman.email}
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Valdymo įmonė */}
                                            {contacts.managementCompany && (
                                                <div className="p-4 rounded-xl bg-gray-50/80 border border-gray-100">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">
                                                            <Building className="w-3.5 h-3.5 text-blue-600" />
                                                        </div>
                                                        <span className="text-sm font-semibold text-gray-900">Valdymo įmonė</span>
                                                    </div>
                                                    <div className="space-y-1.5 text-sm">
                                                        {contacts.managementCompany.companyName && (
                                                            <div className="text-gray-700 font-medium">{contacts.managementCompany.companyName}</div>
                                                        )}
                                                        {contacts.managementCompany.contactPerson && (
                                                            <div className="text-gray-500 text-xs">Kontaktinis asmuo: {contacts.managementCompany.contactPerson}</div>
                                                        )}
                                                        {contacts.managementCompany.phone && (
                                                            <a href={`tel:${contacts.managementCompany.phone}`} className="flex items-center gap-1.5 text-[#2F8481] hover:underline transition-colors">
                                                                <Phone className="w-3.5 h-3.5" />{contacts.managementCompany.phone}
                                                            </a>
                                                        )}
                                                        {contacts.managementCompany.email && (
                                                            <a href={`mailto:${contacts.managementCompany.email}`} className="flex items-center gap-1.5 text-[#2F8481] hover:underline transition-colors">
                                                                <Mail className="w-3.5 h-3.5" />{contacts.managementCompany.email}
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Papildomi kontaktai */}
                                            {contacts.customContacts.map((cc) => (
                                                <div key={cc.id} className="p-4 rounded-xl bg-gray-50/80 border border-gray-100">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <div className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center">
                                                            <Phone className="w-3.5 h-3.5 text-gray-500" />
                                                        </div>
                                                        <span className="text-sm font-semibold text-gray-900">{cc.title || 'Kontaktas'}</span>
                                                    </div>
                                                    <div className="space-y-1.5 text-sm">
                                                        {cc.content && (
                                                            (() => {
                                                                const isPhone = /^[+\d][\d\s\-()]+$/.test(cc.content.trim());
                                                                const isEmail = cc.content.includes('@');
                                                                if (isPhone) {
                                                                    return (
                                                                        <a href={`tel:${cc.content}`} className="flex items-center gap-1.5 text-[#2F8481] hover:underline transition-colors">
                                                                            <Phone className="w-3.5 h-3.5" />{cc.content}
                                                                        </a>
                                                                    );
                                                                }
                                                                if (isEmail) {
                                                                    return (
                                                                        <a href={`mailto:${cc.content}`} className="flex items-center gap-1.5 text-[#2F8481] hover:underline transition-colors">
                                                                            <Mail className="w-3.5 h-3.5" />{cc.content}
                                                                        </a>
                                                                    );
                                                                }
                                                                return <div className="text-gray-700">{cc.content}</div>;
                                                            })()
                                                        )}
                                                        {cc.comment && (
                                                            <div className="text-xs text-gray-400 italic">{cc.comment}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                )}

                                {/* Būsto informacija */}
                                {propertyInfo && (
                                    <section className={`${cardBase} p-6`} style={cardBgStyle}>
                                        <div className="flex items-center gap-2 mb-5">
                                            <div className="w-9 h-9 bg-[#E8F5F4] rounded-xl flex items-center justify-center">
                                                <Home className="w-5 h-5 text-[#2F8481]" />
                                            </div>
                                            <h2 className="text-lg font-semibold text-gray-900">Būsto informacija</h2>
                                        </div>

                                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                            {[
                                                {
                                                    icon: Building,
                                                    label: 'Tipas',
                                                    value: propertyInfo.propertyType === 'house' ? 'Namas'
                                                        : propertyInfo.propertyType === 'room' ? 'Kambarys'
                                                            : 'Butas',
                                                    show: true,
                                                },
                                                {
                                                    icon: DoorOpen,
                                                    label: 'Buto nr.',
                                                    value: propertyInfo.apartmentNumber || '—',
                                                    show: !!propertyInfo.apartmentNumber,
                                                },
                                                {
                                                    icon: Layers,
                                                    label: 'Kambariai',
                                                    value: propertyInfo.rooms ? String(propertyInfo.rooms) : '—',
                                                    show: !!propertyInfo.rooms,
                                                },
                                                {
                                                    icon: Maximize2,
                                                    label: 'Plotas',
                                                    value: propertyInfo.area ? `${propertyInfo.area} m²` : '—',
                                                    show: !!propertyInfo.area && propertyInfo.area > 0,
                                                },
                                                {
                                                    icon: Building,
                                                    label: 'Aukštas',
                                                    value: propertyInfo.floor
                                                        ? propertyInfo.totalFloors
                                                            ? `${propertyInfo.floor} / ${propertyInfo.totalFloors}`
                                                            : String(propertyInfo.floor)
                                                        : '—',
                                                    show: !!propertyInfo.floor,
                                                },
                                                {
                                                    icon: Thermometer,
                                                    label: 'Šildymas',
                                                    value: propertyInfo.heatingType === 'central' ? 'Centralinis'
                                                        : propertyInfo.heatingType === 'individual' ? 'Individualus'
                                                            : propertyInfo.heatingType === 'gas' ? 'Dujinis'
                                                                : propertyInfo.heatingType === 'electric' ? 'Elektrinis'
                                                                    : propertyInfo.heatingType || '—',
                                                    show: !!propertyInfo.heatingType,
                                                },
                                            ].filter(item => item.show).map((item, i) => (
                                                <div key={i} className="p-3 rounded-xl bg-gray-50/80">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <item.icon className="w-4 h-4 text-gray-400" />
                                                        <span className="text-xs text-gray-500">{item.label}</span>
                                                    </div>
                                                    <div className="text-sm font-semibold text-gray-900">{item.value}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                )}

                                {/* Mokėjimo duomenys */}
                                {paymentInfo && (
                                    <section className={`${cardBase} p-6`} style={cardBgStyle}>
                                        <div className="flex items-center gap-2 mb-5">
                                            <div className="w-9 h-9 bg-[#E8F5F4] rounded-xl flex items-center justify-center">
                                                <Wallet className="w-5 h-5 text-[#2F8481]" />
                                            </div>
                                            <h2 className="text-lg font-semibold text-gray-900">Mokėjimo duomenys</h2>
                                        </div>

                                        <div className="space-y-4">
                                            {paymentInfo.bankAccount && (
                                                <div className="p-4 rounded-xl bg-gray-50/80 border border-gray-100">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <CreditCard className="w-4 h-4 text-gray-400" />
                                                        <span className="text-xs text-gray-500">Banko sąskaita (IBAN)</span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm font-bold text-gray-900 font-mono tracking-wider">{paymentInfo.bankAccount}</span>
                                                        <button
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(paymentInfo.bankAccount || '');
                                                            }}
                                                            className="p-1.5 rounded-lg hover:bg-gray-200/80 transition-colors text-gray-400 hover:text-gray-600"
                                                            title="Kopijuoti"
                                                        >
                                                            <Copy className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                                {paymentInfo.recipientName && (
                                                    <div className="p-3 rounded-xl bg-gray-50/80">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <User className="w-4 h-4 text-gray-400" />
                                                            <span className="text-xs text-gray-500">Gavėjas</span>
                                                        </div>
                                                        <div className="text-sm font-semibold text-gray-900">{paymentInfo.recipientName}</div>
                                                    </div>
                                                )}
                                                {paymentInfo.paymentDay && (
                                                    <div className="p-3 rounded-xl bg-gray-50/80">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <CalendarDays className="w-4 h-4 text-gray-400" />
                                                            <span className="text-xs text-gray-500">Mokėjimo diena</span>
                                                        </div>
                                                        <div className="text-sm font-semibold text-gray-900">Kiekvieno mėnesio {paymentInfo.paymentDay} d.</div>
                                                    </div>
                                                )}
                                            </div>

                                            {paymentInfo.paymentPurpose && (
                                                <div className="p-3 rounded-xl bg-gray-50/80">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <FileText className="w-4 h-4 text-gray-400" />
                                                        <span className="text-xs text-gray-500">Mokėjimo paskirtis</span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm font-semibold text-gray-900">{paymentInfo.paymentPurpose}</span>
                                                        <button
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(paymentInfo.paymentPurpose || '');
                                                            }}
                                                            className="p-1.5 rounded-lg hover:bg-gray-200/80 transition-colors text-gray-400 hover:text-gray-600"
                                                            title="Kopijuoti"
                                                        >
                                                            <Copy className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Stripe pay button */}
                                        {stripeEnabled && selectedRental && (
                                            <button
                                                onClick={() => setPayModalOpen(true)}
                                                className="w-full mt-4 py-3 px-5 bg-teal-500 hover:bg-teal-600 text-white font-bold text-sm rounded-xl transition-all duration-200 active:scale-[0.98] shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2"
                                            >
                                                <CreditCard className="w-4 h-4" />
                                                Mokėti nuomą per Stripe
                                            </button>
                                        )}
                                    </section>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Floating Chat */}
            {user?.id && (
                <MessagingPanel
                    currentUserId={user.id}
                    currentUserName={userName}
                />
            )}

            {/* Pay Rent Modal */}
            {selectedRental && (
                <PayRentModal
                    isOpen={payModalOpen}
                    onClose={() => setPayModalOpen(false)}
                    propertyId={selectedRental.id}
                    addressId={selectedRental.addressId}
                    amount={selectedRental.rentAmount || hero.amount}
                    propertyLabel={`${selectedRental.address} — ${selectedRental.unitLabel}`}
                    onPaymentSuccess={() => {
                        setPayModalOpen(false);
                        dashboard.refresh();
                    }}
                />
            )}

            {/* Join Code Modal */}
            {showJoinModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowJoinModal(false)} />
                    <div
                        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-gray-200/80 bg-cover bg-center"
                        style={{ backgroundImage: `url('/images/CardsBackground.webp')` }}
                    >
                        <button
                            onClick={() => setShowJoinModal(false)}
                            className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                        >
                            <X className="w-4 h-4 text-gray-500" />
                        </button>

                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-[#2F8481] flex items-center justify-center shadow-md">
                                <Home className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900 text-[15px]">Pridėti būstą</h3>
                                <p className="text-xs text-gray-500">Įveskite kvietimo kodą</p>
                            </div>
                        </div>

                        {joinSuccess && (
                            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm mb-4">
                                <Check className="w-4 h-4" />
                                Sėkmingai prisijungta!
                            </div>
                        )}

                        {joinError && (
                            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm mb-4">
                                <AlertCircle className="w-4 h-4" />
                                {joinError}
                            </div>
                        )}

                        <div className="space-y-3">
                            <div className="relative">
                                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={joinCode}
                                    onChange={(e) => {
                                        setJoinCode(e.target.value.toUpperCase());
                                        setJoinError(null);
                                    }}
                                    placeholder="XXXX - XXXX"
                                    maxLength={9}
                                    className="w-full pl-10 pr-4 py-3 rounded-xl text-center font-mono text-base tracking-[0.2em] bg-gray-900/[0.03] border border-gray-200 focus:border-[#2F8481] focus:ring-2 focus:ring-[#2F8481]/20 text-gray-900 outline-none transition-colors placeholder:text-gray-300"
                                    autoFocus
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleJoinByCode(); }}
                                />
                            </div>
                            <button
                                onClick={handleJoinByCode}
                                disabled={!joinCode.trim() || joinCode.replace(/-/g, '').length < 8 || isJoining || joinSuccess}
                                className="w-full px-5 py-3 bg-[#2F8481] hover:bg-[#297a77] text-white rounded-xl font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-sm"
                            >
                                {isJoining ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Jungiamasi...
                                    </>
                                ) : (
                                    <>
                                        <Home className="w-4 h-4" />
                                        Prisijungti
                                    </>
                                )}
                            </button>
                        </div>

                        <p className="text-[11px] text-gray-400 mt-3 text-center leading-relaxed">
                            Gavote kodą iš nuomotojo? Įveskite jį aukščiau.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TenantDashboardPage;
