import React, { useState, useCallback, memo } from 'react';
import {
    Home, Edit3, Plus, Check, Settings, ChevronDown, ChevronUp
} from 'lucide-react';
import { PhotoGallerySection } from './PhotoGallerySection';
import { UnitEditDrawer } from './UnitEditDrawer';
import { QuickPanel } from './QuickPanel';

// ============================================================================
// ANIMATION & STYLE CONSTANTS
// ============================================================================
const ANIMATION = {
    hover: 'duration-150 ease-out',
} as const;

const cardStyle = {
    backgroundImage: `url('/images/FormsBackground.png')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
};

// ============================================================================
// TYPES
// ============================================================================
interface ExtendedPropertyInfo {
    id: string;
    address?: string;
    apartment_number?: string;
    rooms?: number;
    area?: number;
    floor?: number;
    floors_total?: number;
    type?: string;
    property_type?: string;
    status?: string;
    rent?: number;
    deposit_amount?: number;
    contract_start?: string;
    contract_end?: string;
    extended_details?: {
        amenities?: string[];
        heating_type?: 'centrinis' | 'dujinis' | 'elektra' | 'grindinis' | 'kita';
        energy_class?: 'A++' | 'A+' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
        furnished?: 'full' | 'partial' | 'none';
        parking_type?: 'street' | 'yard' | 'underground' | 'none';
        parking_spots?: number;
        balcony?: boolean;
        storage?: boolean;
        bathrooms?: number;
        bedrooms?: number;
        min_term_months?: number;
        pets_allowed?: boolean;
        pets_deposit?: number;
        smoking_allowed?: boolean;
        utilities_paid_by?: 'tenant' | 'landlord' | 'mixed';
        payment_due_day?: number;
        notes_internal?: string;
    };
}

interface PropertyDetailsTabProps {
    property: ExtendedPropertyInfo;
    tenant?: any;
    meters?: any[];
    photos?: string[];
    onNavigateTab?: (tab: string) => void;
    onEditProperty?: () => void;
    onSaveProperty?: (updates: Partial<ExtendedPropertyInfo>) => Promise<void>;
    onUploadPhoto?: () => void;
    onReorderPhotos?: (photos: string[]) => void;
    onDeletePhoto?: (index: number) => void;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
const hasMeaningfulValue = (value: any): boolean => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'number' && value === 0) return false;
    if (typeof value === 'string' && (!value || value.toLowerCase() === 'none')) return false;
    return true;
};

const translatePropertyType = (type?: string): string => {
    const dict: Record<string, string> = {
        'apartment': 'Butas', 'house': 'Namas', 'studio': 'Studija',
        'room': 'Kambarys', 'commercial': 'Komercinis', 'flat': 'Butas', 'office': 'Biuras'
    };
    return dict[type?.toLowerCase() || ''] || type || 'Butas';
};

const translateHeatingType = (type?: string): string => {
    const dict: Record<string, string> = {
        'centrinis': 'Centrinis', 'dujinis': 'Dujinis', 'elektra': 'Elektrinis',
        'grindinis': 'Grindinis', 'kita': 'Kita'
    };
    return dict[type || ''] || '';
};

const translateFurnished = (type?: string): string => {
    const dict: Record<string, string> = {
        'full': 'Pilnas', 'partial': 'Dalinis', 'none': 'Be baldų'
    };
    return dict[type || ''] || '';
};

const translateParkingType = (type?: string): string => {
    const dict: Record<string, string> = {
        'street': 'Gatvėje', 'yard': 'Kieme', 'underground': 'Požeminis', 'none': 'Nėra'
    };
    return dict[type || ''] || '';
};

// ============================================================================
// STATUS BADGE COMPONENT
// ============================================================================
const StatusBadge = memo<{ status?: string }>(({ status }) => {
    const statusConfig: Record<string, { label: string; color: string }> = {
        'vacant': { label: 'Laisvas', color: 'bg-amber-100 text-amber-700' },
        'occupied': { label: 'Išnuomotas', color: 'bg-emerald-100 text-emerald-700' },
        'reserved': { label: 'Rezervuotas', color: 'bg-blue-100 text-blue-700' },
        'maintenance': { label: 'Remontas', color: 'bg-gray-100 text-gray-700' },
        'active': { label: 'Aktyvus', color: 'bg-emerald-100 text-emerald-700' },
    };

    const config = statusConfig[status?.toLowerCase() || 'vacant'] || statusConfig.vacant;

    return (
        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${config.color}`}>
            {config.label}
        </span>
    );
});
StatusBadge.displayName = 'StatusBadge';

// ============================================================================
// INFO ROW WITH EMPTY STATE CTA
// ============================================================================
interface InfoRowProps {
    label: string;
    value: any;
    unit?: string;
    onAdd?: () => void;
}

