import React, { memo, useState, useCallback, useEffect } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { X, CreditCard, Shield, Loader2, CheckCircle, AlertCircle, Banknote } from 'lucide-react';
import { getStripe, createRentPayment, isStripeConfigured } from '../../../lib/stripe';

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

type PaymentStep = 'select' | 'processing' | 'success' | 'error';

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
        } catch (err) {
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
                        : 'bg-teal-500 hover:bg-teal-600 text-white shadow-lg shadow-teal-500/25'
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

    // Reset on open
    useEffect(() => {
        if (isOpen) {
            setStep('select');
            setClientSecret(null);
            setErrorMsg('');
        }
    }, [isOpen]);

    const startPayment = useCallback(async (method: 'sepa_debit' | 'card') => {
        setIsLoading(true);
        setErrorMsg('');
        try {
            const result = await createRentPayment({
                invoiceId,
                propertyId,
                addressId,
                paymentMethod: method,
            });

            if (result.error) {
                setErrorMsg(result.error);
                setStep('error');
            } else if (result.clientSecret) {
                setClientSecret(result.clientSecret);
                setStep('processing');
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

    if (!isOpen) return null;

    const stripeConfigured = isStripeConfigured();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center">
                            <CreditCard className="w-5 h-5 text-teal-600" />
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
                    <div className="mb-5 p-4 rounded-xl bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-100">
                        <p className="text-xs text-teal-700 mb-1">Mokėjimo suma</p>
                        <p className="text-2xl font-bold text-teal-900 tabular-nums">{formatCurrency(amount)}</p>
                    </div>

                    {/* Step: Select payment method */}
                    {step === 'select' && (
                        <div className="space-y-3">
                            <p className="text-xs font-medium text-gray-500 mb-3">Pasirinkite mokėjimo būdą</p>

                            <button
                                onClick={() => startPayment('sepa_debit')}
                                disabled={isLoading || !stripeConfigured}
                                className="w-full p-4 rounded-xl border border-gray-200 hover:border-teal-300 hover:bg-teal-50/50 transition-all text-left flex items-center gap-4 group disabled:opacity-50"
                            >
                                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                                    <Banknote className="w-5 h-5 text-blue-600" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-gray-900">Banko pavedimas (SEPA)</p>
                                    <p className="text-[10px] text-gray-400">Swedbank, SEB, Luminor, Šiaulių bankas ir kt.</p>
                                </div>
                                <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">Pigiausia</span>
                            </button>

                            <button
                                onClick={() => startPayment('card')}
                                disabled={isLoading || !stripeConfigured}
                                className="w-full p-4 rounded-xl border border-gray-200 hover:border-teal-300 hover:bg-teal-50/50 transition-all text-left flex items-center gap-4 group disabled:opacity-50"
                            >
                                <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                                    <CreditCard className="w-5 h-5 text-purple-600" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-gray-900">Kortelė</p>
                                    <p className="text-[10px] text-gray-400">Visa, Mastercard, Maestro</p>
                                </div>
                                <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">Greičiausia</span>
                            </button>

                            {!stripeConfigured && (
                                <p className="text-xs text-amber-600 text-center mt-3">
                                    Stripe dar nesukonfigūruotas. Pridėkite VITE_STRIPE_PUBLISHABLE_KEY.
                                </p>
                            )}

                            {isLoading && (
                                <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mt-3">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Ruošiamas mokėjimas...</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step: Payment form (Stripe Elements) */}
                    {step === 'processing' && clientSecret && (
                        <Elements
                            stripe={getStripe()}
                            options={{
                                clientSecret,
                                appearance: {
                                    theme: 'stripe',
                                    variables: {
                                        colorPrimary: '#14b8a6',
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
                                className="px-8 py-3 bg-teal-500 text-white font-bold text-sm rounded-xl hover:bg-teal-600 transition-colors active:scale-[0.98]"
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
                                    className="px-6 py-3 bg-teal-500 text-white font-bold text-sm rounded-xl hover:bg-teal-600 transition-colors"
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
