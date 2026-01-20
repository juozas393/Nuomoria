import React, { useState } from 'react';
import {
    User, Home, Phone, Calendar, Euro, FileText, Droplets, Clock,
    Camera, MapPin, Building2, Layers, Ruler, Edit3, Plus, ChevronLeft, ChevronRight,
    Zap, Thermometer, Wifi, CheckCircle2, Circle, ArrowRight, Settings, MessageSquare, AlertCircle, X
} from 'lucide-react';

// Types
interface Tenant {
    name: string;
    email?: string;
    phone?: string;
    status?: 'vacant' | 'expired' | 'pending' | 'moving_out' | 'active';
    contractStart?: string;
    contractEnd?: string;
    monthlyRent?: number;
    deposit?: number;
    photos?: string[];
}

interface PropertyInfo {
    id: string;
    address?: string;
    rooms?: number;
    area?: number;
    floor?: number;
    type?: string;
    status?: string;
}

interface AddressInfo {
    buildingType?: string;
    totalApartments?: number;
    floors?: number;
    yearBuilt?: number;
    managementType?: string;
    chairmanName?: string;
    chairmanPhone?: string;
}

interface MoveOut {
    notice?: string;
    planned?: string;
    status?: string;
}

// Occupancy state
type OccupancyState = 'VACANT' | 'RESERVED' | 'OCCUPIED' | 'NOTICE_GIVEN' | 'MOVED_OUT_PENDING';

const hasMeaningfulValue = (value: any): boolean => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'number' && value === 0) return false;
    if (typeof value === 'string' && (!value || value.toLowerCase() === 'none')) return false;
    return true;
};

const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString('lt-LT', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '—';

const translatePropertyType = (type?: string): string => {
    const dict: Record<string, string> = {
        'apartment': 'Butas', 'house': 'Namas', 'studio': 'Studija',
        'room': 'Kambarys', 'commercial': 'Komercinis', 'flat': 'Butas', 'office': 'Biuras'
    };
    return dict[type?.toLowerCase() || ''] || type || 'Butas';
};

const getOccupancyState = (tenant: any, moveOut: any): OccupancyState => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!tenant?.name || tenant.name === 'Laisvas' || tenant.status === 'vacant') {
        return 'VACANT';
    }

    const leaseStart = tenant.contractStart ? new Date(tenant.contractStart) : null;
    const leaseEnd = tenant.contractEnd ? new Date(tenant.contractEnd) : null;
    const moveOutDate = moveOut?.planned ? new Date(moveOut.planned) : null;

    if (leaseStart && leaseStart > today) return 'RESERVED';
    if (moveOutDate && moveOutDate < today && hasMeaningfulValue(moveOut?.status)) return 'MOVED_OUT_PENDING';
    if (moveOutDate && moveOutDate >= today) return 'NOTICE_GIVEN';
    if (leaseEnd && leaseEnd < today) return 'MOVED_OUT_PENDING';

    return 'OCCUPIED';
};

const getOccupancyLabel = (state: OccupancyState): string => {
    const labels: Record<OccupancyState, string> = {
        'VACANT': 'Laisvas', 'RESERVED': 'Rezervuotas', 'OCCUPIED': 'Gyvenamas',
        'NOTICE_GIVEN': 'Išsikraustymas', 'MOVED_OUT_PENDING': 'Laukia uždarymo'
    };
    return labels[state];
};

const getOccupancyColor = (state: OccupancyState): string => {
    const colors: Record<OccupancyState, string> = {
        'VACANT': 'bg-neutral-100 text-neutral-700 border-neutral-200',
        'RESERVED': 'bg-blue-50 text-blue-700 border-blue-200',
        'OCCUPIED': 'bg-emerald-50 text-emerald-700 border-emerald-200',
        'NOTICE_GIVEN': 'bg-amber-50 text-amber-700 border-amber-200',
        'MOVED_OUT_PENDING': 'bg-rose-50 text-rose-700 border-rose-200'
    };
    return colors[state];
};

interface PremiumOverviewProps {
    tenant: Tenant;
    property: PropertyInfo;
    moveOut: MoveOut;
    addressInfo?: AddressInfo;
    meters?: any[];
    onAddTenant?: () => void;
    onCreateLease?: () => void;
    onAddPayment?: () => void;
    onEditProperty?: () => void;
    onUploadPhoto?: () => void;
    onNavigateTab?: (tab: string) => void;
    onShowNotes?: () => void;
    onReorderPhotos?: (photos: string[]) => void;
    onDeletePhoto?: (index: number) => void;
}

