import * as React from 'react';

// ====== helpers ======
const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(' ');
const fmtMoney = (v?: number) => new Intl.NumberFormat('lt-LT',{style:'currency', currency:'EUR'}).format(v ?? 0);
const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('lt-LT',{year:'numeric',month:'2-digit',day:'2-digit'}) : '—';

// ====== UI tokens ======
const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({className, ...p}) => (
  <div className={cx('bg-white border border-gray-200 rounded-lg p-4', className)} {...p}/>
);

const Button: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary'|'secondary'|'danger' }
> = ({variant='secondary', className, ...p}) => (
  <button
    className={cx(
      'px-4 py-2 rounded-md text-sm font-medium transition-colors',
      variant === 'primary' && 'bg-blue-600 text-white hover:bg-blue-700',
      variant === 'secondary' && 'bg-gray-100 text-gray-700 hover:bg-gray-200',
      variant === 'danger' && 'bg-red-600 text-white hover:bg-red-700',
      className
    )}
    {...p}
  />
);

// ====== PAGRINDAS ======
type Money = number;
type MeterItem = { id:string; kind:'water_cold'|'water_hot'|'electricity'|'gas'|'heating'; label:string; lastReading?:string; status:'approved'|'pending'|'missing' };
type Finance = { monthDue:Money; monthPaid:Money; totalDebt:Money; deposit:Money; };
type PropertyInfo = { address?:string; rooms?:number; area?:number; floor?:number; };
type MoveOut = { notice?:string; planned?:string; actual?:string; };

