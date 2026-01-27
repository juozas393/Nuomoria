import React, { memo, ReactNode } from 'react';
import {
    Home, User, Euro, FileText, Droplets, Plus, Settings,
    Upload, Camera, ChevronRight, Phone, Calendar, CheckCircle2,
    Circle, Clock, MoreHorizontal, ArrowRight
} from 'lucide-react';

// =============================================================================
// SURFACE HIERARCHY (Premium Design System)
// =============================================================================

// Surface 1: Standard cards
const surface1 = 'bg-white/78 backdrop-blur-[10px] border border-white/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)] rounded-xl';

// Surface 2: Hero/Primary cards (stronger presence)
const surface2 = 'bg-white/92 backdrop-blur-[14px] border border-white/80 shadow-[0_4px_12px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)] rounded-xl';

// Sticky bar
const stickyBg = 'bg-gray-900/90 backdrop-blur-xl rounded-xl shadow-[0_-4px_20px_rgba(0,0,0,0.1)]';

// =============================================================================
// TYPOGRAPHY TOKENS
// =============================================================================

const heading = 'text-[12px] font-bold text-gray-900';
const subtext = 'text-[10px] text-gray-500';
const tiny = 'text-[9px] text-gray-400';
const cta = 'text-[10px] font-bold text-teal-600 hover:text-teal-700 cursor-pointer transition-colors';
const ctaBtn = 'px-2.5 py-1.5 bg-teal-500 text-white text-[10px] font-bold rounded-lg hover:bg-teal-600 transition-all active:scale-[0.98]';

// =============================================================================
// TYPES
// =============================================================================

interface Tenant {
    name: string;
    phone?: string;
    contractEnd?: string;
    monthlyRent?: number;
    deposit?: number;
    paymentDay?: number;
    overdue?: number;
    status?: string;
}

interface PropertyInfo {
    id: string;
    address?: string;
    rooms?: number;
    area?: number;
    floor?: number;
    type?: string;
}

interface PremiumOverviewProps {
    tenant: Tenant;
    property: PropertyInfo;
    photos?: string[];
    meters?: any[];
    documents?: any[];
    activities?: { text: string; time: string }[];
    onAddTenant?: () => void;
    onViewTenant?: () => void;
    onSetPrice?: () => void;
    onUploadPhoto?: () => void;
    onManagePhotos?: () => void;
    onLayoutPhotos?: () => void;
    onNavigateTab?: (tab: string) => void;
    onOpenSettings?: () => void;
    onUploadDocument?: () => void;
    onManageMeters?: () => void;
}

// =============================================================================
// A) COMMAND HEADER
// =============================================================================

interface CommandHeaderProps {
    property: PropertyInfo;
    isVacant: boolean;
    nextAction: { label: string; short: string; onClick?: () => void };
    onDocs?: () => void;
    onSettings?: () => void;
}