export const PremiumOverviewTab: React.FC<PremiumOverviewProps> = ({
    tenant,
    property,
    moveOut,
    addressInfo,
    meters = [],
    onAddTenant,
    onCreateLease,
    onAddPayment,
    onEditProperty,
    onUploadPhoto,
    onNavigateTab,
    onShowNotes,
    onReorderPhotos,
    onDeletePhoto
}) => {
    const occupancyState = getOccupancyState(tenant, moveOut);
    const isVacant = occupancyState === 'VACANT';
    const photos = tenant.photos || [];
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);

    // Zoom state for lightbox
    const [zoomLevel, setZoomLevel] = useState(1);
    const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });

    // Edit mode for reordering/deleting
    const [editMode, setEditMode] = useState(false);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    // Open lightbox with specific photo
    const openLightbox = (index: number) => {
        setLightboxIndex(index);
        setZoomLevel(1);
        setPanPosition({ x: 0, y: 0 });
        setLightboxOpen(true);
    };

    // Close lightbox and reset zoom
    const closeLightbox = () => {
        setLightboxOpen(false);
        setZoomLevel(1);
        setPanPosition({ x: 0, y: 0 });
    };

    // Handle zoom via mouse wheel - SMOOTH
    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const delta = e.deltaY > 0 ? -0.2 : 0.2; // Smaller increments for smooth zoom
        setZoomLevel(prev => {
            const newZoom = Math.max(1, Math.min(4, prev + delta));
            if (newZoom <= 1) {
                setPanPosition({ x: 0, y: 0 });
            }
            return newZoom;
        });
    };

    // Handle SINGLE click to cycle zoom levels (1x → 2x → 3x → 1x)
    // FIXED: Only trigger if user wasn't panning
    const [wasPanning, setWasPanning] = useState(false);

    const handleImageClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        // Don't zoom if user was just panning
        if (wasPanning) {
            setWasPanning(false);
            return;
        }
        if (zoomLevel === 1) {
            setZoomLevel(2);
        } else if (zoomLevel < 2.5) {
            setZoomLevel(3);
        } else {
            setZoomLevel(1);
            setPanPosition({ x: 0, y: 0 });
        }
    };

    // Handle double-click to toggle max zoom
    const handleDoubleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (wasPanning) return; // Ignore if was panning
        if (zoomLevel > 1) {
            setZoomLevel(1);
            setPanPosition({ x: 0, y: 0 });
        } else {
            setZoomLevel(3);
        }
    };

    // Pan handlers for zoomed image
    const handleMouseDown = (e: React.MouseEvent) => {
        if (zoomLevel > 1) {
            e.preventDefault();
            setIsPanning(true);
            setWasPanning(false);
            setPanStart({ x: e.clientX - panPosition.x, y: e.clientY - panPosition.y });
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isPanning && zoomLevel > 1) {
            setWasPanning(true); // Mark that we actually moved
            setPanPosition({
                x: e.clientX - panStart.x,
                y: e.clientY - panStart.y
            });
        }
    };

    const handleMouseUp = () => {
        setIsPanning(false);
    };

    // Drag and drop for reordering with VISUAL PREVIEW
    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedIndex(index);

        // Create custom drag image
        const img = e.currentTarget.querySelector('img');
        if (img) {
            // Create a styled drag preview element
            const dragPreview = document.createElement('div');
            dragPreview.style.cssText = `
                width: 120px;
                height: 90px;
                background-image: url(${photos[index]});
                background-size: cover;
                background-position: center;
                border-radius: 12px;
                box-shadow: 0 20px 40px rgba(0,0,0,0.3);
                border: 3px solid #2F8481;
                transform: rotate(-3deg);
            `;
            document.body.appendChild(dragPreview);
            e.dataTransfer.setDragImage(dragPreview, 60, 45);

            // Clean up after drag starts
            setTimeout(() => {
                document.body.removeChild(dragPreview);
            }, 0);
        }

        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverIndex(index);
    };

    const handleDrop = (index: number) => {
        if (draggedIndex !== null && draggedIndex !== index && onReorderPhotos) {
            const newPhotos = [...photos];
            const [dragged] = newPhotos.splice(draggedIndex, 1);
            newPhotos.splice(index, 0, dragged);
            onReorderPhotos(newPhotos);
        }
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    // Calculate checklist status
    const hasPropertyData = hasMeaningfulValue(property.rooms) || hasMeaningfulValue(property.area);
    const hasRentPrice = hasMeaningfulValue(tenant.monthlyRent);
    const hasTenant = !isVacant;
    const hasLease = hasMeaningfulValue(tenant.contractStart);

    // Calculate meters needing attention
    const pendingMeters = meters.filter(m => !m.lastReading || m.status === 'waiting').length;

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* LEFT COLUMN - Main Content (2/3 width) */}
                <div className="md:col-span-2 space-y-4">

                    {/* COMPACT PHOTO CARD for VACANT / FULL GALLERY for OCCUPIED */}
                    {isVacant ? (
                        // VACANT: Dynamic photo grid based on photo count
                        <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-sm">
                            {photos.length === 0 ? (
                                // No photos - placeholder with CTA
                                <div className="flex items-center gap-4">
                                    <div className="w-20 h-20 bg-neutral-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <Camera className="w-8 h-8 text-neutral-300" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-neutral-900 mb-1">Būsto nuotraukos</h3>
                                        <p className="text-sm text-neutral-500 mb-2">Pridėkite nuotraukas pritraukti nuomininkų</p>
                                        <button
                                            onClick={onUploadPhoto}
                                            className="flex items-center gap-1.5 text-sm text-[#2F8481] font-medium hover:underline"
                                        >
                                            <Plus className="w-4 h-4" />
                                            Įkelti nuotraukas
                                        </button>
                                    </div>
                                </div>
                            ) : photos.length === 1 ? (
                                // 1 photo - single larger image with info
                                <div className="flex items-center gap-4">
                                    <img
                                        src={photos[0]}
                                        alt="Butas"
                                        onClick={() => openLightbox(0)}
                                        className="w-40 h-40 object-cover rounded-xl flex-shrink-0 cursor-pointer hover:opacity-90 transition-opacity shadow-md"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-neutral-900 mb-1">Būsto nuotraukos</h3>
                                        <p className="text-sm text-neutral-500 mb-3">1 nuotrauka</p>
                                        <button
                                            onClick={onUploadPhoto}
                                            className="flex items-center gap-1.5 text-sm text-[#2F8481] font-medium hover:underline"
                                        >
                                            <Plus className="w-4 h-4" />
                                            Pridėti daugiau
                                        </button>
                                    </div>
                                </div>
                            ) : photos.length === 2 ? (
                                // 2 photos - side by side larger
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="font-semibold text-neutral-900">Būsto nuotraukos</h3>
                                        <button
                                            onClick={onUploadPhoto}
                                            className="flex items-center gap-1 text-sm text-[#2F8481] font-medium hover:underline"
                                        >
                                            <Plus className="w-4 h-4" />
                                            Pridėti
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <img
                                            src={photos[0]}
                                            alt="Butas 1"
                                            onClick={() => openLightbox(0)}
                                            className="w-full h-40 object-cover rounded-xl cursor-pointer hover:opacity-90 transition-opacity shadow-md"
                                        />
                                        <img
                                            src={photos[1]}
                                            alt="Butas 2"
                                            onClick={() => openLightbox(1)}
                                            className="w-full h-40 object-cover rounded-xl cursor-pointer hover:opacity-90 transition-opacity shadow-md"
                                        />
                                    </div>
                                </div>
                            ) : photos.length === 3 ? (
                                // 3 photos - 1 large + 2 small
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="font-semibold text-neutral-900">Būsto nuotraukos</h3>
                                        <button
                                            onClick={onUploadPhoto}
                                            className="flex items-center gap-1 text-sm text-[#2F8481] font-medium hover:underline"
                                        >
                                            <Plus className="w-4 h-4" />
                                            Pridėti
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        <img
                                            src={photos[0]}
                                            alt="Butas 1"
                                            onClick={() => openLightbox(0)}
                                            className="col-span-2 w-full h-44 object-cover rounded-xl cursor-pointer hover:opacity-90 transition-opacity shadow-md"
                                        />
                                        <div className="flex flex-col gap-3">
                                            <img
                                                src={photos[1]}
                                                alt="Butas 2"
                                                onClick={() => openLightbox(1)}
                                                className="w-full h-[86px] object-cover rounded-xl cursor-pointer hover:opacity-90 transition-opacity shadow-md"
                                            />
                                            <img
                                                src={photos[2]}
                                                alt="Butas 3"
                                                onClick={() => openLightbox(2)}
                                                className="w-full h-[86px] object-cover rounded-xl cursor-pointer hover:opacity-90 transition-opacity shadow-md"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                // 4+ photos - 2x2 grid with +N overlay larger
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold text-neutral-900">Būsto nuotraukos</h3>
                                            <span className="text-xs text-neutral-500">({photos.length})</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setEditMode(!editMode)}
                                                className={`flex items-center gap-1 text-sm font-medium transition-colors ${editMode
                                                    ? 'text-amber-600 hover:text-amber-700'
                                                    : 'text-neutral-500 hover:text-neutral-700'
                                                    }`}
                                            >
                                                <Edit3 className="w-4 h-4" />
                                                {editMode ? 'Baigti' : 'Redaguoti'}
                                            </button>
                                            <button
                                                onClick={onUploadPhoto}
                                                className="flex items-center gap-1 text-sm text-[#2F8481] font-medium hover:underline"
                                            >
                                                <Plus className="w-4 h-4" />
                                                Pridėti
                                            </button>
                                        </div>
                                    </div>

                                    {/* Photo Grid with optional edit mode */}
                                    <div className="grid grid-cols-4 gap-3">
                                        {photos.slice(0, 4).map((photo, idx) => (
                                            <div
                                                key={idx}
                                                className={`relative group ${editMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} ${draggedIndex === idx ? 'opacity-50 scale-95' : ''
                                                    } ${dragOverIndex === idx && draggedIndex !== idx ? 'ring-2 ring-[#2F8481]' : ''}`}
                                                draggable={editMode}
                                                onDragStart={(e) => handleDragStart(e, idx)}
                                                onDragOver={(e) => handleDragOver(e, idx)}
                                                onDrop={() => handleDrop(idx)}
                                                onDragEnd={handleDragEnd}
                                                onClick={() => !editMode && openLightbox(idx)}
                                            >
                                                <img
                                                    src={photo}
                                                    alt={`Butas ${idx + 1}`}
                                                    className={`w-full h-32 object-cover rounded-xl shadow-md transition-all ${editMode ? 'hover:opacity-80' : 'hover:opacity-90'
                                                        }`}
                                                />

                                                {/* Delete button in edit mode */}
                                                {editMode && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onDeletePhoto?.(idx);
                                                        }}
                                                        className="absolute top-1.5 right-1.5 w-7 h-7 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                )}

                                                {/* +N overlay on 4th photo */}
                                                {idx === 3 && photos.length > 4 && !editMode && (
                                                    <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center hover:bg-black/40 transition-colors">
                                                        <span className="text-white font-bold text-xl">+{photos.length - 4}</span>
                                                    </div>
                                                )}

                                                {/* Drag hint in edit mode */}
                                                {editMode && (
                                                    <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 bg-black/50 rounded text-white text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">
                                                        Tempk
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Show all photos in edit mode */}
                                    {editMode && photos.length > 4 && (
                                        <div className="grid grid-cols-4 gap-3 mt-3 pt-3 border-t border-neutral-200">
                                            {photos.slice(4).map((photo, idx) => (
                                                <div
                                                    key={idx + 4}
                                                    className={`relative group cursor-grab active:cursor-grabbing ${draggedIndex === idx + 4 ? 'opacity-50 scale-95' : ''
                                                        } ${dragOverIndex === idx + 4 && draggedIndex !== idx + 4 ? 'ring-2 ring-[#2F8481]' : ''}`}
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, idx + 4)}
                                                    onDragOver={(e) => handleDragOver(e, idx + 4)}
                                                    onDrop={() => handleDrop(idx + 4)}
                                                    onDragEnd={handleDragEnd}
                                                >
                                                    <img
                                                        src={photo}
                                                        alt={`Butas ${idx + 5}`}
                                                        className="w-full h-32 object-cover rounded-xl shadow-md hover:opacity-80 transition-all"
                                                    />
                                                    <button
                                                        onClick={() => onDeletePhoto?.(idx + 4)}
                                                        className="absolute top-1.5 right-1.5 w-7 h-7 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        // OCCUPIED: Full photo gallery
                        <div className="relative bg-neutral-900 rounded-2xl overflow-hidden aspect-[16/9] group shadow-lg">
                            {photos.length > 0 ? (
                                <>
                                    <img
                                        src={photos[currentPhotoIndex]}
                                        alt={`Butas ${currentPhotoIndex + 1}`}
                                        onClick={() => openLightbox(currentPhotoIndex)}
                                        className="w-full h-full object-cover cursor-pointer"
                                    />
                                    {photos.length > 1 && (
                                        <>
                                            <button
                                                onClick={() => setCurrentPhotoIndex(i => i > 0 ? i - 1 : photos.length - 1)}
                                                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <ChevronLeft className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => setCurrentPhotoIndex(i => i < photos.length - 1 ? i + 1 : 0)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <ChevronRight className="w-5 h-5" />
                                            </button>
                                        </>
                                    )}
                                    <div className="absolute top-3 right-3 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-lg text-white text-sm font-medium">
                                        {currentPhotoIndex + 1} / {photos.length}
                                    </div>
                                </>
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-neutral-100 to-neutral-200">
                                    <Camera className="w-12 h-12 text-neutral-300 mb-3" />
                                    <p className="text-neutral-500 font-medium mb-2">Nuotraukų nėra</p>
                                    <button
                                        onClick={onUploadPhoto}
                                        className="flex items-center gap-2 px-4 py-2 bg-[#2F8481] text-white rounded-lg hover:bg-[#267270] transition-colors text-sm font-medium"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Įkelti nuotraukas
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* PROPERTY METRICS - Always visible */}
                    <div className="grid grid-cols-4 gap-2">
                        <div className="bg-white border border-neutral-200 rounded-xl p-3 text-center">
                            <div className="w-8 h-8 bg-[#2F8481]/10 rounded-lg flex items-center justify-center mx-auto mb-1.5">
                                <Layers className="w-4 h-4 text-[#2F8481]" />
                            </div>
                            <div className="text-xl font-bold text-neutral-900">{hasMeaningfulValue(property.rooms) ? property.rooms : '—'}</div>
                            <div className="text-xs text-neutral-500">Kamb.</div>
                        </div>
                        <div className="bg-white border border-neutral-200 rounded-xl p-3 text-center">
                            <div className="w-8 h-8 bg-[#2F8481]/10 rounded-lg flex items-center justify-center mx-auto mb-1.5">
                                <Ruler className="w-4 h-4 text-[#2F8481]" />
                            </div>
                            <div className="text-xl font-bold text-neutral-900">{hasMeaningfulValue(property.area) ? property.area : '—'}</div>
                            <div className="text-xs text-neutral-500">m²</div>
                        </div>
                        <div className="bg-white border border-neutral-200 rounded-xl p-3 text-center">
                            <div className="w-8 h-8 bg-[#2F8481]/10 rounded-lg flex items-center justify-center mx-auto mb-1.5">
                                <Building2 className="w-4 h-4 text-[#2F8481]" />
                            </div>
                            <div className="text-xl font-bold text-neutral-900">{hasMeaningfulValue(property.floor) ? property.floor : '—'}</div>
                            <div className="text-xs text-neutral-500">Aukšt.</div>
                        </div>
                        <div className="bg-white border border-neutral-200 rounded-xl p-3 text-center">
                            <div className="w-8 h-8 bg-[#2F8481]/10 rounded-lg flex items-center justify-center mx-auto mb-1.5">
                                <Home className="w-4 h-4 text-[#2F8481]" />
                            </div>
                            <div className="text-sm font-semibold text-neutral-900 truncate">{translatePropertyType(property.type)}</div>
                            <div className="text-xs text-neutral-500">Tipas</div>
                        </div>
                    </div>

                    {/* COMPACT UTILITIES SUMMARY - replaces detailed list */}
                    <div className="bg-white border border-neutral-200 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-[#2F8481]/10 rounded-lg flex items-center justify-center">
                                    <Droplets className="w-5 h-5 text-[#2F8481]" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-neutral-900">Komunaliniai</h3>
                                    <p className="text-sm text-neutral-500">
                                        {meters.length} skaitliuk{meters.length === 1 ? 'as' : 'ai'}
                                        {pendingMeters > 0 && (
                                            <span className="text-amber-600"> • {pendingMeters} laukia</span>
                                        )}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => onNavigateTab?.('komunaliniai')}
                                className="flex items-center gap-1 text-sm text-[#2F8481] font-medium hover:underline"
                            >
                                Peržiūrėti
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* VACANT-SPECIFIC QUICK ACTIONS - meaningful for setup */}
                    {isVacant && (
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => onNavigateTab?.('bustas')}
                                className="flex items-center gap-3 p-4 bg-white border border-neutral-200 rounded-xl hover:border-[#2F8481]/30 hover:shadow-sm transition-all text-left"
                            >
                                <div className="w-10 h-10 bg-[#2F8481]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <Euro className="w-5 h-5 text-[#2F8481]" />
                                </div>
                                <div>
                                    <div className="font-medium text-neutral-900">Nustatyti kainą</div>
                                    <div className="text-xs text-neutral-500">Nuomos mokestis</div>
                                </div>
                            </button>
                            <button
                                onClick={() => onNavigateTab?.('komunaliniai')}
                                className="flex items-center gap-3 p-4 bg-white border border-neutral-200 rounded-xl hover:border-[#2F8481]/30 hover:shadow-sm transition-all text-left"
                            >
                                <div className="w-10 h-10 bg-[#2F8481]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <Settings className="w-5 h-5 text-[#2F8481]" />
                                </div>
                                <div>
                                    <div className="font-medium text-neutral-900">Komunaliniai</div>
                                    <div className="text-xs text-neutral-500">Skaitiklių nustatymai</div>
                                </div>
                            </button>
                            <button
                                onClick={() => onNavigateTab?.('dokumentai')}
                                className="flex items-center gap-3 p-4 bg-white border border-neutral-200 rounded-xl hover:border-[#2F8481]/30 hover:shadow-sm transition-all text-left"
                            >
                                <div className="w-10 h-10 bg-[#2F8481]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <FileText className="w-5 h-5 text-[#2F8481]" />
                                </div>
                                <div>
                                    <div className="font-medium text-neutral-900">Dokumentai</div>
                                    <div className="text-xs text-neutral-500">Įkelti failus</div>
                                </div>
                            </button>
                            <button
                                onClick={onShowNotes}
                                className="flex items-center gap-3 p-4 bg-white border border-neutral-200 rounded-xl hover:border-[#2F8481]/30 hover:shadow-sm transition-all text-left"
                            >
                                <div className="w-10 h-10 bg-[#2F8481]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <MessageSquare className="w-5 h-5 text-[#2F8481]" />
                                </div>
                                <div>
                                    <div className="font-medium text-neutral-900">Pastabos</div>
                                    <div className="text-xs text-neutral-500">Vidiniai komentarai</div>
                                </div>
                            </button>
                        </div>
                    )}

                    {/* OCCUPIED: TENANT INFO + QUICK LINKS */}
                    {!isVacant && (
                        <>
                            {/* Tenant info card */}
                            <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-[#2F8481]/10 rounded-full flex items-center justify-center">
                                        <User className="w-7 h-7 text-[#2F8481]" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-semibold text-neutral-900 text-lg">{tenant.name}</div>
                                        <div className="text-sm text-neutral-500">{tenant.email || tenant.phone || '—'}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-bold text-[#2F8481]">€{tenant.monthlyRent || 0}</div>
                                        <div className="text-xs text-neutral-500">/ mėn</div>
                                    </div>
                                </div>
                            </div>

                            {/* Quick links for occupied */}
                            <div className="grid grid-cols-4 gap-2">
                                <button
                                    onClick={() => onNavigateTab?.('komunaliniai')}
                                    className="flex flex-col items-center gap-1.5 p-3 bg-white border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-colors"
                                >
                                    <Droplets className="w-5 h-5 text-neutral-500" />
                                    <span className="text-xs text-neutral-600">Rodmenys</span>
                                </button>
                                <button
                                    onClick={() => onNavigateTab?.('dokumentai')}
                                    className="flex flex-col items-center gap-1.5 p-3 bg-white border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-colors"
                                >
                                    <FileText className="w-5 h-5 text-neutral-500" />
                                    <span className="text-xs text-neutral-600">Dokumentai</span>
                                </button>
                                <button className="flex flex-col items-center gap-1.5 p-3 bg-white border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-colors">
                                    <Euro className="w-5 h-5 text-neutral-500" />
                                    <span className="text-xs text-neutral-600">Mokėjimai</span>
                                </button>
                                <button className="flex flex-col items-center gap-1.5 p-3 bg-white border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-colors">
                                    <Clock className="w-5 h-5 text-neutral-500" />
                                    <span className="text-xs text-neutral-600">Istorija</span>
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {/* RIGHT COLUMN - Sidebar (1/3 width) - STICKY */}
                <div className="space-y-4 md:sticky md:top-4 self-start">

                    {/* PRIMARY ACTION CARD - elevated */}
                    <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-md">
                        <div className="flex items-center justify-between mb-4">
                            <span className={`px-3 py-1.5 rounded-full text-sm font-medium border ${getOccupancyColor(occupancyState)}`}>
                                {getOccupancyLabel(occupancyState)}
                            </span>
                            <button onClick={onEditProperty} className="p-2 hover:bg-neutral-100 rounded-lg transition-colors">
                                <Edit3 className="w-4 h-4 text-neutral-400" />
                            </button>
                        </div>

                        {/* Primary CTA */}
                        {isVacant ? (
                            <div className="space-y-3">
                                <button
                                    onClick={onAddTenant}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#2F8481] text-white rounded-xl hover:bg-[#267270] transition-colors font-medium shadow-sm"
                                >
                                    <User className="w-5 h-5" />
                                    Pridėti nuomininką
                                </button>
                                <button
                                    onClick={onCreateLease}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-neutral-200 text-neutral-700 rounded-xl hover:bg-neutral-50 transition-colors text-sm font-medium"
                                >
                                    <FileText className="w-4 h-4" />
                                    Pridėti sutartį
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <button
                                    onClick={onAddPayment}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#2F8481] text-white rounded-xl hover:bg-[#267270] transition-colors font-medium shadow-sm"
                                >
                                    <Euro className="w-5 h-5" />
                                    Pridėti mokėjimą
                                </button>
                                <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-neutral-200 text-neutral-700 rounded-xl hover:bg-neutral-50 transition-colors text-sm font-medium">
                                    <FileText className="w-4 h-4" />
                                    Peržiūrėti sutartį
                                </button>
                            </div>
                        )}
                    </div>

                    {/* NEXT STEPS CHECKLIST - VACANT only */}
                    {isVacant && (
                        <div className="bg-white border border-neutral-200 rounded-xl p-4">
                            <h3 className="font-semibold text-neutral-900 mb-3 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-amber-500" />
                                Paruošti nuomai
                            </h3>
                            <div className="space-y-2.5">
                                <div className="flex items-center justify-between py-1.5">
                                    <div className="flex items-center gap-2">
                                        {hasPropertyData ? (
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                        ) : (
                                            <Circle className="w-4 h-4 text-neutral-300" />
                                        )}
                                        <span className={`text-sm ${hasPropertyData ? 'text-neutral-500' : 'text-neutral-900'}`}>
                                            Būsto duomenys
                                        </span>
                                    </div>
                                    {!hasPropertyData && (
                                        <button
                                            onClick={onEditProperty}
                                            className="text-xs text-[#2F8481] font-medium hover:underline"
                                        >
                                            Sutvarkyti
                                        </button>
                                    )}
                                </div>
                                <div className="flex items-center justify-between py-1.5">
                                    <div className="flex items-center gap-2">
                                        {hasRentPrice ? (
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                        ) : (
                                            <Circle className="w-4 h-4 text-neutral-300" />
                                        )}
                                        <span className={`text-sm ${hasRentPrice ? 'text-neutral-500' : 'text-neutral-900'}`}>
                                            Nuomos kaina
                                        </span>
                                    </div>
                                    {!hasRentPrice && (
                                        <button
                                            onClick={onCreateLease}
                                            className="text-xs text-[#2F8481] font-medium hover:underline"
                                        >
                                            Sutvarkyti
                                        </button>
                                    )}
                                </div>
                                <div className="flex items-center justify-between py-1.5">
                                    <div className="flex items-center gap-2">
                                        {hasTenant ? (
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                        ) : (
                                            <Circle className="w-4 h-4 text-neutral-300" />
                                        )}
                                        <span className={`text-sm ${hasTenant ? 'text-neutral-500' : 'text-neutral-900'}`}>
                                            Nuomininkas
                                        </span>
                                    </div>
                                    {!hasTenant && (
                                        <button
                                            onClick={onAddTenant}
                                            className="text-xs text-[#2F8481] font-medium hover:underline"
                                        >
                                            Pridėti
                                        </button>
                                    )}
                                </div>
                                <div className="flex items-center justify-between py-1.5">
                                    <div className="flex items-center gap-2">
                                        {hasLease ? (
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                        ) : (
                                            <Circle className="w-4 h-4 text-neutral-300" />
                                        )}
                                        <span className={`text-sm ${hasLease ? 'text-neutral-500' : 'text-neutral-900'}`}>
                                            Sutartis
                                        </span>
                                    </div>
                                    {!hasLease && (
                                        <button
                                            onClick={onCreateLease}
                                            className="text-xs text-[#2F8481] font-medium hover:underline"
                                        >
                                            Sukurti
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* FINANCIAL SUMMARY - OCCUPIED only */}
                    {!isVacant && (
                        <div className="bg-white border border-neutral-200 rounded-xl p-4">
                            <h3 className="font-semibold text-neutral-900 mb-3">Finansai</h3>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-neutral-500">Nuoma/mėn</span>
                                    <span className="font-bold text-[#2F8481]">€{tenant.monthlyRent || 0}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-neutral-500">Depozitas</span>
                                    <span className="font-medium text-neutral-900">€{tenant.deposit || 0}</span>
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t">
                                    <span className="text-sm text-neutral-500">Sutartis iki</span>
                                    <span className="text-sm font-medium text-neutral-900">{formatDate(tenant.contractEnd)}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* LIGHTBOX MODAL - Fullscreen photo viewer with ZOOM */}
            {lightboxOpen && photos.length > 0 && (
                <div
                    className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center"
                    onClick={closeLightbox}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    {/* Close button */}
                    <button
                        onClick={closeLightbox}
                        className="absolute top-4 right-4 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors z-10"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    {/* Photo counter + Zoom level */}
                    <div className="absolute top-4 left-4 flex items-center gap-3 z-10">
                        <div className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white text-sm font-medium">
                            {lightboxIndex + 1} / {photos.length}
                        </div>
                        {zoomLevel > 1 && (
                            <div className="px-3 py-2 bg-[#2F8481]/80 backdrop-blur-sm rounded-full text-white text-sm font-medium">
                                {zoomLevel.toFixed(1)}x
                            </div>
                        )}
                    </div>

                    {/* Zoom hint */}
                    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-lg text-white/70 text-xs z-10">
                        Click = Zoom • Scroll = Fine tune • Drag = Pan
                    </div>

                    {/* Main image with zoom */}
                    <div
                        className="overflow-hidden"
                        onWheel={handleWheel}
                        onClick={handleImageClick}
                        onDoubleClick={handleDoubleClick}
                        onMouseDown={handleMouseDown}
                        style={{ cursor: zoomLevel > 1 ? (isPanning ? 'grabbing' : 'grab') : 'zoom-in' }}
                    >
                        <img
                            src={photos[lightboxIndex]}
                            alt={`Būsto nuotrauka ${lightboxIndex + 1}`}
                            draggable={false}
                            className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl select-none transition-transform duration-300 ease-out"
                            style={{
                                transform: `scale(${zoomLevel}) translate(${panPosition.x / zoomLevel}px, ${panPosition.y / zoomLevel}px)`
                            }}
                        />
                    </div>

                    {/* Navigation arrows - hidden when zoomed */}
                    {photos.length > 1 && zoomLevel === 1 && (
                        <>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setLightboxIndex(i => i > 0 ? i - 1 : photos.length - 1);
                                }}
                                className="absolute left-4 top-1/2 -translate-y-1/2 w-14 h-14 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
                            >
                                <ChevronLeft className="w-8 h-8" />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setLightboxIndex(i => i < photos.length - 1 ? i + 1 : 0);
                                }}
                                className="absolute right-4 top-1/2 -translate-y-1/2 w-14 h-14 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
                            >
                                <ChevronRight className="w-8 h-8" />
                            </button>
                        </>
                    )}

                    {/* Thumbnail strip at bottom - hidden when zoomed */}
                    {photos.length > 1 && zoomLevel === 1 && (
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 p-2 bg-white/10 backdrop-blur-sm rounded-xl">
                            {photos.map((photo, idx) => (
                                <button
                                    key={idx}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setLightboxIndex(idx);
                                    }}
                                    className={`w-16 h-12 rounded-lg overflow-hidden border-2 transition-all ${idx === lightboxIndex
                                        ? 'border-white scale-105'
                                        : 'border-transparent opacity-60 hover:opacity-100'
                                        }`}
                                >
                                    <img src={photo} alt="" className="w-full h-full object-cover" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </>
    );
};

export default PremiumOverviewTab;
