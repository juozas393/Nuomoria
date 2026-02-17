import React from 'react';
import { TrendingUp, TrendingDown, Minus, Zap, Droplets, Flame, AlertCircle } from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface CostsSummaryProps {
    totalCost: number | null;
    previousCost: number | null;
    breakdown: {
        category: 'elektra' | 'vanduo' | 'sildymas' | 'dujos';
        cost: number;
        consumption: number;
        unit: string;
    }[];
    hasMissingData: boolean;
    missingCount: number;
    onMissingClick?: () => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const CATEGORY_CONFIG = {
    elektra: { label: 'Elektra', icon: Zap, color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
    vanduo: { label: 'Vanduo', icon: Droplets, color: 'text-blue-600', bgColor: 'bg-blue-50' },
    sildymas: { label: 'Šildymas', icon: Flame, color: 'text-orange-600', bgColor: 'bg-orange-50' },
    dujos: { label: 'Dujos', icon: Flame, color: 'text-purple-600', bgColor: 'bg-purple-50' },
};

// =============================================================================
// COMPONENT
// =============================================================================

export const CostsSummary: React.FC<CostsSummaryProps> = ({
    totalCost,
    previousCost,
    breakdown,
    hasMissingData,
    missingCount,
    onMissingClick,
}) => {
    // Calculate percentage change
    const percentChange = React.useMemo(() => {
        if (totalCost === null || previousCost === null || previousCost === 0) return null;
        return ((totalCost - previousCost) / previousCost) * 100;
    }, [totalCost, previousCost]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('lt-LT', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 2,
        }).format(value);
    };

    // If missing data, show placeholder
    if (hasMissingData || totalCost === null) {
        return (
            <div className="px-4 py-4 bg-amber-50 border-b border-amber-200">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                        <AlertCircle className="w-5 h-5 text-amber-600" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-medium text-amber-800">
                            Išlaidos bus apskaičiuotos pateikus rodmenis
                        </p>
                        <p className="text-xs text-amber-600">
                            Trūksta {missingCount} skaitiklių rodmenų
                        </p>
                    </div>
                    <button
                        onClick={onMissingClick}
                        className="px-3 py-1.5 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors"
                    >
                        Peržiūrėti
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="px-4 py-4 bg-white border-b border-gray-200">
            <div className="flex items-start gap-6">
                {/* Total Cost */}
                <div className="flex-shrink-0">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Bendros išlaidos</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-gray-900">{formatCurrency(totalCost)}</span>
                        {percentChange !== null && (
                            <span className={`flex items-center gap-0.5 text-sm font-medium ${percentChange > 0 ? 'text-red-600' : percentChange < 0 ? 'text-green-600' : 'text-gray-500'
                                }`}>
                                {percentChange > 0 ? (
                                    <TrendingUp className="w-4 h-4" />
                                ) : percentChange < 0 ? (
                                    <TrendingDown className="w-4 h-4" />
                                ) : (
                                    <Minus className="w-4 h-4" />
                                )}
                                {Math.abs(percentChange).toFixed(1)}%
                            </span>
                        )}
                    </div>
                </div>

                {/* Breakdown */}
                <div className="flex-1 flex items-center gap-4 overflow-x-auto">
                    {breakdown.map(({ category, cost, consumption, unit }) => {
                        const config = CATEGORY_CONFIG[category];
                        const Icon = config.icon;
                        return (
                            <div
                                key={category}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg ${config.bgColor}`}
                            >
                                <Icon className={`w-4 h-4 ${config.color}`} />
                                <div>
                                    <p className="text-xs text-gray-500">{config.label}</p>
                                    <p className="text-sm font-medium text-gray-900">{formatCurrency(cost)}</p>
                                    <p className="text-xs text-gray-500">{consumption} {unit}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default CostsSummary;
