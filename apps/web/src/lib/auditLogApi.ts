/**
 * Audit Log API — CRUD for audit_log table
 * Used to log and retrieve property change history
 */
import { supabase } from './supabase';

export interface AuditLogEntry {
    id: string;
    user_id: string | null;
    user_email: string | null;
    action: string;
    table_name: string;
    record_id: string | null;
    old_data: Record<string, any> | null;
    new_data: Record<string, any> | null;
    changed_fields: string[] | null;
    description: string | null;
    created_at: string;
}

// ─── Lithuanian labels ──────────────────────────────────────────────────────

const FIELD_LABELS: Record<string, string> = {
    rent: 'Nuoma',
    deposit_amount: 'Depozitas',
    contract_start: 'Sutarties pradžia',
    contract_end: 'Sutarties pabaiga',
    rooms: 'Kambariai',
    area: 'Plotas',
    floor: 'Aukštas',
    status: 'Būsena',
    property_type: 'Tipas',
    type: 'Tipas',
    under_maintenance: 'Remontas',
    tenant_name: 'Nuomininkas',
    phone: 'Telefonas',
    email: 'El. paštas',
    extended_details: 'Nuomos nustatymai',
    'extended_details.payment_due_day': 'Mokėjimo diena',
    'extended_details.min_term_months': 'Min. terminas',
    'extended_details.late_fee_grace_days': 'Baudos pradžia',
    'extended_details.late_fee_amount': 'Vėlavimo bauda',
    'extended_details.bedrooms': 'Miegamieji',
    'extended_details.bathrooms': 'Vonios',
    'extended_details.balcony': 'Balkonas',
    'extended_details.parking_type': 'Parkavimas',
    'extended_details.heating_type': 'Šildymas',
    'extended_details.furnished': 'Baldai',
    'extended_details.pets_allowed': 'Gyvūnai',
    'extended_details.smoking_allowed': 'Rūkymas',
    'extended_details.notes_internal': 'Vidinės pastabos',
    'extended_details.storage': 'Sandėliukas',
    deposit_paid: 'Depozitas sumokėtas',
    deposit_paid_amount: 'Depozito suma',
    // Termination
    termination_status: 'Nutraukimo statusas',
    termination_date: 'Nutraukimo data',
    termination_reason: 'Nutraukimo priežastis',
    termination_requested_at: 'Prašymo data',
    termination_requested_by: 'Prašymo iniciatorius',
    termination_confirmed_at: 'Patvirtinimo data',
    deposit_return_amount: 'Grąžinamas depozitas',
    deposit_deduction_amount: 'Depozito išskaita',
    deposit_deduction_reason: 'Išskaitos priežastis',
};

// Value translations (English → Lithuanian)
const VALUE_LABELS: Record<string, string> = {
    occupied: 'Išnuomotas',
    vacant: 'Laisvas',
    reserved: 'Rezervuotas',
    apartment: 'Butas',
    house: 'Namas',
    room: 'Kambarys',
    studio: 'Studija',
    none: 'Nėra',
    street: 'Gatvėje',
    garage: 'Garažas',
    underground: 'Požeminė',
    central: 'Centrinis',
    gas: 'Dujinis',
    electric: 'Elektrinis',
    district: 'Centralizuotas',
    fully: 'Pilnai',
    partially: 'Dalinai',
    unfurnished: 'Be baldų',
    true: 'Taip',
    false: 'Ne',
    // Termination statuses
    tenant_requested: 'Nuomininko prašymas',
    landlord_requested: 'Nuomotojo prašymas',
    confirmed: 'Patvirtinta',
    terminated: 'Nutraukta',
    cancelled: 'Atšaukta',
    rejected: 'Atmesta',
    // Invitation/payment
    pending: 'Laukiama',
    accepted: 'Priimta',
    expired: 'Pasibaigęs',
    paid: 'Apmokėta',
    overdue: 'Pradelsta',
};

