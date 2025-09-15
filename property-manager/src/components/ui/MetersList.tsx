type Props = {
  meters?: Array<{
    type: 'water_cold' | 'water_hot' | 'electricity' | 'gas' | 'heating';
    value: number;
    unit: 'm3' | 'kWh';
    amountEur: number;
    submittedAt: string;
    status: 'pending' | 'confirmed' | 'rejected';
  }>;
  onOpenPhotos?: () => void;
};

export function MetersList({ meters, onOpenPhotos }: Props) {
  const fx = (n: number) => {
    const EPS = 0.005;
    const v = Math.abs(n) < EPS ? 0 : Math.round(n * 100) / 100;
    return v.toLocaleString("lt-LT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('lt-LT', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const getMeterIcon = (type: string) => {
    switch (type) {
      case 'water_cold': return '🌊';
      case 'electricity': return '⚡';
      case 'gas': return '🔥';
      default: return '🔥';
    }
  };

  const getMeterName = (type: string) => {
    switch (type) {
      case 'water_cold': return 'Vanduo';
      case 'electricity': return 'Elektra';
      case 'gas': return 'Dujos';
      default: return 'Šildymas';
    }
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'confirmed': return <Chip label="Patvirtinta" tone="ok" />;
      case 'pending': return <Chip label="Laukia" tone="warn" />;
      case 'rejected': return <Chip label="Atmesta" tone="muted" />;
      default: return <Chip label="Nepateikta" tone="muted" />;
    }
  };

  return (
    <Card>
             <div className="flex items-center justify-between mb-3">
         <h3 className="text-[13px] font-semibold">Skaitliukai</h3>
       </div>
      
      <div className="grid grid-cols-2 gap-4">
        {meters?.map((meter, index) => (
          <div key={index} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{getMeterIcon(meter.type)}</span>
                <span className="text-sm font-medium">{getMeterName(meter.type)}</span>
              </div>
              {getStatusChip(meter.status)}
            </div>
            
            <div className="text-sm">
              <div className="text-neutral-600">Paskutinis rodmuo:</div>
              <div className="font-medium">{meter.value} {meter.unit}</div>
              <div className="text-xs text-neutral-500">{formatDate(meter.submittedAt)}</div>
            </div>
            
            <div className="text-sm font-medium">{fx(meter.amountEur)} €</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

const Card = ({className, ...p}: React.HTMLProps<HTMLDivElement>) => 
  <section className={["rounded-xl border border-neutral-200 bg-white p-4 shadow-sm", className].join(' ')} {...p} />;

const Chip = ({label, tone="muted"}:{label:string; tone?:"brand"|"warn"|"muted"|"ok"}) => 
  <span className={[
    "inline-flex items-center rounded-lg px-2.5 py-1 text-[12px] font-medium",
    tone==="brand" ? "bg-teal-50 text-teal-700" : 
    tone==="ok" ? "bg-emerald-50 text-emerald-700" : 
    tone==="warn" ? "bg-amber-50 text-amber-700" : 
    "bg-neutral-100 text-neutral-700"
  ].join(' ')}>{label}</span>;
