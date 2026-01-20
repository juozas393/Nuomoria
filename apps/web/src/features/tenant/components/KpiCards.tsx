import React from 'react';
import { DashboardKPIs, STATUS_LABELS } from '../types/tenant.types';
import { Euro, Calendar, Wrench, FileText } from 'lucide-react';

interface KpiCardsProps {
    kpis: DashboardKPIs;
    loading?: boolean;
}

const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleDateString('lt-LT', { month: 'short', day: 'numeric' });
};

const formatRelativeDate = (dateStr: string | null): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.ceil((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Šiandien';
    if (diffDays === 1) return 'Vakar';
    if (diffDays < 7) return `Prieš ${diffDays} d.`;
    return formatDate(dateStr);
};

export const KpiCards: React.FC<KpiCardsProps> = ({ kpis, loading }) => {
    const cards = [
        {
            icon: Euro,
            label: 'Mėnesio nuoma',
            value: `${kpis.monthlyRent} €`,
            badge: STATUS_LABELS.rent[kpis.rentStatus],
            badgeColor: kpis.rentStatus === 'paid'
                ? 'bg-emerald-100 text-emerald-700'
                : kpis.rentStatus === 'overdue'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-amber-100 text-amber-700',
            iconBg: 'bg-[#2F8481]/10',
            iconColor: 'text-[#2F8481]',
        },
        {
            icon: Calendar,
            label: 'Kitas mokėjimas',
            value: formatDate(kpis.nextPaymentDate),
            badge: kpis.daysUntilPayment !== null
                ? `Liko ${kpis.daysUntilPayment} d.`
                : null,
            badgeColor: kpis.daysUntilPayment !== null && kpis.daysUntilPayment <= 5
                ? 'bg-amber-100 text-amber-700'
                : 'bg-gray-100 text-gray-600',
            iconBg: 'bg-blue-50',
            iconColor: 'text-blue-600',
        },
        {
            icon: Wrench,
            label: 'Atviros užklausos',
            value: String(kpis.openMaintenanceCount),
            badge: kpis.inProgressMaintenanceCount > 0
                ? `${kpis.inProgressMaintenanceCount} vykdomos`
                : kpis.openMaintenanceCount === 0
                    ? 'Viskas gerai'
                    : null,
            badgeColor: kpis.openMaintenanceCount === 0
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-amber-100 text-amber-700',
            iconBg: 'bg-orange-50',
            iconColor: 'text-orange-600',
        },
        {
            icon: FileText,
            label: 'Dokumentai',
            value: String(kpis.documentsCount),
            badge: kpis.lastDocumentDate
                ? `Atnaujinta ${formatRelativeDate(kpis.lastDocumentDate)}`
                : null,
            badgeColor: 'bg-gray-100 text-gray-600',
            iconBg: 'bg-purple-50',
            iconColor: 'text-purple-600',
        },
    ];

    if (loading) {
        return (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 animate-pulse">
                        <div className="flex items-start justify-between mb-4">
                            <div className="w-10 h-10 bg-gray-200 rounded-xl" />
                            <div className="w-16 h-5 bg-gray-200 rounded-full" />
                        </div>
                        <div className="w-20 h-8 bg-gray-200 rounded mb-1" />
                        <div className="w-24 h-4 bg-gray-100 rounded" />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((card, index) => {
                const Icon = card.icon;
                return (
                    <div
                        key={index}
                        className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className={`w-10 h-10 ${card.iconBg} rounded-xl flex items-center justify-center`}>
                                <Icon className={`w-5 h-5 ${card.iconColor}`} />
                            </div>
                            {card.badge && (
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${card.badgeColor}`}>
                                    {card.badge}
                                </span>
                            )}
                        </div>
                        <div className="text-2xl font-bold text-gray-900 mb-1">
                            {card.value}
                        </div>
                        <div className="text-sm text-gray-500">
                            {card.label}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
