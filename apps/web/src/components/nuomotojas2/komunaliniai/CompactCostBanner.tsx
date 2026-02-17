import React from 'react';
import { Info } from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface CompactCostBannerProps {
    missingCount: number;
    onShowMissing: () => void;
}

// =============================================================================
// COMPONENT - PROFESSIONAL INFO CALLOUT
// =============================================================================

export const CompactCostBanner: React.FC<CompactCostBannerProps> = ({
    missingCount,
    onShowMissing,
}) => {
    if (missingCount === 0) return null;

    return (
        <div className="mx-4 my-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-sm text-amber-800">
                <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>Išlaidos bus paskaičiuotos pateikus trūkstamus rodmenis</span>
            </div>
            <button
                onClick={onShowMissing}
                className="text-sm font-medium text-amber-700 hover:text-amber-900 hover:underline transition-colors whitespace-nowrap"
            >
                Peržiūrėti ({missingCount})
            </button>
        </div>
    );
};

export default CompactCostBanner;
