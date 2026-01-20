import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';
import {
    TenantLease,
    Invoice,
    Payment,
    MaintenanceRequest,
    DocumentItem,
    NotificationItem,
    TenantDashboardData,
    DashboardKPIs
} from '../types/tenant.types';

const SELECTED_LEASE_KEY = 'tenant.selectedLeaseId';

// Mock data for development (will be replaced with real Supabase queries)
const getMockData = (userId: string): TenantDashboardData => ({
    leases: [
        {
            id: 'lease-1',
            addressId: 'addr-1',
            unitId: 'unit-1',
            tenantId: userId,
            address: 'Gedimino pr. 15',
            unitLabel: 'Butas 3',
            status: 'active',
            startDate: '2025-06-01',
            endDate: '2026-06-01',
            rentAmount: 550,
            depositAmount: 550,
            depositPaid: true,
            paymentDay: 1,
            includedUtilities: ['Vanduo', 'Šildymas'],
            landlordName: 'Jonas Jonaitis',
            landlordPhone: '+370 600 12345',
            landlordEmail: 'jonas@example.com',
        },
    ],
    selectedLease: null,
    currentInvoice: {
        id: 'inv-1',
        leaseId: 'lease-1',
        amount: 550,
        dueDate: '2026-02-01',
        period: '2026-02',
        status: 'pending',
    },
    recentPayments: [
        {
            id: 'pay-1',
            invoiceId: 'inv-0',
            amount: 550,
            paidAt: '2026-01-02',
            method: 'bank_transfer',
        },
    ],
    openMaintenanceRequests: [],
    documents: [
        {
            id: 'doc-1',
            leaseId: 'lease-1',
            name: 'Nuomos sutartis 2025-2026.pdf',
            category: 'contract',
            uploadedAt: '2025-06-01',
            uploadedBy: 'landlord',
            fileUrl: '/documents/contract.pdf',
            fileSize: 245000,
        },
    ],
    notifications: [
        {
            id: 'notif-1',
            type: 'payment_due',
            title: 'Artėja mokėjimo terminas',
            message: 'Vasario mėnesio nuoma (550 €) turi būti apmokėta iki vasario 1 d.',
            createdAt: new Date().toISOString(),
            read: false,
        },
    ],
    loading: false,
    error: null,
});

export function useTenantDashboard(tenantUserId: string) {
    const [data, setData] = useState<TenantDashboardData>({
        leases: [],
        selectedLease: null,
        currentInvoice: null,
        recentPayments: [],
        openMaintenanceRequests: [],
        documents: [],
        notifications: [],
        loading: true,
        error: null,
    });

    // Load selected lease from localStorage
    const getStoredLeaseId = useCallback(() => {
        try {
            return localStorage.getItem(SELECTED_LEASE_KEY);
        } catch {
            return null;
        }
    }, []);

    // Save selected lease to localStorage
    const setStoredLeaseId = useCallback((leaseId: string) => {
        try {
            localStorage.setItem(SELECTED_LEASE_KEY, leaseId);
        } catch { }
    }, []);

    // Select a lease
    const selectLease = useCallback((leaseId: string) => {
        setData(prev => {
            const lease = prev.leases.find(l => l.id === leaseId);
            if (lease) {
                setStoredLeaseId(leaseId);
                return { ...prev, selectedLease: lease };
            }
            return prev;
        });
    }, [setStoredLeaseId]);

    // Fetch dashboard data
    const fetchData = useCallback(async () => {
        if (!tenantUserId) return;

        setData(prev => ({ ...prev, loading: true, error: null }));

        try {
            // For now, use mock data
            // TODO: Replace with real Supabase queries when tables are ready
            const mockData = getMockData(tenantUserId);

            // Get stored lease or default to first
            const storedLeaseId = getStoredLeaseId();
            const selectedLease = storedLeaseId
                ? mockData.leases.find(l => l.id === storedLeaseId) || mockData.leases[0]
                : mockData.leases[0];

            setData({
                ...mockData,
                selectedLease: selectedLease || null,
                loading: false,
            });

        } catch (error: any) {
            console.error('Error fetching tenant dashboard:', error);
            setData(prev => ({
                ...prev,
                loading: false,
                error: 'Nepavyko užkrauti duomenų. Bandykite dar kartą.',
            }));
        }
    }, [tenantUserId, getStoredLeaseId]);

    // Calculate KPIs
    const kpis = useMemo((): DashboardKPIs => {
        const { selectedLease, currentInvoice, openMaintenanceRequests, documents } = data;

        const now = new Date();
        const nextPaymentDate = currentInvoice?.dueDate || null;
        const daysUntilPayment = nextPaymentDate
            ? Math.ceil((new Date(nextPaymentDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            : null;

        const lastDoc = documents.sort((a, b) =>
            new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
        )[0];

        return {
            monthlyRent: selectedLease?.rentAmount || 0,
            rentStatus: currentInvoice?.status || 'pending',
            nextPaymentDate,
            daysUntilPayment,
            openMaintenanceCount: openMaintenanceRequests.filter(r => r.status !== 'completed').length,
            inProgressMaintenanceCount: openMaintenanceRequests.filter(r => r.status === 'in_progress').length,
            documentsCount: documents.length,
            lastDocumentDate: lastDoc?.uploadedAt || null,
        };
    }, [data]);

    // Initial fetch
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return {
        ...data,
        kpis,
        selectLease,
        refetch: fetchData,
    };
}
