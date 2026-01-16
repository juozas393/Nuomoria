import React, { useMemo, useState } from 'react';
import type { PropertyInfo } from './TenantDetailModalPro';
import type { Tenant } from '../../types/tenant';
import type { RentLedgerEntry } from '../../lib/propertyFinancials';
import { createInvoiceForProperty, recordInvoicePayment } from '../../lib/propertyFinancials';
import { propertyApi } from '../../lib/database';
import { createNotification } from '../../lib/notifications';
import { supabase } from '../../lib/supabase';
import { ModalPortal } from '../ui/ModalPortal';
import { InvoiceQuickCreateForm, type InvoiceQuickCreateValues, type InvoiceChargeSummaryItem } from '../invoices/InvoiceQuickCreateForm';

const ACTION_BUTTON_CLASS =
  'inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-medium text-black shadow-sm transition-colors hover:border-[#2F8481]/40 hover:bg-[#2F8481]/10';

interface PropertyQuickActionsBarProps {
  property: PropertyInfo;
  tenant: Tenant;
  ledger: RentLedgerEntry[];
  currentUserId?: string;
  onFinancialsRefresh?: () => Promise<void> | void;
  onPropertyRefresh?: () => Promise<void> | void;
  onPropertyMutate?: (updates: Partial<PropertyInfo>) => void;
  invoiceDefaults?: {
    rent: number;
    utilities: number;
    other: number;
    summary: InvoiceChargeSummaryItem[];
  };
}

interface ActionState {
  type: 'invoice' | 'payment' | 'rent' | 'terminate' | 'vacate' | 'reminder' | null;
}

const defaultActionState: ActionState = { type: null };

const todayIso = () => new Date().toISOString().split('T')[0];
const isoDatePlusDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('lt-LT', { style: 'currency', currency: 'EUR' }).format(value);

