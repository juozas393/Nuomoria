import React, { useState } from 'react';
import {
    Building,
    Calendar,
    CreditCard,
    Mail,
    User,
    Check,
    X,
    Clock
} from 'lucide-react';
import { TenantInvitation } from '../../../lib/database';

interface PendingInvitationCardProps {
    invitation: TenantInvitation;
    onAccept: (id: string) => Promise<{ success: boolean; error?: string }>;
    onDecline: (id: string) => Promise<{ success: boolean; error?: string }>;
    isDark?: boolean;
    cardBase?: string;
}

const PendingInvitationCard: React.FC<PendingInvitationCardProps> = ({
    invitation,
    onAccept,
    onDecline,
    isDark = false,
    cardBase = 'bg-white'
}) => {
    const [isAccepting, setIsAccepting] = useState(false);
    const [isDeclining, setIsDeclining] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return 'Nenurodyta';
        return new Date(dateStr).toLocaleDateString('lt-LT', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const formatCurrency = (amount?: number) => {
        if (!amount) return '—';
        return new Intl.NumberFormat('lt-LT', {
            style: 'currency',
            currency: 'EUR'
        }).format(amount);
    };

    const handleAccept = async () => {
        setIsAccepting(true);
        setError(null);
        const result = await onAccept(invitation.id);
        if (!result.success) {
            setError(result.error || 'Klaida');
        }
        setIsAccepting(false);
    };

    const handleDecline = async () => {
        setIsDeclining(true);
        setError(null);
        const result = await onDecline(invitation.id);
        if (!result.success) {
            setError(result.error || 'Klaida');
        }
        setIsDeclining(false);
    };

    const createdAt = new Date(invitation.created_at);
    const now = new Date();
    const daysSinceCreated = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

    return (
        <div className={`${cardBase} rounded-2xl p-5 border ${isDark ? 'border-white/10' : 'border-gray-200'} transition-colors hover:shadow-lg`}>
            {/* Header with Property Info */}
            <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-[#2F8481] to-[#1a5553] rounded-xl flex items-center justify-center flex-shrink-0">
                    <Building className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg truncate">
                        {invitation.property_label || 'Būstas'}
                    </h3>
                    <div className={`flex items-center gap-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        <Mail className="w-4 h-4" />
                        <span className="truncate">Nuo: {invitation.invited_by_email}</span>
                    </div>
                </div>
                <div className={`flex items-center gap-1 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    <Clock className="w-3 h-3" />
                    {daysSinceCreated === 0 ? 'Šiandien' : daysSinceCreated === 1 ? 'Vakar' : `Prieš ${daysSinceCreated} d.`}
                </div>
            </div>

            {/* Contract Details */}
            <div className={`grid grid-cols-2 gap-3 py-3 border-y ${isDark ? 'border-white/10' : 'border-gray-100'}`}>
                {invitation.contract_start && (
                    <div className="flex items-center gap-2">
                        <Calendar className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                        <div>
                            <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Pradžia</div>
                            <div className="text-sm font-medium">{formatDate(invitation.contract_start)}</div>
                        </div>
                    </div>
                )}
                {invitation.contract_end && (
                    <div className="flex items-center gap-2">
                        <Calendar className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                        <div>
                            <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Pabaiga</div>
                            <div className="text-sm font-medium">{formatDate(invitation.contract_end)}</div>
                        </div>
                    </div>
                )}
                {invitation.rent && (
                    <div className="flex items-center gap-2">
                        <CreditCard className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                        <div>
                            <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Nuoma/mėn</div>
                            <div className="text-sm font-medium text-[#2F8481]">{formatCurrency(invitation.rent)}</div>
                        </div>
                    </div>
                )}
                {invitation.deposit && (
                    <div className="flex items-center gap-2">
                        <CreditCard className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                        <div>
                            <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Užstatas</div>
                            <div className="text-sm font-medium">{formatCurrency(invitation.deposit)}</div>
                        </div>
                    </div>
                )}
            </div>

            {/* Error Message */}
            {error && (
                <div className="mt-3 p-2 bg-red-50 text-red-600 text-sm rounded-lg">
                    {error}
                </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 mt-4">
                <button
                    onClick={handleDecline}
                    disabled={isAccepting || isDeclining}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-colors ${isDark
                            ? 'bg-white/5 hover:bg-white/10 text-gray-300'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        } disabled:opacity-50`}
                >
                    {isDeclining ? (
                        <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <X className="w-4 h-4" />
                    )}
                    Atmesti
                </button>
                <button
                    onClick={handleAccept}
                    disabled={isAccepting || isDeclining}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#2F8481] text-white rounded-xl font-medium hover:bg-[#267673] transition-colors disabled:opacity-50"
                >
                    {isAccepting ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <Check className="w-4 h-4" />
                    )}
                    Priimti
                </button>
            </div>
        </div>
    );
};

export default PendingInvitationCard;
