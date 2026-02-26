import React, { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';
import {
  FileText, Plus, Search, Filter, Eye, Trash2, Check,
  Clock, AlertCircle, Building2, User, Euro, Calendar,
  ChevronDown, ChevronUp, X, Save, Loader2, Receipt,
  ArrowUpRight, CreditCard, Banknote, MapPin, Hash, Download
} from 'lucide-react';
import LtDateInput from '../components/ui/LtDateInput';
import {
  getInvoices, getInvoiceStats, createInvoice, deleteInvoice,
  recordPayment, generateInvoiceNumber, getInvoiceGenerationData,
  buildLineItems, updateInvoiceStatus, getPaymentHistory,
  generateBulkInvoiceData, createBulkInvoices,
  type Invoice, type InvoiceFilters, type InvoiceLineItem, type InvoicePayment,
  type CreateInvoiceData, type BulkInvoicePreview
} from '../lib/invoicesApi';
import { exportSingleProperty, exportByAddress, exportAll, type ExportFormat } from '../lib/invoiceExport';
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

const formatDate = (date: string) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

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
// CREATE INVOICE MODAL — 3 Generation Modes
// ============================================================
type GenerationMode = 'single' | 'address' | 'all';
type ModalStep = 'configure' | 'preview';

const modeTabs: { key: GenerationMode; label: string; icon: React.ReactNode; desc: string }[] = [
  { key: 'single', label: 'Vienam butui', icon: <User className="w-3.5 h-3.5" />, desc: 'Pasirinkite konkretų butą' },
  { key: 'address', label: 'Adresui', icon: <MapPin className="w-3.5 h-3.5" />, desc: 'Visi butai adrese' },
  { key: 'all', label: 'Visiems', icon: <Building2 className="w-3.5 h-3.5" />, desc: 'Visi adresai ir butai' },
];

const CreateInvoiceModal = memo<{
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}>(({ isOpen, onClose, onCreated }) => {
  // --- State ---
  const [mode, setMode] = useState<GenerationMode>('single');
  const [step, setStep] = useState<ModalStep>('configure');

  // Config state
  const [properties, setProperties] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [notes, setNotes] = useState('');
  const [sendToTenant, setSendToTenant] = useState(true);

  // Single-mode state
  const [rentAmount, setRentAmount] = useState(0);
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([]);
  const [genData, setGenData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Bulk-mode state
  const [bulkPreviews, setBulkPreviews] = useState<BulkInvoicePreview[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);

  // Save state
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ created: number; errors: string[] } | null>(null);

  // Load properties & addresses on open
  useEffect(() => {
    if (!isOpen) return;
    const load = async () => {
      const [{ data: props }, { data: addrs }] = await Promise.all([
        supabase.from('properties').select('id, apartment_number, rent, address_id, addresses!address_id (id, street, city)').order('apartment_number'),
        supabase.from('addresses').select('id, street, city').order('street'),
      ]);
      setProperties(props || []);
      setAddresses(addrs || []);

      const num = await generateInvoiceNumber();
      setInvoiceNumber(num);

      const now = new Date();
      setDueDate(new Date(now.getFullYear(), now.getMonth() + 1, 15).toISOString().split('T')[0]);
      setPeriodStart(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);
      setPeriodEnd(new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]);
    };
    load();
  }, [isOpen]);

  // Reset when modal closes or mode changes
  useEffect(() => {
    if (!isOpen) {
      setStep('configure');
      setMode('single');
      setSelectedPropertyId('');
      setSelectedAddressId('');
      setGenData(null);
      setLineItems([]);
      setBulkPreviews([]);
      setResult(null);
      setNotes('');
      setSendToTenant(true);
    }
  }, [isOpen]);

  // Single mode: load property data
  useEffect(() => {
    if (mode !== 'single' || !selectedPropertyId) {
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
  }, [selectedPropertyId, mode]);

  // Computed
  const utilitiesTotal = useMemo(
    () => lineItems.filter(i => i.type !== 'rent').reduce((s, i) => s + i.amount, 0),
    [lineItems]
  );
  const totalAmount = useMemo(() => rentAmount + utilitiesTotal, [rentAmount, utilitiesTotal]);

  const bulkTotal = useMemo(
    () => bulkPreviews.filter(p => p.selected).reduce((s, p) => s + p.totalAmount, 0),
    [bulkPreviews]
  );
  const bulkSelectedCount = useMemo(
    () => bulkPreviews.filter(p => p.selected).length,
    [bulkPreviews]
  );

  // --- Handlers ---
  const handleGeneratePreview = async () => {
    if (mode === 'single') {
      setStep('preview');
      return;
    }
    setBulkLoading(true);
    const addressId = mode === 'address' ? selectedAddressId : undefined;
    const { previews, error } = await generateBulkInvoiceData(addressId);
    if (!error) {
      setBulkPreviews(previews);
      setStep('preview');
    }
    setBulkLoading(false);
  };

  const toggleBulkItem = useCallback((idx: number) => {
    setBulkPreviews(prev => prev.map((p, i) => i === idx ? { ...p, selected: !p.selected } : p));
  }, []);

  const toggleAllBulk = useCallback(() => {
    const allSelected = bulkPreviews.every(p => p.selected);
    setBulkPreviews(prev => prev.map(p => ({ ...p, selected: !allSelected })));
  }, [bulkPreviews]);

  const handleSave = async () => {
    setSaving(true);

    if (mode === 'single') {
      // Single invoice creation (existing flow)
      const prop = properties.find(p => p.id === selectedPropertyId);
      const data: CreateInvoiceData = {
        property_id: selectedPropertyId,
        tenant_id: sendToTenant && genData?.tenant ? genData.tenant.id : null,
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
        setResult({ created: 1, errors: [] });
        onCreated();
      } else {
        setResult({ created: 0, errors: [error.message] });
      }
    } else {
      // Bulk creation
      const res = await createBulkInvoices(bulkPreviews, {
        invoiceDate,
        dueDate,
        periodStart,
        periodEnd,
        sendToTenant,
        notes: notes || undefined,
      });
      setSaving(false);
      setResult(res);
      if (res.created > 0) onCreated();
    }
  };

  const canProceed = mode === 'single'
    ? !!selectedPropertyId
    : mode === 'address'
      ? !!selectedAddressId
      : true;

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
              <h3 className="text-[15px] font-bold text-gray-900">
                {result ? 'Rezultatas' : step === 'preview' ? 'Peržiūra' : 'Nauja sąskaita'}
              </h3>
              <p className="text-[11px] text-gray-400">
                {result
                  ? `Sukurta: ${result.created}`
                  : step === 'preview'
                    ? 'Peržiūrėkite prieš kuriant'
                    : 'Pasirinkite generavimo režimą'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {result ? (
            /* ──── RESULT STATE ──── */
            <div className="text-center py-8 space-y-4">
              <div className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center ${result.created > 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                {result.created > 0
                  ? <Check className="w-7 h-7 text-emerald-600" />
                  : <AlertCircle className="w-7 h-7 text-red-500" />
                }
              </div>
              <div>
                <p className="text-[15px] font-bold text-gray-900">
                  {result.created > 0 ? `Sukurta ${result.created} sąskait${result.created === 1 ? 'a' : 'os'}` : 'Nepavyko sukurti'}
                </p>
                {result.errors.length > 0 && (
                  <div className="mt-3 text-left max-w-sm mx-auto">
                    <p className="text-[10px] font-semibold text-red-500 uppercase tracking-wider mb-1">Klaidos</p>
                    {result.errors.map((e, i) => (
                      <p key={i} className="text-[11px] text-red-600 py-0.5">{e}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : step === 'configure' ? (
            /* ──── CONFIGURE STEP ──── */
            <>
              {/* Mode tabs */}
              <div className="flex gap-2">
                {modeTabs.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => { setMode(tab.key); setSelectedPropertyId(''); setSelectedAddressId(''); }}
                    className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all ${mode === tab.key
                      ? 'bg-teal-50/80 border-teal-200/60 shadow-sm'
                      : 'bg-gray-50/50 border-gray-100 hover:bg-gray-50'
                      }`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${mode === tab.key ? 'bg-teal-500/10 text-teal-600' : 'bg-gray-100 text-gray-400'
                      }`}>
                      {tab.icon}
                    </div>
                    <div>
                      <div className={`text-[11px] font-semibold ${mode === tab.key ? 'text-teal-700' : 'text-gray-600'}`}>{tab.label}</div>
                      <div className="text-[9px] text-gray-400">{tab.desc}</div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Selector based on mode */}
              {mode === 'single' && (
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
              )}

              {mode === 'address' && (
                <div>
                  <label className={labelStyle}>Adresas</label>
                  <select
                    value={selectedAddressId}
                    onChange={e => setSelectedAddressId(e.target.value)}
                    className={inputStyle + ' appearance-none cursor-pointer'}
                  >
                    <option value="">Pasirinkite adresą...</option>
                    {addresses.map(a => (
                      <option key={a.id} value={a.id}>{a.street}, {a.city}</option>
                    ))}
                  </select>
                  {selectedAddressId && (
                    <p className="text-[10px] text-gray-400 mt-1.5">
                      Bus sugeneruotos sąskaitos {properties.filter(p => p.address_id === selectedAddressId).length} butams
                    </p>
                  )}
                </div>
              )}

              {mode === 'all' && (
                <div className="px-4 py-3 bg-teal-50/50 rounded-xl border border-teal-100/60">
                  <p className="text-[11px] text-teal-700 font-medium">
                    Bus sugeneruotos sąskaitos visiems {properties.length} butams visuose adresuose
                  </p>
                </div>
              )}

              {/* Invoice details */}
              <div className="grid grid-cols-3 gap-4">
                {mode === 'single' && (
                  <div>
                    <label className={labelStyle}>Sąskaitos Nr.</label>
                    <input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} className={inputStyle} />
                  </div>
                )}
                <div>
                  <label className={labelStyle}>Sąskaitos data</label>
                  <LtDateInput value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle}>Mokėjimo terminas</label>
                  <LtDateInput value={dueDate} onChange={e => setDueDate(e.target.value)} className={inputStyle} />
                </div>
              </div>

              {/* Period */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelStyle}>Laikotarpio pradžia</label>
                  <LtDateInput value={periodStart} onChange={e => setPeriodStart(e.target.value)} className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle}>Laikotarpio pabaiga</label>
                  <LtDateInput value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} className={inputStyle} />
                </div>
              </div>

              {/* Send toggle */}
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50/80 rounded-xl border border-gray-100">
                <div className="flex items-center gap-2.5">
                  <User className="w-4 h-4 text-gray-400" />
                  <div>
                    <div className="text-[11px] font-semibold text-gray-700">Siųsti nuomininkui</div>
                    <div className="text-[9px] text-gray-400">Nuomininkas matys sąskaitą savo paskyroje</div>
                  </div>
                </div>
                <button
                  onClick={() => setSendToTenant(!sendToTenant)}
                  className={`relative w-9 h-5 rounded-full transition-colors ${sendToTenant ? 'bg-teal-500' : 'bg-gray-200'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${sendToTenant ? 'left-[18px]' : 'left-0.5'}`} />
                </button>
              </div>

              {/* Single-mode: tenant & line items preview */}
              {mode === 'single' && genData?.tenant && (
                <div className="flex items-center gap-3 px-4 py-3 bg-teal-50/50 rounded-xl border border-teal-100/60">
                  <User className="w-4 h-4 text-teal-600 flex-shrink-0" />
                  <div>
                    <div className="text-[12px] font-semibold text-gray-900">{genData.tenant.first_name} {genData.tenant.last_name}</div>
                    <div className="text-[11px] text-gray-400">{genData.tenant.email}</div>
                  </div>
                </div>
              )}

              {mode === 'single' && loading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 text-teal-500 animate-spin" />
                </div>
              )}

              {mode === 'single' && !loading && lineItems.length > 0 && (
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
            </>
          ) : (
            /* ──── PREVIEW STEP (bulk) ──── */
            <>
              {mode !== 'single' && (
                <>
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                      {bulkSelectedCount} iš {bulkPreviews.length} pasirinkta
                    </div>
                    <button onClick={toggleAllBulk} className="text-[10px] font-semibold text-teal-600 hover:text-teal-700 transition-colors">
                      {bulkPreviews.every(p => p.selected) ? 'Atžymėti visus' : 'Pasirinkti visus'}
                    </button>
                  </div>

                  {bulkPreviews.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                        <FileText className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-[13px] font-semibold text-gray-700">Nėra butų</p>
                      <p className="text-[11px] text-gray-400 mt-1">Nerasta butų su skaitikliais ar nuoma</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[380px] overflow-y-auto">
                      {bulkPreviews.map((preview, idx) => (
                        <div
                          key={preview.propertyId}
                          className={`${surface} p-3.5 cursor-pointer transition-all ${preview.selected ? 'ring-1 ring-teal-500/30' : 'opacity-50'
                            }`}
                          onClick={() => toggleBulkItem(idx)}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              {/* Checkbox */}
                              <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${preview.selected ? 'bg-teal-500 border-teal-500' : 'border-gray-300 bg-white'
                                }`}>
                                {preview.selected && <Check className="w-3 h-3 text-white" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-[12px] font-bold text-gray-900">{preview.apartment}</span>
                                  <span className="text-[10px] text-gray-400 truncate">{preview.address}</span>
                                </div>
                                <div className="flex items-center gap-3 mt-1">
                                  {preview.tenant ? (
                                    <span className="text-[10px] text-gray-500">
                                      {preview.tenant.first_name} {preview.tenant.last_name}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-gray-300 italic">Be nuomininko</span>
                                  )}
                                  <span className="text-[9px] text-gray-300">•</span>
                                  <span className="text-[10px] text-gray-400">
                                    {preview.lineItems.length} eilut{preview.lineItems.length === 1 ? 'ė' : 'ės'}
                                  </span>
                                </div>
                                {/* Mini line items */}
                                {preview.selected && preview.lineItems.length > 0 && (
                                  <div className="mt-2 space-y-0.5">
                                    {preview.lineItems.map((item, li) => (
                                      <div key={li} className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                          <div className={`w-1 h-1 rounded-full ${item.type === 'rent' ? 'bg-teal-400' : 'bg-blue-400'}`} />
                                          <span className="text-[10px] text-gray-500">{item.description}</span>
                                        </div>
                                        <span className="text-[10px] font-semibold text-gray-600 tabular-nums">{formatCurrency(item.amount)}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <span className="text-[13px] font-bold text-gray-900 tabular-nums">{formatCurrency(preview.totalAmount)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Bulk total */}
                  {bulkPreviews.length > 0 && (
                    <div className="flex items-center justify-between px-4 py-3 bg-teal-50/60 rounded-xl border border-teal-100/60">
                      <span className="text-[12px] font-bold text-teal-800">Bendra suma</span>
                      <span className="text-[15px] font-bold text-teal-700 tabular-nums">{formatCurrency(bulkTotal)}</span>
                    </div>
                  )}
                </>
              )}

              {/* Single mode preview — just show summary */}
              {mode === 'single' && lineItems.length > 0 && (
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
                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50/80 border-t border-gray-100">
                      <span className="text-[12px] font-bold text-gray-700">Viso</span>
                      <span className="text-[14px] font-bold text-teal-700 tabular-nums">{formatCurrency(totalAmount)}</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-white">
          <div className="text-[11px] text-gray-400">
            {step === 'preview' && mode !== 'single' && bulkSelectedCount > 0 && (
              <>{bulkSelectedCount} sąskait{bulkSelectedCount === 1 ? 'a' : 'os'} • {formatCurrency(bulkTotal)}</>
            )}
            {step === 'configure' && mode === 'single' && totalAmount > 0 && `Suma: ${formatCurrency(totalAmount)}`}
          </div>
          <div className="flex items-center gap-2">
            {result ? (
              <button onClick={onClose} className={btnPrimary}>Uždaryti</button>
            ) : step === 'preview' ? (
              <>
                <button onClick={() => setStep('configure')} className={btnSecondary}>
                  <ChevronUp className="w-3.5 h-3.5" />
                  Atgal
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || (mode !== 'single' && bulkSelectedCount === 0)}
                  className={`${btnPrimary} disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  {saving ? 'Kuriama...' : mode === 'single' ? 'Sukurti sąskaitą' : `Sukurti ${bulkSelectedCount} sąskait${bulkSelectedCount === 1 ? 'ą' : 'as'}`}
                </button>
              </>
            ) : (
              <>
                <button onClick={onClose} className={btnSecondary}>Atšaukti</button>
                <button
                  onClick={handleGeneratePreview}
                  disabled={!canProceed || bulkLoading}
                  className={`${btnPrimary} disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  {bulkLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                  {bulkLoading ? 'Generuojama...' : 'Peržiūrėti'}
                </button>
              </>
            )}
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
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

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

  // Close export menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    if (showExportMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showExportMenu]);

  const handleExport = useCallback((scope: 'property' | 'address' | 'all', format: ExportFormat) => {
    setShowExportMenu(false);
    if (scope === 'all') {
      exportAll(invoices, format);
    } else if (scope === 'address' && addressFilter) {
      exportByAddress(invoices, addressFilter, format);
    }
    // Note: property-level export would be triggered from individual invoice rows if needed
  }, [invoices, addressFilter]);

  const selectedAddressName = useMemo(() => {
    if (!addressFilter) return '';
    const a = addresses.find((a: any) => a.id === addressFilter);
    return a ? `${a.street}, ${a.city}` : '';
  }, [addressFilter, addresses]);

  return (
    <div className="p-6 space-y-5 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Sąskaitos</h1>
          <p className="text-[12px] text-gray-400 mt-0.5">Valdykite nuomos sąskaitas ir mokėjimus</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Export dropdown */}
          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className={`${btnSecondary} border border-gray-200/80`}
              disabled={invoices.length === 0}
            >
              <Download className="w-3.5 h-3.5" />
              Eksportuoti
              <ChevronDown className="w-3 h-3 ml-0.5" />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-[260px] bg-white rounded-xl border border-gray-200/80 shadow-lg shadow-gray-200/50 z-50 py-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="px-3 py-1.5">
                  <div className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.1em]">Duomenų lentelė</div>
                </div>
                {addressFilter && (
                  <button
                    onClick={() => handleExport('address', 'flat')}
                    className="w-full px-3 py-2 text-left text-[12px] text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                  >
                    <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span className="truncate">{selectedAddressName}</span>
                  </button>
                )}
                <button
                  onClick={() => handleExport('all', 'flat')}
                  className="w-full px-3 py-2 text-left text-[12px] text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                >
                  <Building2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  Visi adresai
                </button>

                <div className="my-1.5 border-t border-gray-100" />

                <div className="px-3 py-1.5">
                  <div className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.1em]">Graži ataskaita</div>
                </div>
                {addressFilter && (
                  <button
                    onClick={() => handleExport('address', 'report')}
                    className="w-full px-3 py-2 text-left text-[12px] text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                  >
                    <MapPin className="w-3.5 h-3.5 text-teal-500 flex-shrink-0" />
                    <span className="truncate">{selectedAddressName}</span>
                  </button>
                )}
                <button
                  onClick={() => handleExport('all', 'report')}
                  className="w-full px-3 py-2 text-left text-[12px] text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                >
                  <Building2 className="w-3.5 h-3.5 text-teal-500 flex-shrink-0" />
                  Visi adresai
                </button>
              </div>
            )}
          </div>

          <button onClick={() => setShowCreateModal(true)} className={btnPrimary}>
            <Plus className="w-3.5 h-3.5" />
            Nauja sąskaita
          </button>
        </div>
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