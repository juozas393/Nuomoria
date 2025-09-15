import React, { useState, useEffect, useRef } from 'react';
import { usePerformanceDevTools } from '../../context/PerformanceContext';
import { useAuth } from '../../context/AuthContext';

interface PerformanceMetrics {
  fps: number;
  memory: {
    used: number;
    total: number;
    limit: number;
  } | null;
  renderTime: number;
  reRenderCount: number;
  cacheSize: number;
}

export const PerformanceMonitor: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    memory: null,
    renderTime: 0,
    reRenderCount: 0,
    cacheSize: 0,
  });
  
  const { stores, resetAll } = usePerformanceDevTools();
  const { user, isAuthenticated } = useAuth();
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  const renderStartTime = useRef(performance.now());

  // FPS calculation
  useEffect(() => {
    const calculateFPS = () => {
      frameCount.current++;
      const now = performance.now();
      
      if (now - lastTime.current >= 1000) {
        setMetrics(prev => ({
          ...prev,
          fps: Math.round((frameCount.current * 1000) / (now - lastTime.current)),
        }));
        
        frameCount.current = 0;
        lastTime.current = now;
      }
      
      requestAnimationFrame(calculateFPS);
    };
    
    const animationId = requestAnimationFrame(calculateFPS);
    return () => cancelAnimationFrame(animationId);
  }, []);

  // Memory monitoring
  useEffect(() => {
    const updateMemoryMetrics = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        setMetrics(prev => ({
          ...prev,
          memory: {
            used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
            total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
            limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024),
          },
        }));
      }
    };
    
    updateMemoryMetrics();
    const interval = setInterval(updateMemoryMetrics, 2000);
    return () => clearInterval(interval);
  }, []);

  // Render time tracking - only track when component is visible
  useEffect(() => {
    if (!isVisible) return;
    
    renderStartTime.current = performance.now();
    
    return () => {
      const renderTime = performance.now() - renderStartTime.current;
      setMetrics(prev => ({
        ...prev,
        renderTime: Math.round(renderTime * 100) / 100,
        reRenderCount: prev.reRenderCount + 1,
      }));
    };
  }, [isVisible]);

  // Keyboard shortcut to toggle visibility
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'P') {
        event.preventDefault();
        setIsVisible(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-gray-800 text-white px-3 py-2 rounded-lg text-xs font-mono opacity-50 hover:opacity-100 transition-opacity z-50"
        title="Performance Monitor (Ctrl+Shift+P)"
      >
        📊 Perf
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 text-white p-4 rounded-lg text-xs font-mono max-w-sm z-50 shadow-xl">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-green-400">⚡ Performance Monitor</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          ×
        </button>
      </div>
      
      {/* Core Metrics */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between">
          <span className="text-gray-300">FPS:</span>
          <span className={`font-bold ${metrics.fps >= 55 ? 'text-green-400' : metrics.fps >= 30 ? 'text-yellow-400' : 'text-red-400'}`}>
            {metrics.fps}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-300">Render:</span>
          <span className={`font-bold ${metrics.renderTime <= 16 ? 'text-green-400' : 'text-yellow-400'}`}>
            {metrics.renderTime}ms
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-300">Re-renders:</span>
          <span className="text-blue-400 font-bold">{metrics.reRenderCount}</span>
        </div>
        
        {metrics.memory && (
          <div className="flex justify-between">
            <span className="text-gray-300">Memory:</span>
            <span className={`font-bold ${metrics.memory.used / metrics.memory.limit > 0.8 ? 'text-red-400' : 'text-green-400'}`}>
              {metrics.memory.used}MB
            </span>
          </div>
        )}
      </div>
      
      {/* Store Information */}
      <div className="border-t border-gray-700 pt-3 mb-3">
        <h4 className="text-xs font-bold text-blue-400 mb-2">📦 Store Status</h4>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-300">User:</span>
            <span className="text-green-400">
              {isAuthenticated ? '✓' : '✗'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-300">Properties:</span>
            <span className="text-blue-400">{stores.properties.state.properties.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-300">Tenants:</span>
            <span className="text-blue-400">{stores.tenants.state.tenants.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-300">Meters:</span>
            <span className="text-blue-400">{stores.meters.state.meters.length}</span>
          </div>
        </div>
      </div>
      
      {/* Actions */}
      <div className="border-t border-gray-700 pt-3 space-y-2">
        <button
          onClick={resetAll}
          className="w-full bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs transition-colors"
        >
          🔄 Reset All Stores
        </button>
        
        <button
          onClick={() => {
            if ('gc' in window) {
              (window as any).gc();
            } else {
              console.log('Manual GC not available');
            }
          }}
          className="w-full bg-yellow-600 hover:bg-yellow-700 text-white px-2 py-1 rounded text-xs transition-colors"
        >
          🧹 Force GC
        </button>
      </div>
      
      {/* Performance Tips */}
      <div className="border-t border-gray-700 pt-3 mt-3">
        <h4 className="text-xs font-bold text-orange-400 mb-2">💡 Tips</h4>
        <div className="text-xs text-gray-400 space-y-1">
          {metrics.fps < 30 && <div>• Low FPS detected - reduce animations</div>}
          {metrics.renderTime > 16 && <div>• Slow renders - optimize components</div>}
          {metrics.memory && metrics.memory.used > 100 && <div>• High memory usage - check for leaks</div>}
          {metrics.reRenderCount > 50 && <div>• Too many re-renders - memoize components</div>}
        </div>
      </div>
      
      <div className="text-xs text-gray-500 mt-3 text-center">
        Press Ctrl+Shift+P to toggle
      </div>
    </div>
  );
};