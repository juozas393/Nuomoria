import React, { useState, useMemo, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import { X, FileText, Plus, Trash2, Calendar, Send, Save, Zap, Droplets, Flame, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

interface LineItem {
    id: string;
    label: string;
    amount: number;
    type: 'rent' | 'utility' | 'other';
    editable: boolean;
    consumption?: number;
    unit?: string;
    tariff?: number;
}

interface InvoiceGeneratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    propertyId: string;
    addressId?: string;
    apartmentNumber: string;
    tenantName: string;
    rent: number;
    paymentDueDay?: number;
    meters: {
        id: string;
        name: string;
        category: 'elektra' | 'vanduo' | 'sildymas' | 'dujos';
        consumption: number | null;
        cost: number | null;
        unit: string;
        tariff?: number | null;
    }[];
    year: number;
    month: number;
    onInvoiceCreated?: () => void;
}

// ════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════════════════

const MONTHS_LT = ['Sausis', 'Vasaris', 'Kovas', 'Balandis', 'Gegužė', 'Birželis', 'Liepa', 'Rugpjūtis', 'Rugsėjis', 'Spalis', 'Lapkritis', 'Gruodis'];

const CATEGORY_ICONS: Record<string, React.ElementType> = {
    elektra: Zap,
    vanduo: Droplets,
    sildymas: Flame,
    dujos: Flame,
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    elektra: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100' },
    vanduo: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' },
    sildymas: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-100' },
    dujos: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100' },
};

let nextId = 0;
const uid = () => `line_${++nextId}_${Date.now()}`;

// ════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ════════════════════════════════════════════════════════════════════════════

export const InvoiceGeneratorModal = memo<InvoiceGeneratorModalProps>(({
    isOpen,
    onClose,
    propertyId,
    addressId,
    apartmentNumber,
    tenantName,
    rent,
    paymentDueDay = 15,
    meters,
    year,
    month,
    onInvoiceCreated,
}) => {
    const initialLines = useMemo<LineItem[]>(() => {
        const lines: LineItem[] = [];
        lines.push({ id: uid(), label: 'Nuoma', amount: rent || 0, type: 'rent', editable: true });
        meters.forEach(m => {
            if (m.cost !== null && m.cost !== undefined && m.cost > 0) {
                const desc = m.consumption
                    ? `${m.name} (${m.consumption} ${m.unit} × ${m.tariff ?? 0} €/${m.unit})`
                    : m.name;
                lines.push({
                    id: uid(), label: desc, amount: Number(m.cost.toFixed(2)), type: 'utility',
                    editable: true, consumption: m.consumption ?? undefined, unit: m.unit, tariff: m.tariff ?? undefined,
                });
            }
        });
        return lines;
    }, [rent, meters]);

    const [lineItems, setLineItems] = useState<LineItem[]>(initialLines);
    const [notes, setNotes] = useState('');
    const [dueDate, setDueDate] = useState(() => {
        const d = new Date(year, month + 1, paymentDueDay);
        return d.toISOString().split('T')[0];
    });
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [existingInvoice, setExistingInvoice] = useState<{ invoice_number: string; amount: number; status: string; created_at: string } | null>(null);

    React.useEffect(() => {
        if (isOpen) {
            setLineItems(initialLines);
            setNotes('');
            setSaveSuccess(false);
            setError(null);
            setExistingInvoice(null);

            // Check for existing invoice for this property+period
            const periodStart = new Date(year, month, 1).toISOString().split('T')[0];
            const periodEnd = new Date(year, month + 1, 0).toISOString().split('T')[0];
            supabase
                .from('invoices')
                .select('invoice_number, amount, status, created_at')
                .eq('property_id', propertyId)
                .gte('period_start', periodStart)
                .lte('period_end', periodEnd)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle()
                .then(({ data }) => {
                    if (data) setExistingInvoice(data as any);
                });

            // Fetch fresh paymentDay from address_settings
            if (addressId) {
                supabase
                    .from('address_settings')
                    .select('financial_settings')
                    .eq('address_id', addressId)
                    .maybeSingle()
                    .then(({ data }) => {
                        const day = data?.financial_settings?.paymentDay;
                        const effectiveDay = (day && day >= 1 && day <= 28) ? day : paymentDueDay;
                        setDueDate(new Date(year, month + 1, effectiveDay).toISOString().split('T')[0]);
                    });
            } else {
                setDueDate(new Date(year, month + 1, paymentDueDay).toISOString().split('T')[0]);
            }
        }
    }, [isOpen, initialLines, year, month, addressId, paymentDueDay, propertyId]);

    const totals = useMemo(() => {
        const rentTotal = lineItems.filter(l => l.type === 'rent').reduce((s, l) => s + l.amount, 0);
        const utilTotal = lineItems.filter(l => l.type === 'utility').reduce((s, l) => s + l.amount, 0);
        const otherTotal = lineItems.filter(l => l.type === 'other').reduce((s, l) => s + l.amount, 0);
        return { rent: rentTotal, utilities: utilTotal, other: otherTotal, total: rentTotal + utilTotal + otherTotal };
    }, [lineItems]);

    const updateLineAmount = useCallback((id: string, amount: number) => {
        setLineItems(prev => prev.map(l => l.id === id ? { ...l, amount } : l));
    }, []);

    const removeLine = useCallback((id: string) => {
        setLineItems(prev => prev.filter(l => l.id !== id));
    }, []);

    const addCustomLine = useCallback(() => {
        setLineItems(prev => [...prev, { id: uid(), label: '', amount: 0, type: 'other', editable: true }]);
    }, []);

    const updateLineLabel = useCallback((id: string, label: string) => {
        setLineItems(prev => prev.map(l => l.id === id ? { ...l, label } : l));
    }, []);

    const generateInvoiceNumber = useCallback(() => {
        const prefix = `NUO-${year}${String(month + 1).padStart(2, '0')}`;
        const now = new Date();
        const seq = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
        return `${prefix}-${seq}`;
    }, [year, month]);

    const handleSave = useCallback(async (asDraft: boolean) => {
        setIsSaving(true);
        setError(null);
        try {
            const invoiceNumber = generateInvoiceNumber();
            const { data: authData } = await supabase.auth.getUser();
            const userId = authData?.user?.id;

            let tenantId: string | null = null;
            const { data: invitation } = await supabase
                .from('tenant_invitations')
                .select('email')
                .eq('property_id', propertyId)
                .eq('status', 'accepted')
                .order('responded_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (invitation?.email) {
                const { data: userRow } = await supabase
                    .from('users')
                    .select('id')
                    .ilike('email', invitation.email)
                    .maybeSingle();
                tenantId = userRow?.id ?? null;
            }

            const periodStart = new Date(year, month, 1).toISOString().split('T')[0];
            const periodEnd = new Date(year, month + 1, 0).toISOString().split('T')[0];
            const lineItemsJson = lineItems.map(l => ({
                label: l.label, amount: l.amount, type: l.type,
                ...(l.consumption !== undefined ? { consumption: l.consumption, unit: l.unit, tariff: l.tariff } : {}),
            }));

            const invoiceData = {
                property_id: propertyId, address_id: addressId || null, tenant_id: tenantId,
                invoice_number: invoiceNumber, invoice_date: new Date().toISOString().split('T')[0],
                due_date: dueDate, amount: totals.total, rent_amount: totals.rent,
                utilities_amount: totals.utilities, other_amount: totals.other,
                status: asDraft ? 'unpaid' : 'unpaid', notes: notes || null,
                period_start: periodStart, period_end: periodEnd,
                line_items: lineItemsJson, created_by: userId || null,
            };

            const { error: insertError } = await supabase.from('invoices').insert(invoiceData);
            if (insertError) { setError(`Klaida: ${insertError.message}`); return; }

            try {
                await supabase.from('audit_log').insert({
                    user_id: userId, user_email: authData?.user?.email,
                    action: 'INSERT', table_name: 'invoices', record_id: propertyId,
                    description: `Sukurta sąskaita ${invoiceNumber} — ${totals.total.toFixed(2)} € (Butas ${apartmentNumber})`,
                    new_data: invoiceData,
                });
            } catch { /* non-blocking */ }

            setSaveSuccess(true);
            onInvoiceCreated?.();
            setTimeout(() => onClose(), 1500);
        } catch (err) {
            if (import.meta.env.DEV) console.error('[InvoiceGenerator] Error:', err);
            setError('Klaida kuriant sąskaitą');
        } finally {
            setIsSaving(false);
        }
    }, [generateInvoiceNumber, propertyId, addressId, dueDate, totals, notes, lineItems, year, month, apartmentNumber, onClose, onInvoiceCreated]);

    const fmtCurrency = (v: number) => new Intl.NumberFormat('lt-LT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(v);

    if (!isOpen) return null;

    const rentLines = lineItems.filter(l => l.type === 'rent');
    const utilityLines = lineItems.filter(l => l.type === 'utility');
    const otherLines = lineItems.filter(l => l.type === 'other');

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center" onClick={onClose}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div
                className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] flex flex-col overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* ── Header ── */}
                <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-teal-50 to-cyan-50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
                                <FileText className="w-5 h-5 text-teal-600" />
                            </div>
                            <div>
                                <h2 className="text-[15px] font-bold text-gray-900">Nauja sąskaita</h2>
                                <p className="text-[11px] text-gray-500">
                                    {tenantName} • {MONTHS_LT[month]} {year}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* ── Body (scrollable) ── */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">

                    {/* Existing invoice warning */}
                    {existingInvoice && (
                        <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
                            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                                <p className="text-[12px] font-semibold text-amber-800">
                                    Sąskaita už šį laikotarpį jau egzistuoja
                                </p>
                                <p className="text-[11px] text-amber-600 mt-0.5">
                                    {existingInvoice.invoice_number} — {fmtCurrency(existingInvoice.amount)} · {existingInvoice.status === 'paid' ? 'Apmokėta' : existingInvoice.status === 'unpaid' ? 'Neapmokėta' : existingInvoice.status}
                                </p>
                                <p className="text-[10px] text-amber-500 mt-1">
                                    Jei tęsite, bus sukurta papildoma / korekcinė sąskaita.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* RENT SECTION */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-5 h-5 rounded-md bg-teal-100 flex items-center justify-center">
                                <FileText className="w-3 h-3 text-teal-600" />
                            </div>
                            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Nuoma</span>
                        </div>
                        {rentLines.map(line => (
                            <div key={line.id} className="flex items-center justify-between py-2.5 px-3 bg-gray-50 rounded-xl">
                                <span className="text-[13px] font-medium text-gray-700">Mėnesio nuoma</span>
                                <div className="flex items-center gap-1.5">
                                    <input
                                        type="number" step="0.01" value={line.amount || ''}
                                        onChange={(e) => updateLineAmount(line.id, parseFloat(e.target.value) || 0)}
                                        className="w-20 px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-[13px] text-gray-900 text-right tabular-nums focus:ring-2 focus:ring-teal-500/30 focus:border-teal-300 transition-all"
                                    />
                                    <span className="text-[11px] text-gray-400 font-medium">€</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* UTILITIES SECTION */}
                    {utilityLines.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-5 h-5 rounded-md bg-amber-100 flex items-center justify-center">
                                    <Zap className="w-3 h-3 text-amber-600" />
                                </div>
                                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Komunaliniai</span>
                            </div>
                            <div className="bg-gray-50 rounded-xl divide-y divide-gray-100 overflow-hidden">
                                {utilityLines.map(line => {
                                    const meterMatch = meters.find(m => line.label.includes(m.name));
                                    const cat = meterMatch?.category ?? 'elektra';
                                    const Icon = CATEGORY_ICONS[cat] || Zap;
                                    const colors = CATEGORY_COLORS[cat] || CATEGORY_COLORS.elektra;
                                    return (
                                        <div key={line.id} className="flex items-center gap-3 px-3 py-2.5">
                                            <div className={`w-7 h-7 rounded-lg ${colors.bg} flex items-center justify-center flex-shrink-0`}>
                                                <Icon className={`w-3.5 h-3.5 ${colors.text}`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-[12px] font-medium text-gray-700 truncate">{meterMatch?.name || line.label}</div>
                                                {line.consumption !== undefined && (
                                                    <div className="text-[10px] text-gray-400">
                                                        {line.consumption} {line.unit} × {line.tariff ?? 0} €/{line.unit}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                                <input
                                                    type="number" step="0.01" value={line.amount || ''}
                                                    onChange={(e) => updateLineAmount(line.id, parseFloat(e.target.value) || 0)}
                                                    className="w-20 px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-[13px] text-gray-900 text-right tabular-nums focus:ring-2 focus:ring-teal-500/30 focus:border-teal-300 transition-all"
                                                />
                                                <span className="text-[11px] text-gray-400 font-medium">€</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* OTHER / CUSTOM LINES */}
                    {otherLines.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-5 h-5 rounded-md bg-gray-100 flex items-center justify-center">
                                    <Plus className="w-3 h-3 text-gray-500" />
                                </div>
                                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Kiti mokesčiai</span>
                            </div>
                            <div className="bg-gray-50 rounded-xl divide-y divide-gray-100 overflow-hidden">
                                {otherLines.map(line => (
                                    <div key={line.id} className="flex items-center gap-3 px-3 py-2.5">
                                        <div className="flex-1 min-w-0">
                                            <input
                                                type="text" placeholder="Eilutės pavadinimas..."
                                                value={line.label}
                                                onChange={(e) => updateLineLabel(line.id, e.target.value)}
                                                className="bg-transparent text-[12px] text-gray-700 placeholder-gray-400 border-none outline-none w-full"
                                                autoFocus
                                            />
                                        </div>
                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                            <input
                                                type="number" step="0.01" value={line.amount || ''}
                                                onChange={(e) => updateLineAmount(line.id, parseFloat(e.target.value) || 0)}
                                                className="w-20 px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-[13px] text-gray-900 text-right tabular-nums focus:ring-2 focus:ring-teal-500/30 focus:border-teal-300 transition-all"
                                            />
                                            <span className="text-[11px] text-gray-400 font-medium">€</span>
                                            <button
                                                onClick={() => removeLine(line.id)}
                                                className="w-6 h-6 rounded-md hover:bg-red-50 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Add custom line */}
                    <button
                        onClick={addCustomLine}
                        className="w-full py-2 text-[11px] text-teal-600 hover:text-teal-700 hover:bg-teal-50 rounded-xl flex items-center justify-center gap-1.5 font-semibold transition-colors border border-dashed border-teal-200 hover:border-teal-300"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Pridėti eilutę
                    </button>

                    {/* Due Date & Notes Row */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] font-medium text-gray-400 mb-1 block">Mokėjimo terminas</label>
                            <div className="relative">
                                <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                <input
                                    type="date" value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                    className="w-full pl-8 pr-2 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[12px] text-gray-700 focus:ring-2 focus:ring-teal-500/30 focus:border-teal-300 transition-all"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-medium text-gray-400 mb-1 block">Pastabos</label>
                            <input
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Neprivaloma..."
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[12px] text-gray-700 placeholder-gray-400 focus:ring-2 focus:ring-teal-500/30 focus:border-teal-300 transition-all"
                            />
                        </div>
                    </div>

                    {/* Error / Success */}
                    {error && (
                        <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-100 rounded-xl">
                            <AlertCircle className="w-4 h-4 text-red-500" />
                            <span className="text-[11px] text-red-600 font-medium">{error}</span>
                        </div>
                    )}
                    {saveSuccess && (
                        <div className="flex items-center gap-2 px-3 py-2.5 bg-emerald-50 border border-emerald-100 rounded-xl">
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                            <span className="text-[11px] text-emerald-600 font-medium">Sąskaita sukurta sėkmingai!</span>
                        </div>
                    )}
                </div>

                {/* ── Totals Summary (sticky) ── */}
                <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/80">
                    <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                            <span className="text-gray-400">Nuoma</span>
                            <span className="text-gray-600 tabular-nums font-medium">{fmtCurrency(totals.rent)}</span>
                        </div>
                        {totals.utilities > 0 && (
                            <div className="flex justify-between text-[11px]">
                                <span className="text-gray-400">Komunalinės</span>
                                <span className="text-gray-600 tabular-nums font-medium">{fmtCurrency(totals.utilities)}</span>
                            </div>
                        )}
                        {totals.other > 0 && (
                            <div className="flex justify-between text-[11px]">
                                <span className="text-gray-400">Kiti</span>
                                <span className="text-gray-600 tabular-nums font-medium">{fmtCurrency(totals.other)}</span>
                            </div>
                        )}
                        <div className="border-t border-gray-200 pt-2 flex justify-between items-baseline">
                            <span className="text-[13px] font-bold text-gray-900">Bendra suma</span>
                            <span className="text-[18px] font-bold text-teal-600 tabular-nums">{fmtCurrency(totals.total)}</span>
                        </div>
                    </div>
                </div>

                {/* ── Footer Actions ── */}
                <div className="flex items-center gap-2 px-5 py-3 border-t border-gray-100 bg-white">
                    <button
                        onClick={onClose}
                        disabled={isSaving}
                        className="px-4 py-2.5 text-[12px] font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
                    >
                        Atšaukti
                    </button>
                    <div className="flex-1" />
                    <button
                        onClick={() => handleSave(true)}
                        disabled={isSaving || saveSuccess || totals.total <= 0}
                        className="px-4 py-2.5 text-[12px] font-semibold text-teal-600 border border-teal-200 rounded-xl hover:bg-teal-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                    >
                        {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        Išsaugoti
                    </button>
                    <button
                        onClick={() => handleSave(false)}
                        disabled={isSaving || saveSuccess || totals.total <= 0}
                        className="px-4 py-2.5 text-[12px] font-bold text-white bg-teal-500 rounded-xl hover:bg-teal-600 transition-colors active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-sm"
                    >
                        {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        Siųsti sąskaitą
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
});
InvoiceGeneratorModal.displayName = 'InvoiceGeneratorModal';

export default InvoiceGeneratorModal;
