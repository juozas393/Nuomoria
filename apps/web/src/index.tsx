// Suppress console.log in development (remove or keep empty for production)
if (typeof window !== 'undefined') {
  const noop = () => { };
  console.log = noop;
  console.debug = noop;
  // Keep console.warn and console.error for actual issues
}

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { initializePerformanceOptimizations } from './utils/performanceOptimizations';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Initialize performance optimizations
initializePerformanceOptimizations();

