import React from 'react';
import { User, Home, Phone, Calendar, Euro, FileText, Droplets, Clock } from 'lucide-react';

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

interface MoveOut {
    notice?: string;
    planned?: string;
    status?: string;
}

// Occupancy state machine
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
        'apartment': 'Butas',
        'house': 'Namas',
        'studio': 'Studija',
        'room': 'Kambarys',
        'commercial': 'Komercinis',
        'flat': 'Butas',
        'office': 'Biuras'
    };
    return dict[type?.toLowerCase() || ''] || type || '—';
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
        'VACANT': 'Laisvas',
        'RESERVED': 'Rezervuotas',
        'OCCUPIED': 'Gyvenamas',
        'NOTICE_GIVEN': 'Išsikraustymas',
        'MOVED_OUT_PENDING': 'Laukia uždarymo'
    };
    return labels[state];
};

const getOccupancyColor = (state: OccupancyState): string => {
    const colors: Record<OccupancyState, string> = {
        'VACANT': 'bg-neutral-100 text-neutral-700',
        'RESERVED': 'bg-blue-100 text-blue-700',
        'OCCUPIED': 'bg-emerald-100 text-emerald-700',
        'NOTICE_GIVEN': 'bg-amber-100 text-amber-700',
        'MOVED_OUT_PENDING': 'bg-rose-100 text-rose-700'
    };
    return colors[state];
};

interface OverviewTabProps {
    tenant: Tenant;
    property: PropertyInfo;
    moveOut: MoveOut;
    meters?: any[];
    onAddTenant?: () => void;
    onCreateLease?: () => void;
    onAddPayment?: () => void;
    onViewLease?: () => void;
}

