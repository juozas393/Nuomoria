// =============================================================================
// CARD IDS
// =============================================================================

export const CARD_IDS = {
    HERO: 'hero',
    TENANT: 'tenant',
    PHOTOS: 'photos',
    SUMMARY: 'summary',
    KPI: 'kpi',
    CHECKLIST: 'checklist',
    ACTIVITY: 'activity',
} as const;

export type CardId = typeof CARD_IDS[keyof typeof CARD_IDS];

// =============================================================================
// LAYOUT ITEM TYPE (compatible with react-grid-layout)
// =============================================================================

export interface LayoutItem {
    i: string;
    x: number;
    y: number;
    w: number;
    h: number;
    minW?: number;
    minH?: number;
    maxW?: number;
    maxH?: number;
    static?: boolean;
}

// =============================================================================
// DENSITY TYPES
// =============================================================================

export type DensityLevel = 'comfortable' | 'compact' | 'ultra';

// =============================================================================
// CARD CONSTRAINTS (RELAXED - allows smaller sizes)
// =============================================================================

export const CARD_CONSTRAINTS: Record<CardId, {
    minW: number;
    minH: number;
    maxW?: number;
    maxH?: number;
}> = {
    // ULTRA-FLEXIBLE: minW: 2, minH: 1 allows any size
    [CARD_IDS.HERO]: { minW: 2, minH: 1 },
    [CARD_IDS.TENANT]: { minW: 2, minH: 1 },
    [CARD_IDS.PHOTOS]: { minW: 2, minH: 1 },
    [CARD_IDS.SUMMARY]: { minW: 2, minH: 1 },
    [CARD_IDS.KPI]: { minW: 2, minH: 1 },
    [CARD_IDS.CHECKLIST]: { minW: 2, minH: 1 },
    [CARD_IDS.ACTIVITY]: { minW: 2, minH: 1 },
};

// =============================================================================
// DENSITY-AWARE GRID CONFIG
// =============================================================================

export const DENSITY_GRID_CONFIG: Record<DensityLevel, {
    rowHeight: number;
    margin: [number, number];
    containerPadding: [number, number];
}> = {
    comfortable: {
        rowHeight: 80,
        margin: [12, 12],
        containerPadding: [0, 0],
    },
    compact: {
        rowHeight: 70,
        margin: [8, 8],
        containerPadding: [0, 0],
    },
    ultra: {
        rowHeight: 60,
        margin: [6, 6],
        containerPadding: [0, 0],
    },
};

// =============================================================================
// LEGACY GRID CONFIG (uses comfortable as default)
// =============================================================================

export const GRID_CONFIG = {
    cols: { lg: 12, md: 8, sm: 4, xs: 4, xxs: 4 },
    breakpoints: { lg: 900, md: 600, sm: 480, xs: 320, xxs: 0 },
    ...DENSITY_GRID_CONFIG.comfortable,
};

// =============================================================================
// DEFAULT LAYOUTS PER BREAKPOINT (ARCHITECT-DESIGNED OPTIMAL)
// 8/4 column split - Hero/Photos left, Tenant/Summary right
// rowHeight: 80px, margin: 12px
// =============================================================================

