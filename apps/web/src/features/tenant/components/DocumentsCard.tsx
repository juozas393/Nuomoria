import React from 'react';
import { DocumentItem, STATUS_LABELS } from '../types/tenant.types';
import { FileText, Download, Upload, File, FileCheck, FileSpreadsheet } from 'lucide-react';

interface DocumentsCardProps {
    documents: DocumentItem[];
    loading?: boolean;
    onUpload?: () => void;
}

const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (dateStr: string): string => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getCategoryIcon = (category: DocumentItem['category']) => {
    switch (category) {
        case 'contract':
            return FileCheck;
        case 'invoice':
            return FileSpreadsheet;
        default:
            return File;
    }
};

const getCategoryColor = (category: DocumentItem['category']): string => {
    switch (category) {
        case 'contract':
            return 'bg-blue-100 text-blue-600';
        case 'invoice':
            return 'bg-emerald-100 text-emerald-600';
        case 'act':
            return 'bg-purple-100 text-purple-600';
        default:
            return 'bg-gray-100 text-gray-600';
    }
};

export const DocumentsCard: React.FC<DocumentsCardProps> = ({
    documents,
    loading,
    onUpload,
}) => {
    // Group by category
    const grouped = documents.reduce((acc, doc) => {
        if (!acc[doc.category]) acc[doc.category] = [];
        acc[doc.category].push(doc);
        return acc;
    }, {} as Record<string, DocumentItem[]>);

    if (loading) {
        return (
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm animate-pulse">
                <div className="w-32 h-6 bg-gray-200 rounded mb-6" />
                <div className="space-y-3">
                    <div className="h-14 bg-gray-100 rounded-xl" />
                    <div className="h-14 bg-gray-100 rounded-xl" />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">
                    Dokumentai
                </h2>
                <FileText className="w-5 h-5 text-gray-400" />
            </div>

            {documents.length > 0 ? (
                <div className="space-y-2 mb-4">
                    {documents.slice(0, 4).map((doc) => {
                        const Icon = getCategoryIcon(doc.category);
                        return (
                            <div
                                key={doc.id}
                                className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group"
                            >
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${getCategoryColor(doc.category)}`}>
                                    <Icon className="w-4.5 h-4.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-gray-900 truncate">
                                        {doc.name}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {STATUS_LABELS.document[doc.category]} • {formatFileSize(doc.fileSize)}
                                    </div>
                                </div>
                                <button
                                    className="p-2 text-gray-400 hover:text-[#2F8481] hover:bg-[#2F8481]/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                    title="Atsisiųsti"
                                >
                                    <Download className="w-4 h-4" />
                                </button>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="rounded-xl bg-gray-50 p-6 text-center mb-4">
                    <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <div className="text-gray-500 text-sm">
                        Dokumentų kol kas nėra
                    </div>
                </div>
            )}

            {/* Upload Button */}
            <button
                onClick={onUpload}
                className="w-full h-10 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
                <Upload className="w-4 h-4" />
                Įkelti dokumentą
            </button>
        </div>
    );
};
