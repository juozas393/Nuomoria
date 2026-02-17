import React, { memo } from 'react';
import { User, Plus, Phone, Calendar, ChevronRight } from 'lucide-react';
import { CardPatternOverlay } from '../../ui/CardPatternOverlay';

// =============================================================================
// TYPES
// =============================================================================

interface TenantInfo {
    name?: string;
    phone?: string;
    contractEnd?: string;
}

interface TenantSummaryCardProps {
    tenant?: TenantInfo;
    isVacant: boolean;
    isPrimary?: boolean;
    onAddTenant?: () => void;
    onViewTenant?: () => void;
}

// =============================================================================
// COMPONENT - COMPACT SPACING
// =============================================================================

export const TenantSummaryCard = memo<TenantSummaryCardProps>(({
    tenant,
    isVacant,
    isPrimary = false,
    onAddTenant,
    onViewTenant,
}) => {
    const formatDate = (dateStr?: string): string => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('lt-LT', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        });
    };

    const primaryCtaClasses = "w-full h-8 px-3 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary-hover transition-colors flex items-center justify-center gap-1.5";
    const secondaryCtaClasses = "flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-primary transition-colors";

    return (
        <div className="relative bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden h-full">
            <CardPatternOverlay />

            {/* COMPACT: p-2.5 instead of p-4 */}
            <div className="relative p-2.5 flex flex-col h-full">
                {/* Header - COMPACT */}
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center">
                        <User className="w-3.5 h-3.5 text-gray-500" />
                    </div>
                    <span className="text-xs font-bold text-gray-900">Nuomininkas</span>
                </div>

                {/* Content */}
                <div className="flex-1 min-h-0">
                    {isVacant ? (
                        <div>
                            <p className="text-xs text-gray-500">Nėra priskirto nuomininko</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">
                                Priskirkite nuomininką, kad galėtumėte valdyti nuomą ir mokėjimus.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            <p className="text-xs font-medium text-gray-900">{tenant?.name}</p>
                            {tenant?.phone && (
                                <div className="flex items-center gap-1 text-[10px] text-gray-500">
                                    <Phone className="w-3 h-3" />
                                    {tenant.phone}
                                </div>
                            )}
                            {tenant?.contractEnd && (
                                <div className="flex items-center gap-1 text-[10px] text-gray-500">
                                    <Calendar className="w-3 h-3" />
                                    iki {formatDate(tenant.contractEnd)}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* CTA - COMPACT */}
                <div className="mt-2 pt-2 border-t border-gray-100">
                    {isVacant ? (
                        <button
                            onClick={onAddTenant}
                            className={isPrimary ? primaryCtaClasses : secondaryCtaClasses}
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Pridėti nuomininką
                        </button>
                    ) : (
                        <button
                            onClick={onViewTenant}
                            className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-primary transition-colors"
                        >
                            Peržiūrėti
                            <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
});

TenantSummaryCard.displayName = 'TenantSummaryCard';

export default TenantSummaryCard;
