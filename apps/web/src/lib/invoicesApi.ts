import { supabase } from './supabase';

// ============================================================
// TYPES
// ============================================================

export interface InvoiceLineItem {
    description: string;
    amount: number;
    type: 'rent' | 'utilities' | 'maintenance' | 'late_fee' | 'other';
    meter_type?: string;
    consumption?: number;
    rate?: number;
    unit?: string;
    previous_reading?: number;
    current_reading?: number;
}

export interface Invoice {
    id: string;
    property_id: string;
    tenant_id: string | null;
    address_id: string | null;
    invoice_number: string;
    invoice_date: string;
    due_date: string;
    period_start: string | null;
    period_end: string | null;
    amount: number;
    rent_amount: number;
    utilities_amount: number;
    other_amount: number;
    late_fee: number;
    status: 'unpaid' | 'paid' | 'partial' | 'overdue' | 'cancelled';
    paid_date: string | null;
    payment_method: string | null;
    notes: string | null;
    line_items: InvoiceLineItem[];
    created_at: string;
    updated_at: string;
    created_by: string | null;
    // Joined data
    property?: {
        id: string;
        apartment_number: string;
        rent: number;
        address_id: string;
        addresses?: {
            id: string;
            street: string;
            city: string;
        };
    };
    tenant?: {
        id: string;
        first_name: string;
        last_name: string;
        email: string;
    };
}

export interface InvoicePayment {
    id: string;
    invoice_id: string;
    amount: number;
    payment_method: string | null;
    paid_at: string;
    notes: string | null;
    created_by: string | null;
    created_at: string;
}

export interface CreateInvoiceData {
    property_id: string;
    tenant_id?: string | null;
    address_id?: string | null;
    invoice_number: string;
    invoice_date: string;
    due_date: string;
    period_start?: string;
    period_end?: string;
    rent_amount: number;
    utilities_amount?: number;
    other_amount?: number;
    late_fee?: number;
    line_items?: InvoiceLineItem[];
    notes?: string;
}

export interface InvoiceFilters {
    address_id?: string;
    status?: string;
    search?: string;
    date_from?: string;
    date_to?: string;
}

// ============================================================
// INVOICE NUMBER GENERATION
// ============================================================

/**
 * Generates next invoice number in format: INV-YYYYMM-NNN
 * e.g. INV-202602-001
 */
export async function generateInvoiceNumber(): Promise<string> {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prefix = `INV-${yearMonth}-`;

    const { data, error } = await supabase
        .from('invoices')
        .select('invoice_number')
        .like('invoice_number', `${prefix}%`)
        .order('invoice_number', { ascending: false })
        .limit(1);

    if (error) {
        console.error('Error generating invoice number:', error);
        return `${prefix}001`;
    }

    if (data && data.length > 0) {
        const lastNumber = parseInt(data[0].invoice_number.replace(prefix, ''), 10);
        return `${prefix}${String(lastNumber + 1).padStart(3, '0')}`;
    }

    return `${prefix}001`;
}

// ============================================================
// INVOICES CRUD
// ============================================================

/**
 * Fetch invoices for landlord with optional filters
 */
export async function getInvoices(filters?: InvoiceFilters): Promise<{ data: Invoice[] | null; error: any }> {
    let query = supabase
        .from('invoices')
        .select(`
      *,
      property:properties!property_id (
        id, apartment_number, rent, address_id,
        addresses!address_id ( id, street, city )
      ),
      tenant:users!tenant_id ( id, first_name, last_name, email )
    `)
        .order('created_at', { ascending: false });

    if (filters?.address_id) {
        query = query.eq('address_id', filters.address_id);
    }
    if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
    }
    if (filters?.date_from) {
        query = query.gte('due_date', filters.date_from);
    }
    if (filters?.date_to) {
        query = query.lte('due_date', filters.date_to);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching invoices:', error);
        return { data: null, error };
    }

    // Client-side search filter (for invoice number, tenant name)
    let filtered = data as Invoice[];
    if (filters?.search) {
        const s = filters.search.toLowerCase();
        filtered = filtered.filter(inv =>
            inv.invoice_number.toLowerCase().includes(s) ||
            `${inv.tenant?.first_name} ${inv.tenant?.last_name}`.toLowerCase().includes(s) ||
            inv.property?.apartment_number?.toLowerCase().includes(s) ||
            inv.property?.addresses?.street?.toLowerCase().includes(s)
        );
    }

    return { data: filtered, error: null };
}

