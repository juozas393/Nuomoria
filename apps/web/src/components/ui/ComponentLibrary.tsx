import React from 'react';

// Card component - thinner border, less shadow for modern look
export const Card = ({className, ...p}: React.HTMLProps<HTMLDivElement>) => 
  <section className={["rounded-xl border border-neutral-200 bg-white p-4", className].join(' ')} {...p} />;

// Button component
export const Button = ({variant="primary", className, ...p}: any) => (
  <button
    className={`h-9 px-3 rounded-xl text-sm font-medium transition ${
      variant==="primary" ? "bg-[#2F8481] text-white hover:bg-[#297674]" :
      variant==="outline" ? "border border-neutral-300 hover:bg-neutral-50" :
      variant==="success" ? "bg-green-600 text-white hover:bg-green-700" :
      variant==="warning" ? "bg-amber-600 text-white hover:bg-amber-700" :
      "hover:bg-neutral-100"
    } ${className || ''}`}
    {...p}
  />
);

// Btn alias for Button (for backward compatibility)
export const Btn = Button;

// InfoRow component for displaying key-value information
export const InfoRow = ({ label, value, className = "" }: { label: string; value: string | number; className?: string }) => (
  <div className={`flex items-center justify-between py-2 border-b border-neutral-100 last:border-b-0 ${className}`}>
    <span className="text-sm font-medium text-neutral-600">{label}</span>
    <span className="text-sm text-neutral-900">{value}</span>
  </div>
);

// KPI component
export const KPI = ({label, value, tone="neutral"}:{label:string; value:string; tone?:"brand"|"neutral"|"warn"}) => (
  <div className={[
    "rounded-xl border px-3 py-2",
    tone==="brand" ? "border-teal-200 bg-teal-50" : 
    tone==="warn" ? "border-amber-200 bg-amber-50" : 
    "border-neutral-200 bg-neutral-50"
  ].join(' ')}>
    <div className="text-xs text-neutral-500">{label}</div>
    <div className="text-[15px] font-semibold">{value}</div>
  </div>
);

// Chip component
export const Chip = ({label, tone="muted"}:{label:string; tone?:"brand"|"warn"|"muted"|"ok"}) => 
  <span className={[
    "inline-flex items-center rounded-lg px-2.5 py-1 text-[12px] font-medium",
    tone==="brand" ? "bg-teal-50 text-teal-700" : 
    tone==="ok" ? "bg-emerald-50 text-emerald-700" : 
    tone==="warn" ? "bg-amber-50 text-amber-700" : 
    "bg-neutral-100 text-neutral-700"
  ].join(' ')}>{label}</span>;

// KV (Key-Value) component
export const KV = ({ k, v, bold, danger }: { k: string; v: string; bold?: boolean; danger?: boolean }) => {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-neutral-600">{k}</span>
      <span className={`${bold ? "font-semibold text-neutral-900" : ""} ${danger ? "text-red-600" : ""}`}>{v}</span>
    </div>
  );
};
