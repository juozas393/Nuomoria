import React, { useEffect, useCallback } from 'react';
import { formatCurrency, formatDate } from '../../utils/format';

// Types
interface TenantDetailData {
  id: string;
  name: string;
  apt: string;
  address: string;
  area: number;
  rooms: number;
  monthDue: number;
  monthPaid: number;
  totalDebt: number;
  metersTotal: number;
  deposit: number;
  confirmedCharges: number;
  policyUseDeposit: boolean;
  moveOutNotice?: string;
  plannedMoveOut?: string;
  actualMoveOut?: string;
  contractStart: string;
  contractEnd: string;
  daysLeftLabel: string;
  meters: {
    water: { submitted: boolean; previous: number; current: number; rate: number };
    power: { submitted: boolean; previous: number; current: number; rate: number };
    gas: { submitted: boolean; previous: number; current: number; rate: number };
    heating: { submitted: boolean; previous: number; current: number; rate: number };
  };
}

interface TenantDetailSheetProps {
  open: boolean;
  onClose: () => void;
  data: TenantDetailData;
  onAddPayment: (id: string) => void;
  onRemind: (id: string) => void;
  onOpenChat: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onMarkMovedOut: (id: string, date: string) => void;
  onApplyLateFee: (id: string) => void;
  onRefundDeposit: (id: string) => void;
  onIssueInvoice: (id: string) => void;
}

// Helper function to convert existing tenant data to TenantDetailData
export function convertTenantToDetailData(tenant: any, apartment: any): TenantDetailData {
  // Calculate days left
  const getDaysLeftLabel = (contractEnd: string) => {
    if (!contractEnd) return 'Nenurodyta';

    const endDate = new Date(contractEnd);
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return 'Baigėsi';
    } else if (diffDays === 0) {
      return 'Baigiasi šiandien';
    } else {
      return `${diffDays} dienų`;
    }
  };

  // Calculate meters total
  const metersTotal = Object.values(tenant.meterReadings || {}).reduce((total: number, meter: any) => {
    const difference = meter.current - meter.previous;
    return total + (difference * meter.rate);
  }, 0);

  // Calculate month due
  const monthDue = (tenant.monthlyRent || 0) + metersTotal;

  // Calculate total debt
  const totalDebt = (tenant.outstanding_amount || 0) + (monthDue - (tenant.paidThisMonth || 0));

  return {
    id: tenant.id,
    name: tenant.name,
    apt: apartment.apartmentNumber,
    address: tenant.address,
    area: apartment.area || 0,
    rooms: apartment.rooms || 0,
    monthDue,
    monthPaid: tenant.paidThisMonth || 0,
    totalDebt,
    metersTotal,
    deposit: tenant.deposit ?? 0,
    confirmedCharges: (tenant.cleaning || 0) + (tenant.other || 0),
    policyUseDeposit: false, // Default policy
    moveOutNotice: tenant.tenant_response_date,
    plannedMoveOut: tenant.planned_move_out_date,
    actualMoveOut: tenant.actual_move_out_date,
    contractStart: tenant.contractStart,
    contractEnd: tenant.contractEnd,
    daysLeftLabel: getDaysLeftLabel(tenant.contractEnd),
    meters: {
      water: {
        submitted: tenant.meters_submitted || false,
        previous: 45,
        current: 49,
        rate: 1.32
      },
      power: {
        submitted: tenant.meters_submitted || false,
        previous: 200,
        current: 1325,
        rate: 0.23
      },
      gas: {
        submitted: tenant.meters_submitted || false,
        previous: 0,
        current: 0,
        rate: 0.99
      },
      heating: {
        submitted: tenant.meters_submitted || false,
        previous: 0,
        current: 0,
        rate: 0.095
      }
    }
  };
}

// Helper functions
const EPS = 0.005;
const fx = (n: number) => Math.abs(n) < EPS ? 0 : Math.round(n * 100) / 100;

const formatCurrencyLt = (amount: number) => {
  return new Intl.NumberFormat('lt-LT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2
  }).format(amount);
};

const formatDateLt = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('lt-LT', { year: 'numeric', month: '2-digit', day: '2-digit' });
};

