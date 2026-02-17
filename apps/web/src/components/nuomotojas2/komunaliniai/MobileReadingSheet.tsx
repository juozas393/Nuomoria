import React, { useState, useCallback, useRef, useEffect } from 'react';
import { X, Camera, History, AlertCircle, Zap, Droplets, Flame, Check } from 'lucide-react';
import { MeterData } from './MeterTableRow';

// =============================================================================
// TYPES
// =============================================================================

interface MobileReadingSheetProps {
    isOpen: boolean;
    onClose: () => void;
    meter: MeterData | null;
    draftValue: string;
    onValueChange: (value: string) => void;
    hasError: boolean;
    errorMessage?: string;
    onSave: () => Promise<void>;
    onPhotoUpload?: () => void;
    onViewHistory?: () => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const CATEGORY_ICONS = {
    elektra: Zap,
    vanduo: Droplets,
    sildymas: Flame,
    dujos: Flame,
};

const CATEGORY_COLORS = {
    elektra: 'text-yellow-600 bg-yellow-100',
    vanduo: 'text-blue-600 bg-blue-100',
    sildymas: 'text-orange-600 bg-orange-100',
    dujos: 'text-purple-600 bg-purple-100',
};

// =============================================================================
// COMPONENT
// =============================================================================

export const MobileReadingSheet: React.FC<MobileReadingSheetProps> = ({
    isOpen,
    onClose,
    meter,
    draftValue,
    onValueChange,
    hasError,
    errorMessage,
    onSave,
    onPhotoUpload,
    onViewHistory,
}) => {
    const [isSaving, setIsSaving] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const CategoryIcon = meter ? CATEGORY_ICONS[meter.category] : Zap;

    const handleSave = useCallback(async () => {
        if (hasError) return;
        setIsSaving(true);
        try {
            await onSave();
            onClose();
        } catch (error) {
            console.error('Failed to save:', error);
        } finally {
            setIsSaving(false);
        }
    }, [hasError, onSave, onClose]);

    // Focus input when sheet opens
    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [isOpen]);

    if (!isOpen || !meter) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-50 bg-black/50 transition-opacity"
                onClick={onClose}
            />

            {/* Bottom Sheet */}
            <div
                className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-xl transform transition-transform"
                style={{ maxHeight: '85vh' }}
            >
                {/* Drag handle */}
                <div className="flex justify-center pt-3 pb-2">
                    <div className="w-10 h-1 bg-gray-300 rounded-full" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-4 pb-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${CATEGORY_COLORS[meter.category]}`}>
                            <CategoryIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="font-semibold text-gray-900">{meter.name}</h2>
                            <p className="text-sm text-gray-500">{meter.unitLabel || meter.unit}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-6">
                    {/* Previous reading */}
                    <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">
                            Ankstesnis rodmuo
                        </label>
                        <div className="text-2xl font-bold text-gray-700">
                            {meter.previousReading !== null
                                ? `${meter.previousReading.toLocaleString('lt-LT')} ${meter.unit}`
                                : '—'}
                        </div>
                    </div>

                    {/* Current reading input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Dabartinis rodmuo
                        </label>
                        <div className="relative">
                            <input
                                ref={inputRef}
                                type="number"
                                inputMode="decimal"
                                value={draftValue}
                                onChange={(e) => onValueChange(e.target.value)}
                                placeholder="Įveskite rodmenį..."
                                className={`w-full px-4 py-4 text-xl font-semibold border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 ${hasError
                                        ? 'border-red-300 bg-red-50 text-red-900'
                                        : 'border-gray-200 text-gray-900'
                                    }`}
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
                                {meter.unit}
                            </span>
                        </div>
                        {hasError && (
                            <div className="flex items-center gap-1.5 mt-2 text-sm text-red-600">
                                <AlertCircle className="w-4 h-4" />
                                {errorMessage}
                            </div>
                        )}
                    </div>

                    {/* Calculated consumption */}
                    {draftValue && !isNaN(parseFloat(draftValue)) && meter.previousReading !== null && (
                        <div className="p-4 bg-teal-50 rounded-xl">
                            <p className="text-sm text-teal-700 mb-1">Suvartojimas</p>
                            <p className="text-2xl font-bold text-teal-800">
                                {(parseFloat(draftValue) - meter.previousReading).toLocaleString('lt-LT')} {meter.unit}
                            </p>
                            {meter.tariff && (
                                <p className="text-sm text-teal-600 mt-1">
                                    ≈ {((parseFloat(draftValue) - meter.previousReading) * meter.tariff).toFixed(2)} €
                                </p>
                            )}
                        </div>
                    )}

                    {/* Quick actions */}
                    <div className="flex gap-3">
                        {meter.photoRequired && (
                            <button
                                onClick={onPhotoUpload}
                                className="flex-1 flex items-center justify-center gap-2 py-3 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50"
                            >
                                <Camera className="w-5 h-5" />
                                Nuotrauka
                            </button>
                        )}
                        <button
                            onClick={onViewHistory}
                            className="flex-1 flex items-center justify-center gap-2 py-3 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50"
                        >
                            <History className="w-5 h-5" />
                            Istorija
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 bg-gray-50 safe-area-inset-bottom">
                    <button
                        onClick={handleSave}
                        disabled={!draftValue || hasError || isSaving}
                        className="w-full flex items-center justify-center gap-2 py-4 bg-teal-600 text-white font-semibold rounded-xl hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? (
                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <Check className="w-5 h-5" />
                                Išsaugoti
                            </>
                        )}
                    </button>
                </div>
            </div>
        </>
    );
};

export default MobileReadingSheet;