/**
 * Fetch invoices for a specific tenant
 */
export async function getInvoicesByTenant(tenantUserId: string): Promise<{ data: Invoice[] | null; error: any }> {
    const { data, error } = await supabase
        .from('invoices')
        .select(`
      *,
      property:properties!property_id (
        id, apartment_number, rent, address_id,
        addresses!address_id ( id, street, city )
      )
    `)
        .eq('tenant_id', tenantUserId)
        .order('due_date', { ascending: false });

    return { data: data as Invoice[] | null, error };
}

/**
 * Fetch a single invoice with full details
 */
export async function getInvoiceById(id: string): Promise<{ data: Invoice | null; error: any }> {
    const { data, error } = await supabase
        .from('invoices')
        .select(`
      *,
      property:properties!property_id (
        id, apartment_number, rent, address_id,
        addresses!address_id ( id, street, city )
      ),
      tenant:users!tenant_id ( id, first_name, last_name, email )
    `)
        .eq('id', id)
        .maybeSingle();

    return { data: data as Invoice | null, error };
}

/**
 * Create a new invoice
 */
export async function createInvoice(invoiceData: CreateInvoiceData): Promise<{ data: Invoice | null; error: any }> {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    const totalAmount = (invoiceData.rent_amount || 0) +
        (invoiceData.utilities_amount || 0) +
        (invoiceData.other_amount || 0) +
        (invoiceData.late_fee || 0);

    const { data, error } = await supabase
        .from('invoices')
        .insert({
            property_id: invoiceData.property_id,
            tenant_id: invoiceData.tenant_id || null,
            address_id: invoiceData.address_id || null,
            invoice_number: invoiceData.invoice_number,
            invoice_date: invoiceData.invoice_date,
            due_date: invoiceData.due_date,
            period_start: invoiceData.period_start || null,
            period_end: invoiceData.period_end || null,
            amount: totalAmount,
            rent_amount: invoiceData.rent_amount,
            utilities_amount: invoiceData.utilities_amount || 0,
            other_amount: invoiceData.other_amount || 0,
            late_fee: invoiceData.late_fee || 0,
            status: 'unpaid',
            line_items: invoiceData.line_items || [],
            notes: invoiceData.notes || null,
            created_by: userId,
        })
        .select()
        .single();

    return { data: data as Invoice | null, error };
}

/**
 * Update invoice status
 */
export async function updateInvoiceStatus(
    id: string,
    status: string,
    paidDate?: string,
    paymentMethod?: string
): Promise<{ error: any }> {
    const updateData: Record<string, any> = {
        status,
        updated_at: new Date().toISOString(),
    };

    if (status === 'paid') {
        updateData.paid_date = paidDate || new Date().toISOString().split('T')[0];
        if (paymentMethod) updateData.payment_method = paymentMethod;
    }

    const { error } = await supabase
        .from('invoices')
        .update(updateData)
        .eq('id', id);

    return { error };
}

/**
 * Update invoice details
 */
export async function updateInvoice(
    id: string,
    updates: Partial<CreateInvoiceData>
): Promise<{ error: any }> {
    const updateData: Record<string, any> = {
        ...updates,
        updated_at: new Date().toISOString(),
    };

    // Recalculate total if amounts changed
    if (updates.rent_amount !== undefined || updates.utilities_amount !== undefined ||
        updates.other_amount !== undefined || updates.late_fee !== undefined) {
        // Fetch current to fill in missing values
        const { data: current } = await supabase.from('invoices').select('rent_amount, utilities_amount, other_amount, late_fee').eq('id', id).single();
        if (current) {
            updateData.amount =
                (updates.rent_amount ?? current.rent_amount ?? 0) +
                (updates.utilities_amount ?? current.utilities_amount ?? 0) +
                (updates.other_amount ?? current.other_amount ?? 0) +
                (updates.late_fee ?? current.late_fee ?? 0);
        }
    }

    const { error } = await supabase
        .from('invoices')
        .update(updateData)
        .eq('id', id);

    return { error };
}

