import React from 'react';
import { useForm, FormProvider, useFormContext } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const schema = z
  .object({
    dueDate: z.string().min(1, 'Įveskite terminą'),
    rentAmount: z.coerce.number().min(0, 'Negali būti neigiamas'),
    utilitiesAmount: z.coerce.number().min(0, 'Negali būti neigiamas'),
    otherAmount: z.coerce.number().min(0, 'Negali būti neigiamas'),
    notes: z.string().optional()
  })
  .refine(
    (values) => values.rentAmount + values.utilitiesAmount + values.otherAmount > 0,
    {
      message: 'Suma turi būti didesnė nei 0',
      path: ['rentAmount']
    }
  );

export type InvoiceQuickCreateValues = z.infer<typeof schema>;

export interface InvoiceChargeSummaryItem {
  label: string;
  amount: number;
  description?: string;
}

interface InvoiceQuickCreateFormProps {
  defaultDueDate: string;
  defaultRent?: number;
  defaultUtilities?: number;
  defaultOther?: number;
  chargeSummary?: InvoiceChargeSummaryItem[];
  isSubmitting: boolean;
  errorMessage?: string | null;
  onSubmit: (values: InvoiceQuickCreateValues) => Promise<void>;
  onCancel: () => void;
}

export const InvoiceQuickCreateForm: React.FC<InvoiceQuickCreateFormProps> = ({
  defaultDueDate,
  defaultRent = 0,
  defaultUtilities = 0,
  defaultOther = 0,
  chargeSummary,
  isSubmitting,
  errorMessage,
  onSubmit,
  onCancel
}) => {
  const methods = useForm<InvoiceQuickCreateValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      dueDate: defaultDueDate,
      rentAmount: Number(defaultRent.toFixed(2)),
      utilitiesAmount: Number(defaultUtilities.toFixed(2)),
      otherAmount: Number(defaultOther.toFixed(2)),
      notes: ''
    }
  });

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = methods;

  return (
    <FormProvider {...methods}>
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        {chargeSummary && chargeSummary.length > 0 && (
          <div className="rounded-2xl border border-black/10 bg-black/5 px-4 py-3 text-sm text-black/70">
            <p className="text-xs uppercase tracking-[0.18em] text-black/50">Įtraukiami mokesčiai</p>
            <ul className="mt-3 space-y-2">
              {chargeSummary.map((item) => (
                <li key={item.label} className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-black">{item.label}</span>
                    {item.description && (
                      <span className="ml-2 text-xs text-black/50">{item.description}</span>
                    )}
                  </div>
                  <span className="font-semibold text-black">{formatCurrency(item.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <label className="text-xs font-medium uppercase tracking-[0.18em] text-black/50">Terminas</label>
          <input
            type="date"
            {...register('dueDate')}
            className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm focus:border-[#2F8481] focus:outline-none focus:ring-2 focus:ring-[#2F8481]/30"
          />
          {errors.dueDate && <p className="mt-1 text-xs text-rose-600">{errors.dueDate.message}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <AmountField label="Nuoma" name="rentAmount" error={errors.rentAmount?.message} />
          <AmountField label="Komunaliniai" name="utilitiesAmount" error={errors.utilitiesAmount?.message} />
          <AmountField label="Kiti mokesčiai" name="otherAmount" error={errors.otherAmount?.message} />
        </div>

        <div>
          <label className="text-xs font-medium uppercase tracking-[0.18em] text-black/50">Pastabos</label>
          <textarea
            rows={3}
            {...register('notes')}
            className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm focus:border-[#2F8481] focus:outline-none focus:ring-2 focus:ring-[#2F8481]/30"
            placeholder="Papildoma informacija nuomininkui"
          />
        </div>

        {errorMessage && (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">{errorMessage}</p>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm text-black hover:bg-black/5"
            disabled={isSubmitting}
          >
            Atšaukti
          </button>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-xl bg-[#2F8481] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#276f6c] disabled:opacity-60"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saugoma…' : 'Išrašyti'}
          </button>
        </div>
      </form>
    </FormProvider>
  );
};

const AmountField: React.FC<{
  label: string;
  name: keyof Pick<InvoiceQuickCreateValues, 'rentAmount' | 'utilitiesAmount' | 'otherAmount'>;
  error?: string;
}> = ({ label, name, error }) => {
  const { register } = useFormContext<InvoiceQuickCreateValues>();

  return (
    <div>
      <label className="text-xs font-medium uppercase tracking-[0.18em] text-black/50">{label}</label>
      <input
        type="number"
        step="0.01"
        min="0"
        {...register(name)}
        className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm focus:border-[#2F8481] focus:outline-none focus:ring-2 focus:ring-[#2F8481]/30"
      />
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('lt-LT', { style: 'currency', currency: 'EUR' }).format(value);




