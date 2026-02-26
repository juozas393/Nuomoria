import { loadStripe, Stripe } from '@stripe/stripe-js';
import { supabase } from './supabase';

// Stripe publishable key — loaded from env
const STRIPE_PK = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';

let stripePromise: Promise<Stripe | null> | null = null;

/**
 * Get the Stripe instance (singleton, lazy-loaded)
 */
export function getStripe(): Promise<Stripe | null> {
    if (!stripePromise && STRIPE_PK) {
        stripePromise = loadStripe(STRIPE_PK);
    }
    return stripePromise || Promise.resolve(null);
}

/**
 * Check if Stripe is configured
 */
export function isStripeConfigured(): boolean {
    return !!STRIPE_PK;
}

// --- API helpers ---

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';

async function getAuthHeaders(): Promise<Record<string, string>> {
    const { data: { session } } = await supabase.auth.getSession();
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token || ''}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
    };
}

/**
 * Start Stripe Connect onboarding for a landlord
 */
export async function startStripeOnboarding(returnUrl?: string): Promise<{ url?: string; alreadyOnboarded?: boolean; error?: string }> {
    try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${SUPABASE_URL}/functions/v1/stripe-onboard`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ returnUrl: returnUrl || window.location.href }),
        });
        return await res.json();
    } catch (err) {
        console.error('startStripeOnboarding error:', err);
        return { error: 'Nepavyko prisijungti prie Stripe' };
    }
}

/**
 * Create a payment intent for rent payment
 */
export async function createRentPayment(params: {
    invoiceId?: string;
    propertyId?: string;
    addressId?: string;
    paymentMethod?: 'sepa_debit' | 'card';
}): Promise<{ clientSecret?: string; paymentIntentId?: string; amount?: number; error?: string }> {
    try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${SUPABASE_URL}/functions/v1/stripe-create-payment`, {
            method: 'POST',
            headers,
            body: JSON.stringify(params),
        });
        return await res.json();
    } catch (err) {
        console.error('createRentPayment error:', err);
        return { error: 'Nepavyko sukurti mokėjimo' };
    }
}

/**
 * Check if a landlord has Stripe Connect enabled
 */
export async function checkStripeEnabled(landlordUserId: string): Promise<boolean> {
    try {
        const { data } = await supabase
            .from('stripe_accounts')
            .select('charges_enabled')
            .eq('user_id', landlordUserId)
            .eq('charges_enabled', true)
            .maybeSingle();
        return !!data;
    } catch {
        return false;
    }
}

/**
 * Get landlord's Stripe account status
 */
export async function getStripeAccountStatus(userId: string): Promise<{
    connected: boolean;
    status: string;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
} | null> {
    try {
        const { data } = await supabase
            .from('stripe_accounts')
            .select('status, charges_enabled, payouts_enabled, details_submitted')
            .eq('user_id', userId)
            .maybeSingle();

        if (!data) return null;
        return {
            connected: true,
            status: data.status,
            chargesEnabled: data.charges_enabled,
            payoutsEnabled: data.payouts_enabled,
        };
    } catch {
        return null;
    }
}
