import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import {
  FileText, Plus, Search, Filter, Eye, Trash2, Check,
  Clock, AlertCircle, Building2, User, Euro, Calendar,
  ChevronDown, ChevronUp, X, Save, Loader2, Receipt,
  ArrowUpRight, CreditCard, Banknote, MapPin, Hash
} from 'lucide-react';
import {
  getInvoices, getInvoiceStats, createInvoice, deleteInvoice,
  recordPayment, generateInvoiceNumber, getInvoiceGenerationData,
  buildLineItems, updateInvoiceStatus, getPaymentHistory,
  type Invoice, type InvoiceFilters, type InvoiceLineItem, type InvoicePayment,
  type CreateInvoiceData
} from '../lib/invoicesApi';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

// ============================================================
// DESIGN TOKENS — Light Theme
// ============================================================
const surface = 'bg-white rounded-2xl border border-gray-100/80 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]';
const inputStyle = 'w-full px-3.5 py-2 bg-gray-50/80 border border-gray-200/80 rounded-lg text-[13px] text-gray-900 placeholder:text-gray-300 focus:ring-2 focus:ring-teal-500/15 focus:border-teal-400/50 focus:bg-white transition-all outline-none';
const labelStyle = 'block text-[10px] font-semibold text-gray-400 uppercase tracking-[0.08em] mb-1';
const btnPrimary = 'flex items-center gap-1.5 px-4 py-2 bg-teal-600 text-white text-[12px] font-semibold rounded-lg hover:bg-teal-700 shadow-sm shadow-teal-500/20 transition-all active:scale-[0.98]';
const btnSecondary = 'flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-all';

