/**
 * Examples of how to use Feature Flags in your components
 */

import React from 'react';
import { FeatureFlag, AdminOnly, ManagerOnly, DevOnly, BetaFeature } from '../FeatureFlag';
import { useFeatureFlags, useABTest } from '../../hooks';

// Example 1: Basic Feature Flag
export function NewDashboardButton() {
  return (
    <FeatureFlag feature="newDashboard">
      <button className="bg-blue-500 text-white px-4 py-2 rounded">
        🚀 New Dashboard (Beta)
      </button>
    </FeatureFlag>
  );
}

// Example 2: Feature Flag with Fallback
export function AnalyticsSection() {
  return (
    <FeatureFlag 
      feature="advancedAnalytics" 
      fallback={<div>Basic analytics only</div>}
    >
      <div className="p-4 bg-gray-100 rounded">
        <h3>📊 Advanced Analytics</h3>
        <p>Detailed insights and reports</p>
      </div>
    </FeatureFlag>
  );
}

// Example 3: Role-based Access
export function AdminPanel() {
  return (
    <AdminOnly fallback={<div>Access denied</div>}>
      <div className="p-4 bg-red-100 rounded">
        <h3>🔧 Admin Panel</h3>
        <p>System administration tools</p>
      </div>
    </AdminOnly>
  );
}

// Example 4: Manager Features
export function BulkOperations() {
  return (
    <ManagerOnly>
      <button className="bg-green-500 text-white px-4 py-2 rounded">
        📦 Bulk Operations
      </button>
    </ManagerOnly>
  );
}

// Example 5: Development Only
export function DebugPanel() {
  return (
    <DevOnly>
      <div className="p-4 bg-yellow-100 rounded">
        <h3>🐛 Debug Panel</h3>
        <p>Development tools and logs</p>
      </div>
    </DevOnly>
  );
}

// Example 6: Beta Features
export function ExperimentalFeatures() {
  return (
    <BetaFeature fallback={<div>Feature coming soon!</div>}>
      <div className="p-4 bg-purple-100 rounded">
        <h3>🧪 Experimental Features</h3>
        <p>Try out new functionality</p>
      </div>
    </BetaFeature>
  );
}

// Example 7: Using the Hook Directly
export function FeatureStatus() {
  const { flags, userRole, hasFeature, hasRole } = useFeatureFlags();

  return (
    <div className="p-4 bg-gray-50 rounded">
      <h3>🔍 Feature Status</h3>
      <p><strong>User Role:</strong> {userRole?.role || 'Not logged in'}</p>
      
      <div className="mt-2">
        <h4>Available Features:</h4>
        <ul className="list-disc list-inside">
          <li>New Dashboard: {hasFeature('newDashboard') ? '✅' : '❌'}</li>
          <li>Advanced Analytics: {hasFeature('advancedAnalytics') ? '✅' : '❌'}</li>
          <li>Admin Panel: {hasRole('admin') ? '✅' : '❌'}</li>
          <li>Debug Mode: {hasFeature('debugMode') ? '✅' : '❌'}</li>
        </ul>
      </div>
    </div>
  );
}

// Example 8: Conditional Navigation
export function NavigationMenu() {
  const { hasFeature, hasRole } = useFeatureFlags();

  return (
    <nav className="flex space-x-4">
      <a href="/dashboard" className="text-blue-500">Dashboard</a>
      
      {hasFeature('newDashboard') && (
        <a href="/new-dashboard" className="text-blue-500">🚀 New Dashboard</a>
      )}
      
      {hasRole('manager') && (
        <a href="/properties" className="text-blue-500">Properties</a>
      )}
      
      {hasRole('admin') && (
        <a href="/admin" className="text-blue-500">Admin</a>
      )}
      
      {hasFeature('tenantChat') && (
        <a href="/chat" className="text-blue-500">💬 Chat</a>
      )}
    </nav>
  );
}

// Example 9: A/B Testing
export function ABTestExample() {
  const variant = useABTest('button-color', ['blue', 'green', 'red']);

  const getButtonClass = () => {
    switch (variant) {
      case 'blue': return 'bg-blue-500';
      case 'green': return 'bg-green-500';
      case 'red': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <button className={`${getButtonClass()} text-white px-4 py-2 rounded`}>
      A/B Test Button ({variant})
    </button>
  );
}



