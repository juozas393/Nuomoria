import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FileText,
  Check,
  Clock,
  AlertCircle,
  ChevronDown,
  ArrowLeft,
  Euro,
  Calendar,
  Receipt,
  Download,
  Loader2,
  Zap,
  Droplets,
  Flame,
  Thermometer,
  Home,
  Sparkles,
  Printer,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { ParticleDrift } from '../../components/ui/ParticleDrift';

interface DetailedInvoice {
  id: string;
  month: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue' | 'cancelled';
  dueDate: string;
  paidDate?: string;
  description: string;
  baseRent: number;
  lateFee: number;
  totalWithLateFee: number;
  propertyAddress: string;
  invoiceNumber: string;
  billingPeriod: string;
  lineItems?: { label: string; amount: number; type: string; consumption?: number; unit?: string; tariff?: number }[];
}

const MONTHS_LT = ['Sausis', 'Vasaris', 'Kovas', 'Balandis', 'Gegužė', 'Birželis', 'Liepa', 'Rugpjūtis', 'Rugsėjis', 'Spalis', 'Lapkritis', 'Gruodis'];

const fmt = (amount: number) =>
  new Intl.NumberFormat('lt-LT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(amount);

const getUtilityIcon = (label: string): { Icon: LucideIcon; color: string; bg: string; glow: string } => {
  const l = label.toLowerCase();
  if (l.includes('nuoma') || l.includes('rent')) return { Icon: Home, color: 'text-[#2F8481]', bg: 'bg-[#E8F5F4]', glow: 'shadow-[#2F8481]/20' };
  if (l.includes('elektr')) return { Icon: Zap, color: 'text-amber-500', bg: 'bg-amber-50', glow: 'shadow-amber-500/20' };
  if (l.includes('karšt')) return { Icon: Flame, color: 'text-orange-500', bg: 'bg-orange-50', glow: 'shadow-orange-500/20' };
  if (l.includes('šalt') || l.includes('vanduo')) return { Icon: Droplets, color: 'text-blue-500', bg: 'bg-blue-50', glow: 'shadow-blue-500/20' };
  if (l.includes('šild')) return { Icon: Thermometer, color: 'text-red-500', bg: 'bg-red-50', glow: 'shadow-red-500/20' };
  if (l.includes('duj')) return { Icon: Flame, color: 'text-amber-600', bg: 'bg-amber-50', glow: 'shadow-amber-500/20' };
  return { Icon: Receipt, color: 'text-gray-500', bg: 'bg-gray-100', glow: '' };
};

// Status visual config
const statusConfig = {
  paid: {
    icon: Check,
    gradient: 'from-emerald-500 to-emerald-400',
    ring: 'ring-emerald-400/30',
    glow: 'shadow-emerald-500/25',
    bg: 'bg-emerald-500/10',
    textBg: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    dot: 'bg-emerald-500',
    label: 'Apmokėta',
    borderAccent: 'border-l-emerald-400',
  },
  pending: {
    icon: Clock,
    gradient: 'from-amber-500 to-amber-400',
    ring: 'ring-amber-400/30',
    glow: 'shadow-amber-500/25',
    bg: 'bg-amber-500/10',
    textBg: 'bg-amber-50 text-amber-700 border-amber-100',
    dot: 'bg-amber-500',
    label: 'Laukiama',
    borderAccent: 'border-l-amber-400',
  },
  overdue: {
    icon: AlertCircle,
    gradient: 'from-red-500 to-red-400',
    ring: 'ring-red-400/30',
    glow: 'shadow-red-500/25',
    bg: 'bg-red-500/10',
    textBg: 'bg-red-50 text-red-600 border-red-100',
    dot: 'bg-red-500',
    label: 'Vėluoja',
    borderAccent: 'border-l-red-400',
  },
  cancelled: {
    icon: X,
    gradient: 'from-gray-400 to-gray-300',
    ring: 'ring-gray-300/30',
    glow: '',
    bg: 'bg-gray-400/10',
    textBg: 'bg-gray-50 text-gray-500 border-gray-200',
    dot: 'bg-gray-400',
    label: 'Atšaukta',
    borderAccent: 'border-l-gray-300',
  },
};

const TenantInvoices: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<DetailedInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);
  const [paymentMessage, setPaymentMessage] = useState<{ type: 'success' | 'error' | 'cancelled'; text: string } | null>(null);

  // Reload invoices helper
  const reloadInvoices = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*, properties(apartment_number, address_id, addresses:address_id(full_address))')
        .order('invoice_date', { ascending: false });
      if (error || !data) return;
      const mapped: DetailedInvoice[] = data.map((row: any) => {
        const ps = row.period_start ? new Date(row.period_start) : new Date();
        const addr = row.properties?.addresses?.full_address || '';
        const unit = row.properties?.apartment_number || '';
        let status: 'paid' | 'pending' | 'overdue' | 'cancelled' = 'pending';
        if (row.status === 'paid') status = 'paid';
        else if (row.status === 'overdue') status = 'overdue';
        else if (row.status === 'cancelled') status = 'cancelled';
        return {
          id: row.id, month: `${MONTHS_LT[ps.getMonth()]} ${ps.getFullYear()}`,
          amount: row.amount || 0, status,
          dueDate: row.due_date ? new Date(row.due_date).toLocaleDateString('lt-LT') : '',
          paidDate: row.paid_date ? new Date(row.paid_date).toLocaleDateString('lt-LT') : undefined,
          description: unit ? `Butas ${unit}` : 'Būstas', baseRent: row.rent_amount || 0,
          lateFee: row.late_fee || 0, totalWithLateFee: (row.amount || 0) + (row.late_fee || 0),
          propertyAddress: addr, invoiceNumber: row.invoice_number || '',
          billingPeriod: row.period_start && row.period_end
            ? `${new Date(row.period_start).toLocaleDateString('lt-LT')} — ${new Date(row.period_end).toLocaleDateString('lt-LT')}` : '',
          lineItems: Array.isArray(row.line_items) ? row.line_items : [],
        };
      });
      setInvoices(mapped);
    } catch { /* silent */ }
  }, [user?.id]);

  // Check URL for payment result + poll for webhook update
  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    if (paymentStatus === 'success') {
      setPaymentMessage({ type: 'success', text: 'Mokėjimas sėkmingai atliktas! Sąskaita bus pažymėta kaip apmokėta.' });
      setSearchParams({}, { replace: true });
      // Poll for webhook update at 2s, 5s, 10s
      const t1 = setTimeout(() => reloadInvoices(), 2000);
      const t2 = setTimeout(() => reloadInvoices(), 5000);
      const t3 = setTimeout(() => reloadInvoices(), 10000);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    } else if (paymentStatus === 'cancelled') {
      setPaymentMessage({ type: 'cancelled', text: 'Mokėjimas atšauktas.' });
      setSearchParams({}, { replace: true });
    }
    if (paymentStatus) setTimeout(() => setPaymentMessage(null), 12000);
  }, [searchParams, setSearchParams, reloadInvoices]);

  const handlePayment = useCallback(async (invoiceId: string) => {
    try {
      setPayingInvoiceId(invoiceId);
      setPaymentMessage(null);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setPaymentMessage({ type: 'error', text: 'Nėra sesijos. Prisijunkite iš naujo.' }); return; }
      const res = await supabase.functions.invoke('stripe-create-payment', {
        body: { invoice_id: invoiceId },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);
      if (res.data?.checkout_url) {
        window.location.href = res.data.checkout_url;
      } else {
        throw new Error('Nepavyko gauti mokėjimo nuorodos');
      }
    } catch (err) {
      setPaymentMessage({ type: 'error', text: err instanceof Error ? err.message : 'Mokėjimo klaida' });
    } finally {
      setPayingInvoiceId(null);
    }
  }, []);

  // PDF download handler
  const handleDownloadPDF = useCallback((inv: DetailedInvoice) => {
    const utilAmt = inv.amount - inv.baseRent;
    const lineItemsHtml = (inv.lineItems || []).map(li =>
      `<tr><td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#374151">${li.label || ''}</td><td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:12px;color:#9ca3af;text-align:right">${li.consumption != null && li.unit ? `${li.consumption} ${li.unit} × ${li.tariff?.toFixed(4)} €` : '—'}</td><td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;font-weight:600;text-align:right;color:${(li.label || '').toLowerCase().includes('nuoma') ? '#2F8481' : '#374151'}">${fmt(li.amount)}</td></tr>`
    ).join('');
    const statusText = inv.status === 'paid' ? 'APMOKĖTA' : inv.status === 'overdue' ? 'VĖLUOJA' : inv.status === 'cancelled' ? 'ATŠAUKTA' : 'LAUKIAMA';
    const statusColor = inv.status === 'paid' ? '#10b981' : inv.status === 'overdue' ? '#ef4444' : inv.status === 'cancelled' ? '#9ca3af' : '#f59e0b';
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Sąskaita ${inv.invoiceNumber}</title><style>@media print{body{margin:0;padding:20px}@page{margin:15mm}}</style></head><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:700px;margin:0 auto;padding:40px;color:#1f2937">
<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;border-bottom:3px solid #2F8481;padding-bottom:20px">
<div><div style="font-size:24px;font-weight:800;color:#2F8481;margin-bottom:4px">Nuomoria</div><div style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:2px">Sąskaita-faktūra</div></div>
<div style="text-align:right"><div style="font-size:11px;color:#9ca3af;margin-bottom:4px">Nr.</div><div style="font-size:16px;font-weight:700;color:#374151;font-family:monospace">${inv.invoiceNumber}</div><div style="display:inline-block;margin-top:8px;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;color:white;background:${statusColor}">${statusText}</div></div></div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:28px;padding:16px;background:#f9fafb;border-radius:8px">
<div><div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Laikotarpis</div><div style="font-size:13px;font-weight:500">${inv.billingPeriod || '-'}</div></div>
<div><div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Mokėjimo terminas</div><div style="font-size:13px;font-weight:500">${inv.dueDate}</div></div>
<div><div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Adresas</div><div style="font-size:13px;font-weight:500">${inv.description}, ${inv.propertyAddress}</div></div>
${inv.paidDate ? `<div><div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Apmokėjimo data</div><div style="font-size:13px;font-weight:500;color:#10b981">${inv.paidDate}</div></div>` : ''}
</div>
<table style="width:100%;border-collapse:collapse;margin-bottom:24px"><thead><tr style="border-bottom:2px solid #2F8481"><th style="text-align:left;padding:8px 12px;font-size:10px;color:#2F8481;text-transform:uppercase;letter-spacing:1px">Paslauga</th><th style="text-align:right;padding:8px 12px;font-size:10px;color:#2F8481;text-transform:uppercase;letter-spacing:1px">Suvartojimas</th><th style="text-align:right;padding:8px 12px;font-size:10px;color:#2F8481;text-transform:uppercase;letter-spacing:1px">Suma</th></tr></thead><tbody>${lineItemsHtml}</tbody></table>
<div style="display:flex;justify-content:flex-end"><div style="width:280px;border-top:2px solid #e5e7eb;padding-top:12px">
<div style="display:flex;justify-content:space-between;margin-bottom:8px"><span style="font-size:12px;color:#9ca3af">Nuoma</span><span style="font-size:12px;font-weight:600">${fmt(inv.baseRent)}</span></div>
${utilAmt > 0.01 ? `<div style="display:flex;justify-content:space-between;margin-bottom:8px"><span style="font-size:12px;color:#9ca3af">Komunaliniai</span><span style="font-size:12px;font-weight:600">${fmt(utilAmt)}</span></div>` : ''}
${inv.lateFee > 0 ? `<div style="display:flex;justify-content:space-between;margin-bottom:8px"><span style="font-size:12px;color:#ef4444">Vėlavimo mokestis</span><span style="font-size:12px;font-weight:600;color:#ef4444">+${fmt(inv.lateFee)}</span></div>` : ''}
<div style="display:flex;justify-content:space-between;border-top:2px solid #374151;padding-top:12px;margin-top:8px"><span style="font-size:14px;font-weight:800;text-transform:uppercase">Iš viso</span><span style="font-size:22px;font-weight:800;color:#2F8481">${fmt(inv.totalWithLateFee)}</span></div>
</div></div>
<div style="margin-top:40px;padding-top:16px;border-top:1px solid #e5e7eb;text-align:center;font-size:10px;color:#d1d5db">${inv.invoiceNumber} · Nuomoria · Sugeneruota ${new Date().toLocaleDateString('lt-LT')}</div>
</body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 300); }
  }, []);

  useEffect(() => {
    const loadInvoices = async () => {
      if (!user?.id) return;
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('invoices')
          .select('*, properties(apartment_number, address_id, addresses:address_id(full_address))')
          .order('invoice_date', { ascending: false });

        if (error) { if (import.meta.env.DEV) console.error('[TenantInvoices]', error); setIsLoading(false); return; }

        const mapped: DetailedInvoice[] = (data || []).map((row: any) => {
          const ps = row.period_start ? new Date(row.period_start) : new Date();
          const addr = row.properties?.addresses?.full_address || '';
          const unit = row.properties?.apartment_number || '';
          let status: 'paid' | 'pending' | 'overdue' | 'cancelled' = 'pending';
          if (row.status === 'paid') status = 'paid';
          else if (row.status === 'overdue') status = 'overdue';
          else if (row.status === 'cancelled') status = 'cancelled';

          return {
            id: row.id,
            month: `${MONTHS_LT[ps.getMonth()]} ${ps.getFullYear()}`,
            amount: row.amount || 0,
            status,
            dueDate: row.due_date ? new Date(row.due_date).toLocaleDateString('lt-LT') : '',
            paidDate: row.paid_date ? new Date(row.paid_date).toLocaleDateString('lt-LT') : undefined,
            description: unit ? `Butas ${unit}` : 'Būstas',
            baseRent: row.rent_amount || 0,
            lateFee: row.late_fee || 0,
            totalWithLateFee: (row.amount || 0) + (row.late_fee || 0),
            propertyAddress: addr,
            invoiceNumber: row.invoice_number || '',
            billingPeriod: row.period_start && row.period_end
              ? `${new Date(row.period_start).toLocaleDateString('lt-LT')} — ${new Date(row.period_end).toLocaleDateString('lt-LT')}`
              : '',
            lineItems: Array.isArray(row.line_items) ? row.line_items : [],
          };
        });
        setInvoices(mapped);
      } catch (err) { if (import.meta.env.DEV) console.error('[TenantInvoices]', err); }
      finally { setIsLoading(false); }
    };
    loadInvoices();
  }, [user?.id]);

  const filtered = selectedStatus === 'all' ? invoices : invoices.filter(i => i.status === selectedStatus);
  const paidCount = invoices.filter(i => i.status === 'paid').length;
  const pendingCount = invoices.filter(i => i.status === 'pending').length;
  const overdueCount = invoices.filter(i => i.status === 'overdue').length;
  const totalOwed = invoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled').reduce((s, i) => s + i.amount, 0);
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0);

  // Circular progress for hero
  const paidPct = useMemo(() => {
    const total = totalOwed + totalPaid;
    return total > 0 ? Math.round((totalPaid / total) * 100) : 100;
  }, [totalOwed, totalPaid]);

  const filters = [
    { key: 'all', label: 'Visos', count: invoices.length },
    { key: 'pending', label: 'Laukiamos', count: pendingCount },
    { key: 'overdue', label: 'Vėluojančios', count: overdueCount },
    { key: 'paid', label: 'Apmokėtos', count: paidCount },
  ];

  return (
    <div
      className="min-h-full relative overflow-hidden bg-cover bg-center bg-fixed"
      style={{ backgroundImage: `url('/imagesGen/DashboardImage.webp')` }}
    >
      {/* Dark teal gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-[1]"
        style={{
          background: 'linear-gradient(180deg, rgba(3,20,18,0.55) 0%, rgba(6,30,28,0.40) 40%, rgba(16,185,170,0.08) 70%, rgba(3,20,18,0.50) 100%)',
        }}
      />
      <ParticleDrift />

      {/* Animated CSS for pulsing ring & shimmer */}
      <style>{`
        @keyframes shimmer-bar {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes ring-pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
        .shimmer-accent {
          background: linear-gradient(90deg, #2F8481, #5ECEC0, #2F8481, #5ECEC0);
          background-size: 200% 100%;
          animation: shimmer-bar 3s linear infinite;
        }
        .status-ring { animation: ring-pulse 2s ease-in-out infinite; }
        @keyframes float-in {
          0% { opacity: 0; transform: translateY(12px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .invoice-card-enter { animation: float-in 0.4s ease-out both; }
      `}</style>

      <div className="relative z-10 min-h-full">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12">
          {/* Nav */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => navigate('/tenant')}
              className="w-9 h-9 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] backdrop-blur-sm border border-white/[0.10] flex items-center justify-center text-white/70 hover:text-white transition-all active:scale-[0.95]"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">Sąskaitos</h1>
              <p className="text-[11px] text-white/50">Mokėjimų istorija ir sąskaitų detalės</p>
            </div>
          </div>

          {/* ═══ Hero Section — Gradient card with circular progress ═══ */}
          <section className="relative overflow-hidden rounded-2xl shadow-xl shadow-[#2F8481]/15 mb-6">
            <div className="absolute inset-0 bg-gradient-to-br from-[#2F8481] via-[#348f8c] to-[#3aa8a4]" />
            {/* Animated glow orbs */}
            <div className="absolute -top-20 -right-20 w-56 h-56 bg-white/[0.08] rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
            <div className="absolute -bottom-16 -left-16 w-44 h-44 bg-white/[0.08] rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s' }} />
            <div className="absolute top-1/2 right-1/4 w-32 h-32 bg-cyan-300/10 rounded-full blur-2xl" />
            {/* Diagonal stripe pattern overlay */}
            <div className="absolute inset-0 opacity-[0.04]" style={{
              backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, white 10px, white 11px)',
            }} />

            <div className="relative z-10 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
              <div className="text-white">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-cyan-300" />
                  <p className="text-white/70 text-xs font-medium uppercase tracking-wider">Bendra mokėtina suma</p>
                </div>
                <div className="flex items-baseline gap-3 mb-2">
                  <span className="text-4xl sm:text-5xl font-bold tracking-tight">{fmt(totalOwed)}</span>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-sm ${totalOwed === 0 ? 'bg-white/20 text-white' : overdueCount > 0 ? 'bg-red-500/30 text-red-100 ring-1 ring-red-400/20' : 'bg-amber-500/30 text-amber-100 ring-1 ring-amber-400/20'
                    }`}>
                    {totalOwed === 0 && <Check className="w-3.5 h-3.5" />}
                    {totalOwed > 0 && overdueCount > 0 && <AlertCircle className="w-3.5 h-3.5" />}
                    {totalOwed > 0 && overdueCount === 0 && <Clock className="w-3.5 h-3.5" />}
                    {totalOwed === 0 ? 'Viskas apmokėta' : overdueCount > 0 ? `${overdueCount} vėluoja` : `${pendingCount} laukia`}
                  </span>
                </div>
                <p className="text-white/50 text-sm">
                  Iš viso: <span className="text-white/80 font-medium">{invoices.length}</span>
                  {paidCount > 0 && <> · Apmokėta: <span className="text-white/80 font-medium">{paidCount}</span></>}
                </p>
              </div>

              {/* Circular progress ring */}
              <div className="relative w-20 h-20 flex-shrink-0">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="34" strokeWidth="6" fill="none" className="stroke-white/10" />
                  <circle
                    cx="40" cy="40" r="34" strokeWidth="6" fill="none"
                    className="stroke-cyan-300"
                    strokeLinecap="round"
                    strokeDasharray={`${paidPct * 2.136} ${213.6 - paidPct * 2.136}`}
                    style={{ transition: 'stroke-dasharray 1s ease' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[16px] font-bold text-white">{paidPct}%</span>
                  <span className="text-[8px] text-white/50 uppercase tracking-wider">apmokėta</span>
                </div>
              </div>
            </div>
          </section>

          {/* ═══ Payment status message ═══ */}
          {paymentMessage && (
            <div className={`rounded-xl px-5 py-3.5 mb-4 flex items-center gap-3 transition-all ${paymentMessage.type === 'success' ? 'bg-emerald-500/15 border border-emerald-500/20 text-emerald-200' :
              paymentMessage.type === 'cancelled' ? 'bg-amber-500/15 border border-amber-500/20 text-amber-200' :
                'bg-red-500/15 border border-red-500/20 text-red-200'
              }`}>
              {paymentMessage.type === 'success' ? <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" /> :
                paymentMessage.type === 'cancelled' ? <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" /> :
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
              <span className="text-[12px] font-medium">{paymentMessage.text}</span>
              <button onClick={() => setPaymentMessage(null)} className="ml-auto text-white/40 hover:text-white/70 text-[18px] leading-none">&times;</button>
            </div>
          )}

          {/* ═══ KPI cards — glass morphism ═══ */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-6">
            {[
              { icon: FileText, label: 'Iš viso', value: String(invoices.length), gradient: 'from-[#2F8481] to-[#3aa8a4]', glow: 'shadow-[#2F8481]/30' },
              { icon: Check, label: 'Apmokėta', value: String(paidCount), gradient: 'from-emerald-500 to-emerald-400', glow: 'shadow-emerald-500/30' },
              { icon: Clock, label: 'Laukiama', value: String(pendingCount), gradient: 'from-amber-500 to-amber-400', glow: 'shadow-amber-500/30' },
              { icon: AlertCircle, label: 'Vėluoja', value: String(overdueCount), gradient: overdueCount > 0 ? 'from-red-500 to-red-400' : 'from-gray-500 to-gray-400', glow: overdueCount > 0 ? 'shadow-red-500/30' : '' },
            ].map((kpi, i) => (
              <div
                key={i}
                className="bg-white/[0.07] backdrop-blur-md border border-white/[0.10] rounded-xl p-3.5 hover:bg-white/[0.10] hover:border-white/[0.15] transition-all duration-300 group"
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${kpi.gradient} flex items-center justify-center shadow-md ${kpi.glow} group-hover:scale-110 transition-transform duration-200`}>
                    <kpi.icon className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-[10px] font-medium text-white/50 group-hover:text-white/70 transition-colors">{kpi.label}</span>
                </div>
                <div className="text-2xl font-bold text-white tabular-nums">{kpi.value}</div>
              </div>
            ))}
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-7 h-7 text-white/60 animate-spin mb-2" />
              <p className="text-sm text-white/40">Kraunama...</p>
            </div>
          ) : (
            <>
              {/* ═══ Filter tabs ═══ */}
              <div className="bg-white/[0.06] backdrop-blur-sm rounded-xl border border-white/[0.08] p-1.5 mb-5 flex items-center gap-1 overflow-x-auto">
                {filters.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setSelectedStatus(f.key)}
                    className={`px-4 py-2 rounded-xl text-[11px] font-semibold transition-all whitespace-nowrap ${selectedStatus === f.key
                      ? 'bg-gradient-to-r from-[#2F8481] to-[#3aa8a4] text-white shadow-lg shadow-[#2F8481]/30'
                      : 'text-white/50 hover:text-white/70 hover:bg-white/[0.06]'
                      }`}
                  >
                    {f.label}
                    <span className={`ml-1.5 ${selectedStatus === f.key ? 'text-white/60' : 'text-white/30'}`}>
                      {f.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* ═══ Invoice list ═══ */}
              <div className="space-y-3">
                {filtered.length === 0 ? (
                  <div className="bg-white/[0.06] backdrop-blur-sm rounded-2xl border border-white/[0.08] p-16 text-center">
                    <Receipt className="w-12 h-12 text-white/15 mx-auto mb-3" />
                    <h3 className="text-sm font-semibold text-white/70 mb-1">Sąskaitų nerasta</h3>
                    <p className="text-xs text-white/40">Kai nuomotojas sukurs sąskaitą, ji bus rodoma čia.</p>
                  </div>
                ) : (
                  filtered.map((inv, idx) => {
                    const isOpen = expandedInvoice === inv.id;
                    const rentPct = inv.amount > 0 ? Math.round((inv.baseRent / inv.amount) * 100) : 100;
                    const utilAmt = inv.amount - inv.baseRent;
                    const sc = statusConfig[inv.status];
                    const StatusIcon = sc.icon;

                    return (
                      <div
                        key={inv.id}
                        className={`invoice-card-enter bg-white rounded-2xl overflow-hidden transition-all duration-300 border-l-[3px] ${sc.borderAccent} ${isOpen
                          ? 'shadow-[0_8px_32px_rgba(0,0,0,0.12)] ring-1 ring-[#2F8481]/10 scale-[1.005]'
                          : 'shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.10)] hover:scale-[1.003]'
                          }`}
                        style={{
                          animationDelay: `${idx * 60}ms`,
                          backgroundImage: `url('/images/CardsBackground.webp')`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }}
                      >
                        {/* ── Invoice header row ── */}
                        <button
                          onClick={() => setExpandedInvoice(isOpen ? null : inv.id)}
                          className="w-full text-left px-5 py-4 flex items-center gap-4 group"
                        >
                          {/* Status icon */}
                          <div className="relative flex-shrink-0">
                            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${sc.gradient} flex items-center justify-center shadow-md ${sc.glow} group-hover:scale-110 transition-transform duration-200`}>
                              <StatusIcon className="w-5 h-5 text-white" />
                            </div>
                            {inv.status !== 'paid' && (
                              <div className={`absolute inset-0 rounded-xl ring-2 ${sc.ring} status-ring`} />
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-[14px] font-bold text-gray-900">{inv.month}</span>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${sc.textBg}`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${sc.dot} ${inv.status !== 'paid' ? 'animate-pulse' : ''}`} />
                                {sc.label}
                              </span>
                            </div>
                            <div className="text-[11px] text-gray-400 flex items-center gap-2">
                              <span>{inv.description}</span>
                              <span className="text-gray-200">·</span>
                              <Calendar className="w-3 h-3" />
                              <span>{inv.status === 'paid' ? `Apmokėta ${inv.paidDate || ''}` : `Iki ${inv.dueDate}`}</span>
                            </div>
                          </div>

                          {/* Amount */}
                          <div className="text-right flex-shrink-0">
                            <div className={`text-[18px] font-bold tabular-nums transition-colors ${inv.status === 'paid' ? 'text-emerald-600' : inv.status === 'cancelled' ? 'text-gray-400 line-through' : 'text-gray-900 group-hover:text-[#2F8481]'
                              }`}>{fmt(inv.amount)}</div>
                            {inv.invoiceNumber && (
                              <span className="text-[9px] text-gray-300 font-mono">{inv.invoiceNumber}</span>
                            )}
                          </div>

                          <ChevronDown className={`w-4 h-4 text-gray-300 flex-shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-[#2F8481]' : 'group-hover:text-gray-500'}`} />
                        </button>

                        {/* ── Expanded: Premium Invoice Document ── */}
                        {isOpen && (
                          <div className="border-t border-gray-100 overflow-hidden">
                            {/* Shimmer gradient accent bar */}
                            <div className="h-1 shimmer-accent" />

                            {/* Document header */}
                            <div className="px-6 pt-5 pb-4 bg-gradient-to-b from-[#f8fffe] to-transparent relative">
                              {/* Subtle diagonal pattern watermark */}
                              <div className="absolute inset-0 opacity-[0.02]" style={{
                                backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 15px, #2F8481 15px, #2F8481 16px)',
                              }} />

                              <div className="relative flex items-start justify-between mb-4">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#2F8481] to-[#3aa8a4] flex items-center justify-center shadow-sm">
                                      <Receipt className="w-3.5 h-3.5 text-white" />
                                    </div>
                                    <h3 className="text-[10px] font-bold text-[#2F8481] uppercase tracking-[0.15em]">Sąskaita–faktūra</h3>
                                  </div>
                                  <div className="text-[22px] font-bold text-gray-900 leading-tight">{inv.month}</div>
                                </div>
                                <div className="text-right flex flex-col items-end gap-2">
                                  {inv.invoiceNumber && (
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200/60">
                                      <span className="text-[9px] text-gray-400 uppercase tracking-wider">Nr.</span>
                                      <span className="text-[12px] font-bold text-gray-700 font-mono">{inv.invoiceNumber}</span>
                                    </div>
                                  )}
                                  {/* Status stamp */}
                                  <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${sc.textBg}`}>
                                    <StatusIcon className="w-3.5 h-3.5" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">{sc.label}</span>
                                  </div>
                                </div>
                              </div>

                              {/* 2-column meta */}
                              <div className="grid grid-cols-2 gap-x-8 gap-y-2 relative">
                                {[
                                  { k: 'Laikotarpis', v: inv.billingPeriod },
                                  { k: 'Mokėjimo terminas', v: inv.dueDate },
                                  { k: 'Adresas', v: `${inv.description}, ${inv.propertyAddress}` },
                                  ...(inv.paidDate ? [{ k: 'Apmokėjimo data', v: inv.paidDate }] : []),
                                ].filter(r => r.v).map((r, i) => (
                                  <div key={i} className="flex items-baseline justify-between py-1 border-b border-dashed border-gray-100">
                                    <span className="text-[10px] text-gray-400">{r.k}</span>
                                    <span className="text-[11px] font-medium text-gray-700 text-right ml-2 truncate max-w-[180px]">{r.v}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Proportion visualization */}
                            {inv.baseRent > 0 && (
                              <div className="px-6 pb-4">
                                <div className="flex items-center gap-5 mb-2">
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 rounded bg-gradient-to-r from-[#2F8481] to-[#3aa8a4]" />
                                    <span className="text-[10px] text-gray-500">Nuoma</span>
                                    <span className="text-[10px] font-bold text-gray-700">{fmt(inv.baseRent)}</span>
                                    <span className="text-[9px] text-gray-300 bg-gray-50 px-1 rounded">({rentPct}%)</span>
                                  </div>
                                  {utilAmt > 0.01 && (
                                    <div className="flex items-center gap-1.5">
                                      <div className="w-3 h-3 rounded bg-gradient-to-r from-amber-500 to-amber-400" />
                                      <span className="text-[10px] text-gray-500">Komunaliniai</span>
                                      <span className="text-[10px] font-bold text-gray-700">{fmt(utilAmt)}</span>
                                      <span className="text-[9px] text-gray-300 bg-gray-50 px-1 rounded">({100 - rentPct}%)</span>
                                    </div>
                                  )}
                                </div>
                                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden flex shadow-inner">
                                  <div className="h-full bg-gradient-to-r from-[#2F8481] to-[#3aa8a4] rounded-l-full transition-all duration-500" style={{ width: `${rentPct}%` }} />
                                  {utilAmt > 0.01 && (
                                    <div className="h-full bg-gradient-to-r from-amber-400 to-amber-300 rounded-r-full transition-all duration-500" style={{ width: `${100 - rentPct}%` }} />
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Line items table */}
                            {inv.lineItems && inv.lineItems.length > 0 && (
                              <div className="px-6 pb-2">
                                {/* Table header */}
                                <div className="flex items-center px-3 py-2 border-b-2 border-[#2F8481]/20 mb-0.5">
                                  <span className="flex-1 text-[9px] font-bold text-[#2F8481]/60 uppercase tracking-wider">Paslauga</span>
                                  <span className="w-36 text-[9px] font-bold text-[#2F8481]/60 uppercase tracking-wider text-right">Suvartojimas</span>
                                  <span className="w-24 text-[9px] font-bold text-[#2F8481]/60 uppercase tracking-wider text-right">Suma</span>
                                </div>
                                {inv.lineItems.map((li, liIdx) => {
                                  const { Icon, color, bg, glow } = getUtilityIcon(li.label || '');
                                  const isRent = (li.label || '').toLowerCase().includes('nuoma');
                                  return (
                                    <div
                                      key={liIdx}
                                      className={`flex items-center px-3 py-3 rounded-lg transition-all duration-200 ${liIdx % 2 === 0 ? 'bg-gray-50/60' : ''} hover:bg-[#E8F5F4]/40 hover:pl-4 group`}
                                    >
                                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                        <div className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm ${glow} group-hover:scale-110 transition-transform duration-200`}>
                                          <Icon className={`w-4 h-4 ${color}`} />
                                        </div>
                                        <span className="text-[12px] font-semibold text-gray-800 truncate">{li.label}</span>
                                      </div>
                                      <div className="w-36 text-right">
                                        {li.consumption != null && li.unit ? (
                                          <span className="text-[10px] text-gray-400">
                                            {li.consumption} {li.unit} × {li.tariff?.toFixed(4)} €
                                          </span>
                                        ) : (
                                          <span className="text-[10px] text-gray-300">—</span>
                                        )}
                                      </div>
                                      <span className={`w-24 text-right text-[13px] font-bold tabular-nums ${isRent ? 'text-[#2F8481]' : 'text-gray-800'}`}>
                                        {fmt(li.amount)}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Totals section — right aligned with accent */}
                            <div className="px-6 pb-5">
                              <div className="flex justify-end">
                                <div className="w-72 border-t-2 border-[#2F8481]/20 pt-3 space-y-2">
                                  <div className="flex justify-between items-center">
                                    <span className="text-[11px] text-gray-400">Nuoma</span>
                                    <span className="text-[12px] font-semibold text-gray-700 tabular-nums">{fmt(inv.baseRent)}</span>
                                  </div>
                                  {utilAmt > 0.01 && (
                                    <div className="flex justify-between items-center">
                                      <span className="text-[11px] text-gray-400">Komunaliniai</span>
                                      <span className="text-[12px] font-semibold text-gray-700 tabular-nums">{fmt(utilAmt)}</span>
                                    </div>
                                  )}
                                  {inv.lateFee > 0 && (
                                    <div className="flex justify-between items-center">
                                      <span className="text-[11px] text-red-500">Vėlavimo mokestis</span>
                                      <span className="text-[12px] font-semibold text-red-600 tabular-nums">+{fmt(inv.lateFee)}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between items-center pt-3 border-t-2 border-gray-200">
                                    <span className="text-[13px] font-bold text-gray-800 uppercase tracking-wide">Iš viso</span>
                                    <div className="flex items-baseline gap-1">
                                      <span className="text-[24px] font-bold bg-gradient-to-r from-[#2F8481] to-[#3aa8a4] bg-clip-text text-transparent tabular-nums">{fmt(inv.totalWithLateFee)}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Footer */}
                            <div className="px-6 py-3.5 bg-gradient-to-r from-gray-50/80 to-gray-50/40 border-t border-gray-100 flex items-center justify-between">
                              <span className="text-[9px] text-gray-300 font-mono uppercase tracking-wider">{inv.invoiceNumber} · Nuomoria</span>
                              <div className="flex gap-2">
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDownloadPDF(inv); }}
                                  className="flex items-center gap-1.5 px-4 py-2 text-[11px] font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm transition-all active:scale-[0.98]"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                  Spausdinti / PDF
                                </button>
                                {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handlePayment(inv.id); }}
                                    disabled={payingInvoiceId === inv.id}
                                    className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-[#2F8481] to-[#3aa8a4] text-white rounded-xl text-[11px] font-bold hover:from-[#267370] hover:to-[#2F8481] transition-all active:scale-[0.97] shadow-lg shadow-[#2F8481]/25 disabled:opacity-60 disabled:cursor-not-allowed"
                                  >
                                    {payingInvoiceId === inv.id ? (
                                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Nukreipiama...</>
                                    ) : (
                                      <><Euro className="w-3.5 h-3.5" /> Apmokėti</>
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TenantInvoices;