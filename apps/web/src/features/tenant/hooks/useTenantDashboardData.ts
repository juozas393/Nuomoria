import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';

/**
 * Real data hook for Tenant Dashboard
 * Fetches rentals, invoices, maintenance, documents for a tenant user
 */

// Types
export interface TenantRental {
    id: string;
    addressId: string;
    address: string;
    unitLabel: string;
    status: 'active' | 'ended' | 'pending';
    landlordId?: string;
    landlordName?: string;
    landlordPhone?: string;
    landlordEmail?: string;
    contractStart: string;
    contractEnd: string;
    rentAmount: number;
    depositAmount: number;
    depositPaid: boolean;
    paymentDay: number;
    area?: number;
    rooms?: number;
}

export interface TenantInvoice {
    id: string;
    rentalId: string;
    rentalLabel?: string;
    period: string;
    periodLabel: string;
    amount: number;
    dueDate: string;
    status: 'paid' | 'pending' | 'overdue';
    paidAt?: string;
}

export interface TenantNotification {
    id: string;
    type: 'payment_due' | 'payment_received' | 'document_uploaded' | 'maintenance_update' | 'meter_reminder';
    title: string;
    message: string;
    timestamp: string;
    relativeTime: string;
    rentalId?: string;
    link?: string;
}

export interface TenantDocument {
    id: string;
    rentalId: string;
    name: string;
    type: 'contract' | 'invoice' | 'receipt' | 'other';
    url?: string;
    createdAt: string;
}

export interface HeroData {
    amount: number;
    status: 'paid' | 'pending' | 'overdue';
    nextDueDate?: string;
    daysUntilDue?: number | null;
    daysOverdue?: number | null;
}

export interface KpiData {
    nextPaymentDate: string | null;
    daysUntilPayment: number | null;
    openMaintenanceCount: number;
    inProgressCount: number;
    documentsCount: number;
    depositAmount: number;
    depositPaid: boolean;
}

export interface ContractDetails {
    type?: string;
    monthlyRent: number;
    deposit: number;
    depositPaid: boolean;
    paymentDay: number;
    startDate: string;
    endDate: string;
    utilitiesIncluded: boolean;
    hasContractDocument: boolean;
}

export interface TenantDashboardData {
    // Core data
    rentals: TenantRental[];
    selectedRentalId: string | 'all';
    selectedRental: TenantRental | null;

    // Computed dashboard data
    hero: HeroData;
    kpis: KpiData;
    upcomingInvoices: TenantInvoice[];
    notifications: TenantNotification[];
    contractDetails: ContractDetails | null;

    // State
    loading: boolean;
    error: string | null;

    // Actions
    selectRental: (rentalId: string | 'all') => void;
    refresh: () => void;
}

// Helper: Relative time string
const getRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `Prieš ${diffMins} min.`;
    if (diffHours < 24) return `Prieš ${diffHours} val.`;
    if (diffDays === 1) return 'Vakar';
    if (diffDays < 7) return `Prieš ${diffDays} d.`;
    return `Prieš ${Math.floor(diffDays / 7)} sav.`;
};

// Helper: Format period label
const formatPeriodLabel = (period: string): string => {
    const [year, month] = period.split('-');
    const months = ['sausis', 'vasaris', 'kovas', 'balandis', 'gegužė', 'birželis',
        'liepa', 'rugpjūtis', 'rugsėjis', 'spalis', 'lapkritis', 'gruodis'];
    return `${year} ${months[parseInt(month) - 1]}`;
};

// Helper: Days until date
const daysUntil = (dateStr: string): number => {
    const date = new Date(dateStr);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    return Math.ceil((date.getTime() - now.getTime()) / 86400000);
};

const STORAGE_KEY = 'tenant-selected-rental';

