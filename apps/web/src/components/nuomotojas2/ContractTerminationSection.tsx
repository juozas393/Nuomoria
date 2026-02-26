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
    Euro,
    ArrowLeft,
    Plus,
    Trash2,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { calculateDepositReturn, type DepositCalculation } from '../../utils/depositCalculator';
import LtDateInput from '../ui/LtDateInput';

/* ─── Design tokens (dark glass theme — ptSurface) ─── */
const ptSurface = 'bg-white/[0.08] backdrop-blur-md border border-white/[0.12] rounded-xl overflow-hidden';
const ptHeading = 'text-[13px] font-bold text-white';
const ptSub = 'text-[11px] text-gray-400';
const ptTiny = 'text-[9px] text-gray-500';
const ptInput = 'w-full px-3 py-2 bg-white/[0.06] border border-white/[0.10] rounded-lg text-[13px] text-white placeholder-gray-500 focus:ring-1 focus:ring-teal-500/40 transition-all hover:bg-white/[0.08]';

/* ─── Types ─── */
interface Deduction {
    reason: string;
    amount: number;
}

interface TerminationData {
    invitation_id: string;
    termination_status: string | null;
    termination_date: string | null;
    termination_reason: string | null;
    termination_requested_at: string | null;
    termination_confirmed_at: string | null;
    termination_requested_by: string | null;
    tenant_email: string;
    tenant_user_id: string | null;
    contract_end: string | null;
    rent: number | null;
    deposit: number | null;
}

