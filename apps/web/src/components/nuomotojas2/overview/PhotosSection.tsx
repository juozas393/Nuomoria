import React, { memo } from 'react';
import { Camera, ChevronRight, Upload, AlertCircle } from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface PhotosSectionProps {
    count: number;
    recommendedCount?: number;
    onUpload?: () => void;
    onManage?: () => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const PhotosSection = memo<PhotosSectionProps>(({
    count,
    recommendedCount = 8,
    onUpload,
    onManage,
}) => {
    const isComplete = count >= recommendedCount;
    const isMissing = count === 0;

    return (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isMissing ? 'bg-amber-100' : 'bg-purple-100'
                        }`}>
                        <Camera className={`w-4 h-4 ${isMissing ? 'text-amber-600' : 'text-purple-600'}`} />
                    </div>
                    <div>
                        <span className="text-sm font-bold text-gray-900">Nuotraukos</span>
                        <span className={`ml-2 text-xs ${isComplete ? 'text-emerald-600' : 'text-gray-500'}`}>
                            {count} <span className="text-gray-400">(rek: {recommendedCount}+)</span>
                        </span>
                    </div>
                </div>
                <button
                    onClick={onManage}
                    className="text-xs font-bold text-teal-600 hover:text-teal-700 transition-colors flex items-center gap-0.5"
                >
                    Tvarkyti
                    <ChevronRight className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Content */}
            <div className="p-4">
                {isMissing ? (
                    /* Missing warning */
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2 text-amber-700">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span className="text-xs">Nuotraukos padidina susidomėjimą 40%</span>
                        </div>
                        <button
                            onClick={onUpload}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-500 text-white text-xs font-bold rounded-lg hover:bg-teal-600 transition-colors active:scale-[0.98]"
                        >
                            <Upload className="w-3.5 h-3.5" />
                            Įkelti
                        </button>
                    </div>
                ) : (
                    /* Completeness indicator */
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-colors ${isComplete ? 'bg-emerald-500' : 'bg-teal-500'
                                        }`}
                                    style={{ width: `${Math.min(100, (count / recommendedCount) * 100)}%` }}
                                />
                            </div>
                            <span className="text-xs text-gray-500">
                                {isComplete ? 'Pilnas komplektas' : `Trūksta ${recommendedCount - count}`}
                            </span>
                        </div>
                        <button
                            onClick={onUpload}
                            className="text-xs font-bold text-teal-600 hover:text-teal-700 transition-colors"
                        >
                            Įkelti →
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
});

PhotosSection.displayName = 'PhotosSection';

export default PhotosSection;
