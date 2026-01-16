import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, Mail, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface Notification {
  id: string;
  kind: string;
  title: string;
  body?: string;
  data: Record<string, unknown> | null;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
}

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NotificationDetailContext {
  property?: {
    id: string;
    label: string;
    status?: string | null;
    rent?: number | null;
    deposit?: number | null;
    tenantName?: string | null;
  };
  invitation?: {
    id: string;
    email?: string | null;
    full_name?: string | null;
    status?: string | null;
    property_label?: string | null;
    created_at?: string;
    expires_at?: string | null;
    responded_at?: string | null;
    invited_by_email?: string | null;
  };
}

const DATA_LABELS: Record<string, string> = {
  email: 'El. paštas',
  tenantEmail: 'Nuomininko el. paštas',
  propertyId: 'Būsto ID',
  invitationId: 'Pakvietimo ID',
  decision: 'Sprendimas'
};

const KIND_LABELS: Record<string, string> = {
  'tenant.invitation': 'Nuomos kvietimas',
  'tenant.invitation.response': 'Kvietimo atsakymas',
  'payment.due': 'Mokėjimo priminimas',
  'payment.created': 'Sąskaita išrašyta',
  'maintenance.request': 'Gedimo pranešimas',
  welcome: 'Sveikinimo pranešimas'
};

const formatCurrency = (value?: number | null) => {
  if (value === null || value === undefined) return '—';
  return value.toLocaleString('lt-LT', { style: 'currency', currency: 'EUR' });
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '—';
  return new Date(value).toLocaleString('lt-LT');
};

const formatRelativeDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

  if (diffInHours < 1) {
    const diffInMinutes = Math.max(1, Math.floor(diffInHours * 60));
    return `${diffInMinutes} min.`;
  }
  if (diffInHours < 24) {
    return `${Math.floor(diffInHours)} val.`;
  }
  return date.toLocaleDateString('lt-LT');
};

const getNotificationIcon = (kind: string) => {
  if (kind?.startsWith('tenant.invitation')) return '👥';
  switch (kind) {
    case 'address.created':
      return '🏠';
    case 'property.created':
      return '🏢';
    case 'meter.reading':
      return '📊';
    case 'payment.due':
    case 'payment.created':
      return '💰';
    case 'maintenance.request':
      return '🔧';
    case 'welcome':
      return '👋';
    default:
      return '📢';
  }
};

const kindLabel = (kind: string) => KIND_LABELS[kind] ?? 'Sistemos pranešimas';