export function useTenantDashboardData(userId: string): TenantDashboardData {
    const [rentals, setRentals] = useState<TenantRental[]>([]);
    const [invoices, setInvoices] = useState<TenantInvoice[]>([]);
    const [maintenanceCount, setMaintenanceCount] = useState({ open: 0, inProgress: 0 });
    const [documentsCount, setDocumentsCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [selectedRentalId, setSelectedRentalId] = useState<string | 'all'>(() => {
        if (typeof window === 'undefined') return 'all';
        return localStorage.getItem(STORAGE_KEY) || 'all';
    });

    // Fetch all data
    const fetchData = useCallback(async () => {
        if (!userId) return;

        setLoading(true);
        setError(null);

        try {
            // 1. Fetch rentals (properties where tenant is assigned by email or user_id)
            // First get user's email
            const { data: userData } = await supabase.auth.getUser();
            const userEmail = userData?.user?.email;

            // Fetch properties where tenant matches
            // Note: In current schema, Property has tenant_name, but no tenant_user_id
            // We need to match by email or through tenant_invitations

            // Try to find properties via accepted tenant invitations
            let rentalData: TenantRental[] = [];

            if (userEmail) {
                console.log('🔍 Searching for accepted invitations for email:', userEmail);

                const { data: invitations, error: invError } = await supabase
                    .from('tenant_invitations')
                    .select(`
            id,
            property_id,
            contract_start,
            contract_end,
            rent,
            deposit,
            status,
            property_label,
            invited_by_email,
            email
          `)
                    .eq('status', 'accepted');
                // Note: We fetch ALL accepted and filter locally due to RLS complexity

                console.log('📋 All accepted invitations:', invitations);
                console.log('❌ Error:', invError);

                // Filter locally by email (case-insensitive)
                const myInvitations = invitations?.filter(inv =>
                    inv.email?.toLowerCase() === userEmail.toLowerCase()
                ) || [];

                console.log('✅ My invitations:', myInvitations);

                if (myInvitations.length > 0) {
                    // Fetch property details for each invitation
                    const propertyIds = myInvitations.map(inv => inv.property_id);
                    console.log('🏠 Fetching properties:', propertyIds);

                    const { data: properties, error: propError } = await supabase
                        .from('properties')
                        .select(`
              id,
              address_id,
              apartment_number,
              rent,
              deposit,
              deposit_paid,
              contract_start,
              contract_end,
              payment_due_day,
              area,
              rooms,
              status,
              addresses:address_id (
                id,
                full_address
              )
            `)
                        .in('id', propertyIds);

                    console.log('🏠 Properties found:', properties);
                    console.log('❌ Properties error:', propError);

                    if (properties) {
                        rentalData = properties.map((prop: any) => ({
                            id: prop.id,
                            addressId: prop.address_id,
                            address: prop.addresses?.full_address || 'Nežinomas adresas',
                            unitLabel: `Butas ${prop.apartment_number}`,
                            status: prop.status === 'occupied' ? 'active' : 'ended',
                            contractStart: prop.contract_start,
                            contractEnd: prop.contract_end,
                            rentAmount: prop.rent || 0,
                            depositAmount: prop.deposit || 0,
                            depositPaid: prop.deposit_paid || false,
                            paymentDay: prop.payment_due_day || 1,
                            area: prop.area,
                            rooms: prop.rooms,
                        }));
                    }
                }
            }

            setRentals(rentalData);

            // If only 1 rental, auto-select it
            if (rentalData.length === 1) {
                setSelectedRentalId(rentalData[0].id);
                localStorage.setItem(STORAGE_KEY, rentalData[0].id);
            }

            // 2. Fetch invoices for tenant's properties
            if (rentalData.length > 0) {
                const propertyIds = rentalData.map(r => r.id);
                const { data: invoiceData } = await supabase
                    .from('invoices')
                    .select('*')
                    .in('property_id', propertyIds)
                    .order('due_date', { ascending: false })
                    .limit(10);

                if (invoiceData) {
                    const now = new Date();
                    const mapped: TenantInvoice[] = invoiceData.map((inv: any) => {
                        const dueDate = new Date(inv.due_date);
                        let status: 'paid' | 'pending' | 'overdue' = 'pending';
                        if (inv.status === 'paid') status = 'paid';
                        else if (dueDate < now) status = 'overdue';

                        const rental = rentalData.find(r => r.id === inv.property_id);
                        const period = inv.invoice_date?.substring(0, 7) || '';

                        return {
                            id: inv.id,
                            rentalId: inv.property_id,
                            rentalLabel: rental ? `${rental.address}, ${rental.unitLabel}` : undefined,
                            period,
                            periodLabel: period ? formatPeriodLabel(period) : '',
                            amount: inv.amount,
                            dueDate: inv.due_date,
                            status,
                            paidAt: inv.paid_date,
                        };
                    });
                    setInvoices(mapped);
                }

                // 3. Count maintenance requests (open + in_progress)
                // Note: maintenance_requests table might not exist yet
                try {
                    const { count: openCount } = await supabase
                        .from('maintenance_requests')
                        .select('*', { count: 'exact', head: true })
                        .in('property_id', propertyIds)
                        .in('status', ['open', 'pending']);

                    const { count: progressCount } = await supabase
                        .from('maintenance_requests')
                        .select('*', { count: 'exact', head: true })
                        .in('property_id', propertyIds)
                        .eq('status', 'in_progress');

                    setMaintenanceCount({ open: openCount || 0, inProgress: progressCount || 0 });
                } catch {
                    // Table might not exist
                    setMaintenanceCount({ open: 0, inProgress: 0 });
                }

                // 4. Count documents
                try {
                    const { count } = await supabase
                        .from('documents')
                        .select('*', { count: 'exact', head: true })
                        .in('property_id', propertyIds);
                    setDocumentsCount(count || 0);
                } catch {
                    setDocumentsCount(0);
                }
            }

        } catch (err: any) {
            console.error('Error fetching tenant dashboard data:', err);
            setError(err.message || 'Nepavyko gauti duomenų');
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Save selection to localStorage
    const selectRental = useCallback((id: string | 'all') => {
        setSelectedRentalId(id);
        localStorage.setItem(STORAGE_KEY, id);
    }, []);

    // Computed: Selected rental
    const selectedRental = useMemo(() => {
        if (selectedRentalId === 'all') return null;
        return rentals.find(r => r.id === selectedRentalId) || null;
    }, [rentals, selectedRentalId]);

    // Computed: Filtered invoices
    const filteredInvoices = useMemo(() => {
        if (selectedRentalId === 'all') return invoices;
        return invoices.filter(inv => inv.rentalId === selectedRentalId);
    }, [invoices, selectedRentalId]);

    // Computed: Hero data
    const hero = useMemo((): HeroData => {
        const relevantInvoices = filteredInvoices.filter(inv => inv.status !== 'paid');
        const currentMonthInv = relevantInvoices[0];

        if (!currentMonthInv) {
            // All paid or no invoices
            const rental = selectedRental || rentals[0];
            return {
                amount: rental?.rentAmount || 0,
                status: 'paid',
                nextDueDate: undefined,
                daysUntilDue: null,
            };
        }

        const days = daysUntil(currentMonthInv.dueDate);

        return {
            amount: selectedRentalId === 'all'
                ? relevantInvoices.reduce((sum, inv) => sum + inv.amount, 0)
                : currentMonthInv.amount,
            status: currentMonthInv.status,
            nextDueDate: currentMonthInv.dueDate,
            daysUntilDue: days >= 0 ? days : null,
            daysOverdue: days < 0 ? Math.abs(days) : null,
        };
    }, [filteredInvoices, selectedRental, rentals, selectedRentalId]);

    // Computed: KPIs
    const kpis = useMemo((): KpiData => {
        const nextUnpaid = filteredInvoices.find(inv => inv.status !== 'paid');
        const rental = selectedRental || rentals[0];

        return {
            nextPaymentDate: nextUnpaid?.dueDate || null,
            daysUntilPayment: nextUnpaid ? daysUntil(nextUnpaid.dueDate) : null,
            openMaintenanceCount: maintenanceCount.open + maintenanceCount.inProgress,
            inProgressCount: maintenanceCount.inProgress,
            documentsCount,
            depositAmount: rental?.depositAmount || 0,
            depositPaid: rental?.depositPaid || false,
        };
    }, [filteredInvoices, selectedRental, rentals, maintenanceCount, documentsCount]);

    // Computed: Upcoming invoices (show pending/overdue first, then recent paid)
    const upcomingInvoices = useMemo((): TenantInvoice[] => {
        const pending = filteredInvoices.filter(inv => inv.status !== 'paid');
        const paid = filteredInvoices.filter(inv => inv.status === 'paid');
        return [...pending, ...paid].slice(0, 3);
    }, [filteredInvoices]);

    // Computed: Notifications (derived from data)
    const notifications = useMemo((): TenantNotification[] => {
        const items: TenantNotification[] = [];

        // Upcoming payment due (within 7 days)
        const upcoming = filteredInvoices.find(inv => {
            if (inv.status !== 'pending') return false;
            const days = daysUntil(inv.dueDate);
            return days >= 0 && days <= 7;
        });

        if (upcoming) {
            items.push({
                id: `payment-due-${upcoming.id}`,
                type: 'payment_due',
                title: 'Artėja mokėjimo terminas',
                message: `${upcoming.periodLabel} nuoma turi būti apmokėta iki ${new Date(upcoming.dueDate).toLocaleDateString('lt-LT')}.`,
                timestamp: new Date().toISOString(),
                relativeTime: `Liko ${daysUntil(upcoming.dueDate)} d.`,
                rentalId: upcoming.rentalId,
            });
        }

        // Overdue payment
        const overdue = filteredInvoices.find(inv => inv.status === 'overdue');
        if (overdue) {
            items.push({
                id: `overdue-${overdue.id}`,
                type: 'payment_due',
                title: 'Vėluojantis mokėjimas',
                message: `${overdue.periodLabel} nuoma vėluoja ${Math.abs(daysUntil(overdue.dueDate))} d.`,
                timestamp: new Date().toISOString(),
                relativeTime: 'Dabar',
                rentalId: overdue.rentalId,
            });
        }

        // Recent paid invoice
        const recentPaid = filteredInvoices.find(inv => inv.status === 'paid' && inv.paidAt);
        if (recentPaid) {
            items.push({
                id: `paid-${recentPaid.id}`,
                type: 'payment_received',
                title: 'Mokėjimas gautas',
                message: `${recentPaid.periodLabel} nuoma sėkmingai apmokėta.`,
                timestamp: recentPaid.paidAt || '',
                relativeTime: recentPaid.paidAt ? getRelativeTime(new Date(recentPaid.paidAt)) : '',
                rentalId: recentPaid.rentalId,
            });
        }

        return items.slice(0, 5);
    }, [filteredInvoices]);

    // Computed: Contract details
    const contractDetails = useMemo((): ContractDetails | null => {
        const rental = selectedRental || rentals[0];
        if (!rental) return null;

        return {
            monthlyRent: rental.rentAmount,
            deposit: rental.depositAmount,
            depositPaid: rental.depositPaid,
            paymentDay: rental.paymentDay,
            startDate: rental.contractStart,
            endDate: rental.contractEnd,
            utilitiesIncluded: false, // Not tracked in current schema
            hasContractDocument: documentsCount > 0,
        };
    }, [selectedRental, rentals, documentsCount]);

    return {
        rentals,
        selectedRentalId,
        selectedRental,
        hero,
        kpis,
        upcomingInvoices,
        notifications,
        contractDetails,
        loading,
        error,
        selectRental,
        refresh: fetchData,
    };
}
