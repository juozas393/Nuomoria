import React, { memo } from 'react';
import { Home, Settings, MoreHorizontal, Plus, Eye, Edit3 } from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

export type PropertyStatus = 'vacant' | 'occupied' | 'draft' | 'archived' | 'reserved';

interface PropertyInfo {
    id: string;
    address?: string;
    rooms?: number;
    area?: number;
    floor?: number;
    type?: string;
}

interface StatusHeaderProps {
    property: PropertyInfo;
    status: PropertyStatus;
    tenantName?: string;
    onPrimaryCTA?: () => void;
    onSettings?: () => void;
    onMoreMenu?: () => void;
}

// =============================================================================
// HELPERS
// =============================================================================

const getStatusConfig = (status: PropertyStatus, tenantName?: string) => {
    const configs: Record<PropertyStatus, { label: string; color: string; ctaLabel: string; ctaIcon: React.ReactNode }> = {
        vacant: {
            label: 'Laisvas',
            color: 'bg-emerald-500 text-white',
            ctaLabel: 'Pridėti nuomininką',
            ctaIcon: <Plus className="w-3.5 h-3.5" />,
        },
        occupied: {
            label: tenantName || 'Gyvenamas',
            color: 'bg-blue-500 text-white',
            ctaLabel: 'Peržiūrėti nuomą',
            ctaIcon: <Eye className="w-3.5 h-3.5" />,
        },
        draft: {
            label: 'Juodraštis',
            color: 'bg-amber-500 text-white',
            ctaLabel: 'Tęsti nustatymą',
            ctaIcon: <Edit3 className="w-3.5 h-3.5" />,
        },
        archived: {
            label: 'Archyvuotas',
            color: 'bg-gray-500 text-white',
            ctaLabel: 'Atnaujinti',
            ctaIcon: <Edit3 className="w-3.5 h-3.5" />,
        },
        reserved: {
            label: 'Rezervuotas',
            color: 'bg-purple-500 text-white',
            ctaLabel: 'Peržiūrėti',
            ctaIcon: <Eye className="w-3.5 h-3.5" />,
        },
    };
    return configs[status];
};

const translatePropertyType = (type?: string): string => {
    const dict: Record<string, string> = {
        apartment: 'Butas',
        house: 'Namas',
        studio: 'Studija',
        room: 'Kambarys',
        commercial: 'Komercinis',
        flat: 'Butas',
        office: 'Biuras',
    };
    return dict[type?.toLowerCase() || ''] || 'Butas';
};

// =============================================================================
// COMPONENT
// =============================================================================

export const StatusHeader = memo<StatusHeaderProps>(({
    property,
    status,
    tenantName,
    onPrimaryCTA,
    onSettings,
    onMoreMenu,
}) => {
    const config = getStatusConfig(status, tenantName);

    // Build metadata chips
    const chips = [
        translatePropertyType(property.type),
        property.rooms ? `${property.rooms} kamb.` : null,
        property.area ? `${property.area} m²` : null,
        property.floor ? `${property.floor} a.` : null,
    ].filter(Boolean);

    return (
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-lg border-b border-gray-100 px-4 py-3">
            <div className="flex items-center justify-between gap-4">
                {/* Left: Identity */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-teal-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                        <Home className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-sm font-bold text-gray-900 truncate">
                            {property.address || 'Būstas'}
                        </h2>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            {chips.map((chip, i) => (
                                <span
                                    key={i}
                                    className="px-2 py-0.5 bg-gray-100 text-[10px] font-medium text-gray-600 rounded"
                                >
                                    {chip}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Center: Status Badge */}
                <div className="flex-shrink-0">
                    <span className={`px-3 py-1.5 text-xs font-bold rounded-lg ${config.color}`}>
                        {config.label}
                    </span>
                </div>

                {/* Right: Primary CTA + Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                        onClick={onPrimaryCTA}
                        className="flex items-center gap-2 px-4 py-2 bg-teal-500 text-white text-sm font-bold rounded-xl hover:bg-teal-600 transition-colors active:scale-[0.98] shadow-sm"
                    >
                        {config.ctaIcon}
                        <span className="hidden sm:inline">{config.ctaLabel}</span>
                    </button>

                    <div className="h-6 w-px bg-gray-200" />

                    <button
                        onClick={onSettings}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Nustatymai"
                    >
                        <Settings className="w-4.5 h-4.5" />
                    </button>

                    <button
                        onClick={onMoreMenu}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Daugiau"
                    >
                        <MoreHorizontal className="w-4.5 h-4.5" />
                    </button>
                </div>
            </div>
        </div>
    );
});

StatusHeader.displayName = 'StatusHeader';

export default StatusHeader;
