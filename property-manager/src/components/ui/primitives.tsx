import * as React from 'react';

export const cx = (...c:(string|false|null|undefined)[]) => c.filter(Boolean).join(' ');
export const money = (v?:number) => new Intl.NumberFormat('lt-LT',{style:'currency',currency:'EUR'}).format(v ?? 0);
export const dateLt = (d?:string) => d ? new Date(d).toLocaleDateString('lt-LT',{year:'numeric',month:'2-digit',day:'2-digit'}) : '—';

export const Card:React.FC<React.HTMLAttributes<HTMLDivElement>> = ({className,...p}) =>
  <section className={cx('rounded-lg border border-black/10 bg-white p-2 overflow-hidden',className)} {...p}/>;

export const Button:React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & {variant?:'brand'|'outline'}> =
({variant='outline',className,type,children,...p}) =>
  <button type={type ?? 'button'}
    className={cx(
      'h-8 rounded-md px-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#2F8481]/40 transition-colors overflow-hidden',
      variant==='brand' ? 'bg-[#2F8481] text-white hover:bg-[#2a7875]'
                        : 'border border-black/15 text-black hover:bg-black/[0.03]',
      className
    )}
    {...p}
  >
    <span className="truncate block">{children}</span>
  </button>;

export const Kpi:React.FC<{label:string; value:string; hint?:string}> = ({label,value,hint}) =>
  <div className="rounded-md border border-black/10 bg-white p-2 overflow-hidden">
    <div className="text-lg font-bold tabular-nums text-[#2F8481] leading-tight truncate">{value}</div>
    <div className="text-xs text-black/70 truncate">{label}</div>
    {hint && <div className="text-[10px] text-black/50 mt-0.5 truncate">{hint}</div>}
  </div>;

export const Row:React.FC<{l:string; r:string; dim?:boolean}> = ({l,r,dim}) =>
  <div className="flex justify-between items-center py-1 min-w-0">
    <span className={cx('text-xs truncate', dim ? 'text-black/50' : 'text-black/70')}>{l}</span>
    <span className="text-xs font-medium tabular-nums truncate ml-2">{r}</span>
  </div>;
