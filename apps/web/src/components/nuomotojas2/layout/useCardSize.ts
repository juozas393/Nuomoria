import { useMemo } from 'react';
import { CARD_SIZE_THRESHOLDS } from './layoutConstants';
import { useLayoutEditor } from './LayoutEditorProvider';

// =============================================================================
// TYPES
// =============================================================================

export interface CardSizeInfo {
    // Raw grid units
    w: number;
    h: number;

    // Size categories
    isSmallWidth: boolean;
    isMediumWidth: boolean;
    isSmallHeight: boolean;
    isMediumHeight: boolean;

    // Combined
    isCompact: boolean;  // Small in both dimensions
    isMinimal: boolean;  // Very restricted space

    // Pixel estimates (based on rowHeight)
    estimatedWidth: number;
    estimatedHeight: number;
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Get size information for a card in the layout grid.
 * Use this to adapt card content based on available space.
 * 
 * @param cardId - The card's layout ID (e.g., 'hero', 'kpi')
 * @param rowHeight - Optional rowHeight override
 */
export const useCardSize = (cardId: string, rowHeight?: number): CardSizeInfo => {
    const { layouts, currentBreakpoint } = useLayoutEditor();

    const effectiveRowHeight = rowHeight || 32; // Default to comfortable

    return useMemo(() => {
        const layout = layouts[currentBreakpoint];
        const item = layout?.find(l => l.i === cardId);

        if (!item) {
            // Default fallback
            return {
                w: 8,
                h: 2,
                isSmallWidth: false,
                isMediumWidth: false,
                isSmallHeight: false,
                isMediumHeight: false,
                isCompact: false,
                isMinimal: false,
                estimatedWidth: 800,
                estimatedHeight: 64,
            };
        }

        const w = item.w;
        const h = item.h;

        const isSmallWidth = w < CARD_SIZE_THRESHOLDS.smallWidth;
        const isMediumWidth = w < CARD_SIZE_THRESHOLDS.mediumWidth;
        const isSmallHeight = h < CARD_SIZE_THRESHOLDS.smallHeight;
        const isMediumHeight = h < CARD_SIZE_THRESHOLDS.mediumHeight;

        // Estimate pixels (rough approximation)
        // Assuming 12-col grid on ~1200px container = ~100px per col
        const colWidth = 100;
        const estimatedWidth = w * colWidth;
        const estimatedHeight = h * effectiveRowHeight;

        return {
            w,
            h,
            isSmallWidth,
            isMediumWidth,
            isSmallHeight,
            isMediumHeight,
            isCompact: isSmallWidth && isSmallHeight,
            isMinimal: w <= 4 && h <= 1,
            estimatedWidth,
            estimatedHeight,
        };
    }, [layouts, currentBreakpoint, cardId, effectiveRowHeight]);
};

// =============================================================================
// STANDALONE SIZE CALCULATOR (for components outside grid)
// =============================================================================

export const calculateCardSizeInfo = (w: number, h: number, rowHeight = 32): CardSizeInfo => {
    const isSmallWidth = w < CARD_SIZE_THRESHOLDS.smallWidth;
    const isMediumWidth = w < CARD_SIZE_THRESHOLDS.mediumWidth;
    const isSmallHeight = h < CARD_SIZE_THRESHOLDS.smallHeight;
    const isMediumHeight = h < CARD_SIZE_THRESHOLDS.mediumHeight;

    const colWidth = 100;

    return {
        w,
        h,
        isSmallWidth,
        isMediumWidth,
        isSmallHeight,
        isMediumHeight,
        isCompact: isSmallWidth && isSmallHeight,
        isMinimal: w <= 4 && h <= 1,
        estimatedWidth: w * colWidth,
        estimatedHeight: h * rowHeight,
    };
};
