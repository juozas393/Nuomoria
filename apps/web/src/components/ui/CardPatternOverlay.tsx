import React from 'react';

/**
 * CardPatternOverlay - Subtle geometric pattern overlay for cards
 * 
 * Usage: Place inside a card with position relative, overflow hidden.
 * The pattern uses the brand primary color at very low opacity.
 */
export const CardPatternOverlay: React.FC = () => (
    <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
    >
        <defs>
            <pattern
                id="card-hex-pattern"
                width="28"
                height="49"
                patternUnits="userSpaceOnUse"
                patternTransform="scale(1.4)"
            >
                <g fill="none" stroke="currentColor" strokeWidth="0.5">
                    {/* Hexagon row 1 */}
                    <path d="M14,0 L28,8 L28,24 L14,32 L0,24 L0,8 Z" />
                    {/* Hexagon row 2 (offset) */}
                    <path d="M14,33 L28,41 L28,49 M14,33 L0,41 L0,49" />
                </g>
            </pattern>
        </defs>
        <rect
            width="100%"
            height="100%"
            fill="url(#card-hex-pattern)"
            className="text-primary"
            style={{ opacity: 0.04 }}
        />
    </svg>
);

/**
 * Card wrapper component that includes the pattern overlay
 * Uses project design system: rounded-xl, border, shadow-sm
 */
interface CardWithPatternProps {
    children: React.ReactNode;
    className?: string;
    noPadding?: boolean;
}

export const CardWithPattern: React.FC<CardWithPatternProps> = ({
    children,
    className = '',
    noPadding = false,
}) => (
    <div
        className={`relative bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden ${className}`}
    >
        <CardPatternOverlay />
        <div className={`relative ${noPadding ? '' : 'p-4'}`}>{children}</div>
    </div>
);

export default CardPatternOverlay;
