import React, { useState } from 'react';
import type { PropertyDepositEvent } from '../../lib/database';

export interface DepositJournalCardProps {
  events: PropertyDepositEvent[];
  nominalDeposit: number;
  onCreateEvent: (input: { eventType: PropertyDepositEvent['event_type']; amount: number; notes?: string }) => Promise<void> | void;
}

type DepositEventType = PropertyDepositEvent['event_type'];

const EVENT_LABELS: Record<DepositEventType, string> = {
  received: 'Gautas mokėjimas',
  adjustment: 'Koregavimas',
  refund: 'Grąžinimas'
};

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('lt-LT', { style: 'currency', currency: 'EUR' }).format(value);

export const DepositJournalCard: React.FC<DepositJournalCardProps> = ({ events, nominalDeposit, onCreateEvent }) => {
  const [eventType, setEventType] = useState<DepositEventType>('received');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Įveskite teisingą sumą.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onCreateEvent({ eventType, amount: parsedAmount, notes: notes || undefined });
      setAmount('');
      setNotes('');
    } catch (err) {
      console.error('Failed to create deposit event', err);
      setError('Nepavyko sukurti įrašo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentBalance = events.length > 0 ? events[0].balance_after ?? 0 : 0;

  return (
    <section className="rounded-3xl border border-black/10 bg-white/90 p-6 shadow-sm">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-black">Depozito žurnalas</h3>
          <p className="text-sm text-black/60">Sekite depozito įplaukas ir grąžinimus.</p>
        </div>
        <div className="text-sm text-black/70">
          <span className="font-medium text-black">Nominalas:</span> {formatCurrency(nominalDeposit)}
          <span className="ml-4 font-medium text-black">Balansas:</span> {formatCurrency(currentBalance)}
        </div>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-3">
          {events.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-black/10 px-4 py-6 text-sm text-black/60">
              Įrašų kol kas nėra.
            </p>
          ) : (
            <ul className="space-y-3">
              {events.map((event) => (
                <li key={event.id} className="rounded-2xl border border-black/10 px-4 py-3 text-sm text-black/70">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-black">{EVENT_LABELS[event.event_type]}</p>
                      <p className="text-xs text-black/60">
                        {new Date(event.created_at).toLocaleString('lt-LT')}
                      </p>
                    </div>
                    <span className="font-semibold text-black">{formatCurrency(event.amount)}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between text-xs text-black/60">
                    <span>Balansas po įrašo: {formatCurrency(event.balance_after ?? 0)}</span>
                    {event.notes && <span>Pastabos: {event.notes}</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-black/10 bg-white px-4 py-4 text-sm text-black/70">
          <h4 className="text-sm font-semibold text-black">Naujas įrašas</h4>
          <label className="block text-xs font-medium text-black/60">Tipas</label>
          <select
            value={eventType}
            onChange={(event) => setEventType(event.target.value as DepositEventType)}
            className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-[#2F8481] focus:outline-none focus:ring-2 focus:ring-[#2F8481]/20"
          >
            <option value="received">Gautas mokėjimas</option>
            <option value="adjustment">Koregavimas</option>
            <option value="refund">Grąžinimas</option>
          </select>

          <label className="block text-xs font-medium text-black/60">Suma</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-[#2F8481] focus:outline-none focus:ring-2 focus:ring-[#2F8481]/20"
            placeholder="0.00"
          />

          <label className="block text-xs font-medium text-black/60">Pastabos</label>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-[#2F8481] focus:outline-none focus:ring-2 focus:ring-[#2F8481]/20"
            placeholder="Papildoma informacija (nebūtina)"
          />

          {error && <p className="text-xs text-rose-600">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-[#2F8481] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {isSubmitting ? 'Saugoma…' : 'Pridėti įrašą'}
          </button>
        </form>
      </div>
    </section>
  );
};

export default DepositJournalCard;

















