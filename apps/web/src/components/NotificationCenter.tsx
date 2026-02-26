import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import {
  BellIcon,
  XMarkIcon,
  CheckIcon,
  InboxIcon,
  HomeIcon,
  BuildingOfficeIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  WrenchScrewdriverIcon,
  HandRaisedIcon,
  MegaphoneIcon,
} from '@heroicons/react/24/outline';
import { BellIcon as BellSolidIcon } from '@heroicons/react/24/solid';

interface Notification {
  id: string;
  kind: string;
  title: string;
  body?: string;
  data: any;
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

/* ─── notification kind → icon map ─── */
function getKindIcon(kind: string) {
  switch (kind) {
    case 'address.created': return HomeIcon;
    case 'property.created': return BuildingOfficeIcon;
    case 'meter.reading': return ChartBarIcon;
    case 'payment.due': return CurrencyDollarIcon;
    case 'maintenance.request': return WrenchScrewdriverIcon;
    case 'welcome': return HandRaisedIcon;
    default: return MegaphoneIcon;
  }
}

function getKindColor(kind: string) {
  switch (kind) {
    case 'address.created':
    case 'property.created': return { bg: 'bg-[#2F8481]/10', text: 'text-[#2F8481]' };
    case 'meter.reading': return { bg: 'bg-amber-50', text: 'text-amber-600' };
    case 'payment.due': return { bg: 'bg-emerald-50', text: 'text-emerald-600' };
    case 'maintenance.request': return { bg: 'bg-orange-50', text: 'text-orange-600' };
    case 'welcome': return { bg: 'bg-purple-50', text: 'text-purple-600' };
    default: return { bg: 'bg-gray-100', text: 'text-gray-500' };
  }
}

/* ─── NotificationCenter — slide-out panel ─── */
// eslint-disable-next-line react/prop-types
export const NotificationCenter: React.FC<NotificationCenterProps> = React.memo(({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!user) return;
    setNotifications([]);
    setUnreadCount(0);
    setLoading(false);
    return;
  };

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId
            ? { ...n, is_read: true, read_at: new Date().toISOString() }
            : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (_error) {
      // Security: No console logging in production
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => ({
          ...n,
          is_read: true,
          read_at: new Date().toISOString()
        }))
      );
      setUnreadCount(0);
    } catch (_error) {
      // Security: No console logging in production
    }
  };

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    fetchNotifications();

    const channel = supabase
      .channel('notifications')
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
        }
      )
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const updatedNotification = payload.new as Notification;
          setNotifications(prev =>
            prev.map(n =>
              n.id === updatedNotification.id ? updatedNotification : n
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'Ką tik';
    if (diffMin < 60) return `prieš ${diffMin} min.`;
    if (diffHrs < 24) return `prieš ${diffHrs} val.`;
    if (diffDays < 7) return `prieš ${diffDays} d.`;
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[70] bg-black/30 backdrop-blur-[2px] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        onClick={onClose}
      />

      {/* Slide-out panel */}
      <div
        ref={panelRef}
        className={`
          fixed top-0 right-0 z-[80] h-full w-full sm:w-[420px]
          bg-white shadow-2xl shadow-black/10
          transform transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
          flex flex-col
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* ── Header ── */}
        <div className="flex-shrink-0 px-5 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#2F8481]/8 flex items-center justify-center" style={{ backgroundColor: 'rgba(47,132,129,0.08)' }}>
                <BellSolidIcon className="w-[18px] h-[18px] text-[#2F8481]" />
              </div>
              <div>
                <h2 className="text-[15px] font-semibold text-gray-900">Pranešimai</h2>
                {unreadCount > 0 && (
                  <p className="text-[11px] text-[#2F8481] font-medium mt-0.5">
                    {unreadCount} neperskaityt{unreadCount === 1 ? 'as' : 'i'}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="px-2.5 py-1.5 text-xs font-medium text-[#2F8481] hover:bg-[#2F8481]/5 rounded-lg transition-colors"
                >
                  Pažymėti visus
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            /* Loading skeleton */
            <div className="px-5 py-4 space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="w-9 h-9 rounded-xl bg-gray-100 flex-shrink-0" />
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-3.5 bg-gray-100 rounded w-3/4" />
                    <div className="h-3 bg-gray-50 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-20 px-6">
              <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
                <InboxIcon className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-500">Nėra pranešimų</p>
              <p className="text-xs text-gray-400 mt-1 text-center">
                Kai gausite naujų pranešimų,<br />jie bus rodomi čia
              </p>
            </div>
          ) : (
            /* Notification list */
            <div className="divide-y divide-gray-50">
              {notifications.map((notification) => {
                const KindIcon = getKindIcon(notification.kind);
                const kindColor = getKindColor(notification.kind);

                return (
                  <div
                    key={notification.id}
                    className={`
                      px-5 py-3.5 transition-colors duration-150 group
                      ${notification.is_read
                        ? 'bg-white hover:bg-gray-50/50'
                        : 'bg-[#2F8481]/[0.02] hover:bg-[#2F8481]/[0.04]'
                      }
                    `}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className={`w-9 h-9 rounded-xl ${kindColor.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                        <KindIcon className={`w-[18px] h-[18px] ${kindColor.text}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className={`text-sm leading-snug ${notification.is_read
                            ? 'font-medium text-gray-600'
                            : 'font-semibold text-gray-900'
                            }`}>
                            {notification.title}
                          </h4>

                          {/* Unread indicator + mark button */}
                          {!notification.is_read && (
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <div className="w-2 h-2 rounded-full bg-[#2F8481]" />
                              <button
                                onClick={() => markAsRead(notification.id)}
                                className="p-1 rounded-md text-gray-400 hover:text-[#2F8481] hover:bg-[#2F8481]/5 opacity-0 group-hover:opacity-100 transition-all"
                                title="Pažymėti kaip perskaitytą"
                              >
                                <CheckIcon className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>

                        {notification.body && (
                          <p className="text-[13px] text-gray-500 mt-0.5 leading-relaxed line-clamp-2">
                            {notification.body}
                          </p>
                        )}

                        <p className="text-[11px] text-gray-400 mt-1.5 font-medium">
                          {formatDate(notification.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        {notifications.length > 0 && (
          <div className="flex-shrink-0 px-5 py-3 border-t border-gray-100 bg-gray-50/50">
            <p className="text-[11px] text-gray-400 text-center font-medium">
              Rodomi paskutiniai {notifications.length} pranešim{notifications.length === 1 ? 'as' : 'ai'}
            </p>
          </div>
        )}
      </div>
    </>
  );
});

NotificationCenter.displayName = 'NotificationCenter';

/* ─── NotificationBell — header button ─── */
// eslint-disable-next-line react/prop-types
export const NotificationBell: React.FC<{ onClick: () => void }> = React.memo(({ onClick }) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    setUnreadCount(0);
  }, [user]);

  return (
    <button
      onClick={onClick}
      className="relative p-2 rounded-xl text-gray-500 hover:text-[#2F8481] hover:bg-[#2F8481]/5 active:scale-95 transition-all duration-200"
      aria-label="Pranešimai"
    >
      <BellIcon className="w-5 h-5" />
      {unreadCount > 0 && (
        <span className="absolute top-1 right-1 flex items-center justify-center min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full ring-2 ring-white">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
});

NotificationBell.displayName = 'NotificationBell';
