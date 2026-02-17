import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    User,
    Mail,
    Phone,
    Calendar,
    Home,
    Building,
    FileText,
    CreditCard,
    Settings,
    HelpCircle,
    LogOut,
    ChevronRight,
    Clock,
    Edit3,
    Key,
    Bell,
    Globe,
    Shield,
    MessageCircle,
    Check,
    ExternalLink,
    Inbox,
    Loader2,
    KeyRound,
    AlertCircle,
    Sparkles,
    ArrowRight
} from 'lucide-react';
import { usePendingInvitations } from '../hooks/usePendingInvitations';
import PendingInvitationCard from './PendingInvitationCard';
import { tenantInvitationApi } from '../../../lib/database';

/**
 * Tenant Account Home - No Active Rentals State
 * Cards use CardsBackground.webp geometric pattern (untouched).
 * All other UI elements are polished for a premium SaaS feel.
 */

interface TenantAccountHomeProps {
    user: {
        id: string;
        email?: string;
        user_metadata?: {
            full_name?: string;
            avatar_url?: string;
            phone?: string;
        };
    } | null;
    isDark: boolean;
    cardBase: string;
    inviteCode: string;
    setInviteCode: (code: string) => void;
    onLogout?: () => void;
}

// Mock rental history
interface RentalHistoryItem {
    id: string;
    address: string;
    unitLabel: string;
    startDate: string;
    endDate: string;
    landlordName?: string;
}

const rentalHistory: RentalHistoryItem[] = [];

// Mock activity
const recentActivity: Array<{
    id: string;
    type: 'payment' | 'document' | 'maintenance' | 'info';
    title: string;
    description: string;
    timestamp: string;
}> = [];

