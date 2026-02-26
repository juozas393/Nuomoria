import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import {
    Shield,
    Users,
    Building2,
    FileText,
    Activity,
    ChevronDown,
    ChevronUp,
    ArrowUpDown,
    Home,
    Receipt,
    Gauge,
    UserPlus,
    Trash2,
    Pencil,
    Plus,
    RefreshCw,
    Search,
    X,
    Eye,
    Send,
    LogIn,
    ChevronRight,
    Loader2,
} from 'lucide-react';

// ─── Design Tokens (Light Theme) ─── //
const surface1 = 'bg-white/78 backdrop-blur-[10px] border border-white/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)] rounded-xl';
const surface2 = 'bg-white/92 backdrop-blur-[14px] border border-white/80 shadow-[0_4px_12px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)] rounded-xl';

// ─── Types ─── //
interface AuditLogEntry {
    id: string;
    user_id: string | null;
    user_email: string | null;
    action: string;
    table_name: string;
    record_id: string | null;
    old_data: Record<string, unknown> | null;
    new_data: Record<string, unknown> | null;
    changed_fields: string[] | null;
    description: string | null;
    created_at: string;
}

interface UserInfo {
    id: string;
    email: string;
    role: string | null;
    first_name: string | null;
    last_name: string | null;
    is_active: boolean;
    last_login: string | null;
    created_at: string;
}

interface KPIData {
    totalUsers: number;
    totalAddresses: number;
    totalProperties: number;
    totalInvoices: number;
}

// ─── Constants ─── //
const TABLE_LABELS: Record<string, string> = {
    properties: 'Butai',
    addresses: 'Adresai',
    tenants: 'Nuomininkai',
    invoices: 'Sąskaitos',
    meter_readings: 'Skaitiklių rodmenys',
    meters: 'Skaitikliai',
    property_documents: 'Dokumentai',
    tenant_invitations: 'Pakvietimai',
    users: 'Vartotojai',
    pages: 'Puslapiai',
};

const ACTION_LABELS: Record<string, { label: string; color: string; icon: typeof Plus }> = {
    INSERT: { label: 'Sukurta', color: 'text-emerald-600 bg-emerald-50', icon: Plus },
    UPDATE: { label: 'Atnaujinta', color: 'text-blue-600 bg-blue-50', icon: Pencil },
    DELETE: { label: 'Ištrinta', color: 'text-red-600 bg-red-50', icon: Trash2 },
    VIEW: { label: 'Peržiūra', color: 'text-violet-600 bg-violet-50', icon: Eye },
    SUBMIT: { label: 'Pateikta', color: 'text-cyan-600 bg-cyan-50', icon: Send },
    LOGIN: { label: 'Prisijungė', color: 'text-amber-600 bg-amber-50', icon: LogIn },
    EXPORT: { label: 'Eksportuota', color: 'text-orange-600 bg-orange-50', icon: FileText },
};

const ROLE_LABELS: Record<string, string> = {
    admin: 'Administratorius',
    landlord: 'Nuomotojas',
    tenant: 'Nuomininkas',
};

const TABLE_ICONS: Record<string, typeof Building2> = {
    properties: Home,
    addresses: Building2,
    tenants: Users,
    invoices: Receipt,
    meter_readings: Gauge,
    meters: Gauge,
    property_documents: FileText,
    tenant_invitations: UserPlus,
    users: Users,
    pages: Activity,
};

// Lithuanian field labels
const FIELD_LABELS: Record<string, string> = {
    unit_number: 'Buto numeris', rent: 'Nuoma (€)', deposit_amount: 'Depozitas (€)',
    deposit_paid_amount: 'Sumokėtas depozitas (€)', status: 'Statusas', rooms: 'Kambariai',
    area: 'Plotas (m²)', floor: 'Aukštas', floors_total: 'Aukštų viso', type: 'Tipas',
    payment_status: 'Mokėjimo statusas', street: 'Gatvė', city: 'Miestas', zipcode: 'Pašto kodas',
    country: 'Šalis', email: 'El. paštas', role: 'Rolė', full_name: 'Vardas ir pavardė',
    first_name: 'Vardas', last_name: 'Pavardė', phone: 'Telefonas',
    monthlyRent: 'Mėnesinė nuoma (€)', deposit: 'Depozitas (€)',
    contract_start: 'Sutarties pradžia', contract_end: 'Sutarties pabaiga',
    amount: 'Suma (€)', rent_amount: 'Nuomos suma (€)', utilities_amount: 'Komunalinių suma (€)',
    due_date: 'Terminas', paid_date: 'Apmokėjimo data', value: 'Rodmuo',
    reading_date: 'Data', period: 'Periodas', name: 'Pavadinimas',
    file_name: 'Failo pavadinimas', code: 'Pakvietimo kodas', expires_at: 'Galioja iki',
    is_active: 'Aktyvus', is_communal: 'Komunalinis', price_per_unit: 'Kaina už vnt.',
    distribution_type: 'Paskirstymo tipas',
};

