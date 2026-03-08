import React, { memo, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Check, Building2, TrendingDown, Shield, Clock, ChevronDown, ChevronUp, ArrowLeft, Minus, Plus, Sparkles } from 'lucide-react';

/* ── Per-property pricing tiers ── */
const TIERS = [
    { min: 1, max: 5, price: 2.99, label: '1–5 butai' },
    { min: 6, max: 15, price: 2.49, label: '6–15 butų' },
    { min: 16, max: 999, price: 1.50, label: '16+ butų' },
] as const;

const ANNUAL_DISCOUNT = 0.20; // 20% off for yearly
const TRIAL_DAYS = 14;

function getMonthlyPrice(propertyCount: number): number {
    let total = 0;
    let remaining = propertyCount;
    for (const tier of TIERS) {
        const tierSize = tier.max - tier.min + 1;
        const unitsInTier = Math.min(remaining, tierSize);
        if (unitsInTier > 0) {
            total += unitsInTier * tier.price;
            remaining -= unitsInTier;
        }
        if (remaining <= 0) break;
    }
    return total;
}

const FEATURES = [
    { icon: Building2, title: 'Pilnas valdymas', desc: 'Butai, nuomininkai, sutartys' },
    { icon: Clock, title: 'Skaitikliai & sąskaitos', desc: 'Automatinis generavimas pagal rodmenis' },
    { icon: Shield, title: 'Nuomininkų portalas', desc: 'Patys siunčia rodmenis ir mato sąskaitas' },
    { icon: TrendingDown, title: 'Finansų analitika', desc: 'Pajamos, mokėjimai ir užimtumas' },
];

const FAQ_ITEMS = [
    { q: 'Kaip veikia bandomasis laikotarpis?', a: `Registruokitės nemokamai ir naudokitės visomis funkcijomis ${TRIAL_DAYS} dienų be jokių įsipareigojimų. Kortelės nereikia.` },
    { q: 'Ar galiu bet kada atšaukti?', a: 'Taip! Jokių ilgalaikių sutarčių. Galite bet kada atšaukti prenumeratą arba keisti butų skaičių.' },
    { q: 'Kas nutinka po bandomojo laikotarpio?', a: 'Jūsų duomenys lieka saugūs. Galite tęsti naudojimąsi pasirinkę mokamą planą. Nesirinkdami — peržiūros režimas.' },
    { q: 'Ar yra nuolaida už metinį mokėjimą?', a: `Taip! Mokant metiškai sutaupykite ${ANNUAL_DISCOUNT * 100}% nuo mėnesinės kainos.` },
    { q: 'Kokios visos funkcijos įtrauktos?', a: 'Visos Nuomoria funkcijos įtrauktos kiekvienam butui: skaitikliai, sąskaitos, nuomininko portalas, pranešimai, dokumentai, chat, analitika.' },
    { q: 'Ar duomenys saugūs?', a: 'Taip. Naudojame šifruotą ryšį (SSL/TLS), duomenys saugomi ES serveriuose pagal BDAR reikalavimus.' },
];

