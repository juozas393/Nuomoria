import React, { memo, useMemo } from 'react';
import { Clock, UserPlus, LogOut, CreditCard, FileText, FileCheck, Gauge, AlertCircle } from 'lucide-react';
import { ActivityTimelineProps, ActivityEvent } from './types';

// Standardized animation timings
const ANIMATION = {
    hover: 'duration-150 ease-out',
} as const;

const cardStyle = {
    backgroundImage: `url('/images/FormsBackground.png')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
};

const eventIcons: Record<ActivityEvent['type'], React.ComponentType<{ className?: string }>> = {
    created: Clock,
    tenant_added: UserPlus,
    tenant_removed: LogOut,
    payment: CreditCard,
    document: FileText,
    lease: FileCheck,
    meter_reading: Gauge,
    status_change: AlertCircle,
};

// Memoized event item
const EventItem = memo<{ event: ActivityEvent; isLast: boolean }>(({ event, isLast }) => {
    const Icon = eventIcons[event.type] || Clock;

    return (
        <div className="flex gap-3 pb-4 last:pb-0">
            {/* Timeline line */}
            <div className="relative flex flex-col items-center">
                <div className="w-7 h-7 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center z-10">
                    <Icon className="w-3.5 h-3.5 text-gray-500" />
                </div>
                {!isLast && (
                    <div className="absolute top-7 w-px h-full bg-gray-100" />
                )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pt-0.5">
                <p className="text-[13px] font-medium text-gray-800 truncate">{event.title}</p>
                {event.description && (
                    <p className="text-[12px] text-gray-500 truncate">{event.description}</p>
                )}
                <p className="text-[11px] text-gray-400 mt-0.5">{formatRelativeTime(event.timestamp)}</p>
            </div>
        </div>
    );
});
EventItem.displayName = 'EventItem';

export const ActivityTimeline = memo<ActivityTimelineProps>(({
    events,
    maxItems = 5,
}) => {
    // Memoize displayed events to avoid recalculation
    const displayEvents = useMemo(() => events.slice(0, maxItems), [events, maxItems]);
    const hasMore = events.length > maxItems;

    if (events.length === 0) {
        return (
            <div
                className="rounded-2xl border border-gray-100 p-5"
                style={cardStyle}
            >
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-xl bg-white/80 backdrop-blur-sm flex items-center justify-center">
                        <Clock className="w-5 h-5 text-gray-400" />
                    </div>
                    <h3 className="text-[15px] font-semibold text-gray-900">Paskutinė veikla</h3>
                </div>
                <p className="text-[13px] text-gray-400 text-center py-4">
                    Nėra įvykių
                </p>
            </div>
        );
    }

    return (
        <div
            className="rounded-2xl border border-gray-100 p-5"
            style={cardStyle}
        >
            <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-white/80 backdrop-blur-sm flex items-center justify-center">
                    <Clock className="w-5 h-5 text-gray-400" />
                </div>
                <h3 className="text-[15px] font-semibold text-gray-900">Paskutinė veikla</h3>
            </div>

            <div className="relative">
                {displayEvents.map((event, idx) => (
                    <EventItem
                        key={event.id}
                        event={event}
                        isLast={idx === displayEvents.length - 1}
                    />
                ))}
            </div>

            {hasMore && (
                <button className={`w-full mt-3 py-2 text-[12px] font-medium text-gray-500 hover:text-gray-700 transition-colors ${ANIMATION.hover}`}>
                    Rodyti daugiau ({events.length - maxItems})
                </button>
            )}
        </div>
    );
});

const formatRelativeTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Šiandien';
    if (diffDays === 1) return 'Vakar';
    if (diffDays < 7) return `Prieš ${diffDays} d.`;
    return date.toLocaleDateString('lt-LT', { month: 'short', day: 'numeric' });
};

ActivityTimeline.displayName = 'ActivityTimeline';

export default ActivityTimeline;
