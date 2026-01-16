import React from 'react';
import type { RentLedgerEntry } from '../../lib/propertyFinancials';

export interface RentLedgerCardProps {
  entries: RentLedgerEntry[];
}

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('lt-LT', { style: 'currency', currency: 'EUR' }).format(value);

export const RentLedgerCard: React.FC<RentLedgerCardProps> = ({ entries }) => {
  if (entries.length === 0) {
    return (
      <section className="rounded-3xl border border-black/10 bg-white/90 p-6 shadow-sm text-sm text-black/60">
        Nuomos sąskaitų kol kas nėra.
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-black/10 bg-white/90 p-6 shadow-sm">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-black">Nuomos grafikas</h3>
          <p className="text-sm text-black/60">Stebėkite sąskaitas ir apmokėjimus.</p>
        </div>
      </header>

      <div className="space-y-3">
        {entries.map((entry) => {
          const status = entry.status;
          const invoice = entry.invoice;
          const dueDate = new Date(invoice.due_date).toLocaleDateString('lt-LT');
          const issuedDate = new Date(invoice.invoice_date).toLocaleDateString('lt-LT');

          return (
            <article key={invoice.id} className="rounded-2xl border border-black/10 px-4 py-3 text-sm text-black/70">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-black">{invoice.invoice_number}</p>
                  <p className="text-xs text-black/60">Išrašyta {issuedDate}</p>
                  <p className="text-xs text-black/60">Terminas {dueDate}</p>
                </div>
                <span className="rounded-full px-3 py-1 text-xs font-semibold text-black bg-black/5 uppercase tracking-[0.18em]">
                  {status}
                </span>
              </div>

              <dl className="mt-3 grid gap-2 text-xs text-black/60 sm:grid-cols-3">
                <div>
                  <dt className="font-semibold text-black">Suma</dt>
                  <dd>{formatCurrency(invoice.amount)}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-black">Apmokėta</dt>
                  <dd>{formatCurrency(entry.paidAmount)}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-black">Likutis</dt>
                  <dd>{formatCurrency(entry.balance)}</dd>
                </div>
              </dl>

              {entry.payments.length > 0 && (
                <div className="mt-3 overflow-hidden rounded-xl border border-black/10">
                  <table className="w-full text-xs">
                    <thead className="bg-black/5 text-black/60">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Data</th>
                        <th className="px-3 py-2 text-left font-medium">Suma</th>
                        <th className="px-3 py-2 text-left font-medium">Būdas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entry.payments.map((payment) => (
                        <tr key={payment.id} className="border-t border-black/5 text-black/70">
                          <td className="px-3 py-2">{new Date(payment.paid_at ?? payment.created_at).toLocaleDateString('lt-LT')}</td>
                          <td className="px-3 py-2">{formatCurrency(payment.amount)}</td>
                          <td className="px-3 py-2">{payment.payment_method ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default RentLedgerCard;

















