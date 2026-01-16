import React from 'react';
import type { TenantInvitationWithProperty } from '../../../lib/tenantInvitations';

export interface InvitationsPanelProps {
  invitations: TenantInvitationWithProperty[];
  loading: boolean;
  error: string | null;
  message: string | null;
  respondingId: string | null;
  onRefresh: () => void;
  onRespond: (invitationId: string, decision: 'accepted' | 'declined') => void | Promise<void>;
}

const InvitationCard: React.FC<{
  invitation: TenantInvitationWithProperty;
  isProcessing: boolean;
  onRespond: (decision: 'accepted' | 'declined') => void;
}> = ({ invitation, isProcessing, onRespond }) => {
  const propertyLabel = invitation.property?.address ?? 'Nežinomas adresas';

  return (
    <li className="rounded-2xl border border-black/10 bg-white px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-black">{propertyLabel}</p>
          <p className="text-xs text-black/60">
            Kvietė: {invitation.invited_by_email ?? invitation.invited_by ?? '—'}
          </p>
        </div>
        <div className="flex gap-2 text-xs">
          <button
            type="button"
            onClick={() => onRespond('accepted')}
            disabled={isProcessing}
            className="rounded-lg bg-[#2F8481] px-3 py-1 font-medium text-white transition hover:opacity-90 disabled:opacity-60"
          >
            Priimti
          </button>
          <button
            type="button"
            onClick={() => onRespond('declined')}
            disabled={isProcessing}
            className="rounded-lg border border-black/10 px-3 py-1 font-medium text-black transition hover:bg-black/5 disabled:opacity-60"
          >
            Atmesti
          </button>
        </div>
      </div>
    </li>
  );
};

export const InvitationsPanel: React.FC<InvitationsPanelProps> = ({
  invitations,
  loading,
  error,
  message,
  respondingId,
  onRefresh,
  onRespond
}) => {
  return (
    <section className="rounded-2xl border border-black/10 bg-white px-6 py-5 shadow-sm">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-black">Pakvietimai</h2>
          <p className="text-sm text-black/60">Tvarkykite aktyvius prisijungimo pakvietimus.</p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="rounded-lg border border-black/10 px-3 py-1 text-xs font-medium text-black transition hover:bg-black/5"
        >
          Atnaujinti
        </button>
      </header>

      {loading && <p className="mt-4 text-sm text-black/60">Kraunama...</p>}
      {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}
      {message && <p className="mt-2 text-sm text-[#2F8481]">{message}</p>}

      {!loading && invitations.length === 0 && (
        <p className="mt-4 text-sm text-black/60">Šiuo metu kvietimų nėra.</p>
      )}

      {invitations.length > 0 && (
        <ul className="mt-4 space-y-3">
          {invitations.map((invitation) => (
            <InvitationCard
              key={invitation.id}
              invitation={invitation}
              isProcessing={respondingId === invitation.id}
              onRespond={(decision) => onRespond(invitation.id, decision)}
            />
          ))}
        </ul>
      )}
    </section>
  );
};

export default InvitationsPanel;
