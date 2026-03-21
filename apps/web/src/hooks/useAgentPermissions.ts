import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export interface AgentPermissions {
  can_view_overview: boolean;
  can_view_property: boolean;
  can_view_meters: boolean;
  can_view_history: boolean;
  can_view_financials: boolean;
  can_manage_tenants: boolean; // Create contracts / invites
  can_terminate_contracts: boolean; // Terminate / remove tenants
  can_upload_photos: boolean;
  can_edit_property: boolean;
  can_view_invoices: boolean;
  can_view_maintenance: boolean;
}

export const DEFAULT_PERMISSIONS: AgentPermissions = {
  can_view_overview: true,
  can_view_property: true,
  can_view_meters: false,
  can_view_history: false,
  can_view_financials: false,
  can_manage_tenants: true,
  can_terminate_contracts: false,
  can_upload_photos: true,
  can_edit_property: true,
  can_view_invoices: false,
  can_view_maintenance: true,
};

// Full permissions for non-agent roles
const FULL_PERMISSIONS: AgentPermissions = {
  can_view_overview: true,
  can_view_property: true,
  can_view_meters: true,
  can_view_history: true,
  can_view_financials: true,
  can_manage_tenants: true,
  can_terminate_contracts: true,
  can_upload_photos: true,
  can_edit_property: true,
  can_view_invoices: true,
  can_view_maintenance: true,
};

/**
 * Hook to get agent permissions.
 * Returns full permissions for non-agent roles (landlord, admin).
 * For agents, fetches merged permissions from all active assignments.
 */
export function useAgentPermissions() {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<AgentPermissions>(
    user?.role === 'property_manager' ? DEFAULT_PERMISSIONS : FULL_PERMISSIONS
  );
  const [loading, setLoading] = useState(user?.role === 'property_manager');

  const isAgent = user?.role === 'property_manager';

  useEffect(() => {
    if (!isAgent || !user?.id) {
      setPermissions(FULL_PERMISSIONS);
      setLoading(false);
      return;
    }

    const fetchPermissions = async () => {
      try {
        const { data, error } = await supabase
          .from('agent_assignments')
          .select('permissions')
          .eq('agent_id', user.id)
          .eq('status', 'active');

        if (error || !data || data.length === 0) {
          setPermissions(DEFAULT_PERMISSIONS);
          setLoading(false);
          return;
        }

        // Merge permissions across all assignments (OR logic — if ANY assignment grants access, it's granted)
        const merged = { ...DEFAULT_PERMISSIONS };
        for (const row of data) {
          const p = row.permissions as Partial<AgentPermissions> | null;
          if (!p) continue;
          for (const key of Object.keys(merged) as (keyof AgentPermissions)[]) {
            if (p[key] === true) {
              merged[key] = true;
            }
          }
        }

        setPermissions(merged);
      } catch {
        setPermissions(DEFAULT_PERMISSIONS);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [user?.id, isAgent]);

  return useMemo(() => ({
    permissions,
    isAgent,
    loading,
  }), [permissions, isAgent, loading]);
}