// Card background — DO NOT MODIFY
const cardBgStyle: React.CSSProperties = {
    backgroundImage: `url('/images/CardsBackground.webp')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
};

const TenantAccountHome: React.FC<TenantAccountHomeProps> = ({
    user,
    isDark,
    cardBase,
    inviteCode,
    setInviteCode,
    onLogout,
}) => {
    const navigate = useNavigate();
    const [isJoining, setIsJoining] = useState(false);
    const [joinError, setJoinError] = useState<string | null>(null);
    const [joinSuccess, setJoinSuccess] = useState(false);

    const {
        invitations,
        loading: invitationsLoading,
        acceptInvitation,
        declineInvitation,
        hasInvitations,
        refreshInvitations
    } = usePendingInvitations();

    const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Nuomininke';
    const userEmail = user?.email || '';
    const userPhone = user?.user_metadata?.phone || '';
    const userAvatar = user?.user_metadata?.avatar_url;

    const handleJoinRental = async () => {
        if (!inviteCode.trim()) return;
        setIsJoining(true);
        setJoinError(null);
        try {
            await tenantInvitationApi.joinByCode(inviteCode.trim());
            setJoinSuccess(true);
            setInviteCode('');
            setTimeout(() => {
                refreshInvitations();
                setJoinSuccess(false);
            }, 2000);
        } catch (err: any) {
            setJoinError(err.message || 'Nepavyko prisijungti');
        } finally {
            setIsJoining(false);
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('lt-LT', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    const getActivityIcon = (type: string) => {
        switch (type) {
            case 'payment': return CreditCard;
            case 'document': return FileText;
            case 'maintenance': return Settings;
            default: return Bell;
        }
    };

    // Card styling — geometric pattern bg + rounded + drop shadow
    const card = 'rounded-3xl shadow-xl shadow-black/8 overflow-hidden';

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* LEFT COLUMN */}
            <div className="lg:col-span-2 space-y-5">

                {/* ── Hero ─────────────────────────────────────── */}
                <section className="relative overflow-hidden rounded-3xl shadow-xl shadow-black/10">
                    <div className="absolute inset-0 bg-[#2F8481]" />
                    <div className="absolute -top-24 -right-24 w-56 h-56 bg-white/10 rounded-full blur-3xl" />
                    <div className="absolute -bottom-20 -left-20 w-44 h-44 bg-black/10 rounded-full blur-3xl" />

                    <div className="relative z-10 p-7 sm:p-9">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/15 backdrop-blur-sm rounded-full text-white/80 text-xs font-medium mb-3">
                            <Sparkles className="w-3.5 h-3.5" />
                            Nuomininko paskyra
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1.5 tracking-tight">{userName}</h1>
                        <p className="text-white/60 text-sm max-w-md leading-relaxed">
                            Šiuo metu neturite aktyvaus būsto. Prisijunkite su kvietimo kodu arba peržiūrėkite savo istoriją.
                        </p>
                    </div>
                </section>

                {/* ── Profile ──────────────────────────────────── */}
                <section className={card} style={cardBgStyle}>
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-[15px] font-semibold text-gray-800 tracking-tight">Jūsų profilis</h2>
                            <button
                                onClick={() => navigate('/tenant/settings')}
                                className="text-xs text-[#2F8481] hover:text-[#267673] font-semibold flex items-center gap-1 transition-colors"
                            >
                                <Edit3 className="w-3.5 h-3.5" />
                                Redaguoti
                            </button>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-[#2F8481] flex items-center justify-center flex-shrink-0 overflow-hidden ring-2 ring-white shadow-lg">
                                {userAvatar ? (
                                    <img loading="lazy" decoding="async" src={userAvatar} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <User className="w-7 h-7 text-white" />
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="font-semibold text-gray-900 text-[15px]">{userName}</div>
                                <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-0.5">
                                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                                    <span className="truncate">{userEmail}</span>
                                </div>
                                {userPhone && (
                                    <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-0.5">
                                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                                        <span>{userPhone}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2 px-6 pb-5 pt-0">
                        <button
                            onClick={() => navigate('/tenant/settings')}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-gray-900/[0.05] hover:bg-gray-900/[0.08] text-gray-700 transition-colors"
                        >
                            <Edit3 className="w-3.5 h-3.5" />
                            Redaguoti profilį
                        </button>
                        <button
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-gray-900/[0.05] hover:bg-gray-900/[0.08] text-gray-700 transition-colors"
                        >
                            <Key className="w-3.5 h-3.5" />
                            Keisti slaptažodį
                        </button>
                    </div>
                </section>

                {/* ── Rental History ────────────────────────────── */}
                <section className={card} style={cardBgStyle}>
                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-9 h-9 rounded-xl bg-gray-900/[0.05] flex items-center justify-center">
                                <Building className="w-4.5 h-4.5 text-gray-500" />
                            </div>
                            <h2 className="text-[15px] font-semibold text-gray-800 tracking-tight">Būstų istorija</h2>
                        </div>

                        {rentalHistory.length > 0 ? (
                            <div className="space-y-3">
                                {rentalHistory.map((rental: any) => (
                                    <div key={rental.id} className="flex items-center justify-between p-3.5 rounded-xl bg-gray-900/[0.03] border border-gray-900/[0.04]">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 bg-[#2F8481]/10 rounded-xl flex items-center justify-center">
                                                <Building className="w-4 h-4 text-[#2F8481]" />
                                            </div>
                                            <div>
                                                <div className="font-medium text-sm text-gray-900">{rental.address}</div>
                                                <div className="text-xs text-gray-500">
                                                    {formatDate(rental.startDate)} – {formatDate(rental.endDate)}
                                                </div>
                                            </div>
                                        </div>
                                        <button className="text-[#2F8481] text-xs font-semibold flex items-center gap-0.5 hover:underline">
                                            Peržiūrėti <ChevronRight className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center py-8 text-center">
                                <div className="w-12 h-12 rounded-2xl bg-gray-900/[0.04] flex items-center justify-center mb-3">
                                    <Building className="w-5 h-5 text-gray-300" />
                                </div>
                                <p className="font-medium text-sm text-gray-500">Nėra ankstesnių būstų</p>
                                <p className="text-xs text-gray-500 mt-0.5">Jūsų nuomos istorija bus rodoma čia</p>
                            </div>
                        )}
                    </div>
                </section>

                {/* ── Recent Activity ──────────────────────────── */}
                <section className={card} style={cardBgStyle}>
                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-9 h-9 rounded-xl bg-gray-900/[0.05] flex items-center justify-center">
                                <Clock className="w-4.5 h-4.5 text-gray-500" />
                            </div>
                            <h2 className="text-[15px] font-semibold text-gray-800 tracking-tight">Paskutinė veikla</h2>
                        </div>

                        {recentActivity.length > 0 ? (
                            <div className="space-y-2">
                                {recentActivity.map((activity) => {
                                    const Icon = getActivityIcon(activity.type);
                                    return (
                                        <div key={activity.id} className="flex items-start gap-3 p-3 rounded-xl bg-gray-900/[0.03]">
                                            <div className="w-8 h-8 bg-[#2F8481]/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <Icon className="w-4 h-4 text-[#2F8481]" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-sm text-gray-900">{activity.title}</div>
                                                <div className="text-xs text-gray-500 line-clamp-1">{activity.description}</div>
                                                <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {activity.timestamp}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center py-8 text-center">
                                <div className="w-12 h-12 rounded-2xl bg-gray-900/[0.04] flex items-center justify-center mb-3">
                                    <Clock className="w-5 h-5 text-gray-300" />
                                </div>
                                <p className="font-medium text-sm text-gray-500">Nėra veiklos</p>
                                <p className="text-xs text-gray-500 mt-0.5">Mokėjimai, dokumentai ir kt. bus rodoma čia</p>
                            </div>
                        )}
                    </div>
                </section>
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-5">

                {/* ── Join Rental / Invitations ─────────────────── */}
                <section className={card} style={cardBgStyle}>
                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-10 h-10 rounded-xl bg-[#2F8481] flex items-center justify-center shadow-md">
                                {hasInvitations ? (
                                    <Inbox className="w-5 h-5 text-white" />
                                ) : (
                                    <Home className="w-5 h-5 text-white" />
                                )}
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900 text-[15px]">
                                    {hasInvitations ? 'Gauti kvietimai' : 'Prisijungti prie būsto'}
                                </h3>
                                {hasInvitations && (
                                    <span className="text-xs text-[#2F8481] font-medium">{invitations.length} nauji</span>
                                )}
                            </div>
                        </div>

                        {invitationsLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-6 h-6 text-[#2F8481] animate-spin" />
                            </div>
                        ) : hasInvitations ? (
                            <div className="space-y-4">
                                {invitations.map((invitation) => (
                                    <PendingInvitationCard
                                        key={invitation.id}
                                        invitation={invitation}
                                        onAccept={acceptInvitation}
                                        onDecline={declineInvitation}
                                        isDark={false}
                                        cardBase="bg-gray-50"
                                    />
                                ))}
                            </div>
                        ) : (
                            <>
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

                                <p className="text-sm text-gray-500 mb-3 leading-relaxed">
                                    Gavote kvietimo kodą iš nuomotojo? Įveskite jį žemiau.
                                </p>

                                <div className="space-y-2.5">
                                    <div className="relative">
                                        <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            value={inviteCode}
                                            onChange={(e) => {
                                                setInviteCode(e.target.value.toUpperCase());
                                                setJoinError(null);
                                            }}
                                            placeholder="XXXX - XXXX"
                                            maxLength={9}
                                            className="w-full pl-10 pr-4 py-3 rounded-xl text-center font-mono text-base tracking-[0.2em] bg-gray-900/[0.03] border border-gray-200 focus:border-[#2F8481] focus:ring-2 focus:ring-[#2F8481]/20 text-gray-900 outline-none transition-colors placeholder:text-gray-300"
                                        />
                                    </div>
                                    <button
                                        onClick={handleJoinRental}
                                        disabled={!inviteCode.trim() || inviteCode.replace(/-/g, '').length < 8 || isJoining}
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
                                        kvietimas pasirodys automatiškai.
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                </section>

                {/* ── Help ────────────────────────────────────── */}
                <section className={card} style={cardBgStyle}>
                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-9 h-9 rounded-xl bg-[#E8F5F4] flex items-center justify-center">
                                <HelpCircle className="w-4.5 h-4.5 text-[#2F8481]" />
                            </div>
                            <h3 className="font-semibold text-gray-900 text-[15px]">Pagalba</h3>
                        </div>

                        <div className="space-y-1">
                            {[
                                { label: 'Kaip gauti kvietimą?', href: '#' },
                                { label: 'Kaip veikia mokėjimai?', href: '#' },
                                { label: 'Kaip pateikti gedimą?', href: '#' },
                            ].map((item, i) => (
                                <a
                                    key={i}
                                    href={item.href}
                                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-900/[0.03] transition-colors group"
                                >
                                    <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">{item.label}</span>
                                    <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 transition-colors" />
                                </a>
                            ))}
                        </div>

                        <button className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-gray-900/[0.05] hover:bg-gray-900/[0.08] text-gray-600 transition-colors">
                            <MessageCircle className="w-3.5 h-3.5" />
                            Rašyti palaikymui
                        </button>
                    </div>
                </section>

                {/* ── Settings ────────────────────────────────── */}
                <section className={card} style={cardBgStyle}>
                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-9 h-9 rounded-xl bg-gray-900/[0.05] flex items-center justify-center">
                                <Settings className="w-4.5 h-4.5 text-gray-500" />
                            </div>
                            <h3 className="font-semibold text-gray-900 text-[15px]">Nustatymai</h3>
                        </div>

                        <div className="space-y-0.5">
                            {[
                                { icon: Bell, label: 'Pranešimų nustatymai' },
                                { icon: Shield, label: 'Privatumas' },
                                { icon: Globe, label: 'Kalba: Lietuvių' },
                            ].map((item, i) => (
                                <button
                                    key={i}
                                    className="w-full flex items-center gap-3 p-2.5 rounded-lg text-left hover:bg-gray-900/[0.03] transition-colors group"
                                >
                                    <item.icon className="w-4 h-4 text-gray-400 group-hover:text-gray-500 transition-colors" />
                                    <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">{item.label}</span>
                                    <ChevronRight className="w-3.5 h-3.5 text-gray-300 ml-auto group-hover:text-gray-500 transition-colors" />
                                </button>
                            ))}
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default TenantAccountHome;
