// Tenant Dashboard Type Definitions

export interface TenantLease {
    id: string;
    addressId: string;
    unitId: string;
    tenantId: string;
    address: string;
    unitLabel: string;
    status: 'active' | 'ending_soon' | 'ended';
    startDate: string;
    endDate: string;
    rentAmount: number;
    depositAmount: number;
    depositPaid: boolean;
    paymentDay: number;
    includedUtilities?: string[];
    landlordName?: string;
    landlordPhone?: string;
    landlordEmail?: string;
}

export interface Invoice {
    id: string;
    leaseId: string;
    amount: number;
    dueDate: string;
    period: string; // e.g. "2026-01" for January 2026
    status: 'paid' | 'pending' | 'overdue';
    paidAt?: string;
    pdfUrl?: string;
}

export interface Payment {
    id: string;
    invoiceId: string;
    amount: number;
    paidAt: string;
    method: 'bank_transfer' | 'cash' | 'card';
    receiptUrl?: string;
}

export interface MaintenanceRequest {
    id: string;
    leaseId: string;
    title: string;
    description: string;
    status: 'received' | 'in_progress' | 'completed';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    createdAt: string;
    updatedAt: string;
    completedAt?: string;
    photos?: string[];
}

export interface DocumentItem {
    id: string;
    leaseId: string;
    name: string;
    category: 'contract' | 'invoice' | 'act' | 'other';
    uploadedAt: string;
    uploadedBy: 'tenant' | 'landlord';
    fileUrl: string;
    fileSize: number;
}

export interface NotificationItem {
    id: string;
    type: 'payment_due' | 'payment_received' | 'maintenance_update' | 'document_added' | 'lease_ending';
    title: string;
    message: string;
    createdAt: string;
    read: boolean;
    actionUrl?: string;
}

export interface TenantDashboardData {
    leases: TenantLease[];
    selectedLease: TenantLease | null;
    currentInvoice: Invoice | null;
    recentPayments: Payment[];
    openMaintenanceRequests: MaintenanceRequest[];
    documents: DocumentItem[];
    notifications: NotificationItem[];
    loading: boolean;
    error: string | null;
}

// KPI Data
export interface DashboardKPIs {
    monthlyRent: number;
    rentStatus: 'paid' | 'pending' | 'overdue';
    nextPaymentDate: string | null;
    daysUntilPayment: number | null;
    openMaintenanceCount: number;
    inProgressMaintenanceCount: number;
    documentsCount: number;
    lastDocumentDate: string | null;
}

// Status label mappings (Lithuanian)
export const STATUS_LABELS = {
    rent: {
        paid: 'Apmokėta',
        pending: 'Laukia apmokėjimo',
        overdue: 'Vėluoja',
    },
    lease: {
        active: 'Aktyvi sutartis',
        ending_soon: 'Baigiasi netrukus',
        ended: 'Pasibaigusi',
    },
    maintenance: {
        received: 'Gauta',
        in_progress: 'Vykdoma',
        completed: 'Užbaigta',
    },
    document: {
        contract: 'Nuomos sutartis',
        invoice: 'Sąskaitos',
        act: 'Aktai',
        other: 'Kiti',
    },
} as const;
