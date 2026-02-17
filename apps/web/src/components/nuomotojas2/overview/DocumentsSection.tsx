import React, { memo } from 'react';
import { FileText, ChevronRight, AlertCircle, Upload } from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface DocumentsSectionProps {
    count: number;
    missingRequired?: number;
    onUpload?: () => void;
    onManage?: () => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const DocumentsSection = memo<DocumentsSectionProps>(({
    count,
    missingRequired = 0,
    onUpload,
    onManage,
}) => {
    const isEmpty = count === 0;
    const hasWarning = missingRequired > 0;

    return (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${hasWarning ? 'bg-amber-100' : 'bg-orange-100'
                        }`}>
                        <FileText className={`w-4 h-4 ${hasWarning ? 'text-amber-600' : 'text-orange-600'}`} />
                    </div>
                    <span className="text-sm font-bold text-gray-900">Dokumentai</span>
                </div>
                <button
                    onClick={onManage}
                    className="text-xs font-bold text-teal-600 hover:text-teal-700 transition-colors flex items-center gap-0.5"
                >
                    Įkelti
                    <ChevronRight className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Content */}
            <div className="p-4">
                {isEmpty ? (
                    /* Empty state */
                    <div className="flex items-center justify-between gap-4">
                        <span className="text-xs text-gray-500">Nėra įkeltų dokumentų</span>
                        <button
                            onClick={onUpload}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-500 text-white text-xs font-bold rounded-lg hover:bg-teal-600 transition-colors active:scale-[0.98]"
                        >
                            <Upload className="w-3.5 h-3.5" />
                            Įkelti
                        </button>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {/* Count display */}
                        <div className="flex items-center justify-between">
                            <span className="text-lg font-bold text-gray-900">{count}</span>
                            <span className="text-xs text-gray-500">dokumentų</span>
                        </div>

                        {/* Missing required warning */}
                        {hasWarning && (
                            <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-100 rounded-lg">
                                <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                                <span className="text-xs text-amber-700">
                                    Trūksta {missingRequired} privalomų dokumentų
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
});

DocumentsSection.displayName = 'DocumentsSection';

export default DocumentsSection;
