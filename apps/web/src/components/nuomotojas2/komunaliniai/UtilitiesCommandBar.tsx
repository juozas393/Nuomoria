import React, { useState, useCallback, useMemo } from 'react';
import { Calendar, Download, Settings, Plus, Send, CheckCircle } from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface UtilitiesCommandBarProps {
    // Period state
    selectedYear: number;
    selectedMonth: number;
    onPeriodChange: (year: number, month: number) => void;

    // Attention counts for CTA logic
    missingReadings: number;
    pendingApprovals: number;

    // Actions
    onCollectReadings?: () => void;
    onReviewApprovals?: () => void;
    onAddMeter?: () => void;
    onExport?: () => void;
    onSettings?: () => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const MONTHS_LT = [
    'Sausis', 'Vasaris', 'Kovas', 'Balandis', 'Gegužė', 'Birželis',
    'Liepa', 'Rugpjūtis', 'Rugsėjis', 'Spalis', 'Lapkritis', 'Gruodis'
];

// =============================================================================
// COMPONENT
// =============================================================================

export const UtilitiesCommandBar: React.FC<UtilitiesCommandBarProps> = ({
    selectedYear,
    selectedMonth,
    onPeriodChange,
    missingReadings,
    pendingApprovals,
    onCollectReadings,
    onReviewApprovals,
    onAddMeter,
    onExport,
    onSettings,
}) => {
    const [showPeriodPicker, setShowPeriodPicker] = useState(false);

    // Determine primary CTA based on state
    const primaryCTA = useMemo(() => {
        if (missingReadings > 0) {
            return {
                label: `Surinkti rodmenis (${missingReadings})`,
                icon: Send,
                onClick: onCollectReadings,
                variant: 'primary' as const,
            };
        }
        if (pendingApprovals > 0) {
            return {
                label: `Peržiūrėti patvirtinimus (${pendingApprovals})`,
                icon: CheckCircle,
                onClick: onReviewApprovals,
                variant: 'warning' as const,
            };
        }
        return {
            label: 'Pridėti skaitliuką',
            icon: Plus,
            onClick: onAddMeter,
            variant: 'secondary' as const,
        };
    }, [missingReadings, pendingApprovals, onCollectReadings, onReviewApprovals, onAddMeter]);

    const handleMonthChange = useCallback((month: number) => {
        onPeriodChange(selectedYear, month);
        setShowPeriodPicker(false);
    }, [selectedYear, onPeriodChange]);

    const handleYearChange = useCallback((year: number) => {
        onPeriodChange(year, selectedMonth);
    }, [selectedMonth, onPeriodChange]);

    return (
        <div className="sticky top-0 z-20 bg-white border-b border-gray-200">
            <div className="px-4 py-3 flex items-center gap-3">
                {/* Page Title */}
                <h1 className="text-lg font-semibold text-gray-900">Komunaliniai</h1>

                {/* Period Selector */}
                <div className="relative">
                    <button
                        onClick={() => setShowPeriodPicker(!showPeriodPicker)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">
                            {selectedYear} {MONTHS_LT[selectedMonth]}
                        </span>
                    </button>

                    {showPeriodPicker && (
                        <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 p-3 z-30 min-w-[280px]">
                            {/* Year selector */}
                            <div className="flex items-center justify-between mb-3">
                                <button
                                    onClick={() => handleYearChange(selectedYear - 1)}
                                    className="p-1 hover:bg-gray-100 rounded"
                                >
                                    ←
                                </button>
                                <span className="font-medium">{selectedYear}</span>
                                <button
                                    onClick={() => handleYearChange(selectedYear + 1)}
                                    className="p-1 hover:bg-gray-100 rounded"
                                >
                                    →
                                </button>
                            </div>

                            {/* Month grid */}
                            <div className="grid grid-cols-3 gap-1">
                                {MONTHS_LT.map((month, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleMonthChange(idx)}
                                        className={`px-2 py-1.5 text-xs rounded transition-colors ${idx === selectedMonth
                                            ? 'bg-teal-600 text-white'
                                            : 'hover:bg-gray-100 text-gray-700'
                                            }`}
                                    >
                                        {month}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Secondary Actions */}
                <button
                    onClick={onExport}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Eksportuoti"
                >
                    <Download className="w-4 h-4" />
                </button>
                <button
                    onClick={onSettings}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Nustatymai"
                >
                    <Settings className="w-4 h-4" />
                </button>

                {/* Primary CTA */}
                <button
                    onClick={primaryCTA.onClick}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${primaryCTA.variant === 'primary'
                        ? 'bg-teal-600 text-white hover:bg-teal-700'
                        : primaryCTA.variant === 'warning'
                            ? 'bg-amber-500 text-white hover:bg-amber-600'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                >
                    <primaryCTA.icon className="w-4 h-4" />
                    {primaryCTA.label}
                </button>
            </div>
        </div>
    );
};

export default UtilitiesCommandBar;
