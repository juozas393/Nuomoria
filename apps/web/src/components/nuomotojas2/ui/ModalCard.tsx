import React from 'react';
import { ChevronRight, Pencil } from 'lucide-react';

// =============================================================================
// DESIGN SYSTEM CONSTANTS
// =============================================================================

export const CARD_STYLES = {
    base: 'bg-white rounded-2xl border border-gray-100 shadow-sm',
    padding: 'p-4',
    hover: 'hover:shadow-md transition-shadow',
} as const;

export const ICON_STYLES = {
    container: 'w-8 h-8 rounded-lg flex items-center justify-center',
    containerSmall: 'w-6 h-6 rounded-md flex items-center justify-center',
    // Neutral (default)
    neutral: 'bg-gray-50 text-gray-600',
    // Accent (use sparingly)
    accent: 'bg-teal-50 text-teal-700',
} as const;

export const TEXT_STYLES = {
    title: 'text-sm font-semibold text-gray-900',
    subtitle: 'text-xs text-gray-500',
    body: 'text-sm text-gray-700',
    link: 'text-sm font-medium text-teal-700 hover:text-teal-800',
    muted: 'text-xs text-gray-400',
} as const;

// =============================================================================
// MODAL CARD COMPONENT
// =============================================================================

interface ModalCardProps {
    title?: string;
    subtitle?: string;
    icon?: React.ReactNode;
    onEdit?: () => void;
    editLabel?: string;
    children: React.ReactNode;
    className?: string;
    noPadding?: boolean;
    compact?: boolean;
}

export const ModalCard: React.FC<ModalCardProps> = ({
    title,
    subtitle,
    icon,
    onEdit,
    editLabel = 'Redaguoti',
    children,
    className = '',
    noPadding = false,
    compact = false,
}) => {
    return (
        <div className={`${CARD_STYLES.base} ${noPadding ? '' : CARD_STYLES.padding} ${className}`}>
            {(title || onEdit) && (
                <div className={`flex items-center justify-between ${compact ? 'mb-2' : 'mb-3'}`}>
                    <div className="flex items-center gap-2">
                        {icon && (
                            <div className={`${ICON_STYLES.containerSmall} ${ICON_STYLES.neutral}`}>
                                {icon}
                            </div>
                        )}
                        <div>
                            {title && <h3 className={TEXT_STYLES.title}>{title}</h3>}
                            {subtitle && <p className={TEXT_STYLES.subtitle}>{subtitle}</p>}
                        </div>
                    </div>
                    {onEdit && (
                        <button
                            onClick={onEdit}
                            className={`flex items-center gap-1 ${TEXT_STYLES.link}`}
                        >
                            <Pencil className="w-3 h-3" />
                            {editLabel}
                        </button>
                    )}
                </div>
            )}
            {children}
        </div>
    );
};

// =============================================================================
// KPI ITEM COMPONENT
// =============================================================================

interface KpiItemProps {
    label: string;
    value: string | number | null | undefined;
    fallback?: string;
}

export const KpiItem: React.FC<KpiItemProps> = ({ label, value, fallback = '—' }) => {
    const displayValue = value !== null && value !== undefined && value !== 0 && value !== ''
        ? value
        : fallback;

    return (
        <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">{displayValue}</div>
            <div className={TEXT_STYLES.subtitle}>{label}</div>
        </div>
    );
};

// =============================================================================
// QUICK LINK COMPONENT
// =============================================================================

interface QuickLinkProps {
    icon: React.ReactNode;
    label: string;
    sublabel?: string;
    count?: number;
    warning?: string;
    onClick?: () => void;
}

