import React from 'react';

// Optimized formatters - single instances (module scope)
const currency = new Intl.NumberFormat('lt-LT', { style: 'currency', currency: 'EUR' });
const dateLt = new Intl.DateTimeFormat('lt-LT', { year: 'numeric', month: '2-digit', day: '2-digit' });

export const formatCurrency = (amount: number): string => {
  return currency.format(amount);
};

export const formatDate = (date: Date | string): string => {
  if (!date || date === '') return 'Nenurodyta';
  
  try {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return 'Nenurodyta';
    return dateLt.format(dateObj);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Nenurodyta';
  }
};

// Optimized date formatting - using single instance above

// Number formatting with Intl API
export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('lt-LT').format(value);
};

// Percentage formatting with Intl API
export const formatPercentage = (value: number): string => {
  return new Intl.NumberFormat('lt-LT', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);
};

// Relative time formatting
export const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) {
    return 'Šiandien';
  } else if (diffInDays === 1) {
    return 'Vakar';
  } else if (diffInDays < 7) {
    return `${diffInDays} d. atgal`;
  } else if (diffInDays < 30) {
    const weeks = Math.floor(diffInDays / 7);
    return `${weeks} sav. atgal`;
  } else {
    return formatDate(date);
  }
};

// File size formatting
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

// Phone number formatting
export const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{3})$/);
  
  if (match) {
    return `+370 ${match[1]} ${match[2]} ${match[3]}`;
  }
  
  return phone;
};

// Address formatting
export const formatAddress = (street: string, city: string, postalCode?: string): string => {
  if (postalCode) {
    return `${street}, ${postalCode} ${city}`;
  }
  return `${street}, ${city}`;
}; 

// Utility functions for formatting and displaying values

/**
 * Formats a value to prevent showing unnecessary "0" values
 * @param value - The value to format
 * @param fallback - What to show if value is 0, null, undefined, or empty
 * @returns Formatted value or fallback
 */
export const formatValue = (value: any, fallback: string = 'Nėra'): string => {
  if (value === null || value === undefined || value === '' || value === 0) {
    return fallback;
  }
  return String(value);
};

/**
 * Formats currency values, showing fallback for zero values
 * @param amount - The amount to format
 * @param fallback - What to show if amount is 0 or null
 * @returns Formatted currency or fallback
 */
export const formatCurrencySafe = (amount: number | null | undefined, fallback: string = 'N/A'): string => {
  if (amount === null || amount === undefined || amount === 0) {
    return fallback;
  }
  return `${amount.toFixed(2)} €`;
};

/**
 * Formats numbers with fallback for zero values
 * @param number - The number to format
 * @param fallback - What to show if number is 0 or null
 * @returns Formatted number or fallback
 */
export const formatNumberSafe = (number: number | null | undefined, fallback: string = 'Nėra'): string => {
  if (number === null || number === undefined || number === 0) {
    return fallback;
  }
  return String(number);
};

/**
 * Checks if a value should be displayed (not zero, null, undefined, or empty)
 * @param value - The value to check
 * @returns True if value should be displayed
 */
export const shouldDisplay = (value: any): boolean => {
  return value !== null && value !== undefined && value !== '' && value !== 0;
};

/**
 * Conditionally renders a component only if the value should be displayed
 * @param value - The value to check
 * @param renderFn - Function that returns JSX to render
 * @returns JSX or null
 */
export const conditionalRender = (value: any, renderFn: () => React.ReactElement): React.ReactElement | null => {
  return shouldDisplay(value) ? renderFn() : null;
}; 

// Optimized debounced search hook with useDeferredValue
export const useDebouncedSearch = (delay: number = 200) => {
  const [query, setQuery] = React.useState('');
  const [debouncedQuery, setDebouncedQuery] = React.useState('');
  const deferredQuery = React.useDeferredValue(query);
  
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(deferredQuery);
    }, delay);
    
    return () => clearTimeout(timer);
  }, [deferredQuery, delay]);
  
  return { query, setQuery, debouncedQuery };
}; 