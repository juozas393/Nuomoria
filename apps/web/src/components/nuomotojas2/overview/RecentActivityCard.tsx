import React, { memo } from 'react';
import { Clock, ImagePlus, UserPlus, Euro, FileText } from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

export interface ActivityItem {
    id: string;
    type: 'photo_upload' | 'tenant_added' | 'price_set' | 'document_added' | 'other';
    label: string;
    timestamp: Date;
}

interface RecentActivityCardProps {
    activities: ActivityItem[];
    onViewAll?: () => void;
}

// =============================================================================
// HELPERS
// =============================================================================

const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
        case 'photo_upload': return ImagePlus;
        case 'tenant_added': return UserPlus;
        case 'price_set': return Euro;
        case 'document_added': return FileText;
        default: return Clock;
    }
};

const formatRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ką tik';
    if (diffMins < 60) return `Prieš ${diffMins} min.`;
    if (diffHours < 24) return `Prieš ${diffHours} val.`;
    if (diffDays < 7) return `Prieš ${diffDays} d.`;
    return date.toLocaleDateString('lt-LT', { month: 'short', day: 'numeric' });
};

// =============================================================================
// COMPONENT — RULE 5: COMPACT RECENT ACTIVITY
// =============================================================================

export const RecentActivityCard = memo<RecentActivityCardProps>(({
    activities,
    onViewAll,
}) => {
    // Show max 3 activities
    const displayActivities = activities.slice(0, 3);
    const isEmpty = activities.length === 0;

    return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-xs font-medium text-gray-700">Paskutinė veikla</span>
                </div>
                {!isEmpty && onViewAll && (
                    <button
                        onClick={onViewAll}
                        className="text-[10px] text-gray-400 hover:text-primary transition-colors"
                    >
                        Visos →
                    </button>
                )}
            </div>

            {/* Content */}
            <div className="p-2">
                {isEmpty ? (
                    <p className="text-xs text-gray-400 text-center py-3">Dar nėra veiklos</p>
                ) : (
                    <div className="space-y-1">
                        {displayActivities.map((activity) => {
                            const Icon = getActivityIcon(activity.type);
                            return (
                                <div
                                    key={activity.id}
                                    className="flex items-center gap-2 py-1.5 px-1 rounded hover:bg-gray-50 transition-colors"
                                >
                                    <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                                        <Icon className="w-3 h-3 text-gray-500" />
                                    </div>
                                    <span className="text-xs text-gray-600 flex-1 truncate">{activity.label}</span>
                                    <span className="text-[10px] text-gray-400 flex-shrink-0">
                                        {formatRelativeTime(activity.timestamp)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
});

RecentActivityCard.displayName = 'RecentActivityCard';

export default RecentActivityCard;
