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
const AnimatedStat: React.FC<{ value: string; label: string; delay?: number }> = ({ value, label, delay = 0 }) => {
    const { ref, isVisible } = useScrollReveal();
    return (
        <div ref={ref} className="text-center p-4 lg:p-5 rounded-xl transition-all duration-200 hover:bg-white/[0.03]" style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(16px)',
            transition: `all 0.6s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
            backgroundColor: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.05)',
        }}>
            <div className="text-[28px] lg:text-[38px] font-bold tracking-[-0.03em] landing-gradient-text">{value}</div>
            <div className="text-[11px] lg:text-[12px] mt-1 font-medium tracking-[0.05em] uppercase" style={{ color: 'rgba(255,255,255,0.40)' }}>{label}</div>
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

    // If authenticated, redirect based on role
    if (!loading && isAuthenticated) {
        if (user?.role === 'tenant') return <Navigate to="/tenant" replace />;
        if (user?.role === 'admin') return <Navigate to="/admin" replace />;
        return <Navigate to="/dashboard" replace />;
    }

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
        { icon: Eye, text: 'Matykite visų objektų būklę viename dashboard\'e' },
        { icon: TrendingUp, text: 'Stebėkite pajamas ir vėluojančius mokėjimus realiu laiku' },
        { icon: Key, text: 'Pakvieskite nuomininkus su unikalių pakvietimo kodu' },
        { icon: Bell, text: 'Gaukite pranešimus apie mokėjimus ir skaitliukų rodmenis' },
        { icon: FileText, text: 'Valdykite sutartis, depozitus ir mokėjimo istoriją' },
    ];

    const tenantBenefits = [
        { icon: Wallet, text: 'Peržiūrėkite sąskaitas ir mokėjimo istoriją bet kada' },
        { icon: Gauge, text: 'Įveskite skaitliukų rodmenis tiesiai iš telefono' },
        { icon: Mail, text: 'Bendraujkite su nuomotoju tiesiogiai platformoje' },
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
            description: 'Kurkite sąskaitas, stebėkite mokėjimus, peržiūrėkite skaitliukų rodmenis ir bendraujkite su nuomininkais — viskas vienoje vietoje.',
            detail: 'Pilnas valdymo centras',
        },
    ];

    const faqs = [
        {
            q: 'Ar Nuomoria yra nemokama?',
            a: 'Taip, šiuo metu Nuomoria yra visiškai nemokama. Galite naudotis visomis funkcijomis be jokių apribojimų ar paslėptų mokesčių.',
        },
        {
            q: 'Kaip nuomininkai prisijungia prie sistemos?',
            a: 'Nuomotojas sugeneruoja unikalų pakvietimo kodą kiekvienam nuomininkui. Nuomininkas prisiregistruoja su Google paskyra ir įveda šį kodą — po to iš karto mato savo butą, sąskaitas ir skaitliukus.',
        },
        {
            q: 'Ar mano duomenys yra saugūs?',
            a: 'Taip, naudojame Supabase ir Google OAuth — pirmaujančias saugumo technologijas. Visi duomenys šifruojami, o prieiga kontroliuojama eilučių lygio saugumo politikomis (RLS).',
        },
        {
            q: 'Kiek objektų galiu pridėti?',
            a: 'Neribotą kiekį. Galite pridėti tiek adresų ir butų, kiek reikia. Kiekvienam butui galite priskirti skaitliukus, nuomininkus ir stebėti mokėjimus.',
        },
        {
            q: 'Ar sistema veikia mobiliajame telefone?',
            a: 'Taip, Nuomoria yra pilnai responsive — puikiai veikia tiek kompiuteryje, tiek telefone ar planšetėje. Nuomininkai gali įvesti skaitliukų rodmenis tiesiog iš telefono.',
        },
        {
            q: 'Kaip veikia automatinės sąskaitos?',
            a: 'Sistema automatiškai apskaičiuoja komunalinius mokesčius pagal skaitliukų rodmenis ir prideda juos prie mėnesinės nuomos kainos. Galite peržiūrėti ir patvirtinti kiekvieną sąskaitą prieš ją siunčiant nuomininkui.',
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
                <div className="max-w-[1200px] mx-auto px-6 lg:px-12 h-16 flex items-center justify-between">
                    <img src={logoBlack} alt="Nuomoria" className="h-10 lg:h-11 w-auto object-contain" />

                    {/* Desktop nav links */}
                    <div className="hidden lg:flex items-center gap-8">
                        <button onClick={scrollToFeatures} className="text-[13px] font-medium transition-colors hover:text-white" style={{ color: 'rgba(255,255,255,0.55)' }}>
                            Galimybės
                        </button>
                        <a href="#how-it-works" className="text-[13px] font-medium transition-colors hover:text-white" style={{ color: 'rgba(255,255,255,0.55)' }}>
                            Kaip veikia
                        </a>
                        <a href="#faq" className="text-[13px] font-medium transition-colors hover:text-white" style={{ color: 'rgba(255,255,255,0.55)' }}>
                            D.U.K.
                        </a>
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
            <section className="relative pt-16 pb-8 lg:pb-0 lg:min-h-[82vh] flex flex-col">
                {/* Background image — full view */}
                <div className="absolute inset-0 overflow-hidden">
                    <img src="/images/ImageIntroduction.jpg" alt="" className="w-full h-full object-cover object-bottom" />
                </div>
                {/* Dark overlay for readability */}
                <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(3,6,8,0.78) 0%, rgba(3,6,8,0.55) 40%, rgba(3,6,8,0.92) 100%)' }} />
                {/* Subtle teal glow */}
                <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 25% 50%, rgba(16,185,170,0.06) 0%, transparent 50%)' }} />

                <div className="relative z-10 flex-1 flex items-center px-6 lg:px-16 py-12 lg:py-0">
                    <div className="max-w-[1200px] mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center landing-fade-in">

                        {/* LEFT — Headline & CTA */}
                        <div>
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6 text-[11px] font-medium"
                                style={{ backgroundColor: 'rgba(47,132,129,0.12)', border: '1px solid rgba(47,132,129,0.22)', color: 'rgba(58,176,158,0.95)' }}
                            >
                                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                                Nuomos valdymo platforma Lietuvai
                            </div>

                            <h1 className="text-[32px] lg:text-[50px] font-bold leading-[1.10] tracking-[-0.03em] mb-5">
                                Viskas ko reikia{' '}
                                <span className="landing-gradient-text">nuomos valdymui</span>
                                {' '}vienoje vietoje
                            </h1>

                            <p className="text-[14px] lg:text-[16px] leading-[1.75] mb-8 max-w-[480px]" style={{ color: 'rgba(255,255,255,0.60)' }}>
                                Automatizuokite sąskaitas, stebėkite skaitliukus, valdykite nuomininkus ir analizuokite pajamas — nuo pirmo buto iki didelio portfelio.
                            </p>

                            <div className="flex flex-col lg:flex-row items-start gap-3 mb-5">
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

                        {/* RIGHT — Quick feature highlights */}
                        <div className="space-y-3 lg:pl-4">
                            {[
                                {
                                    icon: Receipt,
                                    title: 'Automatinės sąskaitos',
                                    desc: 'Sistema automatiškai sugeneruoja mėnesines sąskaitas su nuoma ir komunaliniais mokesčiais.',
                                    iconBg: 'bg-teal-500/15',
                                    iconColor: 'text-teal-400',
                                    stat: 'Sutaupykite ~3 val./mėn.',
                                },
                                {
                                    icon: Gauge,
                                    title: 'Skaitliukų valdymas',
                                    desc: 'Nuomininkai patys įveda rodmenis, sistema apskaičiuoja suvartojimą ir kainą.',
                                    iconBg: 'bg-amber-500/15',
                                    iconColor: 'text-amber-400',
                                    stat: 'Nereikia rinkti SMS',
                                },
                                {
                                    icon: Users,
                                    title: 'Nuomininkų portalas',
                                    desc: 'Kiekvienas nuomininkas mato sąskaitas, sutartį ir gali bendrauti tiesiogiai.',
                                    iconBg: 'bg-blue-500/15',
                                    iconColor: 'text-blue-400',
                                    stat: 'Skaidrus bendravimas',
                                },
                                {
                                    icon: BarChart3,
                                    title: 'Realaus laiko analitika',
                                    desc: 'Stebėkite pajamas, vėluojančius mokėjimus ir turto efektyvumą.',
                                    iconBg: 'bg-emerald-500/15',
                                    iconColor: 'text-emerald-400',
                                    stat: 'Visi duomenys vienoje vietoje',
                                },
                            ].map((item, i) => (
                                <div key={item.title}
                                    className="group flex items-start gap-3.5 p-3.5 rounded-xl transition-all duration-200 hover:bg-white/[0.04]"
                                    style={{
                                        backgroundColor: 'rgba(255,255,255,0.02)',
                                        border: '1px solid rgba(255,255,255,0.06)',
                                        opacity: 0,
                                        animation: `landingFadeIn 0.6s cubic-bezier(0.16,1,0.3,1) ${0.4 + i * 0.1}s forwards`,
                                    }}
                                >
                                    <div className={`w-9 h-9 rounded-lg ${item.iconBg} border border-white/[0.08] flex items-center justify-center flex-shrink-0`}>
                                        <item.icon className={`w-4 h-4 ${item.iconColor}`} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-2 mb-0.5">
                                            <h3 className="text-[13px] font-bold text-white/90">{item.title}</h3>
                                            <span className="text-[9px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 hidden lg:block"
                                                style={{ backgroundColor: 'rgba(47,132,129,0.10)', color: 'rgba(58,176,158,0.70)' }}
                                            >{item.stat}</span>
                                        </div>
                                        <p className="text-[11px] leading-[1.6]" style={{ color: 'rgba(255,255,255,0.40)' }}>{item.desc}</p>
                                    </div>
                                </div>
                            ))}
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
                <div className="max-w-[900px] mx-auto px-6 grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                    <AnimatedStat value="100%" label="Nemokama" delay={0} />
                    <AnimatedStat value="24/7" label="Prieiga" delay={0.1} />
                    <AnimatedStat value="∞" label="Objektų" delay={0.2} />
                    <AnimatedStat value="< 1 min" label="Registracija" delay={0.3} />
                </div>
            </section>

            {/* ═══════════════════════════════════════════════
          PROBLEM → SOLUTION
      ═══════════════════════════════════════════════ */}
            <section className="py-20 lg:py-28 px-6 lg:px-16">
                <div className="max-w-[1000px] mx-auto">
                    <RevealSection className="text-center mb-16">
                        <p className="text-[12px] font-semibold tracking-[0.15em] uppercase mb-3" style={{ color: 'rgba(58,176,158,0.80)' }}>
                            Problema ir sprendimas
                        </p>
                        <h2 className="text-[28px] lg:text-[40px] font-bold tracking-[-0.02em] mb-5">
                            Nuomos valdymas neturi būti sudėtingas
                        </h2>
                        <p className="text-[14px] lg:text-[16px] leading-[1.8] max-w-[650px] mx-auto" style={{ color: 'rgba(255,255,255,0.50)' }}>
                            Excel lentelės, SMS žinutės nuomininkams, rankiniai skaičiavimai — tai atima brangų laiką.
                            Nuomoria viską centralizuoja ir automatizuoja, kad jūs galėtumėte susitelkti ties tuo, kas svarbu.
                        </p>
                    </RevealSection>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Before */}
                        <RevealSection delay={0.1}>
                            <div className="rounded-2xl p-6 lg:p-7 h-full relative overflow-hidden" style={{ backgroundColor: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.10)' }}>
                                <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ background: 'linear-gradient(90deg, rgba(239,68,68,0.4) 0%, rgba(239,68,68,0.1) 100%)' }} />
                                <div className="text-[12px] font-bold tracking-[0.1em] uppercase mb-5 text-red-400/80">Be Nuomoria</div>
                                <ul className="space-y-3.5">
                                    {[
                                        'Sąskaitas reikia kurti rankiniu būdu kiekvieną mėnesį',
                                        'Skaitliukų rodmenys ateina SMS ar žodžiu',
                                        'Komunaliniai skaičiuojami Excel\'e',
                                        'Mokėjimų sekimas — chaotiškas',
                                        'Nuomininkai skambina dėl kiekvienos smulkmenos',
                                    ].map((item) => (
                                        <li key={item} className="flex items-start gap-3 text-[13px] leading-[1.6]" style={{ color: 'rgba(255,255,255,0.50)' }}>
                                            <div className="w-5 h-5 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <Minus className="w-3 h-3 text-red-400" />
                                            </div>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </RevealSection>

                        {/* After */}
                        <RevealSection delay={0.2}>
                            <div className="rounded-2xl p-6 lg:p-7 h-full relative overflow-hidden" style={{ backgroundColor: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.12)' }}>
                                <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ background: 'linear-gradient(90deg, rgba(16,185,129,0.4) 0%, rgba(16,185,129,0.1) 100%)' }} />
                                <div className="text-[12px] font-bold tracking-[0.1em] uppercase mb-5 text-emerald-400/80">Su Nuomoria</div>
                                <ul className="space-y-3.5">
                                    {[
                                        'Sąskaitos generuojamos automatiškai pagal nustatytus parametrus',
                                        'Nuomininkai patys įveda rodmenis savo paskyroje',
                                        'Sistema apskaičiuoja komunalinius pagal tarifus automatiškai',
                                        'Visi mokėjimai matomi dashboard\'e su statusais',
                                        'Integruota komunikacijos sistema — viskas vienoje vietoje',
                                    ].map((item) => (
                                        <li key={item} className="flex items-start gap-3 text-[13px] leading-[1.6]" style={{ color: 'rgba(255,255,255,0.55)' }}>
                                            <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <Check className="w-3 h-3 text-emerald-400" />
                                            </div>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
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
                        <h2 className="text-[28px] lg:text-[40px] font-bold tracking-[-0.02em] mb-4">
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
            </section>

            {/* ═══════════════════════════════════════════════
          FOR LANDLORDS & TENANTS
      ═══════════════════════════════════════════════ */}
            <section className="py-20 lg:py-28 px-6 lg:px-16 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                <div className="max-w-[1100px] mx-auto">
                    <RevealSection className="text-center mb-16">
                        <p className="text-[12px] font-semibold tracking-[0.15em] uppercase mb-3" style={{ color: 'rgba(58,176,158,0.80)' }}>
                            Kam skirta
                        </p>
                        <h2 className="text-[28px] lg:text-[40px] font-bold tracking-[-0.02em] mb-4">
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
            </section>

            {/* ═══════════════════════════════════════════════
          HOW IT WORKS
      ═══════════════════════════════════════════════ */}
            <section id="how-it-works" className="relative py-20 lg:py-28 px-6 lg:px-16 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                <div className="max-w-[1000px] mx-auto">
                    <RevealSection className="text-center mb-16">
                        <p className="text-[12px] font-semibold tracking-[0.15em] uppercase mb-3" style={{ color: 'rgba(58,176,158,0.80)' }}>
                            Kaip tai veikia
                        </p>
                        <h2 className="text-[28px] lg:text-[40px] font-bold tracking-[-0.02em] mb-4">
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
            </section>

            {/* ═══════════════════════════════════════════════
          SECURITY & TRUST
      ═══════════════════════════════════════════════ */}
            <section className="py-16 lg:py-20 px-6 lg:px-16 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                <div className="max-w-[900px] mx-auto">
                    <RevealSection>
                        <div className="rounded-2xl p-7 lg:p-10 text-center relative overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent 10%, rgba(47,132,129,0.20) 50%, transparent 90%)' }} />
                            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/15 flex items-center justify-center mx-auto mb-5 shadow-[0_0_24px_rgba(47,132,129,0.1)]">
                                <Shield className="w-6 h-6 text-teal-400" />
                            </div>
                            <h3 className="text-[18px] lg:text-[22px] font-bold mb-3">Duomenų saugumas — mūsų prioritetas</h3>
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
            </section>

            {/* ═══════════════════════════════════════════════
          FAQ
      ═══════════════════════════════════════════════ */}
            <section id="faq" className="py-20 lg:py-28 px-6 lg:px-16 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                <div className="max-w-[700px] mx-auto">
                    <RevealSection className="text-center mb-12">
                        <p className="text-[12px] font-semibold tracking-[0.15em] uppercase mb-3" style={{ color: 'rgba(58,176,158,0.80)' }}>
                            D.U.K.
                        </p>
                        <h2 className="text-[28px] lg:text-[40px] font-bold tracking-[-0.02em] mb-4">
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
            </section>

            {/* ═══════════════════════════════════════════════
          FINAL CTA
      ═══════════════════════════════════════════════ */}
            <section className="relative py-24 lg:py-32 px-6 lg:px-16" style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(47,132,129,0.03) 50%, transparent 100%)' }}>
                <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent 5%, rgba(47,132,129,0.12) 50%, transparent 95%)' }} />
                <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(47,132,129,0.06) 0%, transparent 55%)' }} />
                <div className="relative max-w-[650px] mx-auto text-center">
                    <RevealSection>
                        <img src={smallLogoWhite} alt="Nuomoria" className="h-14 w-14 object-contain mx-auto mb-6 opacity-25" />
                        <h2 className="text-[26px] lg:text-[38px] font-bold tracking-[-0.02em] mb-4">
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
            </section>

            {/* ═══════════════════════════════════════════════
          FOOTER
      ═══════════════════════════════════════════════ */}
            <footer className="relative py-10 px-6 lg:px-16">
                <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent 5%, rgba(255,255,255,0.06) 50%, transparent 95%)' }} />
                <div className="max-w-[1100px] mx-auto">
                    <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-3">
                            <img src={logoImage} alt="Nuomoria" className="h-8 w-auto object-contain opacity-40" />
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
            </footer>

            {/* ═══════════════════════════════════════════════
          STYLES
      ═══════════════════════════════════════════════ */}
            <style>{`
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
        }
        @keyframes landingGradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        html { scroll-behavior: smooth; }
      `}</style>
        </div>
    );
};

export default LandingPage;
