import React, { useState, useCallback, useMemo } from 'react';
import { Calendar, MoreHorizontal, Download, Settings, Send, CheckCircle, Plus } from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface CommandBarProps {
    selectedYear: number;
    selectedMonth: number;
    onPeriodChange: (year: number, month: number) => void;
    missingReadings: number;
    pendingApprovals: number;
    onCollectReadings?: () => void;
    onReviewApprovals?: () => void;
    onAddMeter?: () => void;
    onExport?: () => void;
    onSettings?: () => void;
}

const MONTHS_LT = [
    'Sausis', 'Vasaris', 'Kovas', 'Balandis', 'Gegužė', 'Birželis',
    'Liepa', 'Rugpjūtis', 'Rugsėjis', 'Spalis', 'Lapkritis', 'Gruodis'
];

// =============================================================================
// COMPONENT - PREMIUM HEADER WITH STRONG HIERARCHY
// =============================================================================

export const CommandBar: React.FC<CommandBarProps> = ({
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
    const [showMenu, setShowMenu] = useState(false);

    const primaryCTA = useMemo(() => {
        if (missingReadings > 0) {
            return { label: 'Surinkti rodmenis', count: missingReadings, icon: Send, onClick: onCollectReadings };
        }
        if (pendingApprovals > 0) {
            return { label: 'Peržiūrėti', count: pendingApprovals, icon: CheckCircle, onClick: onReviewApprovals };
        }
        return { label: 'Pridėti skaitiklį', count: 0, icon: Plus, onClick: onAddMeter };
    }, [missingReadings, pendingApprovals, onCollectReadings, onReviewApprovals, onAddMeter]);

    const handleMonthChange = useCallback((month: number) => {
        onPeriodChange(selectedYear, month);
        setShowPeriodPicker(false);
    }, [selectedYear, onPeriodChange]);

    const handleYearChange = useCallback((year: number) => {
        onPeriodChange(year, selectedMonth);
    }, [selectedMonth, onPeriodChange]);

    return (
        <div className="px-6 py-5 bg-white border-b border-gray-200 flex items-center gap-4">
            {/* Title - COMMANDING: text-2xl font-bold */}
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Komunaliniai</h1>

            {/* Period - Small muted control */}
            <div className="relative">
                <button
                    onClick={() => setShowPeriodPicker(!showPeriodPicker)}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-sm text-gray-500 
                               hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{MONTHS_LT[selectedMonth]} {selectedYear}</span>
                </button>

                {showPeriodPicker && (
                    <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-30 min-w-[280px]">
                        <div className="flex items-center justify-between mb-3">
                            <button onClick={() => handleYearChange(selectedYear - 1)} className="p-1 hover:bg-gray-100 rounded text-gray-500">←</button>
                            <span className="font-semibold text-gray-900">{selectedYear}</span>
                            <button onClick={() => handleYearChange(selectedYear + 1)} className="p-1 hover:bg-gray-100 rounded text-gray-500">→</button>
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                            {MONTHS_LT.map((month, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleMonthChange(idx)}
                                    className={`px-2 py-2 text-sm rounded transition-colors ${idx === selectedMonth ? 'bg-gray-900 text-white' : 'hover:bg-gray-100 text-gray-700'
                                        }`}
                                >
                                    {month}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="flex-1" />

            {/* Overflow Menu */}
            <div className="relative">
                <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                >
                    <MoreHorizontal className="w-5 h-5" />
                </button>

                {showMenu && (
                    <div className="absolute top-full right-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-30 min-w-[160px]">
                        <button onClick={() => { onExport?.(); setShowMenu(false); }} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                            <Download className="w-4 h-4" /> Eksportuoti
                        </button>
                        <button onClick={() => { onSettings?.(); setShowMenu(false); }} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                            <Settings className="w-4 h-4" /> Nustatymai
                        </button>
                        <button onClick={() => { onAddMeter?.(); setShowMenu(false); }} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                            <Plus className="w-4 h-4" /> Pridėti skaitiklį
                        </button>
                    </div>
                )}
            </div>

            {/* Primary CTA */}
            <button
                onClick={primaryCTA.onClick}
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white 
                           rounded-lg font-medium text-sm hover:bg-teal-700 transition-colors shadow-sm"
            >
                <primaryCTA.icon className="w-4 h-4" />
                <span>{primaryCTA.label}</span>
                {primaryCTA.count > 0 && (
                    <span className="px-1.5 py-0.5 bg-white/20 rounded text-xs font-semibold">{primaryCTA.count}</span>
                )}
            </button>
        </div>
    );
};

export default CommandBar;
