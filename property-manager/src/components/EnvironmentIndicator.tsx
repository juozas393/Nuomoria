import React from 'react';
import { env, isDevelopment, isProduction } from '../config/environment';
import { FRONTEND_MODE, getModeStatus } from '../config/frontendMode';

/**
 * Environment Indicator Component
 * Shows which environment the app is running in
 * Only visible in development mode
 */
export const EnvironmentIndicator: React.FC = () => {
  // Only show in development
  if (!isDevelopment) {
    return null;
  }

  return (
    <div className="fixed top-0 right-0 z-50 bg-green-600 text-white px-3 py-1 text-xs font-mono rounded-bl-lg shadow-lg">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></span>
        <span>DEV</span>
        <span className="text-green-200">|</span>
        <span className={FRONTEND_MODE ? 'text-yellow-300' : 'text-blue-300'}>
          {FRONTEND_MODE ? 'FRONTEND' : 'BACKEND'}
        </span>
        <span className="text-green-200">|</span>
        <span className="text-green-200">{env.app.name}</span>
      </div>
    </div>
  );
};

/**
 * Environment Debug Panel
 * Shows detailed environment information
 * Only visible in development mode
 */
export const EnvironmentDebugPanel: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState(false);

  // Only show in development
  if (!isDevelopment) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-blue-600 text-white px-3 py-2 text-xs font-mono rounded-lg shadow-lg hover:bg-blue-700 transition-colors"
      >
        {isOpen ? 'Hide' : 'Show'} Env Info
      </button>
      
      {isOpen && (
        <div className="absolute bottom-12 right-0 bg-gray-900 text-green-400 p-4 rounded-lg shadow-xl font-mono text-xs max-w-sm">
          <div className="space-y-2">
            <div className="text-yellow-400 font-bold">Environment Info</div>
            <div><span className="text-blue-400">Mode:</span> {isDevelopment ? 'Development' : isProduction ? 'Production' : 'Test'}</div>
            <div><span className="text-blue-400">App URL:</span> {env.app.url}</div>
            <div><span className="text-blue-400">App Name:</span> {env.app.name}</div>
            <div><span className="text-blue-400">Supabase URL:</span> {env.supabase.url}</div>
            <div><span className="text-blue-400">Debug Mode:</span> {env.features.debugMode ? 'ON' : 'OFF'}</div>
            <div><span className="text-blue-400">Analytics:</span> {env.features.analytics ? 'ON' : 'OFF'}</div>
            <div><span className="text-blue-400">Service Worker:</span> {env.features.serviceWorker ? 'ON' : 'OFF'}</div>
            <div><span className="text-blue-400">Cache Strategy:</span> {env.performance.cacheStrategy}</div>
          </div>
        </div>
      )}
    </div>
  );
};





