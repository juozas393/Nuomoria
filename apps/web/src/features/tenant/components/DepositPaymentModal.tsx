import React, { memo, useState, useCallback, useMemo } from 'react';
import { Euro, X, Loader2, Shield, ArrowRight, Check, AlertCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { logAuditEvent } from '../../../lib/auditLogApi';

interface DepositPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    propertyId: string;
    depositAmount: number;
    depositPaidAmount: number;
}

const fmt = (amount: number) =>
    new Intl.NumberFormat('lt-LT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(amount);

export const DepositPaymentModal = memo<DepositPaymentModalProps>(({ isOpen, onClose, propertyId, depositAmount, depositPaidAmount }) => {
    const [customAmount, setCustomAmount] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const remaining = useMemo(() => Math.max(depositAmount - depositPaidAmount, 0), [depositAmount, depositPaidAmount]);
    const halfRemaining = useMemo(() => Math.round(remaining / 2 * 100) / 100, [remaining]);
    const paidPercent = useMemo(() => depositAmount > 0 ? Math.round((depositPaidAmount / depositAmount) * 100) : 0, [depositAmount, depositPaidAmount]);

    const parsedAmount = useMemo(() => {
        const val = parseFloat(customAmount.replace(',', '.'));
        return isNaN(val) ? 0 : val;
    }, [customAmount]);

    const isValid = parsedAmount > 0 && parsedAmount <= remaining + 0.01;

    const handleQuickSelect = useCallback((amount: number) => {
        setCustomAmount(amount.toFixed(2));
        setError(null);
    }, []);

    const handlePayment = useCallback(async () => {
        if (!isValid || isProcessing) return;
        setIsProcessing(true);
        setError(null);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { setError('Nėra sesijos. Prisijunkite iš naujo.'); return; }

            const res = await supabase.functions.invoke('stripe-create-payment', {
                body: { payment_type: 'deposit', property_id: propertyId, amount: parsedAmount },
                headers: { Authorization: `Bearer ${session.access_token}` },
            });

            if (res.error) {
                const errorMsg = res.data?.error || res.error.message || 'Mokėjimo klaida';
                throw new Error(errorMsg);
            }
            if (res.data?.error) throw new Error(res.data.error);

            if (res.data?.checkout_url) {
                await logAuditEvent(propertyId, 'properties', 'UPDATE', `Nuomininkas inicijavo depozito mokėjimą: ${parsedAmount.toFixed(2)} €`, { property_id: propertyId, amount: parsedAmount });
                window.location.href = res.data.checkout_url;
            } else {
                throw new Error('Nepavyko gauti mokėjimo nuorodos');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Mokėjimo klaida');
        } finally {
            setIsProcessing(false);
        }
    }, [isValid, isProcessing, propertyId, parsedAmount]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div
                className="relative w-full max-w-md rounded-2xl overflow-hidden shadow-2xl border border-white/50"
                style={{ backgroundImage: `url('/images/CardsBackground.webp')`, backgroundSize: 'cover', backgroundPosition: 'center' }}
            >
                {/* Header */}
                <div className="relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#2F8481] via-[#348f8c] to-[#3aa8a4]" />
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/[0.08] rounded-full blur-2xl" />
                    <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-white/[0.08] rounded-full blur-2xl" />

                    <div className="relative z-10 px-6 py-5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                <Shield className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white">Depozito mokėjimas</h2>
                                <p className="text-[11px] text-white/60">Pasirinkite norimą sumą</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="px-6 py-5 space-y-5">
                    {/* Progress Section */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Depozito būklė</span>
                            <span className="text-[11px] font-semibold text-gray-700">{paidPercent}% sumokėta</span>
                        </div>
                        {/* Progress bar */}
                        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                            <div
                                className="h-full bg-gradient-to-r from-[#2F8481] to-[#3aa8a4] rounded-full transition-all duration-700"
                                style={{ width: `${paidPercent}%` }}
                            />
                        </div>
                        {/* Amounts */}
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Sumokėta</p>
                                <p className="text-[15px] font-bold text-[#2F8481] tabular-nums">{fmt(depositPaidAmount)}</p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-gray-300" />
                            <div className="text-right">
                                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Iš viso</p>
                                <p className="text-[15px] font-bold text-gray-800 tabular-nums">{fmt(depositAmount)}</p>
                            </div>
                        </div>
                        {/* Remaining callout */}
                        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200/60 rounded-xl">
                            <Euro className="w-4 h-4 text-amber-600 flex-shrink-0" />
                            <span className="text-[12px] font-semibold text-amber-800">
                                Likusi suma: {fmt(remaining)}
                            </span>
                        </div>
                    </div>

                    {/* Quick Amount Buttons */}
                    <div className="space-y-2">
                        <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Greitas pasirinkimas</label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => handleQuickSelect(remaining)}
                                className={`p-3 rounded-xl border text-center transition-all duration-200 hover:shadow-md active:scale-[0.98]
                                    ${parsedAmount === remaining
                                        ? 'border-[#2F8481] bg-[#E8F5F4] ring-1 ring-[#2F8481]/30'
                                        : 'border-gray-200 bg-white hover:border-[#2F8481]/40 hover:bg-[#E8F5F4]/40'}`}
                            >
                                <div className="text-[10px] text-gray-500 mb-0.5">Visa likusi suma</div>
                                <div className="text-[14px] font-bold text-gray-900 tabular-nums">{fmt(remaining)}</div>
                            </button>
                            {halfRemaining > 0 && halfRemaining < remaining && (
                                <button
                                    onClick={() => handleQuickSelect(halfRemaining)}
                                    className={`p-3 rounded-xl border text-center transition-all duration-200 hover:shadow-md active:scale-[0.98]
                                        ${parsedAmount === halfRemaining
                                            ? 'border-[#2F8481] bg-[#E8F5F4] ring-1 ring-[#2F8481]/30'
                                            : 'border-gray-200 bg-white hover:border-[#2F8481]/40 hover:bg-[#E8F5F4]/40'}`}
                                >
                                    <div className="text-[10px] text-gray-500 mb-0.5">Pusė sumos</div>
                                    <div className="text-[14px] font-bold text-gray-900 tabular-nums">{fmt(halfRemaining)}</div>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Custom Amount Input */}
                    <div className="space-y-2">
                        <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Arba įveskite sumą</label>
                        <div className="relative">
                            <Euro className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                inputMode="decimal"
                                value={customAmount}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/[^0-9.,]/g, '');
                                    setCustomAmount(val);
                                    setError(null);
                                }}
                                placeholder={`1.00 — ${remaining.toFixed(2)}`}
                                className="w-full pl-10 pr-4 py-3 rounded-xl text-[15px] font-semibold tabular-nums bg-white border border-gray-200 focus:border-[#2F8481] focus:ring-2 focus:ring-[#2F8481]/20 text-gray-900 outline-none transition-all placeholder:text-gray-300 placeholder:font-normal"
                            />
                        </div>
                        {parsedAmount > remaining + 0.01 && (
                            <p className="text-[11px] text-red-500 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                Suma viršija likusį depozitą ({fmt(remaining)})
                            </p>
                        )}
                    </div>

                    {/* Error message */}
                    {error && (
                        <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-200/60 rounded-xl">
                            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                            <p className="text-[11px] font-medium text-red-700 leading-relaxed">{error}</p>
                        </div>
                    )}

                    {/* Pay Button */}
                    <button
                        onClick={handlePayment}
                        disabled={!isValid || isProcessing}
                        className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-gradient-to-r from-[#2F8481] to-[#3aa8a4] text-white rounded-xl text-[14px] font-bold hover:from-[#267370] hover:to-[#2F8481] transition-all active:scale-[0.98] shadow-lg shadow-[#2F8481]/25 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Nukreipiama į Stripe...
                            </>
                        ) : isValid ? (
                            <>
                                <Euro className="w-4 h-4" />
                                Mokėti {fmt(parsedAmount)}
                            </>
                        ) : (
                            <>
                                <Euro className="w-4 h-4" />
                                Įveskite sumą
                            </>
                        )}
                    </button>

                    {/* Info footer */}
                    <p className="text-[10px] text-gray-400 text-center leading-relaxed">
                        Mokėjimas bus apdorotas per Stripe. Depozitas bus automatiškai atnaujintas po sėkmingo mokėjimo.
                    </p>
                </div>
            </div>
        </div>
    );
});
DepositPaymentModal.displayName = 'DepositPaymentModal';
