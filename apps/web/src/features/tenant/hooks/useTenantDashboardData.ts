import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { checkStripeEnabled } from '../../../lib/stripe';

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
    floor?: number;
    propertyType?: string;
    apartmentNumber?: string;
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
    type: 'payment_due' | 'payment_received' | 'document_uploaded' | 'maintenance_update' | 'meter_reminder' | 'meter_reading_request';
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

export interface CustomContact {
    id: string;
    title: string;
    content: string;
    comment?: string;
}

export interface ContactsInfo {
    landlord: {
        name?: string;
        phone?: string;
        email?: string;
    } | null;
    chairman: {
        name?: string;
        phone?: string;
        email?: string;
    } | null;
    managementCompany: {
        companyName?: string;
        contactPerson?: string;
        phone?: string;
        email?: string;
    } | null;
    customContacts: CustomContact[];
}

export interface PropertyInfo {
    propertyType?: string;
    apartmentNumber?: string;
    rooms?: number;
    area?: number;
    floor?: number;
    totalFloors?: number;
    heatingType?: string;
    buildingType?: string;
}

export interface PaymentInfo {
    bankAccount?: string;
    recipientName?: string;
    paymentPurpose?: string;
    paymentDay?: number;
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
    contacts: ContactsInfo;
    propertyInfo: PropertyInfo | null;
    paymentInfo: PaymentInfo | null;
    stripeEnabled: boolean;

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
    const [dbNotifications, setDbNotifications] = useState<TenantNotification[]>([]);
    const [addressSettingsMap, setAddressSettingsMap] = useState<Record<string, { contact_info: any; building_info: any; financial_settings: any }>>({});
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
            // 1. Get user email (needed for invitation filtering)
            const { data: userData } = await supabase.auth.getUser();
            const userEmail = userData?.user?.email;

            let rentalData: TenantRental[] = [];

            if (userEmail) {
                // 2. Fetch accepted invitations
                const { data: invitations, error: invError } = await supabase
                    .from('tenant_invitations')
                    .select(`
                        id, property_id, contract_start, contract_end,
                        rent, deposit, status, property_label,
                        invited_by, invited_by_email, email
                    `)
                    .eq('status', 'accepted');

                if (invError) {
                    console.error('Error fetching invitations:', invError);
                }

                const myInvitations = invitations?.filter(inv =>
                    inv.email?.toLowerCase() === userEmail.toLowerCase()
                ) || [];

                if (myInvitations.length > 0) {
                    const propertyIds = myInvitations.map(inv => inv.property_id);
                    const landlordIds = [...new Set(myInvitations.map(inv => inv.invited_by).filter(Boolean))];

                    // 3. Parallel: properties + landlords
                    const [propertiesResult, landlordsResult] = await Promise.all([
                        supabase
                            .from('properties')
                            .select(`
                                id, address_id, apartment_number, rent,
                                deposit_amount, deposit_paid, deposit_paid_amount,
                                contract_start, contract_end, area, rooms, floor,
                                property_type, status, owner_id,
                                addresses:address_id ( id, full_address )
                            `)
                            .in('id', propertyIds),
                        landlordIds.length > 0
                            ? supabase.from('users').select('id, first_name, last_name, email, phone').in('id', landlordIds)
                            : Promise.resolve({ data: null, error: null }),
                    ]);

                    const properties = propertiesResult.data;
                    if (propertiesResult.error) console.error('Error fetching properties:', propertiesResult.error);

                    // Build landlord lookup map
                    let landlordMap: Record<string, { name: string; email: string; phone: string }> = {};
                    if (landlordsResult.data) {
                        landlordMap = Object.fromEntries(
                            landlordsResult.data.map((l: any) => [
                                l.id,
                                {
                                    name: [l.first_name, l.last_name].filter(Boolean).join(' ') || l.email?.split('@')[0] || '',
                                    email: l.email || '',
                                    phone: l.phone || '',
                                },
                            ])
                        );
                    }

                    if (properties) {
                        rentalData = properties.map((prop: any) => {
                            const invitation = myInvitations.find(inv => inv.property_id === prop.id);
                            const landlordId = invitation?.invited_by;
                            const landlord = landlordId ? landlordMap[landlordId] : null;

                            return {
                                id: prop.id,
                                addressId: prop.address_id,
                                address: prop.addresses?.full_address || 'Nežinomas adresas',
                                unitLabel: `Butas ${prop.apartment_number}`,
                                status: prop.status === 'occupied' ? 'active' : 'ended',
                                landlordId: landlordId || undefined,
                                landlordName: landlord?.name || undefined,
                                landlordEmail: landlord?.email || invitation?.invited_by_email || undefined,
                                landlordPhone: landlord?.phone || undefined,
                                contractStart: prop.contract_start,
                                contractEnd: prop.contract_end,
                                rentAmount: prop.rent || 0,
                                depositAmount: prop.deposit_amount || 0,
                                depositPaid: prop.deposit_paid || false,
                                paymentDay: 1,
                                area: prop.area,
                                rooms: prop.rooms,
                                floor: prop.floor,
                                propertyType: prop.property_type,
                                apartmentNumber: prop.apartment_number,
                            };
                        });
                    }
                }
            }

