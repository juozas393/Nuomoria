import React, { useState, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Check, XCircle, Camera, Clock, User, Calendar } from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

export interface PendingApproval {
    id: string;
    meterId: string;
    meterName: string;
    meterCategory: 'elektra' | 'vanduo' | 'sildymas' | 'dujos';
    previousReading: number;
    submittedReading: number;
    submittedBy: string;
    submittedAt: string;
    photoUrl?: string;
    unit: string;
    consumption: number;
}

interface ApprovalQueuePanelProps {
    isOpen: boolean;
    onClose: () => void;
    pendingApprovals: PendingApproval[];
    onApprove: (approvalId: string) => Promise<void>;
    onReject: (approvalId: string, reason: string) => Promise<void>;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const ApprovalQueuePanel: React.FC<ApprovalQueuePanelProps> = ({
    isOpen,
    onClose,
    pendingApprovals,
    onApprove,
    onReject,
}) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState('');

    const currentApproval = pendingApprovals[currentIndex];
    const hasNext = currentIndex < pendingApprovals.length - 1;
    const hasPrev = currentIndex > 0;

    const goToNext = useCallback(() => {
        if (hasNext) {
            setCurrentIndex(prev => prev + 1);
        }
    }, [hasNext]);

    const goToPrev = useCallback(() => {
        if (hasPrev) {
            setCurrentIndex(prev => prev - 1);
        }
    }, [hasPrev]);

    const handleApprove = useCallback(async () => {
        if (!currentApproval) return;
        setIsProcessing(true);
        try {
            await onApprove(currentApproval.id);
            if (hasNext) {
                goToNext();
            } else if (hasPrev) {
                setCurrentIndex(prev => prev - 1);
            }
        } catch (error) {
            console.error('Failed to approve:', error);
        } finally {
            setIsProcessing(false);
        }
    }, [currentApproval, onApprove, hasNext, hasPrev, goToNext]);

    const handleReject = useCallback(async () => {
        if (!currentApproval || !rejectReason.trim()) return;
        setIsProcessing(true);
        try {
            await onReject(currentApproval.id, rejectReason);
            setShowRejectModal(false);
            setRejectReason('');
            if (hasNext) {
                goToNext();
            } else if (hasPrev) {
                setCurrentIndex(prev => prev - 1);
            }
        } catch (error) {
            console.error('Failed to reject:', error);
        } finally {
            setIsProcessing(false);
        }
    }, [currentApproval, rejectReason, onReject, hasNext, hasPrev, goToNext]);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('lt-LT', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Side Panel */}
            <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-xl flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Patvirtinimai</h2>
                        <p className="text-sm text-gray-500">
                            {currentIndex + 1} iš {pendingApprovals.length}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                {currentApproval ? (
                    <div className="flex-1 overflow-y-auto p-6">
                        {/* Meter info */}
                        <div className="mb-6">
                            <h3 className="text-xl font-medium text-gray-900 mb-2">
                                {currentApproval.meterName}
                            </h3>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                    <User className="w-4 h-4" />
                                    {currentApproval.submittedBy}
                                </span>
                                <span className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    {formatDate(currentApproval.submittedAt)}
                                </span>
                            </div>
                        </div>

                        {/* Reading comparison */}
                        <div className="bg-gray-50 rounded-lg p-4 mb-6">
                            <div className="grid grid-cols-3 gap-4 text-center">
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Ankstesnis</p>
                                    <p className="text-xl font-semibold text-gray-700">
                                        {currentApproval.previousReading.toLocaleString('lt-LT')}
                                    </p>
                                    <p className="text-xs text-gray-400">{currentApproval.unit}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Pateiktas</p>
                                    <p className="text-xl font-semibold text-teal-600">
                                        {currentApproval.submittedReading.toLocaleString('lt-LT')}
                                    </p>
                                    <p className="text-xs text-gray-400">{currentApproval.unit}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Suvartojimas</p>
                                    <p className="text-xl font-semibold text-gray-900">
                                        {currentApproval.consumption.toLocaleString('lt-LT')}
                                    </p>
                                    <p className="text-xs text-gray-400">{currentApproval.unit}</p>
                                </div>
                            </div>
                        </div>

                        {/* Photo evidence */}
                        <div className="mb-6">
                            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                <Camera className="w-4 h-4" />
                                Nuotrauka
                            </h4>
                            {currentApproval.photoUrl ? (
                                <img
                                    src={currentApproval.photoUrl}
                                    alt="Skaitiklio nuotrauka"
                                    className="w-full rounded-lg border border-gray-200"
                                />
                            ) : (
                                <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                                    <div className="text-center">
                                        <Camera className="w-8 h-8 mx-auto mb-2" />
                                        <p className="text-sm">Nuotrauka nepateikta</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Check className="w-8 h-8 text-green-600" />
                            </div>
                            <p className="text-lg font-medium text-gray-900">Visi patvirtinta!</p>
                            <p className="text-sm text-gray-500 mt-1">Nėra laukiančių patvirtinimų</p>
                        </div>
                    </div>
                )}

                {/* Footer with navigation and actions */}
                {currentApproval && (
                    <div className="border-t border-gray-200 p-4">
                        {/* Navigation */}
                        <div className="flex items-center justify-between mb-4">
                            <button
                                onClick={goToPrev}
                                disabled={!hasPrev}
                                className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                Ankstesnis
                            </button>
                            <button
                                onClick={goToNext}
                                disabled={!hasNext}
                                className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Kitas
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowRejectModal(true)}
                                disabled={isProcessing}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
                            >
                                <XCircle className="w-4 h-4" />
                                Atmesti
                            </button>
                            <button
                                onClick={handleApprove}
                                disabled={isProcessing}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
                            >
                                {isProcessing ? (
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <Check className="w-4 h-4" />
                                )}
                                Patvirtinti
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Backdrop */}
            <div
                className="fixed inset-0 z-40 bg-black/30"
                onClick={onClose}
            />

            {/* Reject reason modal */}
            {showRejectModal && (
                <div className="fixed inset-0 z-60 flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/50"
                        onClick={() => setShowRejectModal(false)}
                    />
                    <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Atmetimo priežastis</h3>
                        <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Įveskite priežastį..."
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                        />
                        <div className="flex gap-3 mt-4">
                            <button
                                onClick={() => setShowRejectModal(false)}
                                className="flex-1 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                            >
                                Atšaukti
                            </button>
                            <button
                                onClick={handleReject}
                                disabled={!rejectReason.trim() || isProcessing}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                            >
                                Atmesti
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ApprovalQueuePanel;
