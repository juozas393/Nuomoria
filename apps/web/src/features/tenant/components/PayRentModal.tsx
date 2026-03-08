import React, { memo, useState, useCallback, useEffect, useMemo } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import {
    X, CreditCard, Shield, Loader2, CheckCircle, AlertCircle,
    Banknote, Copy, Check, ExternalLink, ArrowLeft, Smartphone
} from 'lucide-react';
import { getStripe, createRentPayment, isStripeConfigured } from '../../../lib/stripe';
import { supabase } from '../../../lib/supabase';

// --- Types ---
interface PayRentModalProps {
    isOpen: boolean;
    onClose: () => void;
    invoiceId?: string;
    propertyId: string;
    addressId?: string;
    amount: number;
    propertyLabel: string;
    onPaymentSuccess?: () => void;
}

interface PaymentMethodConfig {
    bankTransfer?: { enabled: boolean; iban: string; bankName: string; recipientName: string };
    paysera?: { enabled: boolean; account: string };
    revolut?: { enabled: boolean; tag: string };
    stripe?: { enabled: boolean };
}

type PaymentStep = 'select' | 'bank-details' | 'paysera-details' | 'revolut-details' | 'stripe-form' | 'processing' | 'success' | 'error';

// --- Clipboard copy helper ---
const useCopyToClipboard = () => {
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const copy = useCallback(async (text: string, field: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedField(field);
            setTimeout(() => setCopiedField(null), 2000);
        } catch {
            // Fallback
            const ta = document.createElement('textarea');
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            setCopiedField(field);
            setTimeout(() => setCopiedField(null), 2000);
        }
    }, []);
    return { copiedField, copy };
};

// --- Copy row component ---
const CopyRow = memo<{
    label: string;
    value: string;
    fieldKey: string;
    copiedField: string | null;
    onCopy: (text: string, field: string) => void;
    mono?: boolean;
}>(({ label, value, fieldKey, copiedField, onCopy, mono }) => (
    <div className="flex items-center justify-between py-2.5 px-3.5 bg-gray-50/80 rounded-xl border border-gray-100">
        <div className="min-w-0 flex-1">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 block">{label}</span>
            <span className={`text-[13px] font-bold text-gray-900 block truncate ${mono ? 'font-mono tracking-wider' : ''}`}>{value}</span>
        </div>
        <button
            onClick={() => onCopy(value, fieldKey)}
            className={`ml-3 flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200 flex-shrink-0 ${copiedField === fieldKey
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                    : 'bg-white text-gray-500 border border-gray-200 hover:border-teal-300 hover:text-teal-600 hover:bg-teal-50/50 active:scale-[0.97]'
                }`}
        >
            {copiedField === fieldKey ? (
                <><Check className="w-3 h-3" /><span>Nukopijuota</span></>
            ) : (
                <><Copy className="w-3 h-3" /><span>Kopijuoti</span></>
            )}
        </button>
    </div>
));
CopyRow.displayName = 'CopyRow';

// --- Inner checkout form (inside <Elements>) ---
const CheckoutForm = memo<{
    amount: number;
    onSuccess: () => void;
    onError: (msg: string) => void;
}>(({ amount, onSuccess, onError }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!stripe || !elements) return;

        setIsSubmitting(true);
        try {
            const { error } = await stripe.confirmPayment({
                elements,
                confirmParams: {
                    return_url: window.location.href,
                },
                redirect: 'if_required',
            });

            if (error) {
                onError(error.message || 'Mokėjimas nepavyko');
            } else {
                onSuccess();
            }
        } catch {
            onError('Netikėta klaida. Bandykite dar kartą.');
        } finally {
            setIsSubmitting(false);
        }
    }, [stripe, elements, onSuccess, onError]);

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('lt-LT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(val);

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="p-4 rounded-xl bg-gray-50/80 border border-gray-100">
                <PaymentElement
                    options={{
                        layout: 'tabs',
                        defaultValues: {
                            billingDetails: {
                                address: { country: 'LT' },
                            },
                        },
                    }}
                />
            </div>

            <button
                type="submit"
                disabled={!stripe || !elements || isSubmitting}
                className={`
          w-full py-3.5 px-6 rounded-xl text-sm font-bold tracking-wide
          transition-all duration-200 active:scale-[0.98]
          flex items-center justify-center gap-2
          ${isSubmitting
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-[#2F8481] hover:bg-[#276e6b] text-white shadow-lg shadow-[#2F8481]/25'
                    }
        `}
            >
                {isSubmitting ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Apdorojama...</span>
                    </>
                ) : (
                    <>
                        <Shield className="w-4 h-4" />
                        <span>Sumokėti {formatCurrency(amount)}</span>
                    </>
                )}
            </button>

            <p className="text-[10px] text-gray-400 text-center flex items-center justify-center gap-1.5">
                <Shield className="w-3 h-3" />
                Saugus mokėjimas per Stripe. Nuomoria neturi prieigos prie jūsų banko duomenų.
            </p>
        </form>
    );
});
CheckoutForm.displayName = 'CheckoutForm';

