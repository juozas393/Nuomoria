import React, { memo } from 'react';
import { Droplets, ChevronRight, AlertCircle, Clock } from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface MetersSectionProps {
    count: number;
    lastReadingDate?: string;
    pendingCount?: number;
    onManage?: () => void;
}

// =============================================================================
// HELPERS
// =============================================================================

const formatRelativeDate = (dateStr?: string): string => {
    if (!dateStr) return '';

    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'šiandien';
    if (diffDays === 1) return 'vakar';
    if (diffDays < 7) return `prieš ${diffDays} d.`;
    if (diffDays < 30) return `prieš ${Math.floor(diffDays / 7)} sav.`;
    return date.toLocaleDateString('lt-LT', { month: 'short', day: 'numeric' });
};

// =============================================================================
// COMPONENT
// =============================================================================

export const MetersSection = memo<MetersSectionProps>(({
    count,
    lastReadingDate,
    pendingCount = 0,
    onManage,
}) => {
    const isEmpty = count === 0;
    const hasAlert = pendingCount > 0;

    return (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${hasAlert ? 'bg-amber-100' : 'bg-blue-100'
                        }`}>
                        <Droplets className={`w-4 h-4 ${hasAlert ? 'text-amber-600' : 'text-blue-600'}`} />
                    </div>
                    <span className="text-sm font-bold text-gray-900">Skaitikliai</span>
                </div>
                <button
                    onClick={onManage}
                    className="text-xs font-bold text-teal-600 hover:text-teal-700 transition-colors flex items-center gap-0.5"
                >
                    Valdyti
                    <ChevronRight className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Content */}
            <div className="p-4">
                {isEmpty ? (
                    /* Empty state */
                    <div className="flex items-center justify-between gap-4">
                        <span className="text-xs text-gray-500">Nepriskirti skaitikliai</span>
                        <button
                            onClick={onManage}
                            className="text-xs font-bold text-teal-600 hover:text-teal-700 transition-colors"
                        >
                            Konfigūruoti →
                        </button>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {/* Count + last reading */}
                        <div className="flex items-center justify-between">
                            <span className="text-lg font-bold text-gray-900">{count}</span>
                            {lastReadingDate && (
                                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                                    <Clock className="w-3 h-3" />
                                    Pask. skaitymas: {formatRelativeDate(lastReadingDate)}
                                </span>
                            )}
                        </div>

                        {/* Pending alert */}
                        {hasAlert && (
                            <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-100 rounded-lg">
                                <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                                <span className="text-xs text-amber-700">
                                    {pendingCount} laukia rodmenų
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
});

MetersSection.displayName = 'MetersSection';

export default MetersSection;
