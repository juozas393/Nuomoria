import * as XLSX from 'xlsx';
import type { Invoice, InvoiceLineItem } from './invoicesApi';

// ============================================================
// HELPERS
// ============================================================

const formatCurrency = (amount: number): string =>
    new Intl.NumberFormat('lt-LT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(amount);

const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const statusLt: Record<string, string> = {
    unpaid: 'Neapmokėta',
    paid: 'Apmokėta',
    partial: 'Dalinai apmokėta',
    overdue: 'Pradelsta',
    cancelled: 'Atšaukta',
};

function getAddressStr(inv: Invoice): string {
    const street = inv.property?.addresses?.street || '';
    const city = inv.property?.addresses?.city || '';
    return [street, city].filter(Boolean).join(', ');
}

function getApartmentStr(inv: Invoice): string {
    return inv.property?.apartment_number || '—';
}

function getTenantStr(inv: Invoice): string {
    if (!inv.tenant) return '—';
    return `${inv.tenant.first_name} ${inv.tenant.last_name}`.trim() || '—';
}

function isOverdue(inv: Invoice): boolean {
    if (inv.status === 'paid' || inv.status === 'cancelled') return false;
    return new Date(inv.due_date) < new Date();
}

function getEffectiveStatus(inv: Invoice): string {
    const s = isOverdue(inv) && inv.status === 'unpaid' ? 'overdue' : inv.status;
    return statusLt[s] || s;
}

// ============================================================
// FLAT TABLE EXPORT
// ============================================================

interface FlatRow {
    'Sąskaitos Nr.': string;
    'Data': string;
    'Terminas': string;
    'Laikotarpis': string;
    'Adresas': string;
    'Butas': string;
    'Nuomininkas': string;
    'El. paštas': string;
    'Nuoma (€)': number;
    'Komunaliniai (€)': number;
    'Kita (€)': number;
    'Delspinigiai (€)': number;
    'Viso (€)': number;
    'Statusas': string;
    'Apmokėta': string;
    'Mokėjimo būdas': string;
    'Pastabos': string;
}

function invoiceToFlatRow(inv: Invoice): FlatRow {
    const periodStr = inv.period_start && inv.period_end
        ? `${formatDate(inv.period_start)} – ${formatDate(inv.period_end)}`
        : '—';

    return {
        'Sąskaitos Nr.': inv.invoice_number,
        'Data': formatDate(inv.invoice_date),
        'Terminas': formatDate(inv.due_date),
        'Laikotarpis': periodStr,
        'Adresas': getAddressStr(inv),
        'Butas': getApartmentStr(inv),
        'Nuomininkas': getTenantStr(inv),
        'El. paštas': inv.tenant?.email || '—',
        'Nuoma (€)': Number(inv.rent_amount) || 0,
        'Komunaliniai (€)': Number(inv.utilities_amount) || 0,
        'Kita (€)': Number(inv.other_amount) || 0,
        'Delspinigiai (€)': Number(inv.late_fee) || 0,
        'Viso (€)': Number(inv.amount) || 0,
        'Statusas': getEffectiveStatus(inv),
        'Apmokėta': formatDate(inv.paid_date),
        'Mokėjimo būdas': inv.payment_method || '—',
        'Pastabos': inv.notes || '',
    };
}

function buildFlatSheet(invoices: Invoice[]): XLSX.WorkSheet {
    const rows = invoices.map(invoiceToFlatRow);
    const ws = XLSX.utils.json_to_sheet(rows);

    // Auto-width columns
    const colWidths = Object.keys(rows[0] || {}).map(key => ({
        wch: Math.max(key.length + 2, ...rows.map(r => String((r as any)[key] || '').length).slice(0, 50)) + 2,
    }));
    ws['!cols'] = colWidths;

    return ws;
}

// ============================================================
// FORMATTED REPORT EXPORT
// ============================================================

function buildReportSheet(invoices: Invoice[], title: string): XLSX.WorkSheet {
    const data: (string | number | null)[][] = [];

    // Header
    data.push([title]);
    data.push([`Eksportuota: ${formatDate(new Date().toISOString())}`]);
    data.push([]);

    // Group by address
    const grouped = new Map<string, Invoice[]>();
    for (const inv of invoices) {
        const addr = getAddressStr(inv) || 'Nežinomas adresas';
        if (!grouped.has(addr)) grouped.set(addr, []);
        grouped.get(addr)!.push(inv);
    }

    for (const [address, addrInvoices] of grouped) {
        // Address header
        data.push([`📍 ${address}`]);
        data.push([]);

        // Group by apartment within address
        const byApartment = new Map<string, Invoice[]>();
        for (const inv of addrInvoices) {
            const apt = getApartmentStr(inv);
            if (!byApartment.has(apt)) byApartment.set(apt, []);
            byApartment.get(apt)!.push(inv);
        }

        for (const [apartment, aptInvoices] of byApartment) {
            const tenant = aptInvoices[0] ? getTenantStr(aptInvoices[0]) : '—';
            data.push([`Butas: ${apartment}`, '', `Nuomininkas: ${tenant}`]);

            // Column headers for this apartment
            data.push([
                'Sąskaitos Nr.', 'Data', 'Terminas', 'Eilutė',
                'Kiekis', 'Vnt.', 'Kaina', 'Suma (€)', 'Statusas',
            ]);

            let aptTotal = 0;

            for (const inv of aptInvoices) {
                const lineItems: InvoiceLineItem[] = Array.isArray(inv.line_items) ? inv.line_items : [];

                if (lineItems.length > 0) {
                    // First line item on same row as invoice header
                    for (let i = 0; i < lineItems.length; i++) {
                        const li = lineItems[i];
                        data.push([
                            i === 0 ? inv.invoice_number : '',
                            i === 0 ? formatDate(inv.invoice_date) : '',
                            i === 0 ? formatDate(inv.due_date) : '',
                            li.description,
                            li.consumption != null ? li.consumption : '',
                            li.unit || '',
                            li.rate != null ? li.rate : '',
                            li.amount,
                            i === 0 ? getEffectiveStatus(inv) : '',
                        ]);
                    }
                    // Invoice total row
                    data.push([
                        '', '', '', '', '', '', 'Viso:',
                        Number(inv.amount),
                        '',
                    ]);
                } else {
                    // No line items — single row
                    data.push([
                        inv.invoice_number,
                        formatDate(inv.invoice_date),
                        formatDate(inv.due_date),
                        'Nuoma',
                        '', '', '',
                        Number(inv.rent_amount),
                        getEffectiveStatus(inv),
                    ]);
                    if (Number(inv.utilities_amount) > 0) {
                        data.push([
                            '', '', '', 'Komunaliniai',
                            '', '', '',
                            Number(inv.utilities_amount),
                            '',
                        ]);
                    }
                    if (Number(inv.late_fee) > 0) {
                        data.push([
                            '', '', '', 'Delspinigiai',
                            '', '', '',
                            Number(inv.late_fee),
                            '',
                        ]);
                    }
                    data.push([
                        '', '', '', '', '', '', 'Viso:',
                        Number(inv.amount),
                        '',
                    ]);
                }

                aptTotal += Number(inv.amount);
            }

            // Apartment subtotal
            data.push([]);
            data.push(['', '', '', '', '', '', `Buto ${apartment} viso:`, aptTotal, '']);
            data.push([]);
        }

        // Address total
        const addrTotal = addrInvoices.reduce((s, i) => s + Number(i.amount), 0);
        data.push(['', '', '', '', '', '', `Adreso viso:`, addrTotal, '']);
        data.push([]);
        data.push([]);
    }

    // Grand total
    const grandTotal = invoices.reduce((s, i) => s + Number(i.amount), 0);
    data.push(['', '', '', '', '', '', 'BENDRA SUMA:', grandTotal, '']);

    const ws = XLSX.utils.aoa_to_sheet(data);

    // Column widths
    ws['!cols'] = [
        { wch: 18 }, // Sąskaitos Nr.
        { wch: 12 }, // Data
        { wch: 12 }, // Terminas
        { wch: 24 }, // Eilutė
        { wch: 10 }, // Kiekis
        { wch: 8 },  // Vnt.
        { wch: 10 }, // Kaina
        { wch: 12 }, // Suma
        { wch: 16 }, // Statusas
    ];

    // Merge title row
    ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } },
    ];

    return ws;
}