interface ContractTerminationSectionProps {
    propertyId: string;
    onTerminationChange?: () => void;
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

/* ─── Status badge ─── */
const StatusBadge = memo<{ status: string }>(({ status }) => {
    const configs: Record<string, { label: string; bgClass: string }> = {
        tenant_requested: { label: 'Nuomininkas prašo nutraukti', bgClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
        landlord_requested: { label: 'Jūs inicijuojate nutraukimą', bgClass: 'bg-red-500/20 text-red-300 border-red-500/30' },
        confirmed: { label: 'Patvirtinta', bgClass: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
        terminated: { label: 'Nutraukta', bgClass: 'bg-gray-500/20 text-gray-300 border-gray-500/30' },
    };
    const cfg = configs[status] || { label: status, bgClass: 'bg-gray-500/20 text-gray-300 border-gray-500/30' };
    return <span className={`inline-flex items-center px-2 py-0.5 text-[9px] font-semibold rounded-full border ${cfg.bgClass}`}>{cfg.label}</span>;
});
StatusBadge.displayName = 'StatusBadge';

/* ─── Deposit Mini Preview (dark glass themed) ─── */
const DepositMiniPreview = memo<{ calc: DepositCalculation; deposit: number }>(({ calc, deposit }) => {
    const bgClass = calc.isFullReturn
        ? 'bg-emerald-500/10 border-emerald-500/20'
        : calc.isFullForfeit
            ? 'bg-red-500/10 border-red-500/20'
            : 'bg-amber-500/10 border-amber-500/20';

    const accentColor = calc.isFullReturn ? 'text-emerald-400' : calc.isFullForfeit ? 'text-red-400' : 'text-amber-400';

    return (
        <div className={`p-4 rounded-xl border ${bgClass} space-y-3`}>
            <div className="flex items-center gap-2">
                <Euro className={`w-4 h-4 ${accentColor}`} />
                <span className="text-[12px] font-bold text-white">Depozito skaičiavimas</span>
            </div>
            <div className="space-y-2 ml-6">
                <div className="flex justify-between">
                    <span className="text-[11px] text-gray-400">Scenarijus:</span>
                    <span className="text-[11px] font-medium text-white">{calc.scenarioLabel}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-[11px] text-gray-400">Pranešimo dienų:</span>
                    <span className={`text-[11px] font-bold ${calc.noticeDays >= 30 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {calc.noticeDays} d.
                    </span>
                </div>
                <div className="flex justify-between">
                    <span className="text-[11px] text-gray-400">Depozitas:</span>
                    <span className="text-[11px] font-medium text-white">{formatCurrency(deposit)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-[11px] text-gray-400">Grąžinama:</span>
                    <span className={`text-[11px] font-bold ${accentColor}`}>{formatCurrency(calc.returnAmount)}</span>
                </div>
                {calc.deductionAmount > 0 && (
                    <div className="flex justify-between">
                        <span className="text-[11px] text-gray-400">Išskaičiuojama:</span>
                        <span className="text-[11px] font-bold text-red-400">{formatCurrency(calc.deductionAmount)}</span>
                    </div>
                )}
            </div>
            <p className="text-[10px] text-gray-500 ml-6">{calc.deductionReason}</p>
        </div>
    );
});
DepositMiniPreview.displayName = 'DepositMiniPreview';

/* ─── Main Component ─── */
const ContractTerminationSection = memo<ContractTerminationSectionProps>(({ propertyId, onTerminationChange }) => {
    const [data, setData] = useState<TerminationData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showLandlordTerminate, setShowLandlordTerminate] = useState(false);
    const [landlordDate, setLandlordDate] = useState('');
    const [landlordReason, setLandlordReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isRejecting, setIsRejecting] = useState(false);
    const [actionMsg, setActionMsg] = useState('');
    const [deductions, setDeductions] = useState<Deduction[]>([]);
    const [customReturnAmount, setCustomReturnAmount] = useState<number | null>(null);

    // Fetch termination data for this property's accepted invitation
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const { data: inv, error } = await supabase
                    .from('tenant_invitations')
                    .select('id, termination_status, termination_date, termination_reason, termination_requested_at, termination_confirmed_at, termination_requested_by, email, contract_end, rent, deposit')
                    .eq('property_id', propertyId)
                    .eq('status', 'accepted')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (error) {
                    console.error('Error fetching termination data:', error);
                    setData(null);
                } else if (inv) {
                    // Fetch actual rent/deposit from properties table (invitation values may be null)
                    const { data: property } = await supabase
                        .from('properties')
                        .select('rent, deposit_amount, contract_start, contract_end')
                        .eq('id', propertyId)
                        .maybeSingle();

                    // Resolve tenant user_id from email
                    let tenantUserId: string | null = null;
                    if (inv.email) {
                        const { data: userRow } = await supabase
                            .from('users')
                            .select('id')
                            .eq('email', inv.email)
                            .maybeSingle();
                        tenantUserId = userRow?.id || null;
                    }

                    // Use property data as primary, invitation as fallback
                    const actualRent = property?.rent ?? inv.rent ?? 0;
                    const actualDeposit = property?.deposit_amount ?? inv.deposit ?? 0;
                    const actualContractEnd = inv.contract_end ?? property?.contract_end ?? null;

                    setData({
                        invitation_id: inv.id,
                        termination_status: inv.termination_status,
                        termination_date: inv.termination_date,
                        termination_reason: inv.termination_reason,
                        termination_requested_at: inv.termination_requested_at,
                        termination_confirmed_at: inv.termination_confirmed_at,
                        termination_requested_by: inv.termination_requested_by,
                        tenant_email: inv.email,
                        tenant_user_id: tenantUserId,
                        contract_end: actualContractEnd,
                        rent: actualRent,
                        deposit: actualDeposit,
                    });
                } else {
                    setData(null);
                }
            } catch (err) {
                console.error('Error:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [propertyId]);

    // Calculate deposit for tenant's request
    const requestDepositCalc = useMemo<DepositCalculation | null>(() => {
        if (!data || !data.termination_date || data.termination_status !== 'tenant_requested') return null;
        return calculateDepositReturn({
            contractEnd: data.contract_end,
            terminationDate: data.termination_date,
            requestDate: data.termination_requested_at || undefined,
            monthlyRent: data.rent || 0,
            depositAmount: data.deposit || 0,
        });
    }, [data]);

    // Calculate deposit preview for landlord-initiated termination
    const landlordDepositCalc = useMemo<DepositCalculation | null>(() => {
        if (!data || !landlordDate) return null;
        return calculateDepositReturn({
            contractEnd: data.contract_end,
            terminationDate: landlordDate,
            monthlyRent: data.rent || 0,
            depositAmount: data.deposit || 0,
        });
    }, [data, landlordDate]);

    // Custom deductions total
    const deductionsTotal = useMemo(() => Math.round(deductions.reduce((sum, d) => sum + (d.amount || 0), 0) * 100) / 100, [deductions]);

    // Adjusted return after custom deductions (for landlord flow)
    const adjustedReturn = useMemo(() => {
        if (!landlordDepositCalc) return 0;
        const baseReturn = customReturnAmount ?? landlordDepositCalc.returnAmount;
        return Math.round(Math.max(0, baseReturn - deductionsTotal) * 100) / 100;
    }, [landlordDepositCalc, customReturnAmount, deductionsTotal]);

    // Adjusted return after custom deductions (for tenant request flow)
    const adjustedRequestReturn = useMemo(() => {
        if (!requestDepositCalc) return 0;
        return Math.max(0, requestDepositCalc.returnAmount - deductionsTotal);
    }, [requestDepositCalc, deductionsTotal]);

    const addDeduction = useCallback(() => {
        setDeductions(prev => [...prev, { reason: '', amount: 0 }]);
        setCustomReturnAmount(null);
    }, []);

    const removeDeduction = useCallback((index: number) => {
        setDeductions(prev => prev.filter((_, i) => i !== index));
        setCustomReturnAmount(null);
    }, []);

    const updateDeduction = useCallback((index: number, field: keyof Deduction, value: string | number) => {
        setDeductions(prev => prev.map((d, i) => i === index ? { ...d, [field]: value } : d));
        setCustomReturnAmount(null);
    }, []);

    // Confirm tenant request
    const handleConfirmTermination = useCallback(async () => {
        if (!data) return;
        setIsSubmitting(true);
        setActionMsg('');
        try {
            const { error } = await supabase
                .from('tenant_invitations')
                .update({
                    termination_status: 'confirmed',
                    termination_confirmed_at: new Date().toISOString(),
                })
                .eq('id', data.invitation_id);

            if (error) {
                setActionMsg(`Klaida: ${error.message}`);
            } else {
                // Notify tenant
                if (data.tenant_user_id) {
                    const depositInfo = requestDepositCalc
                        ? ` Depozito grąžinimas: ${formatCurrency(requestDepositCalc.returnAmount)} (${requestDepositCalc.scenarioLabel}).`
                        : '';

                    await supabase.from('notifications').insert({
                        user_id: data.tenant_user_id,
                        kind: 'contract_termination_confirmed',
                        title: 'Sutarties nutraukimas patvirtintas',
                        body: `Nuomotojas patvirtino jūsų prašymą nutraukti sutartį. Išsikėlimo data: ${formatDate(data.termination_date)}.${depositInfo}`,
                        data: {
                            property_id: propertyId,
                            invitation_id: data.invitation_id,
                            deposit_return: requestDepositCalc?.returnAmount ?? 0,
                            deposit_deduction: requestDepositCalc?.deductionAmount ?? 0,
                        },
                    });
                }
                setData(prev => prev ? { ...prev, termination_status: 'confirmed', termination_confirmed_at: new Date().toISOString() } : null);
                setActionMsg('Nutraukimas patvirtintas');
                onTerminationChange?.();
            }
        } catch {
            setActionMsg('Klaida — bandykite dar kartą');
        } finally {
            setIsSubmitting(false);
        }
    }, [data, propertyId, onTerminationChange, requestDepositCalc]);

    // Reject tenant request
    const handleRejectTermination = useCallback(async () => {
        if (!data) return;
        setIsRejecting(true);
        setActionMsg('');
        try {
            const { error } = await supabase
                .from('tenant_invitations')
                .update({
                    termination_status: null,
                    termination_date: null,
                    termination_reason: null,
                    termination_requested_at: null,
                    termination_requested_by: null,
                    termination_confirmed_at: null,
                })
                .eq('id', data.invitation_id);

            if (error) {
                setActionMsg(`Klaida: ${error.message}`);
            } else {
                // Notify tenant
                if (data.tenant_user_id) {
                    await supabase.from('notifications').insert({
                        user_id: data.tenant_user_id,
                        kind: 'contract_termination_rejected',
                        title: 'Nutraukimo prašymas atmestas',
                        body: 'Nuomotojas atmetė jūsų sutarties nutraukimo prašymą. Galite pateikti naują prašymą arba susisiekti su nuomotoju.',
                        data: {
                            property_id: propertyId,
                            invitation_id: data.invitation_id,
                        },
                    });
                }
                setData(prev => prev ? {
                    ...prev,
                    termination_status: null,
                    termination_date: null,
                    termination_reason: null,
                    termination_requested_at: null,
                    termination_requested_by: null,
                    termination_confirmed_at: null,
                } : null);
                setActionMsg('Prašymas atmestas');
                onTerminationChange?.();
            }
        } catch {
            setActionMsg('Klaida — bandykite dar kartą');
        } finally {
            setIsRejecting(false);
        }
    }, [data, propertyId, onTerminationChange]);

    // Landlord initiates termination
    const handleLandlordTerminate = useCallback(async () => {
        if (!data || !landlordDate) return;
        setIsSubmitting(true);
        setActionMsg('');
        try {
            const user = (await supabase.auth.getUser()).data.user;
            const { error } = await supabase
                .from('tenant_invitations')
                .update({
                    termination_status: 'landlord_requested',
                    termination_date: landlordDate,
                    termination_reason: landlordReason || null,
                    termination_requested_at: new Date().toISOString(),
                    termination_requested_by: user?.id || null,
                    termination_deductions: deductions.length > 0 ? deductions.filter(d => d.reason && d.amount > 0) : null,
                })
                .eq('id', data.invitation_id);

            if (error) {
                setActionMsg(`Klaida: ${error.message}`);
            } else {
                // Notify tenant
                if (data.tenant_user_id) {
                    await supabase.from('notifications').insert({
                        user_id: data.tenant_user_id,
                        kind: 'contract_terminated_by_landlord',
                        title: 'Nuomotojas nutraukė sutartį',
                        body: `Nuomotojas nutraukė nuomos sutartį. Išsikėlimo data: ${formatDate(landlordDate)}.${landlordReason ? ` Priežastis: ${landlordReason}` : ''}`,
                        data: {
                            property_id: propertyId,
                            invitation_id: data.invitation_id,
                            termination_date: landlordDate,
                            deposit_return: landlordDepositCalc?.returnAmount ?? 0,
                            deposit_deduction: landlordDepositCalc?.deductionAmount ?? 0,
                        },
                    });
                }
                setData(prev => prev ? {
                    ...prev,
                    termination_status: 'landlord_requested',
                    termination_date: landlordDate,
                    termination_reason: landlordReason || null,
                    termination_requested_at: new Date().toISOString(),
                } : null);
                setShowLandlordTerminate(false);
                setActionMsg('Nutraukimas inicijuotas');
                onTerminationChange?.();
            }
        } catch {
            setActionMsg('Klaida — bandykite dar kartą');
        } finally {
            setIsSubmitting(false);
        }
    }, [data, landlordDate, landlordReason, propertyId, onTerminationChange, landlordDepositCalc]);

    // Complete termination — remove tenant from apartment
    const handleCompletetermination = useCallback(async () => {
        if (!data) return;
        const confirmed = window.confirm(
            'Ar tikrai norite pašalinti nuomininką? Butas bus pažymėtas kaip laisvas.'
        );
        if (!confirmed) return;

        setIsSubmitting(true);
        setActionMsg('');
        try {
            // 1. Update invitation status to 'terminated'
            const { error: invError } = await supabase
                .from('tenant_invitations')
                .update({
                    termination_status: 'terminated',
                    termination_confirmed_at: new Date().toISOString(),
                    status: 'terminated',
                })
                .eq('id', data.invitation_id);

            if (invError) throw invError;

            // 2. Set property status to vacant and clear tenant data
            const today = new Date().toISOString().split('T')[0];
            const { error: propError } = await supabase
                .from('properties')
                .update({
                    status: 'vacant',
                    payment_status: null,
                    tenant_name: '',
                    email: null,
                    phone: null,
                    contract_start: today,
                    contract_end: today,
                    deposit_paid: false,
                    deposit_returned: false,
                    deposit_paid_amount: 0,
                })
                .eq('id', propertyId);

            if (propError) throw propError;

            // 3. Notify tenant
            if (data.tenant_user_id) {
                await supabase.from('notifications').insert({
                    user_id: data.tenant_user_id,
                    kind: 'contract_terminated',
                    title: 'Sutartis nutraukta',
                    body: `Nuomos sutartis buvo nutraukta. Išsikėlimo data: ${formatDate(data.termination_date)}.`,
                    data: {
                        property_id: propertyId,
                        invitation_id: data.invitation_id,
                        termination_date: data.termination_date,
                    },
                });
            }

            setData(prev => prev ? {
                ...prev,
                termination_status: 'terminated',
                termination_confirmed_at: new Date().toISOString(),
            } : null);
            setActionMsg('Nuomininkas pašalintas — butas laisvas');
            onTerminationChange?.();
        } catch {
            setActionMsg('Klaida — bandykite dar kartą');
        } finally {
            setIsSubmitting(false);
        }
    }, [data, propertyId, onTerminationChange]);

    // Cancel termination — revert to no termination state
    const handleCancelTermination = useCallback(async () => {
        if (!data) return;
        setIsRejecting(true);
        setActionMsg('');
        try {
            const { error } = await supabase
                .from('tenant_invitations')
                .update({
                    termination_status: null,
                    termination_date: null,
                    termination_reason: null,
                    termination_requested_at: null,
                    termination_requested_by: null,
                    termination_confirmed_at: null,
                    termination_deductions: null,
                })
                .eq('id', data.invitation_id);

            if (error) throw error;

            setData(prev => prev ? {
                ...prev,
                termination_status: null,
                termination_date: null,
                termination_reason: null,
                termination_requested_at: null,
                termination_requested_by: null,
                termination_confirmed_at: null,
            } : null);
            setActionMsg('Nutraukimas atšauktas');
            onTerminationChange?.();
        } catch {
            setActionMsg('Klaida — bandykite dar kartą');
        } finally {
            setIsRejecting(false);
        }
    }, [data, onTerminationChange]);

    if (isLoading) {
        return (
            <div className={`${ptSurface} p-4 flex items-center gap-2`}>
                <Loader2 className="w-4 h-4 text-teal-400 animate-spin" />
                <span className={ptSub}>Kraunama sutarties informacija...</span>
            </div>
        );
    }

    if (!data) return null; // No accepted invitation — nothing to show

    const minDate = new Date();
    const minDateStr = minDate.toISOString().split('T')[0];

    return (
        <div className={`${ptSurface} p-4`}>
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-red-500/15 flex items-center justify-center">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                </div>
                <div className="flex-1">
                    <p className={ptHeading}>Sutarties nutraukimas</p>
                </div>
                {data.termination_status && <StatusBadge status={data.termination_status} />}
            </div>

            {/* Action message */}
            {actionMsg && (
                <div className={`mb-3 flex items-center gap-2 p-2 rounded-lg ${actionMsg.startsWith('Klaida') ? 'bg-red-500/15 border border-red-500/20' : 'bg-emerald-500/15 border border-emerald-500/20'}`}>
                    {actionMsg.startsWith('Klaida') ? <XCircle className="w-3.5 h-3.5 text-red-400" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                    <span className={`text-[10px] font-medium ${actionMsg.startsWith('Klaida') ? 'text-red-300' : 'text-emerald-300'}`}>{actionMsg}</span>
                </div>
            )}

            {/* TENANT REQUESTED — show confirm/reject with deposit info */}
            {data.termination_status === 'tenant_requested' && (
                <div className="space-y-3">
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                        <div className="flex items-center gap-2 mb-2">
                            <Clock className="w-4 h-4 text-amber-400" />
                            <span className="text-[11px] font-semibold text-amber-300">Nuomininkas prašo nutraukti sutartį</span>
                        </div>
                        <div className="space-y-2 ml-6">
                            <div className="flex justify-between">
                                <span className="text-[11px] text-gray-400">El. paštas:</span>
                                <span className="text-[11px] font-medium text-white">{data.tenant_email}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[11px] text-gray-400">Pageidaujama data:</span>
                                <span className="text-[11px] font-medium text-white">{formatDate(data.termination_date)}</span>
                            </div>
                            {data.termination_reason && (
                                <div className="flex justify-between">
                                    <span className="text-[11px] text-gray-400">Priežastis:</span>
                                    <span className="text-[11px] font-medium text-white">{data.termination_reason}</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-[11px] text-gray-400">Pateikta:</span>
                                <span className="text-[11px] font-medium text-white">{formatDate(data.termination_requested_at)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Deposit calculation */}
                    {requestDepositCalc && (
                        <DepositMiniPreview calc={requestDepositCalc} deposit={data.deposit || 0} />
                    )}

                    {/* Actions: Confirm + Reject */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleConfirmTermination}
                            disabled={isSubmitting || isRejecting}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-500 text-white text-[10px] font-bold rounded-lg hover:bg-teal-600 transition-all active:scale-[0.98] disabled:opacity-50"
                        >
                            {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                            Patvirtinti nutraukimą
                        </button>
                        <button
                            onClick={handleRejectTermination}
                            disabled={isSubmitting || isRejecting}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.06] border border-white/[0.10] text-gray-300 text-[10px] font-medium rounded-lg hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/30 transition-all active:scale-[0.98] disabled:opacity-50"
                        >
                            {isRejecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                            Atmesti
                        </button>
                    </div>
                </div>
            )}

            {/* LANDLORD REQUESTED — show status + actions */}
            {(data.termination_status === 'landlord_requested' || data.termination_status === 'confirmed') && (
                <div className="space-y-3">
                    <div className={`p-3 ${data.termination_status === 'confirmed' ? 'bg-blue-500/10 border-blue-500/20' : 'bg-red-500/10 border-red-500/20'} border rounded-xl`}>
                        <p className={`text-[11px] font-semibold ${data.termination_status === 'confirmed' ? 'text-blue-400' : 'text-red-400'}`}>
                            {data.termination_status === 'confirmed' ? 'Nutraukimas patvirtintas' : 'Jūs inicijuojate sutarties nutraukimą'}
                        </p>
                        <div className="mt-2 space-y-2">
                            <div className="flex justify-between">
                                <span className="text-[11px] text-gray-400">Išsikėlimo data:</span>
                                <span className={`text-[11px] font-bold ${data.termination_status === 'confirmed' ? 'text-blue-400' : 'text-red-400'}`}>{formatDate(data.termination_date)}</span>
                            </div>
                            {data.termination_reason && (
                                <div className="flex justify-between">
                                    <span className="text-[11px] text-gray-400">Priežastis:</span>
                                    <span className="text-[11px] text-white">{data.termination_reason}</span>
                                </div>
                            )}
                            {data.termination_confirmed_at && (
                                <div className="flex justify-between">
                                    <span className="text-[11px] text-gray-400">Patvirtinta:</span>
                                    <span className="text-[11px] text-white">{formatDate(data.termination_confirmed_at)}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Actions: Complete + Cancel */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleCompletetermination}
                            disabled={isSubmitting}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-500 text-white text-[10px] font-bold rounded-lg hover:bg-teal-600 transition-all active:scale-[0.98] disabled:opacity-50"
                        >
                            {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                            Pašalinti nuomininką
                        </button>
                        <button
                            onClick={handleCancelTermination}
                            disabled={isSubmitting || isRejecting}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.06] border border-white/[0.10] text-gray-300 text-[10px] font-medium rounded-lg hover:bg-white/[0.08] hover:text-white transition-all active:scale-[0.98] disabled:opacity-50"
                        >
                            {isRejecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowLeft className="w-3 h-3" />}
                            Atšaukti nutraukimą
                        </button>
                    </div>
                </div>
            )}

            {/* TERMINATED */}
            {data.termination_status === 'terminated' && (
                <div className="p-3 bg-gray-500/10 border border-gray-500/20 rounded-xl">
                    <p className="text-[11px] font-semibold text-gray-300">Sutartis nutraukta</p>
                    <div className="mt-2 space-y-2">
                        <div className="flex justify-between">
                            <span className="text-[11px] text-gray-400">Išsikėlimo data:</span>
                            <span className="text-[11px] text-white">{formatDate(data.termination_date)}</span>
                        </div>
                        {data.termination_reason && (
                            <div className="flex justify-between">
                                <span className="text-[11px] text-gray-400">Priežastis:</span>
                                <span className="text-[11px] text-white">{data.termination_reason}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* NO TERMINATION — Landlord can initiate */}
            {!data.termination_status && (
                <>
                    {!showLandlordTerminate ? (
                        <div>
                            <p className={`${ptSub} mb-3`}>
                                Galite inicijuoti sutarties nutraukimą arba palaukite kol nuomininkas pateiks prašymą.
                            </p>
                            <button
                                onClick={() => setShowLandlordTerminate(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/80 text-white text-[10px] font-bold rounded-lg hover:bg-red-500 transition-all active:scale-[0.98]"
                            >
                                <AlertTriangle className="w-3 h-3" />
                                Nutraukti sutartį
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div>
                                <label className="block text-[10px] font-medium text-gray-400 mb-1">
                                    Išsikėlimo data *
                                </label>
                                <LtDateInput
                                    value={landlordDate}
                                    onChange={(e) => { setLandlordDate(e.target.value); setCustomReturnAmount(null); }}
                                    min={minDateStr}
                                    className={ptInput}
                                />
                                <p className="text-[10px] text-gray-400 mt-1">Pasirinkite nuo šiandienos. Jei pranešta mažiau nei 30 d. — depozitas gali būti negrąžintas.</p>
                            </div>

                            {/* Deposit preview for landlord-initiated */}
                            {landlordDepositCalc && (
                                <DepositMiniPreview calc={landlordDepositCalc} deposit={data.deposit || 0} />
                            )}

                            {/* Custom deductions */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-medium text-gray-400">Papildomi išskaitymai</span>
                                    <button
                                        onClick={addDeduction}
                                        className="flex items-center gap-1 px-2 py-1 bg-white/[0.06] border border-white/[0.10] text-[10px] font-medium text-gray-300 rounded-lg hover:bg-white/[0.10] hover:text-white transition-all active:scale-[0.98]"
                                    >
                                        <Plus className="w-3 h-3" />
                                        Pridėti
                                    </button>
                                </div>
                                {deductions.length === 0 && (
                                    <p className="text-[10px] text-gray-500 italic">Nėra papildomų išskaitymų (pvz., valymas, remontai, čiužinio keitimas)</p>
                                )}
                                {deductions.map((d, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={d.reason}
                                            onChange={(e) => updateDeduction(i, 'reason', e.target.value)}
                                            placeholder="Priežastis (pvz., čiužinio keitimas)"
                                            className={`flex-1 ${ptInput} !py-1.5 !text-[11px]`}
                                        />
                                        <div className="relative w-24">
                                            <input
                                                type="number"
                                                value={d.amount || ''}
                                                onChange={(e) => updateDeduction(i, 'amount', parseFloat(e.target.value) || 0)}
                                                placeholder="0"
                                                min="0"
                                                step="0.01"
                                                className={`${ptInput} !py-1.5 !text-[11px] !pr-6 text-right`}
                                            />
                                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-gray-500">€</span>
                                        </div>
                                        <button
                                            onClick={() => removeDeduction(i)}
                                            className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/15 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Final editable return amount — AFTER deductions */}
                            {landlordDepositCalc && (
                                <div className="p-3 rounded-xl border bg-white/[0.04] border-white/[0.08] space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-bold text-gray-300">Galutinė grąžinama suma</span>
                                        <button
                                            onClick={() => setCustomReturnAmount(null)}
                                            className="text-[9px] text-teal-400 hover:text-teal-300 transition-colors"
                                        >
                                            Atstatyti rekomenduojamą
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={customReturnAmount ?? adjustedReturn}
                                            onChange={(e) => setCustomReturnAmount(Math.max(0, Math.min(data.deposit || 0, parseFloat(e.target.value) || 0)))}
                                            min="0"
                                            max={data.deposit || 0}
                                            step="0.01"
                                            className={`${ptInput} !pr-8 text-right !text-[13px] !font-bold`}
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-gray-500">€</span>
                                    </div>
                                    <p className="text-[9px] text-gray-500">
                                        Rekomenduojama: {formatCurrency(landlordDepositCalc.returnAmount)}{deductionsTotal > 0 ? ` − ${formatCurrency(deductionsTotal)} išskaitymai = ${formatCurrency(adjustedReturn)}` : ''}
                                    </p>
                                </div>
                            )}

                            <div>
                                <label className="block text-[10px] font-medium text-gray-400 mb-1">
                                    Priežastis (neprivaloma)
                                </label>
                                <textarea
                                    value={landlordReason}
                                    onChange={(e) => setLandlordReason(e.target.value)}
                                    placeholder="Nurodykite priežastį..."
                                    rows={2}
                                    className={`${ptInput} resize-none`}
                                />
                            </div>

                            <div className="flex items-start gap-2 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                                <Info className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                                <p className="text-[10px] text-amber-300">
                                    Nuomininkas gaus pranešimą apie sutarties nutraukimą.
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleLandlordTerminate}
                                    disabled={!landlordDate || isSubmitting}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white text-[10px] font-bold rounded-lg hover:bg-red-600 transition-all active:scale-[0.98] disabled:opacity-50"
                                >
                                    {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                                    {isSubmitting ? 'Siunčiama...' : 'Patvirtinti nutraukimą'}
                                </button>
                                <button
                                    onClick={() => { setShowLandlordTerminate(false); setLandlordDate(''); setLandlordReason(''); }}
                                    className="px-3 py-1.5 text-[10px] font-medium text-gray-400 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors"
                                >
                                    Atšaukti
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
});

ContractTerminationSection.displayName = 'ContractTerminationSection';
export default ContractTerminationSection;
