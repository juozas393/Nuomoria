import React, { memo } from 'react';
import { User, Phone, Mail, Calendar, ChevronRight } from 'lucide-react';
import { TenantCardProps } from './types';

// Standardized animation timings
const ANIMATION = {
    hover: 'duration-150 ease-out',
    press: 'duration-100 ease-out',
} as const;

const cardStyle = {
    backgroundImage: `url('/images/CardsBackground.webp')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
};

export const TenantCard = memo<TenantCardProps>(({
    tenant,
    lease,
    onAddTenant,
    onViewTenant,
}) => {
    const hasTenant = !!tenant;

    // Empty state
    if (!hasTenant) {
        return (
            <div
                className="rounded-2xl border border-gray-100 p-5"
                style={cardStyle}
            >
                <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-white/80 backdrop-blur-sm flex items-center justify-center">
                        <User className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                        <h3 className="text-[15px] font-semibold text-gray-900">Nuomininkas</h3>
                        <p className="text-[13px] text-gray-500">Nėra priskirto nuomininko</p>
                    </div>
                </div>
                {onAddTenant && (
                    <button
                        onClick={onAddTenant}
                        className={`w-full py-2.5 bg-teal-50 hover:bg-teal-100 active:scale-[0.98] text-teal-700 text-[13px] font-semibold rounded-xl transition-colors ${ANIMATION.hover}`}
                    >
                        + Pridėti nuomininką
                    </button>
                )}
            </div>
        );
    }

    // Tenant exists
    return (
        <div
            className={`rounded-2xl border border-gray-100 p-5 transition-colors ${ANIMATION.hover} ${onViewTenant ? 'cursor-pointer hover:border-gray-200 hover:shadow-sm active:scale-[0.99]' : ''
                }`}
            onClick={onViewTenant}
            style={cardStyle}
        >
            <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white font-bold text-[14px]">
                        {tenant.name?.charAt(0).toUpperCase() || 'N'}
                    </div>
                    <div>
                        <h3 className="text-[15px] font-semibold text-gray-900">{tenant.name}</h3>
                        <p className="text-[13px] text-gray-500">Nuomininkas</p>
                    </div>
                </div>
                {onViewTenant && (
                    <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${ANIMATION.hover} group-hover:translate-x-0.5`} />
                )}
            </div>

            <div className="space-y-2">
                {tenant.phone && (
                    <div className="flex items-center gap-2 text-[13px] text-gray-600">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span>{tenant.phone}</span>
                    </div>
                )}
                {tenant.email && (
                    <div className="flex items-center gap-2 text-[13px] text-gray-600">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="truncate">{tenant.email}</span>
                    </div>
                )}
                {lease?.endDate && (
                    <div className="flex items-center gap-2 text-[13px] text-gray-600">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>Sutartis iki {formatDate(lease.endDate)}</span>
                    </div>
                )}
            </div>
        </div>
    );
});

const formatDate = (d?: string) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('lt-LT', { year: 'numeric', month: '2-digit', day: '2-digit' });
};

TenantCard.displayName = 'TenantCard';

export default TenantCard;
