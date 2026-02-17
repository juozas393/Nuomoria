import React, { useMemo } from 'react';
import { Euro, Droplets, FileText, CreditCard } from 'lucide-react';

// Import PhotoGallerySection for consistent layout with Būstas
import { PhotoGallerySection } from './PhotoGallerySection';

// Import DashboardGrid for drag-and-drop customization
import { DashboardGrid, WidgetConfig } from './DashboardGrid';

// Import new modular components
import {
    SummaryHeader,
    TenantCard,
    RentReadyChecklist,
    ActivityTimeline,
    QuickSummaryCard,
    KPIStatCard,
    RentReadyTask,
    ActivityEvent,
    TenantSummary,
    LeaseSummary,
    OverviewUnit,
    getStatusVariant,
} from './overview';

// =============================================================================
// TYPES
// =============================================================================

interface PropertyInfo {
    id: string;
    address?: string;
    rooms?: number;
    area?: number;
    floor?: number;
    type?: string;
}

interface TenantInfo {
    name?: string;
    email?: string;
    phone?: string;
    status?: string;
    monthlyRent?: number;
    contractStart?: string;
    contractEnd?: string;
    deposit?: number;
    photos?: string[];
}

interface MinimalOverviewTabProps {
    tenant: TenantInfo;
    property: PropertyInfo;
    moveOut?: any;
    meters?: Array<{ id: string }>;
    documentsCount?: number;
    onNavigateTab?: (tab: string, section?: string) => void;
    onEditProperty?: () => void;
    onAddTenant?: () => void;
}

// =============================================================================
// HELPERS
// =============================================================================

const hasMeaningfulValue = (value: any): boolean => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'number' && value === 0) return false;
    if (typeof value === 'string' && (!value || value.toLowerCase() === 'none')) return false;
    return true;
};

const getOccupancyState = (tenant: TenantInfo, moveOut?: any): 'VACANT' | 'OCCUPIED' | 'MOVING_OUT' => {
    if (!tenant.name || tenant.status === 'vacant') return 'VACANT';
    if (moveOut?.isMovingOut || moveOut?.planned) return 'MOVING_OUT';
    return 'OCCUPIED';
};

// =============================================================================
// COMPONENT
// =============================================================================

