import React, { memo, useMemo } from 'react';
import { Home, ExternalLink, Euro, CreditCard, FileText, Bell, Settings } from 'lucide-react';
import { SummaryHeaderProps, getStatusVariant } from './types';
import { StatusBadge } from './StatusBadge';

// Standardized animation timings
const ANIMATION = {
    hover: 'duration-150 ease-out',
    press: 'duration-100 ease-out',
} as const;

const cardStyle = {
    backgroundImage: `url('/images/CardsBackground.webp')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
};

// Memoized action button component
const ActionButton = memo<{
    onClick?: () => void;
    variant: 'primary' | 'secondary' | 'tertiary' | 'ghost';
    icon?: React.ReactNode;
    children: React.ReactNode;
}>(({ onClick, variant, icon, children }) => {
    if (!onClick) return null;

    const baseClasses = `inline-flex items-center gap-2 text-[13px] font-semibold rounded-xl transition-colors ${ANIMATION.hover} active:scale-[0.98]`;

    const variantClasses = {
        primary: 'px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white shadow-sm',
        secondary: 'px-4 py-2.5 bg-white/80 hover:bg-white text-gray-700',
        tertiary: 'px-3 py-2.5 text-gray-600 hover:text-gray-900 hover:bg-white/80',
        ghost: 'px-3 py-2 text-gray-500 hover:text-gray-700 text-[12px] font-medium rounded-lg hover:bg-white/80',
    };

    return (
        <button onClick={onClick} className={`${baseClasses} ${variantClasses[variant]}`}>
            {icon}
            {children}
        </button>
    );
});
ActionButton.displayName = 'ActionButton';

export const SummaryHeader = memo<SummaryHeaderProps>(({
    unit,
    onAddTenant,
    onPublish,
    onSettings,
    onViewPhotos,
    onSetRent,
    onRecordPayment,
    onViewLease,
    onSendReminder,
}) => {
    const statusVariant = useMemo(() => getStatusVariant(unit.status), [unit.status]);
    const isVacant = unit.status === 'vacant';
    const isRented = unit.status === 'rented';

    const details = useMemo(() => [
        unit.type && capitalize(translateType(unit.type)),
        unit.area && `${unit.area} m²`,
        unit.rooms && `${unit.rooms} kamb.`,
        unit.floor && `${unit.floor} aukštas`,
    ].filter(Boolean).join(' • '), [unit.type, unit.area, unit.rooms, unit.floor]);

    return (
        <div className="rounded-2xl border border-gray-100 p-5" style={cardStyle}>
            {/* Top row: Address + Status */}
            <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-50 to-cyan-50 flex items-center justify-center flex-shrink-0">
                        <Home className="w-5 h-5 text-teal-600" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-lg font-bold text-gray-900 truncate">
                            {unit.address || 'Adresas nenustatytas'}
                            {unit.apartmentNumber && `-${unit.apartmentNumber}`}
                        </h1>
                        <p className="text-[13px] text-gray-500 mt-0.5">{details || 'Būsto informacija nepridėta'}</p>
                    </div>
                </div>
                <StatusBadge status={statusVariant} size="md" />
            </div>

            {/* Status-aware Action Bar */}
            <div className="flex items-center justify-between gap-3 pt-4 border-t border-gray-100">
                {/* Primary Actions - Left side */}
                <div className="flex items-center gap-2">
                    {isVacant && (
                        <>
                            <ActionButton onClick={onAddTenant} variant="primary">
                                Pridėti nuomininką
                            </ActionButton>
                            <ActionButton onClick={onSetRent} variant="secondary" icon={<Euro className="w-4 h-4" />}>
                                Nustatyti kainą
                            </ActionButton>
                            <ActionButton onClick={onPublish} variant="tertiary" icon={<ExternalLink className="w-4 h-4" />}>
                                Skelbti
                            </ActionButton>
                        </>
                    )}

                    {isRented && (
                        <>
                            <ActionButton onClick={onRecordPayment} variant="primary" icon={<CreditCard className="w-4 h-4" />}>
                                Įrašyti mokėjimą
                            </ActionButton>
                            <ActionButton onClick={onViewLease} variant="secondary" icon={<FileText className="w-4 h-4" />}>
                                Sutartis
                            </ActionButton>
                            <ActionButton onClick={onSendReminder} variant="tertiary" icon={<Bell className="w-4 h-4" />}>
                                Priminimas
                            </ActionButton>
                        </>
                    )}
                </div>

                {/* Secondary Actions - Right side */}
                <div className="flex items-center gap-1">
                    <ActionButton onClick={onViewPhotos} variant="ghost">
                        Nuotraukos ({unit.photos?.length || 0})
                    </ActionButton>
                    <ActionButton onClick={onSettings} variant="ghost" icon={<Settings className="w-4 h-4" />}>
                        Nustatymai
                    </ActionButton>
                </div>
            </div>
        </div>
    );
});

// Helper functions
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

const translateType = (type: string): string => {
    const dict: Record<string, string> = {
        'apartment': 'Butas',
        'house': 'Namas',
        'studio': 'Studija',
        'room': 'Kambarys',
        'commercial': 'Komercinis',
    };
    return dict[type?.toLowerCase()] || type;
};

SummaryHeader.displayName = 'SummaryHeader';

export default SummaryHeader;
