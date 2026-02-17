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

interface SetupProgressCardProps {
    tasks: SetupTask[];
    readinessPercent?: number;
}

// =============================================================================
// COMPONENT — RULE 2: CONNECTED ITEM+ACTION, COMPLETED SEPARATED
// =============================================================================

export const SetupProgressCard = memo<SetupProgressCardProps>(({
    tasks,
    readinessPercent = 0,
}) => {
    const remainingTasks = tasks.filter(t => !t.done);
    const completedTasks = tasks.filter(t => t.done);
    const completedCount = completedTasks.length;
    const remainingCount = remainingTasks.length;
    const progress = Math.round((completedCount / tasks.length) * 100);

    // RULE 2: Open by default when <50%
    const [collapsed, setCollapsed] = useState(readinessPercent >= 50);
    const [showCompleted, setShowCompleted] = useState(false);

    const isComplete = remainingCount === 0;

    // Success state
    if (isComplete) {
        return (
            <div className="bg-primary-light border border-primary/20 rounded-lg p-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="text-xs font-medium text-primary-dark">Būstas paruoštas nuomai</span>
                <span className="ml-auto text-xs text-primary font-medium">100%</span>
            </div>
        );
    }

    return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            {/* Header - shows remaining count */}
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Circle className="w-4 h-4 text-gray-400" />
                    <span className="text-xs font-medium text-gray-700">
                        Kas liko iki nuomos
                    </span>
                    {/* RULE 2: Show "X liko" not "X iš Y" */}
                    <span className="text-[10px] text-amber-600 font-medium bg-amber-50 px-1.5 py-0.5 rounded">
                        {remainingCount} liko
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-primary rounded-full transition-colors duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <span className="text-[10px] font-medium text-gray-500 min-w-[28px] text-right">{progress}%</span>

                    {collapsed ? (
                        <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                    ) : (
                        <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
                    )}
                </div>
            </button>

            {/* RULE 2: Remaining tasks only (main list) */}
            {!collapsed && (
                <div className="border-t border-gray-100 px-2 py-2 space-y-0.5">
                    {remainingTasks.map((task) => (
                        <div
                            key={task.id}
                            className="flex items-center justify-between py-2 px-2 rounded-md hover:bg-gray-50 transition-colors group"
                        >
                            <div className="flex items-center gap-2.5">
                                <Circle className="w-4 h-4 text-gray-300 group-hover:text-primary/40 transition-colors" />
                                <span className="text-xs text-gray-700">{task.label}</span>
                            </div>

                            {/* RULE 2: Action as connected compact button */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    task.onClick?.();
                                }}
                                className="text-xs text-primary hover:text-primary-hover font-medium px-2 py-1 rounded hover:bg-primary-light transition-colors"
                            >
                                {task.cta}
                            </button>
                        </div>
                    ))}

                    {/* RULE 2: Completed items collapsed under accordion */}
                    {completedCount > 0 && (
                        <div className="border-t border-gray-100 mt-2 pt-2">
                            <button
                                onClick={() => setShowCompleted(!showCompleted)}
                                className="flex items-center gap-1.5 text-[10px] text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                {showCompleted ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                Atlikta ({completedCount})
                            </button>

                            {showCompleted && (
                                <div className="mt-1 space-y-0.5">
                                    {completedTasks.map((task) => (
                                        <div key={task.id} className="flex items-center gap-2 py-1 px-2">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                                            <span className="text-[11px] text-gray-400">{task.label}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
});

SetupProgressCard.displayName = 'SetupProgressCard';

export default SetupProgressCard;