/**
 * Delete an invoice
 */
export async function deleteInvoice(id: string): Promise<{ error: any }> {
    // First delete associated payments
    await supabase.from('invoice_payments').delete().eq('invoice_id', id);

    const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id);

    return { error };
}

// ============================================================
// PAYMENTS
// ============================================================

/**
 * Record a payment against an invoice
 */
export async function recordPayment(
    invoiceId: string,
    amount: number,
    paymentMethod?: string,
    notes?: string
): Promise<{ data: InvoicePayment | null; error: any }> {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    // Insert payment record
    const { data: payment, error: paymentError } = await supabase
        .from('invoice_payments')
        .insert({
            invoice_id: invoiceId,
            amount,
            payment_method: paymentMethod || 'bank_transfer',
            notes: notes || null,
            created_by: userId,
        })
        .select()
        .single();

    if (paymentError) {
        return { data: null, error: paymentError };
    }

    // Check total payments vs invoice amount to update status
    const { data: invoice } = await supabase
        .from('invoices')
        .select('amount')
        .eq('id', invoiceId)
        .single();

    const { data: payments } = await supabase
        .from('invoice_payments')
        .select('amount')
        .eq('invoice_id', invoiceId);

    if (invoice && payments) {
        const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);

        if (totalPaid >= Number(invoice.amount)) {
            await updateInvoiceStatus(invoiceId, 'paid', new Date().toISOString().split('T')[0], paymentMethod);
        } else {
            await updateInvoiceStatus(invoiceId, 'partial');
        }
    }

    return { data: payment as InvoicePayment, error: null };
}

/**
 * Get payment history for an invoice
 */
export async function getPaymentHistory(invoiceId: string): Promise<{ data: InvoicePayment[] | null; error: any }> {
    const { data, error } = await supabase
        .from('invoice_payments')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('paid_at', { ascending: false });

    return { data: data as InvoicePayment[] | null, error };
}

// ============================================================
// INVOICE GENERATION HELPERS
// ============================================================

/**
 * Get data needed to generate an invoice for a property
 */
export async function getInvoiceGenerationData(propertyId: string): Promise<{
    property: any;
    tenant: any;
    address: any;
    addressSettings: any;
    meters: any[];
    latestReadings: any[];
    error: any;
}> {
    // Get property with address
    const { data: property, error: propError } = await supabase
        .from('properties')
        .select(`
      id, apartment_number, rent, address_id, status,
      addresses!address_id ( id, street, city )
    `)
        .eq('id', propertyId)
        .single();

    if (propError || !property) {
        return { property: null, tenant: null, address: null, addressSettings: null, meters: [], latestReadings: [], error: propError };
    }

    // Get active tenant via tenants table → users join
    const { data: tenantRecord } = await supabase
        .from('tenants')
        .select('id, user_id, users!user_id ( id, first_name, last_name, email )')
        .eq('property_id', propertyId)
        .maybeSingle();

    // Get address settings (financial)
    const { data: addressSettings } = await supabase
        .from('address_settings')
        .select('settings')
        .eq('address_id', property.address_id)
        .maybeSingle();

    // Get apartment meters for this property
    const { data: meters } = await supabase
        .from('apartment_meters')
        .select('*')
        .eq('property_id', propertyId)
        .eq('is_active', true);

    // Get latest readings for each meter (meter_readings has pre-calculated amounts)
    const meterIds = (meters || []).map(m => m.id);
    let latestReadings: any[] = [];

    if (meterIds.length > 0) {
        const { data: readings } = await supabase
            .from('meter_readings')
            .select('*')
            .in('meter_id', meterIds)
            .order('reading_date', { ascending: false })
            .limit(meterIds.length * 2);

        latestReadings = readings || [];
    }

    // Extract user info from tenant join
    const tenantUser = tenantRecord
        ? {
            id: (tenantRecord as any).users?.id || tenantRecord.user_id,
            first_name: (tenantRecord as any).users?.first_name || '',
            last_name: (tenantRecord as any).users?.last_name || '',
            email: (tenantRecord as any).users?.email || ''
        }
        : null;

    return {
        property,
        tenant: tenantUser,
        address: (property as any).addresses,
        addressSettings: addressSettings?.settings || null,
        meters: meters || [],
        latestReadings,
        error: null,
    };
}

