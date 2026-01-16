import * as React from 'react';
import { money } from '../ui/primitives';

export function ManagerTopBar({
  tenant, onActions,
}:{
  tenant: {
    finance: { depositPaid: boolean, monthDue: number, monthPaid: number, totalDebt: number },
    contractStart: string,
    contractEnd: string,
    meters: Array<{ approved: boolean }>,
    moveOut: { planned?: string, actual?: string },
    docs: { deposit?: boolean, lease?: boolean }
  },
  onActions: {
    invoice: () => void,
    addPayment: () => void,
    approveMeters: () => void,
    remindMeters: () => void,
    prepareMoveout: () => void,
    refund: () => void,
    edit: () => void
  }
}) {
  // Simplified meter stats
  const metersStats = {
    approved: tenant.meters.filter(m => m.approved).length,
    total: tenant.meters.length
  };

  // Simplified remainder calculation
  const remainder = tenant.finance.monthDue - tenant.finance.monthPaid;
  const refundable = remainder > 0;

  // Simplified alerts and actions
  const alerts: Array<{text: string, tone: string}> = [];
  const nextAction = null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 p-4 bg-white rounded-md border">
      {/* KPIs */}
      <div className="col-span-2 md:col-span-4 lg:col-span-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi label="Depozitas"        value={tenant.finance.depositPaid ? "Sumokėtas" : "Nesumokėtas"} />
          <Kpi label="Mėn. mokestis"    value={money(tenant.finance.monthDue)} />
          <Kpi label="Sumokėta"         value={money(tenant.finance.monthPaid)} />
          <Kpi label="Skaitliukai"      value={`${metersStats.approved}/${metersStats.total}`} />
        </div>
      </div>

      {/* Įspėjimai */}
      {alerts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {alerts.slice(0,5).map((a, i) => (
            <span key={i}
              className={[
                'inline-flex items-center rounded-md border px-2 py-1 text-xs',
                a.tone === 'danger' ? 'border-black/20 text-black bg-white'
              : a.tone === 'warn'   ? 'border-black/20 text-black bg-white'
              :                       'border-black/15 text-black bg-white'
              ].join(' ')}
            >
              {a.text}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function Kpi({label, value}: {label: string, value: string | number}) {
  return (
    <div className="text-center p-2">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}