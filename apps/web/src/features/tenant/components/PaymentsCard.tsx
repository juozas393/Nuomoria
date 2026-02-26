import React from 'react';
import { Invoice, Payment, STATUS_LABELS } from '../types/tenant.types';
import { CreditCard, Download, ChevronRight, Check, Clock, AlertCircle } from 'lucide-react';

interface PaymentsCardProps {
    currentInvoice: Invoice | null;
    recentPayments: Payment[];
    loading?: boolean;
}

const formatDate = (dateStr: string): string => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatShortDate = (dateStr: string): string => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const StatusIcon: React.FC<{ status: 'paid' | 'pending' | 'overdue' }> = ({ status }) => {
    switch (status) {
        case 'paid':
            return <Check className="w-4 h-4 text-emerald-600" />;
        case 'overdue':
            return <AlertCircle className="w-4 h-4 text-red-600" />;
        default:
            return <Clock className="w-4 h-4 text-amber-600" />;
    }
};

export const PaymentsCard: React.FC<PaymentsCardProps> = ({
    currentInvoice,
    recentPayments,
    loading,
}) => {
    if (loading) {
        return (
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm animate-pulse">
                <div className="w-40 h-6 bg-gray-200 rounded mb-6" />
                <div className="space-y-4">
                    <div className="h-24 bg-gray-100 rounded-xl" />
                    <div className="h-16 bg-gray-100 rounded-xl" />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">
                    Mokėjimai ir sąskaitos
                </h2>
                <CreditCard className="w-5 h-5 text-gray-400" />
            </div>

            {/* Current Invoice */}
            {currentInvoice ? (
                <div className={`rounded-xl p-4 mb-4 ${currentInvoice.status === 'overdue'
                    ? 'bg-red-50 border border-red-100'
                    : currentInvoice.status === 'pending'
                        ? 'bg-amber-50 border border-amber-100'
                        : 'bg-emerald-50 border border-emerald-100'
                    }`}>
                    <div className="flex items-start justify-between mb-3">
                        <div>
                            <div className="text-sm text-gray-600 mb-1">Artimiausia sąskaita</div>
                            <div className="text-2xl font-bold text-gray-900">
                                {currentInvoice.amount} €
                            </div>
                        </div>
                        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${currentInvoice.status === 'paid'
                            ? 'bg-emerald-100 text-emerald-700'
                            : currentInvoice.status === 'overdue'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}>
                            {STATUS_LABELS.rent[currentInvoice.status]}
                        </span>
                    </div>
                    <div className="text-sm text-gray-600 mb-4">
                        Terminas: {formatDate(currentInvoice.dueDate)}
                    </div>
                    <div className="flex gap-2">
                        {currentInvoice.status !== 'paid' && (
                            <button className="flex-1 h-10 bg-[#2F8481] hover:bg-[#267673] text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
                                Apmokėti nuomą
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        )}
                        {currentInvoice.pdfUrl && (
                            <button className="h-10 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                                <Download className="w-4 h-4" />
                                PDF
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <div className="rounded-xl bg-gray-50 p-6 text-center mb-4">
                    <div className="text-gray-500 text-sm">
                        Kol kas sąskaitų nėra.
                    </div>
                </div>
            )}

            {/* Recent Payments */}
            {recentPayments.length > 0 && (
                <div>
                    <div className="text-sm font-medium text-gray-700 mb-3">
                        Paskutiniai mokėjimai
                    </div>
                    <div className="space-y-2">
                        {recentPayments.slice(0, 3).map((payment) => (
                            <div
                                key={payment.id}
                                className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                                        <Check className="w-4 h-4 text-emerald-600" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-gray-900">
                                            {payment.amount} €
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {formatShortDate(payment.paidAt)}
                                        </div>
                                    </div>
                                </div>
                                <span className="text-xs text-emerald-600 font-medium">
                                    Apmokėta
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
