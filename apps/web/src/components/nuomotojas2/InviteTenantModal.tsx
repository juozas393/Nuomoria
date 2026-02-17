import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
    XMarkIcon,
    UserPlusIcon,
    EnvelopeIcon,
    CheckIcon,
    ClipboardDocumentIcon,
    ClipboardDocumentCheckIcon,
    LinkIcon,
    KeyIcon
} from '@heroicons/react/24/outline';
import { tenantInvitationApi, TenantInvitation } from '../../lib/database';
import { supabase } from '../../lib/supabase';

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
    const [mode, setMode] = useState<InviteMode>('code'); // Default to code mode - simpler
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [createdInvitation, setCreatedInvitation] = useState<TenantInvitation | null>(null);
    const [copied, setCopied] = useState(false);
    const [lastEmailSentAt, setLastEmailSentAt] = useState<number | null>(null);
    const [cooldownSeconds, setCooldownSeconds] = useState(0);

    // Rate limiting: 60 seconds between emails
    const COOLDOWN_DURATION = 60;

    // Update cooldown timer
    React.useEffect(() => {
        if (cooldownSeconds > 0) {
            const timer = setTimeout(() => setCooldownSeconds(prev => prev - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [cooldownSeconds]);

    // Format token for display (shorter, user-friendly format)
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
        } catch (err) {
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
        // Validate email if in email mode
        if (mode === 'email') {
            if (!email.trim()) {
                setError('Įveskite el. paštą');
                return;
            }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                setError('Neteisingas el. pašto formatas');
                return;
            }
        }

        setIsSubmitting(true);
        setError(null);

        try {
            // For code-only mode, use a placeholder email that will be updated when tenant joins
            const invitationEmail = mode === 'email'
                ? email.trim().toLowerCase()
                : `pending_${Date.now()}@placeholder.local`;

            // Check for rate limiting in email mode
            if (mode === 'email') {
                // Check if user is on cooldown
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

                // Check if there's already a pending invitation for this email
                const existingInvitations = await tenantInvitationApi.getByPropertyId(propertyId);
                const pendingForEmail = existingInvitations.find(
                    inv => inv.email.toLowerCase() === invitationEmail.toLowerCase() && inv.status === 'pending'
                );
                if (pendingForEmail) {
                    setError('Šiam el. paštui jau išsiųstas kvietimas. Palaukite kol bus priimtas arba atmestas.');
                    setIsSubmitting(false);
                    return;
                }
            }

            const invitation = await tenantInvitationApi.create({
                property_id: propertyId,
                email: invitationEmail,
                property_label: propertyLabel,
                rent: defaultRent || undefined,
                deposit: defaultDeposit || undefined
            });

            // If email mode, send the invitation email via Edge Function
            if (mode === 'email') {
                const inviteCode = formatInviteCode(invitation.token);

                const landlordName = (user as any)?.user_metadata?.full_name || (user as any)?.user_metadata?.name || user?.first_name || 'Nuomotojas';

                const { data: emailData, error: emailError } = await supabase.functions.invoke('send-invitation-email', {
                    body: {
                        to: invitationEmail,
                        inviteCode: inviteCode,
                        propertyLabel: propertyLabel,
                        landlordName: landlordName,
                    }
                });

                console.log('Email function response:', { data: emailData, error: emailError });

                if (emailError) {
                    console.error('Failed to send invitation email:', emailError);
                    // Don't fail the whole flow - invitation was created, just email failed
                    // User can still share the code manually
                } else {
                    // Email sent successfully - set cooldown
                    setLastEmailSentAt(Date.now());
                    setCooldownSeconds(COOLDOWN_DURATION);
                }
            }

            setCreatedInvitation(invitation);
            onSuccess?.();
        } catch (err: any) {
            setError(err.message || 'Nepavyko sukurti kvietimo');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={handleClose}
            />

            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-[#2F8481] to-[#35918e] px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                <UserPlusIcon className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-white">Pakviesti nuomininką</h2>
                                <p className="text-sm text-white/70">{propertyLabel}</p>
                            </div>
                        </div>
                        <button
                            onClick={handleClose}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <XMarkIcon className="w-5 h-5 text-white" />
                        </button>
                    </div>
                </div>

                {/* Success State */}
                {createdInvitation ? (
                    <div className="p-6">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckIcon className="w-8 h-8 text-green-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Kvietimas sukurtas!</h3>
                            {mode === 'email' ? (
                                <p className="text-gray-600 text-sm">
                                    Nuomininkas <strong>{createdInvitation.email}</strong> gaus kvietimą automatiškai.
                                </p>
                            ) : (
                                <p className="text-gray-600 text-sm">
                                    Pasidalinkite šiuo kodu su nuomininku.
                                </p>
                            )}
                        </div>

                        {/* Invite Code Display */}
                        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 mb-6 border border-gray-200">
                            <div className="text-center">
                                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-medium">Kvietimo kodas</p>
                                <div className="text-4xl font-mono font-bold text-[#2F8481] tracking-[0.3em] mb-4">
                                    {formatInviteCode(createdInvitation.token)}
                                </div>
                                <button
                                    onClick={handleCopyCode}
                                    className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-colors ${copied
                                        ? 'bg-green-500 text-white'
                                        : 'bg-[#2F8481] text-white hover:bg-[#267673]'
                                        }`}
                                >
                                    {copied ? (
                                        <>
                                            <ClipboardDocumentCheckIcon className="w-5 h-5" />
                                            Nukopijuota!
                                        </>
                                    ) : (
                                        <>
                                            <ClipboardDocumentIcon className="w-5 h-5" />
                                            Kopijuoti kodą
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Instructions */}
                        <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-800 mb-4">
                            <strong>Kaip naudoti:</strong> Nuomininkas įveda šį kodą savo paskyroje →
                            "Prisijungti prie būsto" skiltyje.
                        </div>

                        <button
                            onClick={handleClose}
                            className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                        >
                            Uždaryti
                        </button>
                    </div>
                ) : (
                    /* Form */
                    <div className="p-6">
                        {/* Mode Selector */}
                        <div className="flex gap-2 mb-6">
                            <button
                                onClick={() => { setMode('code'); setError(null); }}
                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-colors ${mode === 'code'
                                    ? 'bg-[#2F8481] text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                <KeyIcon className="w-5 h-5" />
                                Generuoti kodą
                            </button>
                            <button
                                onClick={() => { setMode('email'); setError(null); }}
                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-colors ${mode === 'email'
                                    ? 'bg-[#2F8481] text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                <EnvelopeIcon className="w-5 h-5" />
                                Siųsti el. paštu
                            </button>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                                {error}
                            </div>
                        )}

                        {/* Content based on mode */}
                        {mode === 'code' ? (
                            <div className="text-center py-4">
                                <div className="w-16 h-16 bg-[#2F8481]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <KeyIcon className="w-8 h-8 text-[#2F8481]" />
                                </div>
                                <h3 className="font-semibold text-gray-900 mb-2">Sugeneruoti kvietimo kodą</h3>
                                <p className="text-gray-500 text-sm mb-6">
                                    Bus sukurtas unikalus kodas, kurį galėsite pasidalinti su nuomininku
                                    per SMS, WhatsApp ar kitą programėlę.
                                </p>
                            </div>
                        ) : (
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Nuomininko el. paštas
                                </label>
                                <div className="relative">
                                    <EnvelopeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => { setEmail(e.target.value); setError(null); }}
                                        placeholder="nuomininkas@example.com"
                                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:border-[#2F8481] focus:ring-2 focus:ring-[#2F8481]/20 outline-none transition-colors"
                                        autoFocus
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                    Kvietimas pasirodys nuomininko paskyroje automatiškai
                                </p>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                            >
                                Atšaukti
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting || (mode === 'email' && !email.trim())}
                                className="flex-1 px-4 py-3 bg-[#2F8481] text-white rounded-xl font-medium hover:bg-[#267673] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Kuriama...
                                    </>
                                ) : mode === 'code' ? (
                                    <>
                                        <KeyIcon className="w-5 h-5" />
                                        Generuoti kodą
                                    </>
                                ) : (
                                    <>
                                        <LinkIcon className="w-5 h-5" />
                                        Siųsti kvietimą
                                    </>
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