// --- Bank icon SVGs (inline for reliability) ---
const PayseraIcon = () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <circle cx="12" cy="12" r="10" fill="#17A1FA" />
        <path d="M7 12h10M12 7v10" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
);

const RevolutIcon = () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <circle cx="12" cy="12" r="10" fill="#0666EB" />
        <path d="M9 7h3.5a3 3 0 010 6H11l3 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
);

// --- Payment method card for selection ---
const PaymentMethodCard = memo<{
    icon: React.ReactNode;
    title: string;
    description: string;
    badge?: { text: string; color: string };
    onClick: () => void;
}>(({ icon, title, description, badge, onClick }) => (
    <button
        onClick={onClick}
        className="w-full p-4 rounded-xl border border-gray-200 hover:border-[#2F8481]/40 hover:bg-[#2F8481]/5 transition-all text-left flex items-center gap-4 group active:scale-[0.98]"
    >
        <div className="w-11 h-11 bg-gray-50 rounded-xl flex items-center justify-center group-hover:bg-white transition-colors border border-gray-100 group-hover:border-gray-200 flex-shrink-0">
            {icon}
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">{title}</p>
            <p className="text-[10px] text-gray-400 truncate">{description}</p>
        </div>
        {badge && (
            <span className={`text-[10px] font-medium px-2 py-1 rounded-lg flex-shrink-0 ${badge.color}`}>{badge.text}</span>
        )}
    </button>
));
PaymentMethodCard.displayName = 'PaymentMethodCard';

