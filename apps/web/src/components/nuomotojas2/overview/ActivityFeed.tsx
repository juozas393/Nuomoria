import React, { memo } from 'react';
import { Clock, Upload, ChevronRight } from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

export interface ActivityItem {
    id: string;
    text: string;
    time: string;
    type?: 'info' | 'success' | 'warning';
}

interface ActivityFeedProps {
    activities: ActivityItem[];
    onViewAll?: () => void;
    onUploadPhoto?: () => void;
}

// =============================================================================
// HELPERS
// =============================================================================

const formatRelativeTime = (timeStr: string): string => {
    // If already formatted (e.g., "šiandien", "vakar")
    if (!timeStr.includes('-') && !timeStr.includes('/')) {
        return timeStr;
    }

    const date = new Date(timeStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'ką tik';
    if (diffMins < 60) return `prieš ${diffMins} min.`;
    if (diffHours < 24) return `prieš ${diffHours} val.`;
    if (diffDays === 1) return 'vakar';
    if (diffDays < 7) return `prieš ${diffDays} d.`;
    return date.toLocaleDateString('lt-LT', { month: 'short', day: 'numeric' });
};

// =============================================================================
// COMPONENT
// =============================================================================

export const ActivityFeed = memo<ActivityFeedProps>(({
    activities,
    onViewAll,
    onUploadPhoto,
}) => {
    const isEmpty = activities.length === 0;
    const visibleActivities = activities.slice(0, 3);
    const hasMore = activities.length > 3;

    return (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Clock className="w-4 h-4 text-gray-600" />
                    </div>
                    <span className="text-sm font-bold text-gray-900">Paskutinė veikla</span>
                </div>
                {hasMore && (
                    <button
                        onClick={onViewAll}
                        className="text-xs font-bold text-teal-600 hover:text-teal-700 transition-colors flex items-center gap-0.5"
                    >
                        Visos
                        <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>

            {/* Content */}
            <div className="p-4">
                {isEmpty ? (
                    /* Empty state */
                    <div className="flex items-center justify-between gap-4">
                        <span className="text-xs text-gray-500">
                            Nėra veiklos—pradėkite įkeldami nuotraukas
                        </span>
                        <button
                            onClick={onUploadPhoto}
                            className="flex items-center gap-1.5 text-xs font-bold text-teal-600 hover:text-teal-700 transition-colors"
                        >
                            <Upload className="w-3.5 h-3.5" />
                            Įkelti →
                        </button>
                    </div>
                ) : (
                    /* Activity list */
                    <div className="space-y-3">
                        {visibleActivities.map((activity) => (
                            <div key={activity.id} className="flex items-start gap-3">
                                <div className="w-1.5 h-1.5 bg-gray-300 rounded-full mt-2 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-gray-700">{activity.text}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        {formatRelativeTime(activity.time)}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
});

ActivityFeed.displayName = 'ActivityFeed';

export default ActivityFeed;
