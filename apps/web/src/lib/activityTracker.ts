/**
 * Activity Tracker — logs user actions to audit_log via Supabase RPC.
 * Tracks views, submissions, exports, and other frontend-side actions.
 * Data mutations (INSERT/UPDATE/DELETE) are tracked automatically by DB triggers.
 */
import { supabase } from './supabase';

type ActivityAction = 'VIEW' | 'SUBMIT' | 'LOGIN' | 'EXPORT';

interface ActivityOptions {
    /** Which table/entity the action relates to */
    tableName: string;
    /** Optional record ID */
    recordId?: string;
    /** Lithuanian description of the action */
    description: string;
    /** Optional extra metadata */
    metadata?: Record<string, unknown>;
}

/**
 * Log a user activity event. Non-blocking — fires and forgets.
 * Will silently fail if user is not authenticated.
 */
export function trackActivity(action: ActivityAction, options: ActivityOptions): void {
    // Fire and forget — don't await, don't block UI
    supabase.rpc('log_user_activity', {
        p_action: action,
        p_table_name: options.tableName,
        p_record_id: options.recordId ?? null,
        p_description: options.description,
        p_metadata: options.metadata ? JSON.stringify(options.metadata) : null,
    }).then(({ error }) => {
        if (error) {
            // Silent fail — don't interrupt user flow
            console.debug('[ActivityTracker] Failed:', error.message);
        }
    });
}

// ─── Convenience helpers ─── //

/** Track when user views a property/unit detail */
export function trackPropertyView(propertyId: string, unitNumber?: string): void {
    trackActivity('VIEW', {
        tableName: 'properties',
        recordId: propertyId,
        description: unitNumber
            ? `Peržiūrėjo butą: ${unitNumber}`
            : 'Peržiūrėjo buto informaciją',
    });
}

/** Track when user views meters tab */
export function trackMetersView(propertyId: string): void {
    trackActivity('VIEW', {
        tableName: 'meters',
        recordId: propertyId,
        description: 'Peržiūrėjo skaitliklių skiltį',
    });
}

/** Track when user submits meter readings */
export function trackMeterReadingSubmit(propertyId: string, meterCount: number): void {
    trackActivity('SUBMIT', {
        tableName: 'meter_readings',
        recordId: propertyId,
        description: `Pateikė ${meterCount} skaitiklių rodmenis`,
        metadata: { meter_count: meterCount },
    });
}

/** Track when user views invoices */
export function trackInvoicesView(propertyId?: string): void {
    trackActivity('VIEW', {
        tableName: 'invoices',
        recordId: propertyId,
        description: 'Peržiūrėjo sąskaitas',
    });
}

/** Track when user views tenant list */
export function trackTenantsView(): void {
    trackActivity('VIEW', {
        tableName: 'tenants',
        description: 'Peržiūrėjo nuomininkų sąrašą',
    });
}

/** Track when user sends a tenant invitation */
export function trackInvitationSent(propertyId: string): void {
    trackActivity('SUBMIT', {
        tableName: 'tenant_invitations',
        recordId: propertyId,
        description: 'Išsiuntė pakvietimą nuomininkui',
    });
}

/** Track when user views documents */
export function trackDocumentsView(propertyId: string): void {
    trackActivity('VIEW', {
        tableName: 'property_documents',
        recordId: propertyId,
        description: 'Peržiūrėjo dokumentus',
    });
}

/** Track page navigation */
export function trackPageView(pageName: string): void {
    trackActivity('VIEW', {
        tableName: 'pages',
        description: `Atidarė puslapį: ${pageName}`,
    });
}

/** Track user login */
export function trackLogin(): void {
    trackActivity('LOGIN', {
        tableName: 'users',
        description: 'Prisijungė prie sistemos',
    });
}
