import React, { useState, useEffect } from 'react';
import { Save, X, AlertCircle, Loader2 } from 'lucide-react';

interface BulkActionBarProps {
    dirtyCount: number;
    hasErrors: boolean;
    errorCount: number;
    onSave: () => void;
    onDiscard: () => void;
    isSaving?: boolean;
}

export const BulkActionBar: React.FC<BulkActionBarProps> = ({
    dirtyCount, hasErrors, errorCount, onSave, onDiscard, isSaving = false,
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [shouldRender, setShouldRender] = useState(false);

    useEffect(() => {
        if (dirtyCount > 0) {
            setShouldRender(true);
            requestAnimationFrame(() => requestAnimationFrame(() => setIsVisible(true)));
        } else {
            setIsVisible(false);
            const timer = setTimeout(() => setShouldRender(false), 300);
            return () => clearTimeout(timer);
        }
    }, [dirtyCount]);

    if (!shouldRender) return null;

    return (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-colors duration-300 ${isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-8 opacity-0 scale-95'}`}>
            <div className="flex items-center gap-6 px-6 py-4 rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-200 shadow-2xl">
                <div className="flex items-center gap-3">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute h-full w-full rounded-full bg-amber-400 opacity-75" />
                        <span className="relative rounded-full h-3 w-3 bg-amber-500" />
                    </span>
                    <span className="text-sm font-semibold text-slate-700">{dirtyCount} neišsaugoti</span>
                </div>

                {hasErrors && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-xl">
                        <AlertCircle className="w-4 h-4 text-red-500" />
                        <span className="text-sm font-bold text-red-600">{errorCount} klaidos</span>
                    </div>
                )}

                <div className="w-px h-8 bg-slate-200" />

                <button onClick={onDiscard} disabled={isSaving} className="flex items-center gap-2 h-10 px-5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50">
                    <X className="w-4 h-4" />Atšaukti
                </button>

                <button onClick={onSave} disabled={hasErrors || isSaving} className={`flex items-center gap-2 h-10 px-5 text-sm font-bold rounded-xl transition-colors ${hasErrors ? 'bg-slate-200 text-slate-400' : 'bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-500/30'}`}>
                    {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" />Saugoma...</> : <><Save className="w-4 h-4" />Išsaugoti<span className="bg-teal-500 px-2 py-0.5 rounded-lg text-xs font-black">{dirtyCount}</span></>}
                </button>
            </div>
        </div>
    );
};

export default BulkActionBar;
