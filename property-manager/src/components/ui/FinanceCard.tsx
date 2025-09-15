type Props = {
  monthDue: number;
  monthPaid: number;
  outstanding: number;
  onViewHistory?: () => void;
};

export function FinanceCard({ monthDue, monthPaid, outstanding, onViewHistory }: Props) {
  const fx = (n: number) => {
    const EPS = 0.005;
    const v = Math.abs(n) < EPS ? 0 : Math.round(n * 100) / 100;
    return v.toLocaleString("lt-LT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const monthLeft = monthDue - monthPaid;

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[13px] font-semibold">Finansų santrauka</h3>
        {onViewHistory && (
          <button 
            className="text-xs text-[#2F8481] hover:underline"
            onClick={onViewHistory}
          >
            Mokėjimų istorija
          </button>
        )}
      </div>
      
      <dl className="space-y-2">
        <div className="flex justify-between">
          <dt className="text-sm text-neutral-600">Mėn. nuoma:</dt>
          <dd className="text-sm font-medium">{fx(monthDue)} €</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-sm text-neutral-600">Apmokėta:</dt>
          <dd className="text-sm font-medium">{fx(monthPaid)} €</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-sm text-neutral-600">Likutis:</dt>
          <dd className={`text-sm font-medium ${monthLeft > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {fx(monthLeft)} €
          </dd>
        </div>
        {outstanding > 0 && (
          <div className="flex justify-between">
            <dt className="text-sm text-neutral-600">Bendra skola:</dt>
            <dd className="text-sm font-medium text-red-600">{fx(outstanding)} €</dd>
          </div>
        )}
      </dl>
    </Card>
  );
}

const Card = ({className, ...p}: React.HTMLProps<HTMLDivElement>) => 
  <section className={["rounded-xl border border-neutral-200 bg-white p-4 shadow-sm", className].join(' ')} {...p} />;
