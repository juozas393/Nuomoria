import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { app } from '../config/environment';

/**
 * Google-Only Login Page
 * Premium design with cityscape background and two-column layout
 */

const GoogleLogin: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [checkingSession, setCheckingSession] = useState(true);

    // Check if already authenticated
    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();

            if (session) {
                // Already logged in - check role and redirect
                const { data: userData } = await supabase
                    .from('users')
                    .select('role, status')
                    .eq('id', session.user.id)
                    .maybeSingle();

                const status = userData?.status?.toUpperCase();
                if (status === 'DELETED' || status === 'PENDING_PURGE') {
                    navigate('/account-deleted');
                    return;
                }

                if (!userData?.role) {
                    navigate('/onboarding');
                } else if (userData.role === 'tenant') {
                    navigate('/tenant');
                } else {
                    navigate('/dashboard');
                }
                return;
            }

            setCheckingSession(false);
        };

        checkSession();
    }, [navigate]);

    const handleGoogleSignIn = async () => {
        setLoading(true);
        setError('');

        try {
            const { error: signInError } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${app.url}/auth/callback`,
                },
            });

            if (signInError) {
                setError('Klaida prisijungiant su Google. Bandykite dar kartą.');
                setLoading(false);
            }
        } catch (err) {
            setError('Įvyko netikėta klaida. Bandykite dar kartą.');
            setLoading(false);
        }
    };

    // Show loading while checking session
    if (checkingSession) {
        return (
            <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen relative overflow-hidden">
            {/* Background - City skyline */}
            <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{
                    backgroundImage: `url('/images/CityBackground.jpg')`,
                    filter: 'brightness(0.4)'
                }}
            />

            {/* Dark overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#0a1628]/90 via-[#0a1628]/70 to-transparent" />

            {/* Content */}
            <div className="relative z-10 min-h-screen flex">
                {/* Left side - Marketing content */}
                <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-12 xl:px-20">
                    <h1 className="text-4xl xl:text-5xl font-bold text-white mb-4 leading-tight">
                        Valdykite nuomą
                        <br />
                        <span className="text-[#4DB6AC]">paprastai</span>
                    </h1>

                    <p className="text-white/70 text-lg mb-8 max-w-md">
                        Profesionali platforma nekilnojamojo turto valdymui.
                        Stebėkite mokėjimus, bendraukite su nuomininkais ir
                        valdykite dokumentus vienoje vietoje.
                    </p>

                    {/* Trust badges */}
                    <div className="flex flex-wrap gap-3 mb-10">
                        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg">
                            <span className="text-[#4DB6AC]">👥</span>
                            <span className="text-white/80 text-sm">10+ NT valdytojų</span>
                        </div>
                        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg">
                            <span className="text-[#4DB6AC]">🔒</span>
                            <span className="text-white/80 text-sm">Saugus OAuth</span>
                        </div>
                        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg">
                            <span className="text-[#4DB6AC]">⚡</span>
                            <span className="text-white/80 text-sm">Realus laikas</span>
                        </div>
                    </div>

                    {/* Features */}
                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#2F8481]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <svg className="w-4 h-4 text-[#4DB6AC]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-white font-medium">Automatizuotas sąskaitų valdymas</h3>
                                <p className="text-white/50 text-sm">Sąskaitos ir priminimai generuojami automatiškai</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#2F8481]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <svg className="w-4 h-4 text-[#4DB6AC]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-white font-medium">Bendravimas su nuomininkais</h3>
                                <p className="text-white/50 text-sm">Centralizuota pranešimų sistema</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#2F8481]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <svg className="w-4 h-4 text-[#4DB6AC]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-white font-medium">Analitika ir ataskaitos</h3>
                                <p className="text-white/50 text-sm">Stebėkite pajamas realiu laiku</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right side - Login card */}
                <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
                        {/* Logo */}
                        <div className="flex items-center justify-center gap-3 mb-6">
                            <div className="w-12 h-12 bg-gradient-to-br from-[#2F8481] to-[#4DB6AC] rounded-xl flex items-center justify-center">
                                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Nuomoria</h2>
                                <p className="text-xs text-gray-500">Profesionalus nekilnojamojo turto valdymas</p>
                            </div>
                        </div>

                        {/* Title */}
                        <div className="text-center mb-6">
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">Prisijungti</h3>
                            <p className="text-gray-500 text-sm">Pradėkite valdyti savo nekilnojamąjį turtą</p>
                        </div>

                        {/* Error message */}
                        {error && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm text-center">
                                {error}
                            </div>
                        )}

                        {/* Google Sign In Button */}
                        <button
                            onClick={handleGoogleSignIn}
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-3 bg-[#2F8481] hover:bg-[#267270] text-white py-3.5 px-6 rounded-xl font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                        >
                            {loading ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                            ) : (
                                <>
                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                    Tęsti su Google
                                </>
                            )}
                        </button>

                        {/* Security note */}
                        <p className="text-center text-gray-400 text-xs mt-4">
                            Nauji vartotojai kuria paskyrą per Google
                        </p>

                        {/* Trust indicator */}
                        <div className="flex items-center justify-center gap-2 text-gray-400 text-xs mt-6 pt-4 border-t border-gray-100">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            <span>Jau naudoja 10+ NT valdytojų</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GoogleLogin;
