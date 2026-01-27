import React, { memo } from 'react';
import { KPIStatCardProps } from './types';

// Standardized animation timings
const ANIMATION = {
    hover: 'duration-150 ease-out',
    press: 'duration-100 ease-out',
} as const;

const cardStyle = {
    backgroundImage: `url('/images/FormsBackground.png')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
};

export const KPIStatCard = memo<KPIStatCardProps>(({
    icon: Icon,
    value,
    label,
    accent = false,
    onClick,
    isEmpty = false,
    emptyLabel,
    emptyCta,
    onEmptyAction,
    helperText,
}) => {
    const Component = onClick || onEmptyAction ? 'button' : 'div';
    const handleClick = isEmpty && onEmptyAction ? onEmptyAction : onClick;

    // Empty state
    if (isEmpty) {
        return (
            <Component
                onClick={handleClick}
                style={cardStyle}
                className={`rounded-2xl border border-gray-100 p-4 text-left transition-all ${ANIMATION.hover} ${handleClick ? 'cursor-pointer hover:border-gray-200 hover:shadow-sm active:scale-[0.98]' : ''
                    }`}
            >
                <div className="flex items-start justify-between mb-2">
                    <div className="w-9 h-9 rounded-xl bg-white/80 backdrop-blur-sm flex items-center justify-center">
                        <Icon className="w-4 h-4 text-gray-400" />
                    </div>
                </div>
                <div className="text-[13px] text-gray-400 font-medium mb-1">
                    {emptyLabel || 'Nenustatyta'}
                </div>
                <div className="text-[12px] text-gray-500 mb-2">
                    {label}
                </div>
                {emptyCta && (
                    <span className={`text-[11px] font-semibold text-teal-600 hover:text-teal-700 transition-colors ${ANIMATION.hover}`}>
                        {emptyCta} →
                    </span>
                )}
            </Component>
        );
    }

    // Filled state
    return (
        <Component
            onClick={handleClick}
            style={cardStyle}
            className={`rounded-2xl border border-gray-100 p-4 text-left transition-all ${ANIMATION.hover} ${handleClick ? 'cursor-pointer hover:border-gray-200 hover:shadow-sm active:scale-[0.98]' : ''
                }`}
        >
            <div className="flex items-start justify-between mb-2">
                <div className="w-9 h-9 rounded-xl bg-white/80 backdrop-blur-sm flex items-center justify-center">
                    <Icon className="w-4 h-4 text-gray-500" />
                </div>
            </div>
            <div className={`text-2xl font-bold tracking-tight ${accent ? 'text-teal-600' : 'text-gray-900'}`}>
                {value}
            </div>
            <div className="text-[12px] text-gray-500 mt-0.5 font-medium">
                {label}
            </div>
            {helperText && (
                <div className="text-[11px] text-gray-400 mt-1">
                    {helperText}
                </div>
            )}
        </Component>
    );
});

KPIStatCard.displayName = 'KPIStatCard';

export default KPIStatCard;
