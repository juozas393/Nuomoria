// Feature barrel export
export { default as TenantDashboardPage } from './pages/TenantDashboardPage';
export * from './types/tenant.types';
export * from './hooks/useTenantDashboard';
// Export specific items from useTenantDashboardData to avoid conflicts
export { useTenantDashboardData, type TenantRental, type TenantInvoice, type TenantNotification } from './hooks/useTenantDashboardData';
export * from './components/LeaseSelector';
export * from './components/KpiCards';
export * from './components/PaymentsCard';
export * from './components/MaintenanceCard';
export * from './components/DocumentsCard';
export * from './components/LeaseInfoCard';