const CommandHeader = memo<CommandHeaderProps>(({
    property, isVacant, nextAction, onDocs, onSettings
}) => (
    <div className={`${surface1} px-3 py-2 mb-2`}>
        <div className="flex items-center justify-between">
            {/* Left: Address + chips */}
            <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-gradient-to-br from-teal-400 to-teal-600 rounded-lg flex items-center justify-center shadow-sm">
                    <Home className="w-4 h-4 text-white" />
                </div>
                <div>
                    <p className={heading}>{property.address || 'Adresas'}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                        {[property.type === 'house' ? 'Namas' : 'Butas', `${property.rooms || 1} kamb.`, property.area ? `${property.area} m²` : null]
                            .filter(Boolean)
                            .map((chip, i) => (
                                <span key={i} className="px-1.5 py-0.5 bg-gray-100/80 text-[8px] font-medium text-gray-600 rounded">
                                    {chip}
                                </span>
                            ))}
                    </div>
                </div>
            </div>

            {/* Center: Status + Next action */}
            <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 text-[10px] font-bold rounded-lg ${isVacant ? 'bg-emerald-500 text-white' : 'bg-blue-500 text-white'
                    }`}>
                    {isVacant ? 'Laisvas' : 'Išnuomotas'}
                </span>
                <button
                    onClick={nextAction.onClick}
                    className="px-2.5 py-1 bg-amber-100 text-amber-800 text-[10px] font-semibold rounded-lg flex items-center gap-1.5 hover:bg-amber-200 transition-colors"
                >
                    <ArrowRight className="w-3 h-3" />
                    {nextAction.short}
                </button>
            </div>

            {/* Right: Primary CTA + secondary */}
            <div className="flex items-center gap-2">
                <button onClick={nextAction.onClick} className={ctaBtn}>
                    {nextAction.label}
                </button>
                <div className="h-5 w-px bg-gray-200" />
                <button onClick={onDocs} className="flex items-center gap-1 px-2 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                    <FileText className="w-3.5 h-3.5" />
                    <span className="text-[9px] font-medium">Dok.</span>
                </button>
                <button onClick={onSettings} className="flex items-center gap-1 px-2 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                    <Settings className="w-3.5 h-3.5" />
                    <span className="text-[9px] font-medium">Nust.</span>
                </button>
            </div>
        </div>
    </div>
));
CommandHeader.displayName = 'CommandHeader';

// =============================================================================
// B1) NEXT STEPS HERO CARD (Surface 2)
// =============================================================================

interface Task { label: string; done: boolean; cta: string; onClick?: () => void; }

interface NextStepsHeroProps {
    tasks: Task[];
    onViewAll?: () => void;
}

const NextStepsHero = memo<NextStepsHeroProps>(({ tasks, onViewAll }) => {
    const remaining = tasks.filter(t => !t.done);
    const progress = Math.round(((tasks.length - remaining.length) / tasks.length) * 100);
    const topTasks = remaining.slice(0, 3);
    const isComplete = remaining.length === 0;

    if (isComplete) {
        return (
            <div className={`${surface2} p-3 flex items-center gap-2.5`}>
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span className="text-[12px] font-bold text-emerald-700">Būstas paruoštas nuomai</span>
                <span className={`${tiny} ml-auto`}>100%</span>
            </div>
        );
    }

    return (
        <div className={surface2}>
            {/* Header with progress */}
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-teal-100 rounded-lg flex items-center justify-center">
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                    </div>
                    <span className={heading}>Kiti žingsniai</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-teal-400 to-teal-600 rounded-full transition-all duration-500"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <span className="text-[10px] font-bold text-teal-600">{progress}%</span>
                </div>
            </div>

            {/* Tasks */}
            <div className="p-2.5 space-y-1">
                {topTasks.map((task, i) => (
                    <div key={i} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-gray-50/80 transition-colors group">
                        <div className="flex items-center gap-2.5">
                            <Circle className="w-4 h-4 text-gray-300 group-hover:text-teal-400 transition-colors" />
                            <span className="text-[11px] text-gray-700 font-medium">{task.label}</span>
                        </div>
                        <button
                            onClick={task.onClick}
                            className="px-2.5 py-1 bg-teal-500 text-white text-[9px] font-bold rounded-md hover:bg-teal-600 transition-all opacity-80 group-hover:opacity-100"
                        >
                            {task.cta}
                        </button>
                    </div>
                ))}
            </div>

            {remaining.length > 3 && (
                <div className="px-3 pb-2.5">
                    <button onClick={onViewAll} className={`${cta} w-full text-center py-1.5 border-t border-gray-100 pt-2`}>
                        Žiūrėti visus ({remaining.length - 3} daugiau) →
                    </button>
                </div>
            )}
        </div>
    );
});
NextStepsHero.displayName = 'NextStepsHero';

// =============================================================================
// B2) MONEY SNAPSHOT (Compact rows)
// =============================================================================

interface MoneySnapshotProps {
    rent: number | null;
    deposit: number | null;
    paymentDay: number | null;
    overdue: number;
    isVacant: boolean;
    onSetPrice?: () => void;
    onAddDeposit?: () => void;
}

const MoneySnapshot = memo<MoneySnapshotProps>(({
    rent, deposit, paymentDay, overdue, isVacant, onSetPrice, onAddDeposit
}) => (
    <div className={surface1}>
        <div className="px-3 py-2 border-b border-gray-100">
            <span className={heading}>Finansai</span>
        </div>
        <div className="p-2.5 space-y-2">
            {/* Rent row */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Euro className="w-4 h-4 text-gray-400" />
                    <span className={subtext}>Nuoma/mėn</span>
                </div>
                {rent ? (
                    <span className="text-[13px] font-bold text-gray-900">€{rent}</span>
                ) : (
                    <button onClick={onSetPrice} className={cta}>Nustatyti →</button>
                )}
            </div>

            {/* Deposit row */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Euro className="w-4 h-4 text-gray-400" />
                    <span className={subtext}>Užstatas</span>
                </div>
                {deposit ? (
                    <span className="text-[13px] font-bold text-gray-900">€{deposit}</span>
                ) : (
                    <button onClick={onAddDeposit} className={cta}>Pridėti →</button>
                )}
            </div>

            {/* Payment day + Overdue */}
            <div className="flex items-center gap-4 pt-1 border-t border-gray-100">
                <div className="flex items-center justify-between flex-1">
                    <span className={tiny}>Mokėjimo d.</span>
                    <span className="text-[11px] font-semibold text-gray-700">
                        {!isVacant && paymentDay ? `${paymentDay} d.` : 'Netaikoma'}
                    </span>
                </div>
                <div className="flex items-center justify-between flex-1">
                    <span className={tiny}>Skola</span>
                    <span className={`text-[11px] font-semibold ${overdue > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {overdue > 0 ? `€${overdue}` : 'Nėra'}
                    </span>
                </div>
            </div>
        </div>
    </div>
));
MoneySnapshot.displayName = 'MoneySnapshot';

// =============================================================================
// B3) PHOTO GALLERY HERO (Surface 2, skeleton empty state)
// =============================================================================

interface PhotoGalleryHeroProps {
    photos: string[];
    onUpload?: () => void;
    onManage?: () => void;
    onLayout?: () => void;
}

const PhotoGalleryHero = memo<PhotoGalleryHeroProps>(({ photos, onUpload, onManage, onLayout }) => {
    const count = photos.length;
    const overflow = Math.max(0, count - 3);

    return (
        <div className={surface2}>
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Camera className="w-3.5 h-3.5 text-purple-600" />
                    </div>
                    <span className={heading}>Nuotraukos</span>
                    <span className={`${tiny} ml-1`}>{count} <span className="text-teal-600 font-medium">(rek: 8+)</span></span>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={onLayout} className="px-2 py-1 text-[9px] text-gray-500 hover:bg-gray-100 rounded-md transition-colors">
                        Išdėst.
                    </button>
                    <button onClick={onUpload} className="px-2.5 py-1 bg-teal-500 text-white text-[9px] font-bold rounded-md hover:bg-teal-600 transition-all">
                        Įkelti
                    </button>
                    <button onClick={onManage} className="px-2 py-1 text-[9px] text-gray-500 hover:bg-gray-100 rounded-md transition-colors">
                        Tvarkyti
                    </button>
                </div>
            </div>

            {/* Body */}
            <div className="p-3">
                {count > 0 ? (
                    /* Filled: Cover + thumbs */
                    <div className="flex gap-2 h-[80px]">
                        <div className="relative w-[80px] h-full rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 group cursor-pointer">
                            <img src={photos[0]} alt="Cover" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-teal-500 text-white text-[7px] font-bold uppercase rounded shadow-sm">
                                Viršelis
                            </span>
                        </div>
                        <div className="flex-1 grid grid-cols-3 gap-1.5">
                            {[1, 2].map(idx => (
                                <div key={idx} className="rounded-md overflow-hidden bg-gray-100 cursor-pointer hover:opacity-90 transition-opacity">
                                    {photos[idx] ? <img src={photos[idx]} className="w-full h-full object-cover" /> : null}
                                </div>
                            ))}
                            <div
                                onClick={onManage}
                                className="rounded-md bg-gray-800 cursor-pointer hover:bg-gray-700 transition-colors flex items-center justify-center"
                            >
                                <span className="text-white text-sm font-bold">+{overflow > 0 ? overflow : count}</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Empty: Skeleton gallery + CTA */
                    <div className="flex gap-3">
                        {/* Skeleton gallery frame */}
                        <div className="flex gap-1.5">
                            {/* Cover skeleton */}
                            <div className="w-[56px] h-[56px] bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg" />
                            {/* Thumb skeletons */}
                            <div className="grid grid-cols-2 gap-1">
                                {[0, 1, 2, 3].map(i => (
                                    <div key={i} className="w-[26px] h-[26px] bg-gray-100 rounded" />
                                ))}
                            </div>
                        </div>
                        {/* CTA side */}
                        <div className="flex-1 flex flex-col justify-center">
                            <p className="text-[11px] font-semibold text-gray-800">Pridėkite nuotraukas</p>
                            <p className={`${tiny} mb-2`}>Nuotraukos padidina susidomėjimą 40%</p>
                            <button onClick={onUpload} className="w-fit px-3 py-1.5 bg-teal-500 text-white text-[10px] font-bold rounded-lg hover:bg-teal-600 transition-all flex items-center gap-1.5">
                                <Upload className="w-3 h-3" />
                                Įkelti nuotraukas
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});
PhotoGalleryHero.displayName = 'PhotoGalleryHero';

// =============================================================================
// B4) TENANT CARD (Compact)
// =============================================================================

interface TenantCardProps {
    tenant: Tenant;
    isVacant: boolean;
    onAdd?: () => void;
    onView?: () => void;
}

const TenantCard = memo<TenantCardProps>(({ tenant, isVacant, onAdd, onView }) => (
    <div className={surface1}>
        <div className="px-3 py-2 border-b border-gray-100">
            <span className={heading}>Nuomininkas</span>
        </div>
        <div className="p-2.5">
            {isVacant ? (
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className={subtext}>Nėra priskirto nuomininko</p>
                        <p className={tiny}>Pridėkite nuomininką norint valdyti nuomą</p>
                    </div>
                    <button onClick={onAdd} className={ctaBtn + ' flex items-center gap-1'}>
                        <Plus className="w-3 h-3" />Pridėti
                    </button>
                </div>
            ) : (
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 bg-gradient-to-br from-teal-100 to-teal-200 rounded-full flex items-center justify-center">
                            <span className="text-sm font-bold text-teal-700">{tenant.name?.charAt(0) || 'N'}</span>
                        </div>
                        <div>
                            <p className="text-[12px] font-bold text-gray-900">{tenant.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                                {tenant.phone && <span className={`${tiny} flex items-center gap-0.5`}><Phone className="w-2.5 h-2.5" />{tenant.phone}</span>}
                                {tenant.contractEnd && <span className={`${tiny} flex items-center gap-0.5`}><Calendar className="w-2.5 h-2.5" />iki {tenant.contractEnd}</span>}
                            </div>
                        </div>
                    </div>
                    <button onClick={onView} className={`${cta} flex items-center gap-0.5`}>
                        Nuoma<ChevronRight className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}
        </div>
    </div>
));
TenantCard.displayName = 'TenantCard';

// =============================================================================
// C) OPERATIONS ROW: Mini Cards + Activity
// =============================================================================

interface MiniCardProps {
    icon: ReactNode;
    title: string;
    value: string | number | null;
    status?: string;
    cta: string;
    onAction?: () => void;
}

const MiniCard = memo<MiniCardProps>(({ icon, title, value, status, cta, onAction }) => (
    <div
        className={`${surface1} p-2.5 cursor-pointer hover:bg-white/90 transition-all`}
        onClick={onAction}
    >
        <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center">{icon}</div>
                <span className={heading}>{title}</span>
            </div>
            <span className={`${cta} flex items-center gap-0.5`}>{cta}<ChevronRight className="w-3 h-3" /></span>
        </div>
        <div className="flex items-center justify-between">
            {value !== null ? (
                <span className="text-[14px] font-bold text-gray-900">{value}</span>
            ) : (
                <span className={subtext}>Nėra</span>
            )}
            {status && <span className={tiny}>{status}</span>}
        </div>
    </div>
));
MiniCard.displayName = 'MiniCard';

interface ActivityCardProps {
    activities: { text: string; time: string }[];
    onUpload?: () => void;
}

const ActivityCard = memo<ActivityCardProps>(({ activities, onUpload }) => (
    <div className={surface1}>
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
            <span className={heading}>Paskutinė veikla</span>
            {activities.length > 0 && <button className={cta}>Visos →</button>}
        </div>
        <div className="px-3 py-2">
            {activities.length > 0 ? (
                <div className="space-y-1.5">
                    {activities.slice(0, 3).map((a, i) => (
                        <div key={i} className="flex items-start gap-2">
                            <Clock className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className={subtext}>{a.text}</p>
                                <p className={tiny}>{a.time}</p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex items-center justify-between">
                    <p className={subtext}>Nėra veiklos—pradėkite įkeldami nuotraukas</p>
                    <button onClick={onUpload} className={cta}>Įkelti →</button>
                </div>
            )}
        </div>
    </div>
));
ActivityCard.displayName = 'ActivityCard';

// =============================================================================
// D) STICKY BAR (Minimal)
// =============================================================================

interface StickyBarProps {
    address: string;
    isVacant: boolean;
    onPrimary?: () => void;
}

const StickyBar = memo<StickyBarProps>(({ address, isVacant, onPrimary }) => (
    <div className={`${stickyBg} px-3 py-2 mt-2`}>
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-teal-500 rounded-lg flex items-center justify-center">
                    <Home className="w-3.5 h-3.5 text-white" />
                </div>
                <p className="text-white text-[11px] font-semibold truncate max-w-[140px]">{address}</p>
            </div>
            <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 text-[9px] font-bold rounded ${isVacant ? 'bg-emerald-500 text-white' : 'bg-blue-500 text-white'}`}>
                    {isVacant ? 'Laisvas' : 'Išnuom.'}
                </span>
                <button onClick={onPrimary} className="px-3 py-1.5 bg-teal-500 text-white text-[10px] font-bold rounded-lg hover:bg-teal-600 transition-all">
                    {isVacant ? '+ Nuomininkas' : 'Nuoma'}
                </button>
                <button className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                    <MoreHorizontal className="w-4 h-4" />
                </button>
            </div>
        </div>
    </div>
));
StickyBar.displayName = 'StickyBar';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const PremiumOverviewTab: React.FC<PremiumOverviewProps> = ({
    tenant,
    property,
    photos = [],
    meters = [],
    documents = [],
    activities = [],
    onAddTenant,
    onViewTenant,
    onSetPrice,
    onUploadPhoto,
    onManagePhotos,
    onLayoutPhotos,
    onNavigateTab,
    onOpenSettings,
    onUploadDocument,
    onManageMeters,
}) => {
    const isVacant = !tenant?.name || tenant.status === 'vacant';

    // Tasks
    const tasks: Task[] = [
        { label: 'Pridėkite nuotraukas', done: photos.length >= 3, cta: 'Įkelti', onClick: onUploadPhoto },
        { label: 'Nustatykite kainą', done: !!tenant.monthlyRent, cta: 'Nustatyti', onClick: onSetPrice },
        { label: 'Užpildykite būsto info', done: !!property.rooms && !!property.area, cta: 'Pildyti', onClick: () => onNavigateTab?.('bustas') },
        { label: 'Konfigūruokite skaitiklius', done: meters.length > 0, cta: 'Valdyti', onClick: () => onNavigateTab?.('komunaliniai') },
        { label: 'Priskirkite nuomininką', done: !isVacant, cta: 'Pridėti', onClick: onAddTenant },
    ];

    // Next action (highest priority incomplete)
    const nextTask = tasks.find(t => !t.done);
    const nextAction = nextTask
        ? { label: nextTask.cta, short: nextTask.label.split(' ').pop() || '', onClick: nextTask.onClick }
        : { label: 'Paruoštas', short: 'Paruoštas', onClick: undefined };

    return (
        <div className="space-y-2 pb-2">
            {/* A) Command Header */}
            <CommandHeader
                property={property}
                isVacant={isVacant}
                nextAction={nextAction}
                onDocs={() => onNavigateTab?.('dokumentai')}
                onSettings={onOpenSettings}
            />

            {/* B) Hero Row: 60/40 split */}
            <div className="grid grid-cols-[3fr_2fr] gap-2">
                {/* Left 60%: Next Steps + Money */}
                <div className="space-y-2">
                    {isVacant && <NextStepsHero tasks={tasks} />}
                    <MoneySnapshot
                        rent={tenant.monthlyRent || null}
                        deposit={tenant.deposit || null}
                        paymentDay={tenant.paymentDay || null}
                        overdue={tenant.overdue || 0}
                        isVacant={isVacant}
                        onSetPrice={onSetPrice}
                        onAddDeposit={() => onNavigateTab?.('nuoma')}
                    />
                </div>

                {/* Right 40%: Photos + Tenant */}
                <div className="space-y-2">
                    <PhotoGalleryHero
                        photos={photos}
                        onUpload={onUploadPhoto}
                        onManage={onManagePhotos}
                        onLayout={onLayoutPhotos}
                    />
                    <TenantCard
                        tenant={tenant}
                        isVacant={isVacant}
                        onAdd={onAddTenant}
                        onView={onViewTenant}
                    />
                </div>
            </div>

            {/* C) Operations Row */}
            <div className="grid grid-cols-2 gap-2">
                <MiniCard
                    icon={<Droplets className="w-3.5 h-3.5 text-blue-500" />}
                    title="Skaitikliai"
                    value={meters.length > 0 ? meters.length : null}
                    status={meters.length > 0 ? 'Pask. skaitymas: šiandien' : undefined}
                    cta="Valdyti"
                    onAction={onManageMeters || (() => onNavigateTab?.('komunaliniai'))}
                />
                <MiniCard
                    icon={<FileText className="w-3.5 h-3.5 text-orange-500" />}
                    title="Dokumentai"
                    value={documents.length > 0 ? documents.length : null}
                    status={documents.length > 0 ? 'Pask. įkeltas: vakar' : undefined}
                    cta="Įkelti"
                    onAction={onUploadDocument || (() => onNavigateTab?.('dokumentai'))}
                />
            </div>

            <ActivityCard activities={activities} onUpload={onUploadPhoto} />

            {/* D) Sticky Bar */}
            <StickyBar
                address={property.address || 'Būstas'}
                isVacant={isVacant}
                onPrimary={isVacant ? onAddTenant : onViewTenant}
            />
        </div>
    );
};

export default PremiumOverviewTab;