            setRentals(rentalData);

            // If only 1 rental, auto-select it
            if (rentalData.length === 1) {
                setSelectedRentalId(rentalData[0].id);
                localStorage.setItem(STORAGE_KEY, rentalData[0].id);
            }

            // 4. Parallel: address_settings + invoices + notifications (all independent)
            if (rentalData.length > 0) {
                const propertyIds = rentalData.map(r => r.id);
                const uniqueAddressIds = [...new Set(rentalData.map(r => r.addressId).filter(Boolean))];

                const [settingsResult, invoiceResult, notifResult] = await Promise.all([
                    // Address settings
                    uniqueAddressIds.length > 0
                        ? supabase.from('address_settings').select('address_id, contact_info, building_info, financial_settings').in('address_id', uniqueAddressIds)
                        : Promise.resolve({ data: null, error: null }),
                    // Invoices
                    supabase.from('invoices').select('*').in('property_id', propertyIds).order('due_date', { ascending: false }).limit(10),
                    // Notifications
                    supabase.from('notifications').select('*').eq('user_id', userId).eq('is_read', false).order('created_at', { ascending: false }).limit(10),
                ]);

                // Process address settings
                if (settingsResult.data) {
                    const map: Record<string, { contact_info: any; building_info: any; financial_settings: any }> = {};
                    settingsResult.data.forEach((s: any) => {
                        map[s.address_id] = {
                            contact_info: s.contact_info || {},
                            building_info: s.building_info || {},
                            financial_settings: s.financial_settings || {},
                        };
                    });
                    setAddressSettingsMap(map);
                }

                // Process invoices
                if (invoiceResult.data) {
                    const now = new Date();
                    const mapped: TenantInvoice[] = invoiceResult.data.map((inv: any) => {
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

                // Maintenance & documents — tables don't exist yet
                setMaintenanceCount({ open: 0, inProgress: 0 });
                setDocumentsCount(0);

                // Process notifications
                if (notifResult.data && notifResult.data.length > 0) {
                    const mapped: TenantNotification[] = notifResult.data.map((n: any) => ({
                        id: n.id,
                        type: n.kind as TenantNotification['type'],
                        title: n.title,
                        message: n.body || '',
                        timestamp: n.created_at,
                        relativeTime: getRelativeTime(new Date(n.created_at)),
                        link: n.kind === 'meter_reading_request' ? '/tenant/meters' : undefined,
                    }));
                    setDbNotifications(mapped);
                }
            } else {
                // No rentals — fetch just notifications
                try {
                    const { data: notifData } = await supabase
                        .from('notifications')
                        .select('*')
                        .eq('user_id', userId)
                        .eq('is_read', false)
                        .order('created_at', { ascending: false })
                        .limit(10);

                    if (notifData && notifData.length > 0) {
                        const mapped: TenantNotification[] = notifData.map((n: any) => ({
                            id: n.id,
                            type: n.kind as TenantNotification['type'],
                            title: n.title,
                            message: n.body || '',
                            timestamp: n.created_at,
                            relativeTime: getRelativeTime(new Date(n.created_at)),
                            link: n.kind === 'meter_reading_request' ? '/tenant/meters' : undefined,
                        }));
                        setDbNotifications(mapped);
                    }
                } catch {
                    // notifications table may not exist yet
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
                message: `${upcoming.periodLabel} nuoma turi būti apmokėta iki ${(() => { const d = new Date(upcoming.dueDate); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })()}.`,
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

        return [...dbNotifications, ...items].slice(0, 5);
    }, [filteredInvoices, dbNotifications]);

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

    // Computed: Contacts (from address_settings + landlord)
    const contacts = useMemo((): ContactsInfo => {
        const rental = selectedRental || rentals[0];
        const settings = rental ? addressSettingsMap[rental.addressId] : null;
        const ci = settings?.contact_info || {};

        // Landlord from rental data
        const landlord = rental?.landlordName ? {
            name: rental.landlordName,
            phone: rental.landlordPhone,
            email: rental.landlordEmail,
        } : null;

        // Chairman (bendrija)
        const chairmanHasData = (ci.chairmanName || '').trim() || (ci.chairmanPhone || '').trim() || (ci.chairmanEmail || '').trim();
        const chairman = chairmanHasData ? {
            name: ci.chairmanName || undefined,
            phone: ci.chairmanPhone || undefined,
            email: ci.chairmanEmail || undefined,
        } : null;

        // Management company
        const companyHasData = (ci.companyName || '').trim() || (ci.companyPhone || '').trim() || (ci.companyEmail || '').trim() || (ci.contactPerson || '').trim();
        const managementCompany = companyHasData ? {
            companyName: ci.companyName || undefined,
            contactPerson: ci.contactPerson || undefined,
            phone: ci.companyPhone || undefined,
            email: ci.companyEmail || undefined,
        } : null;

        // Custom contacts — filter out empty ones
        const customContacts: CustomContact[] = (ci.customContacts || [])
            .filter((c: any) => (c.title || '').trim() || (c.content || '').trim())
            .map((c: any) => ({
                id: c.id || Math.random().toString(36).slice(2),
                title: c.title || '',
                content: c.content || '',
                comment: c.comment || undefined,
            }));

        return { landlord, chairman, managementCompany, customContacts };
    }, [selectedRental, rentals, addressSettingsMap]);

    // Computed: Property info
    const propertyInfo = useMemo((): PropertyInfo | null => {
        const rental = selectedRental || rentals[0];
        if (!rental) return null;
        const settings = addressSettingsMap[rental.addressId];
        const bi = settings?.building_info || {};

        return {
            propertyType: rental.propertyType,
            apartmentNumber: rental.apartmentNumber,
            rooms: rental.rooms,
            area: rental.area,
            floor: rental.floor,
            totalFloors: bi.totalFloors || undefined,
            heatingType: bi.heatingType || undefined,
            buildingType: bi.buildingType || undefined,
        };
    }, [selectedRental, rentals, addressSettingsMap]);

    // Computed: Payment info (from address_settings.financial_settings)
    const paymentInfo = useMemo((): PaymentInfo | null => {
        const rental = selectedRental || rentals[0];
        if (!rental) return null;
        const settings = addressSettingsMap[rental.addressId];
        const fs = settings?.financial_settings || {};

        const hasData = (fs.bankAccount || '').trim() || (fs.recipientName || '').trim() || (fs.paymentPurposeTemplate || '').trim() || fs.paymentDay;
        if (!hasData) return null;

        return {
            bankAccount: (fs.bankAccount || '').trim() || undefined,
            recipientName: (fs.recipientName || '').trim() || undefined,
            paymentPurpose: (fs.paymentPurposeTemplate || '').trim() || undefined,
            paymentDay: fs.paymentDay || undefined,
        };
    }, [selectedRental, rentals, addressSettingsMap]);

    // Computed: Stripe enabled for the landlord
    const [stripeEnabled, setStripeEnabled] = useState(false);
    useEffect(() => {
        const rental = selectedRental || rentals[0];
        if (!rental?.landlordId) {
            setStripeEnabled(false);
            return;
        }
        checkStripeEnabled(rental.landlordId).then(setStripeEnabled);
    }, [selectedRental, rentals]);

    return {
        rentals,
        selectedRentalId,
        selectedRental,
        hero,
        kpis,
        upcomingInvoices,
        notifications,
        contractDetails,
        contacts,
        propertyInfo,
        paymentInfo,
        stripeEnabled,
        loading,
        error,
        selectRental,
        refresh: fetchData,
    };
}