export const PropertyQuickActionsBar: React.FC<PropertyQuickActionsBarProps> = ({
  property,
  tenant,
  ledger,
  currentUserId,
  onFinancialsRefresh,
  onPropertyRefresh,
  onPropertyMutate,
  invoiceDefaults
}) => {
  const [actionState, setActionState] = useState<ActionState>(defaultActionState);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const invoicesWithBalance = useMemo(() => ledger.filter((entry) => entry.balance > 0), [ledger]);

  const resolvedInvoiceDefaults = useMemo(() => {
    return (
      invoiceDefaults ?? {
        rent: property.rent ?? tenant.monthlyRent ?? 0,
        utilities: 0,
        other: 0,
        summary: [
          {
            label: 'Nuoma',
            amount: property.rent ?? tenant.monthlyRent ?? 0
          }
        ]
      }
    );
  }, [invoiceDefaults, property.rent, tenant.monthlyRent]);

  const closeModal = () => {
    setActionState(defaultActionState);
    setIsProcessing(false);
    setError(null);
  };

  const handleInvoiceCreate = async (values: InvoiceQuickCreateValues) => {
    setIsProcessing(true);
    setError(null);
    try {
      await createInvoiceForProperty({
        propertyId: property.id,
        dueDate: values.dueDate,
        rentAmount: values.rentAmount,
        utilitiesAmount: values.utilitiesAmount,
        otherAmount: values.otherAmount,
        notes: values.notes,
        createdBy: currentUserId
      });

      closeModal();
      setInfoMessage('Sąskaita sukurta.');
      await onFinancialsRefresh?.();
    } catch (err) {
      console.error('Failed to create invoice', err);
      setError('Nepavyko sukurti sąskaitos. Bandykite dar kartą.');
      setIsProcessing(false);
    }
  };

  const handlePaymentRecord: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const invoiceId = formData.get('invoiceId') as string;
    const amount = Number(formData.get('amount') || 0);
    const paymentMethod = (formData.get('paymentMethod') as any) || 'bank_transfer';
    const paidAt = (formData.get('paidAt') as string) || todayIso();
    const notes = (formData.get('notes') as string) || undefined;

    if (!invoiceId || amount <= 0) {
      setError('Pasirinkite sąskaitą ir įveskite sumą.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    try {
      await recordInvoicePayment({
        invoiceId,
        amount,
        paymentMethod,
        paidAt,
        notes,
        createdBy: currentUserId
      });

      setInfoMessage('Mokėjimas užregistruotas.');
      closeModal();
      await onFinancialsRefresh?.();
    } catch (err) {
      console.error('Failed to record payment', err);
      setError('Nepavyko užregistruoti mokėjimo.');
      setIsProcessing(false);
    }
  };

  const handleRentUpdate: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const rent = Number(formData.get('rent') || 0);

    if (rent <= 0) {
      setError('Įveskite galiojančią nuomos sumą.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    try {
      await propertyApi.update(property.id, { rent });
      setInfoMessage('Nuomos suma atnaujinta.');
      closeModal();
      onPropertyMutate?.({ rent });
      await onPropertyRefresh?.();
    } catch (err) {
      console.error('Failed to update rent', err);
      setError('Nepavyko atnaujinti nuomos sumos.');
      setIsProcessing(false);
    }
  };

  const handleStatusChange = async (status: 'vacant' | 'maintenance') => {
    setIsProcessing(true);
    setError(null);
    try {
      await propertyApi.update(property.id, {
        status,
        planned_move_out_date: todayIso()
      });
      setInfoMessage(status === 'vacant' ? 'Būstas pažymėtas kaip laisvas.' : 'Būstas pažymėtas priežiūrai.');
      closeModal();
      onPropertyMutate?.({ status });
      await onPropertyRefresh?.();
    } catch (err) {
      console.error('Failed to update property status', err);
      setError('Nepavyko atnaujinti būsto būsenos.');
      setIsProcessing(false);
    }
  };

  const handleSendReminder: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const message = (formData.get('message') as string) || 'Prašome apmokėti vėluojančią sąskaitą.';

    setIsProcessing(true);
    setError(null);
    try {
      let tenantUserId: string | null = null;
      if (tenant.email) {
        const { data, error } = await supabase
          .from('users')
          .select('id')
          .eq('email', tenant.email)
          .maybeSingle();

        if (!error && data?.id) {
          tenantUserId = data.id;
        }
      }

      if (tenantUserId) {
        await createNotification({
          userId: tenantUserId,
          kind: 'rent.reminder',
          title: 'Nuomos priminimas',
          body: message,
          data: {
            propertyId: property.id,
            tenantId: tenant.id,
            issuedAt: new Date().toISOString()
          }
        });
        setInfoMessage('Priminimas išsiųstas nuomininkui.');
      } else {
        setInfoMessage('Nuomininko neradome sistemoje – priminimo nepavyko išsiųsti.');
      }
      closeModal();
    } catch (err) {
      console.error('Failed to send reminder', err);
      setError('Nepavyko išsiųsti priminimo.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="sticky top-0 z-20 -mx-6 mb-4 border-b border-black/5 bg-white/90 px-6 py-4 backdrop-blur">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={ACTION_BUTTON_CLASS} onClick={() => setActionState({ type: 'invoice' })}>
          Išrašyti sąskaitą
        </button>
        <button type="button" className={ACTION_BUTTON_CLASS} onClick={() => setActionState({ type: 'payment' })}>
          Pažymėti apmokėjimą
        </button>
        <button type="button" className={ACTION_BUTTON_CLASS} onClick={() => setActionState({ type: 'reminder' })}>
          Siųsti priminimą
        </button>
        <button type="button" className={ACTION_BUTTON_CLASS} onClick={() => setActionState({ type: 'rent' })}>
          Redaguoti nuomą
        </button>
        <button
          type="button"
          className={ACTION_BUTTON_CLASS}
          onClick={() => setActionState({ type: 'terminate' })}
        >
          Nutraukti sutartį
        </button>
        <button
          type="button"
          className={ACTION_BUTTON_CLASS}
          onClick={() => setActionState({ type: 'vacate' })}
        >
          Paskelbti laisvą
        </button>
      </div>

      {infoMessage && (
        <p className="mt-3 rounded-lg border border-[#2F8481]/30 bg-[#2F8481]/10 px-3 py-2 text-sm text-[#2F8481]">
          {infoMessage}
        </p>
      )}

      {actionState.type === 'invoice' && (
        <ActionModal title="Išrašyti sąskaitą" onClose={closeModal} isProcessing={isProcessing} error={null}>
          <InvoiceQuickCreateForm
            defaultDueDate={isoDatePlusDays(7)}
            defaultRent={resolvedInvoiceDefaults.rent}
            defaultUtilities={resolvedInvoiceDefaults.utilities}
            defaultOther={resolvedInvoiceDefaults.other}
            chargeSummary={resolvedInvoiceDefaults.summary}
            isSubmitting={isProcessing}
            errorMessage={error}
            onSubmit={handleInvoiceCreate}
            onCancel={closeModal}
          />
        </ActionModal>
      )}

      {actionState.type === 'payment' && (
        <ActionModal title="Registruoti mokėjimą" onClose={closeModal} isProcessing={isProcessing} error={error}>
          {invoicesWithBalance.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-black/10 bg-black/5 px-4 py-6 text-sm text-black/60">
              Vėluojančių ar neapmokėtų sąskaitų nėra. Sukurkite naują sąskaitą, kad galėtumėte registruoti mokėjimą.
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handlePaymentRecord}>
              <div>
                <label className="text-xs font-medium uppercase tracking-[0.18em] text-black/50">Sąskaita</label>
                <select
                  name="invoiceId"
                  className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm focus:border-[#2F8481] focus:outline-none focus:ring-2 focus:ring-[#2F8481]/30"
                  required
                  defaultValue=""
                >
                  <option value="" disabled>
                    Pasirinkite sąskaitą
                  </option>
                  {invoicesWithBalance.map(({ invoice, balance }) => (
                    <option key={invoice.id} value={invoice.id}>
                      {invoice.invoice_number} • likutis {formatCurrency(balance)}
                    </option>
                  ))}
                </select>
              </div>
              <InputField label="Suma" name="amount" type="number" step="0.01" defaultValue={property.rent ?? 0} />
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium uppercase tracking-[0.18em] text-black/50">Mokėjimo būdas</label>
                  <select
                    name="paymentMethod"
                    className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm focus:border-[#2F8481] focus:outline-none focus:ring-2 focus:ring-[#2F8481]/30"
                  >
                    <option value="bank_transfer">Bankinis pavedimas</option>
                    <option value="cash">Grynieji</option>
                    <option value="card">Kortelė</option>
                    <option value="check">Čekis</option>
                    <option value="other">Kita</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium uppercase tracking-[0.18em] text-black/50">Gavimo data</label>
                  <input
                    type="date"
                    name="paidAt"
                    defaultValue={todayIso()}
                    className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm focus:border-[#2F8481] focus:outline-none focus:ring-2 focus:ring-[#2F8481]/30"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-[0.18em] text-black/50">Pastabos</label>
                <textarea
                  name="notes"
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm focus:border-[#2F8481] focus:outline-none focus:ring-2 focus:ring-[#2F8481]/30"
                  placeholder="Papildoma informacija"
                />
              </div>
              <ModalActions isProcessing={isProcessing} submitLabel="Išsaugoti" onCancel={closeModal} />
            </form>
          )}
        </ActionModal>
      )}

      {actionState.type === 'rent' && (
        <ActionModal title="Redaguoti nuomos kainą" onClose={closeModal} isProcessing={isProcessing} error={error}>
          <form className="space-y-4" onSubmit={handleRentUpdate}>
            <InputField label="Mėnesinė nuoma" name="rent" type="number" step="0.01" defaultValue={property.rent ?? 0} />
            <p className="rounded-lg bg-[#2F8481]/5 px-3 py-2 text-sm text-black/60">
              Nauja suma įsigalios iš karto ir bus naudojama būsimiems grafiko skaičiavimams.
            </p>
            <ModalActions isProcessing={isProcessing} submitLabel="Išsaugoti" onCancel={closeModal} />
          </form>
        </ActionModal>
      )}

      {actionState.type === 'terminate' && (
        <ActionModal title="Nutraukti sutartį" onClose={closeModal} isProcessing={isProcessing} error={error}>
          <div className="space-y-4 text-sm text-black/70">
            <p>
              Patvirtinus veiksmas pažymės būstą kaip priežiūros režimą ir nustatys planuojamą išsikraustymo datą šiandienai. Nuomininkas nebus pašalintas – tai galima atlikti rankiniu būdu.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="inline-flex flex-1 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100"
                onClick={() => handleStatusChange('maintenance')}
                disabled={isProcessing}
              >
                Patvirtinti
              </button>
              <button
                type="button"
                className="inline-flex flex-1 items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2 text-sm"
                onClick={closeModal}
                disabled={isProcessing}
              >
                Atšaukti
              </button>
            </div>
          </div>
        </ActionModal>
      )}

      {actionState.type === 'vacate' && (
        <ActionModal title="Pažymėti laisvą" onClose={closeModal} isProcessing={isProcessing} error={error}>
          <div className="space-y-4 text-sm text-black/70">
            <p>Šis veiksmas pažymės būstą kaip laisvą ir leis iškart pradėti nuomininko paiešką.</p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="inline-flex flex-1 items-center justify-center rounded-xl border border-[#2F8481]/40 bg-[#2F8481]/10 px-4 py-2 text-sm font-semibold text-[#2F8481] hover:bg-[#2F8481]/20"
                onClick={() => handleStatusChange('vacant')}
                disabled={isProcessing}
              >
                Pažymėti laisvą
              </button>
              <button
                type="button"
                className="inline-flex flex-1 items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2 text-sm"
                onClick={closeModal}
                disabled={isProcessing}
              >
                Atšaukti
              </button>
            </div>
          </div>
        </ActionModal>
      )}

      {actionState.type === 'reminder' && (
        <ActionModal title="Siųsti priminimą" onClose={closeModal} isProcessing={isProcessing} error={error}>
          <form className="space-y-4" onSubmit={handleSendReminder}>
            <div>
              <label className="text-xs font-medium uppercase tracking-[0.18em] text-black/50">Žinutė</label>
              <textarea
                name="message"
                rows={4}
                defaultValue={`Sveiki, ${tenant.name}! Primename, kad nuomos mokėjimas vėluoja. Prašome apmokėti kaip įmanoma greičiau.`}
                className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm focus:border-[#2F8481] focus:outline-none focus:ring-2 focus:ring-[#2F8481]/30"
              />
            </div>
            <ModalActions isProcessing={isProcessing} submitLabel="Siųsti" onCancel={closeModal} />
          </form>
        </ActionModal>
      )}
    </div>
  );
};

const InputField: React.FC<{
  label: string;
  name: string;
  type?: string;
  step?: string;
  defaultValue?: number | string;
}> = ({ label, name, type = 'number', step, defaultValue }) => (
  <div>
    <label className="text-xs font-medium uppercase tracking-[0.18em] text-black/50">{label}</label>
    <input
      type={type}
      name={name}
      step={step}
      defaultValue={defaultValue}
      className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm focus:border-[#2F8481] focus:outline-none focus:ring-2 focus:ring-[#2F8481]/30"
      required
    />
  </div>
);

const ModalActions: React.FC<{ isProcessing: boolean; submitLabel: string; onCancel: () => void }> = ({
  isProcessing,
  submitLabel,
  onCancel
}) => (
  <div className="flex items-center justify-end gap-3 pt-2">
    <button
      type="button"
      onClick={onCancel}
      className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm text-black hover:bg-black/5"
      disabled={isProcessing}
    >
      Atšaukti
    </button>
    <button
      type="submit"
      className="inline-flex items-center justify-center rounded-xl bg-[#2F8481] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#276f6c] disabled:opacity-60"
      disabled={isProcessing}
    >
      {isProcessing ? 'Saugoma…' : submitLabel}
    </button>
  </div>
);

const ActionModal: React.FC<{
  title: string;
  onClose: () => void;
  isProcessing: boolean;
  error: string | null;
  children: React.ReactNode;
}> = ({ title, onClose, isProcessing, error, children }) => (
  <ModalPortal isOpen onClose={() => { if (!isProcessing) onClose(); }} contentClassName="w-[min(480px,92vw)]">
    <div className="mx-auto flex w-full max-w-lg flex-col">
      <div className="flex items-center justify-between border-b border-black/10 px-5 py-4">
        <h3 className="text-lg font-semibold text-black">{title}</h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-1 text-black/50 transition-colors hover:text-black"
          disabled={isProcessing}
          aria-label="Uždaryti"
        >
          ×
        </button>
      </div>
      <div className="px-5 py-4">
        {error && (
          <p className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>
        )}
        {children}
      </div>
    </div>
  </ModalPortal>
);






















