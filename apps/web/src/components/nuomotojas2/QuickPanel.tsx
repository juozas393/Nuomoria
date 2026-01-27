import React, { memo } from 'react';
import { Edit3, Camera, Home, Plus, Layers, MapPin } from 'lucide-react';

// ============================================================================
// QUICK PANEL - Right sidebar for Unit tab
// ============================================================================

interface QuickPanelProps {
    property: {
        id: string;
        status?: string;
        rooms?: number;
        area?: number;
        floor?: number;
        floors_total?: number;
        type?: string;
        property_type?: string;
    };
    photosCount: number;
    recommendedPhotos?: number;
    hasCover?: boolean;
    completeness?: number;
    onEditProperty: () => void;
    onUploadPhoto?: () => void;
}

// Status configuration
const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
    'vacant': { label: 'Laisvas', color: 'text-amber-700', bgColor: 'bg-amber-50 border-amber-200' },
    'occupied': { label: 'Išnuomotas', color: 'text-emerald-700', bgColor: 'bg-emerald-50 border-emerald-200' },
    'reserved': { label: 'Rezervuotas', color: 'text-blue-700', bgColor: 'bg-blue-50 border-blue-200' },
    'maintenance': { label: 'Remontas', color: 'text-gray-700', bgColor: 'bg-gray-50 border-gray-200' },
};

// Property type translation
const translateType = (type?: string): string => {
    const dict: Record<string, string> = {
        'apartment': 'Butas', 'house': 'Namas', 'studio': 'Studija',
        'room': 'Kambarys', 'commercial': 'Komercinis'
    };
    return dict[type?.toLowerCase() || ''] || 'Butas';
};

// ============================================================================
// STATUS CARD
// ============================================================================
const StatusCard = memo<{ status?: string; onEdit: () => void; completeness?: number }>(({ status, onEdit, completeness = 0 }) => {
    const config = STATUS_CONFIG[status?.toLowerCase() || 'vacant'] || STATUS_CONFIG.vacant;

    return (
        <div className="surface-1 p-3">
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Būsena</span>
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${config.bgColor} ${config.color}`}>
                    {config.label}
                </span>
            </div>

            {/* Completeness indicator */}
            <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                <span>Užpildymas</span>
                <span className={completeness >= 80 ? 'text-emerald-600 font-medium' : completeness >= 50 ? 'text-amber-600 font-medium' : 'text-gray-400'}>
                    {completeness}%
                </span>
            </div>
            <div className="h-1 bg-gray-100 rounded-full overflow-hidden mb-3">
                <div
                    className={`h-full rounded-full transition-all duration-300 ${completeness >= 80 ? 'bg-emerald-500' : completeness >= 50 ? 'bg-amber-400' : 'bg-gray-300'
                        }`}
                    style={{ width: `${completeness}%` }}
                />
            </div>

            <button
                onClick={onEdit}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-lg transition-colors duration-150"
            >
                <Edit3 className="w-3.5 h-3.5" />
                Redaguoti būstą
            </button>
        </div>
    );
});
StatusCard.displayName = 'StatusCard';

// ============================================================================
// PHOTO HINT CARD
// ============================================================================
const PhotoHintCard = memo<{ count: number; recommended: number; hasCover?: boolean; onUpload?: () => void }>(({ count, recommended, hasCover = false, onUpload }) => {
    const progress = Math.min((count / recommended) * 100, 100);
    const needsMore = count < recommended;

    return (
        <div className="surface-1 p-3">
            <div className="flex items-center gap-2 mb-2">
                <Camera className="w-4 h-4 text-gray-500" />
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Nuotraukos</span>
            </div>

            <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-gray-900">{count} iš {recommended}</span>
                {needsMore && (
                    <span className="text-xs text-amber-600 font-medium">Rekomenduojama daugiau</span>
                )}
            </div>

            {/* Cover status */}
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
                <span>Viršelis:</span>
                {hasCover ? (
                    <span className="text-emerald-600 font-medium">✓ Nustatytas</span>
                ) : (
                    <span className="text-gray-400">Nenustatytas</span>
                )}
            </div>

            {/* Progress bar */}
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-3">
                <div
                    className={`h-full rounded-full transition-all duration-300 ${needsMore ? 'bg-amber-400' : 'bg-emerald-500'}`}
                    style={{ width: `${progress}%` }}
                />
            </div>

            {needsMore && onUpload && (
                <button
                    onClick={onUpload}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 border border-gray-200 hover:border-teal-400 hover:bg-teal-50 text-gray-700 hover:text-teal-700 text-sm font-medium rounded-lg transition-colors duration-150"
                >
                    <Plus className="w-3.5 h-3.5" />
                    Įkelti daugiau
                </button>
            )}
        </div>
    );
});
PhotoHintCard.displayName = 'PhotoHintCard';

// ============================================================================
// KEY FACTS CARD
// ============================================================================
const KeyFactsCard = memo<{
    rooms?: number;
    area?: number;
    floor?: number;
    floorsTotal?: number;
    type?: string;
    onEdit: () => void;
}>(({ rooms, area, floor, floorsTotal, type, onEdit }) => {
    const allFacts = [
        { label: 'Tipas', value: translateType(type), hasValue: true },
        { label: 'Kambariai', value: rooms ? `${rooms}k` : null, hasValue: !!rooms },
        { label: 'Plotas', value: area ? `${area} m²` : null, hasValue: !!area },
        { label: 'Aukštas', value: floor ? `${floor}${floorsTotal ? `/${floorsTotal}` : ''}` : null, hasValue: !!floor },
    ];

    return (
        <div className="surface-1 p-3">
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Būsto faktai</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
                {allFacts.map(({ label, value, hasValue }) => (
                    hasValue ? (
                        <span
                            key={label}
                            className="px-2 py-1 bg-gray-50 border border-gray-100 rounded-md text-xs font-medium text-gray-700"
                        >
                            {value}
                        </span>
                    ) : (
                        <button
                            key={label}
                            onClick={onEdit}
                            className="px-2 py-1 bg-gray-50/50 border border-dashed border-gray-200 rounded-md text-xs text-gray-400 hover:border-teal-400 hover:text-teal-600 hover:bg-teal-50 transition-colors duration-150"
                        >
                            {label}: Pridėti
                        </button>
                    )
                ))}
            </div>
        </div>
    );
});
KeyFactsCard.displayName = 'KeyFactsCard';

// ============================================================================
// MAIN QUICK PANEL
// ============================================================================

export const QuickPanel: React.FC<QuickPanelProps> = ({
    property,
    photosCount,
    recommendedPhotos = 8,
    hasCover = false,
    completeness = 0,
    onEditProperty,
    onUploadPhoto,
}) => {
    return (
        <div className="space-y-3">
            <StatusCard
                status={property.status}
                onEdit={onEditProperty}
                completeness={completeness}
            />
            <PhotoHintCard
                count={photosCount}
                recommended={recommendedPhotos}
                hasCover={hasCover}
                onUpload={onUploadPhoto}
            />
            <KeyFactsCard
                rooms={property.rooms}
                area={property.area}
                floor={property.floor}
                floorsTotal={property.floors_total}
                type={property.type || property.property_type}
                onEdit={onEditProperty}
            />
        </div>
    );
};

export default QuickPanel;

