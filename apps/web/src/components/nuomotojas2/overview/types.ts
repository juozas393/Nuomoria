// TypeScript types for Premium Overview Dashboard

// === CORE ENTITIES ===

export interface OverviewUnit {
    id: string;
    address: string;
    apartmentNumber?: string;
    type: 'apartment' | 'house' | 'studio' | 'room' | 'commercial';
    status: 'vacant' | 'rented' | 'reserved' | 'moving_out';
    rooms?: number;
    area?: number;
    floor?: number;
    monthlyRent?: number;
    deposit?: number;
    photos: string[];
}

export interface TenantSummary {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    avatarUrl?: string;
    moveInDate?: string;
    contractEnd?: string;
}

export interface LeaseSummary {
    id?: string;
    startDate?: string;
    endDate?: string;
    monthlyRent?: number;
    deposit?: number;
    depositPaid?: boolean;
    autoRenewal?: boolean;
    status: 'active' | 'expired' | 'pending' | 'none';
}

export interface PaymentSummary {
    currentMonthPaid: boolean;
    currentMonthAmount?: number;
    outstandingAmount: number;
    lastPaymentDate?: string;
    nextDueDate?: string;
}

export interface UtilitySummary {
    meterCount: number;
    pendingReadings: number;
    lastReadingDate?: string;
}

export interface DocumentSummary {
    totalCount: number;
    requiredMissing: string[];
    lastUploadDate?: string;
}

export interface ActivityEvent {
    id: string;
    type: 'created' | 'tenant_added' | 'tenant_removed' | 'payment' | 'document' | 'lease' | 'meter_reading' | 'status_change';
    title: string;
    description?: string;
    timestamp: string;
    icon?: string;
}

export interface RentReadyTask {
    id: string;
    label: string;
    complete: boolean;
    action?: () => void;
    priority: number;
}

// === COMPONENT PROPS ===

export interface StatusBadgeProps {
    status: 'vacant' | 'rented' | 'reserved' | 'moving_out';
    size?: 'sm' | 'md' | 'lg';
}

export interface KPIStatCardProps {
    icon: React.ComponentType<{ className?: string }>;
    value: string | number;
    label: string;
    accent?: boolean;
    onClick?: () => void;
    isEmpty?: boolean;
    emptyLabel?: string;
    emptyCta?: string;
    onEmptyAction?: () => void;
    helperText?: string;
}

export interface SummaryHeaderProps {
    unit: OverviewUnit;
    onAddTenant?: () => void;
    onPublish?: () => void;
    onSettings?: () => void;
    onViewPhotos?: () => void;
    onSetRent?: () => void;
    onRecordPayment?: () => void;
    onViewLease?: () => void;
    onSendReminder?: () => void;
}

export interface TenantCardProps {
    tenant?: TenantSummary;
    lease?: LeaseSummary;
    onAddTenant?: () => void;
    onViewTenant?: () => void;
}

export interface RentReadyChecklistProps {
    tasks: RentReadyTask[];
    progress: number;
    isVacant: boolean;
}

export interface ActivityTimelineProps {
    events: ActivityEvent[];
    maxItems?: number;
}

export interface QuickSummaryCardProps {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    value: string;
    onClick?: () => void;
}

// === UTILITY TYPES ===

export type OccupancyState = 'VACANT' | 'OCCUPIED' | 'MOVING_OUT' | 'RESERVED';

export const getOccupancyLabel = (state: OccupancyState): string => {
    const labels: Record<OccupancyState, string> = {
        'VACANT': 'Laisvas',
        'OCCUPIED': 'Išnuomotas',
        'MOVING_OUT': 'Išsikrausto',
        'RESERVED': 'Rezervuotas',
    };
    return labels[state];
};

export const getStatusVariant = (status: string): 'vacant' | 'rented' | 'reserved' | 'moving_out' => {
    const map: Record<string, 'vacant' | 'rented' | 'reserved' | 'moving_out'> = {
        'vacant': 'vacant',
        'rented': 'rented',
        'occupied': 'rented',
        'active': 'rented',
        'reserved': 'reserved',
        'moving_out': 'moving_out',
        'notice': 'moving_out',
        'notice_given': 'moving_out',
    };
    return map[status?.toLowerCase()] || 'vacant';
};
