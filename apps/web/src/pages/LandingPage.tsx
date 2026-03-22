import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    Building2, Receipt, MessageSquare, BarChart3, ArrowRight, UserPlus, Home,
    Settings2, Shield, Zap, ChevronDown, Users, Key, Bell, FileText, Clock,
    TrendingUp, Gauge, ChevronRight, Check, HelpCircle, Plus, Minus,
    Star, Globe, Lock, Eye, Wallet, CalendarDays, Mail
} from 'lucide-react';
import logoImage from '../assets/logocanvaTransparent.png';
import logoBlack from '../assets/logocanvBLACKWithoutBG.png';
import smallLogoWhite from '../assets/SmallLogoWHITEWithoutBG.png';
import PricingModal from '../components/PricingModal';



// ─────────────────────────────────────────────
// Intersection Observer for scroll animations
// ─────────────────────────────────────────────
const useScrollReveal = () => {
    const ref = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
            { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    return { ref, isVisible };
};

const RevealSection: React.FC<{ children: React.ReactNode; className?: string; delay?: number }> = ({ children, className = '', delay = 0 }) => {
    const { ref, isVisible } = useScrollReveal();
    return (
        <div
            ref={ref}
            className={className}
            style={{
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateY(0)' : 'translateY(28px)',
                transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
            }}
        >
            {children}
        </div>
    );
};

// ─────────────────────────────────────────────
// FAQ Accordion Item
// ─────────────────────────────────────────────
const FaqItem: React.FC<{ q: string; a: string }> = ({ q, a }) => {
    const [open, setOpen] = useState(false);
    return (
        <div
            className="border-b transition-colors"
            style={{ borderColor: 'rgba(255,255,255,0.07)' }}
        >
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between py-5 px-1 text-left group transition-all duration-200 hover:px-3 rounded-lg"
            >
                <span className="text-[14px] lg:text-[16px] font-semibold pr-4" style={{ color: 'rgba(255,255,255,0.88)' }}>{q}</span>
                <span className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                    style={{ backgroundColor: open ? 'rgba(47,132,129,0.2)' : 'rgba(255,255,255,0.06)' }}>
                    {open ? <Minus className="w-3.5 h-3.5 text-teal-400" /> : <Plus className="w-3.5 h-3.5 text-gray-400" />}
                </span>
            </button>
            <div
                className="overflow-hidden transition-all duration-300"
                style={{ maxHeight: open ? '200px' : '0', opacity: open ? 1 : 0 }}
            >
                <p className="pb-5 text-[13px] lg:text-[14px] leading-[1.8] pr-12" style={{ color: 'rgba(255,255,255,0.50)' }}>
                    {a}
                </p>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────
// Animated counter
// ─────────────────────────────────────────────
const AnimatedStat: React.FC<{ value: string; label: string; description?: string; delay?: number }> = ({ value, label, description, delay = 0 }) => {
    const { ref, isVisible } = useScrollReveal();
    return (
        <div ref={ref} className="relative text-center p-5 lg:p-6 rounded-2xl transition-all duration-300 hover:scale-[1.03] group" style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(16px)',
            transition: `all 0.6s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
            backgroundColor: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
        }}>
            {/* Top accent line */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-[2px] rounded-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(58,176,158,0.5), transparent)' }} />
            <div className="text-[32px] lg:text-[42px] font-bold tracking-[-0.03em] landing-gradient-text font-display leading-none">{value}</div>
            <div className="text-[11px] lg:text-[12px] mt-2 font-semibold tracking-[0.08em] uppercase text-white/50">{label}</div>
            {description && <div className="text-[9px] lg:text-[10px] mt-1.5 text-white/25 leading-relaxed">{description}</div>}
        </div>
    );
};

// ─────────────────────────────────────────────
// Terminal Diagnostics — animated hero card
// ─────────────────────────────────────────────
const TerminalDiagnostics: React.FC = () => {
    const [step, setStep] = useState(0);
    const totalSteps = 10; // total animation beats

    useEffect(() => {
        // Staggered timeline: each step reveals a new line
        const delays = [600, 1200, 1800, 2600, 3200, 3800, 4400, 5000, 5800, 6800];
        const timers = delays.map((d, i) => setTimeout(() => setStep(i + 1), d));
        return () => timers.forEach(clearTimeout);
    }, []);

    const mono = { fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', ui-monospace, monospace" };
    const checkMark = <span className="text-teal-400">✓</span>;
    const warningMark = <span className="text-amber-400">⚠</span>;

    const scanLines = [
        { text: 'Tikrinami adresai ir butai ...', delay: 0 },
        { text: 'Analizuojami nuomininkai ...', delay: 1 },
        { text: 'Skaičiuojami skaitliukai ir rodmenys ...', delay: 2 },
        { text: 'Tikrinamos sąskaitos ir mokėjimai ...', delay: 3 },
    ];

    const stats = [
        { key: 'ADDRESSES', value: '4', color: 'text-teal-400' },
        { key: 'APARTMENTS', value: '18', color: 'text-teal-400' },
        { key: 'TENANTS', value: '15', color: 'text-teal-400' },
        { key: 'METERS', value: '47', color: 'text-teal-400' },
        { key: 'INVOICES', value: '142', color: 'text-teal-400' },
        { key: 'OCCUPANCY', value: '94%', color: 'text-emerald-400' },
        { key: 'OVERDUE', value: '2', color: 'text-amber-400' },
        { key: 'REVENUE_MONTHLY', value: '€4,280', color: 'text-teal-400' },
    ];

    return (
        <div className="relative rounded-2xl overflow-hidden backdrop-blur-xl" style={{
            background: 'rgba(10,15,18,0.92)',
            border: '1px solid rgba(255,255,255,0.10)',
            boxShadow: '0 25px 60px rgba(0,0,0,0.50), 0 8px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}>
            {/* ── macOS-style title bar ── */}
            <div className="flex items-center gap-2 px-4 py-2.5" style={{
                background: 'rgba(255,255,255,0.04)',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                    <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
                    <div className="w-3 h-3 rounded-full bg-[#28c840]" />
                </div>
                <span className="flex-1 text-center text-[11px] font-semibold text-white/40" style={mono}>
                    nuomoria — diagnostika
                </span>
            </div>

            {/* ── Terminal body ── */}
            <div className="px-4 py-3 lg:px-5 lg:py-4 space-y-2.5 lg:space-y-3 min-h-[280px] lg:min-h-[300px]" style={mono}>
                {/* Scan lines */}
                {scanLines.map((line, i) => (
                    <div
                        key={i}
                        className="flex items-center gap-2 text-[12px] transition-all duration-500"
                        style={{ opacity: step > i ? 1 : 0, transform: step > i ? 'translateY(0)' : 'translateY(6px)' }}
                    >
                        <span className="text-white/30">→</span>
                        <span className="text-white/70">{line.text}</span>
                        {step > i && <span className="ml-1">{checkMark}</span>}
                    </div>
                ))}

                {/* Divider */}
                {step >= 5 && (
                    <div className="border-t border-white/[0.08] my-3 transition-opacity duration-500" style={{ opacity: step >= 5 ? 1 : 0 }} />
                )}

                {/* Stats grid */}
                {step >= 5 && (
                    <div className="space-y-1.5">
                        {stats.map((s, i) => {
                            const statVisible = step >= 5 + Math.floor(i / 2);
                            return (
                                <div
                                    key={s.key}
                                    className="flex items-center justify-between text-[12px] transition-all duration-400"
                                    style={{ opacity: statVisible ? 1 : 0 }}
                                >
                                    <span className="text-white/35 tracking-wider">{s.key}</span>
                                    <span className={`font-bold tabular-nums ${s.color}`}>{s.value}</span>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Verdict */}
                {step >= totalSteps && (
                    <>
                        <div className="border-t border-white/[0.08] my-3" />
                        <div className="flex items-start gap-2 text-[12px]" style={{
                            opacity: 1,
                            animation: 'landingFadeIn 0.6s ease forwards',
                        }}>
                            <span className="text-teal-400 font-bold">$</span>
                            <span className="text-white/60">status:</span>
                            <span className="text-emerald-400 font-semibold">all systems operational</span>
                        </div>
                        {/* Blinking cursor */}
                        <div className="flex items-center gap-2 text-[12px] mt-1">
                            <span className="text-teal-400 font-bold">$</span>
                            <span className="w-2.5 h-4 bg-teal-400 animate-pulse rounded-sm" />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};


/**
 * Product Landing Page — comprehensive product introduction
 */
const LandingPage: React.FC = () => {
    const { isAuthenticated, loading, user } = useAuth();
    const featuresRef = useRef<HTMLDivElement>(null);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [pricingOpen, setPricingOpen] = useState(false);
    const [analyticsTab, setAnalyticsTab] = useState<'overview' | 'revenue' | 'time'>('overview');

    // Determine dashboard link for authenticated users
    const dashboardPath = !loading && isAuthenticated
        ? (user?.role === 'tenant' ? '/tenant' : '/dashboard')
        : null;

    const scrollToFeatures = () => {
        featuresRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // ───── DATA ─────
    const mainFeatures = [
        {
            icon: Receipt,
            title: 'Automatizuotos sąskaitos',
            description: 'Sąskaitos generuojamos automatiškai kiekvieną mėnesį pagal nuomos kainą ir komunalinius mokesčius. Sistema apskaičiuoja šildymą, vandenį, elektrą ir kitus mokesčius pagal skaitliukų rodmenis.',
            highlights: ['Automatinis generavimas', 'Komunalinių skaičiavimas', 'Mokėjimo sekimas'],
            color: 'from-teal-500/20 to-cyan-500/5',
            iconBg: 'bg-teal-500/15',
            iconColor: 'text-teal-400',
        },
        {
            icon: Building2,
            title: 'Turto valdymas',
            description: 'Pridėkite neribotą kiekį adresų ir butų. Kiekvienam butui nustatykite nuomos kainą, depozitą, plotą, aukštą ir kitas detales. Stebėkite turto būklę ir užimtumą.',
            highlights: ['Neriboti objektai', 'Detalūs aprašymai', 'Užimtumo stebėjimas'],
            color: 'from-blue-500/20 to-indigo-500/5',
            iconBg: 'bg-blue-500/15',
            iconColor: 'text-blue-400',
        },
        {
            icon: Gauge,
            title: 'Skaitliukų valdymas',
            description: 'Centralizuota sistema skaitliukų rodmenims stebėti. Nuomininkai gali patys įvesti rodmenis, o sistema automatiškai apskaičiuoja suvartojimą ir kainą.',
            highlights: ['Nuomininkų įvestis', 'Automatinis skaičiavimas', 'Istorijos peržiūra'],
            color: 'from-amber-500/20 to-orange-500/5',
            iconBg: 'bg-amber-500/15',
            iconColor: 'text-amber-400',
        },
        {
            icon: Users,
            title: 'Nuomininkų portalas',
            description: 'Kiekvienas nuomininkas turi asmeninę paskyrą, kurioje mato savo sąskaitas, sutarties informaciją, skaitliukų rodmenis ir gali bendrauti su nuomotoju.',
            highlights: ['Asmeninė paskyra', 'Sąskaitų peržiūra', 'Tiesioginė komunikacija'],
            color: 'from-purple-500/20 to-violet-500/5',
            iconBg: 'bg-purple-500/15',
            iconColor: 'text-purple-400',
        },
        {
            icon: BarChart3,
            title: 'Analitika ir ataskaitos',
            description: 'Stebėkite pajamas, vėluojančius mokėjimus ir turto efektyvumą. Vizualizuotos ataskaitos padės priimti geresnius sprendimus apie Jūsų nekilnojamąjį turtą.',
            highlights: ['Pajamų stebėjimas', 'Mokėjimų analizė', 'Efektyvumo rodikliai'],
            color: 'from-emerald-500/20 to-green-500/5',
            iconBg: 'bg-emerald-500/15',
            iconColor: 'text-emerald-400',
        },
        {
            icon: MessageSquare,
            title: 'Komunikacija',
            description: 'Integruota pranešimų sistema leidžia bendrauti su nuomininkais tiesiogiai platformoje. Pranešimai, priminimai ir atnaujinimai — viskas vienoje vietoje.',
            highlights: ['Tiesioginiai pranešimai', 'Automatiniai priminimai', 'Pranešimų istorija'],
            color: 'from-rose-500/20 to-pink-500/5',
            iconBg: 'bg-rose-500/15',
            iconColor: 'text-rose-400',
        },
    ];

    const landlordBenefits = [
        { icon: Clock, text: 'Sutaupykite valandas kiekvieną mėnesį automatizuodami sąskaitų kūrimą' },
        { icon: Eye, text: 'Matykite visų objektų būklę vienoje suvestinėje' },
        { icon: TrendingUp, text: 'Stebėkite pajamas ir vėluojančius mokėjimus realiu laiku' },
        { icon: Key, text: 'Pakvieskite nuomininkus su unikalių pakvietimo kodu' },
        { icon: Bell, text: 'Gaukite pranešimus apie mokėjimus ir skaitliukų rodmenis' },
        { icon: FileText, text: 'Valdykite sutartis, depozitus ir mokėjimo istoriją' },
    ];

    const tenantBenefits = [
        { icon: Wallet, text: 'Peržiūrėkite sąskaitas ir mokėjimo istoriją bet kada' },
        { icon: Gauge, text: 'Įveskite skaitliukų rodmenis tiesiai iš telefono' },
        { icon: Mail, text: 'Bendraukite su nuomotoju tiesiogiai platformoje' },
        { icon: CalendarDays, text: 'Matykite sutarties pradžią, pabaigą ir depozito informaciją' },
    ];

    const steps = [
        {
            number: '01',
            icon: UserPlus,
            title: 'Užsiregistruokite',
            description: 'Prisijunkite su Google paskyra per kelias sekundes. Papildomų slaptažodžių nereikia — registracija saugi ir greita.',
            detail: 'Saugi Google OAuth autentifikacija',
        },
        {
            number: '02',
            icon: Home,
            title: 'Pridėkite turtą',
            description: 'Įveskite savo nuomojamų būstų adresus ir butų informaciją. Nustatykite nuomos kainas, depozitus ir skaitliukus.',
            detail: 'Neriboti adresai ir butai',
        },
        {
            number: '03',
            icon: Key,
            title: 'Pakvieskite nuomininkus',
            description: 'Sugeneruokite unikalų pakvietimo kodą kiekvienam nuomininkui. Jie prisiregistruos ir iš karto matys savo informaciją.',
            detail: 'Unikalūs pakvietimo kodai',
        },
        {
            number: '04',
            icon: Settings2,
            title: 'Valdykite viską',
            description: 'Kurkite sąskaitas, stebėkite mokėjimus, peržiūrėkite skaitliukų rodmenis ir bendraukite su nuomininkais — viskas vienoje vietoje.',
            detail: 'Pilnas valdymo centras',
        },
    ];

    const faqs = [
        {
            q: 'Ar Nuomoria tikrai nemokama? Kokia yra kainodara?',
            a: 'Taip, Nuomoria yra 100% nemokama — be paslėptų mokesčių, be prenumeratos, be limitų. Visos funkcijos prieinamos nuo pat pirmosios dienos. Ateityje gali atsirasti premium planas su papildomomis funkcijomis, bet dabartinės galimybės liks nemokamos visam laikui.',
        },
        {
            q: 'Valdau kelis daugiabučius — ar galiu viską matyti vienoje vietoje?',
            a: 'Taip. Galite pridėti neribotą kiekį adresų ir kiekviename adrese — neribotą kiekį butų. Dashboard\'e matysite visų objektų bendrą vaizdą: pajamas, užimtumą, vėluojančius mokėjimus ir skaitliukų būseną.',
        },
        {
            q: 'Kaip nuomininkas prisijungia? Ar jam reikia instaliuoti programėlę?',
            a: 'Ne, jokios programėlės nereikia. Jūs sugeneruojate unikalų pakvietimo kodą ir jį perduodate nuomininkui. Nuomininkas prisijungia su Google paskyra, įveda kodą ir iš karto mato savo butą, sąskaitas bei gali siųsti skaitliukų rodmenis tiesiai iš naršyklės.',
        },
        {
            q: 'Kaip veikia skaitliukų rodmenų surinkimas?',
            a: 'Nuomininkas pats įveda rodmenis per savo paskyrą — jums nereikia skambinti ar siųsti SMS. Sistema automatiškai apskaičiuoja suvartojimą, patikrina ar rodmenys logiški, ir paruošia duomenis sąskaitos generavimui.',
        },
        {
            q: 'Ar galiu generuoti sąskaitas automatiškai?',
            a: 'Taip. Sistema sujungia mėnesinę nuomos kainą su komunaliniais mokesčiais pagal skaitliukų rodmenis. Jūs galite peržiūrėti sugeneruotą sąskaitą, koreguoti jei reikia, ir siųsti nuomininkui. Visa istorija saugoma automatiškai.',
        },
        {
            q: 'Ar mano ir nuomininkų duomenys saugūs?',
            a: 'Absoliučiai. Naudojame Google OAuth autentifikaciją ir Supabase infrastruktūrą su eilučių lygio saugumu (RLS) — kiekvienas vartotojas mato tik savo duomenis. Jokių slaptažodžių — tik saugi Google paskyra.',
        },
        {
            q: 'Ar sistema veikia telefone?',
            a: 'Taip, Nuomoria pilnai pritaikyta mobiliesiems įrenginiams. Tiek nuomotojas, tiek nuomininkas gali naudotis visomis funkcijomis iš telefono naršyklės — be jokios papildomos programėlės.',
        },
        {
            q: 'Ką daryti jei turiu klausimų ar reikia pagalbos?',
            a: 'Sistemoje rasite išsamų pagalbos centrą su instrukcijomis kiekvienam žingsniui. Taip pat galite susisiekti su mumis tiesiogiai — atsakysime per 24 valandas.',
        },
    ];

    return (
        <div className="relative min-h-screen bg-[#060A0C] text-white overflow-x-hidden">

            {/* ═══════════════════════════════════════════════
          NAVIGATION
      ═══════════════════════════════════════════════ */}
            <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
                style={{
                    backgroundColor: 'rgba(6,10,12,0.85)',
                    backdropFilter: 'blur(12px)',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}
            >
                <div className="max-w-[1200px] mx-auto px-6 md:px-12 h-16 flex items-center justify-between">
                    <img src={logoBlack} alt="Nuomoria" className="h-10 md:h-11 w-auto object-contain" />

                    {/* Desktop nav links */}
                    <div className="hidden md:flex items-center gap-6 lg:gap-8">
                        <button onClick={scrollToFeatures} className="text-[13px] font-medium transition-colors hover:text-white" style={{ color: 'rgba(255,255,255,0.55)' }}>
                            Galimybės
                        </button>
                        <a href="#how-it-works" className="text-[13px] font-medium transition-colors hover:text-white" style={{ color: 'rgba(255,255,255,0.55)' }}>
                            Kaip veikia
                        </a>
                        <a href="#faq" className="text-[13px] font-medium transition-colors hover:text-white" style={{ color: 'rgba(255,255,255,0.55)' }}>
                            D.U.K.
                        </a>
                        <button onClick={() => setPricingOpen(true)} className="text-[13px] font-medium transition-colors hover:text-white" style={{ color: 'rgba(255,255,255,0.55)' }}>
                            Kainos
                        </button>
                        <Link to="/pagalba" className="text-[13px] font-medium transition-colors hover:text-white" style={{ color: 'rgba(255,255,255,0.55)' }}>
                            Pagalba
                        </Link>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link
                            to="/login"
                            className="px-5 py-2 rounded-lg text-[13px] font-semibold transition-all duration-200 active:scale-[0.97]"
                            style={{
                                background: 'linear-gradient(135deg, #2F8481 0%, #3AB09E 100%)',
                                color: '#fff',
                            }}
                        >
                            Prisijungti
                        </Link>
                    </div>
                </div>
            </nav>

            {/* ═══════════════════════════════════════════════
          HERO SECTION — compact split layout
      ═══════════════════════════════════════════════ */}
            <section className="relative pt-16 pb-8 md:pb-0 md:min-h-[80vh] flex flex-col">
                {/* Background image — full view */}
                <div className="absolute inset-0 overflow-hidden">
                    <img src="/images/ImageIntroduction.webp" alt="" className="w-full h-full object-cover object-bottom" />
                </div>
                {/* Dark overlay for readability */}
                <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(3,6,8,0.78) 0%, rgba(3,6,8,0.55) 40%, rgba(3,6,8,0.92) 100%)' }} />
                {/* Subtle teal glow */}
                <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 25% 50%, rgba(16,185,170,0.06) 0%, transparent 50%)' }} />

                <div className="relative z-10 flex-1 flex items-center px-6 md:px-12 lg:px-16 py-12 md:py-0">
                    <div className="max-w-[1200px] mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10 items-center landing-fade-in">

                        {/* LEFT — Headline & CTA */}
                        <div>
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6 text-[11px] font-medium"
                                style={{ backgroundColor: 'rgba(47,132,129,0.12)', border: '1px solid rgba(47,132,129,0.22)', color: 'rgba(58,176,158,0.95)' }}
                            >
                                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                                Nuomos valdymo platforma Lietuvai
                            </div>

                            <h1 className="text-[32px] md:text-[40px] lg:text-[50px] font-extrabold leading-[1.10] tracking-[-0.03em] mb-5 font-display">
                                Viskas ko reikia{' '}
                                <span className="landing-gradient-text font-accent italic">nuomos valdymui </span>
                                {' '}vienoje vietoje
                            </h1>

                            <p className="text-[14px] md:text-[15px] lg:text-[16px] leading-[1.75] mb-8 max-w-[480px]" style={{ color: 'rgba(255,255,255,0.60)' }}>
                                Automatizuokite sąskaitas, stebėkite skaitliukus, valdykite nuomininkus ir analizuokite pajamas — nuo pirmo buto iki didelio portfelio.
                            </p>

                            <div className="flex flex-col md:flex-row items-start gap-3 mb-5">
                                <Link to="/login"
                                    className="group inline-flex items-center gap-2.5 px-7 py-3 rounded-xl text-[14px] font-bold transition-all duration-200 active:scale-[0.97] shadow-[0_8px_32px_rgba(47,132,129,0.25)]"
                                    style={{ background: 'linear-gradient(135deg, #2F8481 0%, #3AB09E 100%)' }}
                                >
                                    Pradėti nemokamai
                                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                                </Link>
                                <button onClick={scrollToFeatures}
                                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-[13px] font-medium transition-all duration-200 hover:bg-white/[0.08]"
                                    style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.70)' }}
                                >
                                    Sužinoti daugiau
                                    <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            <p className="text-[11px] flex items-center gap-1.5" style={{ color: 'rgba(255,255,255,0.30)' }}>
                                <Lock className="w-3 h-3" />
                                Nemokamai · Be kreditinės kortelės · Saugi Google registracija
                            </p>
                        </div>

                        <div className="relative flex items-center justify-center">
                            <div className="relative w-full max-w-[460px] xl:max-w-[520px] landing-float-1" style={{
                                opacity: 0,
                                animation: 'landingFadeIn 1s cubic-bezier(0.16,1,0.3,1) 0.4s forwards',
                            }}>
                                {/* Ambient glow */}
                                <div className="absolute -inset-8 rounded-3xl blur-3xl" style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(47,132,129,0.14) 0%, transparent 65%)' }} />

                                {/* ══ Terminal Card ══ */}
                                <TerminalDiagnostics />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════
          STATS BAR
      ═══════════════════════════════════════════════ */}
            <section className="relative py-14 lg:py-16" style={{ background: 'linear-gradient(180deg, rgba(47,132,129,0.04) 0%, transparent 100%)' }}>
                <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent 5%, rgba(47,132,129,0.15) 50%, transparent 95%)' }} />
                <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent 5%, rgba(47,132,129,0.08) 50%, transparent 95%)' }} />
                <div className="max-w-[900px] mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                    <AnimatedStat value="100%" label="Nemokama" description="Visos funkcijos be mokesčių" delay={0} />
                    <AnimatedStat value="24/7" label="Prieiga" description="Valdykite bet kada, bet kur" delay={0.1} />
                    <AnimatedStat value="∞" label="Objektų" description="Neribotas butų skaičius" delay={0.2} />
                    <AnimatedStat value="< 1 min" label="Registracija" description="Prisijunkite su Google" delay={0.3} />
                </div>
            </section>

            {/* ═══════════════════════════════════════════════
          PROBLEM + ANALYTICS — Combined Row
      ═══════════════════════════════════════════════ */}
            <section className="py-16 lg:py-24 px-6 lg:px-16">
                <div className="max-w-[1200px] mx-auto">
                    <RevealSection className="text-center mb-12">
                        <p className="text-[12px] font-semibold tracking-[0.15em] uppercase mb-3" style={{ color: 'rgba(58,176,158,0.80)' }}>
                            Problema ir sprendimas
                        </p>
                        <h2 className="text-[28px] lg:text-[40px] font-bold tracking-[-0.02em] mb-4 font-display">
                            Nuomos valdymas neturi būti sudėtingas
                        </h2>
                        <p className="text-[14px] lg:text-[16px] leading-[1.8] max-w-[650px] mx-auto" style={{ color: 'rgba(255,255,255,0.50)' }}>
                            Excel lentelės, SMS žinutės nuomininkams, rankiniai skaičiavimai — tai atima brangų laiką.
                            Nuomoria viską centralizuoja ir automatizuoja.
                        </p>
                    </RevealSection>

                    {/* 2-column grid: Problem cards left, Analytics right */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start">
                        {/* LEFT — Before / After cards */}
                        <div className="space-y-5">
                            <RevealSection delay={0.1}>
                                <div className="rounded-2xl p-6 h-full relative overflow-hidden" style={{ backgroundColor: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.10)' }}>
                                    <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ background: 'linear-gradient(90deg, rgba(239,68,68,0.4) 0%, rgba(239,68,68,0.1) 100%)' }} />
                                    <div className="text-[11px] font-bold tracking-[0.1em] uppercase mb-4 text-red-400/80">Be Nuomoria</div>
                                    <ul className="space-y-3">
                                        {[
                                            'Sąskaitas reikia kurti rankiniu būdu kiekvieną mėnesį',
                                            'Skaitliukų rodmenys ateina SMS ar žodžiu',
                                            'Komunaliniai skaičiuojami Excel\'e',
                                            'Mokėjimų sekimas — chaotiškas',
                                            'Nuomininkai skambina dėl kiekvienos smulkmenos',
                                        ].map((item) => (
                                            <li key={item} className="flex items-start gap-2.5 text-[12px] leading-[1.6]" style={{ color: 'rgba(255,255,255,0.50)' }}>
                                                <div className="w-[18px] h-[18px] rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                    <Minus className="w-2.5 h-2.5 text-red-400" />
                                                </div>
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </RevealSection>
                            <RevealSection delay={0.2}>
                                <div className="rounded-2xl p-6 h-full relative overflow-hidden" style={{ backgroundColor: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.12)' }}>
                                    <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ background: 'linear-gradient(90deg, rgba(16,185,129,0.4) 0%, rgba(16,185,129,0.1) 100%)' }} />
                                    <div className="text-[11px] font-bold tracking-[0.1em] uppercase mb-4 text-emerald-400/80">Su Nuomoria</div>
                                    <ul className="space-y-3">
                                        {[
                                            'Sąskaitos generuojamos automatiškai pagal parametrus',
                                            'Nuomininkai patys įveda rodmenis savo paskyroje',
                                            'Sistema apskaičiuoja komunalinius automatiškai',
                                            'Visi mokėjimai matomi suvestinėje su būsenomis',
                                            'Integruota komunikacijos sistema',
                                        ].map((item) => (
                                            <li key={item} className="flex items-start gap-2.5 text-[12px] leading-[1.6]" style={{ color: 'rgba(255,255,255,0.55)' }}>
                                                <div className="w-[18px] h-[18px] rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                    <Check className="w-2.5 h-2.5 text-emerald-400" />
                                                </div>
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </RevealSection>
                        </div>

                        {/* RIGHT — Analytics Panel */}
                        <RevealSection delay={0.15}>
                            <div className="relative rounded-2xl overflow-hidden backdrop-blur-xl" style={{
                                background: 'rgba(13,20,24,0.82)',
                                border: '1px solid rgba(255,255,255,0.12)',
                                boxShadow: '0 25px 60px rgba(0,0,0,0.45), 0 8px 20px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.06)',
                            }}>
                                {/* Header */}
                                <div className="flex items-center justify-between px-5 py-3" style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                                        <span className="text-[12px] font-bold text-white/90" style={{ fontFamily: 'Outfit, sans-serif' }}>Nuomoria Analytics</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {(['overview', 'revenue', 'time'] as const).map(tab => (
                                            <button
                                                key={tab}
                                                onClick={() => setAnalyticsTab(tab)}
                                                className={`px-3 py-1 rounded-md text-[9px] font-semibold transition-all duration-200 cursor-pointer ${analyticsTab === tab ? 'text-teal-300' : 'text-white/40 hover:text-white/60'}`}
                                                style={analyticsTab === tab ? { background: 'rgba(58,176,158,0.18)' } : {}}
                                            >
                                                {tab === 'overview' ? 'Apžvalga' : tab === 'revenue' ? 'Pajamos' : 'Laikas'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div style={{ minHeight: '340px' }}>
                                    {/* TAB: Apžvalga */}
                                    {analyticsTab === 'overview' && (
                                        <div style={{ animation: 'landingFadeIn 0.3s ease forwards' }}>
                                            <div className="grid grid-cols-3 gap-2.5 px-4 pt-4 pb-3">
                                                <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}>
                                                    <div className="text-[8px] font-medium text-white/50 mb-1.5" style={{ fontFamily: 'Outfit' }}>Pajamos / mėn.</div>
                                                    <div className="flex items-baseline gap-1.5">
                                                        <span className="text-[20px] font-extrabold text-white tabular-nums" style={{ fontFamily: 'Outfit', letterSpacing: '-0.02em' }}>€4,280</span>
                                                        <span className="text-[9px] font-semibold text-teal-400">+8%</span>
                                                    </div>
                                                    <svg viewBox="0 0 120 20" className="w-full mt-1.5 opacity-50"><polyline points="0,14 15,12 30,10 45,13 60,9 75,6 90,4 105,2 120,0" stroke="#3AB09E" strokeWidth="1.5" fill="none" strokeLinecap="round" /></svg>
                                                </div>
                                                <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.04)' }}>
                                                    <div className="text-[8px] font-medium text-white/50 mb-1.5" style={{ fontFamily: 'Outfit' }}>Užimtumas</div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[20px] font-extrabold text-white" style={{ fontFamily: 'Outfit', letterSpacing: '-0.02em' }}>94%</span>
                                                        <svg viewBox="0 0 36 36" className="w-9 h-9"><circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3.5" /><circle cx="18" cy="18" r="14" fill="none" stroke="#3AB09E" strokeWidth="3.5" strokeDasharray="82.6 87.96" strokeLinecap="round" transform="rotate(-90 18 18)" /></svg>
                                                    </div>
                                                </div>
                                                <div className="rounded-xl p-3" style={{ background: 'rgba(58,176,158,0.10)', border: '1px solid rgba(58,176,158,0.20)' }}>
                                                    <div className="text-[8px] font-medium text-white/50 mb-1.5" style={{ fontFamily: 'Outfit' }}>Sutaupytas laikas</div>
                                                    <div className="flex items-baseline gap-1.5">
                                                        <span className="text-[20px] font-extrabold text-teal-400" style={{ fontFamily: 'Outfit', letterSpacing: '-0.02em' }}>75%</span>
                                                    </div>
                                                    <div className="text-[7px] font-medium text-white/30 mt-0.5" style={{ fontFamily: 'Outfit' }}>val./savaitę: 8h → 2h</div>
                                                </div>
                                            </div>
                                            <div className="px-4 pb-3">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-[9px] font-semibold text-white/60" style={{ fontFamily: 'Outfit' }}>Valandos per savaitę</span>
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-sm" style={{ background: 'rgba(239,68,68,0.55)' }} /><span className="text-[7px] text-white/40" style={{ fontFamily: 'Outfit' }}>Rankinis</span></div>
                                                        <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-sm bg-teal-500" /><span className="text-[7px] text-white/40" style={{ fontFamily: 'Outfit' }}>Nuomoria</span></div>
                                                    </div>
                                                </div>
                                                <svg viewBox="0 0 480 200" className="w-full" preserveAspectRatio="none">
                                                    {[0, 50, 100, 150].map(y => (<line key={y} x1="0" y1={y} x2="480" y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />))}
                                                    {[{ x: 10, r: 150, t: 140 }, { x: 68, r: 148, t: 110 }, { x: 126, r: 145, t: 80 }, { x: 184, r: 150, t: 55 }, { x: 242, r: 148, t: 40 }, { x: 300, r: 145, t: 30 }, { x: 358, r: 150, t: 24 }, { x: 416, r: 148, t: 20 }].map((b, i) => (
                                                        <g key={i}><rect x={b.x} y={190 - b.r} width="22" height={b.r} rx="3" fill="rgba(239,68,68,0.45)" /><rect x={b.x + 26} y={190 - b.t} width="22" height={b.t} rx="3" fill="#3AB09E" /></g>
                                                    ))}
                                                    <path d="M37,50 C96,80 156,110 216,135 C276,150 336,160 396,166 C436,168 456,170 469,170" stroke="#3AB09E" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeDasharray="5 4" opacity="0.5" />
                                                </svg>
                                                <div className="flex justify-between px-1 mt-1">
                                                    {['Sau', 'Vas', 'Kov', 'Bal', 'Geg', 'Bir', 'Lie', 'Rgp'].map(m => (<span key={m} className="text-[7px] text-white/30 w-[50px] text-center" style={{ fontFamily: 'Outfit' }}>{m}</span>))}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* TAB: Pajamos */}
                                    {analyticsTab === 'revenue' && (
                                        <div style={{ animation: 'landingFadeIn 0.3s ease forwards' }}>
                                            <div className="grid grid-cols-3 gap-2.5 px-4 pt-4 pb-3">
                                                <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.04)' }}>
                                                    <div className="text-[8px] font-medium text-white/50 mb-1.5" style={{ fontFamily: 'Outfit' }}>Metinės pajamos</div>
                                                    <div className="flex items-baseline gap-1.5">
                                                        <span className="text-[20px] font-extrabold text-white tabular-nums" style={{ fontFamily: 'Outfit', letterSpacing: '-0.02em' }}>€51,360</span>
                                                    </div>
                                                    <div className="text-[7px] font-medium text-teal-400/60 mt-0.5" style={{ fontFamily: 'Outfit' }}>12 mėn. prognozė</div>
                                                </div>
                                                <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.04)' }}>
                                                    <div className="text-[8px] font-medium text-white/50 mb-1.5" style={{ fontFamily: 'Outfit' }}>Vid. nuoma</div>
                                                    <div className="flex items-baseline gap-1.5">
                                                        <span className="text-[20px] font-extrabold text-white tabular-nums" style={{ fontFamily: 'Outfit', letterSpacing: '-0.02em' }}>€535</span>
                                                        <span className="text-[9px] font-semibold text-teal-400">/ butas</span>
                                                    </div>
                                                </div>
                                                <div className="rounded-xl p-3" style={{ background: 'rgba(58,176,158,0.10)', border: '1px solid rgba(58,176,158,0.20)' }}>
                                                    <div className="text-[8px] font-medium text-white/50 mb-1.5" style={{ fontFamily: 'Outfit' }}>Surinkta</div>
                                                    <div className="flex items-baseline gap-1.5">
                                                        <span className="text-[20px] font-extrabold text-teal-400" style={{ fontFamily: 'Outfit', letterSpacing: '-0.02em' }}>97%</span>
                                                    </div>
                                                    <div className="text-[7px] font-medium text-white/30 mt-0.5" style={{ fontFamily: 'Outfit' }}>mokėjimų laiku</div>
                                                </div>
                                            </div>
                                            <div className="px-4 pb-3">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-[9px] font-semibold text-white/60" style={{ fontFamily: 'Outfit' }}>Pajamų dinamika (€)</span>
                                                </div>
                                                <svg viewBox="0 0 480 200" className="w-full" preserveAspectRatio="none">
                                                    {[0, 50, 100, 150].map(y => (<line key={y} x1="0" y1={y} x2="480" y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />))}
                                                    <defs><linearGradient id="revGrad2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3AB09E" stopOpacity="0.25" /><stop offset="100%" stopColor="#3AB09E" stopOpacity="0.02" /></linearGradient></defs>
                                                    <path d="M0,160 C40,155 80,140 120,132 C160,125 200,118 240,105 C280,92 320,80 360,72 C400,65 440,55 480,48 L480,200 L0,200 Z" fill="url(#revGrad2)" />
                                                    <path d="M0,160 C40,155 80,140 120,132 C160,125 200,118 240,105 C280,92 320,80 360,72 C400,65 440,55 480,48" stroke="#3AB09E" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                                                    {[{ x: 0, y: 160 }, { x: 120, y: 132 }, { x: 240, y: 105 }, { x: 360, y: 72 }, { x: 480, y: 48 }].map((p, i) => (
                                                        <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="rgba(20,30,35,0.8)" stroke="#3AB09E" strokeWidth="2" />
                                                    ))}
                                                </svg>
                                                <div className="flex justify-between px-1 mt-1">
                                                    {['€3,200', '€3,800', '€4,100', '€4,280', '€4,650'].map((v, i) => (<span key={i} className="text-[7px] text-teal-400/40 tabular-nums" style={{ fontFamily: 'Outfit' }}>{v}</span>))}
                                                </div>
                                                <div className="flex justify-between px-1 mt-0.5">
                                                    {['Bal', 'Bir', 'Rgp', 'Spa', 'Gru'].map(m => (<span key={m} className="text-[7px] text-white/30" style={{ fontFamily: 'Outfit' }}>{m}</span>))}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* TAB: Laikas */}
                                    {analyticsTab === 'time' && (
                                        <div style={{ animation: 'landingFadeIn 0.3s ease forwards' }}>
                                            <div className="grid grid-cols-3 gap-2.5 px-4 pt-4 pb-3">
                                                <div className="rounded-xl p-3" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)' }}>
                                                    <div className="text-[8px] font-medium text-white/50 mb-1.5" style={{ fontFamily: 'Outfit' }}>Be Nuomoria</div>
                                                    <div className="flex items-baseline gap-1.5">
                                                        <span className="text-[20px] font-extrabold" style={{ fontFamily: 'Outfit', letterSpacing: '-0.02em', color: 'rgba(239,68,68,0.7)' }}>8.5h</span>
                                                        <span className="text-[8px] text-white/20" style={{ fontFamily: 'Outfit' }}>/sav.</span>
                                                    </div>
                                                </div>
                                                <div className="rounded-xl p-3" style={{ background: 'rgba(58,176,158,0.05)', border: '1px solid rgba(58,176,158,0.12)' }}>
                                                    <div className="text-[8px] font-medium text-white/50 mb-1.5" style={{ fontFamily: 'Outfit' }}>Su Nuomoria</div>
                                                    <div className="flex items-baseline gap-1.5">
                                                        <span className="text-[20px] font-extrabold text-teal-400" style={{ fontFamily: 'Outfit', letterSpacing: '-0.02em' }}>2.1h</span>
                                                        <span className="text-[8px] text-white/20" style={{ fontFamily: 'Outfit' }}>/sav.</span>
                                                    </div>
                                                </div>
                                                <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.04)' }}>
                                                    <div className="text-[8px] font-medium text-white/50 mb-1.5" style={{ fontFamily: 'Outfit' }}>Sutaupyta</div>
                                                    <div className="flex items-baseline gap-1.5">
                                                        <span className="text-[20px] font-extrabold text-white" style={{ fontFamily: 'Outfit', letterSpacing: '-0.02em' }}>6.4h</span>
                                                        <span className="text-[9px] font-semibold text-teal-400">−75%</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="px-4 pb-3">
                                                <div className="flex items-center justify-between mb-3">
                                                    <span className="text-[9px] font-semibold text-white/50" style={{ fontFamily: 'Outfit' }}>Valandos per savaitę pagal užduotį</span>
                                                </div>
                                                <div className="space-y-2.5">
                                                    {[
                                                        { task: 'Sąskaitų generavimas', beforeH: '2.5h', afterH: '0.2h', before: 85, after: 7 },
                                                        { task: 'Skaitiklių surinkimas', beforeH: '1.8h', afterH: '0.5h', before: 62, after: 17 },
                                                        { task: 'Mokėjimų sekimas', beforeH: '1.5h', afterH: '0.3h', before: 52, after: 10 },
                                                        { task: 'Komunikacija', beforeH: '1.5h', afterH: '0.6h', before: 52, after: 21 },
                                                        { task: 'Dokumentų tvarkymas', beforeH: '1.2h', afterH: '0.5h', before: 41, after: 17 },
                                                    ].map((item, i) => (
                                                        <div key={i}>
                                                            <div className="flex items-center justify-between mb-1">
                                                                <span className="text-[8px] text-white/50" style={{ fontFamily: 'Outfit' }}>{item.task}</span>
                                                                <span className="text-[7px] text-white/30 tabular-nums" style={{ fontFamily: 'Outfit' }}>{item.beforeH} → <span className="text-teal-400">{item.afterH}</span></span>
                                                            </div>
                                                            <div className="flex gap-1 h-[6px]">
                                                                <div className="rounded-full" style={{ width: `${item.before}%`, background: 'rgba(239,68,68,0.35)', transition: 'width 0.5s' }} />
                                                                <div className="rounded-full bg-teal-500" style={{ width: `${item.after}%`, transition: 'width 0.5s' }} />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="flex items-center gap-4 mt-3">
                                                    <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(239,68,68,0.45)' }} /><span className="text-[7px] text-white/35" style={{ fontFamily: 'Outfit' }}>Rankinis</span></div>
                                                    <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-teal-500" /><span className="text-[7px] text-white/35" style={{ fontFamily: 'Outfit' }}>Nuomoria</span></div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Bottom insight bar */}
                                <div className="px-5 py-2.5" style={{ background: 'rgba(58,176,158,0.06)', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                                    <p className="text-[8px] text-white/40 text-center" style={{ fontFamily: 'Outfit' }}>
                                        {analyticsTab === 'overview' && <>Automatinės sąskaitos · Skaitiklių surinkimas vienu paspaudimu · <span className="text-teal-400 font-semibold">Viskas vienoje vietoje</span></>}
                                        {analyticsTab === 'revenue' && <>Mokėjimų priminimai · Vėlavimo delspinigiai · <span className="text-teal-400 font-semibold">Niekada nepraleiskite mokėjimo</span></>}
                                        {analyticsTab === 'time' && <>Nuomininkai patys siunčia rodmenis · Sąskaitos generuojamos automatiškai · <span className="text-teal-400 font-semibold">Jūs tik stebite</span></>}
                                    </p>
                                </div>
                            </div>
                        </RevealSection>
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════
          FEATURES DEEP DIVE
      ═══════════════════════════════════════════════ */}
            <section ref={featuresRef} id="features" className="relative py-20 lg:py-28 px-6 lg:px-16">
                <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 20%, rgba(47,132,129,0.05) 0%, transparent 65%)' }} />

                <div className="relative max-w-[1100px] mx-auto">
                    <RevealSection className="text-center mb-16">
                        <p className="text-[12px] font-semibold tracking-[0.15em] uppercase mb-3" style={{ color: 'rgba(58,176,158,0.80)' }}>
                            Galimybės
                        </p>
                        <h2 className="text-[28px] lg:text-[40px] font-bold tracking-[-0.02em] mb-4 font-display">
                            Visi įrankiai vienoje platformoje
                        </h2>
                        <p className="text-[14px] lg:text-[16px] max-w-[550px] mx-auto" style={{ color: 'rgba(255,255,255,0.50)' }}>
                            Nuo sąskaitų kūrimo iki analitikos — Nuomoria turi viską, ko reikia profesionaliam nuomos valdymui.
                        </p>
                    </RevealSection>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">
                        {mainFeatures.map((feature, i) => (
                            <RevealSection key={feature.title} delay={i * 0.08}>
                                <div className="group relative rounded-2xl p-6 lg:p-7 transition-all duration-300 hover:translate-y-[-2px] hover:shadow-[0_8px_32px_rgba(0,0,0,0.15)] h-full"
                                    style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                                >
                                    <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                                    <div className="relative">
                                        <div className={`w-11 h-11 rounded-xl ${feature.iconBg} border border-white/[0.10] flex items-center justify-center mb-4`}>
                                            <feature.icon className={`w-5 h-5 ${feature.iconColor}`} />
                                        </div>
                                        <h3 className="text-[15px] lg:text-[16px] font-bold mb-2.5">{feature.title}</h3>
                                        <p className="text-[12px] lg:text-[13px] leading-[1.75] mb-4" style={{ color: 'rgba(255,255,255,0.50)' }}>
                                            {feature.description}
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {feature.highlights.map((h) => (
                                                <span key={h} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-medium"
                                                    style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.50)' }}
                                                >
                                                    <Check className="w-2.5 h-2.5 text-teal-500/70" />
                                                    {h}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </RevealSection>
                        ))}
                    </div>
                </div>
            </section >

            {/* ═══════════════════════════════════════════════
          FOR LANDLORDS & TENANTS
      ═══════════════════════════════════════════════ */}
            < section className="py-20 lg:py-28 px-6 lg:px-16 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                <div className="max-w-[1100px] mx-auto">
                    <RevealSection className="text-center mb-16">
                        <p className="text-[12px] font-semibold tracking-[0.15em] uppercase mb-3" style={{ color: 'rgba(58,176,158,0.80)' }}>
                            Kam skirta
                        </p>
                        <h2 className="text-[28px] lg:text-[40px] font-bold tracking-[-0.02em] mb-4 font-display">
                            Tinka ir nuomotojams, ir nuomininkams
                        </h2>
                    </RevealSection>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                        {/* Landlord */}
                        <RevealSection delay={0.1}>
                            <div className="rounded-2xl p-7 lg:p-8 h-full" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 rounded-xl bg-teal-500/15 flex items-center justify-center">
                                        <Building2 className="w-5 h-5 text-teal-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-[16px] font-bold">Nuomotojams</h3>
                                        <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.40)' }}>Valdykite nuomą profesionaliai</p>
                                    </div>
                                </div>
                                <ul className="space-y-3.5">
                                    {landlordBenefits.map(({ icon: Icon, text }) => (
                                        <li key={text} className="flex items-start gap-3">
                                            <div className="w-7 h-7 rounded-lg bg-white/[0.05] flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <Icon className="w-3.5 h-3.5 text-teal-400/70" />
                                            </div>
                                            <span className="text-[13px] leading-[1.6]" style={{ color: 'rgba(255,255,255,0.55)' }}>{text}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </RevealSection>

                        {/* Tenant */}
                        <RevealSection delay={0.2}>
                            <div className="rounded-2xl p-7 lg:p-8 h-full" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center">
                                        <Users className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-[16px] font-bold">Nuomininkams</h3>
                                        <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.40)' }}>Visos detalės vienoje vietoje</p>
                                    </div>
                                </div>
                                <ul className="space-y-3.5">
                                    {tenantBenefits.map(({ icon: Icon, text }) => (
                                        <li key={text} className="flex items-start gap-3">
                                            <div className="w-7 h-7 rounded-lg bg-white/[0.05] flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <Icon className="w-3.5 h-3.5 text-blue-400/70" />
                                            </div>
                                            <span className="text-[13px] leading-[1.6]" style={{ color: 'rgba(255,255,255,0.55)' }}>{text}</span>
                                        </li>
                                    ))}
                                </ul>

                                <div className="mt-6 p-4 rounded-xl" style={{ backgroundColor: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.10)' }}>
                                    <p className="text-[12px] leading-[1.6]" style={{ color: 'rgba(255,255,255,0.45)' }}>
                                        <strong className="text-blue-400/80">Kaip prisijungti?</strong> Nuomotojas sugeneruoja jums unikalų pakvietimo kodą. Registruokitės su Google paskyra, įveskite kodą — ir viskas paruošta.
                                    </p>
                                </div>
                            </div>
                        </RevealSection>
                    </div>
                </div>
            </section >

            {/* ═══════════════════════════════════════════════
          HOW IT WORKS
      ═══════════════════════════════════════════════ */}
            < section id="how-it-works" className="relative py-20 lg:py-28 px-6 lg:px-16 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                <div className="max-w-[1000px] mx-auto">
                    <RevealSection className="text-center mb-16">
                        <p className="text-[12px] font-semibold tracking-[0.15em] uppercase mb-3" style={{ color: 'rgba(58,176,158,0.80)' }}>
                            Kaip tai veikia
                        </p>
                        <h2 className="text-[28px] lg:text-[40px] font-bold tracking-[-0.02em] mb-4 font-display">
                            Pradėkite per 4 paprastus žingsnius
                        </h2>
                        <p className="text-[14px] lg:text-[16px] max-w-[480px] mx-auto" style={{ color: 'rgba(255,255,255,0.45)' }}>
                            Nuo registracijos iki pilno valdymo — užtrunka mažiau nei 5 minutes.
                        </p>
                    </RevealSection>

                    <div className="space-y-5 lg:space-y-0 lg:grid lg:grid-cols-4 lg:gap-5">
                        {steps.map((step, i) => (
                            <RevealSection key={step.number} delay={i * 0.12}>
                                <div className="relative text-center lg:text-left">

                                    <div className="inline-flex lg:flex items-center justify-center w-14 h-14 rounded-2xl mb-4 relative shadow-[0_0_20px_rgba(47,132,129,0.08)]"
                                        style={{ background: 'linear-gradient(135deg, rgba(47,132,129,0.15) 0%, rgba(47,132,129,0.05) 100%)', border: '1px solid rgba(47,132,129,0.20)' }}
                                    >
                                        <step.icon className="w-5 h-5 text-teal-400" />
                                        <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-teal-500 text-[9px] font-bold flex items-center justify-center">{step.number}</span>
                                    </div>

                                    <h3 className="text-[15px] font-bold mb-2">{step.title}</h3>
                                    <p className="text-[12px] leading-[1.7] mb-3" style={{ color: 'rgba(255,255,255,0.45)' }}>
                                        {step.description}
                                    </p>
                                    <span className="inline-flex items-center gap-1.5 text-[10px] font-medium px-2.5 py-1 rounded-md"
                                        style={{ backgroundColor: 'rgba(47,132,129,0.10)', color: 'rgba(58,176,158,0.75)' }}
                                    >
                                        <Check className="w-2.5 h-2.5" />
                                        {step.detail}
                                    </span>
                                </div>
                            </RevealSection>
                        ))}
                    </div>
                </div>
            </section >

            {/* ═══════════════════════════════════════════════
          SECURITY & TRUST
      ═══════════════════════════════════════════════ */}
            < section className="py-16 lg:py-20 px-6 lg:px-16 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                <div className="max-w-[900px] mx-auto">
                    <RevealSection>
                        <div className="rounded-2xl p-7 lg:p-10 text-center relative overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent 10%, rgba(47,132,129,0.20) 50%, transparent 90%)' }} />
                            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/15 flex items-center justify-center mx-auto mb-5 shadow-[0_0_24px_rgba(47,132,129,0.1)]">
                                <Shield className="w-6 h-6 text-teal-400" />
                            </div>
                            <h3 className="text-[18px] lg:text-[22px] font-bold mb-3 font-display">Duomenų saugumas — mūsų prioritetas</h3>
                            <p className="text-[13px] lg:text-[14px] leading-[1.8] max-w-[550px] mx-auto mb-8" style={{ color: 'rgba(255,255,255,0.45)' }}>
                                Nuomoria naudoja pirmaujančias saugumo technologijas, kad Jūsų ir Jūsų nuomininkų duomenys būtų visada apsaugoti.
                            </p>
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                {[
                                    { icon: Lock, title: 'Google OAuth', desc: 'Saugi autentifikacija be slaptažodžių' },
                                    { icon: Shield, title: 'RLS politikos', desc: 'Eilučių lygio duomenų apsauga' },
                                    { icon: Globe, title: 'SSL šifravimas', desc: 'Visi duomenys šifruojami tranzitu' },
                                ].map(({ icon: Icon, title, desc }) => (
                                    <div key={title} className="p-5 rounded-xl transition-all duration-200 hover:bg-white/[0.05]" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div className="w-9 h-9 rounded-lg bg-teal-500/10 flex items-center justify-center mx-auto mb-3">
                                            <Icon className="w-4 h-4 text-teal-400/70" />
                                        </div>
                                        <div className="text-[13px] font-semibold mb-1">{title}</div>
                                        <div className="text-[11px]" style={{ color: 'rgba(255,255,255,0.40)' }}>{desc}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </RevealSection>
                </div>
            </section >

            {/* ═══════════════════════════════════════════════
          FAQ
      ═══════════════════════════════════════════════ */}
            < section id="faq" className="py-20 lg:py-28 px-6 lg:px-16 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                <div className="max-w-[700px] mx-auto">
                    <RevealSection className="text-center mb-12">
                        <p className="text-[12px] font-semibold tracking-[0.15em] uppercase mb-3" style={{ color: 'rgba(58,176,158,0.80)' }}>
                            D.U.K.
                        </p>
                        <h2 className="text-[28px] lg:text-[40px] font-bold tracking-[-0.02em] mb-4 font-display">
                            Dažniausiai užduodami klausimai
                        </h2>
                    </RevealSection>

                    <RevealSection delay={0.1}>
                        <div className="border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                            {faqs.map((faq) => (
                                <FaqItem key={faq.q} q={faq.q} a={faq.a} />
                            ))}
                        </div>
                    </RevealSection>
                </div>
            </section >

            {/* ═══════════════════════════════════════════════
          FINAL CTA
      ═══════════════════════════════════════════════ */}
            < section className="relative py-24 lg:py-32 px-6 lg:px-16" style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(47,132,129,0.03) 50%, transparent 100%)' }}>
                <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent 5%, rgba(47,132,129,0.12) 50%, transparent 95%)' }} />
                <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(47,132,129,0.06) 0%, transparent 55%)' }} />
                <div className="relative max-w-[650px] mx-auto text-center">
                    <RevealSection>
                        <img src={smallLogoWhite} alt="Nuomoria" className="h-20 w-20 object-contain mx-auto mb-6 opacity-40" />
                        <h2 className="text-[26px] lg:text-[38px] font-bold tracking-[-0.02em] mb-4 font-display">
                            Pasiruošę supaprastinti nuomos valdymą?
                        </h2>
                        <p className="text-[14px] lg:text-[16px] leading-[1.7] mb-8" style={{ color: 'rgba(255,255,255,0.45)' }}>
                            Prisijunkite nemokamai ir pradėkite valdyti savo nekilnojamąjį turtą jau šiandien.
                            Jokių mokesčių, jokių limitų.
                        </p>
                        <Link to="/login"
                            className="group inline-flex items-center gap-2.5 px-8 py-4 rounded-xl text-[15px] font-bold transition-all duration-200 active:scale-[0.97] shadow-[0_8px_32px_rgba(47,132,129,0.3)]"
                            style={{ background: 'linear-gradient(135deg, #2F8481 0%, #3AB09E 100%)' }}
                        >
                            Pradėti nemokamai
                            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                        </Link>
                        <p className="mt-4 text-[11px] flex items-center justify-center gap-1.5" style={{ color: 'rgba(255,255,255,0.30)' }}>
                            <Lock className="w-3 h-3" />
                            Saugi Google registracija · Be kreditinės kortelės
                        </p>
                    </RevealSection>
                </div>
            </section >

            {/* ═══════════════════════════════════════════════
          FOOTER
      ═══════════════════════════════════════════════ */}
            < footer className="relative py-10 px-6 lg:px-16" >
                <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent 5%, rgba(255,255,255,0.06) 50%, transparent 95%)' }} />
                <div className="max-w-[1100px] mx-auto">
                    <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-3">
                            <img src={smallLogoWhite} alt="Nuomoria" className="h-8 w-auto object-contain opacity-50" />
                        </div>
                        <div className="flex items-center gap-6">
                            <a href="#features" className="text-[12px] transition-colors duration-200 hover:text-teal-400/60" style={{ color: 'rgba(255,255,255,0.25)' }}>
                                Galimybės
                            </a>
                            <a href="#how-it-works" className="text-[12px] transition-colors duration-200 hover:text-teal-400/60" style={{ color: 'rgba(255,255,255,0.25)' }}>
                                Kaip veikia
                            </a>
                            <a href="#faq" className="text-[12px] transition-colors duration-200 hover:text-teal-400/60" style={{ color: 'rgba(255,255,255,0.25)' }}>
                                D.U.K.
                            </a>
                            <button onClick={() => setPricingOpen(true)} className="text-[12px] transition-colors duration-200 hover:text-teal-400/60" style={{ color: 'rgba(255,255,255,0.25)' }}>
                                Kainos
                            </button>
                            <Link to="/login" className="text-[12px] transition-colors duration-200 hover:text-teal-400/60" style={{ color: 'rgba(255,255,255,0.25)' }}>
                                Prisijungti
                            </Link>
                        </div>
                    </div>
                    <div className="mt-6 pt-6 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                        <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.18)' }}>
                            © {new Date().getFullYear()} Nuomoria. Visos teisės saugomos.
                        </p>
                    </div>
                </div>
            </footer >

            {/* Pricing Modal */}
            <PricingModal isOpen={pricingOpen} onClose={() => setPricingOpen(false)} />

            {/* ═══════════════════════════════════════════════
          STYLES
      ═══════════════════════════════════════════════ */}
            < style > {`
        @keyframes landingFadeIn {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .landing-fade-in {
          opacity: 0;
          animation: landingFadeIn 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.2s forwards;
        }
        .landing-gradient-text {
          background: linear-gradient(135deg, #3AB09E 0%, #5ECEC0 50%, #2F8481 100%);
          background-size: 200% 200%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: landingGradientShift 4s ease-in-out infinite;
          display: inline-block;
          padding: 0.05em 0.15em 0.2em 0.1em;
          margin: -0.05em -0.15em -0.2em -0.1em;
        }
        @keyframes landingGradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        html { scroll-behavior: smooth; }

        @keyframes landingFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .landing-float-1 { animation: landingFloat 5s ease-in-out infinite; }
        .landing-float-2 { animation: landingFloat 6s ease-in-out 1s infinite; }
        .landing-float-3 { animation: landingFloat 5.5s ease-in-out 0.5s infinite; }
        .landing-float-4 { animation: landingFloat 4.5s ease-in-out 1.5s infinite; }

        @keyframes donutDraw {
          from { stroke-dasharray: 0 163.36; }
          to { stroke-dasharray: 130 163.36; }
        }
        .landing-donut-fill { animation: donutDraw 1.5s ease-out 1s forwards; stroke-dasharray: 0 163.36; }
      `}</style >
        </div >
    );
};

export default LandingPage;