export function TenantOverviewPro({
  tenant,
  onOpenProperty, onOpenMeters, onOpenDocs, onOpenChat,
  onEdit, onDelete, onInvoice, onAddPayment, onRefund
}: {
  tenant: {
    name:string; email:string;
    finance: Finance; property?: PropertyInfo; meters: MeterItem[]; moveOut: MoveOut;
  };
  onOpenProperty: () => void;
  onOpenMeters: () => void;
  onOpenDocs: () => void;
  onOpenChat: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onInvoice: () => void;
  onAddPayment: () => void;
  onRefund: () => void;
}) {
  const { finance, property, meters, moveOut } = tenant;
  const refundable = Math.max(0, (finance.deposit ?? 0) - (finance.totalDebt ?? 0));
  const approvedMeters = meters.filter(m => m.status === 'approved').length;

  return (
    <div className="space-y-6">
      {/* KPI juosta - kompaktiška */}
      <div className="grid [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))] data-[compact=true]:[grid-template-columns:repeat(auto-fit,minmax(190px,1fr))] gap-4 data-[compact=true]:gap-3">
        <div className="rounded-xl border border-neutral-200 bg-white p-4 data-[compact=true]:p-3">
          <div className="text-2xl data-[compact=true]:text-xl font-bold tabular-nums text-[#2F8481] leading-tight">{fmtMoney(finance.monthDue)}</div>
          <div className="text-sm data-[compact=true]:text-[13px] text-neutral-600 mt-1">Nuomos mokestis</div>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4 data-[compact=true]:p-3">
          <div className="text-2xl data-[compact=true]:text-xl font-bold tabular-nums text-[#2F8481] leading-tight">{fmtMoney(finance.monthPaid)}</div>
          <div className="text-sm data-[compact=true]:text-[13px] text-neutral-600 mt-1">Sumokėta</div>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4 data-[compact=true]:p-3">
          <div className="text-2xl data-[compact=true]:text-xl font-bold tabular-nums text-[#2F8481] leading-tight">{fmtMoney(finance.totalDebt)}</div>
          <div className="text-sm data-[compact=true]:text-[13px] text-neutral-600 mt-1">Skola</div>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4 data-[compact=true]:p-3">
          <div className="text-2xl data-[compact=true]:text-xl font-bold tabular-nums text-[#2F8481] leading-tight">{fmtMoney(finance.deposit)}</div>
          <div className="text-sm data-[compact=true]:text-[13px] text-neutral-600 mt-1">Depozitas</div>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4 data-[compact=true]:p-3">
          <div className="text-2xl data-[compact=true]:text-xl font-bold tabular-nums text-[#2F8481] leading-tight">{fmtMoney(refundable)}</div>
          <div className="text-sm data-[compact=true]:text-[13px] text-neutral-600 mt-1">Grąžinti</div>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4 data-[compact=true]:p-3">
          <div className="text-2xl data-[compact=true]:text-xl font-bold tabular-nums text-[#2F8481] leading-tight">{approvedMeters}/{meters.length}</div>
          <div className="text-sm data-[compact=true]:text-[13px] text-neutral-600 mt-1">Skaitliukai</div>
        </div>
      </div>

      {/* Pagrindinė informacija - 2 kolonos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kairė kolona - Būstas ir skaitliukai */}
        <div className="lg:col-span-2 space-y-4">
          {/* Būsto informacija */}
          <Card className="p-4 data-[compact=true]:p-3">
            <div className="flex items-center justify-between mb-3 data-[compact=true]:mb-2">
              <h3 className="text-lg data-[compact=true]:text-base font-semibold text-gray-800">Būsto informacija</h3>
              <Button variant="secondary" onClick={onOpenProperty} className="text-sm">
                Peržiūrėti
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500">Adresas</div>
                <div className="font-medium">{property?.address || 'Nenurodyta'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Kambarių skaičius</div>
                <div className="font-medium">{property?.rooms || '—'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Plotas</div>
                <div className="font-medium">{property?.area ? `${property.area} m²` : '—'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Aukštas</div>
                <div className="font-medium">{property?.floor || '—'}</div>
              </div>
            </div>
          </Card>

          {/* Skaitliukai */}
          <Card className="p-4 data-[compact=true]:p-3">
            <div className="flex items-center justify-between mb-3 data-[compact=true]:mb-2">
              <h3 className="text-lg data-[compact=true]:text-base font-semibold text-gray-800">Skaitliukai</h3>
              <Button variant="secondary" onClick={onOpenMeters} className="text-sm">
                Visi ({meters.length})
              </Button>
            </div>
            {meters.length > 0 ? (
              <div className="space-y-2">
                {meters.slice(0, 4).map(meter => (
                  <div key={meter.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                    <div>
                      <div className="font-medium text-sm">{meter.label}</div>
                      <div className="text-xs text-gray-500">{meter.kind}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-sm">{meter.lastReading || '—'}</div>
                      <div className={`text-xs px-2 py-1 rounded-full ${
                        meter.status === 'approved' ? 'bg-green-100 text-green-700' :
                        meter.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {meter.status === 'approved' ? 'Patvirtinta' : 
                         meter.status === 'pending' ? 'Laukia' : 'Nepateikta'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-4">Skaitliukų nėra</div>
            )}
          </Card>
        </div>

        {/* Dešinė kolona - Veiksmai ir finansai */}
        <div className="space-y-4 data-[compact=true]:space-y-3">
          {/* Veiksmai */}
          <Card className="p-4 data-[compact=true]:p-3">
            <h3 className="text-lg data-[compact=true]:text-base font-semibold text-gray-800 mb-3 data-[compact=true]:mb-2">Veiksmai</h3>
            <div className="space-y-3 data-[compact=true]:space-y-2">
              <Button variant="primary" onClick={onEdit} className="w-full h-12 data-[compact=true]:h-10 text-base data-[compact=true]:text-sm">
                Redaguoti
              </Button>
              <Button variant="danger" onClick={onDelete} className="w-full h-12 data-[compact=true]:h-10 text-base data-[compact=true]:text-sm">
                Ištrinti
              </Button>
              <div className="pt-2 space-y-2">
                <Button variant="secondary" onClick={onInvoice} className="w-full text-sm">
                  Išrašyti sąskaitą
                </Button>
                <Button variant="secondary" onClick={onAddPayment} className="w-full text-sm">
                  + Pridėti mokėjimą
                </Button>
                <Button variant="secondary" onClick={onRefund} className="w-full text-sm">
                  Grąžinti depozitą
                </Button>
              </div>
            </div>
          </Card>

          {/* Depozito skaičiavimas */}
          <Card className="p-4 data-[compact=true]:p-3">
            <h3 className="text-lg data-[compact=true]:text-base font-semibold text-gray-800 mb-3 data-[compact=true]:mb-2">Depozitas</h3>
            <div className="space-y-2 data-[compact=true]:space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Suma:</span>
                <span className="font-medium tabular-nums">{fmtMoney(finance.deposit)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Skola:</span>
                <span className="font-medium tabular-nums">{fmtMoney(finance.totalDebt)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-200">
                <span className="text-gray-800 font-medium">Grąžinti:</span>
                <span className="font-bold text-green-600 tabular-nums">{fmtMoney(refundable)}</span>
              </div>
            </div>
          </Card>

          {/* Išsikraustymas */}
          <Card className="p-4 data-[compact=true]:p-3">
            <h3 className="text-lg data-[compact=true]:text-base font-semibold text-gray-800 mb-3 data-[compact=true]:mb-2">Išsikraustymas</h3>
            <div className="space-y-2 data-[compact=true]:space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Pranešimas:</span>
                <span className="font-medium tabular-nums">{fmtDate(moveOut.notice)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Planuojama:</span>
                <span className="font-medium tabular-nums">{fmtDate(moveOut.planned)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Būsena:</span>
                <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs">
                  Laukia
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Apatinė juosta - greitieji veiksmai */}
      <Card className="p-4 data-[compact=true]:p-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg data-[compact=true]:text-base font-semibold text-gray-800">Greitieji veiksmai</h3>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onOpenDocs} className="text-sm">
              Dokumentai
            </Button>
            <Button variant="secondary" onClick={onOpenChat} className="text-sm">
              Pokalbiai
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
