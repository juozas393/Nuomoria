import { supabase } from './supabase';

// ============================================================================
// TYPES
// ============================================================================
export interface Amenity {
    id: string;
    key: string;
    name: string;
    category: string;
    is_custom: boolean;
    created_by: string | null;
    created_at: string;
}

export interface PropertyAmenity {
    property_id: string;
    amenity_id: string;
    created_at: string;
}

// Category display names
export const CATEGORY_LABELS: Record<string, string> = {
    kitchen: 'Virtuvė',
    appliances: 'Buitinė technika',
    building: 'Pastatas',
    comfort: 'Komfortas',
    outdoor: 'Lauko erdvės',
    custom: 'Kita',
};

// ============================================================================
// FETCH ALL AMENITIES
// ============================================================================
export async function getAllAmenities(): Promise<Amenity[]> {
    const { data, error } = await supabase
        .from('amenities')
        .select('*')
        .order('category')
        .order('name');

    if (error) {
        console.error('[amenitiesApi] Error fetching amenities:', error);
        throw error;
    }

    return data || [];
}

// ============================================================================
// SEARCH AMENITIES (local filtering preferred, but this supports server-side)
// ============================================================================
export async function searchAmenities(query: string): Promise<Amenity[]> {
    const trimmed = query.trim();
    if (!trimmed) {
        return getAllAmenities();
    }

    const { data, error } = await supabase
        .from('amenities')
        .select('*')
        .ilike('name', `%${trimmed}%`)
        .order('category')
        .order('name');

    if (error) {
        console.error('[amenitiesApi] Error searching amenities:', error);
        throw error;
    }

    return data || [];
}

// ============================================================================
// CREATE CUSTOM AMENITY
// ============================================================================
export async function createAmenity(
    name: string,
    category: string = 'custom'
): Promise<Amenity> {
    // Generate a key from the name
    const key = name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '')
        .substring(0, 50);

    const { data: user } = await supabase.auth.getUser();

    const { data, error } = await supabase
        .from('amenities')
        .insert({
            key: `custom_${key}_${Date.now()}`,
            name: name.trim(),
            category,
            is_custom: true,
            created_by: user?.user?.id || null,
        })
        .select()
        .single();

    if (error) {
        console.error('[amenitiesApi] Error creating amenity:', error);
        throw error;
    }

    return data;
}

// ============================================================================
// CHECK IF AMENITY EXISTS (case-insensitive, normalized)
// ============================================================================
export async function findExistingAmenity(name: string): Promise<Amenity | null> {
    const normalized = name.trim().toLowerCase();

    const { data, error } = await supabase
        .from('amenities')
        .select('*')
        .ilike('name', normalized)
        .maybeSingle();

    if (error) {
        console.error('[amenitiesApi] Error checking existing amenity:', error);
        throw error;
    }

    return data;
}

// ============================================================================
// GET PROPERTY AMENITIES
// ============================================================================
export async function getPropertyAmenities(propertyId: string): Promise<string[]> {
    const { data, error } = await supabase
        .from('property_amenities')
        .select('amenity_id')
        .eq('property_id', propertyId);

    if (error) {
        console.error('[amenitiesApi] Error fetching property amenities:', error);
        throw error;
    }

    return (data || []).map(row => row.amenity_id);
}

// ============================================================================
// SET PROPERTY AMENITIES (sync - delete old, insert new)
// ============================================================================
export async function setPropertyAmenities(
    propertyId: string,
    amenityIds: string[]
): Promise<void> {
    // Delete existing
    const { error: deleteError } = await supabase
        .from('property_amenities')
        .delete()
        .eq('property_id', propertyId);

    if (deleteError) {
        console.error('[amenitiesApi] Error deleting old amenities:', deleteError);
        throw deleteError;
    }

    // Insert new (if any)
    if (amenityIds.length > 0) {
        const rows = amenityIds.map(amenityId => ({
            property_id: propertyId,
            amenity_id: amenityId,
        }));

        const { error: insertError } = await supabase
            .from('property_amenities')
            .insert(rows);

        if (insertError) {
            console.error('[amenitiesApi] Error inserting amenities:', insertError);
            throw insertError;
        }
    }
}

// ============================================================================
// TOGGLE SINGLE PROPERTY AMENITY (for optimistic updates)
// ============================================================================
export async function addPropertyAmenity(
    propertyId: string,
    amenityId: string
): Promise<void> {
    const { error } = await supabase
        .from('property_amenities')
        .insert({ property_id: propertyId, amenity_id: amenityId });

    if (error && error.code !== '23505') { // Ignore duplicate key
        console.error('[amenitiesApi] Error adding amenity:', error);
        throw error;
    }
}

export async function removePropertyAmenity(
    propertyId: string,
    amenityId: string
): Promise<void> {
    const { error } = await supabase
        .from('property_amenities')
        .delete()
        .eq('property_id', propertyId)
        .eq('amenity_id', amenityId);

    if (error) {
        console.error('[amenitiesApi] Error removing amenity:', error);
        throw error;
    }
}
