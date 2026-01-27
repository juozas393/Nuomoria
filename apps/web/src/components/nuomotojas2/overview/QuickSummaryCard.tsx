import React, { memo } from 'react';
import { ChevronRight } from 'lucide-react';
import { QuickSummaryCardProps } from './types';

// Standardized animation timings
const ANIMATION = {
    hover: 'duration-150 ease-out',
} as const;

export const QuickSummaryCard = memo<QuickSummaryCardProps>(({
    icon: Icon,
    title,
    value,
    onClick,
}) => {
    const Component = onClick ? 'button' : 'div';

    return (
        <Component
            onClick={onClick}
            className={`w-full flex items-center justify-between gap-3 p-3 bg-white/80 rounded-xl text-left transition-all ${ANIMATION.hover} ${onClick ? 'hover:bg-white cursor-pointer active:scale-[0.99]' : ''
                }`}
        >
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm">
                    <Icon className="w-4 h-4 text-gray-500" />
                </div>
                <div>
                    <p className="text-[13px] font-medium text-gray-700">{title}</p>
                    <p className="text-[12px] text-gray-500">{value}</p>
                </div>
            </div>
            {onClick && (
                <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${ANIMATION.hover}`} />
            )}
        </Component>
    );
});

QuickSummaryCard.displayName = 'QuickSummaryCard';

export default QuickSummaryCard;
