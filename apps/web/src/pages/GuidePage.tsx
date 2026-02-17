import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    BookOpenIcon,
    BuildingOfficeIcon,
    HomeModernIcon,
    UsersIcon,
    DocumentTextIcon,
    WrenchScrewdriverIcon,
    ChartBarIcon,
    CogIcon,
    BellIcon,
    ChatBubbleLeftRightIcon,
    KeyIcon,
    UserCircleIcon,
    ShieldCheckIcon,
    DevicePhoneMobileIcon,
    SparklesIcon,

    ChevronRightIcon,
    CheckCircleIcon,
    ArrowRightIcon,
    EnvelopeIcon,
    ClipboardDocumentCheckIcon,
    CalculatorIcon,

    QuestionMarkCircleIcon,
    LightBulbIcon,
    UserGroupIcon,

    GlobeAltIcon,
    InformationCircleIcon,

    XMarkIcon,
    ArrowLongRightIcon,
    CameraIcon,
    ArrowPathIcon,
    AdjustmentsHorizontalIcon,
    ListBulletIcon,
    RocketLaunchIcon,
    ArrowLeftIcon,
} from '@heroicons/react/24/outline';

/* ═══════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════ */
type Role = 'all' | 'landlord' | 'tenant';

interface Section {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    role: Role;
}

interface FAQItem {
    q: string;
    a: string;
    role: Role;
}

/* ═══════════════════════════════════════════════
   Data
   ═══════════════════════════════════════════════ */
const SECTIONS: Section[] = [
    { id: 'pradzia', label: 'Darbo pradžia', icon: RocketLaunchIcon, role: 'all' },
    { id: 'nuomotojas', label: 'Nuomotojo gidas', icon: BuildingOfficeIcon, role: 'landlord' },
    { id: 'nuomininkas', label: 'Nuomininko gidas', icon: UserGroupIcon, role: 'tenant' },
    { id: 'skaitikliai', label: 'Skaitikliai ir sąskaitos', icon: CalculatorIcon, role: 'landlord' },
    { id: 'komunikacija', label: 'Komunikacija', icon: ChatBubbleLeftRightIcon, role: 'all' },
    { id: 'duk', label: 'DUK', icon: QuestionMarkCircleIcon, role: 'all' },
];

const FAQ_ITEMS: FAQItem[] = [
    { q: 'Kaip prisijungti prie Nuomoria?', a: 'Prisijungimo puslapyje spauskite \u201eTęsti su Google\u201c ir pasirinkite savo Google paskyrą. Atskiro slaptažodžio nereikia \u2014 jei jungiatės pirmą kartą, paskyra sukuriama automatiškai.', role: 'all' },
    { q: 'Kaip pridėti naują pastatą ir butus?', a: 'Eikite į \u201eNekilnojamas turtas\u201c → \u201e+ Pridėti adresą\u201c. Įveskite adresą ir pavadinimą. Po to atidarykite adresą ir spauskite \u201e+ Pridėti butą\u201c \u2014 nurodykite buto numerį, plotą ir nuomos kainą.', role: 'landlord' },
    { q: 'Kaip pakviesti nuomininką į butą?', a: 'Nuomininkų skiltyje spauskite \u201ePakviesti nuomininką\u201c, pasirinkite butą. Sistema sugeneruos unikalų 6 skaitmenų kodą \u2014 perduokite jį nuomininkui per žinutes ar el. paštą.', role: 'landlord' },
    { q: 'Kaip prisijungti prie buto kaip nuomininkas?', a: 'Prisijunkite su Google, pasirinkite \u201eNuomininkas\u201c rolę. Tada įveskite 6 skaitmenų pakvietimo kodą, kurį gavote iš nuomotojo \u2014 automatiškai prisijungsite prie buto.', role: 'tenant' },
    { q: 'Kuo skiriasi skaitiklių paskirstymo metodai?', a: 'Per butą \u2014 visiems po lygiai. Per žmogų \u2014 dalijama pagal gyventojų skaičių. Per suvartojimą \u2014 kiekvienas moka pagal savo skaitiklio rodmenį. Detalesnius pavyzdžius rasite \u201eSkaitikliai ir sąskaitos\u201c skiltyje.', role: 'all' },
    { q: 'Kaip sukurti sąskaitą nuomininkui?', a: 'Sąskaitų skiltyje spauskite \u201e+ Nauja sąskaita\u201c, pasirinkite butą ir laikotarpį. Sistema automatiškai paims skaitiklių rodmenis ir apskaičiuos sumą pagal nustatytus tarifus.', role: 'landlord' },
    { q: 'Kaip pateikti remonto užklausą?', a: 'Remonto skiltyje spauskite \u201e+ Nauja užklausa\u201c, aprašykite gedimą ir pridėkite nuotraukas. Nuomotojas gaus pranešimą ir galės sekti taisymo eigą.', role: 'tenant' },
    { q: 'Ar galiu pakeisti savo rolę?', a: 'Taip! Nustatymuose rasite rolės keitimo galimybę. Galite perjungti tarp nuomotojo ir nuomininko rolių bet kada.', role: 'all' },
    { q: 'Kaip veikia žinučių sistema?', a: 'Spauskite žinučių ikoną šoniniame meniu arba prie nuomininko/nuomotojo vardo. Žinutės saugomos ir prieinamos bet kada. Gausite pranešimą apie kiekvieną naują žinutę.', role: 'all' },
    { q: 'Ar Nuomoria veikia telefone?', a: 'Taip! Nuomoria pilnai pritaikyta telefonams, planšetėms ir kompiuteriams. Dizainas automatiškai prisitaiko prie ekrano dydžio.', role: 'all' },
    { q: 'Pamiršau įvesti skaitiklių rodmenis \u2014 ką daryti?', a: 'Sistema siunčia priminimus prieš terminą. Jei terminas praėjo \u2014 parašykite nuomotojui per žinučių sistemą, jis gali leisti pavėluotą įvedimą.', role: 'tenant' },
    { q: 'Ar mano duomenys saugūs?', a: 'Absoliučiai. Naudojame Supabase infrastruktūrą su griežtomis saugumo politikomis (RLS). Kiekvienas vartotojas mato tik savo duomenis, o Google OAuth garantuoja aukščiausio lygio apsaugą.', role: 'all' },
];