const TABLE_LABELS: Record<string, string> = {
    properties: 'Būstas',
    tenant_invitations: 'Pakvietimas',
    property_documents: 'Dokumentas',
    invoices: 'Sąskaita',
    meters: 'Skaitiklis',
    meter_readings: 'Rodmuo',
    users: 'Vartotojas',
    tenant_history: 'Istorija',
};

const ACTION_LABELS: Record<string, string> = {
    UPDATE: 'Atnaujinta',
    INSERT: 'Sukurta',
    DELETE: 'Ištrinta',
    VIEW: 'Peržiūrėta',
};

// Fields to skip in display (technical, not user-meaningful)
const SKIP_FIELDS = new Set([
    'id', 'address_id', 'owner_id', 'created_at', 'updated_at',
    'apartment_number', 'unit_number', 'floors_total',
]);

// ─── Public label helpers ───────────────────────────────────────────────────

export function getFieldLabel(field: string): string {
    return FIELD_LABELS[field] || field;
}

export function getTableLabel(table: string): string {
    return TABLE_LABELS[table] || table;
}

export function getActionLabel(action: string): string {
    return ACTION_LABELS[action] || action;
}

// ─── Value formatting ───────────────────────────────────────────────────────

const CURRENCY_FIELDS = new Set(['rent', 'deposit_amount', 'late_fee_amount', 'extended_details.late_fee_amount']);
const MONTH_FIELDS = new Set(['min_term_months', 'extended_details.min_term_months']);
const DAY_FIELDS = new Set([
    'late_fee_grace_days', 'extended_details.late_fee_grace_days',
    'payment_due_day', 'extended_details.payment_due_day',
]);

function translateValue(value: any): string {
    if (value === null || value === undefined || value === '') return '—';
    const str = String(value);
    return VALUE_LABELS[str.toLowerCase()] || str;
}

function formatValue(field: string, value: any): string {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'boolean') return value ? 'Taip' : 'Ne';
    if (CURRENCY_FIELDS.has(field)) return `€${value}`;
    if (MONTH_FIELDS.has(field)) return `${value} mėn.`;
    if (DAY_FIELDS.has(field)) return `${value} d.`;
    return translateValue(value);
}

function getFieldValue(data: Record<string, any> | null, field: string): any {
    if (!data) return undefined;
    if (field.startsWith('extended_details.')) {
        const subKey = field.replace('extended_details.', '');
        return data?.extended_details?.[subKey] ?? data?.[subKey];
    }
    return data?.[field];
}

// ─── Generate human description from raw data ───────────────────────────────

/**
 * Check if a field key actually exists in data (not inherited/undefined).
 * For extended_details sub-fields, checks inside the extended_details object.
 */
function fieldExistsInData(data: Record<string, any> | null, field: string): boolean {
    if (!data) return false;
    if (field.startsWith('extended_details.')) {
        const subKey = field.replace('extended_details.', '');
        return data.extended_details != null && subKey in (data.extended_details || {});
    }
    return field in data;
}

/**
 * Generate a human-readable Lithuanian description from audit entry data.
 * Only shows fields that actually changed and have meaningful values.
 */
