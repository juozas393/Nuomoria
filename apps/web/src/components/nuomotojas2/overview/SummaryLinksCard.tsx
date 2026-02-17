import React, { memo } from 'react';
import { FileText, Droplets, Euro, ChevronRight } from 'lucide-react';
import { CardPatternOverlay } from '../../ui/CardPatternOverlay';

// =============================================================================
// TYPES
// =============================================================================

interface SummaryLinksCardProps {
    rentStatus?: string;
    paymentDay?: number;
    documentsCount: number;
    metersCount: number;
    lastMeterReading?: string;
    onNavigateRental?: () => void;
    onNavigateDocuments?: () => void;
    onNavigateMeters?: () => void;
}

// =============================================================================
// COMPONENT - COMPACT SPACING
// =============================================================================

export const SummaryLinksCard = memo<SummaryLinksCardProps>(({
    rentStatus,
    paymentDay,
    documentsCount,
    metersCount,
    lastMeterReading,
    onNavigateRental,
    onNavigateDocuments,
    onNavigateMeters,
}) => {
    const getRentValue = () => {
        if (!rentStatus) return 'Nenustatyta';
        if (paymentDay) return `${rentStatus} • Mokėjimo d.: ${paymentDay}`;
        return rentStatus;
    };

    const getMetersValue = () => {
        if (metersCount === 0) return 'Nėra';
        if (lastMeterReading) return `${metersCount} skaitliuk. • Pask.: ${lastMeterReading}`;
        return `${metersCount} skaitliuk.`;
    };

    const links = [
        {
            id: 'rental',
            icon: <Euro className="w-3.5 h-3.5 text-gray-500" />,
            label: 'Nuoma',
            value: getRentValue(),
            valueClass: rentStatus ? 'text-gray-700' : 'text-amber-600',
            onClick: onNavigateRental,
        },
        {
            id: 'documents',
            icon: <FileText className="w-3.5 h-3.5 text-gray-500" />,
            label: 'Dokumentai',
            value: `${documentsCount} failų`,
            valueClass: documentsCount > 0 ? 'text-gray-700' : 'text-gray-500',
            onClick: onNavigateDocuments,
        },
        {
            id: 'meters',
            icon: <Droplets className="w-3.5 h-3.5 text-gray-500" />,
            label: 'Komunaliniai',
            value: getMetersValue(),
            valueClass: metersCount > 0 ? 'text-gray-700' : 'text-gray-500',
            onClick: onNavigateMeters,
        },
    ];

    return (
        <div className="relative bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden h-full flex flex-col">
            <CardPatternOverlay />

            {/* Header - COMPACT */}
            <div className="relative px-2.5 py-2 border-b border-gray-100">
                <span className="text-xs font-bold text-gray-900">Suvestinė</span>
            </div>

            {/* Links list - COMPACT */}
            <div className="relative flex-1 divide-y divide-gray-100">
                {links.map((link) => (
                    <button
                        key={link.id}
                        onClick={link.onClick}
                        className="w-full flex items-center justify-between px-2.5 py-2 hover:bg-gray-50 transition-colors text-left group"
                    >
                        <div className="flex items-center gap-2">
                            {/* COMPACT: w-6 h-6 instead of w-8 h-8 */}
                            <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center group-hover:bg-primary-light transition-colors">
                                {link.icon}
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-medium text-gray-900">{link.label}</p>
                                <p className={`text-[10px] ${link.valueClass} truncate`}>{link.value}</p>
                            </div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-primary transition-colors flex-shrink-0" />
                    </button>
                ))}
            </div>
        </div>
    );
});

SummaryLinksCard.displayName = 'SummaryLinksCard';

export default SummaryLinksCard;
