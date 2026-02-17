import React from 'react';
import { X, Calendar, User, Camera, Check, XCircle, Clock, TrendingUp, TrendingDown, Minus } from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

export interface MeterHistoryEntry {
    id: string;
    period: string; // YYYY-MM format
    value: number;
    previousValue: number;
    consumption: number;
    submittedBy: string;
    submittedAt: string;
    approvedBy?: string;
    approvedAt?: string;
    status: 'approved' | 'rejected' | 'pending';
    rejectReason?: string;
    photoUrl?: string;
    cost?: number;
}

interface MeterHistoryDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    meterName: string;
    meterUnit: string;
    history: MeterHistoryEntry[];
}

// =============================================================================
// COMPONENT
// =============================================================================

export const MeterHistoryDrawer: React.FC<MeterHistoryDrawerProps> = ({
    isOpen,
    onClose,
    meterName,
    meterUnit,
    history,
}) => {
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('lt-LT', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatPeriod = (period: string) => {
        const [year, month] = period.split('-');
        const months = [
            'Sausis', 'Vasaris', 'Kovas', 'Balandis', 'Gegužė', 'Birželis',
            'Liepa', 'Rugpjūtis', 'Rugsėjis', 'Spalis', 'Lapkritis', 'Gruodis'
        ];
        return `${year} ${months[parseInt(month) - 1]}`;
    };

    const getStatusBadge = (status: 'approved' | 'rejected' | 'pending') => {
        switch (status) {
            case 'approved':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                        <Check className="w-3 h-3" />
                        Patvirtinta
                    </span>
                );
            case 'rejected':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                        <XCircle className="w-3 h-3" />
                        Atmesta
                    </span>
                );
            case 'pending':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
                        <Clock className="w-3 h-3" />
                        Laukia
                    </span>
                );
        }
    };

    // Calculate trend vs previous entry
    const getConsumptionTrend = (current: MeterHistoryEntry, index: number) => {
        if (index >= history.length - 1) return null;
        const previous = history[index + 1];
        if (!previous) return null;

        const diff = current.consumption - previous.consumption;
        const percentChange = previous.consumption > 0
            ? (diff / previous.consumption) * 100
            : 0;

        if (Math.abs(percentChange) < 1) return null;

        return {
            direction: diff > 0 ? 'up' : 'down',
            percent: Math.abs(percentChange).toFixed(0),
        };
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Side Drawer */}
            <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white shadow-xl flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">{meterName}</h2>
                        <p className="text-sm text-gray-500">Rodmenų istorija</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {history.length === 0 ? (
                        <div className="flex items-center justify-center h-64 text-gray-500">
                            <div className="text-center">
                                <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                <p className="font-medium">Nėra istorijos</p>
                                <p className="text-sm">Rodmenys dar nebuvo pateikti</p>
                            </div>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {history.map((entry, index) => {
                                const trend = getConsumptionTrend(entry, index);
                                return (
                                    <div key={entry.id} className="p-4 hover:bg-gray-50">
                                        {/* Period header */}
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="font-medium text-gray-900">
                                                {formatPeriod(entry.period)}
                                            </h3>
                                            {getStatusBadge(entry.status)}
                                        </div>

                                        {/* Reading values */}
                                        <div className="grid grid-cols-3 gap-4 mb-3">
                                            <div>
                                                <p className="text-xs text-gray-500 mb-1">Rodmuo</p>
                                                <p className="text-lg font-semibold text-gray-900">
                                                    {entry.value.toLocaleString('lt-LT')}
                                                    <span className="text-xs text-gray-400 ml-1">{meterUnit}</span>
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 mb-1">Suvartojimas</p>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-lg font-semibold text-teal-600">
                                                        {entry.consumption.toLocaleString('lt-LT')}
                                                        <span className="text-xs text-gray-400 ml-1">{meterUnit}</span>
                                                    </p>
                                                    {trend && (
                                                        <span className={`flex items-center text-xs ${trend.direction === 'up' ? 'text-red-500' : 'text-green-500'
                                                            }`}>
                                                            {trend.direction === 'up' ? (
                                                                <TrendingUp className="w-3 h-3 mr-0.5" />
                                                            ) : (
                                                                <TrendingDown className="w-3 h-3 mr-0.5" />
                                                            )}
                                                            {trend.percent}%
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {entry.cost !== undefined && (
                                                <div>
                                                    <p className="text-xs text-gray-500 mb-1">Kaina</p>
                                                    <p className="text-lg font-semibold text-gray-900">
                                                        {entry.cost.toFixed(2)} €
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Submission info */}
                                        <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                                            <span className="flex items-center gap-1">
                                                <User className="w-3 h-3" />
                                                Pateikė: {entry.submittedBy}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {formatDate(entry.submittedAt)}
                                            </span>
                                        </div>

                                        {/* Approval info */}
                                        {entry.status === 'approved' && entry.approvedBy && (
                                            <div className="text-xs text-gray-500 mb-2">
                                                <span className="flex items-center gap-1">
                                                    <Check className="w-3 h-3 text-green-500" />
                                                    Patvirtino: {entry.approvedBy} ({formatDate(entry.approvedAt!)})
                                                </span>
                                            </div>
                                        )}

                                        {/* Reject reason */}
                                        {entry.status === 'rejected' && entry.rejectReason && (
                                            <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-700">
                                                <strong>Priežastis:</strong> {entry.rejectReason}
                                            </div>
                                        )}

                                        {/* Photo thumbnail */}
                                        {entry.photoUrl && (
                                            <div className="mt-3">
                                                <img
                                                    src={entry.photoUrl}
                                                    alt="Skaitiklio nuotrauka"
                                                    className="w-24 h-24 object-cover rounded border cursor-pointer hover:opacity-80"
                                                />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Backdrop */}
            <div
                className="fixed inset-0 z-40 bg-black/30"
                onClick={onClose}
            />
        </>
    );
};

export default MeterHistoryDrawer;
