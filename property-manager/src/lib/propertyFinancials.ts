import { invoiceApi, invoicePaymentApi, depositEventApi, databaseUtils, type Invoice, type InvoicePayment, type PropertyDepositEvent } from './database';

export interface RentLedgerEntry {
  invoice: Invoice;
  payments: InvoicePayment[];
  paidAmount: number;
  balance: number;
  status: 'paid' | 'unpaid' | 'overdue';
}

export interface CreateInvoiceParams {
  propertyId: string;
  invoiceDate?: string;
  dueDate: string;
  rentAmount: number;
  utilitiesAmount?: number;
  otherAmount?: number;
  notes?: string;
  createdBy?: string;
}

export interface RecordPaymentParams {
  invoiceId: string;
  amount: number;
  paymentMethod?: InvoicePayment['payment_method'];
  paidAt?: string;
  notes?: string;
  createdBy?: string;
}

export interface CreateDepositEventParams {
  propertyId: string;
  eventType: PropertyDepositEvent['event_type'];
  amount: number;
  notes?: string;
  metadata?: Record<string, unknown>;
  createdBy?: string;
  previousBalance?: number;
}

const roundCurrency = (value: number): number => {
  return Number(Number(value).toFixed(2));
};

export async function fetchRentLedger(propertyId: string): Promise<RentLedgerEntry[]> {
  const invoices = await invoiceApi.getByPropertyId(propertyId);
  if (invoices.length === 0) {
    return [];
  }

  const payments = await invoicePaymentApi.listByInvoices(invoices.map((invoice) => invoice.id));
  const paymentsByInvoice = payments.reduce<Record<string, InvoicePayment[]>>((acc, payment) => {
    if (!acc[payment.invoice_id]) {
      acc[payment.invoice_id] = [];
    }
    acc[payment.invoice_id].push(payment);
    return acc;
  }, {});

  const ledger = invoices.map<RentLedgerEntry>((invoice) => {
    const invoicePayments = paymentsByInvoice[invoice.id] ?? [];
    const paidAmount = roundCurrency(invoicePayments.reduce((sum, payment) => sum + payment.amount, 0));
    const balance = roundCurrency(invoice.amount - paidAmount);

    let derivedStatus: RentLedgerEntry['status'];
    if (balance <= 0) {
      derivedStatus = 'paid';
    } else if (invoice.status === 'overdue' || new Date(invoice.due_date) < new Date()) {
      derivedStatus = 'overdue';
    } else {
      derivedStatus = 'unpaid';
    }

    return {
      invoice,
      payments: invoicePayments,
      paidAmount,
      balance,
      status: derivedStatus
    };
  });

  return ledger.sort((a, b) => new Date(b.invoice.due_date).getTime() - new Date(a.invoice.due_date).getTime());
}

export async function createInvoiceForProperty(params: CreateInvoiceParams): Promise<Invoice> {
  const {
    propertyId,
    invoiceDate = new Date().toISOString().split('T')[0],
    dueDate,
    rentAmount,
    utilitiesAmount = 0,
    otherAmount = 0,
    notes,
    createdBy
  } = params;

  const amount = roundCurrency(rentAmount + utilitiesAmount + otherAmount);

  const payload: Omit<Invoice, 'id' | 'created_at' | 'updated_at'> = {
    property_id: propertyId,
    invoice_number: databaseUtils.generateInvoiceNumber(),
    invoice_date: invoiceDate,
    due_date: dueDate,
    amount,
    rent_amount: rentAmount,
    utilities_amount: utilitiesAmount,
    other_amount: otherAmount,
    status: 'unpaid',
    notes: notes ?? null,
    paid_date: null,
    payment_method: null,
    created_by: createdBy ?? null
  };

  const invoice = await invoiceApi.create(payload);

  return invoice;
}

export async function recordInvoicePayment(params: RecordPaymentParams): Promise<{ payment: InvoicePayment; updatedInvoice: Invoice }> {
  const {
    invoiceId,
    amount,
    paymentMethod = 'bank_transfer',
    paidAt = new Date().toISOString().split('T')[0],
    notes,
    createdBy
  } = params;

  const invoice = await invoiceApi.getById(invoiceId);
  if (!invoice) {
    throw new Error('Invoice nerastas');
  }

  const payment = await invoicePaymentApi.create({
    invoice_id: invoiceId,
    amount,
    payment_method: paymentMethod,
    paid_at: paidAt,
    notes: notes ?? null,
    created_by: createdBy ?? null
  });

  const payments = await invoicePaymentApi.listByInvoice(invoiceId);
  const paidTotal = roundCurrency(payments.reduce((sum, current) => sum + current.amount, 0));
  const outstanding = roundCurrency(invoice.amount - paidTotal);

  let status: Invoice['status'];
  if (outstanding <= 0) {
    status = 'paid';
  } else if (new Date(invoice.due_date) < new Date()) {
    status = 'overdue';
  } else {
    status = 'unpaid';
  }

  const updatePayload: Partial<Invoice> = {
    status,
    payment_method: paymentMethod,
    paid_date: status === 'paid' ? paidAt : null
  };

  const sanitizedPayload = Object.fromEntries(
    Object.entries(updatePayload).filter(([, value]) => value !== undefined)
  ) as Partial<Invoice>;

  const updatedInvoice = await invoiceApi.update(invoiceId, sanitizedPayload);

  return { payment, updatedInvoice };
}

export async function fetchDepositEvents(propertyId: string): Promise<PropertyDepositEvent[]> {
  const events = await depositEventApi.listByProperty(propertyId);
  return events.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function createDepositEvent(params: CreateDepositEventParams): Promise<PropertyDepositEvent | null> {
  const { propertyId, eventType, amount, notes, metadata, createdBy, previousBalance } = params;

  let baseline = previousBalance;
  if (baseline === undefined) {
    const latest = await depositEventApi.listByProperty(propertyId);
    baseline = latest.length > 0 ? latest[0].balance_after ?? 0 : 0;
  }

  const nextBalance = (() => {
    const current = baseline ?? 0;
    switch (eventType) {
      case 'received':
        return roundCurrency(current + amount);
      case 'adjustment':
        return roundCurrency(current + amount);
      case 'refund':
        return roundCurrency(current - amount);
      default:
        return current;
    }
  })();

  const event = await depositEventApi.create({
    property_id: propertyId,
    event_type: eventType,
    amount,
    balance_after: nextBalance,
    notes: notes ?? null,
    metadata: metadata ?? {},
    created_by: createdBy ?? null
  });

  if (!event) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ Skipping deposit event persistence because table is missing. Returning calculated snapshot only.');
    }
    return null;
  }

  return event;
}






