const HIDDEN_FIELDS = new Set([
    'id', 'created_at', 'updated_at', 'address_id', 'property_id',
    'user_id', 'owner_id', 'inviter_id', 'meter_id', 'submitted_by',
    'auth_id', 'extended_details', 'lat', 'lng',
]);

function formatFieldValue(value: unknown): string {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'boolean') return value ? 'Taip' : 'Ne';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
}

const PAGE_SIZE = 50;

// ─── KPI Card ─── //
const KPICard = memo<{ icon: typeof Users; label: string; value: number; color: string }>(
    ({ icon: Icon, label, value, color }) => (
        <div className={`${surface1} p-4`}>
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
                    <Icon className="w-5 h-5" />
                </div>
                <div>
                    <p className="text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
                    <p className="text-xs text-gray-500">{label}</p>
                </div>
            </div>
        </div>
    )
);
KPICard.displayName = 'KPICard';

// ─── Audit Entry with expandable detail ─── //
const AuditEntry = memo<{ entry: AuditLogEntry; showUser?: boolean }>(({ entry, showUser = true }) => {
    const [expanded, setExpanded] = useState(false);
    const actionInfo = ACTION_LABELS[entry.action] || ACTION_LABELS.UPDATE;
    const TableIcon = TABLE_ICONS[entry.table_name] || Activity;
    const ActionIcon = actionInfo.icon;

    const timeAgo = useMemo(() => {
        const diff = Date.now() - new Date(entry.created_at).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Ką tik';
        if (mins < 60) return `prieš ${mins} min.`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `prieš ${hours} val.`;
        const days = Math.floor(hours / 24);
        return `prieš ${days} d.`;
    }, [entry.created_at]);

    const hasDetails = entry.action === 'INSERT' || entry.action === 'DELETE' ||
        (entry.changed_fields && entry.changed_fields.length > 0);

    const dataFields = useMemo(() => {
        const data = entry.action === 'DELETE' ? entry.old_data : entry.new_data;
        if (!data) return [];
        return Object.entries(data)
            .filter(([key]) => !HIDDEN_FIELDS.has(key))
            .filter(([, val]) => val !== null && val !== undefined && val !== '')
            .map(([key, val]) => ({ label: FIELD_LABELS[key] || key, value: formatFieldValue(val) }));
    }, [entry.action, entry.old_data, entry.new_data]);

    const changedFields = useMemo(() => {
        if (!entry.changed_fields || !entry.old_data || !entry.new_data) return [];
        return entry.changed_fields
            .filter(f => !HIDDEN_FIELDS.has(f))
            .map(field => ({
                label: FIELD_LABELS[field] || field,
                oldVal: formatFieldValue(entry.old_data?.[field]),
                newVal: formatFieldValue(entry.new_data?.[field]),
            }));
    }, [entry.changed_fields, entry.old_data, entry.new_data]);

    return (
        <div
            className={`${surface1} p-3 transition-all duration-200 hover:shadow-md ${hasDetails ? 'cursor-pointer' : ''} ${expanded ? 'ring-1 ring-teal-200' : ''}`}
            onClick={() => hasDetails && setExpanded(!expanded)}
        >
            <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <TableIcon className="w-4 h-4 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${actionInfo.color}`}>
                            <ActionIcon className="w-3 h-3" />
                            {actionInfo.label}
                        </span>
                        <span className="text-[11px] font-medium text-gray-700">
                            {TABLE_LABELS[entry.table_name] || entry.table_name}
                        </span>
                        <span className="text-[10px] text-gray-400">·</span>
                        <span className="text-[10px] text-gray-400">{timeAgo}</span>
                    </div>
                    <p className="text-[11px] text-gray-600 mt-1 leading-relaxed">
                        {showUser && <span className="text-gray-400">{entry.user_email || 'Sistema'} — </span>}
                        <span className="font-medium">{entry.description || 'Nėra aprašymo'}</span>
                    </p>
                    {hasDetails && (
                        <div className="flex items-center gap-1 mt-1.5 text-[10px] text-teal-600">
                            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            <span>{expanded ? 'Slėpti detales' : 'Rodyti visą informaciją'}</span>
                        </div>
                    )}
                    {expanded && (
                        <div className="mt-3 rounded-lg bg-gray-50/80 border border-gray-200/60 p-3 space-y-2" onClick={e => e.stopPropagation()}>
                            {entry.action === 'UPDATE' && changedFields.length > 0 && (
                                <>
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">Pakeisti laukai</p>
                                    <div className="space-y-1.5">
                                        {changedFields.map(({ label, oldVal, newVal }) => (
                                            <div key={label} className="bg-white rounded-lg px-3 py-2 border border-gray-100">
                                                <p className="text-[10px] font-medium text-gray-500 mb-1">{label}</p>
                                                <div className="flex items-center gap-2 text-[11px]">
                                                    <span className="text-red-500 bg-red-50 px-1.5 py-0.5 rounded line-through">{oldVal}</span>
                                                    <span className="text-gray-300">→</span>
                                                    <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-medium">{newVal}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                            {entry.action === 'INSERT' && dataFields.length > 0 && (
                                <>
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">Sukurti duomenys</p>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        {dataFields.map(({ label, value }) => (
                                            <div key={label} className="bg-white rounded-lg px-2.5 py-1.5 border border-gray-100">
                                                <p className="text-[9px] text-gray-400">{label}</p>
                                                <p className="text-[11px] font-medium text-gray-800 truncate" title={value}>{value}</p>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                            {entry.action === 'DELETE' && dataFields.length > 0 && (
                                <>
                                    <p className="text-[10px] font-bold text-red-400 uppercase tracking-wide mb-1.5">Ištrinti duomenys</p>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        {dataFields.map(({ label, value }) => (
                                            <div key={label} className="bg-red-50/50 rounded-lg px-2.5 py-1.5 border border-red-100/60">
                                                <p className="text-[9px] text-red-300">{label}</p>
                                                <p className="text-[11px] text-red-600 line-through truncate" title={value}>{value}</p>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                            <div className="flex items-center gap-3 pt-2 border-t border-gray-200/60 mt-2">
                                <span className="text-[9px] text-gray-400">
                                    {(() => { const d = new Date(entry.created_at); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`; })()}
                                </span>
                                {entry.record_id && (
                                    <span className="text-[9px] text-gray-300 font-mono truncate max-w-[200px]" title={entry.record_id}>
                                        ID: {entry.record_id.substring(0, 8)}...
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                <span className="text-[9px] text-gray-400 flex-shrink-0 hidden lg:block">
                    {(() => { const d = new Date(entry.created_at); return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; })()}
                </span>
            </div>
        </div>
    );
});
AuditEntry.displayName = 'AuditEntry';

// ─── User Card (clickable, shows activity count) ─── //
const UserCard = memo<{ user: UserInfo; activityCount: number; isSelected: boolean; onClick: () => void }>(
    ({ user, activityCount, isSelected, onClick }) => (
        <button
            onClick={onClick}
            className={`w-full ${surface1} p-3 flex items-center gap-3 transition-all duration-200 hover:shadow-md ${isSelected ? 'ring-2 ring-teal-400 shadow-md' : ''}`}
        >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-teal-500' : 'bg-teal-100'}`}>
                <span className={`text-[11px] font-bold ${isSelected ? 'text-white' : 'text-teal-700'}`}>
                    {(user.first_name?.[0] || user.email[0]).toUpperCase()}
                </span>
            </div>
            <div className="flex-1 min-w-0 text-left">
                <p className="text-[12px] font-medium text-gray-900 truncate">
                    {user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.email.split('@')[0]}
                </p>
                <p className="text-[10px] text-gray-500 truncate">{user.email}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`px-2 py-0.5 rounded-md text-[9px] font-medium ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                    user.role === 'landlord' ? 'bg-teal-100 text-teal-700' :
                        user.role === 'tenant' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-600'
                    }`}>
                    {ROLE_LABELS[user.role || ''] || user.role || '?'}
                </span>
                {activityCount > 0 && (
                    <span className="bg-gray-100 text-gray-600 text-[9px] font-medium px-1.5 py-0.5 rounded-full tabular-nums">
                        {activityCount}
                    </span>
                )}
                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isSelected ? 'text-teal-500 rotate-90' : 'text-gray-300'}`} />
            </div>
        </button>
    )
);
UserCard.displayName = 'UserCard';

// ─── Main Admin Dashboard ─── //
const AdminDashboard: React.FC = () => {
    const { user } = useAuth();
    const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
    const [users, setUsers] = useState<UserInfo[]>([]);
    const [kpi, setKpi] = useState<KPIData>({ totalUsers: 0, totalAddresses: 0, totalProperties: 0, totalInvoices: 0 });
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    // Filters
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [tableFilter, setTableFilter] = useState<string>('');
    const [actionFilter, setActionFilter] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

    // Build query with filters
    const buildLogQuery = useCallback((offset = 0) => {
        let q = supabase
            .from('audit_log')
            .select('*')
            .order('created_at', { ascending: sortOrder === 'asc' })
            .range(offset, offset + PAGE_SIZE - 1);

        if (selectedUserId) q = q.eq('user_id', selectedUserId);
        if (tableFilter) q = q.eq('table_name', tableFilter);
        if (actionFilter) q = q.eq('action', actionFilter);

        return q;
    }, [sortOrder, selectedUserId, tableFilter, actionFilter]);

    // Initial load
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [logsRes, usersRes] = await Promise.all([
                buildLogQuery(0),
                supabase.from('users').select('id, email, role, first_name, last_name, is_active, last_login, created_at'),
            ]);

            if (logsRes.data) {
                setAuditLogs(logsRes.data);
                setHasMore(logsRes.data.length === PAGE_SIZE);
            }
            if (usersRes.data) {
                setUsers(usersRes.data);
                setKpi(prev => ({ ...prev, totalUsers: usersRes.data.length }));
            }

            const [addrCount, propCount, invCount] = await Promise.all([
                supabase.from('addresses').select('id', { count: 'exact', head: true }),
                supabase.from('properties').select('id', { count: 'exact', head: true }),
                supabase.from('invoices').select('id', { count: 'exact', head: true }),
            ]);

            setKpi(prev => ({
                ...prev,
                totalAddresses: addrCount.count ?? 0,
                totalProperties: propCount.count ?? 0,
                totalInvoices: invCount.count ?? 0,
            }));
        } catch (err) {
            console.error('Admin fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [buildLogQuery]);

    // Load more (pagination)
    const loadMore = useCallback(async () => {
        if (loadingMore || !hasMore) return;
        setLoadingMore(true);
        try {
            const res = await buildLogQuery(auditLogs.length);
            if (res.data) {
                setAuditLogs(prev => [...prev, ...res.data!]);
                setHasMore(res.data.length === PAGE_SIZE);
            }
        } finally {
            setLoadingMore(false);
        }
    }, [buildLogQuery, auditLogs.length, loadingMore, hasMore]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Count activities per user
    const userActivityCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        auditLogs.forEach(log => {
            if (log.user_id) {
                counts[log.user_id] = (counts[log.user_id] || 0) + 1;
            }
        });
        return counts;
    }, [auditLogs]);

    // Client-side search filter
    const filteredLogs = useMemo(() => {
        if (!searchQuery) return auditLogs;
        const q = searchQuery.toLowerCase();
        return auditLogs.filter(
            (log) =>
                log.user_email?.toLowerCase().includes(q) ||
                log.description?.toLowerCase().includes(q) ||
                log.table_name.toLowerCase().includes(q)
        );
    }, [auditLogs, searchQuery]);

    // Selected user info
    const selectedUser = useMemo(() => {
        if (!selectedUserId) return null;
        return users.find(u => u.id === selectedUserId) || null;
    }, [selectedUserId, users]);

    // Handle user selection (toggle)
    const handleUserClick = useCallback((userId: string) => {
        setSelectedUserId(prev => prev === userId ? null : userId);
    }, []);

    if (loading) {
        return (
            <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className={`${surface1} p-4 animate-pulse`}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gray-200" />
                                <div className="space-y-2">
                                    <div className="h-6 w-12 bg-gray-200 rounded" />
                                    <div className="h-3 w-20 bg-gray-200 rounded" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className={`${surface2} p-6 animate-pulse`}>
                    <div className="h-6 w-48 bg-gray-200 rounded mb-4" />
                    <div className="space-y-3">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="h-16 bg-gray-100 rounded-xl" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                        <h1 className="text-[16px] font-bold text-gray-900">Administravimo panelė</h1>
                        <p className="text-[11px] text-gray-500">
                            {selectedUser
                                ? `${selectedUser.first_name || selectedUser.email.split('@')[0]} veiksmai`
                                : 'Visos sistemos veikla'}
                        </p>
                    </div>
                </div>
                <button
                    onClick={fetchData}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-500 text-white text-[11px] font-bold rounded-lg hover:bg-teal-600 transition-colors active:scale-[0.98]"
                >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Atnaujinti
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard icon={Users} label="Vartotojai" value={kpi.totalUsers} color="bg-purple-100 text-purple-600" />
                <KPICard icon={Building2} label="Adresai" value={kpi.totalAddresses} color="bg-blue-100 text-blue-600" />
                <KPICard icon={Home} label="Butai" value={kpi.totalProperties} color="bg-teal-100 text-teal-600" />
                <KPICard icon={Receipt} label="Sąskaitos" value={kpi.totalInvoices} color="bg-amber-100 text-amber-600" />
            </div>

            {/* Main content: Users + Activity Log */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Users List (1 col) */}
                <div className={`${surface2} p-4`}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-gray-600" />
                            <h2 className="text-[13px] font-bold text-gray-900">Vartotojai</h2>
                            <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                                {users.length}
                            </span>
                        </div>
                        {selectedUserId && (
                            <button
                                onClick={() => setSelectedUserId(null)}
                                className="flex items-center gap-1 text-[10px] text-teal-600 hover:text-teal-700 font-medium transition-colors"
                            >
                                <X className="w-3 h-3" />
                                Rodyti visus
                            </button>
                        )}
                    </div>
                    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                        {users.map((u) => (
                            <UserCard
                                key={u.id}
                                user={u}
                                activityCount={userActivityCounts[u.id] || 0}
                                isSelected={selectedUserId === u.id}
                                onClick={() => handleUserClick(u.id)}
                            />
                        ))}
                    </div>
                </div>

                {/* Activity Log (2 cols) */}
                <div className={`${surface2} p-4 lg:col-span-2`}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Activity className="w-4 h-4 text-gray-600" />
                            <h2 className="text-[13px] font-bold text-gray-900">
                                {selectedUser
                                    ? `${selectedUser.first_name || selectedUser.email.split('@')[0]} — veiksmų žurnalas`
                                    : 'Veiksmų žurnalas'}
                            </h2>
                            <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                                {filteredLogs.length}{hasMore ? '+' : ''}
                            </span>
                        </div>
                        <button
                            onClick={() => setSortOrder((o) => (o === 'desc' ? 'asc' : 'desc'))}
                            className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-700 transition-colors"
                        >
                            <ArrowUpDown className="w-3 h-3" />
                            {sortOrder === 'desc' ? 'Naujausi' : 'Seniausi'}
                        </button>
                    </div>

                    {/* Filters */}
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                        <div className="relative flex-1 min-w-[160px]">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Ieškoti..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-8 pr-8 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[11px] text-gray-700 placeholder-gray-400 focus:ring-1 focus:ring-teal-500/40 focus:border-teal-500/40 transition-all"
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                                    <X className="w-3 h-3 text-gray-400 hover:text-gray-600" />
                                </button>
                            )}
                        </div>
                        <select
                            value={tableFilter}
                            onChange={(e) => setTableFilter(e.target.value)}
                            className="px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[11px] text-gray-700 appearance-none cursor-pointer"
                        >
                            <option value="">Visos lentelės</option>
                            {Object.entries(TABLE_LABELS).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </select>
                        <select
                            value={actionFilter}
                            onChange={(e) => setActionFilter(e.target.value)}
                            className="px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[11px] text-gray-700 appearance-none cursor-pointer"
                        >
                            <option value="">Visi veiksmai</option>
                            <option value="INSERT">Sukurta</option>
                            <option value="UPDATE">Atnaujinta</option>
                            <option value="DELETE">Ištrinta</option>
                            <option value="VIEW">Peržiūra</option>
                            <option value="SUBMIT">Pateikta</option>
                            <option value="LOGIN">Prisijungimai</option>
                        </select>
                    </div>

                    {/* Log entries */}
                    <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                        {filteredLogs.length === 0 ? (
                            <div className="text-center py-12">
                                <Activity className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                <p className="text-[12px] text-gray-400">
                                    {selectedUser ? 'Šis vartotojas dar neatliko jokių veiksmų' : 'Nėra veiksmų žurnalo įrašų'}
                                </p>
                                <p className="text-[10px] text-gray-300 mt-1">Veiksmai bus fiksuojami automatiškai</p>
                            </div>
                        ) : (
                            <>
                                {filteredLogs.map((entry) => (
                                    <AuditEntry key={entry.id} entry={entry} showUser={!selectedUserId} />
                                ))}
                                {/* Load more */}
                                {hasMore && !searchQuery && (
                                    <button
                                        onClick={loadMore}
                                        disabled={loadingMore}
                                        className="w-full py-2.5 text-center text-[11px] font-medium text-teal-600 hover:text-teal-700 bg-teal-50/50 hover:bg-teal-50 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {loadingMore ? (
                                            <>
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                Kraunama...
                                            </>
                                        ) : (
                                            <>Rodyti daugiau ({PAGE_SIZE})</>
                                        )}
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
