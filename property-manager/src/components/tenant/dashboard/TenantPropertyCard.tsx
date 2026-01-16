import React from 'react';

export interface TenantPropertySummary {
  propertyId: string;
  tenantName: string;
  tenantEmail: string;
  tenantPhone: string | null;
  address: string;
  status: string;
  rent: number;
  contractEnd: string | null;
}

export interface TenantPropertyCardProps {
  summary: TenantPropertySummary | null;
}

const statusColor = (status: string): string => {
  const normalized = status.toLowerCase();
  if (normalized === 'occupied') return 'bg-[#2F8481]/10 text-[#2F8481]';
  if (normalized === 'pending') return 'bg-black/10 text-black';
  if (normalized === 'vacant') return 'bg-black/5 text-black';
  return 'bg-black/10 text-black';
};

export const TenantPropertyCard: React.FC<TenantPropertyCardProps> = ({ summary }) => {
  if (!summary) {
    return (
      <div className="rounded-2xl border border-black/10 bg-white px-6 py-5 text-sm text-black/60 shadow-sm">
        Šiuo metu neturite priskirto būsto. Kai priimsite kvietimą, informacija atsiras čia.
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-black/10 bg-white px-6 py-5 shadow-sm">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-black">Jūsų būstas</h2>
          <p className="text-sm text-black/60">{summary.address}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColor(summary.status)}`}>
          {summary.status}
        </span>
      </header>

      <dl className="mt-4 grid gap-3 text-sm text-black/70">
        <div className="flex items-center justify-between">
          <dt>Nuomininkas</dt>
          <dd className="font-medium text-black">{summary.tenantName}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt>El. paštas</dt>
          <dd className="font-medium text-black">{summary.tenantEmail}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt>Telefonas</dt>
          <dd className="font-medium text-black">{summary.tenantPhone ?? '—'}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt>Mėnesio nuoma</dt>
          <dd className="font-medium text-black">
            {new Intl.NumberFormat('lt-LT', { style: 'currency', currency: 'EUR' }).format(summary.rent)}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt>Sutarties pabaiga</dt>
          <dd className="font-medium text-black">
            {summary.contractEnd ? new Date(summary.contractEnd).toLocaleDateString('lt-LT') : '—'}
          </dd>
        </div>
      </dl>
    </section>
  );
};

export default TenantPropertyCard;






















