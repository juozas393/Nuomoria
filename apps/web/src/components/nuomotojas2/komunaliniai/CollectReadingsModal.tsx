import React, { useState, useCallback, useMemo } from 'react';
import { X, Send, Check, User, Building2, AlertCircle } from 'lucide-react';
import { MeterData } from './MeterTableRow';

// =============================================================================
// TYPES
// =============================================================================

interface CollectReadingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    meters: MeterData[];
    onSendRequests: (meterIds: string[], method: 'notify' | 'manual') => Promise<void>;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const CollectReadingsModal: React.FC<CollectReadingsModalProps> = ({
    isOpen,
    onClose,
    meters,
    onSendRequests,
}) => {
    const [selectedMeterIds, setSelectedMeterIds] = useState<Set<string>>(new Set());
    const [method, setMethod] = useState<'notify' | 'manual'>('notify');
    const [isSending, setIsSending] = useState(false);
    const [step, setStep] = useState<'select' | 'confirm' | 'sent'>('select');

    // Filter to only meters missing readings
    const missingMeters = useMemo(() => {
        return meters.filter(m => m.status === 'missing');
    }, [meters]);

    // Group meters by scope
    const { individual, communal } = useMemo(() => {
        return {
            individual: missingMeters.filter(m => m.scope === 'individual'),
            communal: missingMeters.filter(m => m.scope === 'communal'),
        };
    }, [missingMeters]);

    const handleToggleMeter = useCallback((meterId: string) => {
        setSelectedMeterIds(prev => {
            const next = new Set(prev);
            if (next.has(meterId)) {
                next.delete(meterId);
            } else {
                next.add(meterId);
            }
            return next;
        });
    }, []);

    const handleSelectAll = useCallback(() => {
        setSelectedMeterIds(new Set(missingMeters.map(m => m.id)));
    }, [missingMeters]);

    const handleDeselectAll = useCallback(() => {
        setSelectedMeterIds(new Set());
    }, []);

    const handleContinue = useCallback(() => {
        if (step === 'select' && selectedMeterIds.size > 0) {
            setStep('confirm');
        }
    }, [step, selectedMeterIds.size]);

    const handleBack = useCallback(() => {
        if (step === 'confirm') {
            setStep('select');
        }
    }, [step]);

    const handleSend = useCallback(async () => {
        setIsSending(true);
        try {
            await onSendRequests(Array.from(selectedMeterIds), method);
            setStep('sent');
        } catch (error) {
            console.error('Failed to send requests:', error);
        } finally {
            setIsSending(false);
        }
    }, [selectedMeterIds, method, onSendRequests]);

    const handleClose = useCallback(() => {
        setSelectedMeterIds(new Set());
        setMethod('notify');
        setStep('select');
        onClose();
    }, [onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">
                        {step === 'select' && 'Surinkti rodmenis'}
                        {step === 'confirm' && 'Patvirtinkite užklausą'}
                        {step === 'sent' && 'Užklausos išsiųstos'}
                    </h2>
                    <button
                        onClick={handleClose}
                        className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {step === 'select' && (
                        <>
                            {/* Empty state */}
                            {missingMeters.length === 0 ? (
                                <div className="text-center py-8">
                                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Check className="w-6 h-6 text-green-600" />
                                    </div>
                                    <p className="text-gray-900 font-medium">Visi rodmenys pateikti!</p>
                                    <p className="text-sm text-gray-500 mt-1">Nėra skaitiklių, kuriems trūksta rodmenų</p>
                                </div>
                            ) : (
                                <>
                                    {/* Select all/none */}
                                    <div className="flex items-center justify-between mb-4">
                                        <p className="text-sm text-gray-600">
                                            Pasirinkite skaitiklius ({selectedMeterIds.size}/{missingMeters.length})
                                        </p>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={handleSelectAll}
                                                className="text-xs text-teal-600 hover:text-teal-700 font-medium"
                                            >
                                                Pasirinkti visus
                                            </button>
                                            <span className="text-gray-300">|</span>
                                            <button
                                                onClick={handleDeselectAll}
                                                className="text-xs text-gray-500 hover:text-gray-700"
                                            >
                                                Atžymėti
                                            </button>
                                        </div>
                                    </div>

                                    {/* Individual meters */}
                                    {individual.length > 0 && (
                                        <div className="mb-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <User className="w-4 h-4 text-gray-400" />
                                                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Individualūs ({individual.length})
                                                </span>
                                            </div>
                                            <div className="space-y-1">
                                                {individual.map(meter => (
                                                    <label
                                                        key={meter.id}
                                                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedMeterIds.has(meter.id)}
                                                            onChange={() => handleToggleMeter(meter.id)}
                                                            className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                                        />
                                                        <span className="text-sm text-gray-700">{meter.name}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Communal meters */}
                                    {communal.length > 0 && (
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <Building2 className="w-4 h-4 text-gray-400" />
                                                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Bendri ({communal.length})
                                                </span>
                                            </div>
                                            <div className="space-y-1">
                                                {communal.map(meter => (
                                                    <label
                                                        key={meter.id}
                                                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedMeterIds.has(meter.id)}
                                                            onChange={() => handleToggleMeter(meter.id)}
                                                            className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                                        />
                                                        <span className="text-sm text-gray-700">{meter.name}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    )}

                    {step === 'confirm' && (
                        <>
                            <div className="mb-6">
                                <p className="text-sm text-gray-600 mb-4">
                                    Pasirinkta <strong>{selectedMeterIds.size}</strong> skaitiklių. Kaip norite surinkti rodmenis?
                                </p>

                                {/* Method selection */}
                                <div className="space-y-3">
                                    <label
                                        className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${method === 'notify'
                                                ? 'border-teal-500 bg-teal-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <input
                                            type="radio"
                                            name="method"
                                            value="notify"
                                            checked={method === 'notify'}
                                            onChange={() => setMethod('notify')}
                                            className="mt-1 w-4 h-4 text-teal-600 focus:ring-teal-500"
                                        />
                                        <div>
                                            <p className="font-medium text-gray-900">Pranešti nuomininkams</p>
                                            <p className="text-sm text-gray-500 mt-1">
                                                Nuomininkai gaus pranešimą ir galės patys pateikti rodmenis
                                            </p>
                                        </div>
                                    </label>

                                    <label
                                        className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${method === 'manual'
                                                ? 'border-teal-500 bg-teal-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <input
                                            type="radio"
                                            name="method"
                                            value="manual"
                                            checked={method === 'manual'}
                                            onChange={() => setMethod('manual')}
                                            className="mt-1 w-4 h-4 text-teal-600 focus:ring-teal-500"
                                        />
                                        <div>
                                            <p className="font-medium text-gray-900">Įvesti pačiam</p>
                                            <p className="text-sm text-gray-500 mt-1">
                                                Pasirinkti skaitikliai bus pažymėti – įvesite rodmenis lentelėje
                                            </p>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </>
                    )}

                    {step === 'sent' && (
                        <div className="text-center py-8">
                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                <Send className="w-6 h-6 text-green-600" />
                            </div>
                            <p className="text-gray-900 font-medium">
                                {method === 'notify' ? 'Pranešimai išsiųsti!' : 'Skaitikliai pažymėti!'}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                                {method === 'notify'
                                    ? `Išsiųsta ${selectedMeterIds.size} nuomininkams`
                                    : 'Galite įvesti rodmenis lentelėje'
                                }
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
                    {step === 'select' && (
                        <>
                            <button
                                onClick={handleClose}
                                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
                            >
                                Atšaukti
                            </button>
                            <button
                                onClick={handleContinue}
                                disabled={selectedMeterIds.size === 0}
                                className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Tęsti
                            </button>
                        </>
                    )}

                    {step === 'confirm' && (
                        <>
                            <button
                                onClick={handleBack}
                                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
                            >
                                ← Atgal
                            </button>
                            <button
                                onClick={handleSend}
                                disabled={isSending}
                                className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50"
                            >
                                {isSending ? (
                                    <>
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Siunčiama...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        {method === 'notify' ? 'Siųsti pranešimus' : 'Pažymėti'}
                                    </>
                                )}
                            </button>
                        </>
                    )}

                    {step === 'sent' && (
                        <button
                            onClick={handleClose}
                            className="w-full px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700"
                        >
                            Uždaryti
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CollectReadingsModal;