// ============================================================
// PUBLIC EXPORT FUNCTIONS
// ============================================================

export type ExportFormat = 'flat' | 'report';

function generateFilename(scope: string, format: ExportFormat): string {
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const formatStr = format === 'flat' ? 'duomenys' : 'ataskaita';
    return `saskaitos_${scope}_${formatStr}_${dateStr}.xlsx`;
}

function downloadWorkbook(wb: XLSX.WorkBook, filename: string): void {
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';

    // Append, click, then clean up after delay
    document.body.appendChild(link);
    link.click();

    // Delay cleanup so browser has time to start the download
    setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, 250);
}

/**
 * Export invoices for a single property (apartment)
 */
export function exportSingleProperty(
    invoices: Invoice[],
    propertyId: string,
    format: ExportFormat = 'flat'
): void {
    const filtered = invoices.filter(i => i.property_id === propertyId);
    if (filtered.length === 0) return;

    const apt = getApartmentStr(filtered[0]);
    const addr = getAddressStr(filtered[0]);
    const wb = XLSX.utils.book_new();

    if (format === 'flat') {
        const ws = buildFlatSheet(filtered);
        XLSX.utils.book_append_sheet(wb, ws, `Butas ${apt}`);
    } else {
        const ws = buildReportSheet(filtered, `Sąskaitų ataskaita — ${addr}, butas ${apt}`);
        XLSX.utils.book_append_sheet(wb, ws, `Ataskaita`);
    }

    const sanitized = apt.replace(/[^a-zA-Z0-9]/g, '_');
    downloadWorkbook(wb, generateFilename(`butas_${sanitized}`, format));
}

