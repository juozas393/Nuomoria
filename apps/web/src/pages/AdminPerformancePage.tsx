import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft, RefreshCw, Monitor, Smartphone, Tablet,
    MapPin, AlertCircle, Loader2, ExternalLink,
    ChevronDown, ChevronUp
} from 'lucide-react';
import { supabase } from '../lib/supabase';

// ─── Design Tokens ─── //
const card = 'bg-[#0c1a1f]/80 backdrop-blur-xl border border-white/[0.08] rounded-2xl';

// ─── Types ─── //
interface AnalyticsData {
    overview: {
        activeUsers: number; totalUsers: number; newUsers: number;
        pageViews: number; sessions: number; avgSessionDuration: number;
        bounceRate: number; engagementRate: number; eventCount: number;
        pagesPerSession: number;
    };
    pageViewsByDay: Array<{ date: string; views: number; users: number; sessions: number }>;
    topPages: Array<{ path: string; views: number; users: number; avgDuration: number }>;
    devices: Array<{ category: string; sessions: number; users: number; percentage: number }>;
    countries: Array<{ country: string; city: string; users: number; sessions: number }>;
    browsers: Array<{ browser: string; sessions: number }>;
    referrers: Array<{ source: string; sessions: number; users: number }>;
    operatingSystems: Array<{ os: string; sessions: number; users: number }>;
    peakHours: Array<{ hour: number; users: number; sessions: number }>;
    landingPages: Array<{ path: string; sessions: number; users: number }>;
    screenResolutions: Array<{ resolution: string; sessions: number }>;
}

type DateRange = '7d' | '14d' | '30d' | '90d';