export function generateDisplayDescription(
    changedFields: string[] | null,
    oldData: Record<string, any> | null,
    newData: Record<string, any> | null,
): string {
    const allFields = (changedFields || []);
    if (allFields.length === 0) return 'Atnaujinti duomenys';

    const parts: string[] = [];

    for (const field of allFields) {
        // Skip technical/internal fields
        if (SKIP_FIELDS.has(field)) continue;

        // Skip unknown fields (label same as raw name + contains underscore or dot)
        const label = getFieldLabel(field);
        if (label === field && (field.includes('_') || field.includes('.'))) continue;

        const oldVal = getFieldValue(oldData, field);
        const newVal = getFieldValue(newData, field);

        // Skip objects (extended_details as whole object)
        if (typeof oldVal === 'object' && oldVal !== null && !Array.isArray(oldVal)) continue;
        if (typeof newVal === 'object' && newVal !== null && !Array.isArray(newVal)) continue;

        // Skip if newData doesn't contain this field AND values are same
        // (field only appears because it exists in old_data full row)
        if (!fieldExistsInData(newData, field) && newVal === undefined) continue;

        // Skip if values are actually identical
        if (String(oldVal ?? '') === String(newVal ?? '')) continue;

        // Boolean toggles
        if (typeof newVal === 'boolean') {
            parts.push(newVal ? `Pažymėta: ${label}` : `Atžymėta: ${label}`);
            continue;
        }

        // Value change old → new (both exist)
        const hasOld = oldVal !== undefined && oldVal !== null && oldVal !== '';
        const hasNew = newVal !== undefined && newVal !== null && newVal !== '';

        if (hasOld && hasNew) {
            parts.push(`${label}: ${formatValue(field, oldVal)} → ${formatValue(field, newVal)}`);
        } else if (hasNew) {
            parts.push(`${label}: ${formatValue(field, newVal)}`);
        } else if (hasOld) {
            // Value was removed — only show if it's a meaningful field
            parts.push(`${label}: pašalinta`);
        }

        // Max 4 items in description
        if (parts.length >= 4) break;
    }

    return parts.length > 0 ? parts.join(' · ') : 'Atnaujinti duomenys';
}

// ─── Compute diff ───────────────────────────────────────────────────────────

function computeChangedFields(oldData: Record<string, any>, newData: Record<string, any>): string[] {
    const changed: string[] = [];
    const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
    for (const key of allKeys) {
        if (key === 'extended_details') {
            const oldExt = oldData[key] || {};
            const newExt = newData[key] || {};
            const extKeys = new Set([...Object.keys(oldExt), ...Object.keys(newExt)]);
            for (const ek of extKeys) {
                if (JSON.stringify(oldExt[ek]) !== JSON.stringify(newExt[ek])) {
                    changed.push(`extended_details.${ek}`);
                }
            }
        } else if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
            changed.push(key);
        }
    }
    return changed;
}

// ─── Public API ─────────────────────────────────────────────────────────────

export async function logPropertyChange(
    propertyId: string,
    action: string,
    oldData: Record<string, any> | null,
    newData: Record<string, any>,
    description?: string
): Promise<void> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const changedFields = oldData ? computeChangedFields(oldData, newData) : Object.keys(newData);
        const autoDesc = description || generateDisplayDescription(changedFields, oldData, newData);

        await supabase.from('audit_log').insert({
            user_id: user.id,
            user_email: user.email,
            action,
            table_name: 'properties',
            record_id: propertyId,
            old_data: oldData,
            new_data: newData,
            changed_fields: changedFields,
            description: autoDesc,
        });
    } catch (err) {
        if (process.env.NODE_ENV === 'development') {
            console.error('Audit log error:', err);
        }
    }
}

export async function getPropertyAuditLog(propertyId: string, limit = 50): Promise<AuditLogEntry[]> {
    const { data, error } = await supabase
        .from('audit_log')
        .select('*')
        .eq('record_id', propertyId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        if (process.env.NODE_ENV === 'development') {
            console.error('Error fetching audit log:', error);
        }
        return [];
    }

    return data || [];
}

/**
 * Log any event to audit_log (meters, documents, invoices, etc.)
 * record_id should be the property_id so all events are visible in property history.
 */
export async function logAuditEvent(
    recordId: string,
    tableName: string,
    action: string,
    description: string,
    details?: Record<string, any>,
    oldData?: Record<string, any> | null,
    changedFields?: string[],
): Promise<void> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            console.warn('[auditLog] No user — skipping audit event');
            return;
        }

        const { error } = await supabase.from('audit_log').insert({
            user_id: user.id,
            user_email: user.email,
            action,
            table_name: tableName,
            record_id: recordId,
            old_data: oldData ?? null,
            new_data: details || null,
            changed_fields: changedFields ?? null,
            description,
        });

        if (error) {
            console.error('[auditLog] Insert failed:', error.message, { recordId, tableName, action, description });
        }
    } catch (err) {
        console.error('[auditLog] Event error:', err);
    }
}
