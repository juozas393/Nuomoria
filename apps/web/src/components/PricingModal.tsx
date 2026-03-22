import React, { memo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Check, X, Building, Building2, Landmark, ArrowRight } from 'lucide-react';

const TRIAL_DAYS = 14;

const TIERS = [
    {
        name: '1–5 butai',
        icon: Building,
        price: 2.99,
        annualPrice: 2.49,
        description: 'Pradedantiems nuomotojams',
        example: { count: 3, label: '3 butai' },
        accent: 'white',
        borderClass: 'border-white/[0.10]',
        iconBg: 'bg-white/[0.06] border border-white/[0.10]',
        iconColor: 'text-white/60',
        features: [
            'Pilnas butų valdymas',
            'Skaitliukų sekimas',
            'Automatinės sąskaitos',
            'Nuomininkų portalas',
            'El. pašto pranešimai',
            'PDF eksportas',
            'Chat su nuomininkais',
            'Finansų analitika',
        ],
    },
    {
        name: '6–15 butų',
        icon: Building2,
        price: 2.49,
        annualPrice: 2.29,
        description: 'Augančiam portfeliui',
        example: { count: 10, label: '10 butų' },
        accent: 'teal',
        borderClass: 'border-teal-500/40',
        iconBg: 'bg-teal-500/15 border border-teal-500/25',
        iconColor: 'text-teal-400',
        features: [
            'Viskas iš 1–5 plano',
            'Kelių adresų valdymas',
            'Dokumentų saugykla',
            'Išplėstinė analitika',
            'Mokėjimų stebėjimas',
            'Sutarčių valdymas',
            'Nuotraukų galerija',
            'Grupiniai pranešimai',
        ],
    },
    {
        name: '16+ butų',
        icon: Landmark,
        price: 2.29,
        annualPrice: 1.99,
        description: 'Profesionaliam valdymui',
        example: { count: 25, label: '25 butai' },
        accent: 'amber',
        borderClass: 'border-amber-500/35',
        iconBg: 'bg-amber-500/15 border border-amber-500/25',
        iconColor: 'text-amber-400',
        features: [
            'Viskas iš 6–15 plano',
            'Neriboti butai',
            'Prioritetinis palaikymas',
            'Individualūs sprendimai',
            'API prieiga',
            'Duomenų eksportas',
            'Dedikuotas pagalbos kanalas',
            'SLA garantija',
        ],
    },
];

