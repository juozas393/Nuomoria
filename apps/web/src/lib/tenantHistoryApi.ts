/**
 * Tenant History Utilities
 * Auto-create history records when tenants are removed/changed
 * Auto-cleanup old records based on retention settings
 */
import { supabase } from './supabase';

/**
 * Create a tenant history record when a tenant is removed from a property.
 * Should be called BEFORE the tenant data is cleared from the property.
 */
export async function createTenantHistoryRecord(
    propertyId: string,
    tenantData: {
        name: string;
        email?: string | null;
        phone?: string | null;
        rent?: number | null;
        contractStart?: string | null;
        contractEnd?: string | null;
        endReason?: string;
        notes?: string;
    }
): Promise<boolean> {
    try {
        // Don't create history for empty/vacant entries
        if (!tenantData.name || tenantData.name === 'Laisvas') {
            return false;
        }

        const { error } = await supabase
            .from('tenant_history')
            .insert({
                property_id: propertyId,
                tenant_name: tenantData.name,
                tenant_email: tenantData.email || null,
                tenant_phone: tenantData.phone || null,
                rent: tenantData.rent ? Number(tenantData.rent) : null,
                contract_start: tenantData.contractStart || null,
                contract_end: tenantData.contractEnd || null,
                end_reason: tenantData.endReason || 'expired',
                notes: tenantData.notes || null,
            });

        if (error) {
            console.error('Failed to create tenant history:', error.message);
            return false;
        }

        return true;
    } catch (err) {
        console.error('Error creating tenant history record:', err);
        return false;
    }
}

/**
 * Clean up old tenant history records based on retention months.
 * Call this on dashboard load or periodically.
 *
 * @param addressId - The address to clean up history for
 * @param retentionMonths - Number of months to keep (0 = never delete)
 * @returns Number of deleted records
 */
export async function cleanupTenantHistory(
    addressId: string,
    retentionMonths: number
): Promise<number> {
    if (retentionMonths === 0) return 0; // Never delete

    try {
        const cutoffDate = new Date();
        cutoffDate.setMonth(cutoffDate.getMonth() - retentionMonths);
        const cutoffStr = cutoffDate.toISOString().split('T')[0];

        // Get property IDs for this address
        const { data: properties } = await supabase
            .from('properties')
            .select('id')
            .eq('address_id', addressId);

        if (!properties || properties.length === 0) return 0;

        const propertyIds = properties.map(p => p.id);

        // Delete old records
        const { data: deleted, error } = await supabase
            .from('tenant_history')
            .delete()
            .in('property_id', propertyIds)
            .lt('created_at', cutoffStr)
            .select('id');

        if (error) {
            console.error('Failed to cleanup tenant history:', error.message);
            return 0;
        }

        return deleted?.length || 0;
    } catch (err) {
        console.error('Error cleaning up tenant history:', err);
        return 0;
    }
}

/**
 * Run cleanup for all addresses owned by the current user.
 * Call this on dashboard load.
 */
export async function runTenantHistoryCleanup(): Promise<void> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get all user addresses
        const { data: addresses } = await supabase
            .from('addresses')
            .select('id')
            .eq('owner_id', user.id);

        if (!addresses || addresses.length === 0) return;

        // Get address settings for retention config
        const { data: settingsRows } = await supabase
            .from('address_settings')
            .select('address_id, communal_config')
            .in('address_id', addresses.map(a => a.id));

        if (!settingsRows) return;

        let totalDeleted = 0;

        for (const row of settingsRows) {
            const config = row.communal_config as Record<string, unknown> | null;
            const retentionMonths = (config?.historyRetentionMonths as number) || 18;

            if (retentionMonths > 0) {
                const deleted = await cleanupTenantHistory(row.address_id, retentionMonths);
                totalDeleted += deleted;
            }
        }

        if (totalDeleted > 0) {
            console.log(`Cleaned up ${totalDeleted} old tenant history records`);
        }
    } catch (err) {
        // Cleanup is non-critical, silently fail
        console.error('Error in tenant history cleanup:', err);
    }
}
