import React, { memo, useState } from 'react';
import { CheckCircle2, Circle, ChevronDown, ChevronUp } from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

export interface SetupTask {
    id: string;
    label: string;
    done: boolean;
    cta: string;
    onClick?: () => void;
}

interface SetupProgressProps {
    tasks: SetupTask[];
    onViewAll?: () => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const SetupProgress = memo<SetupProgressProps>(({ tasks, onViewAll }) => {
    const [collapsed, setCollapsed] = useState(false);

    const remaining = tasks.filter(t => !t.done);
    const completedCount = tasks.length - remaining.length;
    const progress = Math.round((completedCount / tasks.length) * 100);
    const isComplete = remaining.length === 0;

    // Show top 3 tasks only
    const visibleTasks = remaining.slice(0, 3);
    const hasMore = remaining.length > 3;

    // Success state - collapsed single row
    if (isComplete) {
        return (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <span className="text-sm font-bold text-emerald-800">Būstas paruoštas nuomai</span>
                <span className="ml-auto text-xs font-medium text-emerald-600">100%</span>
            </div>
        );
    }

    return (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
            {/* Header with progress */}
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors rounded-t-xl"
            >
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-teal-600" />
                    </div>
                    <span className="text-sm font-bold text-gray-900">Kiti žingsniai</span>
                </div>

                <div className="flex items-center gap-3">
                    {/* Progress bar */}
                    <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-teal-400 to-teal-600 rounded-full transition-colors duration-500"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <span className="text-xs font-bold text-teal-600 min-w-[32px]">{progress}%</span>
                    </div>

                    {/* Collapse toggle */}
                    {collapsed ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                    ) : (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                    )}
                </div>
            </button>

            {/* Tasks list */}
            {!collapsed && (
                <div className="border-t border-gray-100">
                    <div className="p-3 space-y-1">
                        {visibleTasks.map((task) => (
                            <div
                                key={task.id}
                                className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors group"
                            >
                                <div className="flex items-center gap-3">
                                    <Circle className="w-4 h-4 text-gray-300 group-hover:text-teal-400 transition-colors" />
                                    <span className="text-[13px] text-gray-700 font-medium">
                                        {task.label}
                                    </span>
                                </div>
                                <button
                                    onClick={task.onClick}
                                    className="px-3 py-1.5 bg-teal-500 text-white text-xs font-bold rounded-lg hover:bg-teal-600 transition-colors opacity-80 group-hover:opacity-100 active:scale-[0.98]"
                                >
                                    {task.cta}
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* View all link */}
                    {hasMore && (
                        <div className="px-4 pb-3">
                            <button
                                onClick={onViewAll}
                                className="text-xs font-bold text-teal-600 hover:text-teal-700 transition-colors"
                            >
                                Žiūrėti visus ({remaining.length - 3} daugiau) →
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
});

SetupProgress.displayName = 'SetupProgress';

export default SetupProgress;
