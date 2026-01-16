/**
 * Examples of Role-Based Access Control
 * This is the RIGHT way to control user access
 */

import React from 'react';
import { 
  AdminOnly, 
  ManagerOnly, 
  OwnerOnly, 
  TenantOnly,
  PermissionRequired,
  AnyPermissionRequired,
  AllPermissionsRequired,
  RoleBasedAccess
} from '../RoleBasedAccess';
import { useUserRole } from '../../hooks';

// Example 1: Simple Role-Based Access
export function AdminPanel() {
  return (
    <AdminOnly fallback={<div>Access denied. Admin only.</div>}>
      <div className="p-4 bg-red-100 rounded">
        <h3>🔧 Admin Panel</h3>
        <p>System administration tools</p>
        <button className="bg-red-500 text-white px-4 py-2 rounded">
          Delete All Data
        </button>
      </div>
    </AdminOnly>
  );
}

// Example 2: Manager Features
export function PropertyManagement() {
  return (
    <ManagerOnly fallback={<div>Manager access required</div>}>
      <div className="p-4 bg-blue-100 rounded">
        <h3>🏠 Property Management</h3>
        <p>Manage properties and tenants</p>
        <button className="bg-blue-500 text-white px-4 py-2 rounded">
          Add New Property
        </button>
      </div>
    </ManagerOnly>
  );
}

// Example 3: Owner Features
export function OwnerDashboard() {
  return (
    <OwnerOnly fallback={<div>Owner access required</div>}>
      <div className="p-4 bg-green-100 rounded">
        <h3>💰 Owner Dashboard</h3>
        <p>View your properties and income</p>
        <button className="bg-green-500 text-white px-4 py-2 rounded">
          View Reports
        </button>
      </div>
    </OwnerOnly>
  );
}

// Example 4: Tenant Features
export function TenantPortal() {
  return (
    <TenantOnly fallback={<div>Tenant access required</div>}>
      <div className="p-4 bg-purple-100 rounded">
        <h3>🏠 Tenant Portal</h3>
        <p>View your apartment and pay rent</p>
        <button className="bg-purple-500 text-white px-4 py-2 rounded">
          Pay Rent
        </button>
      </div>
    </TenantOnly>
  );
}

// Example 5: Permission-Based Access
export function BulkOperations() {
  return (
    <PermissionRequired 
      permission="bulk_operations"
      fallback={<div>Bulk operations permission required</div>}
    >
      <div className="p-4 bg-yellow-100 rounded">
        <h3>📦 Bulk Operations</h3>
        <p>Perform bulk operations on multiple items</p>
        <button className="bg-yellow-500 text-white px-4 py-2 rounded">
          Bulk Update
        </button>
      </div>
    </PermissionRequired>
  );
}

// Example 6: Multiple Permissions (Any One)
export function FinancialReports() {
  return (
    <AnyPermissionRequired 
      permissions={['view_financials', 'view_reports', 'admin_access']}
      fallback={<div>Financial access required</div>}
    >
      <div className="p-4 bg-indigo-100 rounded">
        <h3>📊 Financial Reports</h3>
        <p>View financial data and reports</p>
        <button className="bg-indigo-500 text-white px-4 py-2 rounded">
          Generate Report
        </button>
      </div>
    </AnyPermissionRequired>
  );
}

// Example 7: Multiple Permissions (All Required)
export function SystemSettings() {
  return (
    <AllPermissionsRequired 
      permissions={['system_admin', 'configuration_access']}
      fallback={<div>System admin permissions required</div>}
    >
      <div className="p-4 bg-gray-100 rounded">
        <h3>⚙️ System Settings</h3>
        <p>Configure system-wide settings</p>
        <button className="bg-gray-500 text-white px-4 py-2 rounded">
          Save Settings
        </button>
      </div>
    </AllPermissionsRequired>
  );
}

// Example 8: Complex Role-Based Navigation
export function NavigationMenu() {
  const { userRole, isAdmin, isManager, isOwner, isTenant } = useUserRole();

  return (
    <nav className="flex space-x-4">
      {/* Everyone can see */}
      <a href="/dashboard" className="text-blue-500">Dashboard</a>
      
      {/* Role-based navigation */}
      {isAdmin() && (
        <>
          <a href="/admin" className="text-red-500">Admin</a>
          <a href="/users" className="text-red-500">Users</a>
          <a href="/system" className="text-red-500">System</a>
        </>
      )}
      
      {isManager() && (
        <>
          <a href="/properties" className="text-blue-500">Properties</a>
          <a href="/tenants" className="text-blue-500">Tenants</a>
          <a href="/reports" className="text-blue-500">Reports</a>
        </>
      )}
      
      {isOwner() && (
        <>
          <a href="/my-properties" className="text-green-500">My Properties</a>
          <a href="/income" className="text-green-500">Income</a>
        </>
      )}
      
      {isTenant() && (
        <>
          <a href="/my-apartment" className="text-purple-500">My Apartment</a>
          <a href="/payments" className="text-purple-500">Payments</a>
        </>
      )}
    </nav>
  );
}

// Example 9: Using the Hook Directly
export function UserStatus() {
  const { userRole, isAdmin, isManager, hasPermission } = useUserRole();

  if (!userRole) {
    return <div>Not logged in</div>;
  }

  return (
    <div className="p-4 bg-gray-50 rounded">
      <h3>👤 User Status</h3>
      <p><strong>Email:</strong> {userRole.email}</p>
      <p><strong>Role:</strong> {userRole.role}</p>
      <p><strong>Active:</strong> {userRole.isActive ? '✅' : '❌'}</p>
      
      <div className="mt-2">
        <h4>Permissions:</h4>
        <ul className="list-disc list-inside">
          <li>Admin: {isAdmin() ? '✅' : '❌'}</li>
          <li>Manager: {isManager() ? '✅' : '❌'}</li>
          <li>Bulk Operations: {hasPermission('bulk_operations') ? '✅' : '❌'}</li>
          <li>Financial Access: {hasPermission('view_financials') ? '✅' : '❌'}</li>
        </ul>
      </div>
    </div>
  );
}

// Example 10: Conditional Rendering Based on Role
export function Dashboard() {
  const { isAdmin, isManager, isOwner, isTenant } = useUserRole();

  return (
    <div className="p-4">
      <h1>Dashboard</h1>
      
      {isAdmin() && (
        <div className="grid grid-cols-3 gap-4">
          <AdminPanel />
          <PropertyManagement />
          <SystemSettings />
        </div>
      )}
      
      {isManager() && !isAdmin() && (
        <div className="grid grid-cols-2 gap-4">
          <PropertyManagement />
          <FinancialReports />
        </div>
      )}
      
      {isOwner() && !isManager() && (
        <div className="grid grid-cols-2 gap-4">
          <OwnerDashboard />
          <FinancialReports />
        </div>
      )}
      
      {isTenant() && (
        <div className="grid grid-cols-1 gap-4">
          <TenantPortal />
        </div>
      )}
    </div>
  );
}