// UI Components
function Chip({ label, tone }: { label: string; tone?: 'brand' | 'danger' | 'muted' | 'warn' }) {
  const map = {
    brand: 'bg-[#2F8481]/10 text-[#2F8481] border-[#2F8481]/20',
    danger: 'bg-red-50 text-red-700 border-red-200',
    warn: 'bg-amber-50 text-amber-700 border-amber-200',
    muted: 'bg-neutral-50 text-neutral-700 border-neutral-200'
  } as const;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border ${map[tone ?? 'muted']}`}>
      {label}
    </span>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-neutral-900 mb-2">{title}</h3>
      {children}
    </section>
  );
}

function KeyRow({ k, v, bold, danger }: { k: string; v: string; bold?: boolean; danger?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-neutral-600">{k}</span>
      <span className={`${bold ? 'font-semibold text-neutral-900' : ''} ${danger ? 'text-red-600' : ''}`}>
        {v}
      </span>
    </div>
  );
}

function Result({ label, amount, good, warn }: { label: string; amount: number; good?: boolean; warn?: boolean }) {
  return (
    <div className={`mt-2 p-2 rounded-md border text-sm ${good ? 'border-emerald-200 bg-emerald-50 text-emerald-800' :
      warn ? 'border-amber-200 bg-amber-50 text-amber-800' :
        'border-neutral-200 bg-neutral-50 text-neutral-800'
      }`}>
      <b>{label}:</b> {formatCurrencyLt(amount)}
    </div>
  );
}

function MeterRow({ type, meter, icon }: {
  type: string;
  meter: { submitted: boolean; previous: number; current: number; rate: number };
  icon: string;
}) {
  const difference = meter.current - meter.previous;
  const cost = difference * meter.rate;
  const status = meter.submitted ? '✓' : '•';
  const statusColor = meter.submitted ? 'text-[#2F8481]' : 'text-amber-600';

  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <span className="text-neutral-600 capitalize">{type}:</span>
        <span className="text-neutral-500">
          {meter.previous}→{meter.current} ({difference > 0 ? '+' : ''}{difference})
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium tabular-nums">
          {formatCurrencyLt(cost)}
        </span>
        <span className={statusColor}>{status}</span>
      </div>
    </div>
  );
}

// Main Component
export function TenantDetailSheet({
  open,
  onClose,
  data,
  onAddPayment,
  onRemind,
  onOpenChat,
  onEdit,
  onDelete,
  onMarkMovedOut,
  onApplyLateFee,
  onRefundDeposit,
  onIssueInvoice
}: TenantDetailSheetProps) {
  // Calculations
  const monthLeft = fx(data.monthDue - data.monthPaid);
  const refundableRaw = data.policyUseDeposit
    ? data.deposit - data.totalDebt - data.confirmedCharges
    : 0;
  const refundable = fx(refundableRaw);
  const additionalDue = refundable < 0 ? fx(Math.abs(refundable)) : 0;

  // Late fee calculation
  const plannedDate = data.plannedMoveOut;
  const actualDate = data.actualMoveOut;
  const today = new Date();

  let lateDays = 0;
  let lateFee = 0;

  if (plannedDate) {
    const planned = new Date(plannedDate);
    const endDate = actualDate ? new Date(actualDate) : today;
    lateDays = Math.max(0, Math.ceil((endDate.getTime() - planned.getTime()) / (1000 * 60 * 60 * 24)));
    lateFee = lateDays * 25; // 25€ per day
  }

  // Disabled reasons for deposit refund
  const getDisabledReasons = () => {
    const reasons = [];
    if (!data.policyUseDeposit && data.totalDebt > 0) {
      reasons.push('Politika neleidžia dengti skolos depozitu');
    }
    if (Object.values(data.meters).some(m => !m.submitted)) {
      reasons.push('Nepatvirtinti skaitliukai');
    }
    if (lateFee > 0) {
      reasons.push('Neapspręstas vėlavimo mokestis');
    }
    return reasons;
  };

  const disabledReasons = getDisabledReasons();
  const canRefund = data.policyUseDeposit && refundable >= 0 && disabledReasons.length === 0;
  const canIssueInvoice = data.policyUseDeposit && refundable < 0;

  // Keyboard handlers
  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && open) {
      onClose();
    }
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [open, handleEscape]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Sheet */}
      <aside
        className="absolute right-0 top-0 h-dvh w-[920px] max-w-[94vw] bg-white shadow-2xl grid grid-rows-[auto,auto,1fr,auto]"
        role="dialog"
        aria-modal="true"
      >
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
          <div>
            <div className="text-lg font-semibold text-neutral-900">
              {data.name} — #{data.apt}
            </div>
            <div className="text-sm text-neutral-600">
              {data.address} • {data.area}m² • {data.rooms}k
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onAddPayment(data.id)}
              className="px-3 py-1.5 rounded-lg bg-[#2F8481] text-white text-sm hover:bg-[#2F8481]/90 transition-colors"
            >
              + Mokėjimas
            </button>
            <button
              onClick={() => onEdit(data.id)}
              className="px-3 py-1.5 rounded-lg border border-neutral-300 text-sm hover:bg-neutral-50 transition-colors"
            >
              Redaguoti
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg border border-neutral-300 hover:bg-neutral-50 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* SUMMARY CHIPS */}
        <div className="px-6 py-3 flex flex-wrap gap-2 border-b border-neutral-100">
          <Chip
            label={`Šio mėn.: ${formatCurrencyLt(fx(data.monthDue))}`}
            tone="brand"
          />
          <Chip
            label={`Skola: ${formatCurrencyLt(fx(data.totalDebt))}`}
            tone={data.totalDebt > 0 ? 'danger' : 'muted'}
          />
          <Chip
            label={`Dep.: ${formatCurrencyLt(fx(data.deposit))}`}
            tone="muted"
          />
        </div>

        {/* CONTENT */}
        <div className="px-6 overflow-auto">
          <div className="grid grid-cols-2 gap-4 py-4">
            {/* FINANSAI */}
            <Card title="Finansai">
              <KeyRow
                k="Skola (viso)"
                v={formatCurrencyLt(fx(data.totalDebt))}
                danger={data.totalDebt > 0}
              />
              <KeyRow
                k="Šio mėn. mokėtina"
                v={formatCurrencyLt(fx(data.monthDue))}
              />
              <KeyRow
                k="Sumokėta šį mėn."
                v={formatCurrencyLt(fx(data.monthPaid))}
              />
              <KeyRow
                k="Likutis šį mėn."
                v={formatCurrencyLt(monthLeft)}
                bold
              />
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => onAddPayment(data.id)}
                  className="px-3 py-1.5 rounded-lg bg-[#2F8481] text-white text-sm hover:bg-[#2F8481]/90 transition-colors"
                >
                  + Mokėjimas
                </button>
                <button className="px-3 py-1.5 rounded-lg border border-neutral-300 text-sm hover:bg-neutral-50 transition-colors">
                  Mokėjimų istorija
                </button>
              </div>
            </Card>

            {/* IŠSIKRAUSTYMAS */}
            <Card title="Išsikraustymas">
              <KeyRow
                k="Pranešimas gautas"
                v={data.moveOutNotice ? formatDateLt(data.moveOutNotice) : '—'}
              />
              <KeyRow
                k="Planuojama data"
                v={data.plannedMoveOut ? formatDateLt(data.plannedMoveOut) : '—'}
              />
              <KeyRow
                k="Faktinė data"
                v={data.actualMoveOut ? formatDateLt(data.actualMoveOut) : '—'}
              />

              {lateDays > 0 && (
                <div className="mt-2 p-2 rounded-md border border-amber-200 bg-amber-50 text-amber-800 text-sm">
                  <b>Vėluoja {lateDays} d.</b> • Vėlavimo mokestis: {formatCurrencyLt(lateFee)}
                  <button
                    onClick={() => onApplyLateFee(data.id)}
                    className="ml-2 px-2 py-1 rounded bg-amber-600 text-white text-xs hover:bg-amber-700 transition-colors"
                  >
                    Taikyti
                  </button>
                </div>
              )}

              <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                <div className="p-2 rounded-lg bg-neutral-50 border border-neutral-200">
                  <div className="text-neutral-600">Pradžia</div>
                  <div className="font-medium text-neutral-900">{formatDateLt(data.contractStart)}</div>
                </div>
                <div className="p-2 rounded-lg bg-neutral-50 border border-neutral-200">
                  <div className="text-neutral-600">Pabaiga</div>
                  <div className="font-medium text-neutral-900">{formatDateLt(data.contractEnd)}</div>
                </div>
                <div className="p-2 rounded-lg bg-neutral-50 border border-neutral-200">
                  <div className="text-neutral-600">Liko dienų</div>
                  <div className="font-medium text-neutral-900">{data.daysLeftLabel}</div>
                </div>
              </div>
            </Card>

            {/* SKAITLIUKAI */}
            <Card title={`Skaitliukai • Mokesčiai: ${formatCurrencyLt(fx(data.metersTotal))}`}>
              <MeterRow type="vanduo" meter={data.meters.water} icon="🌊" />
              <MeterRow type="elektra" meter={data.meters.power} icon="⚡" />
              <MeterRow type="dujos" meter={data.meters.gas} icon="🔥" />
              <MeterRow type="šildymas" meter={data.meters.heating} icon="🔥" />
              <div className="flex gap-2 mt-3">
                <button className="px-3 py-1.5 rounded-lg border border-neutral-300 text-sm hover:bg-neutral-50 transition-colors">
                  Pateikti
                </button>
                <button className="px-3 py-1.5 rounded-lg border border-neutral-300 text-sm hover:bg-neutral-50 transition-colors">
                  Redaguoti
                </button>
              </div>
            </Card>

            {/* DEPOZITAS */}
            <Card title="Depozito grąžinimas">
              <KeyRow k="Depozitas" v={formatCurrencyLt(fx(data.deposit))} />
              <KeyRow k="Padengiama skola" v={formatCurrencyLt(fx(data.totalDebt))} />
              <KeyRow k="Patvirtintos išlaidos" v={formatCurrencyLt(fx(data.confirmedCharges))} />
              <div className="my-2 text-xs text-neutral-600">
                Formulė: <b>depozitas – skola – patvirtintos išlaidos</b>
              </div>

              {data.policyUseDeposit ? (
                refundable >= 0 ? (
                  <Result good label="Grąžintina" amount={refundable} />
                ) : (
                  <Result warn label="Papildomai mokėtina" amount={additionalDue} />
                )
              ) : (
                <div className="mt-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
                  Grąžinimas negalimas: politika „neleisti dengti skolos depozitu".
                </div>
              )}

              {disabledReasons.length > 0 && (
                <div className="mt-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-2">
                  <div className="font-medium mb-1">Grąžinimas negalimas:</div>
                  <ul className="text-xs space-y-1">
                    {disabledReasons.map((reason, index) => (
                      <li key={index}>• {reason}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => onRefundDeposit(data.id)}
                  disabled={!canRefund}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${canRefund
                    ? 'bg-[#2F8481] text-white hover:bg-[#2F8481]/90'
                    : 'bg-neutral-200 text-neutral-600 cursor-not-allowed'
                    }`}
                >
                  Grąžinti
                </button>
                <button
                  onClick={() => onIssueInvoice(data.id)}
                  disabled={!canIssueInvoice}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${canIssueInvoice
                    ? 'bg-[#2F8481] text-white hover:bg-[#2F8481]/90'
                    : 'bg-neutral-200 text-neutral-600 cursor-not-allowed'
                    }`}
                >
                  Išrašyti sąskaitą
                </button>
              </div>
            </Card>
          </div>
        </div>

        {/* STICKY FOOTER */}
        <div className="border-t border-neutral-200 px-6 py-3 flex items-center justify-between bg-white">
          <div className="text-sm text-neutral-600">
            Kontaktai ir failai – atskiruose tabu (neužkraunam kol nereikia).
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onOpenChat(data.id)}
              className="px-3 py-1.5 rounded-lg border border-neutral-300 text-sm hover:bg-neutral-50 transition-colors"
            >
              Chat
            </button>
            <button
              onClick={() => onRemind(data.id)}
              className="px-3 py-1.5 rounded-lg border border-neutral-300 text-sm hover:bg-neutral-50 transition-colors"
            >
              Priminti
            </button>
            <button
              onClick={() => onDelete(data.id)}
              className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700 transition-colors"
            >
              Ištrinti
            </button>
            <button
              onClick={() => onIssueInvoice(data.id)}
              className="px-3 py-1.5 rounded-lg bg-[#2F8481] text-white text-sm hover:bg-[#2F8481]/90 transition-colors"
            >
              Išrašyti sąskaitą
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
