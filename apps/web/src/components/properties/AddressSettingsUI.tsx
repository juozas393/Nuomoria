import React, { memo } from 'react';

// ============================================================
// SHARED UI PRIMITIVES — Premium Light Theme (memoized)
// ============================================================

export const FormField = memo<{
  label: string;
  children: React.ReactNode;
  className?: string;
  helperText?: string;
}>(({ label, children, className = '', helperText }) => (
  <div className={className}>
    <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-[0.08em] mb-1">
      {label}
    </label>
    {children}
    {helperText && (
      <p className="text-[9px] text-gray-400 mt-1 leading-tight">{helperText}</p>
    )}
  </div>
));
FormField.displayName = 'FormField';

export const InputField = memo<{
  value: string | number;
  onChange: (val: string) => void;
  type?: string;
  placeholder?: string;
  suffix?: string;
}>(({ value, onChange, type = 'text', placeholder = '', suffix }) => (
  <div className="relative">
    <input
      type={type}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3.5 py-2 bg-white border border-gray-300/80 rounded-lg text-[13px] text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 focus:bg-white transition-all outline-none shadow-sm"
    />
    {suffix && (
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-medium text-gray-400">
        {suffix}
      </span>
    )}
  </div>
));
InputField.displayName = 'InputField';

export const SelectField = memo<{
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
}>(({ value, onChange, options }) => (
  <div className="relative">
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3.5 py-2 bg-white border border-gray-300/80 rounded-lg text-[13px] text-gray-900 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 focus:bg-white transition-all outline-none appearance-none cursor-pointer pr-8 shadow-sm"
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
    <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  </div>
));
SelectField.displayName = 'SelectField';

export const ToggleRow = memo<{
  label: string;
  description?: string;
  checked: boolean;
  onChange: (val: boolean) => void;
  children?: React.ReactNode;
}>(({ label, description, checked, onChange, children }) => (
  <div className={`rounded-xl border p-4 transition-all duration-200 ${checked
    ? 'bg-white border-teal-200/60 shadow-[0_1px_4px_rgba(47,132,129,0.08)]'
    : 'bg-white border-gray-100 hover:border-gray-200'
    }`}>
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-gray-900">{label}</div>
        {description && <div className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">{description}</div>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-[22px] w-10 items-center rounded-full transition-all duration-200 flex-shrink-0 ${checked ? 'bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.3)]' : 'bg-gray-200'
          }`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? 'translate-x-[22px]' : 'translate-x-1'
          }`} />
      </button>
    </div>
    {checked && children && (
      <div className="mt-3 pt-3 border-t border-gray-100/80">
        {children}
      </div>
    )}
  </div>
));
ToggleRow.displayName = 'ToggleRow';

export const Card = memo<{
  title?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}>(({ title, icon, children, className = '' }) => (
  <div
    className={`rounded-2xl border border-gray-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden bg-white ${className}`}
  >
    {title && (
      <div className="flex items-center gap-2.5 px-5 py-3 border-b border-gray-200/40">
        <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center">
          {icon}
        </div>
        <h4 className="text-[13px] font-bold text-gray-900">{title}</h4>
      </div>
    )}
    <div className="p-5">{children}</div>
  </div>
));
Card.displayName = 'Card';
