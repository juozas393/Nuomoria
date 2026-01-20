import React from 'react';
import { TenantLease, STATUS_LABELS } from '../types/tenant.types';
import { ScrollText, Calendar, Euro, User, Phone, Mail } from 'lucide-react';

interface LeaseInfoCardProps {
    lease: TenantLease | null;
    loading?: boolean;
}

const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('lt-LT', { year: 'numeric', month: 'long', day: 'numeric' });
};

const calculateDaysRemaining = (endDate: string): number => {
    const end = new Date(endDate);
    const now = new Date();
    return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
};

export const LeaseInfoCard: React.FC<LeaseInfoCardProps> = ({
    lease,
    loading,
}) => {
    if (loading) {
        return (
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm animate-pulse">
                <div className="w-44 h-6 bg-gray-200 rounded mb-6" />
                <div className="space-y-4">
                    <div className="h-5 bg-gray-100 rounded w-3/4" />
                    <div className="h-5 bg-gray-100 rounded w-2/3" />
                    <div className="h-5 bg-gray-100 rounded w-1/2" />
                </div>
            </div>
        );
    }

    if (!lease) {
        return (
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="text-center py-8">
                    <ScrollText className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                    <div className="text-gray-500">Pasirinkite būstą</div>
                </div>
            </div>
        );
    }

    const daysRemaining = calculateDaysRemaining(lease.endDate);
    const isEndingSoon = daysRemaining <= 30 && daysRemaining > 0;

    const infoItems = [
        { label: 'Būstas', value: `${lease.address}, ${lease.unitLabel}`, icon: null },
        { label: 'Nuomos pradžia', value: formatDate(lease.startDate), icon: Calendar },
        {
            label: 'Nuomos pabaiga', value: formatDate(lease.endDate), icon: Calendar,
            badge: isEndingSoon ? `Liko ${daysRemaining} d.` : null,
            badgeColor: isEndingSoon ? 'bg-amber-100 text-amber-700' : ''
        },
        {
            label: 'Depozitas', value: `${lease.depositAmount} €`, icon: Euro,
            badge: lease.depositPaid ? 'Sumokėtas' : 'Nesumokėtas',
            badgeColor: lease.depositPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
        },
        { label: 'Nuomos suma', value: `${lease.rentAmount} €/mėn`, icon: Euro },
        { label: 'Mokėjimo diena', value: `Kiekvieno mėnesio ${lease.paymentDay} d.`, icon: Calendar },
    ];

    if (lease.includedUtilities && lease.includedUtilities.length > 0) {
        infoItems.push({
            label: 'Įtraukta į nuomą',
            value: lease.includedUtilities.join(', '),
            icon: null
        });
    }

    return (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">
                    Sutarties informacija
                </h2>
                <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${lease.status === 'active'
                        ? 'bg-emerald-100 text-emerald-700'
                        : lease.status === 'ending_soon'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-gray-100 text-gray-600'
                    }`}>
                    {STATUS_LABELS.lease[lease.status]}
                </span>
            </div>

            <div className="space-y-4">
                {infoItems.map((item, index) => (
                    <div key={index} className="flex items-start justify-between">
                        <div className="text-sm text-gray-500">
                            {item.label}
                        </div>
                        <div className="flex items-center gap-2 text-right">
                            <span className="text-sm font-medium text-gray-900">
                                {item.value}
                            </span>
                            {item.badge && (
                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${item.badgeColor}`}>
                                    {item.badge}
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Landlord Contact */}
            {(lease.landlordName || lease.landlordPhone || lease.landlordEmail) && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                    <div className="text-sm font-medium text-gray-700 mb-3">
                        Nuomotojo kontaktai
                    </div>
                    <div className="space-y-2">
                        {lease.landlordName && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <User className="w-4 h-4 text-gray-400" />
                                {lease.landlordName}
                            </div>
                        )}
                        {lease.landlordPhone && (
                            <a
                                href={`tel:${lease.landlordPhone}`}
                                className="flex items-center gap-2 text-sm text-[#2F8481] hover:underline"
                            >
                                <Phone className="w-4 h-4" />
                                {lease.landlordPhone}
                            </a>
                        )}
                        {lease.landlordEmail && (
                            <a
                                href={`mailto:${lease.landlordEmail}`}
                                className="flex items-center gap-2 text-sm text-[#2F8481] hover:underline"
                            >
                                <Mail className="w-4 h-4" />
                                {lease.landlordEmail}
                            </a>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
