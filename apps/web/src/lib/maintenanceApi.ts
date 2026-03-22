import { supabase } from './supabase';

// Types
export interface MaintenanceRequest {
    id: string;
    property_id: string;
    address_id?: string;
    requester_id: string;
    requester_role: 'tenant' | 'landlord';
    title: string;
    description?: string;
    category: 'plumbing' | 'electrical' | 'heating' | 'cleaning' | 'repair' | 'inspection' | 'general';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    status: 'open' | 'in_progress' | 'resolved' | 'cancelled';
    resolved_at?: string;
    resolved_by?: string;
    created_at: string;
    updated_at: string;
}

export const maintenanceApi = {
    // Create maintenance request
    async create(request: {
        property_id: string;
        address_id?: string;
        title: string;
        description?: string;
        category?: string;
        priority?: string;
        requester_role: 'tenant' | 'landlord';
    }): Promise<MaintenanceRequest> {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id;
        if (!userId) throw new Error('Turite būti prisijungęs');

        const { data, error } = await supabase
            .from('maintenance_requests')
            .insert({
                ...request,
                requester_id: userId,
                category: request.category || 'general',
                priority: request.priority || 'medium',
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Get requests for a property
    async getByPropertyId(propertyId: string): Promise<MaintenanceRequest[]> {
        const { data, error } = await supabase
            .from('maintenance_requests')
            .select('*')
            .eq('property_id', propertyId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    // Get requests for an address (all properties)
    async getByAddressId(addressId: string): Promise<MaintenanceRequest[]> {
        const { data, error } = await supabase
            .from('maintenance_requests')
            .select('*')
            .eq('address_id', addressId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    // Get all requests for current user's properties (landlord view)
    async getForLandlord(): Promise<MaintenanceRequest[]> {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id;
        if (!userId) return [];

        // Get properties owned by this user
        const { data: properties } = await supabase
            .from('properties')
            .select('id')
            .eq('owner_id', userId);

        if (!properties || properties.length === 0) return [];

        const propertyIds = properties.map(p => p.id);
        const { data, error } = await supabase
            .from('maintenance_requests')
            .select('*')
            .in('property_id', propertyIds)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    // Get requests created by current user (tenant view)
    async getMyRequests(): Promise<MaintenanceRequest[]> {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id;
        if (!userId) return [];

        const { data, error } = await supabase
            .from('maintenance_requests')
            .select('*')
            .eq('requester_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    // Count open/in-progress for a set of property IDs (tenant KPI)
    async countByPropertyIds(propertyIds: string[]): Promise<{ open: number; inProgress: number }> {
        if (propertyIds.length === 0) return { open: 0, inProgress: 0 };

        const { data, error } = await supabase
            .from('maintenance_requests')
            .select('status')
            .in('property_id', propertyIds)
            .in('status', ['open', 'in_progress']);

        if (error) return { open: 0, inProgress: 0 };

        const open = (data || []).filter(r => r.status === 'open').length;
        const inProgress = (data || []).filter(r => r.status === 'in_progress').length;
        return { open, inProgress };
    },

    // Update status
    async updateStatus(id: string, status: 'open' | 'in_progress' | 'resolved' | 'cancelled'): Promise<MaintenanceRequest> {
        const updates: Record<string, any> = { status };

        if (status === 'resolved') {
            const { data: userData } = await supabase.auth.getUser();
            updates.resolved_at = new Date().toISOString();
            updates.resolved_by = userData?.user?.id;
        }

        const { data, error } = await supabase
            .from('maintenance_requests')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Delete request
    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('maintenance_requests')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },
};