// --- Main modal ---
export const PayRentModal = memo<PayRentModalProps>(({
    isOpen,
    onClose,
    invoiceId,
    propertyId,
    addressId,
    amount,
    propertyLabel,
    onPaymentSuccess,
}) => {
    const [step, setStep] = useState<PaymentStep>('select');
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethodConfig | null>(null);
    const [paymentPurpose, setPaymentPurpose] = useState('');
    const [isLoadingMethods, setIsLoadingMethods] = useState(false);
    const { copiedField, copy } = useCopyToClipboard();

    // Fetch landlord payment methods from address_settings
    useEffect(() => {
        if (!isOpen || !addressId) return;
        let cancelled = false;
        setIsLoadingMethods(true);

        supabase
            .from('address_settings')
            .select('financial_settings')
            .eq('address_id', addressId)
            .maybeSingle()
            .then(({ data }) => {
                if (cancelled) return;
                const fs = data?.financial_settings;
                if (fs?.paymentMethods) {
                    setPaymentMethods(fs.paymentMethods);
                } else if (fs?.bankAccount) {
                    // Legacy: only bankAccount set, auto-wrap
                    setPaymentMethods({
                        bankTransfer: {
                            enabled: true,
                            iban: fs.bankAccount,
                            bankName: '',
                            recipientName: fs.recipientName || '',
                        }
                    });
                }
                setPaymentPurpose(fs?.paymentPurposeTemplate || '');
                setIsLoadingMethods(false);
            });

        return () => { cancelled = true; };
    }, [isOpen, addressId]);

    // Reset on open
    useEffect(() => {
        if (isOpen) {
            setStep('select');
            setClientSecret(null);
            setErrorMsg('');
        }
    }, [isOpen]);

    // Available methods
    const enabledMethods = useMemo(() => {
        if (!paymentMethods) return [];
        const methods: string[] = [];
        if (paymentMethods.bankTransfer?.enabled && paymentMethods.bankTransfer.iban) methods.push('bankTransfer');
        if (paymentMethods.paysera?.enabled && paymentMethods.paysera.account) methods.push('paysera');
        if (paymentMethods.revolut?.enabled && paymentMethods.revolut.tag) methods.push('revolut');
        if (paymentMethods.stripe?.enabled) methods.push('stripe');
        return methods;
    }, [paymentMethods]);

    const startStripePayment = useCallback(async () => {
        setIsLoading(true);
        setErrorMsg('');
        try {
            const result = await createRentPayment({
                invoiceId,
                propertyId,
                addressId,
                paymentMethod: 'card',
            });

            if (result.error) {
                setErrorMsg(result.error);
                setStep('error');
            } else if (result.clientSecret) {
                setClientSecret(result.clientSecret);
                setStep('stripe-form');
            }
        } catch {
            setErrorMsg('Nepavyko sukurti mokėjimo');
            setStep('error');
        } finally {
            setIsLoading(false);
        }
    }, [invoiceId, propertyId, addressId]);

    const handleSuccess = useCallback(() => {
        setStep('success');
        onPaymentSuccess?.();
    }, [onPaymentSuccess]);

    const handleError = useCallback((msg: string) => {
        setErrorMsg(msg);
        setStep('error');
    }, []);

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('lt-LT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(val);

    const resolvedPurpose = useMemo(() => {
        if (!paymentPurpose) return `Nuomos mokestis – ${propertyLabel}`;
        return paymentPurpose
            .replace('{period}', new Date().toLocaleDateString('lt-LT', { year: 'numeric', month: 'long' }))
            .replace('{butas}', propertyLabel);
    }, [paymentPurpose, propertyLabel]);

    if (!isOpen) return null;

    const stripeConfigured = isStripeConfigured();

    // Back button for detail views
    const BackButton = () => (
        <button
            onClick={() => setStep('select')}
            className="flex items-center gap-1.5 text-[12px] text-gray-400 hover:text-gray-600 font-medium transition-colors mb-4"
        >
            <ArrowLeft className="w-3.5 h-3.5" />
            Kiti mokėjimo būdai
        </button>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#2F8481]/10 rounded-xl flex items-center justify-center">
                            <CreditCard className="w-5 h-5 text-[#2F8481]" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-gray-900">Mokėti nuomą</h2>
                            <p className="text-xs text-gray-500">{propertyLabel}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5">
                    {/* Amount display */}
                    <div className="mb-5 p-4 rounded-xl bg-[#2F8481]/5 border border-[#2F8481]/15">
                        <p className="text-xs text-[#2F8481] mb-1">Mokėjimo suma</p>
                        <p className="text-2xl font-bold text-gray-900 tabular-nums">{formatCurrency(amount)}</p>
                    </div>

                    {/* Loading state */}
                    {isLoadingMethods && (
                        <div className="flex items-center justify-center gap-2 py-8">
                            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                            <span className="text-sm text-gray-400">Kraunami mokėjimo būdai...</span>
                        </div>
                    )}

                    {/* Step: Select payment method */}
                    {step === 'select' && !isLoadingMethods && (
                        <div className="space-y-3">
                            <p className="text-xs font-medium text-gray-500 mb-3">Pasirinkite mokėjimo būdą</p>

                            {enabledMethods.length === 0 && !isLoadingMethods && (
                                <div className="text-center py-8">
                                    <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                                    <p className="text-sm text-gray-500">Nuomotojas dar nenurodė mokėjimo būdų.</p>
                                    <p className="text-xs text-gray-400 mt-1">Susisiekite su nuomotoju dėl mokėjimo detalių.</p>
                                </div>
                            )}

                            {enabledMethods.includes('bankTransfer') && (
                                <PaymentMethodCard
                                    icon={<Banknote className="w-5 h-5 text-emerald-600" />}
                                    title="Banko pavedimas"
                                    description={paymentMethods?.bankTransfer?.bankName
                                        ? `${paymentMethods.bankTransfer.bankName} • ${paymentMethods.bankTransfer.iban?.slice(0, 8)}...`
                                        : 'IBAN pavedimas'
                                    }
                                    badge={{ text: 'Populiariausias', color: 'bg-emerald-50 text-emerald-600' }}
                                    onClick={() => setStep('bank-details')}
                                />
                            )}

                            {enabledMethods.includes('paysera') && (
                                <PaymentMethodCard
                                    icon={<PayseraIcon />}
                                    title="Paysera"
                                    description={paymentMethods?.paysera?.account || 'Paysera mokėjimas'}
                                    onClick={() => setStep('paysera-details')}
                                />
                            )}

                            {enabledMethods.includes('revolut') && (
                                <PaymentMethodCard
                                    icon={<RevolutIcon />}
                                    title="Revolut"
                                    description={`@${paymentMethods?.revolut?.tag}`}
                                    badge={{ text: 'Greičiausia', color: 'bg-blue-50 text-blue-600' }}
                                    onClick={() => setStep('revolut-details')}
                                />
                            )}

                            {enabledMethods.includes('stripe') && stripeConfigured && (
                                <PaymentMethodCard
                                    icon={<CreditCard className="w-5 h-5 text-purple-600" />}
                                    title="Kortelė"
                                    description="Visa, Mastercard, Maestro"
                                    onClick={startStripePayment}
                                />
                            )}

                            {isLoading && (
                                <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mt-3">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Ruošiamas mokėjimas...</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step: Bank Transfer details */}
                    {step === 'bank-details' && paymentMethods?.bankTransfer && (
                        <div>
                            <BackButton />
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center">
                                    <Banknote className="w-4.5 h-4.5 text-emerald-600" />
                                </div>
                                <div>
                                    <h3 className="text-[14px] font-bold text-gray-900">Banko pavedimas</h3>
                                    {paymentMethods.bankTransfer.bankName && (
                                        <p className="text-[11px] text-gray-400">{paymentMethods.bankTransfer.bankName}</p>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <CopyRow
                                    label="IBAN"
                                    value={paymentMethods.bankTransfer.iban}
                                    fieldKey="iban"
                                    copiedField={copiedField}
                                    onCopy={copy}
                                    mono
                                />
                                {paymentMethods.bankTransfer.recipientName && (
                                    <CopyRow
                                        label="Gavėjas"
                                        value={paymentMethods.bankTransfer.recipientName}
                                        fieldKey="recipient"
                                        copiedField={copiedField}
                                        onCopy={copy}
                                    />
                                )}
                                <CopyRow
                                    label="Suma"
                                    value={formatCurrency(amount)}
                                    fieldKey="amount"
                                    copiedField={copiedField}
                                    onCopy={copy}
                                />
                                <CopyRow
                                    label="Mokėjimo paskirtis"
                                    value={resolvedPurpose}
                                    fieldKey="purpose"
                                    copiedField={copiedField}
                                    onCopy={copy}
                                />
                            </div>
                            <div className="mt-4 p-3 bg-amber-50 border border-amber-200/60 rounded-xl">
                                <p className="text-[11px] text-amber-700 leading-relaxed">
                                    Nukopijuokite rekvizitus ir atlikite pavedimą savo banko programėlėje.
                                    Sąskaitos statusas bus atnaujintas kai nuomotojas patvirtins mokėjimą.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Step: Paysera details */}
                    {step === 'paysera-details' && paymentMethods?.paysera && (
                        <div>
                            <BackButton />
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
                                    <PayseraIcon />
                                </div>
                                <h3 className="text-[14px] font-bold text-gray-900">Paysera mokėjimas</h3>
                            </div>
                            <div className="space-y-2">
                                <CopyRow
                                    label="Paysera paskyra"
                                    value={paymentMethods.paysera.account}
                                    fieldKey="paysera-account"
                                    copiedField={copiedField}
                                    onCopy={copy}
                                />
                                <CopyRow
                                    label="Suma"
                                    value={formatCurrency(amount)}
                                    fieldKey="paysera-amount"
                                    copiedField={copiedField}
                                    onCopy={copy}
                                />
                                <CopyRow
                                    label="Mokėjimo paskirtis"
                                    value={resolvedPurpose}
                                    fieldKey="paysera-purpose"
                                    copiedField={copiedField}
                                    onCopy={copy}
                                />
                            </div>
                            <a
                                href={`https://www.paysera.lt/v2/lt-LT/`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-4 w-full flex items-center justify-center gap-2 py-3 px-6 bg-[#17A1FA] hover:bg-[#1490E0] text-white rounded-xl font-bold text-sm transition-all active:scale-[0.98] shadow-sm"
                            >
                                <ExternalLink className="w-4 h-4" />
                                Atidaryti Paysera
                            </a>
                        </div>
                    )}

                    {/* Step: Revolut details */}
                    {step === 'revolut-details' && paymentMethods?.revolut && (
                        <div>
                            <BackButton />
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
                                    <RevolutIcon />
                                </div>
                                <h3 className="text-[14px] font-bold text-gray-900">Revolut mokėjimas</h3>
                            </div>
                            <div className="space-y-2">
                                <CopyRow
                                    label="Revolut vartotojas"
                                    value={`@${paymentMethods.revolut.tag}`}
                                    fieldKey="revolut-tag"
                                    copiedField={copiedField}
                                    onCopy={copy}
                                />
                                <CopyRow
                                    label="Suma"
                                    value={formatCurrency(amount)}
                                    fieldKey="revolut-amount"
                                    copiedField={copiedField}
                                    onCopy={copy}
                                />
                            </div>
                            <a
                                href={`https://revolut.me/${paymentMethods.revolut.tag}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-4 w-full flex items-center justify-center gap-2 py-3 px-6 bg-[#0666EB] hover:bg-[#0555CC] text-white rounded-xl font-bold text-sm transition-all active:scale-[0.98] shadow-sm"
                            >
                                <Smartphone className="w-4 h-4" />
                                Atidaryti Revolut
                            </a>
                            <p className="text-[10px] text-gray-400 text-center mt-2.5">
                                Arba perveskite per Revolut programėlę adresatui @{paymentMethods.revolut.tag}
                            </p>
                        </div>
                    )}

                    {/* Step: Stripe Payment form */}
                    {step === 'stripe-form' && clientSecret && (
                        <div>
                            <BackButton />
                            <Elements
                                stripe={getStripe()}
                                options={{
                                    clientSecret,
                                    appearance: {
                                        theme: 'stripe',
                                        variables: {
                                            colorPrimary: '#2F8481',
                                            borderRadius: '12px',
                                            fontFamily: 'system-ui, sans-serif',
                                            fontSizeBase: '14px',
                                        },
                                    },
                                    locale: 'lt',
                                }}
                            >
                                <CheckoutForm
                                    amount={amount}
                                    onSuccess={handleSuccess}
                                    onError={handleError}
                                />
                            </Elements>
                        </div>
                    )}

                    {/* Step: Success */}
                    {step === 'success' && (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 mx-auto bg-emerald-50 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle className="w-8 h-8 text-emerald-500" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Mokėjimas priimtas!</h3>
                            <p className="text-sm text-gray-500 mb-6">
                                {`Jūsų mokėjimas (${formatCurrency(amount)}) sėkmingai apdorotas. `}
                                Sąskaitos statusas bus atnaujintas automatiškai.
                            </p>
                            <button
                                onClick={onClose}
                                className="px-8 py-3 bg-[#2F8481] text-white font-bold text-sm rounded-xl hover:bg-[#276e6b] transition-colors active:scale-[0.98]"
                            >
                                Uždaryti
                            </button>
                        </div>
                    )}

                    {/* Step: Error */}
                    {step === 'error' && (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 mx-auto bg-red-50 rounded-full flex items-center justify-center mb-4">
                                <AlertCircle className="w-8 h-8 text-red-500" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Mokėjimas nepavyko</h3>
                            <p className="text-sm text-red-500 mb-6">{errorMsg || 'Netikėta klaida'}</p>
                            <div className="flex gap-3 justify-center">
                                <button
                                    onClick={() => setStep('select')}
                                    className="px-6 py-3 bg-gray-100 text-gray-700 font-bold text-sm rounded-xl hover:bg-gray-200 transition-colors"
                                >
                                    Bandyti dar kartą
                                </button>
                                <button
                                    onClick={onClose}
                                    className="px-6 py-3 bg-[#2F8481] text-white font-bold text-sm rounded-xl hover:bg-[#276e6b] transition-colors"
                                >
                                    Uždaryti
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});
PayRentModal.displayName = 'PayRentModal';
