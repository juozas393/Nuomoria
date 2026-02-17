import React, { useEffect, useState, useCallback } from 'react';

// Layout editor components
import { LayoutEditorProvider, useLayoutEditor } from './layout/LayoutEditorProvider';
import { EditableGrid } from './layout/EditableGrid';
import { EditModeToolbar, EditLayoutButton } from './layout/EditModeToolbar';
import { DEFAULT_LAYOUTS, CARD_IDS, LayoutItem } from './layout/layoutConstants';

// Card components
import { PropertyHeroCard } from './overview/PropertyHeroCard';
import { TenantSummaryCard } from './overview/TenantSummaryCard';
import { PhotosCardLarge } from './overview/PhotosCardLarge';
import { RentTile, DepositTile, MetersTile, DocumentsTile } from './overview/KPIStatTile';
import { SetupProgressCard, SetupTask } from './overview/SetupProgressCard';
import { SummaryLinksCard } from './overview/SummaryLinksCard';
import { RecentActivityCard, ActivityItem } from './overview/RecentActivityCard';

// API
import { getLayouts, saveLayouts } from '../../lib/api/layoutsApi';

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

interface Layouts {
    lg: LayoutItem[];
    md: LayoutItem[];
    sm: LayoutItem[];
}

interface OverviewWithLayoutEditorProps {
    property: PropertyInfo;
    tenant: TenantInfo;
    photos?: string[];
    meters?: any[];
    documents?: any[];
    canEditLayout?: boolean;

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
    onDeletePhoto?: (index: number) => void;
    onReorderPhotos?: (photos: string[]) => void;
    onSetCover?: (index: number) => void;
}

// =============================================================================
// HELPERS
// =============================================================================

type PropertyStatus = 'vacant' | 'occupied' | 'draft' | 'archived' | 'reserved';
type PrimaryActionSource = 'tenant' | 'hero' | 'none';

const getPropertyStatus = (tenant: TenantInfo, propertyStatus?: string): PropertyStatus => {
    if (propertyStatus === 'draft') return 'draft';
    if (propertyStatus === 'archived') return 'archived';
    if (!tenant?.name || tenant.status === 'vacant') return 'vacant';
    if (tenant.status === 'reserved') return 'reserved';
    return 'occupied';
};

