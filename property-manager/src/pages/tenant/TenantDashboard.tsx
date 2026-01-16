import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRightOnRectangleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';
import {
  listInvitationsForEmail,
  respondToInvitation,
  declineOtherInvitations,
  type TenantInvitationWithProperty
} from '../../lib/tenantInvitations';
import { createNotification, fetchNotificationsForUser } from '../../lib/notifications';
import { propertyApi } from '../../lib/database';
import { supabase } from '../../lib/supabase';
import {
  OverviewMetrics,
  TenantPropertyCard,
  ContractSummaryCard,
  InvitationsPanel,
  SmartActionsPanel,
  NotificationsPanel,
  type OverviewMetric,
  type TenantPropertySummary,
  type ContractSummary,
  type SmartActionItem,
  type DashboardNotification
} from '../../components/tenant/dashboard';
import OptimizedImage from '../../components/ui/OptimizedImage';
import addressImage from '../../assets/address.jpg';
import { fetchRentLedger, type RentLedgerEntry } from '../../lib/propertyFinancials';

interface DashboardState {
  property: TenantPropertySummary | null;
  contract: ContractSummary | null;
  invitations: TenantInvitationWithProperty[];
  notifications: DashboardNotification[];
}


const calculateNextPaymentDate = (contractStart?: string | null): string | null => {
  if (!contractStart) return null;
  const start = new Date(contractStart);
  if (Number.isNaN(start.getTime())) return null;
  const today = new Date();
  const due = new Date(today.getFullYear(), today.getMonth(), start.getDate());
  if (due < today) {
    due.setMonth(due.getMonth() + 1);
  }
  return due.toISOString();
};