// eslint-disable-next-line react/prop-types
export const NotificationCenter: React.FC<NotificationCenterProps> = React.memo(({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [contextError, setContextError] = useState<string | null>(null);
  const [detailContext, setDetailContext] = useState<NotificationDetailContext | null>(null);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.is_read).length,
    [notifications]
  );

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications((data ?? []) as Notification[]);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const markAsRead = useCallback(
    async (notificationId: string, readAtOverride?: string) => {
      if (!user?.id) return;
      const readAt = readAtOverride ?? new Date().toISOString();

      try {
        const { error } = await supabase
          .from('notifications')
          .update({ is_read: true, read_at: readAt })
          .eq('id', notificationId);

        if (error) throw error;

        setNotifications((prev) =>
          prev.map((notification) =>
            notification.id === notificationId
              ? { ...notification, is_read: true, read_at: readAt }
              : notification
          )
        );
      } catch {
        // swallow silently in production
      }
    },
    [user?.id]
  );

  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;

    try {
      const readAt = new Date().toISOString();
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: readAt })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((notification) => ({ ...notification, is_read: true, read_at: readAt }))
      );
      setSelectedNotification((prev) =>
        prev ? { ...prev, is_read: true, read_at: readAt } : prev
      );
    } catch {
      // swallow silently in production
    }
  }, [user?.id]);

  const handleSelectNotification = useCallback(
    async (notification: Notification) => {
      const readAt = notification.is_read ? notification.read_at ?? undefined : new Date().toISOString();
      const normalized = notification.is_read
        ? notification
        : { ...notification, is_read: true, read_at: readAt };

      setSelectedNotification(normalized);
      if (!notification.is_read) {
        await markAsRead(notification.id, readAt);
        setSelectedNotification((prev) =>
          prev && prev.id === notification.id ? { ...prev, is_read: true, read_at: readAt } : prev
        );
      }
    },
    [markAsRead]
  );

  const formattedData = useMemo(() => {
    if (!selectedNotification?.data || typeof selectedNotification.data !== 'object') return [];
    return Object.entries(selectedNotification.data).map(([key, value]) => ({
      key,
      label: DATA_LABELS[key] ?? key,
      value:
        typeof value === 'string' || typeof value === 'number'
          ? String(value)
          : JSON.stringify(value, null, 2)
    }));
  }, [selectedNotification]);

  const buildFallbackContext = useCallback(
    (payload: Record<string, unknown>): NotificationDetailContext | null => {
      const context: NotificationDetailContext = {};
      const propertyId = typeof payload.propertyId === 'string' ? payload.propertyId : null;
      const invitationId = typeof payload.invitationId === 'string' ? payload.invitationId : null;

      if (!propertyId && !invitationId) {
        return null;
      }

      if (invitationId) {
        context.invitation = {
          id: invitationId,
          email: typeof payload.email === 'string' ? payload.email : undefined,
          full_name: typeof payload.fullName === 'string' ? payload.fullName : undefined,
          status: typeof payload.status === 'string' ? payload.status : undefined,
          property_label: typeof payload.propertyLabel === 'string' ? payload.propertyLabel : undefined,
          invited_by_email: typeof payload.invitedByEmail === 'string' ? payload.invitedByEmail : undefined
        };
      }

      if (propertyId) {
        context.property = {
          id: propertyId,
          label:
            (typeof payload.propertyLabel === 'string' && payload.propertyLabel) ||
            selectedNotification?.body ||
            propertyId,
          status: typeof payload.propertyStatus === 'string' ? payload.propertyStatus : undefined,
          rent: typeof payload.rent === 'number' ? payload.rent : undefined,
          deposit: typeof payload.deposit === 'number' ? payload.deposit : undefined,
          tenantName: typeof payload.tenantName === 'string' ? payload.tenantName : undefined
        };
      }

      return context;
    },
    [selectedNotification?.body]
  );

  useEffect(() => {
    if (!user?.id) return;

    void fetchNotifications();

    const channel = supabase
      .channel(`notifications-center-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          void fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchNotifications, user?.id]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedNotification(null);
      setDetailContext(null);
      setContextError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const loadContext = async () => {
      if (!selectedNotification) {
        setDetailContext(null);
        setContextError(null);
        setContextLoading(false);
        return;
      }

      const payload = (selectedNotification.data ?? {}) as Record<string, unknown>;
      const fallbackContext = buildFallbackContext(payload);
      if (!payload.invitationId && !payload.propertyId) {
        setDetailContext(null);
        setContextError(null);
        setContextLoading(false);
        return;
      }

      setContextLoading(true);
      setContextError(null);

      try {
        const context: NotificationDetailContext = {};

        if (payload.invitationId) {
          const { data: invitation, error } = await supabase
            .from('tenant_invitations')
            .select(`
              id,
              email,
              full_name,
              status,
              property_label,
              contract_start,
              contract_end,
              rent,
              deposit,
              created_at,
              expires_at,
              responded_at,
              invited_by_email,
              property:property_id (
                id,
                address,
                apartment_number,
                status,
                rent,
                deposit_amount,
                tenant_name
              )
            `)
            .eq('id', String(payload.invitationId))
            .maybeSingle();

          if (error) throw error;

          if (invitation) {
            context.invitation = {
              id: invitation.id,
              email: invitation.email,
              full_name: invitation.full_name,
              status: invitation.status,
              property_label: invitation.property_label,
              created_at: invitation.created_at,
              expires_at: invitation.expires_at,
              responded_at: invitation.responded_at,
              invited_by_email: invitation.invited_by_email
            };

            if (invitation.property) {
              const propertyRecord = Array.isArray(invitation.property)
                ? invitation.property[0] ?? null
                : invitation.property;

              if (propertyRecord) {
                context.property = {
                  id: propertyRecord.id,
                  label: [propertyRecord.address, propertyRecord.apartment_number]
                  .filter(Boolean)
                  .join(', '),
                  status: propertyRecord.status,
                  rent: propertyRecord.rent,
                  deposit: propertyRecord.deposit_amount,
                  tenantName: propertyRecord.tenant_name
                };
              }
            } else if (invitation.property_label) {
              context.property = {
                id: String(payload.propertyId ?? ''),
                label: invitation.property_label,
                status: null,
                rent: invitation.rent,
                deposit: invitation.deposit
              };
            }
          }
        } else if (payload.propertyId) {
          const { data: property, error } = await supabase
            .from('properties')
            .select('id,address,apartment_number,status,rent,deposit_amount,tenant_name')
            .eq('id', String(payload.propertyId))
            .maybeSingle();

          if (error) throw error;

          const propertyRecord = Array.isArray(property) ? property[0] ?? null : property;

          if (propertyRecord) {
            context.property = {
              id: propertyRecord.id,
              label: [propertyRecord.address, propertyRecord.apartment_number].filter(Boolean).join(', '),
              status: propertyRecord.status,
              rent: propertyRecord.rent,
              deposit: propertyRecord.deposit_amount,
              tenantName: propertyRecord.tenant_name
            };
          }
        }

        if (Object.keys(context).length === 0 && fallbackContext) {
          setDetailContext(fallbackContext);
        } else {
          setDetailContext(context);
        }
        setContextError(null);
      } catch {
        if (fallbackContext) {
          setDetailContext(fallbackContext);
          setContextError(null);
        } else {
          setDetailContext(null);
          setContextError('Nepavyko įkelti susijusios informacijos.');
        }
      } finally {
        setContextLoading(false);
      }
    };

    void loadContext();
  }, [buildFallbackContext, selectedNotification]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150]">
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
        role="presentation"
      />

      <div className="absolute right-6 top-24 w-[clamp(320px,32vw,420px)]">
        <div className="rounded-3xl border border-black/10 bg-white/95 shadow-2xl backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-black/10 px-6 py-4">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#2F8481]/10 text-[#2F8481]">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-black">Pranešimai</h3>
                <p className="text-xs text-black/50">
                  {unreadCount > 0 ? `${unreadCount} neperskaityti pranešimai` : 'Visi pranešimai peržiūrėti'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2F8481] transition hover:text-[#256b69]"
                  type="button"
                >
                  Pažymėti visus
                </button>
              )}
              <button
                onClick={onClose}
                className="rounded-full p-1 text-black/50 transition hover:bg-black/5 hover:text-black"
                aria-label="Uždaryti pranešimus"
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
            {loading ? (
              <div className="flex flex-col items-center gap-3 py-12 text-black/50">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#2F8481] border-t-transparent" />
                <span className="text-sm">Kraunama...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-black/50">
                <Mail className="h-10 w-10" />
                <span className="text-sm">Naujų pranešimų nėra</span>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => void handleSelectNotification(notification)}
                    className={`w-full rounded-2xl border border-black/10 px-4 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-[#2F8481]/30 ${
                      notification.is_read
                        ? 'bg-white hover:bg-black/3'
                        : 'bg-[#2F8481]/6 shadow-sm hover:bg-[#2F8481]/10'
                    }`}
                    type="button"
                  >
                    <div className="flex gap-3">
                      <div
                        className={`mt-2 h-2 w-2 rounded-full ${
                          notification.is_read ? 'bg-black/20' : 'bg-[#2F8481]'
                        }`}
                      />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-black/50">
                              {kindLabel(notification.kind)}
                            </p>
                            <div className="mt-1 flex items-center gap-2">
                              <span className="text-xl leading-none">{getNotificationIcon(notification.kind)}</span>
                              <p
                                className={`text-sm font-semibold text-black ${
                                  notification.is_read ? '' : 'tracking-tight'
                                }`}
                              >
                                {notification.title}
                              </p>
                            </div>
                          </div>
                          <span className="whitespace-nowrap text-xs text-black/50">
                            {formatRelativeDate(notification.created_at)}
                          </span>
                        </div>
                        {notification.body && (
                          <p className="text-xs leading-relaxed text-black/65">
                            {notification.body.length > 160
                              ? `${notification.body.slice(0, 160)}…`
                              : notification.body}
                          </p>
                        )}
                        {!notification.is_read && (
                          <span className="inline-flex items-center rounded-full bg-[#2F8481]/10 px-2 py-0.5 text-[11px] font-semibold text-[#2F8481]">
                            Naujas
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedNotification && (
        <div className="fixed inset-y-0 right-0 z-[155] w-[clamp(320px,30vw,460px)] overflow-hidden rounded-l-3xl border-l border-black/10 bg-white shadow-2xl backdrop-blur-md">
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#2F8481] to-black/70 opacity-95" />
            <div className="relative px-6 pb-7 pt-8 text-white">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-3">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/90">
                    <span>{getNotificationIcon(selectedNotification.kind)}</span>
                    {kindLabel(selectedNotification.kind)}
                  </span>
                  <div>
                    <h3 className="text-xl font-semibold leading-snug">{selectedNotification.title}</h3>
                    <p className="mt-2 text-xs uppercase tracking-[0.18em] text-white/70">
                      Gauta {formatDateTime(selectedNotification.created_at)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedNotification(null)}
                  className="rounded-full bg-white/15 p-2 text-white transition hover:bg-white/30"
                  aria-label="Uždaryti pranešimą"
                  type="button"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-3 text-xs">
                {selectedNotification.read_at ? (
                  <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-white/90">
                    Perskaityta {formatDateTime(selectedNotification.read_at)}
                  </span>
                ) : (
                  <button
                    onClick={() =>
                      void (async () => {
                        const readAt = new Date().toISOString();
                        await markAsRead(selectedNotification.id, readAt);
                        setSelectedNotification((prev) =>
                          prev ? { ...prev, is_read: true, read_at: readAt } : prev
                        );
                      })()
                    }
                    className="inline-flex items-center rounded-full bg-white px-3 py-1 font-semibold text-[#2F8481] shadow-sm transition hover:bg-white/90"
                    type="button"
                  >
                    Pažymėti kaip perskaitytą
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex h-[calc(100%-208px)] flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-6 text-sm text-black/70">
              <div className="space-y-6">
                {selectedNotification.body ? (
                  <p className="rounded-2xl border border-black/5 bg-black/3 p-4 leading-relaxed text-black/80">
                    {selectedNotification.body}
                  </p>
                ) : (
                  <p className="rounded-2xl border border-black/5 bg-black/3 p-4 text-black/50">
                    Šis pranešimas neturi papildomo teksto.
                  </p>
                )}

                {contextLoading && (
                  <div className="flex items-center gap-2 rounded-xl border border-black/10 bg-black/3 px-3 py-2 text-xs text-black/60">
                    <div className="h-4 w-4 animate-spin rounded-full border border-[#2F8481] border-t-transparent" />
                    Kraunama susijusi informacija…
                  </div>
                )}

                {contextError && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                    {contextError}
                  </div>
                )}

                {detailContext?.invitation && (
                  <section className="space-y-3 rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/50">
                      Pakvietimo informacija
                    </p>
                    <dl className="grid gap-y-2 text-sm text-black/70">
                      <div className="flex justify-between gap-3">
                        <dt className="text-black/50">Nuomininkas</dt>
                        <dd className="text-right font-medium text-black">
                          {detailContext.invitation.full_name ?? '—'}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-black/50">El. paštas</dt>
                        <dd className="text-right text-black">
                          {detailContext.invitation.email ?? '—'}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-black/50">Statusas</dt>
                        <dd className="text-right">
                          <span className="inline-flex items-center rounded-full bg-[#2F8481]/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.14em] text-[#2F8481]">
                            {detailContext.invitation.status ?? 'nežinoma'}
                          </span>
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-black/50">Siuntėjas</dt>
                        <dd className="text-right text-black">
                          {detailContext.invitation.invited_by_email ?? '—'}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3 text-xs text-black/50">
                        <dt>Sukurta</dt>
                        <dd className="text-right text-black/70">
                          {formatDateTime(detailContext.invitation.created_at)}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3 text-xs text-black/50">
                        <dt>Pabaiga</dt>
                        <dd className="text-right text-black/70">
                          {formatDateTime(detailContext.invitation.expires_at)}
                        </dd>
                      </div>
                    </dl>
                  </section>
                )}

                {detailContext?.property && (
                  <section className="space-y-3 rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/50">
                      Susijęs būstas
                    </p>
                    <dl className="grid gap-y-2 text-sm text-black/70">
                      <div className="flex justify-between gap-3">
                        <dt className="text-black/50">Adresas</dt>
                        <dd className="text-right font-medium text-black">
                          {detailContext.property.label || '—'}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-black/50">Statusas</dt>
                        <dd className="text-right text-black">
                          {detailContext.property.status ?? '—'}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-black/50">Mėnesio nuoma</dt>
                        <dd className="text-right text-black">
                          {formatCurrency(detailContext.property.rent)}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-black/50">Depozitas</dt>
                        <dd className="text-right text-black">
                          {formatCurrency(detailContext.property.deposit)}
                        </dd>
                      </div>
                      {detailContext.property.tenantName && (
                        <div className="flex justify-between gap-3">
                          <dt className="text-black/50">Nuomininkas</dt>
                          <dd className="text-right text-black">
                            {detailContext.property.tenantName}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </section>
                )}

                {formattedData.length > 0 && (
                  <section className="space-y-3 rounded-2xl border border-black/10 bg-black/3 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/50">
                      Papildomi duomenys
                    </p>
                    <dl className="grid gap-y-2 text-xs text-black/70">
                      {formattedData.map(({ key, label, value }) => (
                        <div key={key} className="flex justify-between gap-3">
                          <dt className="text-black/50">{label}</dt>
                          <dd className="max-w-[60%] text-right text-black">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

NotificationCenter.displayName = 'NotificationCenter';

// Notification Bell Component
// eslint-disable-next-line react/prop-types
export const NotificationBell: React.FC<{ onClick: () => void }> = React.memo(({ onClick }) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.id) {
      setUnreadCount(0);
      return;
    }

    let isMounted = true;

    const loadUnread = async () => {
      const { error, count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (!isMounted) return;
      if (error) {
        setUnreadCount(0);
        return;
      }

      setUnreadCount(count ?? 0);
    };

    void loadUnread();

    const channel = supabase
      .channel(`notification-bell-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          void loadUnread();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return (
    <button
      onClick={onClick}
      className="relative rounded-full bg-white/70 p-2 text-black/60 transition hover:bg-white hover:text-[#2F8481] focus:outline-none focus:ring-2 focus:ring-[#2F8481]/40"
      aria-label="Atidaryti pranešimus"
      type="button"
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#2F8481] text-[11px] font-semibold text-white">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
});

NotificationBell.displayName = 'NotificationBell';





