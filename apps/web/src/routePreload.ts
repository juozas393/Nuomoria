// ─── Route Preload Map ─── //
// Used by Sidebar on hover/focus to pre-fetch route chunks before click.
// Extracted to avoid circular dependency (App → AppShell → Sidebar → App).

export const ROUTE_PRELOAD_MAP: Record<string, () => Promise<any>> = {
    'dashboard': () => import('./pages/Nuomotojas2Dashboard'),
    'turtas': () => import('./pages/Properties'),
    'butai': () => import('./pages/Apartments'),
    'nuomininkai': () => import('./pages/Tenants'),
    'skaitikliai': () => import('./pages/Meters'),
    'saskaitos': () => import('./pages/Invoices'),
    'analitika': () => import('./pages/Analytics'),
    'remontas': () => import('./pages/Maintenance'),
    'profilis': () => import('./pages/Profile'),
    'nustatymai': () => import('./pages/Settings'),
    'agentai': () => import('./pages/AgentsPage'),
    'vartotojai': () => import('./pages/Users'),
    'admin': () => import('./pages/AdminDashboard'),
    'pagalba': () => import('./pages/GuidePage'),
    'tenant': () => import('./features/tenant/pages/TenantDashboardPage'),
    'tenant/meters': () => import('./pages/tenant/TenantMeters'),
    'tenant/invoices': () => import('./pages/tenant/TenantInvoices'),
    'tenant/settings': () => import('./features/tenant/pages/TenantSettingsPage'),
    'tenant/contract': () => import('./pages/tenant/TenantContractPage'),
};