const calculateDaysBetween = (targetIso: string | null): number | null => {
  if (!targetIso) return null;
  const target = new Date(targetIso);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  const diff = target.getTime() - today.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

const mapNotificationTone = (kind?: string | null): DashboardNotification['tone'] => {
  switch (kind) {
    case 'tenant.invitation':
    case 'tenant.invitation.response':
      return 'info';
    case 'payment.overdue':
      return 'warning';
    case 'payment.received':
      return 'success';
    case 'maintenance.issue':
      return 'warning';
    default:
      return 'info';
  }
};

const TenantDashboard: React.FC = () => {
  const { logout, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'payments' | 'maintenance' | 'documents'>('overview');
  const [loading, setLoading] = useState(true);
  const [invitationsLoading, setInvitationsLoading] = useState(false);
  const [state, setState] = useState<DashboardState>({
    property: null,
    contract: null,
    invitations: [],
    notifications: []
  });
  const [ledgerEntries, setLedgerEntries] = useState<RentLedgerEntry[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [invitationError, setInvitationError] = useState<string | null>(null);
  const [invitationMessage, setInvitationMessage] = useState<string | null>(null);
  const [respondingInvitationId, setRespondingInvitationId] = useState<string | null>(null);

  const loadPropertySummary = useCallback(async () => {
    if (!user?.email) {
      setState((prev) => ({ ...prev, property: null, contract: null }));
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('properties')
        .select(
          'id,address,apartment_number,rent,deposit_amount,status,tenant_name,phone,email,contract_start,contract_end'
        )
        .eq('email', user.email)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        setState((prev) => ({ ...prev, property: null, contract: null }));
        return;
      }

      const propertySummary: TenantPropertySummary = {
        propertyId: data.id,
        tenantName: data.tenant_name ?? user.email ?? 'Nuomininkas',
        tenantEmail: data.email ?? user.email ?? '—',
        tenantPhone: data.phone ?? null,
        address: [data.address, data.apartment_number].filter(Boolean).join(', '),
        status: data.status ?? 'vacant',
        rent: data.rent ?? 0,
        contractEnd: data.contract_end ?? null
      };

      const nextPaymentDate = calculateNextPaymentDate(data.contract_start);
      const daysUntilPayment = calculateDaysBetween(nextPaymentDate);

      const contractSummary: ContractSummary = {
        contractType: data.status === 'occupied' ? 'Aktyvi sutartis' : 'Neaktyvi sutartis',
        monthlyRent: data.rent ?? 0,
        depositAmount: data.deposit_amount ?? 0,
        utilitiesIncluded: false,
        nextPaymentDate,
        daysUntilPayment
      };

      setState((prev) => ({ ...prev, property: propertySummary, contract: contractSummary }));
    } catch (error) {
      console.error('❌ Failed to load tenant property:', error);
      setState((prev) => ({ ...prev, property: null, contract: null }));
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  const loadInvitations = useCallback(async () => {
    if (!user?.email) {
      setState((prev) => ({ ...prev, invitations: [] }));
      return;
    }

    try {
      setInvitationsLoading(true);
      setInvitationError(null);
      setInvitationMessage(null);
      const invitationRows = await listInvitationsForEmail(user.email);
      setState((prev) => ({ ...prev, invitations: invitationRows }));
    } catch (error) {
      console.error('❌ Failed to load tenant invitations:', error);
      setInvitationError('Nepavyko įkelti pakvietimų. Bandykite dar kartą.');
    } finally {
      setInvitationsLoading(false);
    }
  }, [user?.email]);

  const loadNotifications = useCallback(async () => {
    if (!user?.id) {
      setState((prev) => ({ ...prev, notifications: [] }));
      return;
    }

    try {
      const rows = await fetchNotificationsForUser(user.id);
      const mapped: DashboardNotification[] = rows.map((row) => ({
        id: row.id,
        title: row.title ?? 'Pranešimas',
        body: row.body ?? '',
        timestamp: new Date(row.created_at).toLocaleString('lt-LT'),
        tone: mapNotificationTone(row.kind),
        isRead: row.is_read ?? false
      }));
      setState((prev) => ({ ...prev, notifications: mapped }));
    } catch (error) {
      console.error('❌ Failed to load tenant notifications:', error);
      setState((prev) => ({ ...prev, notifications: [] }));
    }
  }, [user?.id]);

  useEffect(() => {
    void loadPropertySummary();
  }, [loadPropertySummary]);

  useEffect(() => {
    void loadInvitations();
  }, [loadInvitations]);

  useEffect(() => {
    void loadNotifications();

    if (!user?.id) return;

    const channel = supabase
      .channel('tenant-dashboard-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          void loadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadNotifications, user?.id]);

  useEffect(() => {
    const propertyId = state.property?.propertyId;
    if (!propertyId) {
      setLedgerEntries([]);
      return;
    }

    const loadLedger = async () => {
      try {
        setLedgerLoading(true);
        const entries = await fetchRentLedger(propertyId);
        setLedgerEntries(entries);
      } catch (error) {
        console.error('❌ Failed to load tenant ledger:', error);
        setLedgerEntries([]);
      } finally {
        setLedgerLoading(false);
      }
    };

    void loadLedger();
  }, [state.property?.propertyId]);

  const pendingInvitationsCount = useMemo(
    () => state.invitations.filter((invitation) => invitation.status === 'pending').length,
    [state.invitations]
  );

  const unreadNotificationsCount = useMemo(
    () => state.notifications.filter((notification) => !notification.isRead).length,
    [state.notifications]
  );

  const metrics: OverviewMetric[] = useMemo(() => {
    return [
      {
        id: 'rent',
        label: 'Mėnesio nuoma',
        value: state.property ? new Intl.NumberFormat('lt-LT', { style: 'currency', currency: 'EUR' }).format(state.property.rent) : '—',
        tone: 'primary'
      },
      {
        id: 'payment',
        label: 'Dienos iki mokėjimo',
        value: state.contract?.daysUntilPayment != null ? `${state.contract.daysUntilPayment} d.` : '—',
        caption: state.contract?.nextPaymentDate
          ? `Iki ${new Date(state.contract.nextPaymentDate).toLocaleDateString('lt-LT')}`
          : undefined,
        tone:
          state.contract?.daysUntilPayment != null && state.contract.daysUntilPayment <= 3
            ? 'warning'
            : 'neutral'
      },
      {
        id: 'invitations',
        label: 'Aktyvūs pakvietimai',
        value: pendingInvitationsCount.toString(),
        tone: pendingInvitationsCount > 0 ? 'warning' : 'neutral'
      },
      {
        id: 'notifications',
        label: 'Neskaityti pranešimai',
        value: unreadNotificationsCount.toString(),
        tone: unreadNotificationsCount > 0 ? 'primary' : 'neutral'
      }
    ];
  }, [pendingInvitationsCount, unreadNotificationsCount, state.contract, state.property]);

  const smartActions: SmartActionItem[] = useMemo(() => {
    const actions: SmartActionItem[] = [];
    if (state.contract) {
      actions.push({
        id: 'pay-rent',
        title: 'Sumokėti nuomą',
        description: state.contract.nextPaymentDate
          ? `Iki ${new Date(state.contract.nextPaymentDate).toLocaleDateString('lt-LT')}`
          : 'Sumokėkite nuomą laiku',
        category: 'payment'
      });
    }
    actions.push({
      id: 'upload-utilities',
      title: 'Įkelti komunalinius rodmenis',
      description: 'Pateikite naujus skaitiklių rodmenis arba patikrinkite istoriją',
      category: 'document'
    });
    actions.push({
      id: 'report-maintenance',
      title: 'Pranešti apie gedimą',
      description: 'Jei kilo problema būste, informuokite nuomotoją',
      category: 'maintenance'
    });
    if (pendingInvitationsCount > 0) {
      actions.push({
        id: 'review-invitations',
        title: 'Peržiūrėti pakvietimus',
        description: 'Turite neapdorotų pakvietimų',
        category: 'communication'
      });
    }
    return actions;
  }, [pendingInvitationsCount, state.contract]);

  const handleInvitationResponse = useCallback(
    async (invitationId: string, decision: 'accepted' | 'declined') => {
      try {
        const invitation = state.invitations.find((item) => item.id === invitationId);
        setRespondingInvitationId(invitationId);
        const updated = await respondToInvitation(invitationId, decision);
        setState((prev) => ({
          ...prev,
          invitations: prev.invitations.map((item) =>
            item.id === invitationId ? { ...item, status: updated.status, responded_at: updated.responded_at } : item
          )
        }));
        setInvitationMessage(decision === 'accepted' ? 'Pakvietimas priimtas.' : 'Pakvietimas atmestas.');
        setInvitationError(null);

        if (decision === 'accepted' && invitation) {
          try {
            await propertyApi.update(invitation.property_id, {
              status: 'occupied',
              tenant_name: invitation.full_name ?? invitation.email,
              email: invitation.email,
              contract_start: invitation.contract_start ?? undefined,
              contract_end: invitation.contract_end ?? undefined,
              rent: invitation.rent ?? undefined,
              deposit_amount: invitation.deposit ?? undefined,
              tenant_response: 'wants_to_renew',
              tenant_response_date: new Date().toISOString()
            });
            await loadPropertySummary();
          } catch (updateError) {
            console.error('❌ Failed to update property after acceptance:', updateError);
          }

          try {
            await declineOtherInvitations(invitation.property_id, invitationId);
            await loadInvitations();
          } catch (declineError) {
            console.error('⚠️ Failed to decline other invitations:', declineError);
          }
        }

        const decisionTitle = decision === 'accepted' ? 'Nuomininkas priėmė kvietimą' : 'Nuomininkas atmetė kvietimą';
        if (invitation?.invited_by) {
          try {
            await createNotification({
              userId: invitation.invited_by,
              kind: 'tenant.invitation.response',
              title: decisionTitle,
              body: invitation.property?.address ?? 'Patikrinkite kvietimo būseną.',
              data: {
                invitationId,
                decision,
                tenantEmail: user?.email ?? null
              }
            });
          } catch (error) {
            console.error('❌ Failed to notify landlord about response:', error);
          }
        }

        await loadNotifications();
      } catch (error) {
        console.error('❌ Failed to respond to invitation:', error);
        setInvitationError('Nepavyko atnaujinti pakvietimo. Bandykite dar kartą.');
      } finally {
        setRespondingInvitationId(null);
      }
    },
    [loadInvitations, loadNotifications, loadPropertySummary, state.invitations, user?.email]
  );

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
  };

  const handleSmartAction = (action: SmartActionItem) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Smart action selected:', action.id);
    }
  };

  return (
    <DashboardErrorBoundary>
      <div className="relative min-h-full">
        <div className="absolute inset-0 overflow-hidden">
          <OptimizedImage
            src={addressImage}
            alt="Nuomos valdymo fonas"
            className="h-full w-full object-cover"
            loading="eager"
            width={1920}
            height={1080}
          />
        </div>
        <div className="absolute inset-0 bg-black/40" />

        <div className="relative z-10 min-h-full pb-16">
          <header className="mx-auto flex max-w-5xl flex-col gap-6 px-4 pt-12 text-white sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">Nuomininko panelė</h1>
                <p className="mt-2 text-sm text-white/80">
                  Stebėkite mokėjimus, pakvietimus ir pranešimus vienoje vietoje.
                </p>
              </div>
              <button
                onClick={logout}
                className="inline-flex items-center gap-2 rounded-lg border border-white/40 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5" />
                Atsijungti
              </button>
            </div>
          </header>

          <div className="mx-auto mt-10 max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl bg-white/95 shadow-2xl backdrop-blur-sm">
              <nav className="flex space-x-4 border-b border-black/10 px-6 pt-6 text-sm font-medium text-black/60">
                {(
                  [
                    { id: 'overview', label: 'Apžvalga' },
                    { id: 'payments', label: 'Mokėjimai' },
                    { id: 'maintenance', label: 'Priežiūra' },
                    { id: 'documents', label: 'Dokumentai' }
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`border-b-2 px-1 py-2 transition ${
                      activeTab === tab.id
                        ? 'border-[#2F8481] text-[#2F8481]'
                        : 'border-transparent hover:text-black'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>

              <div className="px-6 pb-8 pt-6">
                {activeTab === 'overview' && (
                  <div className="space-y-8">
                    <OverviewMetrics metrics={metrics} />

                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                      <TenantPropertyCard summary={state.property} />
                      <ContractSummaryCard summary={state.contract} />
                    </div>

                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                      <InvitationsPanel
                        invitations={state.invitations}
                        loading={invitationsLoading}
                        error={invitationError}
                        message={invitationMessage}
                        respondingId={respondingInvitationId}
                        onRefresh={loadInvitations}
                        onRespond={handleInvitationResponse}
                      />
                      <SmartActionsPanel actions={smartActions} onAction={handleSmartAction} />
                    </div>

                    <NotificationsPanel notifications={state.notifications} />
                  </div>
                )}

                {activeTab === 'payments' && (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-black/10 bg-white px-6 py-5 shadow-sm">
                      <h2 className="text-lg font-semibold text-black">Sąskaitos ir mokėjimai</h2>
                      {ledgerLoading ? (
                        <p className="mt-4 text-sm text-black/60">Kraunama...</p>
                      ) : ledgerEntries.length === 0 ? (
                        <p className="mt-4 text-sm text-black/60">
                          Kol kas neturite išrašytų sąskaitų. Kai nuomotojas išrašys sąskaitą, ji atsiras čia.
                        </p>
                      ) : (
                        <div className="mt-4 space-y-4">
                          {ledgerEntries.map((entry) => (
                            <div key={entry.invoice.id} className="rounded-xl border border-black/10 px-4 py-3 text-sm shadow-sm">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <p className="text-base font-semibold text-black">{entry.invoice.invoice_number}</p>
                                  <p className="text-xs text-black/50">Išrašyta {new Date(entry.invoice.invoice_date).toLocaleDateString('lt-LT')}</p>
                                  <p className="text-xs text-black/50">Terminas {new Date(entry.invoice.due_date).toLocaleDateString('lt-LT')}</p>
                                </div>
                                <span
                                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                                    entry.status === 'paid'
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : entry.status === 'overdue'
                                        ? 'bg-rose-50 text-rose-700'
                                        : 'bg-amber-50 text-amber-700'
                                  }`}
                                >
                                  {entry.status === 'paid' ? 'Apmokėta' : entry.status === 'overdue' ? 'Vėluoja' : 'Neapmokėta'}
                                </span>
                              </div>
                              <div className="mt-3 grid gap-2 text-xs text-black/60 sm:grid-cols-3">
                                <div>
                                  <strong>Suma:</strong> {entry.invoice.amount.toLocaleString('lt-LT', { style: 'currency', currency: 'EUR' })}
                                </div>
                                <div>
                                  <strong>Apmokėta:</strong> {entry.paidAmount.toLocaleString('lt-LT', { style: 'currency', currency: 'EUR' })}
                                </div>
                                <div>
                                  <strong>Likutis:</strong> {entry.balance.toLocaleString('lt-LT', { style: 'currency', currency: 'EUR' })}
                                </div>
                              </div>
                              {entry.payments.length > 0 && (
                                <div className="mt-3">
                                  <p className="text-xs font-semibold text-black">Mokėjimai:</p>
                                  <ul className="mt-2 space-y-1 text-xs text-black/60">
                                    {entry.payments.map((payment) => (
                                      <li key={payment.id} className="flex justify-between">
                                        <span>{new Date(payment.paid_at).toLocaleDateString('lt-LT')}</span>
                                        <span>{payment.amount.toLocaleString('lt-LT', { style: 'currency', currency: 'EUR' })}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'maintenance' && (
                  <div className="rounded-2xl border border-black/10 bg-white px-6 py-5 text-sm text-black/60 shadow-sm">
                    Priežiūros užklausų sritis bus įdiegta artimiausiu metu.
                  </div>
                )}

                {activeTab === 'documents' && (
                  <div className="rounded-2xl border border-black/10 bg-white px-6 py-5 text-sm text-black/60 shadow-sm">
                    Dokumentų valdymo sritis bus įdiegta artimiausiu metu.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardErrorBoundary>
  );
};

// Error Boundary Component
class DashboardErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Security: Only log in development, never in production
    if (process.env.NODE_ENV === 'development') {
      console.error('Dashboard Error:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ExclamationCircleIcon className="w-8 h-8 text-gray-600" />
            </div>
            <h2 className="text-xl font-semibold text-black mb-2">
              Something went wrong
            </h2>
            <p className="text-gray-600 mb-4">
              Please try refreshing the page
            </p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary px-4 py-2 rounded-lg"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default TenantDashboard; 