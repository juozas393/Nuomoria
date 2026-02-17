import React, { memo } from 'react';
import { Home, Settings, ExternalLink } from 'lucide-react';
import { CardPatternOverlay } from '../../ui/CardPatternOverlay';

// =============================================================================
// TYPES
// =============================================================================

type PropertyStatus = 'vacant' | 'occupied' | 'draft' | 'archived' | 'reserved';

interface PrimaryAction {
    label: string;
    onClick?: () => void;
}

interface PropertyHeroCardProps {
    address: string;
    propertyType?: string;
    rooms?: number;
    status: PropertyStatus;
    readinessPercent?: number;
    missingTasks?: string[];
    primaryAction?: PrimaryAction | null;
    onViewProperty?: () => void;
    onSettings?: () => void;
}

// =============================================================================
// HELPERS
// =============================================================================

const getStatusConfig = (status: PropertyStatus) => {
    const configs: Record<PropertyStatus, { label: string; variant: 'success' | 'default' | 'warning' | 'neutral' }> = {
        vacant: { label: 'Laisvas', variant: 'success' },
        occupied: { label: 'Užimtas', variant: 'default' },
        draft: { label: 'Juodraštis', variant: 'warning' },
        archived: { label: 'Archyvuotas', variant: 'neutral' },
        reserved: { label: 'Rezervuotas', variant: 'default' },
    };
    return configs[status];
};

const translatePropertyType = (type?: string): string => {
    const dict: Record<string, string> = {
        apartment: 'Butas',
        house: 'Namas',
        studio: 'Studija',
        room: 'Kambarys',
        flat: 'Butas',
    };
    return dict[type?.toLowerCase() || ''] || 'Butas';
};

// Map task IDs to readable Lithuanian labels
const TASK_LABELS: Record<string, string> = {
    photos: 'nuotraukos',
    price: 'kaina',
    info: 'būsto info',
    tenant: 'nuomininkas',
};

// =============================================================================
// COMPONENT - COMPACT SPACING
// =============================================================================

export const PropertyHeroCard = memo<PropertyHeroCardProps>(({
    address,
    propertyType,
    rooms,
    status,
    missingTasks = [],
    primaryAction,
    onViewProperty,
    onSettings,
}) => {
    const statusConfig = getStatusConfig(status);
    const isReady = missingTasks.length === 0;

    const missingSummary = isReady
        ? null
        : `Trūksta: ${missingTasks.map(t => TASK_LABELS[t] || t).join(' • ')}`;

    const badgeClasses: Record<string, string> = {
        success: 'bg-primary-light text-primary border border-primary/20',
        default: 'bg-primary-light text-primary border border-primary/20',
        warning: 'bg-amber-50 text-amber-700 border border-amber-200',
        neutral: 'bg-gray-100 text-gray-600 border border-gray-200',
    };

    return (
        <div className="relative bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden h-full">
            <CardPatternOverlay />

            {/* COMPACT: p-2.5 instead of p-4 */}
            <div className="relative p-2.5 flex flex-col h-full">
                {/* Identity + Status */}
                <div className="flex items-start justify-between mb-2">
                    <div className="flex items-start gap-2">
                        {/* COMPACT: w-8 h-8 instead of w-10 h-10 */}
                        <div className="w-8 h-8 bg-primary-light rounded-lg flex items-center justify-center flex-shrink-0">
                            <Home className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-sm font-bold text-gray-900 truncate">{address}</h3>
                            <p className="text-xs text-gray-500">
                                {translatePropertyType(propertyType)}
                                {rooms ? ` • ${rooms} kamb.` : ''}
                            </p>
                            {missingSummary && (
                                <p className="text-[10px] text-gray-400 mt-0.5 truncate">{missingSummary}</p>
                            )}
                        </div>
                    </div>

                    {/* Status badges - COMPACT */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className={`inline-flex items-center px-1.5 py-0.5 text-[9px] font-medium rounded ${isReady
                            ? 'bg-primary-light text-primary'
                            : 'bg-gray-100 text-gray-500'
                            }`}>
                            {isReady ? 'Paruošta' : 'Neparuošta'}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded ${badgeClasses[statusConfig.variant]}`}>
                            <span className="w-1 h-1 rounded-full bg-current opacity-80" />
                            {statusConfig.label}
                        </span>
                    </div>
                </div>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Actions - COMPACT */}
                <div className="flex items-center gap-2 flex-wrap">
                    {primaryAction && (
                        <button
                            onClick={primaryAction.onClick}
                            className="h-7 px-2.5 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary-hover transition-colors"
                        >
                            {primaryAction.label}
                        </button>
                    )}

                    <button
                        onClick={onViewProperty}
                        className="flex items-center gap-1 px-1.5 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded transition-colors"
                    >
                        <ExternalLink className="w-3 h-3" />
                        Peržiūrėti būstą
                    </button>

                    <button
                        onClick={onSettings}
                        className="flex items-center gap-1 px-1.5 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded transition-colors"
                    >
                        <Settings className="w-3.5 h-3.5" />
                        Nustatymai
                    </button>
                </div>
            </div>
        </div>
    );
});

PropertyHeroCard.displayName = 'PropertyHeroCard';

export default PropertyHeroCard;