export const QuickLink: React.FC<QuickLinkProps> = ({
    icon,
    label,
    sublabel,
    count,
    warning,
    onClick,
}) => {
    return (
        <button
            onClick={onClick}
            className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50/50 transition-all text-left group"
        >
            <div className="flex items-center gap-3">
                <div className={`${ICON_STYLES.container} ${ICON_STYLES.neutral} group-hover:bg-gray-100 transition-colors`}>
                    {icon}
                </div>
                <div>
                    <div className={TEXT_STYLES.title}>{label}</div>
                    {sublabel && <div className={TEXT_STYLES.subtitle}>{sublabel}</div>}
                    {warning && <div className="text-xs text-amber-600">{warning}</div>}
                </div>
            </div>
            <div className="flex items-center gap-2">
                {count !== undefined && (
                    <span className="text-sm font-medium text-gray-500">{count}</span>
                )}
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
            </div>
        </button>
    );
};

// =============================================================================
// CHECKLIST ITEM COMPONENT
// =============================================================================

interface ChecklistItemProps {
    label: string;
    complete: boolean;
    required?: boolean;
    onAction?: () => void;
    actionLabel?: string;
}

export const ChecklistItem: React.FC<ChecklistItemProps> = ({
    label,
    complete,
    required = true,
    onAction,
    actionLabel = 'Sutvarkyti',
}) => {
    return (
        <div className="flex items-center justify-between py-1.5">
            <div className="flex items-center gap-2">
                {complete ? (
                    <div className="w-4 h-4 rounded-full bg-teal-100 flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                )}
                <span className={`text-sm ${complete ? 'text-gray-400' : required ? 'text-gray-900' : 'text-gray-500'}`}>
                    {label}
                </span>
                {!required && <span className="text-xs text-gray-400">(rekomenduojama)</span>}
            </div>
            {!complete && onAction && (
                <button onClick={onAction} className={TEXT_STYLES.link}>
                    {actionLabel}
                </button>
            )}
        </div>
    );
};

// =============================================================================
// PROGRESS BAR COMPONENT
// =============================================================================

interface ProgressBarProps {
    value: number; // 0-100
    className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ value, className = '' }) => {
    const clampedValue = Math.max(0, Math.min(100, value));

    return (
        <div className={`h-1.5 bg-gray-100 rounded-full overflow-hidden ${className}`}>
            <div
                className={`h-full rounded-full transition-all duration-500 ${clampedValue === 100 ? 'bg-teal-500' : 'bg-gradient-to-r from-gray-300 to-teal-400'
                    }`}
                style={{ width: `${clampedValue}%` }}
            />
        </div>
    );
};

// =============================================================================
// EMPTY STATE COMPONENT
// =============================================================================

interface EmptyStateProps {
    icon?: React.ReactNode;
    message: string;
    actionLabel?: string;
    onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    icon,
    message,
    actionLabel,
    onAction,
}) => {
    return (
        <div className="text-center py-6">
            {icon && (
                <div className={`${ICON_STYLES.container} ${ICON_STYLES.neutral} mx-auto mb-2`}>
                    {icon}
                </div>
            )}
            <p className={TEXT_STYLES.subtitle}>{message}</p>
            {actionLabel && onAction && (
                <button onClick={onAction} className={`${TEXT_STYLES.link} mt-2`}>
                    + {actionLabel}
                </button>
            )}
        </div>
    );
};

// =============================================================================
// DATA ROW COMPONENT
// =============================================================================

interface DataRowProps {
    label: string;
    value: string | number | null | undefined;
    fallback?: string;
    onAdd?: () => void;
}

export const DataRow: React.FC<DataRowProps> = ({
    label,
    value,
    fallback = 'Neįvesta',
    onAdd,
}) => {
    const hasValue = value !== null && value !== undefined && value !== '' && value !== 0;

    return (
        <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
            <span className={TEXT_STYLES.subtitle}>{label}</span>
            {hasValue ? (
                <span className="text-sm font-medium text-gray-900">{value}</span>
            ) : (
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">{fallback}</span>
                    {onAdd && (
                        <button onClick={onAdd} className="text-xs text-teal-600 hover:text-teal-700">
                            Pridėti
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default ModalCard;
