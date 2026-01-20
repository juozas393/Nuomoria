import { useState, useEffect, useCallback } from 'react';
import { tenantInvitationApi, TenantInvitation } from '../../../lib/database';

/**
 * Hook to fetch and manage pending invitations for the current tenant user
 */
export function usePendingInvitations() {
    const [invitations, setInvitations] = useState<TenantInvitation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchInvitations = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const data = await tenantInvitationApi.getMyPendingInvitations();
            setInvitations(data);
        } catch (err: any) {
            setError(err.message || 'Nepavyko gauti kvietimų');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchInvitations();
    }, [fetchInvitations]);

    const acceptInvitation = useCallback(async (invitationId: string) => {
        try {
            await tenantInvitationApi.accept(invitationId);
            // Remove from local state
            setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message || 'Nepavyko priimti kvietimo' };
        }
    }, []);

    const declineInvitation = useCallback(async (invitationId: string) => {
        try {
            await tenantInvitationApi.decline(invitationId);
            // Remove from local state
            setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message || 'Nepavyko atmesti kvietimo' };
        }
    }, []);

    return {
        invitations,
        loading,
        error,
        refreshInvitations: fetchInvitations,
        acceptInvitation,
        declineInvitation,
        hasInvitations: invitations.length > 0
    };
}
