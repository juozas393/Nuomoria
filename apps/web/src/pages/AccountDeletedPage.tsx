import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';

/**
 * Account Deleted Page
 * Shown when a user with DELETED/PENDING_PURGE status tries to sign in
 * Supports restore during grace period (30 days)
 */

interface LocationState {
    canRestore?: boolean;
    deletedAt?: string;
    purgeAfter?: string;
}

const AccountDeletedPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const state = location.state as LocationState | null;

    const canRestore = state?.canRestore ?? true;
    const deletedAt = state?.deletedAt;
    const purgeAfter = state?.purgeAfter;

    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState('');

    // Calculate days remaining
    const daysRemaining = purgeAfter
        ? Math.max(0, Math.ceil((new Date(purgeAfter).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : 30;

    const handleRestore = async () => {
        setLoading(true);
        setError('');

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                navigate('/login');
                return;
            }

            // Restore account by setting status to 'ACTIVE' and clearing deletion fields
            const { error: updateError } = await supabase
                .from('users')
                .update({
                    status: 'ACTIVE',
                    deleted_at: null,
                    purge_after: null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', session.user.id);

            if (updateError) {
                setError('Nepavyko atkurti paskyros. Bandykite dar kartą.');
                return;
            }

            // Check if user has a role
            const { data: userData } = await supabase
                .from('users')
                .select('role')
                .eq('id', session.user.id)
                .single();

            if (!userData?.role) {
                navigate('/onboarding');
            } else if (userData.role === 'tenant') {
                navigate('/tenant');
            } else {
                navigate('/dashboard');
            }
        } catch (err) {
            setError('Įvyko klaida. Bandykite dar kartą.');
        } finally {
            setLoading(false);
        }
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    return (
        <div className="min-h-screen relative overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460]">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            </div>

            {/* Content */}
            <div className="relative z-10 min-h-screen flex items-center justify-center px-4">
                <div className="max-w-md w-full">
                    {/* Card */}
                    <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-8 shadow-2xl">
                        {/* Icon */}
                        <div className="flex justify-center mb-6">
                            <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center">
                                <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                        </div>

                        {/* Title */}
                        <h1 className="text-2xl font-bold text-center text-white mb-2">
                            Paskyra ištrinta
                        </h1>

                        {/* Description */}
                        <p className="text-white/70 text-center text-sm mb-4">
                            {canRestore
                                ? 'Jūsų paskyra buvo ištrinta. Galite ją atkurti arba prisijungti su kitu el. paštu.'
                                : 'Jūsų paskyra buvo visiškai ištrinta ir negali būti atkurta.'
                            }
                        </p>

                        {/* Days remaining */}
                        {canRestore && daysRemaining > 0 && (
                            <div className="text-center mb-6">
                                <span className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/20 border border-amber-500/30 rounded-xl text-amber-300 text-sm">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Liko {daysRemaining} d. atkurti paskyrą
                                </span>
                            </div>
                        )}

                        {/* Error */}
                        {error && (
                            <div className="mb-6 p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-sm text-center">
                                {error}
                            </div>
                        )}

                        {/* Actions */}
                        <div className="space-y-3">
                            {canRestore && (
                                <button
                                    onClick={handleRestore}
                                    disabled={loading}
                                    className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                                >
                                    {loading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                            </svg>
                                            Atkuriama...
                                        </span>
                                    ) : (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                            </svg>
                                            Atkurti paskyrą
                                        </span>
                                    )}
                                </button>
                            )}

                            <button
                                onClick={handleSignOut}
                                className="w-full py-3 px-4 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl font-medium transition-all duration-200"
                            >
                                Atsijungti ir bandyti kitu el. paštu
                            </button>
                        </div>

                        {/* Security note */}
                        <div className="flex items-center justify-center gap-2 text-white/40 text-xs mt-8">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Jei turite klausimų, susisiekite su mumis</span>
                        </div>
                    </div>

                    {/* Branding */}
                    <p className="text-center text-white/30 text-sm mt-6">
                        Nuomoria • Nuomos valdymo platforma
                    </p>
                </div>
            </div>
        </div >
    );
};

export default AccountDeletedPage;