// ============================================================
// STATUS HELPERS
// ============================================================
const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  unpaid: { label: 'Neapmokėta', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200/60', icon: <Clock className="w-3.5 h-3.5" /> },
  paid: { label: 'Apmokėta', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200/60', icon: <Check className="w-3.5 h-3.5" /> },
  partial: { label: 'Dalinai', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200/60', icon: <ArrowUpRight className="w-3.5 h-3.5" /> },
  overdue: { label: 'Pradelsta', color: 'text-red-700', bg: 'bg-red-50 border-red-200/60', icon: <AlertCircle className="w-3.5 h-3.5" /> },
  cancelled: { label: 'Atšaukta', color: 'text-gray-500', bg: 'bg-gray-50 border-gray-200/60', icon: <X className="w-3.5 h-3.5" /> },
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('lt-LT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(amount);

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('lt-LT', { year: 'numeric', month: '2-digit', day: '2-digit' });

const getDaysUntilDue = (dueDate: string) => {
  const diff = new Date(dueDate).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

// ============================================================
// STAT CARD
// ============================================================
const StatCard = memo<{ label: string; value: string | number; icon: React.ReactNode; accent?: string }>(
  ({ label, value, icon, accent = 'bg-teal-50 text-teal-600' }) => (
    <div className={`${surface} p-4 flex items-center gap-3`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${accent}`}>
        {icon}
      </div>
      <div>
        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{label}</div>
        <div className="text-[17px] font-bold text-gray-900 tabular-nums">{value}</div>
      </div>
    </div>
  )
);
StatCard.displayName = 'StatCard';

// ============================================================
// STATUS BADGE
// ============================================================
const StatusBadge = memo<{ status: string }>(({ status }) => {
  const config = statusConfig[status] || statusConfig.unpaid;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-md border ${config.bg} ${config.color}`}>
      {config.icon}
      {config.label}
    </span>
  );
});
StatusBadge.displayName = 'StatusBadge';

// ============================================================
// INVOICE ROW
// ============================================================
const InvoiceRow = memo<{
  invoice: Invoice;
  expanded: boolean;
  onToggle: () => void;
  onMarkPaid: () => void;
  onDelete: () => void;
}>(({ invoice, expanded, onToggle, onMarkPaid, onDelete }) => {
  const daysUntil = getDaysUntilDue(invoice.due_date);
  const isOverdue = daysUntil < 0 && invoice.status !== 'paid' && invoice.status !== 'cancelled';
  const address = (invoice.property as any)?.addresses;
  const lineItems = (invoice.line_items || []) as InvoiceLineItem[];

  return (
    <div className={`${surface} overflow-hidden transition-all duration-200 ${expanded ? 'ring-1 ring-teal-200/60' : ''}`}>
      {/* Main row */}
      <button
        onClick={onToggle}
        className="w-full px-5 py-3.5 flex items-center gap-4 text-left hover:bg-gray-50/50 transition-colors"
      >
        {/* Invoice number + date */}
        <div className="w-[140px] flex-shrink-0">
          <div className="text-[13px] font-bold text-gray-900">{invoice.invoice_number}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">{formatDate(invoice.invoice_date)}</div>
        </div>

        {/* Property + Tenant */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <Building2 className="w-3 h-3 text-gray-400 flex-shrink-0" />
            <span className="text-[12px] font-medium text-gray-700 truncate">
              {address?.street || invoice.property?.apartment_number || '—'}
              {invoice.property?.apartment_number ? `, ${invoice.property.apartment_number}` : ''}
            </span>
          </div>
          {invoice.tenant && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <User className="w-3 h-3 text-gray-400 flex-shrink-0" />
              <span className="text-[11px] text-gray-400 truncate">{invoice.tenant.first_name} {invoice.tenant.last_name}</span>
            </div>
          )}
        </div>

        {/* Due date */}
        <div className="w-[100px] flex-shrink-0 text-right">
          <div className={`text-[11px] font-medium ${isOverdue ? 'text-red-600' : 'text-gray-400'}`}>
            {isOverdue ? `Vėluoja ${Math.abs(daysUntil)} d.` : `Iki ${formatDate(invoice.due_date)}`}
          </div>
        </div>

        {/* Status */}
        <div className="w-[100px] flex-shrink-0 flex justify-center">
          <StatusBadge status={isOverdue && invoice.status === 'unpaid' ? 'overdue' : invoice.status} />
        </div>

        {/* Amount */}
        <div className="w-[110px] flex-shrink-0 text-right">
          <div className="text-[14px] font-bold text-gray-900 tabular-nums">{formatCurrency(invoice.amount)}</div>
        </div>

        {/* Chevron */}
        <div className="w-5 flex-shrink-0 flex justify-center">
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-300" />}
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-5 pb-4 border-t border-gray-100/60">
          <div className="grid grid-cols-2 gap-6 pt-4">
            {/* Line items */}
            <div>
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Sąskaitos eilutės</div>
              {lineItems.length > 0 ? (
                <div className="space-y-1.5">
                  {lineItems.map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-1 px-2.5 rounded-lg bg-gray-50/60">
                      <div>
                        <span className="text-[12px] font-medium text-gray-700">{item.description}</span>
                        {item.consumption != null && (
                          <span className="text-[10px] text-gray-400 ml-2">
                            ({item.previous_reading}→{item.current_reading} = {item.consumption} {item.unit})
                          </span>
                        )}
                      </div>
                      <span className="text-[12px] font-bold text-gray-900 tabular-nums">{formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                  {/* Total */}
                  <div className="flex items-center justify-between pt-2 mt-1 border-t border-gray-100">
                    <span className="text-[12px] font-bold text-gray-700">Viso</span>
                    <span className="text-[13px] font-bold text-teal-700 tabular-nums">{formatCurrency(invoice.amount)}</span>
                  </div>
                </div>
              ) : (
                <div className="text-[12px] text-gray-400 py-2">
                  <div className="flex items-center justify-between py-1">
                    <span>Nuoma</span>
                    <span className="font-medium tabular-nums">{formatCurrency(invoice.rent_amount)}</span>
                  </div>
                  {Number(invoice.utilities_amount) > 0 && (
                    <div className="flex items-center justify-between py-1">
                      <span>Komunaliniai</span>
                      <span className="font-medium tabular-nums">{formatCurrency(invoice.utilities_amount)}</span>
                    </div>
                  )}
                  {Number(invoice.late_fee) > 0 && (
                    <div className="flex items-center justify-between py-1 text-red-500">
                      <span>Delspinigiai</span>
                      <span className="font-medium tabular-nums">{formatCurrency(invoice.late_fee)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Info + Actions */}
            <div className="space-y-3">
              {invoice.period_start && invoice.period_end && (
                <div>
                  <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Laikotarpis</div>
                  <div className="text-[12px] text-gray-700">{formatDate(invoice.period_start)} — {formatDate(invoice.period_end)}</div>
                </div>
              )}
              {invoice.notes && (
                <div>
                  <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Pastabos</div>
                  <div className="text-[12px] text-gray-600">{invoice.notes}</div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2">
                {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                  <button onClick={onMarkPaid} className={btnPrimary}>
                    <Check className="w-3.5 h-3.5" />
                    Pažymėti apmokėta
                  </button>
                )}
                <button onClick={onDelete} className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all">
                  <Trash2 className="w-3 h-3" />
                  Ištrinti
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
InvoiceRow.displayName = 'InvoiceRow';

// ============================================================
// CREATE INVOICE MODAL
// ============================================================
const CreateInvoiceModal = memo<{
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}>(({ isOpen, onClose, onCreated }) => {
  const [properties, setProperties] = useState<any[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [rentAmount, setRentAmount] = useState(0);
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [genData, setGenData] = useState<any>(null);

  // Load properties
  useEffect(() => {
    if (!isOpen) return;
    const load = async () => {
      const { data } = await supabase
        .from('properties')
        .select('id, apartment_number, rent, address_id, addresses!address_id (id, street, city)')
        .order('apartment_number');
      setProperties(data || []);

      const num = await generateInvoiceNumber();
      setInvoiceNumber(num);

      // Default due date = 15th of next month
      const now = new Date();
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 15);
      setDueDate(nextMonth.toISOString().split('T')[0]);

      // Default period = current month
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setPeriodStart(firstOfMonth.toISOString().split('T')[0]);
      setPeriodEnd(lastOfMonth.toISOString().split('T')[0]);
    };
    load();
  }, [isOpen]);

  // When property selected, load generation data
  useEffect(() => {
    if (!selectedPropertyId) {
      setGenData(null);
      setRentAmount(0);
      setLineItems([]);
      return;
    }
    const load = async () => {
      setLoading(true);
      const data = await getInvoiceGenerationData(selectedPropertyId);
      setGenData(data);
      setRentAmount(data.property?.rent || 0);
      const items = buildLineItems(data.property?.rent || 0, data.meters, data.latestReadings);
      setLineItems(items);
      setLoading(false);
    };
    load();
  }, [selectedPropertyId]);

  const utilitiesTotal = useMemo(
    () => lineItems.filter(i => i.type !== 'rent').reduce((s, i) => s + i.amount, 0),
    [lineItems]
  );
  const totalAmount = useMemo(() => rentAmount + utilitiesTotal, [rentAmount, utilitiesTotal]);

  const handleSave = async () => {
    if (!selectedPropertyId || !invoiceNumber) return;
    setSaving(true);

    const prop = properties.find(p => p.id === selectedPropertyId);
    const data: CreateInvoiceData = {
      property_id: selectedPropertyId,
      tenant_id: genData?.tenant?.id || null,
      address_id: prop?.address_id || null,
      invoice_number: invoiceNumber,
      invoice_date: invoiceDate,
      due_date: dueDate,
      period_start: periodStart,
      period_end: periodEnd,
      rent_amount: rentAmount,
      utilities_amount: utilitiesTotal,
      line_items: lineItems,
      notes: notes || undefined,
    };

    const { error } = await createInvoice(data);
    setSaving(false);

    if (!error) {
      onCreated();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="relative bg-white rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.15)] w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center">
              <Receipt className="w-4 h-4 text-teal-600" />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-gray-900">Nauja sąskaita</h3>
              <p className="text-[11px] text-gray-400">Sukurkite sąskaitą nuomininkui</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Property selector */}
          <div>
            <label className={labelStyle}>Būstas</label>
            <select
              value={selectedPropertyId}
              onChange={e => setSelectedPropertyId(e.target.value)}
              className={inputStyle + ' appearance-none cursor-pointer'}
            >
              <option value="">Pasirinkite būstą...</option>
              {properties.map(p => (
                <option key={p.id} value={p.id}>
                  {(p.addresses as any)?.street || '—'}{p.apartment_number ? `, ${p.apartment_number}` : ''} — {formatCurrency(p.rent || 0)}/mėn.
                </option>
              ))}
            </select>
          </div>

          {/* Invoice details row */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelStyle}>Sąskaitos Nr.</label>
              <input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} className={inputStyle} />
            </div>
            <div>
              <label className={labelStyle}>Sąskaitos data</label>
              <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} className={inputStyle} />
            </div>
            <div>
              <label className={labelStyle}>Mokėjimo terminas</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={inputStyle} />
            </div>
          </div>

          {/* Period */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelStyle}>Laikotarpio pradžia</label>
              <input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} className={inputStyle} />
            </div>
            <div>
              <label className={labelStyle}>Laikotarpio pabaiga</label>
              <input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} className={inputStyle} />
            </div>
          </div>

          {/* Tenant info */}
          {genData?.tenant && (
            <div className="flex items-center gap-3 px-4 py-3 bg-teal-50/50 rounded-xl border border-teal-100/60">
              <User className="w-4 h-4 text-teal-600 flex-shrink-0" />
              <div>
                <div className="text-[12px] font-semibold text-gray-900">{genData.tenant.first_name} {genData.tenant.last_name}</div>
                <div className="text-[11px] text-gray-400">{genData.tenant.email}</div>
              </div>
            </div>
          )}

          {/* Line items */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-teal-500 animate-spin" />
            </div>
          ) : lineItems.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Sąskaitos eilutės</div>
              <div className={`${surface} overflow-hidden`}>
                {lineItems.map((item, i) => (
                  <div key={i} className={`flex items-center justify-between px-4 py-2.5 ${i > 0 ? 'border-t border-gray-50' : ''}`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${item.type === 'rent' ? 'bg-teal-500' : 'bg-blue-400'}`} />
                      <span className="text-[12px] font-medium text-gray-700">{item.description}</span>
                      {item.consumption != null && (
                        <span className="text-[10px] text-gray-400">
                          {item.consumption} {item.unit} × {formatCurrency(item.rate || 0)}
                        </span>
                      )}
                    </div>
                    <span className="text-[12px] font-bold text-gray-900 tabular-nums">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
                {/* Total row */}
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50/80 border-t border-gray-100">
                  <span className="text-[12px] font-bold text-gray-700">Viso</span>
                  <span className="text-[14px] font-bold text-teal-700 tabular-nums">{formatCurrency(totalAmount)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className={labelStyle}>Pastabos (neprivaloma)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Papildoma informacija..."
              className={inputStyle + ' resize-none'}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-white">
          <div className="text-[11px] text-gray-400">
            {totalAmount > 0 && `Suma: ${formatCurrency(totalAmount)}`}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className={btnSecondary}>Atšaukti</button>
            <button
              onClick={handleSave}
              disabled={!selectedPropertyId || saving}
              className={`${btnPrimary} disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {saving ? 'Kuriama...' : 'Sukurti sąskaitą'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
CreateInvoiceModal.displayName = 'CreateInvoiceModal';

// ============================================================
// MAIN PAGE
// ============================================================
const Invoices: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [stats, setStats] = useState({ totalUnpaid: 0, totalOverdue: 0, paidThisMonth: 0, totalPendingAmount: 0 });

  // Addresses for filter dropdown
  const [addresses, setAddresses] = useState<any[]>([]);
  const [addressFilter, setAddressFilter] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    const filters: InvoiceFilters = { search, status: statusFilter };
    if (addressFilter) filters.address_id = addressFilter;

    const [invoiceResult, statsResult] = await Promise.all([
      getInvoices(filters),
      getInvoiceStats(),
    ]);

    setInvoices(invoiceResult.data || []);
    setStats(statsResult);
    setLoading(false);
  }, [search, statusFilter, addressFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  // Load addresses for filter
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('addresses')
        .select('id, street, city')
        .order('street');
      setAddresses(data || []);
    };
    load();
  }, []);

  const handleMarkPaid = useCallback(async (invoiceId: string, amount: number) => {
    await recordPayment(invoiceId, amount, 'bank_transfer');
    loadData();
  }, [loadData]);

  const handleDelete = useCallback(async (invoiceId: string) => {
    if (!confirm('Ar tikrai norite ištrinti šią sąskaitą?')) return;
    await deleteInvoice(invoiceId);
    loadData();
  }, [loadData]);

  return (
    <div className="p-6 space-y-5 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Sąskaitos</h1>
          <p className="text-[12px] text-gray-400 mt-0.5">Valdykite nuomos sąskaitas ir mokėjimus</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className={btnPrimary}>
          <Plus className="w-3.5 h-3.5" />
          Nauja sąskaita
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard
          label="Laukia apmokėjimo"
          value={stats.totalUnpaid}
          icon={<Clock className="w-4 h-4" />}
          accent="bg-amber-50 text-amber-600"
        />
        <StatCard
          label="Pradelsta"
          value={stats.totalOverdue}
          icon={<AlertCircle className="w-4 h-4" />}
          accent="bg-red-50 text-red-600"
        />
        <StatCard
          label="Apmokėta šį mėn."
          value={stats.paidThisMonth}
          icon={<Check className="w-4 h-4" />}
          accent="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          label="Neapmokėta suma"
          value={formatCurrency(stats.totalPendingAmount)}
          icon={<Euro className="w-4 h-4" />}
          accent="bg-teal-50 text-teal-600"
        />
      </div>

      {/* Filters */}
      <div className={`${surface} p-3 flex items-center gap-3`}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Ieškoti pagal numerį, nuomininką..."
            className={`${inputStyle} pl-9`}
          />
        </div>
        <select
          value={addressFilter}
          onChange={e => setAddressFilter(e.target.value)}
          className={`${inputStyle} w-[200px] appearance-none cursor-pointer`}
        >
          <option value="">Visi adresai</option>
          {addresses.map(a => (
            <option key={a.id} value={a.id}>{a.street}, {a.city}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className={`${inputStyle} w-[160px] appearance-none cursor-pointer`}
        >
          <option value="all">Visi statusai</option>
          <option value="unpaid">Neapmokėta</option>
          <option value="paid">Apmokėta</option>
          <option value="partial">Dalinai</option>
          <option value="overdue">Pradelsta</option>
        </select>
      </div>

      {/* Invoice list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-teal-500 animate-spin" />
        </div>
      ) : invoices.length === 0 ? (
        <div className={`${surface} p-12 text-center`}>
          <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <FileText className="w-6 h-6 text-gray-400" />
          </div>
          <h3 className="text-[14px] font-bold text-gray-900 mb-1">Nėra sąskaitų</h3>
          <p className="text-[12px] text-gray-400 mb-4">Sukurkite pirmą sąskaitą nuomininkui</p>
          <button onClick={() => setShowCreateModal(true)} className={btnPrimary + ' mx-auto'}>
            <Plus className="w-3.5 h-3.5" />
            Nauja sąskaita
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {invoices.map(invoice => (
            <InvoiceRow
              key={invoice.id}
              invoice={invoice}
              expanded={expandedId === invoice.id}
              onToggle={() => setExpandedId(expandedId === invoice.id ? null : invoice.id)}
              onMarkPaid={() => handleMarkPaid(invoice.id, invoice.amount)}
              onDelete={() => handleDelete(invoice.id)}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      <CreateInvoiceModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={loadData}
      />
    </div>
  );
};

export default Invoices;