import React, { memo } from 'react';
import { Euro, Calendar, AlertCircle } from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface FinancialSnapshotProps {
    rent: number | null;
    deposit: number | null;
    paymentDay: number | null;
    overdue: number;
    isVacant: boolean;
    nextDueDate?: string;
    onSetPrice?: () => void;
    onSetDeposit?: () => void;
    onEditFinancials?: () => void;
}

// =============================================================================
// HELPERS
// =============================================================================

const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('lt-LT', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
};

// =============================================================================
// COMPONENT
// =============================================================================

export const FinancialSnapshot = memo<FinancialSnapshotProps>(({
    rent,
    deposit,
    paymentDay,
    overdue,
    isVacant,
    nextDueDate,
    onSetPrice,
    onSetDeposit,
    onEditFinancials,
}) => {
    return (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                        <Euro className="w-4 h-4 text-emerald-600" />
                    </div>
                    <span className="text-sm font-bold text-gray-900">Finansai</span>
                </div>
                {onEditFinancials && (
                    <button
                        onClick={onEditFinancials}
                        className="text-xs font-bold text-teal-600 hover:text-teal-700 transition-colors"
                    >
                        Redaguoti →
                    </button>
                )}
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
                {/* Rent row */}
                <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Nuoma/mėn</span>
                    {rent ? (
                        <span className="text-base font-bold text-gray-900">
                            {formatCurrency(rent)}
                        </span>
                    ) : (
                        <button
                            onClick={onSetPrice}
                            className="text-sm font-bold text-teal-600 hover:text-teal-700 transition-colors"
                        >
                            Nustatyti →
                        </button>
                    )}
                </div>

                {/* Deposit row */}
                <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Užstatas</span>
                    {deposit ? (
                        <span className="text-base font-bold text-gray-900">
                            {formatCurrency(deposit)}
                        </span>
                    ) : (
                        <button
                            onClick={onSetDeposit}
                            className="text-sm font-bold text-teal-600 hover:text-teal-700 transition-colors"
                        >
                            Pridėti →
                        </button>
                    )}
                </div>

                {/* Divider */}
                <div className="border-t border-gray-100 pt-3">
                    <div className="grid grid-cols-2 gap-4">
                        {/* Payment day */}
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">Mokėjimo d.</span>
                            <span className="text-xs font-semibold text-gray-700">
                                {!isVacant && paymentDay ? `${paymentDay} d.` : 'Netaikoma'}
                            </span>
                        </div>

                        {/* Overdue / Balance */}
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">Skola</span>
                            <span className={`text-xs font-semibold ${overdue > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                {overdue > 0 ? formatCurrency(overdue) : 'Nėra'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Overdue warning */}
                {overdue > 0 && (
                    <div className="flex items-center gap-2 p-2.5 bg-red-50 border border-red-100 rounded-lg mt-2">
                        <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                        <span className="text-xs text-red-700">
                            Pradelsta {formatCurrency(overdue)} — susisiekite su nuomininku
                        </span>
                    </div>
                )}

                {/* Next due date (if occupied) */}
                {!isVacant && nextDueDate && (
                    <div className="flex items-center gap-2 p-2.5 bg-blue-50 border border-blue-100 rounded-lg">
                        <Calendar className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        <span className="text-xs text-blue-700">
                            Kitas mokėjimas: {nextDueDate}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
});

FinancialSnapshot.displayName = 'FinancialSnapshot';

export default FinancialSnapshot;
