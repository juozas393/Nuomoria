import React from 'react';

// Import grid components
import { PropertyHeroCard } from './overview/PropertyHeroCard';
import { TenantSummaryCard } from './overview/TenantSummaryCard';
import { PhotosCardLarge } from './overview/PhotosCardLarge';
import { RentTile, DepositTile, MetersTile, DocumentsTile } from './overview/KPIStatTile';
import { SetupProgressCard, SetupTask } from './overview/SetupProgressCard';
import { SummaryLinksCard } from './overview/SummaryLinksCard';
import { RecentActivityCard, ActivityItem } from './overview/RecentActivityCard';

// =============================================================================
// TYPES
// =============================================================================

interface TenantInfo {
    name?: string;
    phone?: string;
    email?: string;
    status?: string;
    contractStart?: string;
    contractEnd?: string;
    monthlyRent?: number;
    deposit?: number;
    paymentDay?: number;
    overdue?: number;
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

interface OverviewPanelProps {
    property: PropertyInfo;
    tenant: TenantInfo;
    photos?: string[];
    meters?: any[];
    documents?: any[];

    // Action handlers
    onAddTenant?: () => void;
    onViewTenant?: () => void;
    onSetPrice?: () => void;
    onSetDeposit?: () => void;
    onUploadPhoto?: () => void;
    onManagePhotos?: () => void;
    onManageMeters?: () => void;
    onUploadDocument?: () => void;
    onOpenSettings?: () => void;
    onNavigateTab?: (tab: string) => void;
}

// =============================================================================
// SINGLE PRIMARY ACTION SOURCE
// =============================================================================

type PrimaryActionSource = 'tenant' | 'hero' | 'none';

const getPrimaryActionSource = (
    isVacant: boolean,
    isSetupComplete: boolean
): PrimaryActionSource => {
    if (isVacant) return 'tenant';
    if (!isSetupComplete) return 'hero';
    return 'none';
};

// =============================================================================
// HELPERS
// =============================================================================

type PropertyStatus = 'vacant' | 'occupied' | 'draft' | 'archived' | 'reserved';

const getPropertyStatus = (tenant: TenantInfo, propertyStatus?: string): PropertyStatus => {
    if (propertyStatus === 'draft') return 'draft';
    if (propertyStatus === 'archived') return 'archived';
    if (!tenant?.name || tenant.status === 'vacant') return 'vacant';
    if (tenant.status === 'reserved') return 'reserved';
    return 'occupied';
};

const computeReadiness = (
    property: PropertyInfo,
    tenant: TenantInfo,
    photos: string[],
    isVacant: boolean
): { percent: number; isComplete: boolean; missingTasks: string[] } => {
    const missingTasks: string[] = [];

    if (photos.length < 3) missingTasks.push('photos');
    if (!tenant.monthlyRent || tenant.monthlyRent <= 0) missingTasks.push('price');
    if (!property.rooms || !property.area) missingTasks.push('info');
    if (isVacant) missingTasks.push('tenant');

    const completedCount = 4 - missingTasks.length;
    const percent = Math.round((completedCount / 4) * 100);

    return { percent, isComplete: missingTasks.length === 0, missingTasks };
};

// =============================================================================
// COMPONENT
// =============================================================================

export const OverviewPanel: React.FC<OverviewPanelProps> = ({
    property,
    tenant,
    photos = [],
    meters = [],
    documents = [],
    onAddTenant,
    onViewTenant,
    onUploadPhoto,
    onManagePhotos,
    onOpenSettings,
    onNavigateTab,
}) => {
    const status = getPropertyStatus(tenant, property.status);
    const isVacant = status === 'vacant';
    const readiness = computeReadiness(property, tenant, photos, isVacant);

    const primaryActionSource = getPrimaryActionSource(isVacant, readiness.isComplete);

    const heroPrimaryAction = primaryActionSource === 'hero'
        ? { label: 'Užbaigti paruošimą', onClick: onOpenSettings }
        : null;

    const tenantIsPrimary = primaryActionSource === 'tenant';

    // Checklist tasks
    const tasks: SetupTask[] = [
        {
            id: 'photos',
            label: photos.length > 0 ? 'Papildyti nuotraukas' : 'Įkelti nuotraukas',
            done: photos.length >= 3,
            cta: photos.length > 0 ? 'Papildyti' : 'Įkelti',
            onClick: onUploadPhoto,
        },
        {
            id: 'price',
            label: 'Kaina nustatyta',
            done: !!tenant.monthlyRent && tenant.monthlyRent > 0,
            cta: 'Nustatyti',
            onClick: () => onNavigateTab?.('rental'),
        },
        {
            id: 'info',
            label: 'Būsto info',
            done: !!property.rooms && !!property.area,
            cta: 'Pildyti',
            onClick: () => onNavigateTab?.('property'),
        },
        {
            id: 'tenant',
            label: 'Nuomininkas priskirtas',
            done: !isVacant,
            cta: 'Pridėti',
            onClick: onAddTenant,
        },
    ];

    // RULE 5: Recent activity (placeholder - integrate with real data)
    const recentActivities: ActivityItem[] = photos.length > 0 ? [
        {
            id: '1',
            type: 'photo_upload',
            label: `Įkelta ${photos.length} nuotrauk${photos.length === 1 ? 'a' : 'os'}`,
            timestamp: new Date(Date.now() - 3600000), // 1 hour ago placeholder
        },
    ] : [];

    return (
        <div className="p-4 space-y-4">
            <div className="grid grid-cols-12 gap-4">

                {/* ROW 1: Hero (left) + Tenant (right) */}
                <div className="col-span-12 lg:col-span-8">
                    <PropertyHeroCard
                        address={property.address || 'Adresas'}
                        propertyType={property.type}
                        rooms={property.rooms}
                        status={status}
                        readinessPercent={readiness.percent}
                        // RULE 1: Pass missing tasks for blockers summary
                        missingTasks={readiness.missingTasks}
                        primaryAction={heroPrimaryAction}
                        onViewProperty={() => onNavigateTab?.('property')}
                        onSettings={onOpenSettings}
                    />
                </div>

                <div className="col-span-12 lg:col-span-4">
                    <TenantSummaryCard
                        tenant={tenant}
                        isVacant={isVacant}
                        isPrimary={tenantIsPrimary}
                        onAddTenant={onAddTenant}
                        onViewTenant={onViewTenant}
                    />
                </div>

                {/* ROW 2: Photos (left) + Suvestinė (right) */}
                <div className="col-span-12 lg:col-span-8">
                    <PhotosCardLarge
                        photos={photos}
                        onUpload={onUploadPhoto}
                        onManage={onManagePhotos}
                    />
                </div>

                <div className="col-span-12 lg:col-span-4">
                    <SummaryLinksCard
                        rentStatus={tenant.monthlyRent ? `€${tenant.monthlyRent}/mėn` : undefined}
                        paymentDay={tenant.paymentDay}
                        documentsCount={documents.length}
                        metersCount={meters.length}
                        onNavigateRental={() => onNavigateTab?.('rental')}
                        onNavigateDocuments={() => onNavigateTab?.('documents')}
                        onNavigateMeters={() => onNavigateTab?.('meters')}
                    />
                </div>

                {/* ROW 3: KPI Tiles (left) */}
                <div className="col-span-12 lg:col-span-8">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <RentTile rent={tenant.monthlyRent} />
                        <DepositTile deposit={tenant.deposit} />
                        <MetersTile count={meters.length} />
                        <DocumentsTile count={documents.length} />
                    </div>
                </div>

                <div className="col-span-12 lg:col-span-4" />

                {/* ROW 4: Checklist (when incomplete) */}
                {!readiness.isComplete && (
                    <div className="col-span-12 lg:col-span-8">
                        <SetupProgressCard
                            tasks={tasks}
                            readinessPercent={readiness.percent}
                        />
                    </div>
                )}

                {/* Empty spacer when checklist shown */}
                {!readiness.isComplete && <div className="col-span-12 lg:col-span-4" />}

                {/* RULE 4: Activity full width for balance */}
                <div className="col-span-12 lg:col-span-8">
                    <RecentActivityCard
                        activities={recentActivities}
                        onViewAll={() => {/* TODO: navigate to activity log */ }}
                    />
                </div>
            </div>
        </div>
    );
};

export default OverviewPanel;