const PricingPage = memo(() => {
    const [isAnnual, setIsAnnual] = useState(false);
    const [propertyCount, setPropertyCount] = useState(3);
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    const monthlyTotal = useMemo(() => getMonthlyPrice(propertyCount), [propertyCount]);
    const effectiveMonthly = isAnnual ? monthlyTotal * (1 - ANNUAL_DISCOUNT) : monthlyTotal;
    const annualTotal = effectiveMonthly * 12;
    const savings = isAnnual ? monthlyTotal * 12 - annualTotal : 0;
    const perProperty = propertyCount > 0 ? effectiveMonthly / propertyCount : 0;

    const currentTier = TIERS.find(t => propertyCount >= t.min && propertyCount <= t.max) || TIERS[0];

    return (
        <div className="min-h-screen bg-[#0a0e10] text-white overflow-x-hidden">
            {/* Navigation */}
            <nav className="relative z-10 px-4 lg:px-8 py-4 flex items-center justify-between max-w-6xl mx-auto">
                <Link to="/" className="inline-flex items-center gap-2 text-[13px] font-medium text-white/70 hover:text-white transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    <span className="hidden lg:inline">Grįžti</span>
                </Link>
                <Link to="/login" className="px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-600 text-white text-[13px] font-semibold transition-all active:scale-[0.98]">
                    Pradėti nemokamai
                </Link>
            </nav>

            {/* Hero */}
            <section className="relative px-4 pt-8 lg:pt-16 pb-12 text-center max-w-3xl mx-auto">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 mb-6">
                    <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                    <span className="text-[12px] font-medium text-teal-400">{TRIAL_DAYS} dienų nemokamas bandymas</span>
                </div>
                <h1 className="text-[32px] lg:text-[48px] font-bold leading-[1.1] tracking-[-0.03em] mb-4">
                    Mokėkite tik už tai,{' '}
                    <span className="bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">kiek naudojate</span>
                </h1>
                <p className="text-[15px] lg:text-[17px] text-white/60 leading-relaxed max-w-xl mx-auto">
                    Paprasta kainodara be paslėptų mokesčių. Visos funkcijos įtrauktos kiekvienam butui.
                </p>
            </section>

            {/* Pricing Calculator */}
            <section className="px-4 pb-16 max-w-4xl mx-auto">
                {/* Billing toggle */}
                <div className="flex items-center justify-center gap-3 mb-10">
                    <button
                        onClick={() => setIsAnnual(false)}
                        className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-all ${!isAnnual ? 'bg-white/10 text-white border border-white/20' : 'text-white/50 hover:text-white/70'}`}
                    >
                        Mėnesinis
                    </button>
                    <button
                        onClick={() => setIsAnnual(true)}
                        className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-all flex items-center gap-2 ${isAnnual ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30' : 'text-white/50 hover:text-white/70'}`}
                    >
                        Metinis
                        <span className="text-[10px] bg-teal-500 text-white px-1.5 py-0.5 rounded-full font-bold">-{ANNUAL_DISCOUNT * 100}%</span>
                    </button>
                </div>

                {/* Main pricing card */}
                <div className="rounded-[24px] border border-white/[0.12] overflow-hidden" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)' }}>
                    {/* Property counter */}
                    <div className="p-6 lg:p-10 border-b border-white/[0.08]">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                            <div>
                                <h2 className="text-[14px] font-medium text-white/50 mb-2">Kiek butų valdote?</h2>
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => setPropertyCount(Math.max(1, propertyCount - 1))}
                                        className="w-10 h-10 rounded-xl bg-white/[0.08] border border-white/[0.12] flex items-center justify-center hover:bg-white/[0.12] transition-all active:scale-95"
                                        disabled={propertyCount <= 1}
                                    >
                                        <Minus className="w-4 h-4 text-white/70" />
                                    </button>
                                    <div className="min-w-[80px] text-center">
                                        <span className="text-[40px] lg:text-[56px] font-bold text-white tabular-nums leading-none">{propertyCount}</span>
                                        <p className="text-[11px] text-white/40 mt-1">{propertyCount === 1 ? 'butas' : propertyCount < 10 ? 'butai' : 'butų'}</p>
                                    </div>
                                    <button
                                        onClick={() => setPropertyCount(Math.min(100, propertyCount + 1))}
                                        className="w-10 h-10 rounded-xl bg-white/[0.08] border border-white/[0.12] flex items-center justify-center hover:bg-white/[0.12] transition-all active:scale-95"
                                    >
                                        <Plus className="w-4 h-4 text-white/70" />
                                    </button>
                                </div>
                                {/* Quick select */}
                                <div className="flex items-center gap-2 mt-4">
                                    {[1, 3, 5, 10, 20, 50].map(n => (
                                        <button
                                            key={n}
                                            onClick={() => setPropertyCount(n)}
                                            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${propertyCount === n ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30' : 'bg-white/[0.04] text-white/40 border border-white/[0.08] hover:text-white/60'
                                                }`}
                                        >
                                            {n}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Price display */}
                            <div className="lg:text-right">
                                <div className="flex items-baseline gap-1 lg:justify-end">
                                    <span className="text-[40px] lg:text-[52px] font-bold text-white tabular-nums leading-none tracking-tight">
                                        €{effectiveMonthly.toFixed(2)}
                                    </span>
                                    <span className="text-[14px] text-white/40">/mėn</span>
                                </div>
                                {isAnnual && (
                                    <p className="text-[12px] text-emerald-400 mt-1">
                                        Sutaupykite €{savings.toFixed(2)}/m. · €{annualTotal.toFixed(2)}/metus
                                    </p>
                                )}
                                <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.06] border border-white/[0.08]">
                                    <span className="text-[11px] text-white/50">€{perProperty.toFixed(2)}/butas</span>
                                    <span className="text-[11px] text-white/30">·</span>
                                    <span className="text-[11px] text-teal-400 font-medium">{currentTier.label}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tier breakdown */}
                    <div className="px-6 lg:px-10 py-5 bg-white/[0.02] border-b border-white/[0.08]">
                        <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-6">
                            {TIERS.map((tier, i) => {
                                const isActive = propertyCount >= tier.min;
                                const unitsInTier = Math.min(Math.max(0, propertyCount - tier.min + 1), tier.max - tier.min + 1);
                                return (
                                    <div key={i} className={`flex items-center gap-3 ${isActive ? 'opacity-100' : 'opacity-30'}`}>
                                        <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-teal-400' : 'bg-white/20'}`} />
                                        <div>
                                            <span className="text-[12px] font-medium text-white/80">{tier.label}</span>
                                            <span className="text-[12px] text-white/40 ml-2">€{(isAnnual ? tier.price * (1 - ANNUAL_DISCOUNT) : tier.price).toFixed(2)}/butas</span>
                                            {isActive && unitsInTier > 0 && (
                                                <span className="text-[11px] text-teal-400 ml-2">({unitsInTier} {unitsInTier === 1 ? 'butas' : 'butai'})</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* CTA */}
                    <div className="p-6 lg:p-10">
                        <Link
                            to="/login"
                            className="w-full lg:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 text-white text-[14px] font-semibold hover:from-teal-600 hover:to-teal-700 transition-all active:scale-[0.98] shadow-[0_4px_16px_rgba(20,184,166,0.3)]"
                        >
                            Pradėti {TRIAL_DAYS}d nemokamą bandymą
                        </Link>
                        <p className="text-[11px] text-white/40 mt-3">Nereikia kortelės · Galite atšaukti bet kada</p>
                    </div>
                </div>
            </section>

            {/* All features included */}
            <section className="px-4 pb-16 max-w-4xl mx-auto">
                <h2 className="text-[20px] lg:text-[24px] font-bold text-center mb-8">Visos funkcijos įtrauktos</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {FEATURES.map((f, i) => (
                        <div key={i} className="flex items-start gap-3.5 p-4 rounded-xl border border-white/[0.08] bg-white/[0.03]">
                            <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
                                <f.icon className="w-4 h-4 text-teal-400" />
                            </div>
                            <div>
                                <h3 className="text-[13px] font-semibold text-white/90 mb-0.5">{f.title}</h3>
                                <p className="text-[12px] text-white/50">{f.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
                {/* Feature checklist */}
                <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-x-6 gap-y-2 px-2">
                    {[
                        'Neriboti skaitikliai', 'Automatinės sąskaitos', 'Nuomininkų portalas',
                        'Chat su nuomininkais', 'Dokumentų saugykla', 'Pranešimų sistema',
                        'Finansų analitika', 'Mokėjimų stebėjimas', 'Kelių adresų valdymas',
                        'PDF eksportas', 'Nuotraukų galerija', 'Sutarčių valdymas',
                    ].map((feature, i) => (
                        <div key={i} className="flex items-center gap-2 py-1.5">
                            <Check className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />
                            <span className="text-[12px] text-white/60">{feature}</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* Social proof / stats */}
            <section className="px-4 pb-16 max-w-4xl mx-auto">
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { value: '99.9%', label: 'Veikimo laikas' },
                        { value: 'EU', label: 'Duomenų centrai' },
                        { value: '< 2min', label: 'Registracija' },
                    ].map((s, i) => (
                        <div key={i} className="text-center p-5 rounded-xl border border-white/[0.08] bg-white/[0.03]">
                            <p className="text-[22px] lg:text-[28px] font-bold text-white tabular-nums">{s.value}</p>
                            <p className="text-[11px] text-white/40 mt-1">{s.label}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* FAQ */}
            <section className="px-4 pb-20 max-w-3xl mx-auto">
                <h2 className="text-[20px] lg:text-[24px] font-bold text-center mb-8">Dažniausiai užduodami klausimai</h2>
                <div className="space-y-2">
                    {FAQ_ITEMS.map((item, i) => (
                        <div key={i} className="rounded-xl border border-white/[0.08] bg-white/[0.03] overflow-hidden">
                            <button
                                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                className="w-full flex items-center justify-between px-5 py-4 text-left"
                            >
                                <span className="text-[13px] font-medium text-white/85 pr-4">{item.q}</span>
                                {openFaq === i ? <ChevronUp className="w-4 h-4 text-white/30 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-white/30 flex-shrink-0" />}
                            </button>
                            {openFaq === i && (
                                <div className="px-5 pb-4">
                                    <p className="text-[12px] text-white/50 leading-relaxed">{item.a}</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </section>

            {/* Footer CTA */}
            <section className="px-4 pb-12 text-center">
                <div className="max-w-xl mx-auto rounded-[20px] p-8 border border-teal-500/20" style={{ background: 'linear-gradient(180deg, rgba(20,184,166,0.08) 0%, rgba(20,184,166,0.02) 100%)' }}>
                    <h3 className="text-[20px] font-bold mb-2">Pasiruošę pradėti?</h3>
                    <p className="text-[13px] text-white/50 mb-5">{TRIAL_DAYS} dienų nemokamas bandymas · Nereikia kortelės</p>
                    <Link
                        to="/login"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-teal-500 hover:bg-teal-600 text-white text-[14px] font-semibold transition-all active:scale-[0.98]"
                    >
                        Pradėti nemokamai
                    </Link>
                </div>
                <p className="text-[10px] text-white/20 mt-8">© {new Date().getFullYear()} Nuomoria. Visos teisės saugomos.</p>
            </section>
        </div>
    );
});

PricingPage.displayName = 'PricingPage';
export default PricingPage;
