import React, { memo } from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { RentReadyChecklistProps } from './types';

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

export const RentReadyChecklist = memo<RentReadyChecklistProps>(({
    tasks,
    progress,
    isVacant,
}) => {
    if (!isVacant) return null;

    const completedCount = tasks.filter(t => t.complete).length;
    const isComplete = progress === 100;

    return (
        <div
            className="rounded-2xl border border-gray-100 p-5"
            style={cardStyle}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${ANIMATION.hover} ${isComplete ? 'bg-emerald-50' : 'bg-white/80'}`}>
                        <Check className={`w-5 h-5 transition-colors ${ANIMATION.hover} ${isComplete ? 'text-emerald-600' : 'text-gray-400'}`} />
                    </div>
                    <div>
                        <h3 className="text-[15px] font-semibold text-gray-900">Paruošti nuomai</h3>
                        <p className="text-[13px] text-gray-500">{completedCount} iš {tasks.length} užduočių</p>
                    </div>
                </div>
                <span className={`text-[14px] font-bold transition-colors ${ANIMATION.hover} ${isComplete ? 'text-emerald-600' : 'text-gray-400'}`}>
                    {progress}%
                </span>
            </div>

            {/* Progress bar - using transform for smooth animation */}
            <div className="h-2 bg-gray-100 rounded-full mb-4 overflow-hidden">
                <div
                    className={`h-full rounded-full transition-transform duration-500 ease-out origin-left ${isComplete ? 'bg-emerald-500' : 'bg-gradient-to-r from-teal-500 to-cyan-500'}`}
                    style={{ transform: `scaleX(${progress / 100})` }}
                />
            </div>

            {/* Task list */}
            <div className="space-y-1">
                {tasks.sort((a, b) => a.priority - b.priority).map((task) => (
                    <button
                        key={task.id}
                        onClick={task.action}
                        disabled={task.complete}
                        className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${ANIMATION.hover} ${task.complete
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-white/80 text-gray-700 hover:bg-white active:scale-[0.99]'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            {task.complete ? (
                                <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                                    <Check className="w-3 h-3 text-white" />
                                </div>
                            ) : (
                                <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                            )}
                            <span className={`text-[13px] font-medium ${task.complete ? 'line-through opacity-70' : ''}`}>
                                {task.label}
                            </span>
                        </div>
                        {!task.complete && task.action && (
                            <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${ANIMATION.hover}`} />
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
});

RentReadyChecklist.displayName = 'RentReadyChecklist';

export default RentReadyChecklist;
