import React, { memo } from 'react';
import { Euro, Droplets, FileText, LucideIcon } from 'lucide-react';
import { CardPatternOverlay } from '../../ui/CardPatternOverlay';

// =============================================================================
// TYPES
// =============================================================================

interface KPIStatTileProps {
    icon: LucideIcon;
    label: string;
    value?: string | number | null;
    emptyLabel?: string;
}

// =============================================================================
// COMPONENT — RULE 1: SUBTLE MISSING INDICATOR (NO TEXT BADGE)
// =============================================================================

export const KPIStatTile = memo<KPIStatTileProps>(({
    icon: Icon,
    label,
    value,
    emptyLabel = 'Nenustatyta',
}) => {
    const hasValue = value !== null && value !== undefined && value !== '';
    const displayValue = hasValue ? value : emptyLabel;

    return (
        <div className={`relative bg-white border rounded-xl shadow-sm overflow-hidden p-3 ${hasValue ? 'border-gray-200' : 'border-amber-200/50'
            }`}>
            <CardPatternOverlay />

            <div className="relative">
                <div className="flex items-start justify-between mb-2">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Icon className="w-4 h-4 text-gray-500" />
                    </div>
                    {/* RULE 1: Subtle dot instead of text badge */}
                    {!hasValue && (
                        <span className="w-2 h-2 rounded-full bg-amber-400" title="Nenustatyta" />
                    )}
                </div>

                <div className="mb-0.5">
                    <span className={`text-sm font-medium ${hasValue ? 'text-gray-900' : 'text-gray-400'}`}>
                        {displayValue}
                    </span>
                </div>

                <p className="text-xs text-gray-500">{label}</p>
            </div>
        </div>
    );
});

KPIStatTile.displayName = 'KPIStatTile';

// =============================================================================
// PRE-CONFIGURED TILES — RULE 5: CORRECT GRAMMAR
// =============================================================================

interface RentTileProps {
    rent?: number;
}

export const RentTile = memo<RentTileProps>(({ rent }) => (
    <KPIStatTile
        icon={Euro}
        label="Nuoma/mėn"
        value={rent ? `€${rent}` : null}
        emptyLabel="Nenustatyta"
    />
));
RentTile.displayName = 'RentTile';

interface DepositTileProps {
    deposit?: number;
}

export const DepositTile = memo<DepositTileProps>(({ deposit }) => (
    <KPIStatTile
        icon={Euro}
        label="Užstatas"
        value={deposit ? `€${deposit}` : null}
        emptyLabel="Nenustatyta"
    />
));
DepositTile.displayName = 'DepositTile';

interface MetersTileProps {
    count: number;
}

export const MetersTile = memo<MetersTileProps>(({ count }) => (
    <KPIStatTile
        icon={Droplets}
        label="Skaitikliai"
        value={count > 0 ? count : null}
        emptyLabel="Nėra"
    />
));
MetersTile.displayName = 'MetersTile';

interface DocumentsTileProps {
    count: number;
}

export const DocumentsTile = memo<DocumentsTileProps>(({ count }) => (
    <KPIStatTile
        icon={FileText}
        label="Dokumentai"
        value={count > 0 ? count : null}
        // RULE 5: Correct grammar
        emptyLabel="Nėra dokumentų"
    />
));
DocumentsTile.displayName = 'DocumentsTile';

export default KPIStatTile;
