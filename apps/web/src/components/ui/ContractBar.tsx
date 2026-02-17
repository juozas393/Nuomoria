import { Calendar } from 'lucide-react';

const ContractBar = ({ start, end, rightChip }: { start?: string; end?: string; rightChip?: { tone: 'ok' | 'danger' | 'warn' | 'muted'; label: string } }) => {
  const fmt = (d?: string) => d ? new Date(d).toLocaleDateString('lt-LT') : '—';
  const chipTone = rightChip?.tone ?? 'muted';
  return (
    <div className="mt-3 h-11 rounded-xl border border-neutral-200 bg-white px-3 flex items-center justify-between">
      <div className="flex items-center gap-2 text-[13px] text-neutral-600">
        <Calendar className="w-4 h-4 text-neutral-400" />
        <span className="text-neutral-500">Sutartis:</span>
        <span className="font-medium">{fmt(start)} — {fmt(end)}</span>
      </div>
      {rightChip && (
        <span className={[
          "px-2.5 py-1 rounded-lg text-[12px] font-medium",
          chipTone === 'ok' && "bg-emerald-50 text-emerald-700",
          chipTone === 'danger' && "bg-rose-50 text-rose-700",
          chipTone === 'warn' && "bg-amber-50 text-amber-700",
          chipTone === 'muted' && "bg-neutral-100 text-neutral-700"
        ].filter(Boolean).join(' ')}>
          {rightChip.label}
        </span>
      )}
    </div>
  );
};

export { ContractBar };