export const DEFAULT_LAYOUTS: { lg: LayoutItem[]; md: LayoutItem[]; sm: LayoutItem[] } = {
    lg: [
        // Row 0: Hero (8 cols) + Tenant (4 cols)
        { i: CARD_IDS.HERO, x: 0, y: 0, w: 8, h: 2, ...CARD_CONSTRAINTS[CARD_IDS.HERO] },
        { i: CARD_IDS.TENANT, x: 8, y: 0, w: 4, h: 2, ...CARD_CONSTRAINTS[CARD_IDS.TENANT] },
        // Row 2: Photos (8 cols) + Summary (4 cols)
        { i: CARD_IDS.PHOTOS, x: 0, y: 2, w: 8, h: 2, ...CARD_CONSTRAINTS[CARD_IDS.PHOTOS] },
        { i: CARD_IDS.SUMMARY, x: 8, y: 2, w: 4, h: 2, ...CARD_CONSTRAINTS[CARD_IDS.SUMMARY] },
        // Row 4: KPI (8 cols) + Activity (4 cols)
        { i: CARD_IDS.KPI, x: 0, y: 4, w: 8, h: 1, ...CARD_CONSTRAINTS[CARD_IDS.KPI] },
        { i: CARD_IDS.ACTIVITY, x: 8, y: 4, w: 4, h: 1, ...CARD_CONSTRAINTS[CARD_IDS.ACTIVITY] },
        // Row 5: Checklist full width (compact)
        { i: CARD_IDS.CHECKLIST, x: 0, y: 5, w: 12, h: 1, ...CARD_CONSTRAINTS[CARD_IDS.CHECKLIST] },
    ],

    md: [
        // Tablet: Single column stacked
        { i: CARD_IDS.HERO, x: 0, y: 0, w: 8, h: 2, ...CARD_CONSTRAINTS[CARD_IDS.HERO] },
        { i: CARD_IDS.TENANT, x: 0, y: 2, w: 8, h: 2, ...CARD_CONSTRAINTS[CARD_IDS.TENANT] },
        { i: CARD_IDS.PHOTOS, x: 0, y: 4, w: 8, h: 3, ...CARD_CONSTRAINTS[CARD_IDS.PHOTOS] },
        { i: CARD_IDS.SUMMARY, x: 0, y: 7, w: 8, h: 3, ...CARD_CONSTRAINTS[CARD_IDS.SUMMARY] },
        { i: CARD_IDS.KPI, x: 0, y: 10, w: 8, h: 2, ...CARD_CONSTRAINTS[CARD_IDS.KPI] },
        { i: CARD_IDS.CHECKLIST, x: 0, y: 12, w: 8, h: 1, ...CARD_CONSTRAINTS[CARD_IDS.CHECKLIST] },
        { i: CARD_IDS.ACTIVITY, x: 0, y: 13, w: 8, h: 2, ...CARD_CONSTRAINTS[CARD_IDS.ACTIVITY] },
    ],

    sm: [
        // Mobile: Optimized stacking order
        { i: CARD_IDS.HERO, x: 0, y: 0, w: 4, h: 2, ...CARD_CONSTRAINTS[CARD_IDS.HERO] },
        { i: CARD_IDS.TENANT, x: 0, y: 2, w: 4, h: 2, ...CARD_CONSTRAINTS[CARD_IDS.TENANT] },
        { i: CARD_IDS.PHOTOS, x: 0, y: 4, w: 4, h: 3, ...CARD_CONSTRAINTS[CARD_IDS.PHOTOS] },
        { i: CARD_IDS.CHECKLIST, x: 0, y: 7, w: 4, h: 1, ...CARD_CONSTRAINTS[CARD_IDS.CHECKLIST] },
        { i: CARD_IDS.SUMMARY, x: 0, y: 8, w: 4, h: 3, ...CARD_CONSTRAINTS[CARD_IDS.SUMMARY] },
        { i: CARD_IDS.KPI, x: 0, y: 11, w: 4, h: 2, ...CARD_CONSTRAINTS[CARD_IDS.KPI] },
        { i: CARD_IDS.ACTIVITY, x: 0, y: 13, w: 4, h: 2, ...CARD_CONSTRAINTS[CARD_IDS.ACTIVITY] },
    ],
};

// =============================================================================
// CARD SIZE THRESHOLDS (for adaptive content)
// =============================================================================

export const CARD_SIZE_THRESHOLDS = {
    // Width thresholds (grid units)
    smallWidth: 5,   // Below this = show minimal content
    mediumWidth: 8,  // Below this = condensed content

    // Height thresholds (grid units)
    smallHeight: 2,  // Below this = single line
    mediumHeight: 3, // Below this = condensed
};

// =============================================================================
// LAYOUT VERSION (for migrations)
// =============================================================================

export const LAYOUT_VERSION = 6; // Bumped: Reduced checklist height to eliminate excess scroll