const getPrimaryActionSource = (
    isVacant: boolean,
    isSetupComplete: boolean
): PrimaryActionSource => {
    if (isVacant) return 'tenant';
    if (!isSetupComplete) return 'hero';
    return 'none';
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
// INNER CONTENT (wrapped by provider)
// =============================================================================

const OverviewContent: React.FC<OverviewWithLayoutEditorProps> = ({
    property,
    tenant,
    photos = [],
    meters = [],
    documents = [],
    canEditLayout = true,
    onAddTenant,
    onViewTenant,
    onUploadPhoto,
    onManagePhotos,
    onOpenSettings,
    onNavigateTab,
    onDeletePhoto,
    onReorderPhotos,
    onSetCover,
}) => {
    const { isEditing } = useLayoutEditor();

    const status = getPropertyStatus(tenant, property.status);
    const isVacant = status === 'vacant';
    const readiness = computeReadiness(property, tenant, photos, isVacant);

    const primaryActionSource = getPrimaryActionSource(isVacant, readiness.isComplete);
    const heroPrimaryAction = primaryActionSource === 'hero'
        ? { label: 'Užbaigti paruošimą', onClick: onOpenSettings }
        : null;
    const tenantIsPrimary = primaryActionSource === 'tenant';

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

    const recentActivities: ActivityItem[] = photos.length > 0 ? [
        {
            id: '1',
            type: 'photo_upload',
            label: `Įkelta ${photos.length} nuotrauk${photos.length === 1 ? 'a' : 'os'}`,
            timestamp: new Date(Date.now() - 3600000),
        },
    ] : [];

    return (
        <div className="p-4">
            {/* Edit mode toolbar (sticky top) + Edit button when not editing */}
            <EditModeToolbar />
            {canEditLayout && (
                <div className="flex justify-end mb-2">
                    <EditLayoutButton />
                </div>
            )}

            <EditableGrid>
                {/* Hero Card */}
                <PropertyHeroCard
                    address={property.address || 'Adresas'}
                    propertyType={property.type}
                    rooms={property.rooms}
                    status={status}
                    readinessPercent={readiness.percent}
                    missingTasks={readiness.missingTasks}
                    primaryAction={heroPrimaryAction}
                    onViewProperty={() => onNavigateTab?.('property')}
                    onSettings={onOpenSettings}
                />

                {/* Tenant Card */}
                <TenantSummaryCard
                    tenant={tenant}
                    isVacant={isVacant}
                    isPrimary={tenantIsPrimary}
                    onAddTenant={onAddTenant}
                    onViewTenant={onViewTenant}
                />

                {/* Photos Card */}
                <PhotosCardLarge
                    photos={photos}
                    onUpload={onUploadPhoto}
                    onManage={() => onNavigateTab?.('property')}
                    onDeletePhoto={onDeletePhoto}
                    onReorderPhotos={onReorderPhotos}
                    onSetCover={onSetCover}
                />

                {/* Summary Links Card */}
                <SummaryLinksCard
                    rentStatus={tenant.monthlyRent ? `€${tenant.monthlyRent}/mėn` : undefined}
                    paymentDay={tenant.paymentDay}
                    documentsCount={documents.length}
                    metersCount={meters.length}
                    onNavigateRental={() => onNavigateTab?.('rental')}
                    onNavigateDocuments={() => onNavigateTab?.('documents')}
                    onNavigateMeters={() => onNavigateTab?.('meters')}
                />

                {/* KPI Tiles Block */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 h-full">
                    <RentTile rent={tenant.monthlyRent} />
                    <DepositTile deposit={tenant.deposit} />
                    <MetersTile count={meters.length} />
                    <DocumentsTile count={documents.length} />
                </div>

                {/* Checklist */}
                <div className="h-full">
                    {!readiness.isComplete ? (
                        <SetupProgressCard
                            tasks={tasks}
                            readinessPercent={readiness.percent}
                        />
                    ) : (
                        <div className="h-full bg-primary-light border border-primary/20 rounded-lg p-3 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary">✓ Būstas paruoštas</span>
                        </div>
                    )}
                </div>

                {/* Activity Card */}
                <RecentActivityCard
                    activities={recentActivities}
                    onViewAll={() => { }}
                />
            </EditableGrid>
        </div>
    );
};

// =============================================================================
// MAIN COMPONENT (with provider)
// =============================================================================

export const OverviewWithLayoutEditor: React.FC<OverviewWithLayoutEditorProps> = (props) => {
    const [initialLayouts, setInitialLayouts] = useState<Layouts>(DEFAULT_LAYOUTS);
    const [isLoading, setIsLoading] = useState(true);

    // Load saved layouts on mount
    useEffect(() => {
        const loadLayouts = async () => {
            try {
                const saved = await getLayouts(props.property.id);
                if (saved) {
                    setInitialLayouts(saved);
                }
            } catch (error) {
                console.error('Failed to load layouts:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadLayouts();
    }, [props.property.id]);

    const handleSave = useCallback(async (layouts: Layouts) => {
        await saveLayouts(props.property.id, layouts);
    }, [props.property.id]);

    if (isLoading) {
        return (
            <div className="p-4 animate-pulse">
                <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-8 h-24 bg-gray-200 rounded-xl" />
                    <div className="col-span-4 h-24 bg-gray-200 rounded-xl" />
                    <div className="col-span-8 h-48 bg-gray-200 rounded-xl" />
                    <div className="col-span-4 h-48 bg-gray-200 rounded-xl" />
                </div>
            </div>
        );
    }

    return (
        <LayoutEditorProvider
            propertyId={props.property.id}
            initialLayouts={initialLayouts}
            onSave={handleSave}
        >
            <OverviewContent {...props} />
        </LayoutEditorProvider>
    );
};

export default OverviewWithLayoutEditor;