/**
 * Export invoices for all properties at a given address
 */
export function exportByAddress(
    invoices: Invoice[],
    addressId: string,
    format: ExportFormat = 'flat'
): void {
    const filtered = invoices.filter(i => i.address_id === addressId);
    if (filtered.length === 0) return;

    const addr = getAddressStr(filtered[0]);
    const wb = XLSX.utils.book_new();

    if (format === 'flat') {
        const ws = buildFlatSheet(filtered);
        XLSX.utils.book_append_sheet(wb, ws, 'Sąskaitos');
    } else {
        const ws = buildReportSheet(filtered, `Sąskaitų ataskaita — ${addr}`);
        XLSX.utils.book_append_sheet(wb, ws, 'Ataskaita');
    }

    const sanitized = addr.replace(/[^a-zA-Z0-9ąčęėįšųūžĄČĘĖĮŠŲŪŽ ]/g, '').replace(/\s+/g, '_').slice(0, 30);
    downloadWorkbook(wb, generateFilename(`adresas_${sanitized}`, format));
}

/**
 * Export all invoices grouped by address
 */
export function exportAll(
    invoices: Invoice[],
    format: ExportFormat = 'flat'
): void {
    if (invoices.length === 0) return;

    const wb = XLSX.utils.book_new();

    if (format === 'flat') {
        const ws = buildFlatSheet(invoices);
        XLSX.utils.book_append_sheet(wb, ws, 'Visos sąskaitos');
    } else {
        const ws = buildReportSheet(invoices, 'Visos sąskaitos — ataskaita');
        XLSX.utils.book_append_sheet(wb, ws, 'Ataskaita');
    }

    downloadWorkbook(wb, generateFilename('visos', format));
}