export const MinimalOverviewTab: React.FC<MinimalOverviewTabProps> = ({
    tenant,
    property,
    moveOut,
    meters = [],
    documentsCount = 0,
    onNavigateTab,
    onEditProperty,
    onAddTenant
}) => {
    const occupancyState = getOccupancyState(tenant, moveOut);
    const isVacant = occupancyState === 'VACANT';
    const photos = tenant.photos || [];

    // Filter valid photos
    const validPhotos = photos.filter((p: string) => p && typeof p === 'string' && p.startsWith('http'));

    // Map to new component types
    const unit: OverviewUnit = useMemo(() => ({
        id: property.id,
        address: property.address || '',
        type: (property.type as OverviewUnit['type']) || 'apartment',
        status: isVacant ? 'vacant' : occupancyState === 'MOVING_OUT' ? 'moving_out' : 'rented',
        rooms: property.rooms,
        area: property.area,
        floor: property.floor,
        monthlyRent: tenant.monthlyRent,
        deposit: tenant.deposit,
        photos: validPhotos,
    }), [property, tenant, isVacant, occupancyState, validPhotos]);

    const tenantSummary: TenantSummary | undefined = useMemo(() => {
        if (isVacant || !tenant.name) return undefined;
        return {
            id: property.id,
            name: tenant.name,
            phone: tenant.phone,
            email: tenant.email,
            moveInDate: tenant.contractStart,
            contractEnd: tenant.contractEnd,
        };
    }, [tenant, property.id, isVacant]);

    const leaseSummary: LeaseSummary = useMemo(() => ({
        startDate: tenant.contractStart,
        endDate: tenant.contractEnd,
        monthlyRent: tenant.monthlyRent,
        deposit: tenant.deposit,
        status: isVacant ? 'none' : 'active',
    }), [tenant, isVacant]);

    // Rent-ready checklist tasks
    const rentReadyTasks: RentReadyTask[] = useMemo(() => [
        {
            id: 'photos',
            label: 'Nuotraukos (3+)',
            complete: validPhotos.length >= 3,
            action: () => onNavigateTab?.('bustas', 'nuotraukos'),
            priority: 1,
        },
        {
            id: 'price',
            label: 'Kaina nustatyta',
            complete: hasMeaningfulValue(tenant.monthlyRent),
            action: () => onNavigateTab?.('nuoma'),
            priority: 2,
        },
        {
            id: 'info',
            label: 'Būsto info',
            complete: hasMeaningfulValue(property.area) && hasMeaningfulValue(property.rooms),
            action: () => onNavigateTab?.('bustas', 'info'),
            priority: 3,
        },
        {
            id: 'tenant',
            label: 'Nuomininkas',
            complete: !isVacant,
            action: onAddTenant,
            priority: 4,
        },
    ], [validPhotos.length, tenant.monthlyRent, property.area, property.rooms, isVacant, onNavigateTab, onAddTenant]);

    const completedCount = rentReadyTasks.filter(t => t.complete).length;
    const progress = Math.round((completedCount / rentReadyTasks.length) * 100);

    // Activity events (mock for now - would come from database)
    const activityEvents: ActivityEvent[] = useMemo(() => {
        const events: ActivityEvent[] = [];

        if (tenant.contractStart) {
            events.push({
                id: 'lease-start',
                type: 'lease',
                title: 'Sutartis pradėta',
                timestamp: tenant.contractStart,
            });
        }

        if (tenant.name && !isVacant) {
            events.push({
                id: 'tenant-added',
                type: 'tenant_added',
                title: `${tenant.name} prisijungė`,
                timestamp: tenant.contractStart || new Date().toISOString(),
            });
        }

        // Sort by date descending
        return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [tenant, isVacant]);

    // Define widgets for DashboardGrid
    const widgets: WidgetConfig[] = useMemo(() => [
        {
            key: 'header',
            title: 'Būsto informacija',
            component: (
                <SummaryHeader
                    unit={unit}
                    onAddTenant={onAddTenant}
                    onViewPhotos={() => onNavigateTab?.('property', 'nuotraukos')}
                    onSettings={() => onNavigateTab?.('property')}
                    onSetRent={() => onNavigateTab?.('rent')}
                />
            ),
        },
        {
            key: 'photos',
            title: 'Nuotraukos',
            component: (
                <PhotoGallerySection
                    photos={validPhotos}
                    propertyId={property.id}
                    onUploadPhoto={() => onNavigateTab?.('property', 'nuotraukos')}
                />
            ),
        },
        {
            key: 'tenant',
            title: 'Nuomininkas',
            component: (
                <TenantCard
                    tenant={tenantSummary}
                    lease={leaseSummary}
                    onAddTenant={onAddTenant}
                    onViewTenant={() => onNavigateTab?.('rent')}
                />
            ),
        },
        {
            key: 'kpis',
            title: 'Statistika',
            component: (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <KPIStatCard
                        icon={Euro}
                        value={hasMeaningfulValue(tenant.monthlyRent) ? `€${tenant.monthlyRent}` : ''}
                        label="Nuoma/mėn"
                        accent={true}
                        isEmpty={!hasMeaningfulValue(tenant.monthlyRent)}
                        emptyLabel="Nenustatyta"
                        emptyCta="Nustatyti kainą"
                        onEmptyAction={() => onNavigateTab?.('nuoma')}
                        onClick={() => onNavigateTab?.('nuoma')}
                    />
                    <KPIStatCard
                        icon={Euro}
                        value={hasMeaningfulValue(tenant.deposit) ? `€${tenant.deposit}` : ''}
                        label="Užstatas"
                        isEmpty={!hasMeaningfulValue(tenant.deposit)}
                        emptyLabel="Nenustatyta"
                        emptyCta="Pridėti užstatą"
                        onEmptyAction={() => onNavigateTab?.('nuoma')}
                        onClick={() => onNavigateTab?.('nuoma')}
                    />
                    <KPIStatCard
                        icon={Droplets}
                        value={meters.length > 0 ? meters.length : ''}
                        label="Skaitikliai"
                        isEmpty={meters.length === 0}
                        emptyLabel="Nėra"
                        emptyCta="Pridėti skaitiklį"
                        onEmptyAction={() => onNavigateTab?.('komunaliniai')}
                        onClick={() => onNavigateTab?.('komunaliniai')}
                    />
                    <KPIStatCard
                        icon={FileText}
                        value={documentsCount > 0 ? documentsCount : ''}
                        label="Dokumentai"
                        isEmpty={documentsCount === 0}
                        emptyLabel="Nėra"
                        emptyCta="Įkelti dokumentą"
                        onEmptyAction={() => onNavigateTab?.('dokumentai')}
                        onClick={() => onNavigateTab?.('dokumentai')}
                    />
                </div>
            ),
        },
        {
            key: 'checklist',
            title: 'Paruošti nuomai',
            component: (
                <RentReadyChecklist
                    tasks={rentReadyTasks}
                    progress={progress}
                    isVacant={isVacant}
                />
            ),
        },
        {
            key: 'activity',
            title: 'Veikla',
            component: (
                <ActivityTimeline
                    events={activityEvents}
                    maxItems={5}
                />
            ),
        },
        {
            key: 'summary',
            title: 'Suvestinė',
            component: (
                <div
                    className="rounded-2xl border border-gray-100 p-4 space-y-2"
                    style={{
                        backgroundImage: `url('/images/CardsBackground.webp')`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                    }}
                >
                    <h4 className="text-[13px] font-semibold text-gray-900 mb-3">Suvestinė</h4>
                    <QuickSummaryCard
                        icon={FileText}
                        title="Dokumentai"
                        value={documentsCount > 0 ? `${documentsCount} failai` : 'Nėra įkeltų'}
                        onClick={() => onNavigateTab?.('dokumentai')}
                    />
                    <QuickSummaryCard
                        icon={Droplets}
                        title="Komunaliniai"
                        value={meters.length > 0 ? `${meters.length} skaitliuk.` : 'Nėra pridėtų'}
                        onClick={() => onNavigateTab?.('komunaliniai')}
                    />
                    {!isVacant && (
                        <QuickSummaryCard
                            icon={CreditCard}
                            title="Mokėjimai"
                            value="Peržiūrėti"
                            onClick={() => onNavigateTab?.('nuoma')}
                        />
                    )}
                </div>
            ),
        },
    ], [unit, validPhotos, property.id, tenantSummary, leaseSummary, tenant, meters, documentsCount, rentReadyTasks, progress, isVacant, activityEvents, onNavigateTab, onAddTenant, onEditProperty]);

    return (
        <DashboardGrid
            widgets={widgets}
            storageKey="dashboard-overview-global"
        />
    );
};

export default MinimalOverviewTab;


