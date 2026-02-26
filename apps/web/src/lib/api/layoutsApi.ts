import { supabase } from '../supabase';
import { LAYOUT_VERSION, LayoutItem } from '../../components/nuomotojas2/layout/layoutConstants';

// =============================================================================
// TYPES
// =============================================================================

type Breakpoint = 'lg' | 'md' | 'sm';

interface DashboardLayoutRow {
    id: string;
    user_id: string;
    property_id: string;
    view: string;
    breakpoint: string;
    layout: LayoutItem[];
    layout_version: number;
}

interface SavedLayouts {
    lg: LayoutItem[];
    md: LayoutItem[];
    sm: LayoutItem[];
}

// =============================================================================
// API FUNCTIONS
// =============================================================================

/**
 * Get saved layouts for the overview (global per user, same layout for all properties)
 */
export const getLayouts = async (_propertyId?: string): Promise<SavedLayouts | null> => {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user?.id) return null;

    const { data, error } = await supabase
        .from('dashboard_layouts')
        .select('breakpoint, layout, layout_version')
        .eq('user_id', user.user.id)
        .eq('property_id', 'global')
        .eq('view', 'overview');

    if (error || !data || data.length === 0) {
        return null;
    }

    // Check version compatibility
    const layouts: Partial<SavedLayouts> = {};
    for (const row of data) {
        if (row.layout_version === LAYOUT_VERSION) {
            const bp = row.breakpoint as Breakpoint;
            if (bp === 'lg' || bp === 'md' || bp === 'sm') {
                layouts[bp] = row.layout as LayoutItem[];
            }
        }
    }

    // Only return if all breakpoints are present
    if (layouts.lg && layouts.md && layouts.sm) {
        return layouts as SavedLayouts;
    }

    return null;
};

/**
 * Save layouts (global per user, applies to all properties)
 */
export const saveLayouts = async (
    _propertyId: string,
    layouts: SavedLayouts
): Promise<void> => {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user?.id) throw new Error('User not authenticated');

    const breakpoints: Breakpoint[] = ['lg', 'md', 'sm'];

    for (const bp of breakpoints) {
        const { error } = await supabase
            .from('dashboard_layouts')
            .upsert({
                user_id: user.user.id,
                property_id: 'global',
                view: 'overview',
                breakpoint: bp,
                layout: layouts[bp],
                layout_version: LAYOUT_VERSION,
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'user_id,property_id,view,breakpoint',
            });

        if (error) {
            console.error(`Failed to save ${bp} layout:`, error);
            throw error;
        }
    }
};

/**
 * Reset layouts (delete custom global layouts)
 */
export const resetLayouts = async (_propertyId?: string): Promise<void> => {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user?.id) throw new Error('User not authenticated');

    const { error } = await supabase
        .from('dashboard_layouts')
        .delete()
        .eq('user_id', user.user.id)
        .eq('property_id', 'global')
        .eq('view', 'overview');

    if (error) {
        console.error('Failed to reset layouts:', error);
        throw error;
    }
};

export default {
    getLayouts,
    saveLayouts,
    resetLayouts,
};