interface PricingModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const PricingModal = memo(({ isOpen, onClose }: PricingModalProps) => {
    const [isAnnual, setIsAnnual] = useState(false);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div
                className="relative w-full max-w-[1000px] max-h-[90vh] overflow-y-auto mt-[5vh] mx-4 rounded-[24px] border border-white/[0.10]"
                style={{ background: 'linear-gradient(180deg, #0f1318 0%, #0a0e10 100%)' }}
            >
                {/* Close */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 w-9 h-9 rounded-xl bg-white/[0.06] border border-white/[0.10] flex items-center justify-center hover:bg-white/[0.12] transition-all"
                >
                    <X className="w-4 h-4 text-white/60" />
                </button>

                {/* Header */}
                <div className="px-6 lg:px-10 pt-10 lg:pt-12 pb-2 text-center">
                    <h2 className="text-[28px] lg:text-[38px] font-bold leading-[1.08] tracking-[-0.03em] mb-3 text-white">
                        Kuo daugiau butų —{' '}
                        <span className="bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">tuo pigiau</span>
                    </h2>
                    <p className="text-[14px] lg:text-[16px] text-white/50 leading-relaxed max-w-md mx-auto">
                        Visos funkcijos įtrauktos. Jokių paslėptų mokesčių.
                    </p>
                </div>

                {/* Billing toggle */}
                <div className="flex items-center justify-center gap-2 my-7 px-6">
                    <button
                        onClick={() => setIsAnnual(false)}
                        className={`px-5 py-2 rounded-full text-[13px] font-medium transition-all duration-200 ${!isAnnual
                            ? 'bg-white/[0.10] text-white border border-white/[0.18] shadow-[0_0_12px_rgba(255,255,255,0.04)]'
                            : 'text-white/40 hover:text-white/60'
                            }`}
                    >
                        Mėnesinis
                    </button>
                    <button
                        onClick={() => setIsAnnual(true)}
                        className={`px-5 py-2 rounded-full text-[13px] font-medium transition-all duration-200 flex items-center gap-2 ${isAnnual
                            ? 'bg-teal-500/15 text-teal-400 border border-teal-500/30 shadow-[0_0_12px_rgba(20,184,166,0.1)]'
                            : 'text-white/40 hover:text-white/60'
                            }`}
                    >
                        Metinis
                        <span className="text-[10px] bg-teal-500/90 text-white px-2 py-0.5 rounded-full font-bold">Pigiau</span>
                    </button>
                </div>

                {/* 3 Tier Cards */}
                <div className="px-5 lg:px-10 pb-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {TIERS.map((tier, i) => {
                        const price = isAnnual ? tier.annualPrice : tier.price;
                        const monthlyExample = price * tier.example.count;
                        const savingsPerYear = isAnnual ? (tier.price - tier.annualPrice) * tier.example.count * 12 : 0;
                        const isTeal = tier.accent === 'teal';
                        const isAmber = tier.accent === 'amber';

                        return (
                            <div
                                key={i}
                                className={`relative rounded-[20px] border overflow-hidden flex flex-col transition-all duration-300 hover:translate-y-[-2px] ${tier.borderClass}`}
                                style={{
                                    background: isTeal
                                        ? 'linear-gradient(180deg, rgba(20,184,166,0.06) 0%, rgba(20,184,166,0.01) 100%)'
                                        : isAmber
                                            ? 'linear-gradient(180deg, rgba(245,158,11,0.05) 0%, rgba(245,158,11,0.01) 100%)'
                                            : 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
                                }}
                            >
                                {/* Subtle top glow line */}
                                <div
                                    className="absolute top-0 left-[15%] right-[15%] h-px"
                                    style={{
                                        background: isTeal
                                            ? 'linear-gradient(90deg, transparent, rgba(20,184,166,0.5), transparent)'
                                            : isAmber
                                                ? 'linear-gradient(90deg, transparent, rgba(245,158,11,0.4), transparent)'
                                                : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
                                    }}
                                />

                                <div className="p-5 lg:p-6 flex flex-col flex-1">
                                    {/* Tier name & icon */}
                                    <div className="flex items-center gap-2.5 mb-1.5">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tier.iconBg}`}>
                                            <tier.icon className={`w-4 h-4 ${tier.iconColor}`} />
                                        </div>
                                        <div>
                                            <h3 className="text-[15px] font-bold text-white leading-tight">{tier.name}</h3>
                                            <p className="text-[11px] text-white/40">{tier.description}</p>
                                        </div>
                                    </div>

                                    {/* Divider */}
                                    <div className="h-px bg-white/[0.06] my-4" />

                                    {/* Price */}
                                    <div className="mb-1">
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-[40px] font-bold text-white tabular-nums leading-none tracking-tight">
                                                €{price.toFixed(2)}
                                            </span>
                                        </div>
                                        <span className="text-[12px] text-white/35 mt-0.5 block">/butas per mėnesį</span>
                                    </div>

                                    {/* Savings badge */}
                                    {isAnnual && savingsPerYear > 0 && (
                                        <div className={`mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-md w-fit text-[10px] font-semibold ${isTeal
                                            ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                                            : isAmber
                                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                            }`}>
                                            Sutaupote ~€{savingsPerYear.toFixed(0)}/metus
                                        </div>
                                    )}

                                    {/* Example calc */}
                                    <div className="mt-4 mb-5 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] text-white/40">pvz. {tier.example.label}</span>
                                            <span className={`text-[13px] font-bold tabular-nums ${isTeal ? 'text-teal-400' : isAmber ? 'text-amber-400' : 'text-white/80'}`}>
                                                €{monthlyExample.toFixed(2)}/mėn
                                            </span>
                                        </div>
                                    </div>

                                    {/* CTA */}
                                    <Link
                                        to="/login"
                                        className={`w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200 active:scale-[0.97] mb-5 ${isTeal
                                            ? 'bg-teal-500/90 hover:bg-teal-500 text-white shadow-[0_2px_12px_rgba(20,184,166,0.25)]'
                                            : isAmber
                                                ? 'bg-amber-500/90 hover:bg-amber-500 text-white shadow-[0_2px_12px_rgba(245,158,11,0.2)]'
                                                : 'border border-white/[0.15] bg-white/[0.06] hover:bg-white/[0.1] text-white'
                                            }`}
                                    >
                                        Pradėti {TRIAL_DAYS}d bandymą
                                        <ArrowRight className="w-3.5 h-3.5" />
                                    </Link>

                                    {/* Divider */}
                                    <div className="h-px bg-white/[0.06] mb-4" />

                                    {/* Features */}
                                    <div className="space-y-2 flex-1">
                                        {tier.features.map((f, fi) => (
                                            <div key={fi} className="flex items-start gap-2">
                                                <Check className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${isTeal ? 'text-teal-400/80' : isAmber ? 'text-amber-400/80' : 'text-white/30'}`} />
                                                <span className="text-[11.5px] text-white/60 leading-snug">{f}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Bottom */}
                <div className="px-6 lg:px-10 pb-8 text-center">
                    <div className="h-px bg-white/[0.05] mb-5" />
                    <p className="text-[11px] text-white/25">
                        {TRIAL_DAYS} dienų nemokamas bandymas · Nereikia kortelės · Galite atšaukti bet kada · Duomenys saugomi ES
                    </p>
                </div>
            </div>
        </div>
    );
});

PricingModal.displayName = 'PricingModal';
export default PricingModal;
