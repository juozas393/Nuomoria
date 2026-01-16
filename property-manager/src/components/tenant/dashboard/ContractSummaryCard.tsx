import React from 'react';

export interface ContractSummary {
  contractType: string;
  monthlyRent: number;
  depositAmount: number;
  utilitiesIncluded: boolean;
  nextPaymentDate: string | null;
  daysUntilPayment: number | null;
}

export interface ContractSummaryCardProps {
  summary: ContractSummary | null;
}

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('lt-LT', { style: 'currency', currency: 'EUR' }).format(value);

export const ContractSummaryCard: React.FC<ContractSummaryCardProps> = ({ summary }) => {
  if (!summary) {
    return (
      <div className="rounded-2xl border border-black/10 bg-white px-6 py-5 text-sm text-black/60 shadow-sm">
        Sutarties informacija dar neįkelta.
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-black/10 bg-white px-6 py-5 shadow-sm">
      <header className="mb-4">
        <h2 className="text-lg font-semibold text-black">Sutarties santrauka</h2>
        <p className="text-sm text-black/60">Pagrindiniai aktyvios nuomos sutarties duomenys.</p>
      </header>

      <dl className="grid gap-3 text-sm text-black/70">
        <div className="flex items-center justify-between">
          <dt>Sutarties tipas</dt>
          <dd className="font-medium text-black">{summary.contractType}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt>Mėnesio nuoma</dt>
          <dd className="font-medium text-black">{formatCurrency(summary.monthlyRent)}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt>Depozitas</dt>
          <dd className="font-medium text-black">{formatCurrency(summary.depositAmount)}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt>Komunaliniai įskaičiuoti</dt>
          <dd className="font-medium text-black">{summary.utilitiesIncluded ? 'Taip' : 'Ne'}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt>Kitas mokėjimas</dt>
          <dd className="font-medium text-black">
            {summary.nextPaymentDate ? new Date(summary.nextPaymentDate).toLocaleDateString('lt-LT') : '—'}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt>Dienos iki mokėjimo</dt>
          <dd className="font-medium text-black">
            {summary.daysUntilPayment != null ? `${summary.daysUntilPayment} d.` : '—'}
          </dd>
        </div>
      </dl>
    </section>
  );
};

export default ContractSummaryCard;

















