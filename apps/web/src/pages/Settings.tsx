import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CreditCard,
  ExternalLink,
  Check,
  Clock,
  AlertCircle,
  Loader2,
  Shield,
  Banknote,
  RefreshCw,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';


interface StripeAccountInfo {
  id: string;
  stripe_account_id: string;
  status: string;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  onboarding_complete: boolean;
  details_submitted: boolean;
}

const Settings: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [stripeAccount, setStripeAccount] = useState<StripeAccountInfo | null>(null);
  const [loadingStripe, setLoadingStripe] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [stripeMessage, setStripeMessage] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

  const isLandlord = user?.role === 'landlord';

  // Load Stripe account status
  const loadStripeAccount = useCallback(async () => {
    if (!user?.id || !isLandlord) { setLoadingStripe(false); return; }
    try {
      const { data } = await supabase
        .from('stripe_accounts')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      setStripeAccount(data);
    } catch { /* silent */ }
    setLoadingStripe(false);
  }, [user?.id, isLandlord]);

  useEffect(() => { loadStripeAccount(); }, [loadStripeAccount]);

  // Check URL for Stripe return
  useEffect(() => {
    const stripeStatus = searchParams.get('stripe');
    if (stripeStatus === 'success') {
      setStripeMessage({ type: 'success', text: 'Stripe paskyra sėkmingai prijungta! Statuso patvirtinimas gali užtrukti kelias minutes.' });
      setSearchParams({}, { replace: true });
      // Poll for account update
      const t1 = setTimeout(() => loadStripeAccount(), 3000);
      const t2 = setTimeout(() => loadStripeAccount(), 8000);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    } else if (stripeStatus === 'refresh') {
      setStripeMessage({ type: 'info', text: 'Stripe onboarding nebaigtas. Spauskite „Prijungti" dar kartą.' });
      setSearchParams({}, { replace: true });
    }
    if (stripeStatus) setTimeout(() => setStripeMessage(null), 10000);
  }, [searchParams, setSearchParams, loadStripeAccount]);

  const handleConnectStripe = useCallback(async () => {
    try {
      setConnecting(true);
      setStripeMessage(null);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setStripeMessage({ type: 'error', text: 'Nėra sesijos. Prisijunkite iš naujo.' }); return; }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const resp = await fetch(`${supabaseUrl}/functions/v1/stripe-onboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}`, 'apikey': anonKey },
        body: JSON.stringify({ returnUrl: `${window.location.origin}/nustatymai?stripe=success` }),
      });
      const data = await resp.json();

      if (!resp.ok) {
        throw new Error(data.detail || data.error || 'Stripe klaida');
      }

      if (data.alreadyOnboarded) {
        setStripeMessage({ type: 'success', text: 'Stripe paskyra jau aktyvuota! Mokėjimai priimami.' });
        await loadStripeAccount();
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Nepavyko gauti Stripe nuorodos');
      }
    } catch (err) {
      setStripeMessage({ type: 'error', text: err instanceof Error ? err.message : 'Klaida jungiant Stripe' });
    } finally {
      setConnecting(false);
    }
  }, [loadStripeAccount]);

  // Refresh status from Stripe API (not just DB)
  const [refreshing, setRefreshing] = useState(false);
  const refreshStripeStatus = useCallback(async () => {
    try {
      setRefreshing(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const resp = await fetch(`${supabaseUrl}/functions/v1/stripe-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}`, 'apikey': anonKey },
      });
      const data = await resp.json();

      if (resp.ok && data.stripe_account_id) {
        setStripeAccount(data);
        if (data.charges_enabled && data.payouts_enabled) {
          setStripeMessage({ type: 'success', text: 'Stripe paskyra aktyvuota! Mokėjimai priimami.' });
        } else if (data.details_submitted) {
          setStripeMessage({ type: 'info', text: 'Stripe tikrina jūsų duomenis. Palaukite.' });
        } else {
          setStripeMessage({ type: 'info', text: 'Statusas atnaujintas iš Stripe.' });
        }
      }
    } catch {
      setStripeMessage({ type: 'error', text: 'Nepavyko atnaujinti statuso' });
    } finally {
      setRefreshing(false);
    }
  }, []);

  const getStripeStatusDisplay = () => {
    if (!stripeAccount) return null;
    const { charges_enabled, payouts_enabled, details_submitted, status } = stripeAccount;

    if (charges_enabled && payouts_enabled) {
      return {
        icon: Check,
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        badge: 'bg-emerald-100 text-emerald-700',
        label: 'Aktyvuota',
        description: 'Jūsų Stripe paskyra aktyvuota. Nuomininkų mokėjimai bus automatiškai pervedami į jūsų banko sąskaitą.',
      };
    }
    if (details_submitted || status === 'pending_verification') {
      return {
        icon: Clock,
        color: 'text-amber-600',
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        badge: 'bg-amber-100 text-amber-700',
        label: 'Tikrinama',
        description: 'Stripe tikrina jūsų duomenis. Tai gali užtrukti iki 24 valandų. Jūs gausite el. laišką kai bus patvirtinta.',
      };
    }
    return {
      icon: AlertCircle,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      badge: 'bg-orange-100 text-orange-700',
      label: 'Nebaigta',
      description: 'Stripe registracija nebaigta. Spauskite „Tęsti registraciją" kad užbaigtumėte.',
    };
  };

  const statusDisplay = getStripeStatusDisplay();

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Nustatymai</h1>
          <p className="mt-2 text-sm text-gray-600">
            Valdykite savo paskyros nustatymus
          </p>
        </div>

        {/* Stripe Message Banner */}
        {stripeMessage && (
          <div className={`mb-6 px-5 py-4 rounded-xl border flex items-start gap-3 animate-fadeIn ${stripeMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
            stripeMessage.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
              'bg-blue-50 border-blue-200 text-blue-800'
            }`}>
            {stripeMessage.type === 'success' ? <Check className="w-5 h-5 mt-0.5 flex-shrink-0" /> :
              stripeMessage.type === 'error' ? <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" /> :
                <Clock className="w-5 h-5 mt-0.5 flex-shrink-0" />}
            <span className="text-sm font-medium">{stripeMessage.text}</span>
          </div>
        )}

        {/* Login Methods Section */}
        <div className="bg-white shadow-sm rounded-xl border border-gray-200 mb-6">
          <div className="px-6 py-5 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Prisijungimo būdai</h2>
            <p className="mt-1 text-sm text-gray-500">
              Valdykite, kaip prisijungiate prie savo paskyros
            </p>
          </div>

          <div className="px-6 py-5 space-y-4">
            {/* Google OAuth */}
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-gray-700" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">Google</div>
                  <div className="text-xs text-gray-500">Prisijungimas per Google OAuth</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                  Prijungta
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Stripe Connect Section — only for landlords */}
        {isLandlord && (
          <div className="bg-white shadow-sm rounded-xl border border-gray-200">
            <div className="px-6 py-5 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#635BFF] to-[#7B73FF] flex items-center justify-center shadow-sm">
                  <CreditCard className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Mokėjimų nustatymai</h2>
                  <p className="mt-0.5 text-sm text-gray-500">
                    Prijunkite Stripe paskyrą, kad gauti mokėjimus tiesiogiai į banką
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-6">
              {loadingStripe ? (
                <div className="flex items-center gap-3 py-8 justify-center">
                  <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                  <span className="text-sm text-gray-500">Kraunama...</span>
                </div>
              ) : stripeAccount && statusDisplay ? (
                /* Has Stripe account — show status */
                <div className="space-y-5">
                  <div className={`flex items-start gap-4 p-5 rounded-xl border ${statusDisplay.border} ${statusDisplay.bg}`}>
                    <div className={`w-10 h-10 rounded-xl ${statusDisplay.bg} border ${statusDisplay.border} flex items-center justify-center flex-shrink-0`}>
                      <statusDisplay.icon className={`w-5 h-5 ${statusDisplay.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-sm font-bold text-gray-900">Stripe Connect</span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${statusDisplay.badge}`}>
                          {statusDisplay.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">{statusDisplay.description}</p>
                      {stripeAccount.stripe_account_id && (
                        <p className="mt-2 text-[11px] text-gray-400 font-mono">
                          ID: {stripeAccount.stripe_account_id}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 border border-gray-100">
                      <Banknote className={`w-5 h-5 ${stripeAccount.payouts_enabled ? 'text-emerald-500' : 'text-gray-300'}`} />
                      <div>
                        <div className="text-xs text-gray-500">Išmokėjimai</div>
                        <div className={`text-sm font-semibold ${stripeAccount.payouts_enabled ? 'text-emerald-600' : 'text-gray-400'}`}>
                          {stripeAccount.payouts_enabled ? 'Aktyvūs' : 'Neaktyvūs'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 border border-gray-100">
                      <Shield className={`w-5 h-5 ${stripeAccount.charges_enabled ? 'text-emerald-500' : 'text-gray-300'}`} />
                      <div>
                        <div className="text-xs text-gray-500">Mokėjimai</div>
                        <div className={`text-sm font-semibold ${stripeAccount.charges_enabled ? 'text-emerald-600' : 'text-gray-400'}`}>
                          {stripeAccount.charges_enabled ? 'Priimami' : 'Nepriimami'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-3">
                    {!stripeAccount.charges_enabled && (
                      <button
                        onClick={handleConnectStripe}
                        disabled={connecting}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#635BFF] to-[#7B73FF] text-white rounded-xl text-sm font-semibold hover:from-[#5851DB] hover:to-[#6B63FF] transition-all active:scale-[0.98] shadow-md shadow-[#635BFF]/25 disabled:opacity-60"
                      >
                        {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                        Tęsti registraciją
                      </button>
                    )}
                    <button
                      onClick={refreshStripeStatus}
                      disabled={refreshing}
                      className="flex items-center gap-2 px-4 py-2.5 text-gray-600 bg-white border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-all disabled:opacity-60"
                    >
                      <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                      {refreshing ? 'Tikrinama...' : 'Atnaujinti statusą'}
                    </button>
                  </div>
                </div>
              ) : (
                /* No Stripe account — show onboarding CTA */
                <div className="text-center py-6">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#635BFF]/10 to-[#7B73FF]/10 border border-[#635BFF]/20 flex items-center justify-center mx-auto mb-4">
                    <CreditCard className="w-8 h-8 text-[#635BFF]" />
                  </div>
                  <h3 className="text-base font-bold text-gray-900 mb-2">Prijunkite Stripe mokėjimus</h3>
                  <p className="text-sm text-gray-500 max-w-md mx-auto mb-6 leading-relaxed">
                    Nuomininkai galės apmokėti sąskaitas tiesiogiai kortele. Pinigai bus automatiškai pervedami į jūsų banko sąskaitą. Platformos komisija — 3%.
                  </p>

                  <div className="flex flex-col items-center gap-4">
                    <button
                      onClick={handleConnectStripe}
                      disabled={connecting}
                      className="flex items-center gap-2.5 px-7 py-3 bg-gradient-to-r from-[#635BFF] to-[#7B73FF] text-white rounded-xl text-sm font-bold hover:from-[#5851DB] hover:to-[#6B63FF] transition-all active:scale-[0.98] shadow-lg shadow-[#635BFF]/30 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {connecting ? (
                        <><Loader2 className="w-4.5 h-4.5 animate-spin" /> Jungiamasi...</>
                      ) : (
                        <><CreditCard className="w-4.5 h-4.5" /> Prijungti Stripe</>
                      )}
                    </button>

                    <div className="flex items-center gap-4 text-[11px] text-gray-400">
                      <span className="flex items-center gap-1"><Shield className="w-3.5 h-3.5" /> Saugus</span>
                      <span className="flex items-center gap-1"><Banknote className="w-3.5 h-3.5" /> Automatiniai pervedimai</span>
                      <span className="flex items-center gap-1"><CreditCard className="w-3.5 h-3.5" /> Visa / Mastercard</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}


      </div>
    </div>
  );
};

export default Settings;
