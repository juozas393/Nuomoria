import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import {
    AlertTriangle,
    Clock,
    CheckCircle2,
    XCircle,
    Loader2,
    Send,
    Calendar,
    Info,
    ChevronDown,
    FileWarning,
    Euro,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { calculateDepositReturn, type DepositCalculation } from '../../../utils/depositCalculator';
import LtDateInput from '../../../components/ui/LtDateInput';

/* ─── Types ─── */
interface TerminationData {
    invitation_id: string;
    termination_status: string | null;
    termination_date: string | null;
    termination_reason: string | null;
    termination_requested_at: string | null;
    termination_confirmed_at: string | null;
    termination_requested_by: string | null;
}

interface PropertyFinancials {
    rent: number;
    deposit_amount: number;
    contract_end: string | null;
}

interface TenantTerminationRequestProps {
    propertyId: string;
    cardBase: string;
    cardBgStyle?: React.CSSProperties;
}

/* ─── Helpers ─── */
const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('lt-LT', { year: 'numeric', month: '2-digit', day: '2-digit' });
};

const formatCurrency = (amount: number | null) => {
    if (amount == null) return '—';
    return new Intl.NumberFormat('lt-LT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(amount);
};

/* ─── Status config ─── */
const STATUS_CONFIG: Record<string, { label: string; dotColor: string; textColor: string; bgColor: string }> = {
    tenant_requested: { label: 'Laukiama patvirtinimo', dotColor: 'bg-amber-500', textColor: 'text-amber-700', bgColor: 'bg-amber-50' },
    landlord_requested: { label: 'Nuomotojas inicijavo', dotColor: 'bg-red-500', textColor: 'text-red-700', bgColor: 'bg-red-50' },
    confirmed: { label: 'Patvirtinta', dotColor: 'bg-blue-500', textColor: 'text-blue-700', bgColor: 'bg-blue-50' },
    terminated: { label: 'Nutraukta', dotColor: 'bg-gray-500', textColor: 'text-gray-600', bgColor: 'bg-gray-50' },
};

/* ─── Deposit Mini Preview (light theme) ─── */
const DepositPreview = memo<{ calc: DepositCalculation; deposit: number }>(({ calc, deposit }) => {
    const bgClass = calc.isFullReturn
        ? 'bg-emerald-50/80 border-emerald-200'
        : calc.isFullForfeit
            ? 'bg-red-50/80 border-red-200'
            : 'bg-amber-50/80 border-amber-200';
    const accentColor = calc.isFullReturn ? 'text-emerald-600' : calc.isFullForfeit ? 'text-red-600' : 'text-amber-600';

    return (
        <div className={`p-3 rounded-lg border ${bgClass} space-y-2`}>
            <div className="flex items-center gap-2">
                <Euro className={`w-3.5 h-3.5 ${accentColor}`} />
                <span className="text-[11px] font-bold text-gray-800">Depozito skaičiavimas</span>
            </div>
            <div className="space-y-1.5 ml-5">
                <div className="flex justify-between">
                    <span className="text-[10px] text-gray-500">Scenarijus:</span>
                    <span className="text-[10px] font-medium text-gray-700">{calc.scenarioLabel}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-[10px] text-gray-500">Pranešimo dienų:</span>
                    <span className={`text-[10px] font-bold ${calc.noticeDays >= 30 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {calc.noticeDays} d.
                    </span>
                </div>
                <div className="flex justify-between">
                    <span className="text-[10px] text-gray-500">Depozitas:</span>
                    <span className="text-[10px] font-medium text-gray-800">{formatCurrency(deposit)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-[10px] text-gray-500">Grąžinama:</span>
                    <span className={`text-[10px] font-bold ${accentColor}`}>{formatCurrency(calc.returnAmount)}</span>
                </div>
                {calc.deductionAmount > 0 && (
                    <div className="flex justify-between">
                        <span className="text-[10px] text-gray-500">Išskaičiuojama:</span>
                        <span className="text-[10px] font-bold text-red-500">{formatCurrency(calc.deductionAmount)}</span>
                    </div>
                )}
            </div>
            <p className="text-[9px] text-gray-500 ml-5">{calc.deductionReason}</p>
        </div>
    );
});
DepositPreview.displayName = 'DepositPreview';

/* ─── Main Component ─── */
const TenantTerminationRequest = memo<TenantTerminationRequestProps>(({ propertyId, cardBase, cardBgStyle }) => {
    const [data, setData] = useState<TerminationData | null>(null);
    const [financials, setFinancials] = useState<PropertyFinancials | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [noInvitation, setNoInvitation] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [isExpanded, setIsExpanded] = useState(true);
    const [terminationDate, setTerminationDate] = useState('');
    const [terminationReason, setTerminationReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [actionMsg, setActionMsg] = useState('');

    // Fetch termination data + property financials
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                // Fetch invitation
                const { data: inv, error } = await supabase
                    .from('tenant_invitations')
                    .select('id, termination_status, termination_date, termination_reason, termination_requested_at, termination_confirmed_at, termination_requested_by')
                    .eq('property_id', propertyId)
                    .eq('status', 'accepted')
                    .maybeSingle();

                if (error || !inv) {
                    setNoInvitation(true);
                } else {
                    setData({
                        invitation_id: inv.id,
                        termination_status: inv.termination_status,
                        termination_date: inv.termination_date,
                        termination_reason: inv.termination_reason,
                        termination_requested_at: inv.termination_requested_at,
                        termination_confirmed_at: inv.termination_confirmed_at,
                        termination_requested_by: inv.termination_requested_by,
                    });

                    // Fetch property financials
                    const { data: property } = await supabase
                        .from('properties')
                        .select('rent, deposit_amount, contract_end')
                        .eq('id', propertyId)
                        .maybeSingle();

                    if (property) {
                        setFinancials({
                            rent: property.rent || 0,
                            deposit_amount: property.deposit_amount || 0,
                            contract_end: property.contract_end || null,
                        });
                    }
                }
            } catch {
                setNoInvitation(true);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [propertyId]);

    // Deposit calculation for existing termination status
    const statusDepositCalc = useMemo<DepositCalculation | null>(() => {
        if (!data?.termination_date || !financials || !data.termination_status) return null;
        return calculateDepositReturn({
            contractEnd: financials.contract_end,
            terminationDate: data.termination_date,
            requestDate: data.termination_requested_at || undefined,
            monthlyRent: financials.rent,
            depositAmount: financials.deposit_amount,
        });
    }, [data, financials]);

    // Deposit calculation for form preview (live as user picks date)
    const formDepositCalc = useMemo<DepositCalculation | null>(() => {
        if (!terminationDate || !financials) return null;
        return calculateDepositReturn({
            contractEnd: financials.contract_end,
            terminationDate,
            monthlyRent: financials.rent,
            depositAmount: financials.deposit_amount,
        });
    }, [terminationDate, financials]);

    // Submit termination request
    const handleSubmit = useCallback(async () => {
        if (!data || !terminationDate) return;
        setIsSubmitting(true);
        setActionMsg('');
        try {
            const user = (await supabase.auth.getUser()).data.user;
            const { error } = await supabase
                .from('tenant_invitations')
                .update({
                    termination_status: 'tenant_requested',
                    termination_date: terminationDate,
                    termination_reason: terminationReason || null,
                    termination_requested_at: new Date().toISOString(),
                    termination_requested_by: user?.id || null,
                })
                .eq('id', data.invitation_id);

            if (error) {
                setActionMsg(`Klaida: ${error.message}`);
            } else {
                setData(prev => prev ? {
                    ...prev,
                    termination_status: 'tenant_requested',
                    termination_date: terminationDate,
                    termination_reason: terminationReason || null,
                    termination_requested_at: new Date().toISOString(),
                } : null);
                setShowForm(false);
                setActionMsg('Prašymas sėkmingai pateiktas');
            }
        } catch {
            setActionMsg('Klaida — bandykite dar kartą');
        } finally {
            setIsSubmitting(false);
        }
    }, [data, terminationDate, terminationReason]);

    // Cancel termination request
    const handleCancel = useCallback(async () => {
        if (!data) return;
        setIsSubmitting(true);
        setActionMsg('');
        try {
            const { error } = await supabase
                .from('tenant_invitations')
                .update({
                    termination_status: null,
                    termination_date: null,
                    termination_reason: null,
                    termination_requested_at: null,
                    termination_confirmed_at: null,
                    termination_requested_by: null,
                })
                .eq('id', data.invitation_id);

            if (error) {
                setActionMsg(`Klaida: ${error.message}`);
            } else {
                setData(prev => prev ? {
                    ...prev,
                    termination_status: null,
                    termination_date: null,
                    termination_reason: null,
                    termination_requested_at: null,
                    termination_confirmed_at: null,
                    termination_requested_by: null,
                } : null);
                setActionMsg('Prašymas atšauktas');
            }
        } catch {
            setActionMsg('Klaida — bandykite dar kartą');
        } finally {
            setIsSubmitting(false);
        }
    }, [data]);

    if (isLoading) {
        return (
            <section className={`${cardBase} p-6`} style={cardBgStyle}>
                <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-[#2F8481] animate-spin" />
                    <span className="text-sm text-gray-500">Kraunama...</span>
                </div>
            </section>
        );
    }

    if (noInvitation || !data) return null;

    const hasTermination = !!data.termination_status;
    const statusCfg = hasTermination ? (STATUS_CONFIG[data.termination_status!] || STATUS_CONFIG.tenant_requested) : null;

    // Minimum date: today
    const minDateStr = new Date().toISOString().split('T')[0];

    // Detail rows for the status card
    const detailRows: { label: string; value: string }[] = [];
    if (hasTermination) {
        if (data.termination_date) {
            detailRows.push({
                label: data.termination_status === 'landlord_requested' ? 'Išsikėlimo data' : 'Pageidaujama data',
                value: formatDate(data.termination_date)
            });
        }
        if (data.termination_reason) {
            detailRows.push({ label: 'Priežastis', value: data.termination_reason });
        }
        if (data.termination_requested_at && data.termination_status !== 'terminated') {
            detailRows.push({ label: 'Pateikta', value: formatDate(data.termination_requested_at) });
        }
        if (data.termination_confirmed_at) {
            detailRows.push({ label: 'Patvirtinta', value: formatDate(data.termination_confirmed_at) });
        }
    }

    return (
        <section className={`${cardBase} overflow-hidden`} style={cardBgStyle}>
            {/* Header — collapsible */}
            <div className="p-5 pb-0">
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-full flex items-center justify-between group"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <FileWarning className="w-5 h-5 text-red-500" />
                        </div>
                        <div className="text-left">
                            <h2 className="text-[15px] font-semibold text-gray-900">Sutarties nutraukimas</h2>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                                {hasTermination ? 'Prašymas pateiktas' : 'Pateikite prašymą nutraukti sutartį'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {statusCfg && (
                            <span className="flex items-center gap-1.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotColor}`} />
                                <span className={`text-[10px] font-medium ${statusCfg.textColor}`}>{statusCfg.label}</span>
                            </span>
                        )}
                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                </button>
            </div>

            {isExpanded && (
                <div className="px-5 pb-5 pt-3">
                    {/* Action message */}
                    {actionMsg && (
                        <div className={`mb-4 flex items-center gap-2 p-3 rounded-xl text-sm font-medium ${actionMsg.startsWith('Klaida') ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-emerald-50 border border-emerald-200 text-emerald-700'}`}>
                            {actionMsg.startsWith('Klaida') ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                            {actionMsg}
                        </div>
                    )}

                    {/* Status detail card */}
                    {hasTermination && (
                        <div
                            className="relative rounded-xl overflow-hidden border border-gray-100"
                            style={{ backgroundImage: `url('/images/CardsBackground.webp')`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                        >
                            <div className="relative z-10 p-4">
                                {/* Status icon + title row */}
                                <div className="flex items-center gap-2.5 mb-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${statusCfg!.bgColor}`}>
                                        {data.termination_status === 'tenant_requested' && <Clock className={`w-4 h-4 ${statusCfg!.textColor}`} />}
                                        {data.termination_status === 'landlord_requested' && <AlertTriangle className={`w-4 h-4 ${statusCfg!.textColor}`} />}
                                        {data.termination_status === 'confirmed' && <CheckCircle2 className={`w-4 h-4 ${statusCfg!.textColor}`} />}
                                        {data.termination_status === 'terminated' && <CheckCircle2 className={`w-4 h-4 ${statusCfg!.textColor}`} />}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="text-[12px] font-semibold text-gray-800">
                                            {data.termination_status === 'tenant_requested' && 'Jūsų prašymas pateiktas'}
                                            {data.termination_status === 'landlord_requested' && 'Nuomotojas inicijavo nutraukimą'}
                                            {data.termination_status === 'confirmed' && 'Nutraukimas patvirtintas'}
                                            {data.termination_status === 'terminated' && 'Sutartis nutraukta'}
                                        </div>
                                    </div>
                                </div>

                                {/* Detail rows */}
                                {detailRows.length > 0 && (
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 pt-3 border-t border-gray-100">
                                        {detailRows.map((row, i) => (
                                            <div key={i}>
                                                <span className="text-[10px] text-gray-500 block">{row.label}</span>
                                                <span className="text-[12px] font-semibold text-gray-800">{row.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Deposit calculation — matching landlord style */}
                                {statusDepositCalc && financials && data.termination_status !== 'terminated' && (
                                    <div className="mt-3">
                                        <DepositPreview calc={statusDepositCalc} deposit={financials.deposit_amount} />
                                    </div>
                                )}

                                {/* Waiting notice + cancel */}
                                {data.termination_status === 'tenant_requested' && (
                                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                                        <div className="flex items-center gap-1.5">
                                            <Info className="w-3.5 h-3.5 text-amber-500" />
                                            <span className="text-[10px] text-amber-600 font-medium">Laukiama nuomotojo patvirtinimo</span>
                                        </div>
                                        <button
                                            onClick={handleCancel}
                                            disabled={isSubmitting}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-[11px] font-medium transition-colors disabled:opacity-50 active:scale-[0.98]"
                                        >
                                            {isSubmitting ? (
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                            ) : (
                                                <XCircle className="w-3 h-3" />
                                            )}
                                            Atšaukti prašymą
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* No termination — show request button */}
                    {!hasTermination && !showForm && (
                        <button
                            onClick={() => setShowForm(true)}
                            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl text-sm font-semibold text-red-700 transition-all duration-200 active:scale-[0.98]"
                        >
                            <AlertTriangle className="w-4 h-4" />
                            Prašyti nutraukti sutartį
                        </button>
                    )}

                    {/* Termination request form */}
                    {!hasTermination && showForm && (
                        <div className="space-y-4">
                            <div>
                                <label className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500 mb-1.5">
                                    <Calendar className="w-3.5 h-3.5" />
                                    Pageidaujama išsikėlimo data
                                </label>
                                <LtDateInput
                                    value={terminationDate}
                                    min={minDateStr}
                                    onChange={(e) => setTerminationDate(e.target.value)}
                                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-[#2F8481]/20 focus:border-[#2F8481] transition-all outline-none"
                                />
                            </div>

                            {/* Live deposit calculation preview */}
                            {formDepositCalc && financials && (
                                <DepositPreview calc={formDepositCalc} deposit={financials.deposit_amount} />
                            )}

                            <div>
                                <label className="block text-[11px] font-medium text-gray-500 mb-1.5">
                                    Priežastis (neprivaloma)
                                </label>
                                <textarea
                                    value={terminationReason}
                                    onChange={(e) => setTerminationReason(e.target.value)}
                                    placeholder="Nurodykite priežastį..."
                                    rows={3}
                                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#2F8481]/20 focus:border-[#2F8481] transition-all outline-none resize-none"
                                />
                            </div>

                            {/* Info notice */}
                            <div className="p-3.5 bg-amber-50/80 border border-amber-200/60 rounded-xl">
                                <div className="flex items-start gap-2">
                                    <Info className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                                    <p className="text-[11px] text-amber-700 leading-relaxed">
                                        Nuomininkas gaus pranešimą apie sutarties nutraukimą.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => { setShowForm(false); setTerminationDate(''); setTerminationReason(''); }}
                                    className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors"
                                >
                                    Atšaukti
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={!terminationDate || isSubmitting}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition-colors active:scale-[0.98]"
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Send className="w-4 h-4" />
                                    )}
                                    {isSubmitting ? 'Siunčiama...' : 'Pateikti prašymą'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </section>
    );
});

TenantTerminationRequest.displayName = 'TenantTerminationRequest';

export default TenantTerminationRequest;
