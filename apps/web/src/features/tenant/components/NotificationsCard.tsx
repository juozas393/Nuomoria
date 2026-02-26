import React from 'react';
import { NotificationItem } from '../types/tenant.types';
import { Bell, CreditCard, Wrench, FileText, Calendar, ChevronRight } from 'lucide-react';

interface NotificationsCardProps {
    notifications: NotificationItem[];
    loading?: boolean;
    onViewAll?: () => void;
}

const formatTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Ką tik';
    if (diffMins < 60) return `Prieš ${diffMins} min.`;
    if (diffHours < 24) return `Prieš ${diffHours} val.`;
    if (diffDays === 1) return 'Vakar';
    if (diffDays < 7) return `Prieš ${diffDays} d.`;
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const getNotificationIcon = (type: NotificationItem['type']) => {
    switch (type) {
        case 'payment_due':
        case 'payment_received':
            return CreditCard;
        case 'maintenance_update':
            return Wrench;
        case 'document_added':
            return FileText;
        case 'lease_ending':
            return Calendar;
        default:
            return Bell;
    }
};

const getNotificationColor = (type: NotificationItem['type']): string => {
    switch (type) {
        case 'payment_due':
            return 'bg-amber-100 text-amber-600';
        case 'payment_received':
            return 'bg-emerald-100 text-emerald-600';
        case 'maintenance_update':
            return 'bg-blue-100 text-blue-600';
        case 'document_added':
            return 'bg-purple-100 text-purple-600';
        case 'lease_ending':
            return 'bg-red-100 text-red-600';
        default:
            return 'bg-gray-100 text-gray-600';
    }
};

export const NotificationsCard: React.FC<NotificationsCardProps> = ({
    notifications,
    loading,
    onViewAll,
}) => {
    const unreadCount = notifications.filter(n => !n.read).length;

    if (loading) {
        return (
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm animate-pulse">
                <div className="w-44 h-6 bg-gray-200 rounded mb-6" />
                <div className="space-y-3">
                    <div className="h-16 bg-gray-100 rounded-xl" />
                    <div className="h-16 bg-gray-100 rounded-xl" />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-gray-900">
                        Naujausi pranešimai
                    </h2>
                    {unreadCount > 0 && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-600 rounded-full">
                            {unreadCount}
                        </span>
                    )}
                </div>
                <Bell className="w-5 h-5 text-gray-400" />
            </div>

            {notifications.length > 0 ? (
                <div className="space-y-3">
                    {notifications.slice(0, 4).map((notification) => {
                        const Icon = getNotificationIcon(notification.type);
                        return (
                            <div
                                key={notification.id}
                                className={`flex items-start gap-3 p-3 rounded-xl transition-colors cursor-pointer ${notification.read ? 'bg-gray-50 hover:bg-gray-100' : 'bg-[#2F8481]/5 hover:bg-[#2F8481]/10'
                                    }`}
                            >
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${getNotificationColor(notification.type)}`}>
                                    <Icon className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <span className={`text-sm ${notification.read ? 'text-gray-700' : 'text-gray-900 font-medium'}`}>
                                            {notification.title}
                                        </span>
                                        {!notification.read && (
                                            <span className="w-2 h-2 bg-[#2F8481] rounded-full flex-shrink-0 mt-1.5" />
                                        )}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                                        {notification.message}
                                    </div>
                                    <div className="text-xs text-gray-400 mt-1">
                                        {formatTime(notification.createdAt)}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="rounded-xl bg-gray-50 p-6 text-center">
                    <Bell className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <div className="text-gray-500 text-sm">
                        Pranešimų kol kas nėra
                    </div>
                </div>
            )}

            {notifications.length > 4 && (
                <button
                    onClick={onViewAll}
                    className="w-full mt-4 h-10 text-[#2F8481] hover:bg-[#2F8481]/10 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1"
                >
                    Visi pranešimai
                    <ChevronRight className="w-4 h-4" />
                </button>
            )}
        </div>
    );
};
