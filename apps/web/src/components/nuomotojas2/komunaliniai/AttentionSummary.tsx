import React from 'react';
import { AlertCircle, Camera, Clock, CheckCircle, Gauge } from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface AttentionSummaryProps {
    total: number;
    missingReadings: number;
    missingPhotos: number;
    pendingApproval: number;
    ok: number;
    activeFilter: AttentionFilter | null;
    onFilterChange: (filter: AttentionFilter | null) => void;
}

export type AttentionFilter = 'missing' | 'photo' | 'pending' | 'ok';

// =============================================================================
// COMPONENT - PROFESSIONAL CHIPS ROW
// =============================================================================

export const AttentionSummary: React.FC<AttentionSummaryProps> = ({
    total,
    missingReadings,
    missingPhotos,
    pendingApproval,
    ok,
    activeFilter,
    onFilterChange,
}) => {
    const chips: { id: AttentionFilter | null; label: string; count: number; icon: React.ElementType; colorActive: string; colorInactive: string }[] = [
        { id: null, label: 'Visi', count: total, icon: Gauge, colorActive: 'bg-gray-800 text-white', colorInactive: 'bg-white text-gray-700 border-gray-200' },
        { id: 'missing', label: 'Trūksta rodmenų', count: missingReadings, icon: AlertCircle, colorActive: 'bg-red-600 text-white', colorInactive: 'bg-white text-gray-600 border-gray-200' },
        { id: 'photo', label: 'Reikia nuotraukos', count: missingPhotos, icon: Camera, colorActive: 'bg-amber-500 text-white', colorInactive: 'bg-white text-gray-600 border-gray-200' },
        { id: 'pending', label: 'Laukia patvirtinimo', count: pendingApproval, icon: Clock, colorActive: 'bg-blue-600 text-white', colorInactive: 'bg-white text-gray-600 border-gray-200' },
        { id: 'ok', label: 'Tvarkoje', count: ok, icon: CheckCircle, colorActive: 'bg-green-600 text-white', colorInactive: 'bg-white text-gray-600 border-gray-200' },
    ];

    return (
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center gap-2 overflow-x-auto">
                {chips.map(({ id, label, count, icon: Icon, colorActive, colorInactive }) => {
                    const isActive = activeFilter === id;
                    return (
                        <button
                            key={id ?? 'all'}
                            onClick={() => onFilterChange(isActive ? null : id)}
                            className={`
                                flex items-center gap-2 px-3 h-[30px] rounded-full text-sm font-medium 
                                transition-colors border whitespace-nowrap
                                ${isActive ? colorActive : colorInactive}
                                ${!isActive && 'hover:bg-gray-50 hover:border-gray-300'}
                            `}
                        >
                            <Icon className="w-4 h-4" />
                            <span>{label}</span>
                            <span className={`
                                px-1.5 py-0.5 text-xs rounded-full font-semibold
                                ${isActive ? 'bg-white/20' : 'bg-gray-100'}
                            `}>
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default AttentionSummary;