/**
 * Build line items from property data (rent + meter readings)
 */
export function buildLineItems(
    rent: number,
    meters: any[],
    latestReadings: any[]
): InvoiceLineItem[] {
    const items: InvoiceLineItem[] = [];

    // Rent line
    if (rent > 0) {
        items.push({
            description: 'Nuomos mokestis',
            amount: rent,
            type: 'rent',
        });
    }

    // Utility lines from apartment meters + their latest reading
    for (const meter of meters) {
        // Find latest reading for this meter (meter_readings has pre-calculated amounts)
        const reading = latestReadings.find(r => r.meter_id === meter.id);

        if (reading && Number(reading.amount || reading.total_sum || 0) > 0) {
            const amount = Number(reading.amount || reading.total_sum || 0);
            items.push({
                description: meter.name || meter.meter_name || 'Skaitiklis',
                amount: Math.round(amount * 100) / 100,
                type: 'utilities',
                meter_type: meter.type || meter.meter_type,
                consumption: Number(reading.consumption || reading.difference || 0),
                rate: Number(reading.price_per_unit || meter.price_per_unit || 0),
                unit: meter.unit || '',
                previous_reading: Number(reading.previous_reading || 0),
                current_reading: Number(reading.current_reading || 0),
            });
        }
    }

    return items;
}


// ============================================================
// BULK INVOICE GENERATION
// ============================================================

export interface BulkInvoicePreview {
    propertyId: string;
    apartment: string;
    address: string;
    addressId: string;
    tenant: { id: string; first_name: string; last_name: string; email: string } | null;
    rent: number;
    lineItems: InvoiceLineItem[];
    utilitiesTotal: number;
    totalAmount: number;
    selected: boolean; // user can deselect before creating
}

/**
 * Generate preview data for bulk invoice creation.
 * If addressId is provided, only properties at that address.
 * If not, ALL properties across all addresses.
 */
export async function generateBulkInvoiceData(
    addressId?: string
): Promise<{ previews: BulkInvoicePreview[]; error: any }> {
    // Get all properties (optionally filtered by address)
    let query = supabase
        .from('properties')
        .select(`
      id, apartment_number, rent, address_id, status,
      addresses!address_id ( id, street, city )
    `)
        .order('apartment_number');

    if (addressId) {
        query = query.eq('address_id', addressId);
    }

    const { data: properties, error: propError } = await query;
    if (propError || !properties || properties.length === 0) {
        return { previews: [], error: propError };
    }

    const previews: BulkInvoicePreview[] = [];

    for (const prop of properties) {
        // Get active tenant
        const { data: tenantRecord } = await supabase
            .from('tenants')
            .select('id, user_id, users!user_id ( id, first_name, last_name, email )')
            .eq('property_id', prop.id)
            .maybeSingle();

        const tenantUser = tenantRecord
            ? {
                id: (tenantRecord as any).users?.id || tenantRecord.user_id,
                first_name: (tenantRecord as any).users?.first_name || '',
                last_name: (tenantRecord as any).users?.last_name || '',
                email: (tenantRecord as any).users?.email || ''
            }
            : null;

        // Get apartment meters
        const { data: meters } = await supabase
            .from('apartment_meters')
            .select('*')
            .eq('property_id', prop.id)
            .eq('is_active', true);

        // Get latest readings
        const meterIds = (meters || []).map(m => m.id);
        let latestReadings: any[] = [];
        if (meterIds.length > 0) {
            const { data: readings } = await supabase
                .from('meter_readings')
                .select('*')
                .in('meter_id', meterIds)
                .order('reading_date', { ascending: false })
                .limit(meterIds.length * 2);
            latestReadings = readings || [];
        }

        const rent = prop.rent || 0;
        const lineItems = buildLineItems(rent, meters || [], latestReadings);
        const utilitiesTotal = lineItems.filter(i => i.type !== 'rent').reduce((s, i) => s + i.amount, 0);

        const addr = prop.addresses as any;
        const address = [addr?.street, addr?.city].filter(Boolean).join(', ');

        previews.push({
            propertyId: prop.id,
            apartment: prop.apartment_number || '—',
            address,
            addressId: prop.address_id,
            tenant: tenantUser,
            rent,
            lineItems,
            utilitiesTotal,
            totalAmount: rent + utilitiesTotal,
            selected: true,
        });
    }

    return { previews, error: null };
}

