type Props = {
  start?: string;
  end?: string;
  daysLeftLabel?: string
};

export function ContractLine({ start, end, daysLeftLabel }: Props) {
  const fmt = (d?: string) => {
    if (!d) return '—';
    const dt = new Date(d);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  };

  return (
    <div className="mt-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 flex items-center justify-between">
      <div className="text-[13px] text-neutral-600">
        <span className="text-neutral-500 mr-2">Sutartis:</span>
        <span className="font-medium">{fmt(start)} — {fmt(end)}</span>
      </div>
      <span className="px-2.5 py-1 rounded-lg text-[12px] font-medium bg-neutral-100 text-neutral-700">
        {daysLeftLabel ?? '—'}
      </span>
    </div>
  );
}
