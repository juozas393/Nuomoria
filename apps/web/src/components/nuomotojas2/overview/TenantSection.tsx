import React, { memo } from 'react';
import { User, Phone, Calendar, Plus, ChevronRight } from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface TenantInfo {
    name?: string;
    phone?: string;
    email?: string;
    contractEnd?: string;
    status?: string;
}

interface TenantSectionProps {
    tenant: TenantInfo;
    isVacant: boolean;
    onAddTenant?: () => void;
    onViewTenant?: () => void;
}

// =============================================================================
// HELPERS
// =============================================================================

const formatDate = (dateStr?: string): string => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('lt-LT', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
};

// =============================================================================
// COMPONENT
// =============================================================================

export const TenantSection = memo<TenantSectionProps>(({
    tenant,
    isVacant,
    onAddTenant,
    onViewTenant,
}) => {
    return (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-100">
                <span className="text-sm font-bold text-gray-900">Nuomininkas</span>
            </div>

            {/* Content */}
            <div className="p-4">
                {isVacant ? (
                    /* Empty state */
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <User className="w-5 h-5 text-gray-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-600">Nėra priskirto nuomininko</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                                Pridėkite nuomininką norint valdyti nuomą ir generuoti pajamas
                            </p>
                        </div>
                        <button
                            onClick={onAddTenant}
                            className="flex items-center gap-1.5 px-4 py-2 bg-teal-500 text-white text-sm font-bold rounded-xl hover:bg-teal-600 transition-colors active:scale-[0.98] shadow-sm flex-shrink-0"
                        >
                            <Plus className="w-4 h-4" />
                            Pridėti
                        </button>
                    </div>
                ) : (
                    /* Tenant card */
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {/* Avatar */}
                            <div className="w-12 h-12 bg-gradient-to-br from-teal-100 to-teal-200 rounded-full flex items-center justify-center">
                                <span className="text-lg font-bold text-teal-700">
                                    {tenant.name?.charAt(0).toUpperCase() || 'N'}
                                </span>
                            </div>

                            {/* Info */}
                            <div>
                                <p className="text-sm font-bold text-gray-900">{tenant.name}</p>
                                <div className="flex items-center gap-3 mt-1">
                                    {tenant.phone && (
                                        <span className="flex items-center gap-1 text-xs text-gray-500">
                                            <Phone className="w-3 h-3" />
                                            {tenant.phone}
                                        </span>
                                    )}
                                    {tenant.contractEnd && (
                                        <span className="flex items-center gap-1 text-xs text-gray-500">
                                            <Calendar className="w-3 h-3" />
                                            iki {formatDate(tenant.contractEnd)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* View link */}
                        <button
                            onClick={onViewTenant}
                            className="flex items-center gap-1 text-sm font-bold text-teal-600 hover:text-teal-700 transition-colors"
                        >
                            Nuoma
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
});

TenantSection.displayName = 'TenantSection';

export default TenantSection;
