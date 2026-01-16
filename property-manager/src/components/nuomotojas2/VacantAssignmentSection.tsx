import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle, Loader2, Mail, Send, RefreshCcw } from 'lucide-react';
import type { PropertyInfo } from './TenantDetailModalPro';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { createNotification } from '../../lib/notifications';
import {
  createTenantInvitation,
  listInvitationsByProperty,
  cancelInvitation,
  type TenantInvitation
} from '../../lib/tenantInvitations';

interface VacantAssignmentSectionProps {
  property: PropertyInfo;
  onRefresh?: () => void | Promise<void>;
  canInvite?: boolean;
}

const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const addMonths = (date: Date, months: number): Date => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
};

export const VacantAssignmentSection: React.FC<VacantAssignmentSectionProps> = ({
  property,
  onRefresh,
  canInvite = true
}) => {
  const { user, sendMagicLink } = useAuth();
  const [email, setEmail] = useState('');
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [invitations, setInvitations] = useState<TenantInvitation[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState(false);

  const defaultContractStart = useMemo(() => {
    return property.contract_start ?? formatDate(new Date());
  }, [property.contract_start]);

  const defaultContractEnd = useMemo(() => {
    if (property.contract_end) {
      return property.contract_end;
    }
    const startDate = property.contract_start ? new Date(property.contract_start) : new Date();
    return formatDate(addMonths(startDate, 12));
  }, [property.contract_end, property.contract_start]);

  useEffect(() => {
    setEmail('');
    setInviteMessage(null);
    setInviteError(null);
    void refreshInvitations();
  }, [property]);

  const handleSendInvitation = async () => {
    setInviteError(null);
    setInviteMessage(null);

    if (!user?.id) {
      setInviteError('Naudotojo sesija negalioja. Prisijunkite iš naujo.');
      return;
    }

    if (!canInvite) {
      setInviteError('Būstas šiuo metu užimtas. Pakvietimus siųsti galima tik laisviems objektams.');
      return;
    }

    if (!email.trim()) {
      setInviteError('Įveskite nuomininko el. paštą.');
      return;
    }

    setIsSendingInvite(true);
    try {
      const propertyLabel = property.address ?? property.property_label ?? `Būstas #${property.id}`;
      const invitation = await createTenantInvitation({
        propertyId: property.id,
        email: email.trim(),
        fullName: undefined,
        phone: undefined,
        contractStart: defaultContractStart,
        contractEnd: defaultContractEnd,
        rent: property.rent ?? undefined,
        deposit: property.deposit_amount ?? undefined,
        invitedBy: user.id,
        invitedByEmail: user.email ?? null,
        propertyLabel
      });

      setInvitations((prev) => [invitation, ...prev]);

      try {
        const { data: tenantUser, error: tenantLookupError } = await supabase
          .from('users')
          .select('id')
          .eq('email', email.trim())
          .maybeSingle();

        if (!tenantLookupError && tenantUser?.id) {
          await createNotification({
            userId: tenantUser.id,
            kind: 'tenant.invitation',
            title: 'Kvietimas į būstą',
            body: propertyLabel,
            data: {
              invitationId: invitation.id,
              propertyId: property.id,
              invitedBy: user.id,
              invitedByEmail: user.email ?? null
            }
          });
        }
      } catch (notificationError) {
        console.error('⚠️ Failed to notify tenant about invitation:', notificationError);
      }

      const { success: magicSuccess, message } = await sendMagicLink(email.trim());
      setInviteMessage(magicSuccess ? message : `Pakvietimas sukurtas. ${message}`);
      setEmail('');
      if (onRefresh) {
        await onRefresh();
      }
    } catch (inviteErr) {
      console.error('❌ Failed to send tenant invitation:', inviteErr);
      setInviteError('Nepavyko išsiųsti pakvietimo. Bandykite dar kartą.');
    } finally {
      setIsSendingInvite(false);
    }
  };

  async function refreshInvitations() {
    try {
      setLoadingInvitations(true);
      const data = await listInvitationsByProperty(property.id);
      setInvitations(data);
    } catch (loadError) {
      console.error('❌ Failed to load tenant invitations:', loadError);
      setInviteError('Nepavyko įkelti pakvietimų sąrašo.');
    } finally {
      setLoadingInvitations(false);
    }
  }

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      await cancelInvitation(invitationId);
      setInvitations(prev => prev.filter(invitation => invitation.id !== invitationId));
      setInviteMessage('Pakvietimas atšauktas.');
      setInviteError(null);
      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      console.error('❌ Failed to cancel invitation:', error);
      setInviteError('Nepavyko atšaukti pakvietimo. Bandykite dar kartą.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
        <div className="space-y-4 text-sm text-black/70">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-black/10 bg-black/2 p-4">
              <p className="text-xs uppercase tracking-wide text-black/50 mb-1">Sutarties laikotarpis</p>
              <p>{defaultContractStart} → {defaultContractEnd}</p>
            </div>
            <div className="rounded-xl border border-black/10 bg-black/2 p-4">
              <p className="text-xs uppercase tracking-wide text-black/50 mb-1">Finansiniai duomenys</p>
              <p>Mėnesinis mokestis: {property.rent?.toLocaleString('lt-LT', { style: 'currency', currency: 'EUR' }) ?? '—'}</p>
              <p>Depozitas: {property.deposit_amount?.toLocaleString('lt-LT', { style: 'currency', currency: 'EUR' }) ?? '—'}</p>
            </div>
          </div>
          <p className="text-xs text-black/60">
            Šie duomenys bus įtraukti į kvietimą. Juos galėsite pakoreguoti vėliau nuomos sutartyje.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-black flex items-center gap-2">
              <Mail className="h-5 w-5 text-[#2F8481]" />
              Siųsti pakvietimą
            </h3>
            <p className="mt-1 text-sm text-black/60">
              {canInvite
                ? 'Užpildykite nuomininko informaciją ir spauskite „Siųsti pakvietimą“. Kvietimas išliks laukiamas, kol nuomininkas prisijungs ir priims arba atmes.'
                : 'Šis būstas nebe laisvas, todėl siųsti naujų pakvietimų negalima. Žemiau matysite ankstesnių pakvietimų istoriją.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              void refreshInvitations();
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-black/10 px-3 py-2 text-sm text-black/70 hover:bg-black/5 transition-colors"
            disabled={loadingInvitations}
            title="Atnaujinti pakvietimų sąrašą"
          >
            <RefreshCcw className={`h-4 w-4 ${loadingInvitations ? 'animate-spin' : ''}`} />
            Atnaujinti
          </button>
        </div>

        <div className="mt-5 space-y-4">
          {inviteError && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4" />
              <span>{inviteError}</span>
            </div>
          )}

          {inviteMessage && (
            <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              <CheckCircle className="h-4 w-4" />
              <span>{inviteMessage}</span>
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-black/70">
                Nuomininko el. paštas
              </label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="nuomininkas@pastas.lt"
                disabled={!canInvite}
                className="w-full rounded-xl border border-black/15 px-4 py-3 text-sm transition-colors focus:border-[#2F8481] focus:outline-none focus:ring-2 focus:ring-[#2F8481]/30 disabled:cursor-not-allowed disabled:bg-black/5"
              />
            </div>
            <button
              type="button"
              onClick={handleSendInvitation}
              disabled={!canInvite || isSendingInvite}
              className="inline-flex items-center gap-2 rounded-xl bg-black/90 px-5 py-3 text-sm font-semibold text-white shadow transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSendingInvite ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Siunčiama...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Siųsti pakvietimą
                </>
              )}
            </button>
          </div>

          <div className="rounded-xl border border-black/10">
            <div className="flex items-center justify-between border-b border-black/10 px-4 py-3">
              <h4 className="text-sm font-semibold text-black">Pakvietimų istorija</h4>
              {loadingInvitations && (
                <div className="inline-flex items-center gap-2 text-xs text-black/60">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Kraunama...
                </div>
              )}
            </div>
            <div className="divide-y divide-black/10">
              {invitations.length === 0 ? (
                <div className="px-4 py-6 text-sm text-black/60">
                  Šiam būstui dar nėra išsiųstų pakvietimų.
                </div>
              ) : (
                invitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="px-4 py-4 text-sm text-black/70 flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <div className="font-medium text-black">
                        {invitation.property_label ?? 'Nežinomas adresas'}
                      </div>
                      <div className="text-xs text-black/50">
                        Pakvietimas išsiųstas {new Date(invitation.created_at).toLocaleString('lt-LT')}
                      </div>
                      <div className="text-xs text-black/50">
                        Nuomininko el. paštas: {invitation.email}
                      </div>
                      {invitation.invited_by_email && (
                        <div className="text-xs text-black/50">
                          Kvietimą siuntė: {invitation.invited_by_email}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                          invitation.status === 'pending'
                            ? 'bg-amber-100 text-amber-700'
                            : invitation.status === 'accepted'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {invitation.status === 'pending' && 'Laukiama'}
                        {invitation.status === 'accepted' && 'Priimta'}
                        {invitation.status === 'declined' && 'Atmesta'}
                      </span>
                      {invitation.full_name && (
                        <span className="text-xs text-black/50">Nuomininkas: {invitation.full_name}</span>
                      )}
                      {invitation.responded_at && (
                        <span className="text-xs text-black/50">
                          Atsakyta {new Date(invitation.responded_at).toLocaleString('lt-LT')}
                        </span>
                      )}
                    </div>
                    {invitation.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => {
                          void handleCancelInvitation(invitation.id);
                        }}
                        className="inline-flex items-center gap-2 rounded-lg border border-black/10 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                      >
                        Atšaukti
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};























