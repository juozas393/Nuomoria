import React from 'react';

interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'neutral';
  size?: 'sm' | 'md';
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  size = 'md',
  children,
  className = ''
}) => {
  const baseClasses = "inline-flex items-center font-medium rounded-md";
  
  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-xs"
  };
  
  const variantClasses = {
    default: "bg-primary-light text-primary border border-primary/20",
    success: "bg-success-50 text-success-600 border border-success-500/20",
    warning: "bg-warning-50 text-warning-600 border border-warning-500/20",
    danger: "bg-danger-50 text-danger-600 border border-danger-500/20",
    neutral: "bg-neutral-100 text-neutral-600 border border-neutral-200"
  };
  
  return (
    <span className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  );
};

interface BadgeWithLabelProps {
  label: string;
  value: string;
  tone?: 'brand' | 'neutral' | 'warn';
}

export const BadgeWithLabel: React.FC<BadgeWithLabelProps> = ({
  label,
  value,
  tone = 'neutral'
}) => (
  <span className={[
    "inline-flex items-center gap-2 rounded-full px-3 py-1 text-[12px] border",
    tone === 'brand' ? "bg-teal-50 border-teal-200 text-teal-700" :
    tone === 'warn'  ? "bg-amber-50 border-amber-200 text-amber-700" :
                       "bg-neutral-50 border-neutral-200 text-neutral-700"
  ].join(' ')}>
    <span className="text-neutral-500">{label}</span>
    <span className="font-medium">{value}</span>
  </span>
);
