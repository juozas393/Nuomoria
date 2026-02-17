import React from 'react';

// =============================================================================
// TYPES
// =============================================================================

interface InfoStripProps {
    missingCount: number;
    onShowMissing: () => void;
}

// =============================================================================
// COMPONENT - QUIET INFO LINE (NO BACKGROUND)
// =============================================================================

export const InfoStrip: React.FC<InfoStripProps> = ({
    missingCount,
    onShowMissing,
}) => {
    if (missingCount === 0) return null;

    return (
        <div className="px-6 py-2 flex items-center justify-between text-sm">
            <span className="text-gray-500">
                Trūksta {missingCount} rodmenų šiam periodui.
            </span>
            <button
                onClick={onShowMissing}
                className="text-gray-700 font-medium hover:text-gray-900 hover:underline transition-colors"
            >
                Peržiūrėti
            </button>
        </div>
    );
};

export default InfoStrip;
