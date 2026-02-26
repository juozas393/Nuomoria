import React from 'react';
import {
  UserGroupIcon,
  HomeIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { useRef, useMemo, useEffect } from 'react';
// Removed import for deleted types

// Focus trap utility hook
export const useFocusTrap = (enabled: boolean, ref: React.RefObject<HTMLElement | null>) => {
  useEffect(() => {
    if (!enabled || !ref.current) return;
    const root = ref.current;
    const q = () =>
      Array.from(
        root.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])'
        )
      ).filter(el => !el.hasAttribute('aria-hidden'));
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const els = q();
      if (!els.length) return;
      const first = els[0], last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    root.addEventListener('keydown', onKey);
    return () => root.removeEventListener('keydown', onKey);
  }, [enabled, ref]);
};

// Hook for creating stable handler references to prevent unnecessary re-renders
export const useStableHandlers = <T extends Record<string, (...args: any[]) => any>>(handlers: T): T => {
  const handlersRef = useRef<T>(handlers);
  handlersRef.current = handlers;

  // Create stable handlers by wrapping them in stable function references
  // This approach avoids dynamic hook creation while maintaining stability
  const stableHandlers = useMemo(() => {
    const result = {} as T;
    Object.keys(handlers).forEach((key) => {
      (result as any)[key] = (...args: any[]) => {
        return (handlersRef.current as any)[key](...args);
      };
    });
    return result;
  }, [handlers]);

  return stableHandlers;
};

export const getStatusColor = (status: string) => {
  switch (status) {
    case 'occupied': return 'bg-primary-100 text-primary-800 border-primary-200';
    case 'vacant': return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'maintenance': return 'bg-orange-100 text-orange-800 border-orange-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export const getStatusIcon = (status: string) => {
  switch (status) {
    case 'occupied': return React.createElement(UserGroupIcon, { className: "w-4 h-4" });
    case 'vacant': return React.createElement(HomeIcon, { className: "w-4 h-4" });
    case 'maintenance': return React.createElement(ExclamationTriangleIcon, { className: "w-4 h-4" });
    default: return React.createElement(HomeIcon, { className: "w-4 h-4" });
  }
};

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('lt-LT', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount);
};

export const formatDate = (dateString: string) => {
  const d = new Date(dateString);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const getPropertiesForAddress = (addressId: string, properties: any[], addresses: any[]) => {
  const address = addresses.find((a: any) => a.id === addressId);
  if (!address) return [];
  return properties.filter(p => p.address === address.street);
}; 