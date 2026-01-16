import { supabase, type Database } from './supabase';

export type TenantInvitation = Database['public']['Tables']['tenant_invitations']['Row'];
export type TenantInvitationStatus = TenantInvitation['status'];

export type TenantInvitationWithProperty = TenantInvitation & {
  property?: {
    id: string;
    address: string;
    apartment_number: string;
    rent: number;
    deposit_amount: number;
    status: 'occupied' | 'vacant' | 'maintenance';
  } | null;
};

export async function createTenantInvitation(payload: {
  propertyId: string;
  email: string;
  fullName?: string;
  phone?: string;
  contractStart?: string;
  contractEnd?: string;
  rent?: number;
  deposit?: number;
  invitedBy?: string;
  invitedByEmail?: string | null;
  propertyLabel?: string | null;
}): Promise<TenantInvitation> {
  const { data, error } = await supabase
    .from('tenant_invitations')
    .insert({
      property_id: payload.propertyId,
      email: payload.email,
      full_name: payload.fullName ?? null,
      phone: payload.phone ?? null,
      contract_start: payload.contractStart ?? null,
      contract_end: payload.contractEnd ?? null,
      rent: payload.rent ?? null,
      deposit: payload.deposit ?? null,
      invited_by: payload.invitedBy ?? null,
      invited_by_email: payload.invitedByEmail ?? null,
      property_label: payload.propertyLabel ?? null
    })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function listInvitationsByProperty(propertyId: string): Promise<TenantInvitation[]> {
  const { data, error } = await supabase
    .from('tenant_invitations')
    .select('*')
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function listInvitationsForEmail(email: string): Promise<TenantInvitationWithProperty[]> {
  const { data, error } = await supabase
    .from('tenant_invitations')
    .select(`
      *,
      property:properties (
        id,
        address,
        apartment_number,
        rent,
        deposit_amount,
        status
      )
    `)
    .ilike('email', email)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data as TenantInvitationWithProperty[]) ?? [];
}

export async function respondToInvitation(invitationId: string, status: TenantInvitationStatus): Promise<TenantInvitation> {
  const allowedStatuses: TenantInvitationStatus[] = ['accepted', 'declined'];
  if (!allowedStatuses.includes(status)) {
    throw new Error('Netinkama pakvietimo būsena');
  }

  const { data, error } = await supabase
    .from('tenant_invitations')
    .update({
      status,
      responded_at: new Date().toISOString()
    })
    .eq('id', invitationId)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function cancelInvitation(invitationId: string): Promise<void> {
  const { error } = await supabase
    .from('tenant_invitations')
    .delete()
    .eq('id', invitationId);

  if (error) {
    throw error;
  }
}

export async function declineOtherInvitations(propertyId: string, excludeInvitationId: string): Promise<void> {
  const { error } = await supabase
    .from('tenant_invitations')
    .update({
      status: 'declined',
      responded_at: new Date().toISOString()
    })
    .eq('property_id', propertyId)
    .eq('status', 'pending')
    .neq('id', excludeInvitationId);

  if (error) {
    throw error;
  }
}





