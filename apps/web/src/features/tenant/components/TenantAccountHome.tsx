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
    AlertCircle
} from 'lucide-react';
import { usePendingInvitations } from '../hooks/usePendingInvitations';
import PendingInvitationCard from './PendingInvitationCard';
import { tenantInvitationApi } from '../../../lib/database';

/**
 * Tenant Account Home - No Active Rentals State
 * Full account experience with profile, history, and join rental
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

// Mock rental history (would come from DB)
interface RentalHistoryItem {
    id: string;
    address: string;
    unitLabel: string;
    startDate: string;
    endDate: string;
    landlordName?: string;
}

const rentalHistory: RentalHistoryItem[] = [
    // Empty for now - will be populated from real data
];

// Mock activity (would come from notifications/events)
const recentActivity: Array<{
    id: string;
    type: 'payment' | 'document' | 'maintenance' | 'info';
    title: string;
    description: string;
    timestamp: string;
}> = [];

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

    // Fetch pending invitations
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
            // Refresh invitations after successful join
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

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LEFT COLUMN - Main Content */}
            <div className="lg:col-span-2 space-y-6">

                {/* Hero Section */}
                <section className="relative overflow-hidden rounded-2xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#2F8481] via-[#35918e] to-[#1a6b68]" />
                    <div className="absolute -top-20 -right-20 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
                    <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-black/10 rounded-full blur-2xl" />

                    <div className="relative z-10 p-6 sm:p-8">
                        <p className="text-white/70 text-xs font-medium uppercase tracking-wider mb-1">Sveiki!</p>
                        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">{userName}</h1>
                        <p className="text-white/60 text-sm max-w-md">
                            Šiuo metu neturite aktyvaus būsto. Galite prisijungti su kvietimo kodu arba peržiūrėti savo istoriją.
                        </p>
                    </div>
                </section>

                {/* Profile Section */}
                <section className={`${cardBase} rounded-2xl p-6`}>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold">Jūsų profilis</h2>
                        <button
                            onClick={() => navigate('/profile')}
                            className="text-sm text-[#2F8481] hover:underline font-medium flex items-center gap-1"
                        >
                            <Edit3 className="w-4 h-4" />
                            Redaguoti
                        </button>
                    </div>

                    <div className="flex items-start gap-4">
                        {/* Avatar */}
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#2F8481] to-[#1a5553] flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {userAvatar ? (
                                <img src={userAvatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <User className="w-8 h-8 text-white" />
                            )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0 space-y-2">
                            <div className="font-medium text-lg">{userName}</div>
                            <div className={`flex items-center gap-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                <Mail className="w-4 h-4" />
                                <span className="truncate">{userEmail}</span>
                            </div>
                            {userPhone && (
                                <div className={`flex items-center gap-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                    <Phone className="w-4 h-4" />
                                    <span>{userPhone}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex flex-wrap gap-2 mt-5 pt-5 border-t border-gray-200 dark:border-white/10">
                        <button
                            onClick={() => navigate('/profile')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-100 hover:bg-gray-200'} transition-colors`}
                        >
                            <Edit3 className="w-4 h-4" />
                            Redaguoti profilį
                        </button>
                        <button
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-100 hover:bg-gray-200'} transition-colors`}
                        >
                            <Key className="w-4 h-4" />
                            Keisti slaptažodį
                        </button>
                        {onLogout && (
                            <button
                                onClick={onLogout}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                                Atsijungti
                            </button>
                        )}
                    </div>
                </section>

                {/* Rental History Section */}
                <section className={`${cardBase} rounded-2xl p-6`}>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold">Būstų istorija</h2>
                    </div>

                    {rentalHistory.length > 0 ? (
                        <div className="space-y-3">
                            {rentalHistory.map((rental: any) => (
                                <div key={rental.id} className={`flex items-center justify-between p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-[#2F8481]/10 rounded-xl flex items-center justify-center">
                                            <Building className="w-5 h-5 text-[#2F8481]" />
                                        </div>
                                        <div>
                                            <div className="font-medium">{rental.address}</div>
                                            <div className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                                {formatDate(rental.startDate)} – {formatDate(rental.endDate)}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                                            Baigta
                                        </span>
                                        <button className="text-[#2F8481] hover:underline text-sm font-medium flex items-center gap-1">
                                            Peržiūrėti <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className={`text-center py-10 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            <Building className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p className="font-medium mb-1">Kol kas nėra ankstesnių būstų</p>
                            <p className="text-sm">Jūsų būstų istorija bus rodoma čia.</p>
                        </div>
                    )}
                </section>

                {/* Recent Activity Section */}
                <section className={`${cardBase} rounded-2xl p-6`}>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold">Paskutinė veikla</h2>
                    </div>

                    {recentActivity.length > 0 ? (
                        <div className="space-y-3">
                            {recentActivity.map((activity) => {
                                const Icon = getActivityIcon(activity.type);
                                return (
                                    <div key={activity.id} className={`flex items-start gap-3 p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                                        <div className="w-8 h-8 bg-[#2F8481]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <Icon className="w-4 h-4 text-[#2F8481]" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-sm">{activity.title}</div>
                                            <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'} line-clamp-1`}>{activity.description}</div>
                                            <div className={`text-xs ${isDark ? 'text-gray-600' : 'text-gray-400'} mt-1 flex items-center gap-1`}>
                                                <Clock className="w-3 h-3" />
                                                {activity.timestamp}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className={`text-center py-10 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p className="font-medium mb-1">Kol kas nėra veiklos</p>
                            <p className="text-sm">Jūsų mokėjimai, dokumentai ir kita veikla bus rodoma čia.</p>
                        </div>
                    )}
                </section>
            </div>

            {/* RIGHT COLUMN - Sidebar */}
            <div className="space-y-6">

                {/* Pending Invitations / Join Rental Card */}
                <section className={`${cardBase} rounded-2xl p-6`}>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-[#2F8481]/10 rounded-xl flex items-center justify-center">
                            {hasInvitations ? (
                                <Inbox className="w-5 h-5 text-[#2F8481]" />
                            ) : (
                                <Home className="w-5 h-5 text-[#2F8481]" />
                            )}
                        </div>
                        <h3 className="font-semibold">
                            {hasInvitations ? 'Gauti kvietimai' : 'Prisijungti prie būsto'}
                        </h3>
                        {hasInvitations && (
                            <span className="ml-auto bg-[#2F8481] text-white text-xs px-2 py-0.5 rounded-full">
                                {invitations.length}
                            </span>
                        )}
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
                                    isDark={isDark}
                                    cardBase={isDark ? 'bg-white/5' : 'bg-gray-50'}
                                />
                            ))}
                        </div>
                    ) : (
                        <>
                            {/* Success message */}
                            {joinSuccess && (
                                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm mb-4">
                                    <Check className="w-5 h-5" />
                                    Sėkmingai prisijungta prie būsto!
                                </div>
                            )}

                            {/* Error message */}
                            {joinError && (
                                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm mb-4">
                                    <AlertCircle className="w-5 h-5" />
                                    {joinError}
                                </div>
                            )}

                            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} mb-4`}>
                                Gavote kvietimo kodą iš nuomotojo? Įveskite jį žemiau.
                            </p>

                            {/* Invite Code Input */}
                            <div className="space-y-3">
                                <div className="relative">
                                    <KeyRound className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                                    <input
                                        type="text"
                                        value={inviteCode}
                                        onChange={(e) => {
                                            setInviteCode(e.target.value.toUpperCase());
                                            setJoinError(null);
                                        }}
                                        placeholder="XXXX-XXXX"
                                        maxLength={9}
                                        className={`w-full pl-12 pr-4 py-3 rounded-xl text-center font-mono text-lg tracking-widest ${isDark
                                            ? 'bg-white/5 border border-white/10 focus:border-[#2F8481] text-white'
                                            : 'bg-gray-50 border border-gray-200 focus:border-[#2F8481]'
                                            } outline-none transition-colors`}
                                    />
                                </div>
                                <button
                                    onClick={handleJoinRental}
                                    disabled={!inviteCode.trim() || inviteCode.replace(/-/g, '').length < 8 || isJoining}
                                    className="w-full px-5 py-3 bg-[#2F8481] text-white rounded-xl font-medium hover:bg-[#267673] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                                >
                                    {isJoining ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Jungiamasi...
                                        </>
                                    ) : (
                                        <>
                                            <Home className="w-5 h-5" />
                                            Prisijungti
                                        </>
                                    )}
                                </button>
                            </div>

                            <div className={`mt-4 pt-4 border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                                <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                    Jei nuomotojas žino jūsų el. paštą (<strong>{user?.email}</strong>),
                                    kvietimas pasirodys automatiškai.
                                </p>
                            </div>
                        </>
                    )}
                </section>

                {/* Help Card */}
                <section className={`${cardBase} rounded-2xl p-6`}>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                            <HelpCircle className="w-5 h-5 text-blue-600" />
                        </div>
                        <h3 className="font-semibold">Pagalba</h3>
                    </div>

                    <div className="space-y-2">
                        {[
                            { label: 'Kaip gauti kvietimą?', href: '#' },
                            { label: 'Kaip veikia mokėjimai?', href: '#' },
                            { label: 'Kaip pateikti gedimą?', href: '#' },
                        ].map((item, i) => (
                            <a
                                key={i}
                                href={item.href}
                                className={`flex items-center justify-between p-3 rounded-xl ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'} transition-colors`}
                            >
                                <span className="text-sm">{item.label}</span>
                                <ExternalLink className="w-4 h-4 text-gray-400" />
                            </a>
                        ))}
                    </div>

                    <button className={`w-full mt-4 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-100 hover:bg-gray-200'} transition-colors`}>
                        <MessageCircle className="w-4 h-4" />
                        Rašyti palaikymui
                    </button>
                </section>

                {/* Settings Card */}
                <section className={`${cardBase} rounded-2xl p-6`}>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                            <Settings className="w-5 h-5 text-purple-600" />
                        </div>
                        <h3 className="font-semibold">Nustatymai</h3>
                    </div>

                    <div className="space-y-1">
                        {[
                            { icon: Bell, label: 'Pranešimų nustatymai' },
                            { icon: Shield, label: 'Privatumas' },
                            { icon: Globe, label: 'Kalba: Lietuvių' },
                        ].map((item, i) => (
                            <button
                                key={i}
                                className={`w-full flex items-center gap-3 p-3 rounded-xl text-left ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'} transition-colors`}
                            >
                                <item.icon className="w-4 h-4 text-gray-400" />
                                <span className="text-sm">{item.label}</span>
                                <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
                            </button>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default TenantAccountHome;
