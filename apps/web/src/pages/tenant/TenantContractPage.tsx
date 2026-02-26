import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import {
    FileText,
    Calendar,
    AlertTriangle,
    Clock,
    CheckCircle2,
    XCircle,
    Loader2,
    Info,
    Send,
    Euro,
    Shield,
    ArrowLeft,
    Home,
    MapPin,
    Maximize2,
    DoorOpen,
    Bath,
    Flame,
    Sofa,
    Car,
    PawPrint,
    Cigarette,
    BedDouble,
    Layers,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { calculateDepositReturn, getDepositRules, type DepositCalculation } from '../../utils/depositCalculator';
import LtDateInput from '../../components/ui/LtDateInput';

/* ─── Types ─── */
interface ContractInfo {
    id: string;
    property_id: string;
    property_label: string | null;
    email: string;
    contract_start: string | null;
    contract_end: string | null;
    rent: number | null;
    deposit: number | null;
    status: string;
    termination_status: string | null;
    termination_date: string | null;
    termination_reason: string | null;
    termination_requested_at: string | null;
    termination_confirmed_at: string | null;
    invited_by: string | null;
}

interface PropertyDetails {
    id: string;
    apartment_number: string;
    property_type: string | null;
    rooms: number | null;
    area: number | null;
    floor: number | null;
    floors_total: number | null;
    rent: number;
    deposit_amount: number | null;
    extended_details: {
        bedrooms?: number;
        bathrooms?: number;
        balcony?: boolean;
        storage?: boolean;
        parking_type?: string;
        heating_type?: string;
        furnished?: string;
        amenities?: string[];
        pets_allowed?: boolean;
        smoking_allowed?: boolean;
        min_term_months?: number;
        payment_due_day?: number;
        late_fee_start_day?: number;
        late_fee_amount?: number;
    } | null;
    address?: {
        street: string;
        city: string;
        zipcode: string | null;
    } | null;
}

/* ─── Design tokens (light theme) ─── */
const surface1 = 'bg-white/78 backdrop-blur-[10px] border border-white/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)] rounded-xl';
const surface2 = 'bg-white/92 backdrop-blur-[14px] border border-white/80 shadow-[0_4px_12px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)] rounded-xl';
const heading = 'text-[13px] font-bold text-gray-900';
const subtext = 'text-[11px] text-gray-500';
const dangerBtn = 'px-4 py-2 bg-red-500 text-white text-[11px] font-bold rounded-lg hover:bg-red-600 transition-all duration-200 active:scale-[0.98]';
const input = 'w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-[13px] text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition-all';

/* ─── Helpers ─── */
const formatDate = (d: string | null) => {
    if (!d) return '—';
    const dt = new Date(d);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
};

const formatCurrency = (amount: number | null) => {
    if (amount == null) return '—';
    return new Intl.NumberFormat('lt-LT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(amount);
};

/* ─── Status badges ─── */
const TerminationStatusBadge = memo<{ status: string | null }>(({ status }) => {
    if (!status) return null;
    const configs: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
        tenant_requested: { label: 'Laukiama patvirtinimo', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
        landlord_requested: { label: 'Nuomotojas inicijavo nutraukimą', color: 'bg-red-100 text-red-700 border-red-200', icon: AlertTriangle },
        confirmed: { label: 'Nutraukimas patvirtintas', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: CheckCircle2 },
        terminated: { label: 'Sutartis nutraukta', color: 'bg-gray-100 text-gray-600 border-gray-200', icon: XCircle },
    };
    const cfg = configs[status];
    if (!cfg) return null;
    const Icon = cfg.icon;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold rounded-full border ${cfg.color}`}>
            <Icon className="w-3 h-3" />
            {cfg.label}
        </span>
    );
});
TerminationStatusBadge.displayName = 'TerminationStatusBadge';

/* ─── Deposit Preview Component ─── */
const DepositPreview = memo<{ calc: DepositCalculation; deposit: number }>(({ calc, deposit }) => {
    const bgClass = calc.isFullReturn
        ? 'bg-emerald-50 border-emerald-200'
        : calc.isFullForfeit
            ? 'bg-red-50 border-red-200'
            : 'bg-amber-50 border-amber-200';

    const iconColor = calc.isFullReturn
        ? 'text-emerald-500'
        : calc.isFullForfeit
            ? 'text-red-500'
            : 'text-amber-500';

    return (
        <div className={`p-4 rounded-xl border ${bgClass} space-y-3`}>
            <div className="flex items-center gap-2">
                <Euro className={`w-4 h-4 ${iconColor}`} />
                <span className="text-[12px] font-bold text-gray-900">Depozito skaičiavimas</span>
            </div>

            <div className="space-y-1.5">
                <div className="flex justify-between text-[11px]">
                    <span className="text-gray-500">Scenarijus:</span>
                    <span className="font-medium text-gray-800">{calc.scenarioLabel}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                    <span className="text-gray-500">Pranešimo dienų:</span>
                    <span className={`font-bold ${calc.noticeDays >= 30 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {calc.noticeDays} d. {calc.noticeDays >= 30 ? '(≥30 d.)' : '(<30 d.)'}
                    </span>
                </div>
                <div className="h-px bg-gray-200 my-1" />
                <div className="flex justify-between text-[11px]">
                    <span className="text-gray-500">Sumokėtas depozitas:</span>
                    <span className="font-medium text-gray-900">{formatCurrency(deposit)}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                    <span className="text-gray-500">Grąžinama:</span>
                    <span className={`font-bold ${calc.isFullReturn ? 'text-emerald-600' : calc.isFullForfeit ? 'text-red-600' : 'text-amber-600'}`}>
                        {formatCurrency(calc.returnAmount)}
                    </span>
                </div>
                {calc.deductionAmount > 0 && (
                    <div className="flex justify-between text-[11px]">
                        <span className="text-gray-500">Išskaičiuojama:</span>
                        <span className="font-bold text-red-600">{formatCurrency(calc.deductionAmount)}</span>
                    </div>
                )}
            </div>

            <p className="text-[9px] text-gray-500 leading-relaxed">
                {calc.deductionReason}
            </p>
        </div>
    );
});
DepositPreview.displayName = 'DepositPreview';

/* ─── Deposit Rules Section ─── */
const DepositRulesSection = memo(() => {
    const rules = getDepositRules();
    const ruleColors = {
        success: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: 'text-emerald-500' },
        warning: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: 'text-amber-500' },
        danger: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: 'text-red-500' },
    };

    return (
        <div className={`${surface2} p-5`}>
            <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Shield className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                    <p className={heading}>Depozito grąžinimo taisyklės</p>
                    <p className={subtext}>Depozito grąžinimas priklauso nuo pranešimo laikotarpio</p>
                </div>
            </div>

            <div className="space-y-2">
                {rules.map((rule, i) => {
                    const c = ruleColors[rule.type];
                    return (
                        <div key={i} className={`flex items-start gap-2 p-2.5 rounded-lg ${c.bg} border ${c.border}`}>
                            {rule.type === 'success' ? (
                                <CheckCircle2 className={`w-3.5 h-3.5 ${c.icon} flex-shrink-0 mt-0.5`} />
                            ) : rule.type === 'danger' ? (
                                <XCircle className={`w-3.5 h-3.5 ${c.icon} flex-shrink-0 mt-0.5`} />
                            ) : (
                                <AlertTriangle className={`w-3.5 h-3.5 ${c.icon} flex-shrink-0 mt-0.5`} />
                            )}
                            <div>
                                <p className={`text-[10px] font-semibold ${c.text}`}>{rule.title}</p>
                                <p className="text-[10px] text-gray-600">{rule.description}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Additional info */}
            <div className="mt-3 p-2.5 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-start gap-2">
                    <Info className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                        <p className="text-[9px] text-gray-500">Depozitas negali būti naudojamas sąskaitoms, remontui ar skoloms padengti. Visos skolos turi būti padengtos atskirai.</p>
                        <p className="text-[9px] text-gray-500">Depozitas grąžinamas per 14 kalendorinių dienų nuo išsikraustymo ir patikros.</p>
                    </div>
                </div>
            </div>
        </div>
    );
});
DepositRulesSection.displayName = 'DepositRulesSection';

/* ─── Main Component ─── */
const TenantContractPage: React.FC = () => {
    const { user } = useAuth();
    const [contract, setContract] = useState<ContractInfo | null>(null);
    const [propertyDetails, setPropertyDetails] = useState<PropertyDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showTerminateForm, setShowTerminateForm] = useState(false);
    const [terminationDate, setTerminationDate] = useState('');
    const [terminationReason, setTerminationReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    // Fetch contract
    useEffect(() => {
        const fetchContract = async () => {
            if (!user?.email) return;
            try {
                setIsLoading(true);
                const { data, error: fetchErr } = await supabase
                    .from('tenant_invitations')
                    .select('id, property_id, property_label, email, contract_start, contract_end, rent, deposit, status, termination_status, termination_date, termination_reason, termination_requested_at, termination_confirmed_at, invited_by')
                    .eq('email', user.email)
                    .eq('status', 'accepted')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (fetchErr) {
                    console.error('Error fetching contract:', fetchErr);
                }
                setContract(data as ContractInfo | null);

                // Fetch property details if we have a property_id
                if (data?.property_id) {
                    const { data: propData, error: propErr } = await supabase
                        .from('properties')
                        .select('id, apartment_number, property_type, rooms, area, floor, floors_total, rent, deposit_amount, extended_details, address_id')
                        .eq('id', data.property_id)
                        .maybeSingle();

                    if (propErr) {
                        console.error('Error fetching property details:', propErr);
                    } else if (propData) {
                        // Fetch address info
                        let addressInfo = null;
                        if (propData.address_id) {
                            const { data: addrData } = await supabase
                                .from('addresses')
                                .select('street, city, zipcode')
                                .eq('id', propData.address_id)
                                .maybeSingle();
                            addressInfo = addrData;
                        }
                        setPropertyDetails({ ...propData, address: addressInfo } as PropertyDetails);
                    }
                }
            } catch (err) {
                console.error('Error:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchContract();
    }, [user]);

    // Calculate days until contract end
    const daysUntilEnd = contract?.contract_end
        ? Math.ceil((new Date(contract.contract_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;

    // Min date for termination = today (can pick today, deposit rules apply)
    const minTerminationDate = new Date();
    const minDateStr = minTerminationDate.toISOString().split('T')[0];

    // Calculate deposit preview whenever termination date changes
    const depositCalc = useMemo<DepositCalculation | null>(() => {
        if (!terminationDate || !contract) return null;
        return calculateDepositReturn({
            contractEnd: contract.contract_end,
            terminationDate,
            monthlyRent: contract.rent || 0,
            depositAmount: contract.deposit || 0,
        });
    }, [terminationDate, contract]);

    // Request termination
    const handleRequestTermination = useCallback(async () => {
        if (!contract || !terminationDate || !user) return;
        setIsSubmitting(true);
        setError('');

        try {
            // Update tenant_invitations
            const { error: updateErr } = await supabase
                .from('tenant_invitations')
                .update({
                    termination_status: 'tenant_requested',
                    termination_date: terminationDate,
                    termination_reason: terminationReason || null,
                    termination_requested_at: new Date().toISOString(),
                    termination_requested_by: user.id,
                })
                .eq('id', contract.id);

            if (updateErr) {
                setError(`Klaida: ${updateErr.message}`);
                setIsSubmitting(false);
                return;
            }

            // Notify landlord
            if (contract.invited_by) {
                const noticeDays = depositCalc?.noticeDays ?? 0;
                const depositInfo = depositCalc
                    ? ` Depozito grąžinimas: ${formatCurrency(depositCalc.returnAmount)} (${depositCalc.scenarioLabel}).`
                    : '';

                await supabase.from('notifications').insert({
                    user_id: contract.invited_by,
                    kind: 'contract_termination_request',
                    title: 'Nuomininkas prašo nutraukti sutartį',
                    body: `Nuomininkas (${user.email}) prašo nutraukti sutartį. Pageidaujama data: ${formatDate(terminationDate)}. Pranešimo laikotarpis: ${noticeDays} d.${terminationReason ? ` Priežastis: ${terminationReason}` : ''}${depositInfo}`,
                    data: {
                        property_id: contract.property_id,
                        invitation_id: contract.id,
                        termination_date: terminationDate,
                        reason: terminationReason || null,
                        tenant_email: user.email,
                        notice_days: noticeDays,
                        deposit_return: depositCalc?.returnAmount ?? 0,
                        deposit_deduction: depositCalc?.deductionAmount ?? 0,
                        deposit_scenario: depositCalc?.scenario ?? null,
                    },
                });
            }

            // Refresh data
            setContract(prev => prev ? {
                ...prev,
                termination_status: 'tenant_requested',
                termination_date: terminationDate,
                termination_reason: terminationReason || null,
                termination_requested_at: new Date().toISOString(),
            } : null);
            setSuccess('Nutraukimo prašymas sėkmingai pateiktas. Nuomotojas gaus pranešimą.');
            setShowTerminateForm(false);
        } catch (err) {
            setError('Klaida — bandykite dar kartą');
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    }, [contract, terminationDate, terminationReason, user, depositCalc]);

    // Cancel termination request
    const handleCancelRequest = useCallback(async () => {
        if (!contract) return;
        setIsCancelling(true);
        setError('');

        try {
            const { error: updateErr } = await supabase
                .from('tenant_invitations')
                .update({
                    termination_status: null,
                    termination_date: null,
                    termination_reason: null,
                    termination_requested_at: null,
                    termination_requested_by: null,
                    termination_confirmed_at: null,
                })
                .eq('id', contract.id);

            if (updateErr) {
                setError(`Klaida: ${updateErr.message}`);
                setIsCancelling(false);
                return;
            }

            // Notify landlord that request was cancelled
            if (contract.invited_by) {
                await supabase.from('notifications').insert({
                    user_id: contract.invited_by,
                    kind: 'contract_termination_cancelled',
                    title: 'Nuomininkas atšaukė nutraukimo prašymą',
                    body: `Nuomininkas (${user?.email}) atšaukė sutarties nutraukimo prašymą.`,
                    data: {
                        property_id: contract.property_id,
                        invitation_id: contract.id,
                    },
                });
            }

            setContract(prev => prev ? {
                ...prev,
                termination_status: null,
                termination_date: null,
                termination_reason: null,
                termination_requested_at: null,
                termination_confirmed_at: null,
            } : null);
            setSuccess('Nutraukimo prašymas atšauktas.');
        } catch (err) {
            setError('Klaida — bandykite dar kartą');
            console.error(err);
        } finally {
            setIsCancelling(false);
        }
    }, [contract, user]);

    // Loading state
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-6 h-6 text-teal-500 animate-spin" />
                    <span className="text-[11px] text-gray-400">Kraunama...</span>
                </div>
            </div>
        );
    }

    // No contract
    if (!contract) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-12">
                <div className={`${surface2} p-8 text-center`}>
                    <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className={heading}>Nėra aktyvios sutarties</p>
                    <p className={`${subtext} mt-1`}>Jūs neturite priimto kvietimo / aktyvios nuomos sutarties.</p>
                </div>
            </div>
        );
    }

    const isTerminationPending = contract.termination_status === 'tenant_requested';
    const isTerminatedByLandlord = contract.termination_status === 'landlord_requested' || contract.termination_status === 'terminated';
    const isConfirmed = contract.termination_status === 'confirmed';
    const canRequestTermination = !contract.termination_status;

    // Deposit calc for already-submitted request
    const pendingDepositCalc = (isTerminationPending && contract.termination_date)
        ? calculateDepositReturn({
            contractEnd: contract.contract_end,
            terminationDate: contract.termination_date,
            requestDate: contract.termination_requested_at || undefined,
            monthlyRent: contract.rent || 0,
            depositAmount: contract.deposit || 0,
        })
        : null;

    return (
        <div className="max-w-2xl mx-auto px-4 py-6 lg:py-8 space-y-4">
            {/* Page header */}
            <div>
                <h1 className="text-[16px] font-bold text-gray-900">Nuomos sutartis</h1>
                <p className="text-[11px] text-gray-500 mt-0.5">Sutarties informacija ir valdymas</p>
            </div>

            {/* Success message */}
            {success && (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <p className="text-[11px] font-medium text-emerald-700">{success}</p>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                    <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <p className="text-[11px] font-medium text-red-700">{error}</p>
                </div>
            )}

            {/* Contract info card */}
            <div className={`${surface2} p-5`}>
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-4 h-4 text-teal-600" />
                    </div>
                    <div>
                        <p className={heading}>Sutarties duomenys</p>
                        {contract.property_label && (
                            <p className={subtext}>{contract.property_label}</p>
                        )}
                    </div>
                    <div className="ml-auto">
                        <TerminationStatusBadge status={contract.termination_status} />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className={`${surface1} p-3`}>
                        <p className="text-[9px] font-medium text-gray-400 uppercase tracking-wider">Pradžia</p>
                        <p className="text-[12px] font-bold text-gray-900 mt-0.5">{formatDate(contract.contract_start)}</p>
                    </div>
                    <div className={`${surface1} p-3`}>
                        <p className="text-[9px] font-medium text-gray-400 uppercase tracking-wider">Pabaiga</p>
                        <p className="text-[12px] font-bold text-gray-900 mt-0.5">{formatDate(contract.contract_end)}</p>
                    </div>
                    <div className={`${surface1} p-3`}>
                        <p className="text-[9px] font-medium text-gray-400 uppercase tracking-wider">Nuoma</p>
                        <p className="text-[12px] font-bold text-gray-900 mt-0.5">{formatCurrency(contract.rent)}</p>
                    </div>
                    <div className={`${surface1} p-3`}>
                        <p className="text-[9px] font-medium text-gray-400 uppercase tracking-wider">Depozitas</p>
                        <p className="text-[12px] font-bold text-gray-900 mt-0.5">{formatCurrency(contract.deposit)}</p>
                    </div>
                </div>

                {daysUntilEnd !== null && (
                    <div className={`mt-3 flex items-center gap-2 p-2.5 rounded-lg ${daysUntilEnd <= 0 ? 'bg-gray-50 border border-gray-200' :
                        daysUntilEnd <= 30 ? 'bg-red-50 border border-red-100' :
                            daysUntilEnd <= 90 ? 'bg-amber-50 border border-amber-100' :
                                'bg-teal-50 border border-teal-100'
                        }`}>
                        <Calendar className={`w-3.5 h-3.5 ${daysUntilEnd <= 0 ? 'text-gray-500' :
                            daysUntilEnd <= 30 ? 'text-red-500' : daysUntilEnd <= 90 ? 'text-amber-500' : 'text-teal-500'
                            }`} />
                        <span className={`text-[11px] font-medium ${daysUntilEnd <= 0 ? 'text-gray-600' :
                            daysUntilEnd <= 30 ? 'text-red-700' : daysUntilEnd <= 90 ? 'text-amber-700' : 'text-teal-700'
                            }`}>
                            {daysUntilEnd > 0 ? `Iki sutarties pabaigos liko ${daysUntilEnd} d.` : 'Sutartis pasibaigė — taikoma neterminuota sutartis'}
                        </span>
                    </div>
                )}
            </div>

            {/* Property details section */}
            {propertyDetails && (
                <div className={`${surface2} p-5`}>
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                            <Home className="w-4 h-4 text-teal-600" />
                        </div>
                        <div>
                            <p className={heading}>Būsto informacija</p>
                            <p className={subtext}>Jūsų nuomojamo būsto duomenys</p>
                        </div>
                    </div>

                    {/* Address */}
                    {propertyDetails.address && (
                        <div className={`${surface1} p-3 mb-3`}>
                            <div className="flex items-center gap-2">
                                <MapPin className="w-3.5 h-3.5 text-teal-500" />
                                <span className="text-[12px] font-bold text-gray-900">
                                    {propertyDetails.address.street}, {propertyDetails.address.city}
                                    {propertyDetails.address.zipcode ? `, ${propertyDetails.address.zipcode}` : ''}
                                </span>
                            </div>
                            <p className="text-[10px] text-gray-500 ml-5.5 mt-0.5">
                                Butas {propertyDetails.apartment_number}
                            </p>
                        </div>
                    )}

                    {/* Core property details grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 mb-3">
                        {propertyDetails.property_type && (
                            <div className={`${surface1} p-2.5`}>
                                <p className="text-[9px] font-medium text-gray-400 uppercase tracking-wider">Tipas</p>
                                <p className="text-[12px] font-bold text-gray-900 mt-0.5 capitalize">
                                    {propertyDetails.property_type === 'apartment' ? 'Butas' :
                                        propertyDetails.property_type === 'house' ? 'Namas' :
                                            propertyDetails.property_type === 'room' ? 'Kambarys' :
                                                propertyDetails.property_type === 'commercial' ? 'Komercinis' :
                                                    propertyDetails.property_type}
                                </p>
                            </div>
                        )}
                        {propertyDetails.rooms != null && propertyDetails.rooms > 0 && (
                            <div className={`${surface1} p-2.5`}>
                                <p className="text-[9px] font-medium text-gray-400 uppercase tracking-wider">Kambariai</p>
                                <p className="text-[12px] font-bold text-gray-900 mt-0.5">{propertyDetails.rooms}</p>
                            </div>
                        )}
                        {propertyDetails.area != null && propertyDetails.area > 0 && (
                            <div className={`${surface1} p-2.5`}>
                                <p className="text-[9px] font-medium text-gray-400 uppercase tracking-wider">Plotas</p>
                                <p className="text-[12px] font-bold text-gray-900 mt-0.5">{propertyDetails.area} m²</p>
                            </div>
                        )}
                        {propertyDetails.floor != null && propertyDetails.floor > 0 && (
                            <div className={`${surface1} p-2.5`}>
                                <p className="text-[9px] font-medium text-gray-400 uppercase tracking-wider">Aukštas</p>
                                <p className="text-[12px] font-bold text-gray-900 mt-0.5">
                                    {propertyDetails.floor}{propertyDetails.floors_total ? ` / ${propertyDetails.floors_total}` : ''}
                                </p>
                            </div>
                        )}
                        {propertyDetails.extended_details?.bedrooms != null && propertyDetails.extended_details.bedrooms > 0 && (
                            <div className={`${surface1} p-2.5`}>
                                <p className="text-[9px] font-medium text-gray-400 uppercase tracking-wider">Miegamieji</p>
                                <p className="text-[12px] font-bold text-gray-900 mt-0.5">{propertyDetails.extended_details.bedrooms}</p>
                            </div>
                        )}
                        {propertyDetails.extended_details?.bathrooms != null && propertyDetails.extended_details.bathrooms > 0 && (
                            <div className={`${surface1} p-2.5`}>
                                <p className="text-[9px] font-medium text-gray-400 uppercase tracking-wider">Vonios</p>
                                <p className="text-[12px] font-bold text-gray-900 mt-0.5">{propertyDetails.extended_details.bathrooms}</p>
                            </div>
                        )}
                    </div>

                    {/* Parameters & Features */}
                    {(() => {
                        const ext = propertyDetails.extended_details || {};
                        const heatingLabels: Record<string, string> = {
                            central: 'Centrinis', individual: 'Individualus', electric: 'Elektrinis',
                            gas: 'Dujinis', other: 'Kitas',
                        };
                        const furnishedLabels: Record<string, string> = {
                            furnished: 'Įrengtas', partially: 'Dalinai įrengtas', unfurnished: 'Neįrengtas',
                        };
                        const parkingLabels: Record<string, string> = {
                            none: 'Nėra', street: 'Gatvėje', yard: 'Kieme', underground: 'Požeminis',
                        };
                        const hasParams = ext.heating_type || ext.furnished || (ext.parking_type && ext.parking_type !== 'none');
                        const hasChips = ext.balcony || ext.storage || ext.pets_allowed || ext.smoking_allowed || (ext.amenities && ext.amenities.length > 0);

                        if (!hasParams && !hasChips) return null;

                        return (
                            <div className="space-y-2 mb-3">
                                {hasParams && (
                                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                                        {ext.heating_type && (
                                            <div className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-100 rounded-lg">
                                                <Flame className="w-3.5 h-3.5 text-orange-500" />
                                                <div>
                                                    <p className="text-[9px] text-gray-400">Šildymas</p>
                                                    <p className="text-[11px] font-medium text-gray-800">{heatingLabels[ext.heating_type] || ext.heating_type}</p>
                                                </div>
                                            </div>
                                        )}
                                        {ext.furnished && (
                                            <div className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-100 rounded-lg">
                                                <Sofa className="w-3.5 h-3.5 text-blue-500" />
                                                <div>
                                                    <p className="text-[9px] text-gray-400">Įrengimas</p>
                                                    <p className="text-[11px] font-medium text-gray-800">{furnishedLabels[ext.furnished] || ext.furnished}</p>
                                                </div>
                                            </div>
                                        )}
                                        {ext.parking_type && ext.parking_type !== 'none' && (
                                            <div className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-100 rounded-lg">
                                                <Car className="w-3.5 h-3.5 text-indigo-500" />
                                                <div>
                                                    <p className="text-[9px] text-gray-400">Parkavimas</p>
                                                    <p className="text-[11px] font-medium text-gray-800">{parkingLabels[ext.parking_type] || ext.parking_type}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {hasChips && (
                                    <div className="flex flex-wrap gap-1.5">
                                        {ext.balcony && (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-teal-50 text-teal-700 text-[10px] font-medium rounded-full border border-teal-100">
                                                <Maximize2 className="w-3 h-3" /> Balkonas
                                            </span>
                                        )}
                                        {ext.storage && (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-teal-50 text-teal-700 text-[10px] font-medium rounded-full border border-teal-100">
                                                <Layers className="w-3 h-3" /> Sandėliukas
                                            </span>
                                        )}
                                        {ext.pets_allowed && (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-medium rounded-full border border-emerald-100">
                                                <PawPrint className="w-3 h-3" /> Gyvūnai
                                            </span>
                                        )}
                                        {ext.smoking_allowed && (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 text-[10px] font-medium rounded-full border border-amber-100">
                                                <Cigarette className="w-3 h-3" /> Rūkymas
                                            </span>
                                        )}
                                        {ext.amenities && ext.amenities.map((a: string, i: number) => (
                                            <span key={i} className="inline-flex items-center px-2 py-1 bg-gray-50 text-gray-600 text-[10px] font-medium rounded-full border border-gray-100">
                                                {a}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    {/* Rental conditions visible to tenant */}
                    {(() => {
                        const ext = propertyDetails.extended_details || {};
                        const hasConditions = ext.payment_due_day || ext.min_term_months || ext.late_fee_start_day != null || ext.late_fee_amount;
                        if (!hasConditions) return null;
                        return (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Nuomos sąlygos</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {ext.payment_due_day && (
                                        <div className={`${surface1} p-2.5`}>
                                            <p className="text-[9px] font-medium text-gray-400 uppercase tracking-wider">Mokėjimo diena</p>
                                            <p className="text-[12px] font-bold text-gray-900 mt-0.5">{ext.payment_due_day} d.</p>
                                        </div>
                                    )}
                                    {ext.min_term_months && (
                                        <div className={`${surface1} p-2.5`}>
                                            <p className="text-[9px] font-medium text-gray-400 uppercase tracking-wider">Min. terminas</p>
                                            <p className="text-[12px] font-bold text-gray-900 mt-0.5">{ext.min_term_months} mėn.</p>
                                        </div>
                                    )}
                                    {ext.late_fee_start_day != null && (
                                        <div className={`${surface1} p-2.5`}>
                                            <p className="text-[9px] font-medium text-gray-400 uppercase tracking-wider">Baudos pradžia</p>
                                            <p className="text-[12px] font-bold text-gray-900 mt-0.5">Po {ext.late_fee_start_day} d.</p>
                                        </div>
                                    )}
                                    {ext.late_fee_amount != null && ext.late_fee_amount > 0 && (
                                        <div className={`${surface1} p-2.5`}>
                                            <p className="text-[9px] font-medium text-gray-400 uppercase tracking-wider">Vėlavimo bauda</p>
                                            <p className="text-[12px] font-bold text-gray-900 mt-0.5">{formatCurrency(ext.late_fee_amount)}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })()}
                </div>
            )}

            {/* Termination status — when already requested */}
            {isTerminationPending && (
                <div className={`${surface2} p-5`}>
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                            <Clock className="w-4 h-4 text-amber-600" />
                        </div>
                        <div>
                            <p className={heading}>Nutraukimo prašymas pateiktas</p>
                            <p className={subtext}>Laukiama nuomotojo patvirtinimo</p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between text-[11px]">
                            <span className="text-gray-500">Pageidaujama data:</span>
                            <span className="font-medium text-gray-900">{formatDate(contract.termination_date)}</span>
                        </div>
                        {contract.termination_reason && (
                            <div className="flex justify-between text-[11px]">
                                <span className="text-gray-500">Priežastis:</span>
                                <span className="font-medium text-gray-900">{contract.termination_reason}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-[11px]">
                            <span className="text-gray-500">Pateikta:</span>
                            <span className="font-medium text-gray-900">{formatDate(contract.termination_requested_at)}</span>
                        </div>
                    </div>

                    {/* Deposit preview for pending request */}
                    {pendingDepositCalc && (
                        <div className="mt-3">
                            <DepositPreview calc={pendingDepositCalc} deposit={contract.deposit || 0} />
                        </div>
                    )}

                    {/* Cancel button */}
                    <div className="mt-4 pt-3 border-t border-gray-100">
                        <button
                            onClick={handleCancelRequest}
                            disabled={isCancelling}
                            className="flex items-center gap-2 px-4 py-2 text-[11px] font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg border border-gray-200 transition-all disabled:opacity-50"
                        >
                            {isCancelling ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <ArrowLeft className="w-3.5 h-3.5" />
                            )}
                            {isCancelling ? 'Atšaukiama...' : 'Atšaukti prašymą'}
                        </button>
                    </div>
                </div>
            )}

            {/* Terminated by landlord */}
            {isTerminatedByLandlord && (
                <div className={`${surface2} p-5 border-red-200`}>
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                            <AlertTriangle className="w-4 h-4 text-red-600" />
                        </div>
                        <div>
                            <p className={heading}>Sutartis nutraukta nuomotojo iniciatyva</p>
                            <p className={subtext}>Nuomotojas inicijavo sutarties nutraukimą</p>
                        </div>
                    </div>
                    {contract.termination_date && (
                        <div className="flex justify-between text-[11px] mt-2">
                            <span className="text-gray-500">Išsikėlimo data:</span>
                            <span className="font-bold text-red-600">{formatDate(contract.termination_date)}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Confirmed */}
            {isConfirmed && (
                <div className={`${surface2} p-5`}>
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                            <CheckCircle2 className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                            <p className={heading}>Nutraukimas patvirtintas</p>
                            <p className={subtext}>Sutarties nutraukimas patvirtintas abiejų pusių</p>
                        </div>
                    </div>
                    <div className="flex justify-between text-[11px] mt-2">
                        <span className="text-gray-500">Išsikėlimo data:</span>
                        <span className="font-bold text-blue-600">{formatDate(contract.termination_date)}</span>
                    </div>
                    {contract.termination_confirmed_at && (
                        <div className="flex justify-between text-[11px] mt-1">
                            <span className="text-gray-500">Patvirtinta:</span>
                            <span className="font-medium text-gray-900">{formatDate(contract.termination_confirmed_at)}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Terminate form or button */}
            {canRequestTermination && (
                <div className={`${surface2} p-5`}>
                    {!showTerminateForm ? (
                        <>
                            <div className="flex items-start gap-3 mb-4">
                                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <AlertTriangle className="w-4 h-4 text-red-500" />
                                </div>
                                <div>
                                    <p className={heading}>Norite nutraukti sutartį?</p>
                                    <p className={`${subtext} mt-0.5`}>
                                        Galite pateikti prašymą nutraukti nuomos sutartį. Nuomotojas turės patvirtinti jūsų prašymą.
                                        Rekomenduojame pranešti bent 30 dienų prieš pageidaujamą išsikėlimo datą — taip išsaugosite depozitą.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowTerminateForm(true)}
                                className={dangerBtn}
                            >
                                Nutraukti sutartį
                            </button>
                        </>
                    ) : (
                        <>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                                    <AlertTriangle className="w-4 h-4 text-red-500" />
                                </div>
                                <div>
                                    <p className={heading}>Sutarties nutraukimo prašymas</p>
                                    <p className={subtext}>Užpildykite informaciją žemiau</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {/* Date */}
                                <div>
                                    <label className="block text-[10px] font-medium text-gray-500 mb-1">
                                        Pageidaujama išsikėlimo data *
                                    </label>
                                    <LtDateInput
                                        value={terminationDate}
                                        onChange={(e) => setTerminationDate(e.target.value)}
                                        min={minDateStr}
                                        className={input}
                                    />
                                    <p className="text-[9px] text-gray-400 mt-1">
                                        Pasirinkite datą kurią planuojate išsikraustyti
                                    </p>
                                </div>

                                {/* Deposit preview */}
                                {depositCalc && (
                                    <DepositPreview calc={depositCalc} deposit={contract.deposit || 0} />
                                )}

                                {/* Reason */}
                                <div>
                                    <label className="block text-[10px] font-medium text-gray-500 mb-1">
                                        Priežastis (neprivaloma)
                                    </label>
                                    <textarea
                                        value={terminationReason}
                                        onChange={(e) => setTerminationReason(e.target.value)}
                                        placeholder="Nurodykite priežastį..."
                                        rows={3}
                                        className={`${input} resize-none`}
                                    />
                                </div>

                                {/* Info */}
                                <div className="flex items-start gap-2 p-2.5 bg-blue-50 border border-blue-100 rounded-lg">
                                    <Info className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
                                    <p className="text-[10px] text-blue-700">
                                        Prašymas bus išsiųstas nuomotojui patvirtinti. Sutartis liks aktyvi kol nuomotojas patvirtins nutraukimą.
                                    </p>
                                </div>

                                {/* Buttons */}
                                <div className="flex items-center gap-2 pt-1">
                                    <button
                                        onClick={handleRequestTermination}
                                        disabled={!terminationDate || isSubmitting}
                                        className={`${dangerBtn} flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
                                    >
                                        {isSubmitting ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            <Send className="w-3.5 h-3.5" />
                                        )}
                                        {isSubmitting ? 'Siunčiama...' : 'Pateikti prašymą'}
                                    </button>
                                    <button
                                        onClick={() => { setShowTerminateForm(false); setTerminationDate(''); setTerminationReason(''); setError(''); }}
                                        className="px-4 py-2 text-[11px] font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        Atšaukti
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Deposit rules info section */}
            <DepositRulesSection />
        </div>
    );
};

export default TenantContractPage;