const InfoRow = memo<InfoRowProps>(({ label, value, unit, onAdd }) => (
    <div className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-b-0">
        <span className="text-sm text-gray-500">{label}</span>
        {hasMeaningfulValue(value) ? (
            <span className="text-sm font-medium text-gray-900">
                {value}{unit ? ` ${unit}` : ''}
            </span>
        ) : (
            <button
                onClick={onAdd}
                className="text-xs text-teal-600 font-medium hover:text-teal-700 transition-colors"
            >
                Pridėti
            </button>
        )}
    </div>
));
InfoRow.displayName = 'InfoRow';

// ============================================================================
// AMENITIES LIST
// ============================================================================
const AMENITIES_LIST: Record<string, string> = {
    'internet': 'Internetas',
    'washing_machine': 'Skalbimo mašina',
    'dishwasher': 'Indaplovė',
    'air_conditioning': 'Kondicionierius',
    'elevator': 'Liftas',
    'tv': 'Televizorius',
    'fridge': 'Šaldytuvas',
    'stove': 'Viryklė',
    'oven': 'Orkaitė',
    'microwave': 'Mikrobangų krosnelė',
};

// ============================================================================
// SUMMARY CHIPS FOR COLLAPSED ACCORDION
// ============================================================================
const SummaryChips = memo<{ extendedDetails: ExtendedPropertyInfo['extended_details'] }>(({ extendedDetails }) => {
    if (!extendedDetails) return null;

    const chips: { label: string; value: string }[] = [];

    if (extendedDetails.parking_type && extendedDetails.parking_type !== 'none') {
        chips.push({ label: 'Parkavimas', value: translateParkingType(extendedDetails.parking_type) });
    }
    if (extendedDetails.pets_allowed !== undefined) {
        chips.push({ label: 'Gyvūnai', value: extendedDetails.pets_allowed ? 'Taip' : 'Ne' });
    }
    if (extendedDetails.furnished) {
        chips.push({ label: 'Baldai', value: translateFurnished(extendedDetails.furnished) });
    }
    if (extendedDetails.amenities && extendedDetails.amenities.length > 0) {
        chips.push({ label: 'Patogumai', value: `${extendedDetails.amenities.length}` });
    }

    if (chips.length === 0) return null;

    return (
        <div className="flex flex-wrap gap-1.5 mt-2">
            {chips.slice(0, 4).map(({ label, value }) => (
                <span key={label} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                    {label}: <span className="font-medium">{value}</span>
                </span>
            ))}
        </div>
    );
});
SummaryChips.displayName = 'SummaryChips';

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export const PropertyDetailsTab: React.FC<PropertyDetailsTabProps> = ({
    property,
    tenant,
    meters = [],
    photos = [],
    onNavigateTab,
    onEditProperty,
    onSaveProperty,
    onUploadPhoto,
    onReorderPhotos,
    onDeletePhoto
}) => {
    const [papildomaOpen, setPapildomaOpen] = useState(false);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const extendedDetails = property.extended_details || {};

    const openDrawer = useCallback(() => setIsDrawerOpen(true), []);
    const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);

    const handleSaveProperty = useCallback(async (updates: Partial<ExtendedPropertyInfo>) => {
        if (onSaveProperty) {
            await onSaveProperty(updates);
        }
    }, [onSaveProperty]);

    // Calculate property completeness percentage
    const completeness = React.useMemo(() => {
        const fields = [
            !!property.address,
            !!property.rooms,
            !!property.area,
            !!property.floor,
            !!property.type || !!property.property_type,
            photos.length >= 3, // at least 3 photos
            !!extendedDetails.heating_type,
            !!extendedDetails.furnished,
        ];
        const filled = fields.filter(Boolean).length;
        return Math.round((filled / fields.length) * 100);
    }, [property, photos.length, extendedDetails]);

    const hasCover = photos.length > 0;

    return (
        <div className="space-y-4">
            {/* === TOP ROW: 2-column grid (Photos + Quick Panel) === */}
            <div className="grid lg:grid-cols-[1fr_280px] gap-4">
                {/* Left: Photo Gallery */}
                <PhotoGallerySection
                    photos={photos}
                    propertyId={property.id}
                    onUploadPhoto={onUploadPhoto}
                    onReorderPhotos={onReorderPhotos}
                    onDeletePhoto={onDeletePhoto}
                />

                {/* Right: Quick Panel (visible on lg+) */}
                <div className="hidden lg:block">
                    <QuickPanel
                        property={property}
                        photosCount={photos.length}
                        hasCover={hasCover}
                        completeness={completeness}
                        onEditProperty={openDrawer}
                        onUploadPhoto={onUploadPhoto}
                    />
                </div>
            </div>

            {/* === 2. PAGRINDINĖ INFORMACIJA === */}
            <div className="card-surface overflow-hidden" style={cardStyle}>
                <div className="p-3 border-b border-gray-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-white/80 rounded-lg flex items-center justify-center">
                            <Home className="w-4 h-4 text-gray-600" />
                        </div>
                        <h3 className="text-sm font-semibold text-gray-900">Pagrindinė informacija</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <StatusBadge status={property.status} />
                        <button
                            onClick={openDrawer}
                            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-teal-700 hover:text-teal-800 hover:bg-white/80 rounded-lg transition-colors duration-150"
                        >
                            <Edit3 className="w-3 h-3" />
                            Redaguoti
                        </button>
                    </div>
                </div>
                <div className="p-3">
                    <div className="grid grid-cols-2 gap-x-8">
                        <InfoRow label="Adresas" value={property.address} onAdd={openDrawer} />
                        <InfoRow label="Tipas" value={translatePropertyType(property.type || property.property_type)} onAdd={openDrawer} />
                        <InfoRow label="Kambariai" value={property.rooms} onAdd={openDrawer} />
                        <InfoRow label="Plotas" value={property.area} unit="m²" onAdd={openDrawer} />
                        <InfoRow label="Aukštas" value={property.floor ? `${property.floor}${property.floors_total ? `/${property.floors_total}` : ''}` : undefined} onAdd={openDrawer} />
                    </div>
                </div>
            </div>

            {/* === 3. PAPILDOMA INFORMACIJA (COLLAPSED) === */}
            <div className="card-surface overflow-hidden" style={cardStyle}>
                <button
                    onClick={() => setPapildomaOpen(!papildomaOpen)}
                    className="w-full p-3 flex items-center justify-between hover:bg-white/50 transition-colors duration-150"
                >
                    <div className="flex items-center gap-2 flex-1">
                        <div className="w-7 h-7 bg-white/80 rounded-lg flex items-center justify-center">
                            <Settings className="w-4 h-4 text-gray-600" />
                        </div>
                        <div className="text-left flex-1">
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-semibold text-gray-900">Papildoma informacija</h3>
                            </div>
                            {/* Show summary chips when collapsed */}
                            {!papildomaOpen && <SummaryChips extendedDetails={extendedDetails} />}
                        </div>
                    </div>
                    {papildomaOpen ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                </button>

                {papildomaOpen && (
                    <div className="border-t border-gray-100/50">
                        {/* Parameters */}
                        <div className="p-4 border-b border-gray-50/50">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Parametrai</h4>
                                <button
                                    onClick={openDrawer}
                                    className={`text-xs text-teal-600 font-medium hover:text-teal-700 transition-colors ${ANIMATION.hover}`}
                                >
                                    Redaguoti
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-x-8">
                                <InfoRow label="Miegamieji" value={extendedDetails.bedrooms} onAdd={openDrawer} />
                                <InfoRow label="Vonios" value={extendedDetails.bathrooms} onAdd={openDrawer} />
                                <InfoRow label="Balkonas" value={extendedDetails.balcony === true ? 'Taip' : extendedDetails.balcony === false ? 'Ne' : undefined} onAdd={openDrawer} />
                                <InfoRow label="Sandėliukas" value={extendedDetails.storage === true ? 'Taip' : extendedDetails.storage === false ? 'Ne' : undefined} onAdd={openDrawer} />
                                <InfoRow label="Parkavimas" value={translateParkingType(extendedDetails.parking_type)} onAdd={openDrawer} />
                                <InfoRow label="Šildymas" value={translateHeatingType(extendedDetails.heating_type)} onAdd={openDrawer} />
                                <InfoRow label="Įrengimas" value={translateFurnished(extendedDetails.furnished)} onAdd={openDrawer} />
                                <InfoRow label="Energ. klasė" value={extendedDetails.energy_class} onAdd={openDrawer} />
                            </div>
                        </div>

                        {/* Amenities */}
                        <div className="p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Patogumai</h4>
                                <button
                                    onClick={openDrawer}
                                    className={`text-xs text-teal-600 font-medium hover:text-teal-700 transition-colors ${ANIMATION.hover}`}
                                >
                                    Redaguoti
                                </button>
                            </div>
                            {extendedDetails.amenities && extendedDetails.amenities.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                    {extendedDetails.amenities.map(amenity => (
                                        <span key={amenity} className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 text-teal-700 rounded-lg text-xs font-medium">
                                            <Check className="w-3 h-3" />
                                            {AMENITIES_LIST[amenity] || amenity}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <button
                                    onClick={openDrawer}
                                    className={`flex items-center gap-1.5 text-sm text-teal-600 font-medium hover:text-teal-700 transition-colors ${ANIMATION.hover}`}
                                >
                                    <Plus className="w-4 h-4" />
                                    Pridėti patogumų
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* === UNIT EDIT DRAWER === */}
            <UnitEditDrawer
                isOpen={isDrawerOpen}
                onClose={closeDrawer}
                property={property}
                onSave={handleSaveProperty}
            />
        </div>
    );
};

export default PropertyDetailsTab;
