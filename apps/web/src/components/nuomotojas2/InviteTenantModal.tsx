import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
    X,
    UserPlus,
    Mail,
    Check,
    Copy,
    ClipboardCheck,
    Link2,
    KeyRound,
    Loader2,
    Sparkles,
    ArrowRight
} from 'lucide-react';
import { tenantInvitationApi, TenantInvitation } from '../../lib/database';
import { supabase } from '../../lib/supabase';
import { trackActivity } from '../../lib/activityTracker';

interface InviteTenantModalProps {
    isOpen: boolean;
    onClose: () => void;
    propertyId: string;
    propertyLabel: string;
    defaultRent?: number;
    defaultDeposit?: number;
    onSuccess?: () => void;
}

type InviteMode = 'email' | 'code';

const InviteTenantModal: React.FC<InviteTenantModalProps> = ({
    isOpen,
    onClose,
    propertyId,
    propertyLabel,
    defaultRent = 0,
    defaultDeposit = 0,
    onSuccess
}) => {
    const { user } = useAuth();
    const [mode, setMode] = useState<InviteMode>('code');
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [createdInvitation, setCreatedInvitation] = useState<TenantInvitation | null>(null);
    const [copied, setCopied] = useState(false);
    const [lastEmailSentAt, setLastEmailSentAt] = useState<number | null>(null);
    const [cooldownSeconds, setCooldownSeconds] = useState(0);

    const COOLDOWN_DURATION = 60;

    React.useEffect(() => {
        if (cooldownSeconds > 0) {
            const timer = setTimeout(() => setCooldownSeconds(prev => prev - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [cooldownSeconds]);

    const formatInviteCode = (token: string) => {
        const short = token.replace(/-/g, '').substring(0, 8).toUpperCase();
        return `${short.substring(0, 4)}-${short.substring(4, 8)}`;
    };

    const handleCopyCode = async () => {
        if (!createdInvitation) return;
        const code = formatInviteCode(createdInvitation.token);
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            const textArea = document.createElement('textarea');
            textArea.value = code;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleClose = () => {
        setEmail('');
        setCreatedInvitation(null);
        setCopied(false);
        setError(null);
        setMode('code');
        onClose();
    };

    const handleSubmit = async () => {
        if (mode === 'email') {
            if (!email.trim()) { setError('Įveskite el. paštą'); return; }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) { setError('Neteisingas el. pašto formatas'); return; }
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const invitationEmail = mode === 'email'
                ? email.trim().toLowerCase()
                : `pending_${Date.now()}@placeholder.local`;

            if (mode === 'email') {
                if (lastEmailSentAt) {
                    const secondsSinceLastEmail = Math.floor((Date.now() - lastEmailSentAt) / 1000);
                    if (secondsSinceLastEmail < COOLDOWN_DURATION) {
                        const remaining = COOLDOWN_DURATION - secondsSinceLastEmail;
                        setError(`Palaukite ${remaining} sek. prieš siunčiant kitą laišką`);
                        setCooldownSeconds(remaining);
                        setIsSubmitting(false);
                        return;
                    }
                }

                const existingInvitations = await tenantInvitationApi.getByPropertyId(propertyId);
                const pendingForEmail = existingInvitations.find(
                    inv => inv.email.toLowerCase() === invitationEmail.toLowerCase() && inv.status === 'pending'
                );
                if (pendingForEmail) {
                    console.log('Replacing existing pending invitation for:', invitationEmail);
                }
            }

            const invitation = await tenantInvitationApi.create({
                property_id: propertyId,
                email: invitationEmail,
                property_label: propertyLabel,
                rent: defaultRent || undefined,
                deposit: defaultDeposit || undefined
            });

            if (mode === 'email') {
                const inviteCode = formatInviteCode(invitation.token);
                const landlordName = (user as any)?.user_metadata?.full_name || (user as any)?.user_metadata?.name || user?.first_name || 'Nuomotojas';

                const { error: emailError } = await supabase.functions.invoke('send-invitation-email', {
                    body: {
                        to: invitationEmail,
                        inviteCode: inviteCode,
                        propertyLabel: propertyLabel,
                        landlordName: landlordName,
                        appUrl: window.location.origin,
                    }
                });

                if (emailError) {
                    console.error('Failed to send invitation email:', emailError);
                } else {
                    setLastEmailSentAt(Date.now());
                    setCooldownSeconds(COOLDOWN_DURATION);
                }
            }

            setCreatedInvitation(invitation);

            const desc = mode === 'email'
                ? `Kvietimo kodas išsiųstas: ${email.trim()}`
                : 'Sugeneruotas kvietimo kodas';
            trackActivity('INSERT', {
                tableName: 'tenant_invitations',
                recordId: propertyId,
                description: desc,
                metadata: { invitation_id: invitation.id, mode },
            });

            await new Promise(r => setTimeout(r, 300));
            onSuccess?.();
        } catch (err: any) {
            setError(err.message || 'Nepavyko sukurti kvietimo');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[420px] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="relative px-6 pt-6 pb-4">
                    <button
                        onClick={handleClose}
                        className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        <X className="w-4 h-4 text-gray-400" />
                    </button>

                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center">
                            <UserPlus className="w-5 h-5 text-teal-600" />
                        </div>
                        <div>
                            <h2 className="text-[15px] font-bold text-gray-900">Pakviesti nuomininką</h2>
                            <p className="text-[12px] text-gray-500">{propertyLabel}</p>
                        </div>
                    </div>
                </div>

                <div className="h-px bg-gray-100" />

                {/* Success State */}
                {createdInvitation ? (
                    <div className="p-6">
                        <div className="text-center mb-5">
                            <div className="w-14 h-14 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                <Check className="w-7 h-7 text-emerald-500" />
                            </div>
                            <h3 className="text-[15px] font-bold text-gray-900 mb-1">Kvietimas sukurtas!</h3>
                            {mode === 'email' ? (
                                <p className="text-[12px] text-gray-500">
                                    Kvietimas išsiųstas <strong className="text-gray-700">{createdInvitation.email}</strong>
                                </p>
                            ) : (
                                <p className="text-[12px] text-gray-500">
                                    Pasidalinkite kodu su nuomininku
                                </p>
                            )}
                        </div>

                        {/* Invite Code Card */}
                        <div className="relative rounded-xl border border-gray-200 bg-gray-50 p-5 mb-4">
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center mb-2">Kvietimo kodas</p>
                            <div className="text-[28px] font-mono font-black text-gray-900 tracking-[0.15em] text-center mb-3">
                                {formatInviteCode(createdInvitation.token)}
                            </div>
                            <button
                                onClick={handleCopyCode}
                                className={`mx-auto flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-semibold transition-all active:scale-[0.97] ${copied
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-teal-500 text-white hover:bg-teal-600'
                                    }`}
                            >
                                {copied ? (
                                    <><ClipboardCheck className="w-3.5 h-3.5" /> Nukopijuota!</>
                                ) : (
                                    <><Copy className="w-3.5 h-3.5" /> Kopijuoti kodą</>
                                )}
                            </button>
                        </div>

                        {/* Instructions */}
                        <div className="flex items-start gap-2.5 rounded-lg bg-teal-50 border border-teal-100 p-3 mb-5">
                            <Sparkles className="w-4 h-4 text-teal-500 mt-0.5 flex-shrink-0" />
                            <p className="text-[11px] text-teal-700 leading-relaxed">
                                Nuomininkas įveda kodą savo paskyroje <ArrowRight className="w-3 h-3 inline mx-0.5" /> <strong>„Prisijungti prie būsto"</strong>
                            </p>
                        </div>

                        <button
                            onClick={handleClose}
                            className="w-full px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-[13px] font-semibold hover:bg-gray-200 transition-colors"
                        >
                            Uždaryti
                        </button>
                    </div>
                ) : (
                    /* Form */
                    <div className="p-6">
                        {/* Mode Selector */}
                        <div className="flex gap-2 p-1 bg-gray-100 rounded-xl mb-5">
                            <button
                                onClick={() => { setMode('code'); setError(null); }}
                                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-[12px] font-semibold transition-all ${mode === 'code'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                <KeyRound className="w-4 h-4" />
                                Kodas
                            </button>
                            <button
                                onClick={() => { setMode('email'); setError(null); }}
                                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-[12px] font-semibold transition-all ${mode === 'email'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                <Mail className="w-4 h-4" />
                                El. paštas
                            </button>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="mb-4 px-3 py-2.5 bg-red-50 border border-red-100 rounded-lg text-red-600 text-[12px] font-medium">
                                {error}
                            </div>
                        )}

                        {/* Content */}
                        {mode === 'code' ? (
                            <div className="text-center py-4">
                                <div className="w-14 h-14 bg-teal-50 border border-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                    <KeyRound className="w-7 h-7 text-teal-500" />
                                </div>
                                <h3 className="text-[14px] font-bold text-gray-900 mb-1.5">Sugeneruoti kvietimo kodą</h3>
                                <p className="text-[12px] text-gray-500 leading-relaxed max-w-[280px] mx-auto mb-4">
                                    Unikalus kodas, kurį galėsite pasidalinti per SMS, WhatsApp ar kitą programėlę
                                </p>
                            </div>
                        ) : (
                            <div className="mb-5">
                                <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">
                                    Nuomininko el. paštas
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => { setEmail(e.target.value); setError(null); }}
                                        placeholder="nuomininkas@example.com"
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-[13px] focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
                                        autoFocus
                                    />
                                </div>
                                <p className="text-[11px] text-gray-400 mt-1.5">
                                    Kvietimas pasirodys nuomininko paskyroje automatiškai
                                </p>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2.5">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 text-[13px] font-semibold hover:bg-gray-50 transition-colors"
                            >
                                Atšaukti
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting || (mode === 'email' && !email.trim())}
                                className="flex-1 px-4 py-2.5 bg-teal-500 text-white rounded-xl text-[13px] font-semibold hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> Kuriama...</>
                                ) : mode === 'code' ? (
                                    <><KeyRound className="w-4 h-4" /> Generuoti</>
                                ) : (
                                    <><Link2 className="w-4 h-4" /> Siųsti</>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InviteTenantModal;
