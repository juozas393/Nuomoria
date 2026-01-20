import React, { useMemo, useState } from 'react';
import {
    CheckCircle,
    AlertTriangle,
    XCircle,
    ChevronDown,
    ChevronUp,
    Calendar,
    Euro,
    FileText,
    Info,
    Clock
} from 'lucide-react';
import {
    calculateDepositReturn,
    generateDepositSummary,
    formatCurrency,
    formatDateLT,
    DepositInfo,
    OutstandingObligations,
    DepositCalculationResult
} from '../../utils/depositLogic';

interface DepositCardProps {
    deposit: DepositInfo;
    obligations?: OutstandingObligations;
    onSeeFormula?: () => void;
    onRefund?: () => void;
    onAddObligation?: () => void;
    compact?: boolean;
}

export const DepositCard: React.FC<DepositCardProps> = ({
    deposit,
    obligations = { unpaidBills: 0, inventoryDamage: 0, cleaningCost: 0, otherDebts: 0 },
    onSeeFormula,
    onRefund,
    onAddObligation,
    compact = false
}) => {
    const [isExpanded, setIsExpanded] = useState(!compact);

    // Apskaičiuojame depozito grąžinimą
    const result = useMemo(() =>
        calculateDepositReturn(deposit, obligations),
        [deposit, obligations]
    );

    const summary = useMemo(() =>
        generateDepositSummary(result),
        [result]
    );

    // Statusų spalvos
    const statusColors = {
        success: {
            bg: 'bg-emerald-50',
            border: 'border-emerald-200',
            text: 'text-emerald-700',
            icon: 'text-emerald-500',
            badge: 'bg-emerald-100 text-emerald-700'
        },
        warning: {
            bg: 'bg-amber-50',
            border: 'border-amber-200',
            text: 'text-amber-700',
            icon: 'text-amber-500',
            badge: 'bg-amber-100 text-amber-700'
        },
        error: {
            bg: 'bg-red-50',
            border: 'border-red-200',
            text: 'text-red-700',
            icon: 'text-red-500',
            badge: 'bg-red-100 text-red-700'
        }
    };

    const colors = statusColors[summary.status];

    const StatusIcon = summary.status === 'success' ? CheckCircle :
        summary.status === 'warning' ? AlertTriangle : XCircle;

    return (
        <div className={`rounded-2xl border ${colors.border} ${colors.bg} overflow-hidden`}>
            {/* Header */}
            <div
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/50 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${colors.badge} flex items-center justify-center`}>
                        <StatusIcon className={`w-5 h-5 ${colors.icon}`} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-neutral-900">Depozitas</h3>
                        <p className={`text-sm ${colors.text}`}>{summary.statusText}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="text-right">
                        <div className="text-lg font-bold text-neutral-900">
                            {summary.refundable}
                        </div>
                        <div className="text-xs text-neutral-500">grąžintina</div>
                    </div>
                    {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-neutral-400" />
                    ) : (
                        <ChevronDown className="w-5 h-5 text-neutral-400" />
                    )}
                </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="px-4 pb-4 space-y-4">
                    {/* Scenario */}
                    <div className="flex items-start gap-2 p-3 bg-white/60 rounded-xl">
                        <Info className="w-4 h-4 text-neutral-400 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-neutral-600">{summary.subtitle}</p>
                    </div>

                    {/* Skaičiavimai */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center py-2 border-b border-neutral-200/50">
                            <span className="text-sm text-neutral-600">Sumokėtas depozitas</span>
                            <span className="font-medium text-neutral-900">{summary.depositPaid}</span>
                        </div>

                        {result.noticeDeduction > 0 && (
                            <div className="flex justify-between items-center py-2 border-b border-neutral-200/50">
                                <div>
                                    <span className="text-sm text-red-600">Išskaitymas</span>
                                    <p className="text-xs text-neutral-500">{summary.deductionReason}</p>
                                </div>
                                <span className="font-medium text-red-600">-{summary.deduction}</span>
                            </div>
                        )}

                        <div className="flex justify-between items-center py-2">
                            <span className="text-sm font-medium text-neutral-900">Grąžintina suma</span>
                            <span className={`text-lg font-bold ${colors.text}`}>{summary.refundable}</span>
                        </div>
                    </div>

                    {/* Vėlavimo mokestis (jei yra) */}
                    {result.lateFee > 0 && (
                        <div className="p-3 bg-amber-100/50 rounded-xl border border-amber-200">
                            <div className="flex items-start gap-2">
                                <Clock className="w-4 h-4 text-amber-600 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-amber-800">
                                        Vėlavimo mokestis: {formatCurrency(result.lateFee)}
                                    </p>
                                    <p className="text-xs text-amber-700">
                                        {result.lateDays} d. × 50€ (skaičiuojama atskirai, NE iš depozito)
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Blokuojantys įsipareigojimai */}
                    {result.blockingReasons.length > 0 && (
                        <div className="p-3 bg-red-100/50 rounded-xl border border-red-200">
                            <div className="flex items-start gap-2 mb-2">
                                <XCircle className="w-4 h-4 text-red-600 mt-0.5" />
                                <p className="text-sm font-medium text-red-800">
                                    Depozitas negali būti grąžintas
                                </p>
                            </div>
                            <ul className="ml-6 space-y-1">
                                {result.blockingReasons.map((reason, i) => (
                                    <li key={i} className="text-sm text-red-700">• {reason}</li>
                                ))}
                            </ul>
                            <p className="mt-2 ml-6 text-xs text-red-600">
                                Nuomininkas turi pats padengti šiuos įsipareigojimus
                            </p>
                        </div>
                    )}

                    {/* Grąžinimo terminas */}
                    {summary.deadline && result.canRefund && (
                        <div className="flex items-center gap-2 p-3 bg-[#2F8481]/10 rounded-xl">
                            <Calendar className="w-4 h-4 text-[#2F8481]" />
                            <p className="text-sm text-[#2F8481]">
                                Grąžinti iki <strong>{summary.deadline}</strong> (14 dienų nuo patikros)
                            </p>
                        </div>
                    )}

                    {/* Veiksmai */}
                    <div className="flex gap-2 pt-2">
                        {onSeeFormula && (
                            <button
                                onClick={onSeeFormula}
                                className="flex items-center gap-1.5 px-3 py-2 text-sm text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
                            >
                                <FileText className="w-4 h-4" />
                                Peržiūrėti formulę
                            </button>
                        )}

                        {result.canRefund && onRefund && (
                            <button
                                onClick={onRefund}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#2F8481] text-white rounded-xl font-medium hover:bg-[#267270] transition-colors"
                            >
                                <Euro className="w-4 h-4" />
                                Grąžinti {summary.refundable}
                            </button>
                        )}

                        {!result.canRefund && onAddObligation && (
                            <button
                                onClick={onAddObligation}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-neutral-100 text-neutral-700 rounded-xl font-medium hover:bg-neutral-200 transition-colors"
                            >
                                Valdyti įsipareigojimus
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// ============================================
// DEPOZITO FORMULĖS MODALAS
// ============================================

interface DepositFormulaModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const DepositFormulaModal: React.FC<DepositFormulaModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-neutral-200 p-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-neutral-900">
                        🧾 Depozito grąžinimo taisyklės
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                    >
                        <XCircle className="w-5 h-5 text-neutral-400" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Scenarijus 1 */}
                    <div>
                        <h3 className="font-semibold text-neutral-900 mb-3 flex items-center gap-2">
                            <span className="w-6 h-6 bg-[#2F8481] text-white rounded-full flex items-center justify-center text-sm">1</span>
                            Sutartis galioja - išsikrausto pabaigoje
                        </h3>
                        <div className="bg-neutral-50 rounded-xl overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-neutral-100">
                                    <tr>
                                        <th className="text-left p-3 font-medium">Pranešimas</th>
                                        <th className="text-left p-3 font-medium">Rezultatas</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="border-t border-neutral-200">
                                        <td className="p-3">Pranešė ≥30 dienų prieš</td>
                                        <td className="p-3 text-emerald-600">✅ Grąžinamas visas depozitas</td>
                                    </tr>
                                    <tr className="border-t border-neutral-200">
                                        <td className="p-3">Pranešė &lt;30 dienų prieš</td>
                                        <td className="p-3 text-amber-600">⚠️ Išskaičiuojama 1 mėn. nuoma</td>
                                    </tr>
                                    <tr className="border-t border-neutral-200">
                                        <td className="p-3">Nepranešė</td>
                                        <td className="p-3 text-amber-600">⚠️ Išskaičiuojama 1 mėn. nuoma</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Scenarijus 2 */}
                    <div>
                        <h3 className="font-semibold text-neutral-900 mb-3 flex items-center gap-2">
                            <span className="w-6 h-6 bg-[#2F8481] text-white rounded-full flex items-center justify-center text-sm">2</span>
                            Sutartis galioja - išsikrausto anksčiau
                        </h3>
                        <div className="bg-neutral-50 rounded-xl overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-neutral-100">
                                    <tr>
                                        <th className="text-left p-3 font-medium">Pranešimas</th>
                                        <th className="text-left p-3 font-medium">Rezultatas</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="border-t border-neutral-200">
                                        <td className="p-3">Pranešė ≥30 dienų prieš</td>
                                        <td className="p-3 text-amber-600">⚠️ Išskaičiuojama 1 mėn. nuoma</td>
                                    </tr>
                                    <tr className="border-t border-neutral-200">
                                        <td className="p-3">Pranešė &lt;30 dienų prieš</td>
                                        <td className="p-3 text-red-600">🛑 Išskaičiuojamas visas depozitas</td>
                                    </tr>
                                    <tr className="border-t border-neutral-200">
                                        <td className="p-3">Nepranešė</td>
                                        <td className="p-3 text-red-600">🛑 Išskaičiuojamas visas depozitas</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Scenarijus 3 */}
                    <div>
                        <h3 className="font-semibold text-neutral-900 mb-3 flex items-center gap-2">
                            <span className="w-6 h-6 bg-[#2F8481] text-white rounded-full flex items-center justify-center text-sm">3</span>
                            Neterminuota fazė (po sutarties pabaigos)
                        </h3>
                        <div className="bg-neutral-50 rounded-xl overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-neutral-100">
                                    <tr>
                                        <th className="text-left p-3 font-medium">Pranešimas</th>
                                        <th className="text-left p-3 font-medium">Rezultatas</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="border-t border-neutral-200">
                                        <td className="p-3">Pranešė ≥30 dienų prieš</td>
                                        <td className="p-3 text-emerald-600">✅ Grąžinamas visas depozitas</td>
                                    </tr>
                                    <tr className="border-t border-neutral-200">
                                        <td className="p-3">Pranešė &lt;30 dienų prieš</td>
                                        <td className="p-3 text-amber-600">⚠️ Išskaičiuojama 1 mėn. nuoma</td>
                                    </tr>
                                    <tr className="border-t border-neutral-200">
                                        <td className="p-3">Nepranešė</td>
                                        <td className="p-3 text-amber-600">⚠️ Išskaičiuojama 1 mėn. nuoma</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Papildomos taisyklės */}
                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                        <h4 className="font-medium text-amber-800 mb-2">🛑 Depozito paskirtis</h4>
                        <ul className="text-sm text-amber-700 space-y-1">
                            <li>• Depozitas <strong>negali būti naudojamas</strong> sąskaitoms apmokėti</li>
                            <li>• Nuomininkas <strong>pats turi padengti</strong>: komunalines, inventoriaus žalas, valymo išlaidas</li>
                            <li>• Tik kai viskas apmokėta, depozitas grąžinamas</li>
                        </ul>
                    </div>

                    <div className="p-4 bg-[#2F8481]/10 rounded-xl border border-[#2F8481]/20">
                        <h4 className="font-medium text-[#2F8481] mb-2">⏱️ Grąžinimo terminas</h4>
                        <p className="text-sm text-neutral-700">
                            Depozitas turi būti grąžintas per <strong>14 kalendorinių dienų</strong> nuo pilno išsikraustymo ir patikros.
                        </p>
                    </div>

                    <div className="p-4 bg-neutral-100 rounded-xl">
                        <h4 className="font-medium text-neutral-900 mb-2">📅 Vėlavimo mokestis</h4>
                        <p className="text-sm text-neutral-700">
                            Vėluojant išsikraustyti, skaičiuojamas <strong>50€/dieną</strong> mokestis.
                            Jis skaičiuojamas <strong>atskirai</strong>, NE iš depozito.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DepositCard;