// ─── Helpers ─── //
const fmtDur = (s: number) => { if (s < 60) return `${Math.round(s)}s`; return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`; };
const fmtNum = (n: number) => n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : n.toLocaleString('lt-LT');
const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`;

const PAGE_LABELS: Record<string, string> = {
    '/': 'Pradinis puslapis', '/dashboard': 'Valdymo skydelis', '/turtas': 'Turtas',
    '/butai': 'Butai', '/nuomininkai': 'Nuomininkai', '/skaitikliai': 'Skaitliukai',
    '/saskaitos': 'Sąskaitos', '/analitika': 'Analitika', '/remontas': 'Remontas',
    '/profilis': 'Profilis', '/nustatymai': 'Nustatymai', '/pagalba': 'Pagalba',
    '/login': 'Prisijungimas', '/tenant': 'Nuomininko skydelis',
    '/tenant/settings': 'Nuomininko nustatymai',
};
const ADMIN_ROUTES = new Set(['/admin', '/admin/performance', '/vartotojai', '/auth/callback']);
const DEVICE_LABELS: Record<string, string> = { desktop: 'Kompiuteris', mobile: 'Telefonas', tablet: 'Planšetė' };
const DEVICE_COLORS: Record<string, string> = { desktop: '#14b8a6', mobile: '#818cf8', tablet: '#f59e0b' };

// ─── KPI Card with color accent ─── //
const KPIBlock = memo<{ value: string; label: string; sub?: string; color: string }>(({ value, label, sub, color }) => (
    <div className={`${card} p-4 relative overflow-hidden`}>
        <div className="absolute top-0 left-0 w-1 h-full rounded-l-2xl" style={{ background: color }} />
        <p className="text-[26px] font-extrabold tabular-nums leading-none tracking-tight" style={{ color }}>{value}</p>
        <p className="text-[10px] font-medium text-gray-400 mt-2">{label}</p>
        {sub && <p className="text-[9px] text-gray-600 mt-0.5">{sub}</p>}
    </div>
));
KPIBlock.displayName = 'KPIBlock';

// ─── Chart ─── //
const DailyChart = memo<{ data: Array<{ date: string; views: number; users: number }> }>(({ data }) => {
    const max = Math.max(...data.map(d => d.views), 1);
    return (
        <div className="flex items-end gap-[3px] h-[140px]">
            {data.map((d, i) => {
                const h = Math.max((d.views / max) * 130, 2);
                const dt = new Date(d.date);
                const lbl = `${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
                const showLabel = i === 0 || i === data.length - 1 || (data.length > 14 ? i % Math.ceil(data.length / 6) === 0 : true);
                return (
                    <div key={i} className="flex-1 flex flex-col items-center justify-end group relative cursor-default">
                        <div className="absolute bottom-full mb-2 hidden group-hover:block z-20 pointer-events-none">
                            <div className="bg-[#0a1215] border border-white/[0.15] rounded-lg px-2.5 py-1.5 text-center whitespace-nowrap shadow-xl">
                                <p className="text-[8px] text-gray-400">{lbl}</p>
                                <p className="text-[12px] font-bold text-white tabular-nums">{d.views} perž.</p>
                                <p className="text-[8px] text-gray-500">{d.users} vartotojai</p>
                            </div>
                        </div>
                        <div className="w-full rounded-sm bg-gradient-to-t from-teal-600/80 to-teal-400/60 hover:from-teal-500 hover:to-teal-300/80 transition-all duration-150" style={{ height: h }} />
                        {showLabel && <span className="text-[7px] text-gray-600 mt-1.5 tabular-nums">{lbl}</span>}
                    </div>
                );
            })}
        </div>
    );
});
DailyChart.displayName = 'DailyChart';

// ─── Donut chart for devices ─── //
const DonutChart = memo<{ data: Array<{ category: string; percentage: number; sessions: number }> }>(({ data }) => {
    const size = 100;
    const stroke = 12;
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;

    return (
        <div className="flex items-center gap-5">
            <svg width={size} height={size} className="flex-shrink-0 -rotate-90">
                {data.map((d, i) => {
                    const segLen = (d.percentage / 100) * circumference;
                    const color = DEVICE_COLORS[d.category.toLowerCase()] || '#6b7280';
                    const el = (
                        <circle
                            key={i} cx={size / 2} cy={size / 2} r={radius}
                            fill="none" stroke={color} strokeWidth={stroke}
                            strokeDasharray={`${segLen} ${circumference - segLen}`}
                            strokeDashoffset={-offset}
                            strokeLinecap="round"
                            className="transition-all duration-500"
                        />
                    );
                    offset += segLen;
                    return el;
                })}
            </svg>
            <div className="space-y-2 flex-1">
                {data.map((d, i) => {
                    const color = DEVICE_COLORS[d.category.toLowerCase()] || '#6b7280';
                    const Icon = d.category.toLowerCase() === 'mobile' ? Smartphone : d.category.toLowerCase() === 'tablet' ? Tablet : Monitor;
                    return (
                        <div key={i} className="flex items-center gap-2.5">
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                            <Icon className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                            <span className="text-[11px] text-gray-300 flex-1">{DEVICE_LABELS[d.category.toLowerCase()] || d.category}</span>
                            <span className="text-[11px] font-semibold text-white tabular-nums">{d.percentage.toFixed(0)}%</span>
                            <span className="text-[9px] text-gray-500 tabular-nums">{d.sessions}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
});
DonutChart.displayName = 'DonutChart';

// ─── Hours heatmap ─── //
const HoursChart = memo<{ data: Array<{ hour: number; users: number }> }>(({ data }) => {
    const max = Math.max(...data.map(d => d.users), 1);
    const filled = Array.from({ length: 24 }, (_, h) => ({
        hour: h,
        users: data.find(d => d.hour === h)?.users || 0,
    }));
    return (
        <div className="flex items-end gap-[2px] h-[50px]">
            {filled.map((d) => {
                const h = Math.max((d.users / max) * 44, 1);
                const intensity = d.users > 0 ? 0.25 + (d.users / max) * 0.75 : 0.06;
                return (
                    <div key={d.hour} className="flex-1 flex flex-col items-center justify-end group relative cursor-default">
                        <div className="absolute bottom-full mb-1 hidden group-hover:block z-20 pointer-events-none">
                            <div className="bg-[#0a1215] border border-white/[0.15] rounded px-1.5 py-0.5 text-center whitespace-nowrap">
                                <p className="text-[8px] text-white font-semibold">{String(d.hour).padStart(2, '0')}:00 — {d.users} vart.</p>
                            </div>
                        </div>
                        <div className="w-full rounded-[1px]" style={{ height: h, background: `rgba(20, 184, 166, ${intensity})` }} />
                        {d.hour % 6 === 0 && <span className="text-[6px] text-gray-600 mt-0.5">{String(d.hour).padStart(2, '0')}</span>}
                    </div>
                );
            })}
        </div>
    );
});
HoursChart.displayName = 'HoursChart';

// ─── Compact list row ─── //
const ListRow = memo<{ label: string; value: string | number; sub?: string; dot?: string }>(({ label, value, sub, dot }) => (
    <div className="flex items-center gap-2.5 py-1.5 group">
        {dot && <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: dot }} />}
        <span className="text-[11px] text-gray-300 flex-1 truncate group-hover:text-white transition-colors">{label}</span>
        {sub && <span className="text-[9px] text-gray-600 flex-shrink-0">{sub}</span>}
        <span className="text-[10px] text-gray-400 tabular-nums font-medium flex-shrink-0">{value}</span>
    </div>
));
ListRow.displayName = 'ListRow';

// ─── Main ─── //
const AdminPerformancePage: React.FC = () => {
    const navigate = useNavigate();
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dateRange, setDateRange] = useState<DateRange>('30d');
    const [refreshing, setRefreshing] = useState(false);
    const [showAllPages, setShowAllPages] = useState(false);

    const fetchAnalytics = useCallback(async (range: DateRange) => {
        try {
            setError(null);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { setError('Nėra sesijos.'); return; }
            const res = await supabase.functions.invoke('ga-analytics', {
                body: { dateRange: range },
                headers: { Authorization: `Bearer ${session.access_token}` },
            });
            if (res.error) throw new Error(res.error.message);
            if (res.data?.error) throw new Error(res.data.error);
            setData(res.data as AnalyticsData);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Klaida');
        }
    }, []);

    useEffect(() => { setLoading(true); fetchAnalytics(dateRange).finally(() => setLoading(false)); }, [dateRange, fetchAnalytics]);
    const handleRefresh = async () => { setRefreshing(true); await fetchAnalytics(dateRange); setRefreshing(false); };

    const userPages = useMemo(() => data?.topPages?.filter(p => !ADMIN_ROUTES.has(p.path)) || [], [data?.topPages]);
    const topPagesDisplay = useMemo(() => showAllPages ? userPages : userPages.slice(0, 10), [userPages, showAllPages]);
    const userLandingPages = useMemo(() => data?.landingPages?.filter(p => !ADMIN_ROUTES.has(p.path)) || [], [data?.landingPages]);

    const ov = data?.overview;

    return (
        <div className="min-h-full relative overflow-hidden bg-cover bg-center bg-fixed" style={{ backgroundImage: `url('/imagesGen/DashboardImage.webp')` }}>
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(3,12,10,0.92) 0%, rgba(6,20,18,0.88) 40%, rgba(8,25,22,0.85) 70%, rgba(3,12,10,0.92) 100%)' }} />
            <div className="relative z-10 p-4 lg:p-6 space-y-4 max-w-7xl mx-auto">

                {/* ─── Header ─── */}
                <div className={`${card} px-5 py-4`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button onClick={() => navigate('/admin')} className="w-8 h-8 rounded-lg bg-white/[0.06] hover:bg-white/[0.10] flex items-center justify-center transition-colors">
                                <ArrowLeft className="w-3.5 h-3.5 text-gray-400" />
                            </button>
                            <div>
                                <h1 className="text-[15px] font-bold text-white tracking-tight">Svetainės analitika</h1>
                                <p className="text-[10px] text-gray-500 mt-0.5">Google Analytics</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex rounded-lg border border-white/[0.08] overflow-hidden">
                                {(['7d', '14d', '30d', '90d'] as DateRange[]).map(k => (
                                    <button key={k} onClick={() => setDateRange(k)}
                                        className={`px-2.5 py-1.5 text-[9px] font-semibold transition-colors ${dateRange === k ? 'bg-teal-500/15 text-teal-400' : 'text-gray-500 hover:text-gray-300'}`}>
                                        {k.replace('d', ' d.')}
                                    </button>
                                ))}
                            </div>
                            <button onClick={handleRefresh} disabled={refreshing || loading}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-500/15 text-teal-400 border border-teal-500/20 rounded-lg text-[10px] font-semibold hover:bg-teal-500/25 transition-colors disabled:opacity-40">
                                <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} /> Atnaujinti
                            </button>
                            <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1 px-2.5 py-1.5 text-gray-500 hover:text-gray-300 text-[10px] font-medium transition-colors">
                                <ExternalLink className="w-3 h-3" /> GA4
                            </a>
                        </div>
                    </div>
                </div>

                {/* ─── Loading / Error ─── */}
                {loading && (
                    <div className={`${card} p-16 flex items-center justify-center gap-3`}>
                        <Loader2 className="w-5 h-5 text-teal-500 animate-spin" />
                        <p className="text-[11px] text-gray-400">Gaunami duomenys...</p>
                    </div>
                )}
                {!loading && error && (
                    <div className={`${card} p-8 text-center`}>
                        <AlertCircle className="w-5 h-5 text-amber-400 mx-auto mb-2" />
                        <p className="text-[11px] text-gray-300 mb-3">{error}</p>
                        <button onClick={handleRefresh} className="px-3 py-1.5 bg-teal-500/15 text-teal-400 border border-teal-500/20 rounded-lg text-[10px] font-semibold">Bandyti dar kartą</button>
                    </div>
                )}

                {/* ─── Data ─── */}
                {!loading && !error && ov && data && (
                    <>
                        {/* KPI Row — colored accent numbers */}
                        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                            <KPIBlock value={fmtNum(ov.activeUsers)} label="Aktyvūs vartotojai" sub={`${ov.newUsers} nauji`} color="#14b8a6" />
                            <KPIBlock value={fmtNum(ov.pageViews)} label="Puslapių peržiūros" sub={`${ov.pagesPerSession.toFixed(1)} / sesija`} color="#818cf8" />
                            <KPIBlock value={fmtNum(ov.sessions)} label="Sesijos" sub={`${fmtNum(ov.eventCount)} įvykiai`} color="#f59e0b" />
                            <KPIBlock value={fmtDur(ov.avgSessionDuration)} label="Vid. sesijos trukmė" color="#f472b6" />
                            <KPIBlock value={fmtPct(ov.engagementRate)} label="Įsitraukimas" sub={`${fmtPct(ov.bounceRate)} atmetimo`} color="#34d399" />
                        </div>

                        {/* Row 1: Chart + Devices donut */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            <div className={`${card} p-5 lg:col-span-2`}>
                                <div className="flex items-center justify-between mb-4">
                                    <p className="text-[12px] font-semibold text-gray-200">Peržiūros per dieną</p>
                                    <p className="text-[9px] text-gray-500 tabular-nums">{data.pageViewsByDay.length} d.</p>
                                </div>
                                {data.pageViewsByDay.length > 1 ? (
                                    <DailyChart data={data.pageViewsByDay} />
                                ) : data.pageViewsByDay.length === 1 ? (
                                    <div className="flex items-center gap-4 py-6">
                                        <div className="w-16 h-16 rounded-xl bg-teal-500/10 flex items-center justify-center">
                                            <p className="text-[20px] font-bold text-teal-400 tabular-nums">{data.pageViewsByDay[0].views}</p>
                                        </div>
                                        <div>
                                            <p className="text-[12px] text-gray-300">Peržiūros šiandien</p>
                                            <p className="text-[10px] text-gray-500">{data.pageViewsByDay[0].users} aktyvūs vartotojai</p>
                                            <p className="text-[9px] text-gray-600 mt-1">Daugiau duomenų atsiras per kelias dienas</p>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-[10px] text-gray-500 text-center py-10">Nėra duomenų</p>
                                )}
                            </div>
                            <div className={`${card} p-5`}>
                                <p className="text-[12px] font-semibold text-gray-200 mb-4">Įrenginiai</p>
                                {data.devices.length > 0 ? (
                                    <DonutChart data={data.devices} />
                                ) : (
                                    <p className="text-[10px] text-gray-500 text-center py-10">Nėra duomenų</p>
                                )}
                            </div>
                        </div>

                        {/* Row 2: Peak hours + Tech stack */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            {data.peakHours.length > 0 && (
                                <div className={`${card} p-5 lg:col-span-2`}>
                                    <p className="text-[12px] font-semibold text-gray-200 mb-3">Aktyvumas pagal paros laiką</p>
                                    <HoursChart data={data.peakHours} />
                                    <div className="flex items-center justify-between mt-2 px-1">
                                        <span className="text-[8px] text-gray-600">00:00</span>
                                        <span className="text-[8px] text-gray-600">06:00</span>
                                        <span className="text-[8px] text-gray-600">12:00</span>
                                        <span className="text-[8px] text-gray-600">18:00</span>
                                        <span className="text-[8px] text-gray-600">23:00</span>
                                    </div>
                                </div>
                            )}
                            <div className={`${card} p-5`}>
                                <p className="text-[12px] font-semibold text-gray-200 mb-3">Technologijos</p>
                                {/* OS */}
                                {data.operatingSystems.length > 0 && (
                                    <div className="mb-3">
                                        <p className="text-[9px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Operacinė sistema</p>
                                        {data.operatingSystems.slice(0, 4).map((o, i) => (
                                            <ListRow key={i} label={o.os} value={o.sessions} dot={['#14b8a6', '#818cf8', '#f59e0b', '#f472b6'][i] || '#6b7280'} />
                                        ))}
                                    </div>
                                )}
                                {/* Browsers */}
                                {data.browsers.length > 0 && (
                                    <div className="border-t border-white/[0.06] pt-3">
                                        <p className="text-[9px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Naršyklės</p>
                                        {data.browsers.slice(0, 4).map((b, i) => (
                                            <ListRow key={i} label={b.browser} value={b.sessions} dot={['#14b8a6', '#818cf8', '#f59e0b', '#f472b6'][i] || '#6b7280'} />
                                        ))}
                                    </div>
                                )}
                                {/* Resolutions */}
                                {data.screenResolutions.length > 0 && (
                                    <div className="border-t border-white/[0.06] pt-3 mt-3">
                                        <p className="text-[9px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Ekranai</p>
                                        {data.screenResolutions.slice(0, 3).map((r, i) => (
                                            <ListRow key={i} label={r.resolution} value={r.sessions} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Row 3: Pages + Sources + Geo */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            {/* Top Pages */}
                            <div className={`${card} p-5 lg:col-span-2`}>
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-[12px] font-semibold text-gray-200">Populiariausi puslapiai</p>
                                    <p className="text-[9px] text-gray-500">{userPages.length} psl.</p>
                                </div>
                                <div className="flex items-center gap-3 px-1 py-1.5 text-[8px] font-semibold text-gray-600 uppercase tracking-wider border-b border-white/[0.05]">
                                    <span className="w-5">#</span>
                                    <span className="flex-1">Puslapis</span>
                                    <span className="w-12 text-right">Perž.</span>
                                    <span className="w-10 text-right">Vart.</span>
                                    <span className="w-12 text-right">Trukmė</span>
                                </div>
                                <div className="space-y-px">
                                    {topPagesDisplay.map((p, i) => {
                                        const maxViews = userPages[0]?.views || 1;
                                        return (
                                            <div key={i} className="flex items-center gap-3 px-1 py-2 rounded-lg hover:bg-white/[0.04] transition-colors group relative">
                                                {/* Background fill bar */}
                                                <div className="absolute inset-y-0 left-0 rounded-lg bg-teal-500/[0.04]" style={{ width: `${(p.views / maxViews) * 100}%` }} />
                                                <span className="text-[9px] text-gray-600 w-5 tabular-nums relative z-10">{i + 1}</span>
                                                <span className="text-[11px] text-gray-300 flex-1 truncate group-hover:text-white transition-colors relative z-10">
                                                    {PAGE_LABELS[p.path] || p.path}
                                                </span>
                                                <span className="text-[10px] text-gray-400 w-12 text-right tabular-nums font-semibold relative z-10">{fmtNum(p.views)}</span>
                                                <span className="text-[10px] text-gray-500 w-10 text-right tabular-nums relative z-10">{p.users}</span>
                                                <span className="text-[10px] text-gray-500 w-12 text-right tabular-nums relative z-10">{fmtDur(p.avgDuration)}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                                {userPages.length > 10 && (
                                    <button onClick={() => setShowAllPages(!showAllPages)}
                                        className="w-full mt-2 py-2 text-[9px] font-semibold text-gray-500 hover:text-gray-300 flex items-center justify-center gap-1 transition-colors">
                                        {showAllPages ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                        {showAllPages ? 'Mažiau' : `Rodyti visus (${userPages.length})`}
                                    </button>
                                )}

                                {/* Landing Pages */}
                                {userLandingPages.length > 0 && (
                                    <div className="border-t border-white/[0.06] mt-4 pt-4">
                                        <p className="text-[12px] font-semibold text-gray-200 mb-2">Pirmieji puslapiai</p>
                                        <p className="text-[9px] text-gray-600 mb-3">Per kuriuos puslapius lankytojai ateina į svetainę</p>
                                        {userLandingPages.slice(0, 5).map((p, i) => (
                                            <ListRow key={i} label={PAGE_LABELS[p.path] || p.path} value={`${p.sessions} ses.`} sub={`${p.users} vart.`} dot="#14b8a6" />
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Sources + Geo */}
                            <div className="space-y-4">
                                {data.referrers.length > 0 && (
                                    <div className={`${card} p-5`}>
                                        <p className="text-[12px] font-semibold text-gray-200 mb-3">Srauto šaltiniai</p>
                                        {data.referrers.slice(0, 8).map((r, i) => (
                                            <ListRow key={i}
                                                label={r.source === '(direct)' ? 'Tiesioginis' : r.source === '(not set)' ? 'Nenustatyta' : r.source}
                                                value={r.sessions}
                                                sub={`${r.users} vart.`}
                                                dot={['#14b8a6', '#818cf8', '#f59e0b', '#f472b6', '#34d399', '#fb923c', '#a78bfa', '#38bdf8'][i]}
                                            />
                                        ))}
                                    </div>
                                )}

                                <div className={`${card} p-5`}>
                                    <p className="text-[12px] font-semibold text-gray-200 mb-3">Geografija</p>
                                    <div className="space-y-1">
                                        {data.countries.slice(0, 8).map((c, i) => (
                                            <div key={i} className="flex items-center gap-2.5 py-1.5">
                                                <MapPin className="w-3 h-3 text-gray-600 flex-shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <span className="text-[11px] text-gray-300">{c.country}</span>
                                                    {c.city && c.city !== '(not set)' && (
                                                        <span className="text-[9px] text-gray-600 ml-1.5">{c.city}</span>
                                                    )}
                                                </div>
                                                <span className="text-[10px] text-gray-400 tabular-nums font-medium">{c.users} vart.</span>
                                            </div>
                                        ))}
                                        {data.countries.length === 0 && (
                                            <p className="text-[10px] text-gray-500 text-center py-4">Nėra duomenų</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default AdminPerformancePage;