export const StateBasedOverviewTab: React.FC<OverviewTabProps> = ({
    tenant,
    property,
    moveOut,
    meters = [],
    onAddTenant,
    onCreateLease,
    onAddPayment,
    onViewLease
}) => {
    const occupancyState = getOccupancyState(tenant, moveOut);
    const isVacant = occupancyState === 'VACANT';

    const hasMeters = meters && meters.length > 0;
    const hasPropertyDetails = hasMeaningfulValue(property.rooms) || hasMeaningfulValue(property.area);

    return (
        <div className="space-y-5">
            {/* === VACANT APARTMENT === */}
            {isVacant && (
                <>
                    {/* Property Summary */}
                    <div className="bg-white border border-neutral-200 rounded-2xl p-5">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-[#2F8481]/10 rounded-xl flex items-center justify-center">
                                <Home className="w-5 h-5 text-[#2F8481]" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-neutral-900">Būsto santrauka</h3>
                                <p className="text-sm text-neutral-500">{property.address || '—'}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center p-3 bg-neutral-50 rounded-xl">
                                <div className="text-2xl font-bold text-[#2F8481]">{hasMeaningfulValue(property.rooms) ? property.rooms : '—'}</div>
                                <div className="text-xs text-neutral-500">Kambariai</div>
                            </div>
                            <div className="text-center p-3 bg-neutral-50 rounded-xl">
                                <div className="text-2xl font-bold text-[#2F8481]">{hasMeaningfulValue(property.area) ? property.area : '—'}</div>
                                <div className="text-xs text-neutral-500">m²</div>
                            </div>
                            <div className="text-center p-3 bg-neutral-50 rounded-xl">
                                <div className="text-2xl font-bold text-[#2F8481]">{hasMeaningfulValue(property.floor) ? property.floor : '—'}</div>
                                <div className="text-xs text-neutral-500">Aukštas</div>
                            </div>
                            <div className="text-center p-3 bg-neutral-50 rounded-xl">
                                <div className="text-lg font-semibold text-neutral-900">{translatePropertyType(property.type)}</div>
                                <div className="text-xs text-neutral-500">Tipas</div>
                            </div>
                        </div>
                    </div>

                    {/* Two Columns */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        {/* Readiness Checklist */}
                        <div className="bg-white border border-neutral-200 rounded-2xl p-5">
                            <h3 className="text-base font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                                📋 Paruošta nuomai?
                            </h3>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${hasPropertyDetails ? 'bg-emerald-100' : 'bg-neutral-200'}`}>
                                        {hasPropertyDetails ? <span className="text-emerald-600 text-sm">✓</span> : <span className="text-neutral-400 text-sm">○</span>}
                                    </div>
                                    <span className={`text-sm ${hasPropertyDetails ? 'text-neutral-700' : 'text-neutral-500'}`}>Būsto duomenys</span>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${hasMeters ? 'bg-emerald-100' : 'bg-neutral-200'}`}>
                                        {hasMeters ? <span className="text-emerald-600 text-sm">✓</span> : <span className="text-neutral-400 text-sm">○</span>}
                                    </div>
                                    <span className={`text-sm ${hasMeters ? 'text-neutral-700' : 'text-neutral-500'}`}>Skaitikliai ({meters?.length || 0})</span>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="bg-white border border-neutral-200 rounded-2xl p-5">
                            <h3 className="text-base font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                                ⚡ Veiksmai
                            </h3>
                            <div className="space-y-3">
                                <button
                                    onClick={onAddTenant}
                                    className="w-full flex items-center gap-3 p-3 bg-[#2F8481] text-white rounded-xl hover:bg-[#267270] transition-colors"
                                >
                                    <User className="w-5 h-5" />
                                    <span className="font-medium">Pridėti nuomininką</span>
                                </button>
                                <button
                                    onClick={onCreateLease}
                                    className="w-full flex items-center gap-3 p-3 bg-neutral-100 text-neutral-700 rounded-xl hover:bg-neutral-200 transition-colors"
                                >
                                    <FileText className="w-5 h-5" />
                                    <span className="font-medium">Sukurti sutartį</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Empty State */}
                    <div className="bg-neutral-50 border-2 border-dashed border-neutral-200 rounded-2xl p-6 text-center">
                        <div className="text-3xl mb-2">🏠</div>
                        <p className="text-neutral-600 font-medium">Šis būstas laukia nuomininko</p>
                        <p className="text-sm text-neutral-500 mt-1">Pridėkite nuomininką arba sukurkite sutartį</p>
                    </div>
                </>
            )}

            {/* === OCCUPIED APARTMENT === */}
            {!isVacant && (
                <>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        {/* Tenant Card */}
                        <div className="bg-white border border-neutral-200 rounded-2xl p-5">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 bg-[#2F8481]/10 rounded-xl flex items-center justify-center">
                                    <User className="w-6 h-6 text-[#2F8481]" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-neutral-900">{tenant.name}</h3>
                                    <p className="text-sm text-neutral-500">{tenant.email || '—'}</p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getOccupancyColor(occupancyState)}`}>
                                    {getOccupancyLabel(occupancyState)}
                                </span>
                            </div>

                            <div className="space-y-2">
                                {hasMeaningfulValue(tenant.phone) && (
                                    <div className="flex items-center gap-3">
                                        <Phone className="w-4 h-4 text-neutral-400" />
                                        <span className="text-sm text-neutral-900">{tenant.phone}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-3">
                                    <Calendar className="w-4 h-4 text-neutral-400" />
                                    <span className="text-sm text-neutral-600">Įsikėlė: {formatDate(tenant.contractStart)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Lease Card */}
                        <div className="bg-white border border-neutral-200 rounded-2xl p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-base font-semibold text-neutral-900">Sutartis</h3>
                                <button
                                    onClick={onViewLease}
                                    className="text-xs text-[#2F8481] font-medium hover:underline"
                                >
                                    Peržiūrėti →
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="text-center p-3 bg-[#2F8481]/10 rounded-xl">
                                    <div className="text-xl font-bold text-[#2F8481]">€{tenant.monthlyRent || 0}</div>
                                    <div className="text-xs text-neutral-500">Nuoma/mėn</div>
                                </div>
                                <div className="text-center p-3 bg-neutral-100 rounded-xl">
                                    <div className="text-xl font-bold text-neutral-700">€{tenant.deposit ?? 0}</div>
                                    <div className="text-xs text-neutral-500">Depozitas</div>
                                </div>
                            </div>

                            <div className="text-sm text-neutral-600 flex justify-between py-1">
                                <span>Pabaiga:</span>
                                <span className="font-medium">{formatDate(tenant.contractEnd)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <button
                            onClick={onAddPayment}
                            className="flex flex-col items-center gap-2 p-4 bg-[#2F8481] text-white rounded-xl hover:bg-[#267270] transition-colors"
                        >
                            <Euro className="w-5 h-5" />
                            <span className="text-xs font-medium">Mokėjimas</span>
                        </button>
                        <button className="flex flex-col items-center gap-2 p-4 bg-white border border-neutral-200 text-neutral-700 rounded-xl hover:bg-neutral-50 transition-colors">
                            <Droplets className="w-5 h-5" />
                            <span className="text-xs font-medium">Rodmenys</span>
                        </button>
                        <button className="flex flex-col items-center gap-2 p-4 bg-white border border-neutral-200 text-neutral-700 rounded-xl hover:bg-neutral-50 transition-colors">
                            <FileText className="w-5 h-5" />
                            <span className="text-xs font-medium">Dokumentai</span>
                        </button>
                        <button className="flex flex-col items-center gap-2 p-4 bg-white border border-neutral-200 text-neutral-700 rounded-xl hover:bg-neutral-50 transition-colors">
                            <Clock className="w-5 h-5" />
                            <span className="text-xs font-medium">Istorija</span>
                        </button>
                    </div>

                    {/* Property Summary (Compact) */}
                    <div className="bg-neutral-50 rounded-2xl p-4">
                        <div className="flex items-center gap-4 flex-wrap">
                            <div className="flex items-center gap-2">
                                <Home className="w-4 h-4 text-neutral-400" />
                                <span className="text-sm text-neutral-600">{property.address || '—'}</span>
                            </div>
                            {hasMeaningfulValue(property.rooms) && (
                                <span className="text-sm text-neutral-600">• {property.rooms} kamb.</span>
                            )}
                            {hasMeaningfulValue(property.area) && (
                                <span className="text-sm text-neutral-600">• {property.area} m²</span>
                            )}
                        </div>
                    </div>

                    {/* Move Out Notice */}
                    {(occupancyState === 'NOTICE_GIVEN' || occupancyState === 'MOVED_OUT_PENDING') && (
                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                                    <Calendar className="w-5 h-5 text-amber-600" />
                                </div>
                                <div>
                                    <h3 className="text-base font-semibold text-amber-800">Išsikraustymas</h3>
                                    {hasMeaningfulValue(moveOut.planned) && (
                                        <span className="text-sm text-amber-700">{formatDate(moveOut.planned)}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default StateBasedOverviewTab;
