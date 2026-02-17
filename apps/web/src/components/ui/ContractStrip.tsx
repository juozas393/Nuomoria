import { Calendar } from 'lucide-react';

type Props = {
  start?: string;
  end?: string;
  daysLeftLabel?: string;
  isExpired?: boolean;
  isEnded?: boolean;
};

export function ContractStrip({ start, end, daysLeftLabel, isExpired, isEnded }: Props) {
  const fmt = (d?: string) => d ? new Date(d).toLocaleDateString('lt-LT') : '—';

  return (
    <div className="flex items-center justify-between px-5 py-3 bg-neutral-50 border-b">
      <div className="flex items-center gap-2 text-[13px] text-neutral-600">
        <Calendar className="w-4 h-4 text-neutral-400" />
        <span className="text-neutral-500">Sutartis:</span>
        <span className="font-medium">{fmt(start)} — {fmt(end)}</span>
      </div>
      <span className={[
        "px-2.5 py-1 rounded-lg text-[12px] font-medium",
        (isExpired || isEnded) ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"
      ].join(' ')}>
        {(isExpired || isEnded) ? 'Baigėsi' : daysLeftLabel ?? '—'}
      </span>
    </div>
  );
}
