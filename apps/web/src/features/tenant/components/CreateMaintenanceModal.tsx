import React, { memo, useState, useCallback } from 'react';
import { X, Wrench, Droplets, Zap, Flame, Sparkles, Search, HardHat } from 'lucide-react';
import { maintenanceApi } from '../../../lib/maintenanceApi';
import { supabase } from '../../../lib/supabase';

interface CreateMaintenanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    propertyId: string;
    addressId?: string;
    landlordId?: string;
    onCreated?: () => void;
}

const CATEGORIES = [
    { value: 'plumbing', label: 'Vandentiekis', icon: Droplets },
    { value: 'electrical', label: 'Elektra', icon: Zap },
    { value: 'heating', label: 'Å ildymas', icon: Flame },
    { value: 'cleaning', label: 'Valymas', icon: Sparkles },
    { value: 'repair', label: 'Remontas', icon: Wrench },
    { value: 'inspection', label: 'Patikra', icon: Search },
    { value: 'general', label: 'Kita', icon: HardHat },
] as const;

const PRIORITIES = [
    { value: 'low', label: 'Å½ema', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    { value: 'medium', label: 'VidutinÄ—', color: 'bg-amber-100 text-amber-700 border-amber-200' },
    { value: 'high', label: 'AukÅ¡ta', color: 'bg-orange-100 text-orange-700 border-orange-200' },
    { value: 'urgent', label: 'Skubu', color: 'bg-red-100 text-red-700 border-red-200' },
] as const;

export const CreateMaintenanceModal = memo<CreateMaintenanceModalProps>(({
    isOpen,
    onClose,
    propertyId,
    addressId,
    landlordId,
    onCreated,
}) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('general');
    const [priority, setPriority] = useState('medium');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const resetForm = useCallback(() => {
        setTitle('');
        setDescription('');
        setCategory('general');
        setPriority('medium');
        setError(null);
    }, []);

    const handleSubmit = useCallback(async () => {
        if (!title.trim()) {
            setError('Ä®veskite pavadinimÄ…');
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            await maintenanceApi.create({
                property_id: propertyId,
                address_id: addressId,
                title: title.trim(),
                description: description.trim() || undefined,
                category,
                priority,
                requester_role: 'tenant',
            });

            // Send notification to landlord
            if (landlordId) {
                try {
                    await supabase.from('notifications').insert({
                        user_id: landlordId,
                        kind: 'maintenance_request',
                        title: 'Nauja remonto uÅ¾klausa',
                        body: `Nuomininkas pateikÄ— uÅ¾klausÄ…: "${title.trim()}"`,
                        metadata: { property_id: propertyId, category, priority },
                    });
                } catch {
                    // Non-critical
                }
            }

            resetForm();
            onCreated?.();
            onClose();
        } catch (err: any) {
            if (import.meta.env.DEV) console.error('Error creating maintenance request:', err);
            setError(err.message || 'Nepavyko sukurti uÅ¾klausos');
        } finally {
            setIsSaving(false);
        }
    }, [title, description, category, priority, propertyId, addressId, landlordId, resetForm, onCreated, onClose]);

    const handleClose = useCallback(() => {
        resetForm();
        onClose();
    }, [resetForm, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center">
                            <Wrench className="w-4.5 h-4.5 text-teal-600" />
                        </div>
                        <div>
                            <h2 className="text-[15px] font-bold text-gray-900">Nauja remonto uÅ¾klausa</h2>
                            <p className="text-[11px] text-gray-500">ApraÅ¡ykite problemÄ…</p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-4 h-4 text-gray-400" />
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-5">
                    {/* Title */}
                    <div>
                        <label className="text-[11px] font-medium text-gray-500 mb-1.5 block">Pavadinimas *</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Pvz.: Vandens Äiaupo gedimas"
                            className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition-all outline-none"
                            autoFocus
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="text-[11px] font-medium text-gray-500 mb-1.5 block">ApraÅ¡ymas</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="ApibÅ«dinkite problemÄ… detaliau..."
                            rows={3}
                            className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition-all outline-none resize-none"
                        />
                    </div>

                    {/* Category */}
                    <div>
                        <label className="text-[11px] font-medium text-gray-500 mb-2 block">Kategorija</label>
                        <div className="grid grid-cols-4 gap-2">
                            {CATEGORIES.map(cat => {
                                const Icon = cat.icon;
                                const isSelected = category === cat.value;
                                return (
                                    <button
                                        key={cat.value}
                                        onClick={() => setCategory(cat.value)}
                                        className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all text-center ${
                                            isSelected
                                                ? 'bg-teal-50 border-teal-300 text-teal-700'
                                                : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                                        }`}
                                    >
                                        <Icon className="w-4 h-4" />
                                        <span className="text-[10px] font-medium leading-tight">{cat.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Priority */}
                    <div>
                        <label className="text-[11px] font-medium text-gray-500 mb-2 block">Skubumas</label>
                        <div className="flex gap-2">
                            {PRIORITIES.map(p => (
                                <button
                                    key={p.value}
                                    onClick={() => setPriority(p.value)}
                                    className={`flex-1 py-2 rounded-xl border text-[11px] font-medium transition-all ${
                                        priority === p.value
                                            ? p.color + ' ring-1 ring-offset-1'
                                            : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100'
                                    }`}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-[12px] text-red-600">
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
                    <button
                        onClick={handleClose}
                        className="px-4 py-2 text-[12px] font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        AtÅ¡aukti
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSaving || !title.trim()}
                        className="px-5 py-2 bg-teal-500 text-white text-[12px] font-bold rounded-lg hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                    >
                        {isSaving ? 'SiunÄiama...' : 'Pateikti uÅ¾klausÄ…'}
                    </button>
                </div>
            </div>
        </div>
    );
});
CreateMaintenanceModal.displayName = 'CreateMaintenanceModal';