/**
 * Create multiple invoices in batch
 */
export async function createBulkInvoices(
    previews: BulkInvoicePreview[],
    options: {
        invoiceDate: string;
        dueDate: string;
        periodStart: string;
        periodEnd: string;
        sendToTenant: boolean;
        notes?: string;
    }
): Promise<{ created: number; errors: string[] }> {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    const selected = previews.filter(p => p.selected);
    const errors: string[] = [];
    let created = 0;

    // Generate sequential invoice numbers
    const baseNumber = await generateInvoiceNumber();
    const baseParts = baseNumber.match(/^(INV-\d{6}-)(\d+)$/);
    const prefix = baseParts ? baseParts[1] : 'INV-000000-';
    let counter = baseParts ? parseInt(baseParts[2]) : 1;

    for (const preview of selected) {
        const invoiceNumber = `${prefix}${String(counter).padStart(3, '0')}`;
        counter++;

        const totalAmount = preview.totalAmount;
        const { error } = await supabase
            .from('invoices')
            .insert({
                property_id: preview.propertyId,
                tenant_id: options.sendToTenant && preview.tenant ? preview.tenant.id : null,
                address_id: preview.addressId,
                invoice_number: invoiceNumber,
                invoice_date: options.invoiceDate,
                due_date: options.dueDate,
                period_start: options.periodStart || null,
                period_end: options.periodEnd || null,
                amount: totalAmount,
                rent_amount: preview.rent,
                utilities_amount: preview.utilitiesTotal,
                other_amount: 0,
                late_fee: 0,
                status: 'unpaid',
                line_items: preview.lineItems,
                notes: options.notes || null,
                created_by: userId,
            });

        if (error) {
            errors.push(`${preview.apartment}: ${error.message}`);
        } else {
            created++;
        }
    }

    return { created, errors };
}



/**
 * Get invoice summary stats for dashboard
 */
export async function getInvoiceStats(): Promise<{
    totalUnpaid: number;
    totalOverdue: number;
    paidThisMonth: number;
    totalPendingAmount: number;
    error: any;
}> {
    const now = new Date();
    const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    const { data, error } = await supabase
        .from('invoices')
        .select('id, status, amount, paid_date');

    if (error || !data) {
        return { totalUnpaid: 0, totalOverdue: 0, paidThisMonth: 0, totalPendingAmount: 0, error };
    }

    const totalUnpaid = data.filter(i => i.status === 'unpaid' || i.status === 'partial').length;
    const totalOverdue = data.filter(i => i.status === 'overdue').length;
    const paidThisMonth = data.filter(i => i.status === 'paid' && i.paid_date && i.paid_date >= firstOfMonth).length;
    const totalPendingAmount = data
        .filter(i => i.status === 'unpaid' || i.status === 'partial' || i.status === 'overdue')
        .reduce((sum, i) => sum + Number(i.amount), 0);

    return { totalUnpaid, totalOverdue, paidThisMonth, totalPendingAmount, error: null };
}
