import React, { useState, useEffect } from 'react';
import { X, TrendingUp, Calendar } from 'lucide-react';
import type { MeterHistoryEntry } from './useMeterReadings';

// =============================================================================
// METER HISTORY PANEL
// Clean Executive slide-out showing reading history for a single meter
// =============================================================================

const MONTHS_LT = ['Sausis', 'Vasaris', 'Kovas', 'Balandis', 'Gegužė', 'Birželis', 'Liepa', 'Rugpjūtis', 'Rugsėjis', 'Spalis', 'Lapkritis', 'Gruodis'];

interface MeterHistoryPanelProps {
    meterName: string;
    meterId: string;
    unit: string;
    isOpen: boolean;
    onClose: () => void;
    fetchHistory: (meterId: string, limit?: number) => Promise<MeterHistoryEntry[]>;
}

function formatPeriod(dateStr: string): string {
    const d = new Date(dateStr);
    return `${MONTHS_LT[d.getMonth()]} ${d.getFullYear()}`;
}

function fmt(val: number | null | undefined): string {
    if (val === null || val === undefined) return '—';
    return val.toLocaleString('lt-LT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export const MeterHistoryPanel: React.FC<MeterHistoryPanelProps> = ({
    meterName,
    meterId,
    unit,
    isOpen,
    onClose,
    fetchHistory,
}) => {
    const [history, setHistory] = useState<MeterHistoryEntry[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!isOpen || !meterId) return;

        const load = async () => {
            setIsLoading(true);
            try {
                const data = await fetchHistory(meterId, 12);
                setHistory(data);
            } catch (e) {
                console.error('[MeterHistoryPanel] Error:', e);
            } finally {
                setIsLoading(false);
            }
        };

        load();
    }, [isOpen, meterId, fetchHistory]);

    if (!isOpen) return null;

    // Find max consumption for bar chart scaling
    const maxConsumption = Math.max(1, ...history.map(h => h.consumption || 0));

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[70] transition-opacity"
                onClick={onClose}
            />

            {/* Panel */}
            <div className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-white shadow-2xl z-[71] flex flex-col animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-teal-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900">{meterName}</h3>
                            <p className="text-sm text-slate-500">Rodmenų istorija · {unit}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="text-center">
                                <div className="w-8 h-8 border-2 border-teal-200 border-t-teal-600 rounded-full animate-spin mx-auto mb-3" />
                                <p className="text-sm text-slate-500">Kraunama istorija...</p>
                            </div>
                        </div>
                    ) : history.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                                <Calendar className="w-7 h-7 text-slate-400" />
                            </div>
                            <p className="text-slate-600 font-medium mb-1">Nėra istorijos</p>
                            <p className="text-sm text-slate-400">Šiam skaitliukui dar nėra išsaugotų rodmenų</p>
                        </div>
                    ) : (
                        <div className="px-6 py-4">
                            {/* Mini consumption chart */}
                            <div className="mb-6">
                                <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Suvartojimo tendencija</h4>
                                <div className="flex items-end gap-1.5 h-20">
                                    {[...history].reverse().map((entry, i) => {
                                        const height = maxConsumption > 0 ? (entry.consumption / maxConsumption) * 100 : 0;
                                        return (
                                            <div key={entry.id} className="flex-1 flex flex-col items-center gap-1" title={`${formatPeriod(entry.readingDate)}: ${fmt(entry.consumption)} ${unit}`}>
                                                <div
                                                    className="w-full bg-teal-400/80 rounded-t-sm transition-colors hover:bg-teal-500"
                                                    style={{ height: `${Math.max(height, 4)}%`, minHeight: '3px' }}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="flex justify-between mt-1">
                                    <span className="text-[10px] text-slate-400">
                                        {history.length > 0 ? formatPeriod(history[history.length - 1].readingDate) : ''}
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                        {history.length > 0 ? formatPeriod(history[0].readingDate) : ''}
                                    </span>
                                </div>
                            </div>

                            {/* History table */}
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-100">
                                        <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider pb-2 pl-0">Periodas</th>
                                        <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wider pb-2">Praėjęs</th>
                                        <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wider pb-2">Dabartinis</th>
                                        <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wider pb-2">Suvart.</th>
                                        <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wider pb-2 pr-0">Kaina</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {history.map((entry, i) => (
                                        <tr
                                            key={entry.id}
                                            className={`border-b border-slate-50 ${i === 0 ? 'bg-teal-50/30' : 'hover:bg-slate-50/50'} transition-colors`}
                                        >
                                            <td className="py-2.5 pl-0">
                                                <span className={`text-sm ${i === 0 ? 'font-semibold text-teal-700' : 'text-slate-700'}`}>
                                                    {formatPeriod(entry.readingDate)}
                                                </span>
                                            </td>
                                            <td className="py-2.5 text-right">
                                                <span className="text-sm text-slate-500 tabular-nums">{fmt(entry.previousReading)}</span>
                                            </td>
                                            <td className="py-2.5 text-right">
                                                <span className="text-sm text-slate-700 tabular-nums font-medium">{fmt(entry.currentReading)}</span>
                                            </td>
                                            <td className="py-2.5 text-right">
                                                <span className={`text-sm tabular-nums font-medium ${entry.consumption > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                                                    {fmt(entry.consumption)} {unit}
                                                </span>
                                            </td>
                                            <td className="py-2.5 text-right pr-0">
                                                <span className="text-sm text-slate-900 tabular-nums font-semibold">
                                                    {fmt(entry.cost)} €
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Summary */}
                            {history.length > 1 && (
                                <div className="mt-4 pt-4 border-t border-slate-100">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Vid. suvartojimas</span>
                                        <span className="text-slate-800 font-medium tabular-nums">
                                            {fmt(history.reduce((sum, h) => sum + h.consumption, 0) / history.length)} {unit}/mėn.
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm mt-1">
                                        <span className="text-slate-500">Viso kaina</span>
                                        <span className="text-slate-800 font-medium tabular-nums">
                                            {fmt(history.reduce((sum, h) => sum + h.cost, 0))} €
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default MeterHistoryPanel;