const WHATS_NEW = [
    { date: '2026-02', title: 'Rolės keitimas', desc: 'Galimybė perjungti tarp nuomotojo ir nuomininko rolių.' },
    { date: '2026-01', title: 'Analitikos eksportas', desc: 'Duomenų eksportavimas CSV formatu iš analitikos skilties.' },
    { date: '2025-12', title: 'Žinučių sistema', desc: 'Integruotos žinutės tarp nuomotojo ir nuomininko.' },
    { date: '2025-11', title: 'Remonto užklausos', desc: 'Nuotraukų pridėjimas prie remonto užklausų.' },
];

/* ═══════════════════════════════════════════════
   Hooks
   ═══════════════════════════════════════════════ */
function useInView(options?: IntersectionObserverInit) {
    const ref = useRef<HTMLElement>(null);
    const [isVisible, setIsVisible] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) { setIsVisible(true); obs.unobserve(el); }
        }, { threshold: 0.1, ...options });
        obs.observe(el);
        return () => obs.disconnect();
    }, []);
    return { ref, isVisible };
}

/* ═══════════════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════════════ */

/** Desktop sidebar table of contents */
function SidebarNav({ sections, active, onSelect }: {
    sections: Section[];
    active: string;
    onSelect: (id: string) => void;
}) {
    return (
        <nav className="hidden lg:block sticky top-24 w-56 flex-shrink-0 self-start">
            <div className="bg-gray-950/70 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-4 shadow-2xl shadow-black/30">
                <p className="text-[10px] font-bold text-white/50 uppercase tracking-[0.15em] mb-4 px-2 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                    Turinys
                </p>
                <div className="space-y-0.5">
                    {sections.map(s => {
                        const Icon = s.icon;
                        const isActive = active === s.id;
                        return (
                            <button
                                key={s.id}
                                onClick={() => onSelect(s.id)}
                                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 text-left group relative ${isActive
                                    ? 'bg-teal-500/[0.12] text-teal-300'
                                    : 'text-white/60 hover:text-white hover:bg-white/[0.04]'
                                    }`}
                            >
                                {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-teal-400" />}
                                <Icon className={`w-4 h-4 flex-shrink-0 transition-colors ${isActive ? 'text-teal-400' : 'text-white/40 group-hover:text-white/70'}`} />
                                <span className="truncate">{s.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </nav>
    );
}

/** Mobile floating ToC button + drawer */
function MobileNavDrawer({ sections, active, onSelect }: {
    sections: Section[];
    active: string;
    onSelect: (id: string) => void;
}) {
    const [open, setOpen] = useState(false);
    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="lg:hidden fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-teal-500 text-white shadow-md flex items-center justify-center hover:scale-105 transition-transform"
                aria-label="Turinys"
            >
                <ListBulletIcon className="w-5 h-5" />
            </button>
            {open && (
                <div className="lg:hidden fixed inset-0 z-[60]" onClick={() => setOpen(false)}>
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <div
                        className="absolute bottom-0 left-0 right-0 bg-gray-950 border-t border-gray-800/80 rounded-t-2xl p-5 animate-slideUp"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-sm font-semibold text-white">Turinys</p>
                            <button onClick={() => setOpen(false)} className="text-white/50 hover:text-white">
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-1">
                            {sections.map(s => {
                                const Icon = s.icon;
                                return (
                                    <button
                                        key={s.id}
                                        onClick={() => { onSelect(s.id); setOpen(false); }}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${active === s.id ? 'bg-teal-500/15 text-teal-400' : 'text-white/70 hover:text-white'}`}
                                    >
                                        <Icon className="w-4.5 h-4.5" />
                                        {s.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

/** Role toggle pills */
function RoleToggle({ value, onChange }: { value: Role; onChange: (r: Role) => void }) {
    const opts: { value: Role; label: string }[] = [
        { value: 'all', label: 'Visi' },
        { value: 'landlord', label: 'Nuomotojas' },
        { value: 'tenant', label: 'Nuomininkas' },
    ];
    return (
        <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-white/[0.06] border border-white/[0.08]">
            {opts.map(o => (
                <button
                    key={o.value}
                    onClick={() => onChange(o.value)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${value === o.value
                        ? 'bg-teal-500 text-white'
                        : 'text-white/70 hover:text-white'
                        }`}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
}


/** Horizontal workflow timeline */
function TimelineFlow({ steps }: {
    steps: { icon: React.ComponentType<{ className?: string }>; label: string; sub?: string }[];
}) {
    return (
        <div className="flex flex-wrap items-start gap-1 my-6">
            {steps.map((s, i) => {
                const Icon = s.icon;
                return (
                    <React.Fragment key={i}>
                        <div className="flex flex-col items-center text-center w-[7.5rem] group">
                            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mb-2.5 group-hover:border-teal-500/40 group-hover:bg-teal-500/20 transition-all duration-300">
                                <Icon className="w-5 h-5 text-teal-400" />
                            </div>
                            <span className="text-[13px] font-semibold text-white leading-tight">{s.label}</span>
                            {s.sub && <span className="text-[11px] text-white/50 mt-1">{s.sub}</span>}
                        </div>
                        {i < steps.length - 1 && (
                            <div className="flex items-center pt-4 px-0.5">
                                <div className="flex items-center gap-0.5">
                                    <span className="w-1 h-1 rounded-full bg-white/30" />
                                    <span className="w-1 h-1 rounded-full bg-white/20" />
                                    <span className="w-1 h-1 rounded-full bg-white/10" />
                                    <ChevronRightIcon className="w-3.5 h-3.5 text-white/30" />
                                </div>
                            </div>
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}

/** Section wrapper */
function GuideSection({ children, id, sectionRef, className = '' }: {
    children: React.ReactNode;
    id: string;
    sectionRef: (el: HTMLElement | null) => void;
    className?: string;
}) {
    return (
        <section
            ref={sectionRef}
            id={id}
            className={`scroll-mt-24 ${className}`}
        >
            <div className="space-y-6">
                {children}
            </div>
        </section>
    );
}

/** Pro tip callout */
function ProTip({ children }: { children: React.ReactNode }) {
    return (
        <div className="relative flex items-start gap-3 p-4 pl-5 rounded-xl bg-teal-500/[0.08] border border-teal-500/20 backdrop-blur-sm overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-teal-500 rounded-full" />
            <LightBulbIcon className="w-5 h-5 text-teal-400 flex-shrink-0 mt-0.5" />
            <div className="text-[13px] text-white/80 leading-relaxed">{children}</div>
        </div>
    );
}

/** Content card with icon header — always open */
function ExpandableCard({ icon: Icon, title, children, gradient = 'from-teal-500 to-cyan-500' }: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
    gradient?: string;
}) {
    return (
        <div className="bg-gray-950/80 backdrop-blur-xl border border-white/[0.08] rounded-2xl overflow-hidden relative">
            {/* Subtle top-edge accent */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-teal-500/30" />
            <div className="flex items-center gap-3.5 p-5 pb-4">
                <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-white" />
                </div>
                <span className="flex-1 text-[15px] font-bold text-white tracking-tight">{title}</span>
            </div>
            <div className="px-5 pb-5 pt-0 border-t border-white/[0.05] mt-0">
                {children}
            </div>
        </div>
    );
}

/** Meter calculation visual */
function MeterCalculation() {
    return (
        <div className="bg-gray-950/80 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 my-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-teal-500/30" />
            <h4 className="text-sm font-bold text-white mb-5 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center">
                    <CalculatorIcon className="w-4 h-4 text-white" />
                </div>
                Skaičiavimo pavyzdys
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                {[
                    { label: 'Butai', val: '4' },
                    { label: 'Žmonės', val: '8' },
                    { label: 'Suvartojimas', val: '100 m³' },
                    { label: 'Tarifas', val: '2.00 €/m³' },
                ].map(s => (
                    <div key={s.label} className="bg-white/[0.05] rounded-xl p-3.5 text-center border border-white/[0.06]">
                        <p className="text-[10px] text-white/50 uppercase tracking-wider mb-1.5">{s.label}</p>
                        <p className="text-sm font-bold text-white font-mono">{s.val}</p>
                    </div>
                ))}
            </div>
            <div className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-3">Bendra suma: <span className="text-teal-400 text-sm">200.00 €</span></div>
            <div className="space-y-2.5">
                {[
                    { method: 'Per butą', calc: '200€ ÷ 4 butai', result: '50.00 € / butas', color: 'border-teal-500/30 bg-teal-500/[0.06]' },
                    { method: 'Per žmogų', calc: '200€ ÷ 8 žmonės', result: '25.00 € / žmogus', color: 'border-blue-500/30 bg-blue-500/[0.06]' },
                    { method: 'Per suvartojimą', calc: 'Butas A (30m³) → 60€, Butas B (20m³) → 40€, ...', result: 'pagal tikrą vartojimą', color: 'border-emerald-500/30 bg-emerald-500/[0.06]' },
                ].map(m => (
                    <div key={m.method} className={`rounded-xl border p-4 ${m.color} hover:brightness-125 transition-all duration-200`}>
                        <div className="flex items-center justify-between flex-wrap gap-2">
                            <span className="text-sm font-bold text-white">{m.method}</span>
                            <span className="text-xs font-mono text-white/60">{m.calc}</span>
                        </div>
                        <p className="text-xs text-white/60 mt-1.5">→ <span className="text-white font-medium">{m.result}</span></p>
                    </div>
                ))}
            </div>
        </div>
    );
}

/** What's New */
function WhatsNew() {
    return (
        <div className="bg-gray-950/80 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-violet-500/30" />
            <h4 className="text-sm font-bold text-white mb-5 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-violet-500 flex items-center justify-center">
                    <SparklesIcon className="w-4 h-4 text-white" />
                </div>
                Kas naujo
            </h4>
            <div className="space-y-0 relative">
                {/* Vertical timeline line */}
                <div className="absolute left-[3px] top-2 bottom-2 w-[2px] bg-violet-500/20" />
                {WHATS_NEW.map((item, i) => (
                    <div key={i} className="flex items-start gap-4 relative pl-5 pb-4 last:pb-0">
                        <span className="absolute left-0 top-1.5 w-2 h-2 rounded-full bg-violet-400 ring-2 ring-gray-950 z-10" />
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-[10px] font-mono text-violet-400 bg-violet-500/10 rounded-md px-2 py-0.5 border border-violet-500/20">{item.date}</span>
                                <p className="text-[13px] font-semibold text-white">{item.title}</p>
                            </div>
                            <p className="text-xs text-white/60 leading-relaxed">{item.desc}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

/** Numbered step card */
function StepCard({ step, icon: Icon, title, description, isLast = false }: {
    step: number;
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    description: string;
    isLast?: boolean;
}) {
    return (
        <div className="relative flex gap-4 group">
            {!isLast && (
                <div className="absolute left-5 top-12 w-[2px] h-[calc(100%-1rem)] bg-teal-500/20" />
            )}
            <div className="relative z-10 flex-shrink-0 w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center text-white font-bold text-sm">
                {step}
            </div>
            <div className="pb-7 flex-1 pt-0.5">
                <div className="flex items-center gap-2 mb-1.5">
                    <Icon className="w-4 h-4 text-teal-400" />
                    <h4 className="font-bold text-white text-sm">{title}</h4>
                </div>
                <p className="text-[13px] text-white/70 leading-relaxed">{description}</p>
            </div>
        </div>
    );
}

/** FAQ row */
function FAQRow({ item, isOpen, onToggle }: { item: FAQItem; isOpen: boolean; onToggle: () => void }) {
    return (
        <div className={`border-b border-white/[0.06] last:border-0 transition-colors ${isOpen ? 'bg-white/[0.02]' : ''}`}>
            <button onClick={onToggle} className="w-full flex items-center justify-between py-4 px-3 text-left group">
                <div className="flex items-center gap-2.5">
                    <QuestionMarkCircleIcon className={`w-4 h-4 flex-shrink-0 transition-colors ${isOpen ? 'text-teal-400' : 'text-white/40 group-hover:text-white/70'}`} />
                    <span className={`text-sm font-medium transition-colors ${isOpen ? 'text-teal-300' : 'text-white/80 group-hover:text-white'}`}>
                        {item.q}
                    </span>
                </div>
                <ChevronRightIcon className={`w-4 h-4 text-white/40 flex-shrink-0 ml-4 transition-all duration-200 ${isOpen ? 'rotate-90 text-teal-400' : 'group-hover:text-white/70'}`} />
            </button>
            {isOpen && (
                <div className="pb-4 px-3 pl-10 animate-fadeIn">
                    <p className="text-[13px] text-white/70 leading-relaxed">{item.a}</p>
                </div>
            )}
        </div>
    );
}

/** Section heading */
function SectionHeading({ icon: Icon, title, subtitle, gradient = 'from-teal-500 to-cyan-500' }: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    subtitle: string;
    gradient?: string;
}) {
    return (
        <div className="mb-8">
            <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 rounded-2xl bg-teal-500 flex items-center justify-center">
                    <Icon className="w-5.5 h-5.5 text-white" />
                </div>
                <div>
                    <h2 className="text-2xl font-extrabold text-white tracking-tight">{title}</h2>
                    <p className="text-sm text-white/60 mt-1">{subtitle}</p>
                </div>
            </div>
            <div className="h-[2px] bg-teal-500/20 rounded-full" />
        </div>
    );
}

/** Related topics links */
function RelatedTopics({ links }: { links: { label: string; sectionId: string }[] }) {
    return (
        <div className="mt-8 pt-5 border-t border-white/[0.06]">
            <p className="text-[10px] font-bold text-white/50 uppercase tracking-[0.15em] mb-3 flex items-center gap-1.5">
                <ArrowRightIcon className="w-3 h-3" />
                Susijusios temos
            </p>
            <div className="flex flex-wrap gap-2">
                {links.map(l => (
                    <a
                        key={l.sectionId}
                        href={`#${l.sectionId}`}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs font-medium text-white/60 hover:text-teal-300 hover:bg-teal-500/[0.08] hover:border-teal-500/25 transition-all duration-200"
                    >
                        <ChevronRightIcon className="w-3 h-3" />
                        {l.label}
                    </a>
                ))}
            </div>
        </div>
    );
}

/** Dark glass card wrapper */
function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`bg-gray-950/80 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 hover:border-white/[0.12] transition-colors duration-300 ${className}`}>
            {children}
        </div>
    );
}

/* ═══════════════════════════════════════════════
   Main Page
   ═══════════════════════════════════════════════ */
export default function GuidePage() {
    const [role, setRole] = useState<Role>('all');
    const [activeSection, setActiveSection] = useState('pradzia');
    const [openFAQ, setOpenFAQ] = useState<number | null>(null);
    const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
    const navigate = useNavigate();

    // Scroll spy
    useEffect(() => {
        const obs = new IntersectionObserver(
            entries => {
                entries.forEach(e => {
                    if (e.isIntersecting) setActiveSection(e.target.id);
                });
            },
            { rootMargin: '-20% 0px -70% 0px' }
        );
        Object.values(sectionRefs.current).forEach(el => { if (el) obs.observe(el); });
        return () => obs.disconnect();
    }, [role]);

    /** Sections visible for the current role filter.
     *  When a specific role is selected, only that role's sections are shown. */
    const filteredSections = useMemo(() =>
        SECTIONS.filter(s => role === 'all' ? true : s.role === role),
        [role]
    );

    /** FAQ items visible for the current role filter.
     *  When a specific role is selected, only that role's FAQs are shown. */
    const filteredFAQ = useMemo(() =>
        FAQ_ITEMS.filter(f => role === 'all' ? true : f.role === role),
        [role]
    );

    const scrollToSection = useCallback((id: string) => {
        setActiveSection(id);
        sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, []);

    const setSectionRef = useCallback((id: string) => (el: HTMLElement | null) => {
        sectionRefs.current[id] = el;
    }, []);

    /** Whether a section/content block with the given role should be shown.
     *  When a specific role is selected, only that role's sections appear (no generic 'all' sections). */
    const shouldShow = (sectionRole: Role) => role === 'all' ? true : sectionRole === role;

    return (
        <div className="min-h-screen bg-black relative">
            {/* Full-page B/W city background */}
            <div className="fixed inset-0 z-0">
                <img
                    src="/images/HelpCenterBackground_bw.webp"
                    alt=""
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/70" />
            </div>
            {/* ──── Hero ──── */}
            <div className="relative z-10 overflow-hidden">
                <div className="relative max-w-6xl mx-auto px-4 py-14 lg:py-20">
                    <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
                        <div>
                            <button
                                onClick={() => navigate(-1)}
                                className="group inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.06] border border-white/[0.1] text-white/70 hover:text-white hover:bg-white/[0.1] hover:border-white/[0.18] text-xs font-semibold tracking-wide transition-all duration-200 mb-5"
                            >
                                <ArrowLeftIcon className="w-3.5 h-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
                                Grįžti
                            </button>
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.1] text-teal-300 text-[11px] font-semibold tracking-[0.1em] uppercase mb-5">
                                <BookOpenIcon className="w-3.5 h-3.5" />
                                Pagalbos centras
                            </div>
                            <h1 className="text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-4">
                                Nuomoria gidas
                            </h1>
                            <p className="text-base lg:text-lg text-white/70 max-w-lg leading-relaxed">
                                Viskas, ką reikia žinoti — nuo pirmojo prisijungimo iki kasdienio naudojimosi.
                            </p>
                        </div>
                        <div className="flex items-center">
                            <RoleToggle value={role} onChange={setRole} />
                        </div>
                    </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/70 to-transparent" />
            </div>

            {/* ──── Layout: Sidebar + Content ──── */}
            <div className="relative z-10 max-w-6xl mx-auto px-4 py-10 flex gap-10">
                <SidebarNav sections={filteredSections} active={activeSection} onSelect={scrollToSection} />
                <MobileNavDrawer sections={filteredSections} active={activeSection} onSelect={scrollToSection} />

                <div className="flex-1 min-w-0 space-y-24">

                    {/* ═══ SECTION 1: Darbo pradžia ═══ */}
                    {shouldShow('all') && (
                        <GuideSection id="pradzia" sectionRef={setSectionRef('pradzia')}>
                            <SectionHeading icon={RocketLaunchIcon} title="Darbo pradžia" subtitle="Kaip pradėti naudotis Nuomoria" />

                            <GlassCard>
                                <h3 className="text-base font-semibold text-white mb-5 flex items-center gap-2">
                                    <ArrowRightIcon className="w-4 h-4 text-teal-400" />
                                    Registracija ir prisijungimas
                                </h3>
                                <StepCard step={1} icon={GlobeAltIcon} title="Atidarykite Nuomoria" description="Eikite į Nuomoria svetainę naršyklėje — kompiuteryje, telefone ar planšetėje." />
                                <StepCard step={2} icon={KeyIcon} title="Prisijunkite su Google" description={'Spauskite \u201eTęsti su Google\u201c ir pasirinkite savo Google paskyrą. Jokio atskiro slaptažodžio nereikia — paskyra sukuriama automatiškai.'} />
                                <StepCard step={3} icon={UserCircleIcon} title="Pasirinkite rolę" description="Pirmą kartą prisijungę, pasirinkite: Nuomotojas (valdote turtą) arba Nuomininkas (nuomojatės butą). Rolę galite pakeisti vėliau nustatymuose." isLast />
                            </GlassCard>

                            <ProTip>
                                <strong>Greitas startas:</strong> Prisijungimas užtrunka ~10 sekundžių. Jokių formų pildyti nereikia — Google paskyra suteikia viską, ko reikia.
                            </ProTip>

                            <GlassCard>
                                <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                                    <ShieldCheckIcon className="w-4 h-4 text-teal-400" />
                                    Kodėl tik Google prisijungimas?
                                </h4>
                                <div className="space-y-2 text-[13px] text-white/70 leading-relaxed">
                                    <p>
                                        Nuomoria naudoja <strong className="text-white">tik „Google" prisijungimą</strong> dėl kelių svarbių priežasčių:
                                    </p>
                                    <ul className="space-y-1.5 ml-1">
                                        <li className="flex items-start gap-2">
                                            <CheckCircleIcon className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
                                            <span><strong className="text-white">Saugumas</strong> — Google OAuth 2.0 užtikrina aukščiausio lygio apsaugą be slaptažodžių saugojimo mūsų serveriuose.</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <CheckCircleIcon className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
                                            <span><strong className="text-white">Paprastumas</strong> — jokių registracijos formų, slaptažodžių kūrimo ar el. pašto patvirtinimų. Vienas paspaudimas ir esate viduje.</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <CheckCircleIcon className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
                                            <span><strong className="text-white">Patikimumas</strong> — nereikia atsiminti dar vieno slaptažodžio. Jūsų Google paskyra yra jūsų raktas.</span>
                                        </li>
                                    </ul>
                                </div>
                            </GlassCard>

                            <ExpandableCard icon={EnvelopeIcon} title="Pakvietimų sistema — kaip tai veikia?" defaultOpen>
                                <p className="text-sm text-white/70 mb-4">Nuomotojas kviečia nuomininką prisijungti prie konkretaus buto. Procesas:</p>
                                <TimelineFlow steps={[
                                    { icon: ClipboardDocumentCheckIcon, label: 'Nuomotojas sukuria kodą', sub: 'Pasirenka butą' },
                                    { icon: EnvelopeIcon, label: 'Kodas perduodamas', sub: 'El. paštu ar žinutėmis' },
                                    { icon: KeyIcon, label: 'Nuomininkas įveda kodą', sub: 'Prisijungimo metu' },
                                    { icon: CheckCircleIcon, label: 'Prisijungta!', sub: 'Automatiškai' },
                                ]} />
                                <ProTip>Pakvietimo kodas galioja 7 dienas. Jei praėjo terminas — nuomotojas gali sukurti naują kodą vos keliais paspaudimais.</ProTip>
                            </ExpandableCard>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <GlassCard>
                                    <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                                        <BuildingOfficeIcon className="w-4 h-4 text-blue-400" />
                                        Nuomotojui — pirmi žingsniai
                                    </h4>
                                    <ol className="space-y-2 text-[13px] text-white/70">
                                        <li className="flex items-start gap-2"><span className="text-teal-400 font-bold">1.</span> Pridėkite adresą (pastatą)</li>
                                        <li className="flex items-start gap-2"><span className="text-teal-400 font-bold">2.</span> Sukurkite butus tame adrese</li>
                                        <li className="flex items-start gap-2"><span className="text-teal-400 font-bold">3.</span> Pakvieskite nuomininką su kodu</li>
                                        <li className="flex items-start gap-2"><span className="text-teal-400 font-bold">4.</span> Nustatykite skaitiklius ir tarifus</li>
                                        <li className="flex items-start gap-2"><span className="text-teal-400 font-bold">5.</span> Kurkite sąskaitas automatiškai</li>
                                    </ol>
                                </GlassCard>
                                <GlassCard>
                                    <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                                        <UserGroupIcon className="w-4 h-4 text-violet-400" />
                                        Nuomininkui — pirmi žingsniai
                                    </h4>
                                    <ol className="space-y-2 text-[13px] text-white/70">
                                        <li className="flex items-start gap-2"><span className="text-violet-400 font-bold">1.</span> Prisijunkite su Google paskyra</li>
                                        <li className="flex items-start gap-2"><span className="text-violet-400 font-bold">2.</span> Pasirinkite „Nuomininkas" rolę</li>
                                        <li className="flex items-start gap-2"><span className="text-violet-400 font-bold">3.</span> Įveskite pakvietimo kodą</li>
                                        <li className="flex items-start gap-2"><span className="text-violet-400 font-bold">4.</span> Peržiūrėkite savo butą ir sąskaitas</li>
                                        <li className="flex items-start gap-2"><span className="text-violet-400 font-bold">5.</span> Įveskite skaitiklių rodmenis</li>
                                    </ol>
                                </GlassCard>
                            </div>

                            <RelatedTopics links={[
                                { label: 'Nuomotojo gidas', sectionId: 'nuomotojas' },
                                { label: 'Nuomininko gidas', sectionId: 'nuomininkas' },
                                { label: 'DUK', sectionId: 'duk' },
                            ]} />
                        </GuideSection>
                    )}

                    {/* ═══ SECTION 2: Nuomotojo gidas ═══ */}
                    {shouldShow('landlord') && (
                        <GuideSection id="nuomotojas" sectionRef={setSectionRef('nuomotojas')}>
                            <SectionHeading icon={BuildingOfficeIcon} title="Nuomotojo gidas" subtitle="Žingsnis po žingsnio — visas valdymo procesas" />

                            <ExpandableCard icon={HomeModernIcon} title="Turto valdymas — adresai ir butai" defaultOpen>
                                <p className="text-sm text-white/70 mb-4">Nuomoria naudoja dviejų lygmenų struktūrą: <strong className="text-white">Adresas</strong> (pastatas) → <strong className="text-white">Butai</strong> (atskiri vienetai).</p>
                                <TimelineFlow steps={[
                                    { icon: BuildingOfficeIcon, label: 'Pridėkite adresą', sub: 'Pastato vieta' },
                                    { icon: HomeModernIcon, label: 'Sukurkite butus', sub: 'Numeris, plotas, kaina' },
                                    { icon: AdjustmentsHorizontalIcon, label: 'Nustatykite skaitiklius', sub: 'Vanduo, elektra, dujos' },
                                    { icon: UsersIcon, label: 'Pakvieskite nuomininkus', sub: 'Per kodą' },
                                ]} />
                                <ProTip>Kiekvienam butui galite nustatyti individualius tarifus ir skaitiklių paskirstymo metodus. Tai ypač naudinga, kai skirtingi butai turi skirtingas sąlygas.</ProTip>
                            </ExpandableCard>

                            <ExpandableCard icon={UsersIcon} title="Nuomininkų valdymas">
                                <div className="space-y-3 text-sm text-white/70">
                                    <p>Nuomininkų skiltyje matote visus savo nuomininkus, jų kontaktus, butus ir mokėjimų istoriją.</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                                        {[
                                            { icon: EnvelopeIcon, t: 'Pakvietimas', d: 'Sukurkite kodą ir pakvieskite naują nuomininką' },
                                            { icon: UserCircleIcon, t: 'Profilis', d: 'Peržiūrėkite kontaktus ir mokėjimų istoriją' },
                                            { icon: ChatBubbleLeftRightIcon, t: 'Komunikacija', d: 'Rašykite žinutes tiesiogiai per sistemą' },
                                            { icon: DocumentTextIcon, t: 'Sąskaitos', d: 'Matykite visas nuomininko sąskaitas vienoje vietoje' },
                                        ].map(item => (
                                            <div key={item.t} className="flex items-start gap-2.5 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                                                <item.icon className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="text-xs font-semibold text-white">{item.t}</p>
                                                    <p className="text-[11px] text-white/50">{item.d}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </ExpandableCard>

                            <ExpandableCard icon={DocumentTextIcon} title="Sąskaitų kūrimas">
                                <p className="text-sm text-white/70 mb-4">Sistema automatizuoja sąskaitų kūrimą — paima skaitiklių rodmenis ir apskaičiuoja sumą pagal tarifus.</p>
                                <TimelineFlow steps={[
                                    { icon: AdjustmentsHorizontalIcon, label: 'Nustatykite tarifus', sub: 'Kaina už vienetą' },
                                    { icon: CalculatorIcon, label: 'Nuomininkas įveda rodmenis', sub: 'Vanduo, elektra...' },
                                    { icon: DocumentTextIcon, label: 'Sistema skaičiuoja', sub: 'Automatiškai' },
                                    { icon: CheckCircleIcon, label: 'Sąskaita sukurta', sub: 'Su detalizacija' },
                                    { icon: BellIcon, label: 'Pranešimas išsiųstas', sub: 'Nuomininkui' },
                                ]} />
                            </ExpandableCard>

                            <ExpandableCard icon={WrenchScrewdriverIcon} title="Remonto užklausų valdymas">
                                <p className="text-sm text-white/70 mb-4">Nuomininkai praneša apie gedimus, jūs valdote procesą nuo pradžios iki pabaigos.</p>
                                <TimelineFlow steps={[
                                    { icon: WrenchScrewdriverIcon, label: 'Nuomininkas praneša', sub: 'Su nuotraukomis' },
                                    { icon: InformationCircleIcon, label: 'Peržiūrite užklausą', sub: 'Statusas: Naujas' },
                                    { icon: ArrowPathIcon, label: 'Pradėkite taisymą', sub: 'Statusas: Vykdomas' },
                                    { icon: CheckCircleIcon, label: 'Užbaikite', sub: 'Statusas: Atliktas' },
                                ]} />
                                <ProTip>Kiekvienas statuso pakeitimas automatiškai siunčia pranešimą nuomininkui — nereikia atskirai informuoti.</ProTip>
                            </ExpandableCard>

                            <ExpandableCard icon={ChartBarIcon} title="Analitika ir ataskaitos">
                                <div className="space-y-3 text-sm text-white/70">
                                    <p>Sekite pajamas, išlaidas ir kitas metrikas per interaktyvius grafikus.</p>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {['Pajamų grafikas', 'Laikotarpių palyginimas', 'Filtravimas pagal objektą', 'CSV eksportas'].map(f => (
                                            <span key={f} className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-xs font-medium text-cyan-400">{f}</span>
                                        ))}
                                    </div>
                                </div>
                            </ExpandableCard>

                            <RelatedTopics links={[
                                { label: 'Skaitikliai ir sąskaitos', sectionId: 'skaitikliai' },
                                { label: 'Komunikacija', sectionId: 'komunikacija' },
                                { label: 'Darbo pradžia', sectionId: 'pradzia' },
                            ]} />
                        </GuideSection>
                    )}

                    {/* ═══ SECTION 3: Nuomininko gidas ═══ */}
                    {shouldShow('tenant') && (
                        <GuideSection id="nuomininkas" sectionRef={setSectionRef('nuomininkas')}>
                            <SectionHeading icon={UserGroupIcon} title="Nuomininko gidas" subtitle="Visos galimybės ir darbo eiga" />

                            <GlassCard>
                                <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                                    <ArrowRightIcon className="w-4 h-4 text-violet-400" />
                                    Kaip prisijungti prie buto
                                </h3>
                                <StepCard step={1} icon={KeyIcon} title="Prisijunkite su Google" description="Atidarykite Nuomoria ir prisijunkite su savo Google paskyra." />
                                <StepCard step={2} icon={UserCircleIcon} title={'Pasirinkite \u201eNuomininkas\u201c rolę'} description="Pirmą kartą prisijungę — pasirinkite nuomininko rolę." />
                                <StepCard step={3} icon={ClipboardDocumentCheckIcon} title="Įveskite pakvietimo kodą" description="Įveskite 6 skaitmenų kodą, kurį gavote iš nuomotojo — automatiškai prisijungsite prie buto." isLast />
                            </GlassCard>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {[
                                    { icon: DocumentTextIcon, title: 'Sąskaitų peržiūra', desc: 'Visada žinosite, kiek ir už ką reikia mokėti. Visos sąskaitos su statusais ir terminais.', color: 'from-teal-500 to-cyan-500' },
                                    { icon: CalculatorIcon, title: 'Skaitiklių rodmenys', desc: 'Vandens, elektros, dujų rodmenis įvesite tiesiogiai per sistemą.', color: 'from-teal-500 to-cyan-500' },
                                    { icon: WrenchScrewdriverIcon, title: 'Remonto užklausos', desc: 'Užregistruokite gedimą su nuotraukomis ir sekite taisymo eigą.', color: 'from-teal-500 to-cyan-500' },
                                    { icon: ChatBubbleLeftRightIcon, title: 'Žinutės nuomotojui', desc: 'Parašykite nuomotojui tiesiogiai per integruotą žinučių sistemą.', color: 'from-teal-500 to-cyan-500' },
                                    { icon: BellIcon, title: 'Pranešimai', desc: 'Sistema praneš apie naujas sąskaitas, atsakymus ir remontus.', color: 'from-teal-500 to-cyan-500' },
                                    { icon: CogIcon, title: 'Nustatymai', desc: 'Tvarkykite profilį, kontaktinę informaciją ir pranešimų nustatymus.', color: 'from-teal-500 to-cyan-500' },
                                ].map((f, i) => {
                                    const FIcon = f.icon;
                                    return (
                                        <div key={i} className="bg-gray-950/90 backdrop-blur-md border border-white/[0.08] rounded-xl p-5 hover:border-white/[0.15] transition-colors duration-200">
                                            <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center mb-3">
                                                <FIcon className="w-4.5 h-4.5 text-white" />
                                            </div>
                                            <h4 className="font-semibold text-white text-sm mb-1">{f.title}</h4>
                                            <p className="text-[13px] text-white/70 leading-relaxed">{f.desc}</p>
                                        </div>
                                    );
                                })}
                            </div>

                            <ProTip>
                                <strong>Nepamirškite!</strong> Sistema siunčia priminimus prieš skaitiklių rodmenų terminą. Peržiūrėkite pranešimus reguliariai, kad nieko nepraleistumėte.
                            </ProTip>

                            <RelatedTopics links={[
                                { label: 'Skaitikliai ir sąskaitos', sectionId: 'skaitikliai' },
                                { label: 'Komunikacija', sectionId: 'komunikacija' },
                                { label: 'Darbo pradžia', sectionId: 'pradzia' },
                            ]} />
                        </GuideSection>
                    )}

                    {/* ═══ SECTION 4: Skaitikliai ir sąskaitos ═══ */}
                    {shouldShow('landlord') && (
                        <GuideSection id="skaitikliai" sectionRef={setSectionRef('skaitikliai')}>
                            <SectionHeading icon={CalculatorIcon} title="Skaitikliai ir sąskaitos" subtitle="Paskirstymo metodai, tarifai ir skaičiavimai" />

                            <GlassCard>
                                <h3 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
                                    <AdjustmentsHorizontalIcon className="w-4 h-4 text-emerald-400" />
                                    Trys paskirstymo metodai
                                </h3>
                                <p className="text-sm text-white/70 mb-4">Kiekvienas skaitiklis gali turėti individualų paskirstymo metodą. Pasirinkite tinkamiausią pagal situaciją.</p>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    {[
                                        { title: 'Per butą', desc: 'Visiems po lygiai — nepriklausomai nuo gyventojų skaičiaus.', icon: HomeModernIcon, color: 'text-teal-400 border-teal-500/30 bg-teal-500/[0.06]' },
                                        { title: 'Per žmogų', desc: 'Dalijama proporcingai pagal kiekvieno buto gyventojų skaičių.', icon: UsersIcon, color: 'text-blue-400 border-blue-500/30 bg-blue-500/[0.06]' },
                                        { title: 'Per suvartojimą', desc: 'Mokama pagal tikrą skaitiklio rodmenį — teisingiausia.', icon: ChartBarIcon, color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/[0.06]' },
                                    ].map(m => {
                                        const MIcon = m.icon;
                                        return (
                                            <div key={m.title} className={`rounded-xl border p-4 ${m.color}`}>
                                                <MIcon className="w-5 h-5 mb-2" />
                                                <p className="text-sm font-semibold text-white mb-1">{m.title}</p>
                                                <p className="text-xs text-white/60">{m.desc}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </GlassCard>

                            <MeterCalculation />

                            <ProTip>
                                <strong>Kada naudoti „Per suvartojimą"?</strong> Kai kiekvienas butas turi individualų skaitiklį. Tai skatina taupymą ir yra teisingiausia visiems nuomininkams.
                            </ProTip>

                            <ExpandableCard icon={DocumentTextIcon} title="Sąskaitos struktūra">
                                <div className="space-y-3 text-sm text-white/70">
                                    <p>Kiekviena sąskaita susideda iš:</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {[
                                            { t: 'Nuomos mokestis', d: 'Fiksuota mėnesinė suma' },
                                            { t: 'Komunaliniai', d: 'Pagal skaitiklių rodmenis' },
                                            { t: 'Papildomos paslaugos', d: 'Internetas, parkavimas ir kt.' },
                                            { t: 'Detalizacija', d: 'Kiekvieno skaitiklio rodmenys ir sumos' },
                                        ].map(item => (
                                            <div key={item.t} className="flex items-start gap-2 p-2.5 rounded-lg bg-white/[0.03]">
                                                <CheckCircleIcon className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="text-xs font-semibold text-white">{item.t}</p>
                                                    <p className="text-[11px] text-white/50">{item.d}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </ExpandableCard>

                            <RelatedTopics links={[
                                { label: 'Nuomotojo gidas', sectionId: 'nuomotojas' },
                                { label: 'Nuomininko gidas', sectionId: 'nuomininkas' },
                            ]} />
                        </GuideSection>
                    )}

                    {/* ═══ SECTION 5: Komunikacija ═══ */}
                    {shouldShow('all') && (
                        <GuideSection id="komunikacija" sectionRef={setSectionRef('komunikacija')}>
                            <SectionHeading icon={ChatBubbleLeftRightIcon} title="Komunikacija" subtitle="Žinutės, pranešimai ir remonto eiga" />

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <GlassCard>
                                    <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                                        <ChatBubbleLeftRightIcon className="w-4 h-4 text-amber-400" />
                                        Žinučių sistema
                                    </h4>
                                    <ul className="space-y-2 text-[13px] text-white/70">
                                        <li className="flex items-start gap-2"><CheckCircleIcon className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" /> Tiesioginės žinutės tarp nuomotojo ir nuomininko</li>
                                        <li className="flex items-start gap-2"><CheckCircleIcon className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" /> Žinutės saugomos ir prieinamos bet kada</li>
                                        <li className="flex items-start gap-2"><CheckCircleIcon className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" /> Pranešimai apie naujas žinutes</li>
                                        <li className="flex items-start gap-2"><CheckCircleIcon className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" /> Prieinama per šoninį meniu</li>
                                    </ul>
                                </GlassCard>
                                <GlassCard>
                                    <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                                        <BellIcon className="w-4 h-4 text-orange-400" />
                                        Pranešimai
                                    </h4>
                                    <ul className="space-y-2 text-[13px] text-white/70">
                                        <li className="flex items-start gap-2"><CheckCircleIcon className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" /> Naujos sąskaitos ir mokėjimo priminimai</li>
                                        <li className="flex items-start gap-2"><CheckCircleIcon className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" /> Remonto užklausų statusų atnaujinimai</li>
                                        <li className="flex items-start gap-2"><CheckCircleIcon className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" /> Skaitiklių rodmenų termino priminimai</li>
                                        <li className="flex items-start gap-2"><CheckCircleIcon className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" /> Pakvietimų statusų pasikeitimai</li>
                                    </ul>
                                </GlassCard>
                            </div>

                            <ExpandableCard icon={WrenchScrewdriverIcon} title="Remonto užklausų gyvavimo ciklas" defaultOpen>
                                <p className="text-sm text-white/70 mb-4">Kiekviena remonto užklausa praeina per aiškius etapus. Visi dalyviai informuojami automatiškai.</p>
                                <TimelineFlow steps={[
                                    { icon: CameraIcon, label: 'Nuomininkas praneša', sub: 'Prideda nuotraukas' },
                                    { icon: InformationCircleIcon, label: 'Naujas statusas', sub: 'Laukia peržiūros' },
                                    { icon: ArrowPathIcon, label: 'Vykdoma', sub: 'Taisymas pradėtas' },
                                    { icon: CheckCircleIcon, label: 'Atlikta', sub: 'Darbas baigtas' },
                                ]} />
                            </ExpandableCard>

                            <RelatedTopics links={[
                                { label: 'Nuomotojo gidas', sectionId: 'nuomotojas' },
                                { label: 'Nuomininko gidas', sectionId: 'nuomininkas' },
                            ]} />
                        </GuideSection>
                    )}

                    {/* ═══ SECTION 6: DUK ═══ */}
                    {shouldShow('all') && (
                        <GuideSection id="duk" sectionRef={setSectionRef('duk')}>
                            <SectionHeading icon={QuestionMarkCircleIcon} title="Dažnai užduodami klausimai" subtitle="Atsakymai į populiariausius klausimus" />

                            <GlassCard>
                                {filteredFAQ.length > 0 ? (
                                    filteredFAQ.map((item, i) => (
                                        <FAQRow
                                            key={i}
                                            item={item}
                                            isOpen={openFAQ === i}
                                            onToggle={() => setOpenFAQ(openFAQ === i ? null : i)}
                                        />
                                    ))
                                ) : (
                                    <div className="text-center py-8">
                                        <QuestionMarkCircleIcon className="w-8 h-8 text-white/30 mx-auto mb-3" />
                                        <p className="text-sm text-white/50">Nėra klausimų šiai rolei.</p>
                                        <button
                                            onClick={() => setRole('all')}
                                            className="mt-2 text-xs text-teal-400 hover:text-teal-300 font-medium"
                                        >
                                            Rodyti visus klausimus
                                        </button>
                                    </div>
                                )}
                            </GlassCard>
                        </GuideSection>
                    )}

                    {/* ──── What's New ──── */}
                    <div className="pt-4">
                        <WhatsNew />
                    </div>

                    {/* ──── Footer ──── */}
                    <footer className="pt-10 pb-4">
                        <div className="bg-gray-950/80 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 relative overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 h-[2px] bg-teal-500/25" />
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-teal-500 flex items-center justify-center">
                                        <BuildingOfficeIcon className="w-4.5 h-4.5 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white">Nuomoria</p>
                                        <p className="text-[11px] text-white/50">Profesionalus turto valdymas</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-5 text-xs text-white/50">
                                    <span className="flex items-center gap-1.5 hover:text-white transition-colors">
                                        <DevicePhoneMobileIcon className="w-3.5 h-3.5" />
                                        Veikia visuose įrenginiuose
                                    </span>
                                    <span className="flex items-center gap-1.5 hover:text-white transition-colors">
                                        <ShieldCheckIcon className="w-3.5 h-3.5" />
                                        Saugus prisijungimas
                                    </span>
                                </div>
                            </div>
                        </div>
                    </footer>
                </div>
            </div>

            {/* Global styles */}
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(100%); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-slideUp { animation: slideUp 0.3s ease-out; }
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
}
