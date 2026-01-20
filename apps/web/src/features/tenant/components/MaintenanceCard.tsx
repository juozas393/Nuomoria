import React from 'react';
import { MaintenanceRequest, STATUS_LABELS } from '../types/tenant.types';
import { Wrench, Plus, AlertTriangle, Clock, CheckCircle } from 'lucide-react';

interface MaintenanceCardProps {
    requests: MaintenanceRequest[];
    loading?: boolean;
    onCreateRequest?: () => void;
}

const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Ką tik';
    if (diffHours < 24) return `Prieš ${diffHours} val.`;
    if (diffDays === 1) return 'Vakar';
    if (diffDays < 7) return `Prieš ${diffDays} d.`;
    return date.toLocaleDateString('lt-LT', { month: 'short', day: 'numeric' });
};

const StatusIcon: React.FC<{ status: MaintenanceRequest['status'] }> = ({ status }) => {
    switch (status) {
        case 'received':
            return <Clock className="w-4 h-4 text-amber-600" />;
        case 'in_progress':
            return <Wrench className="w-4 h-4 text-blue-600" />;
        case 'completed':
            return <CheckCircle className="w-4 h-4 text-emerald-600" />;
    }
};

const getStatusColor = (status: MaintenanceRequest['status']): string => {
    switch (status) {
        case 'received':
            return 'bg-amber-100 text-amber-700';
        case 'in_progress':
            return 'bg-blue-100 text-blue-700';
        case 'completed':
            return 'bg-emerald-100 text-emerald-700';
    }
};

const getPriorityIcon = (priority: MaintenanceRequest['priority']): React.ReactNode => {
    if (priority === 'urgent' || priority === 'high') {
        return <AlertTriangle className="w-3.5 h-3.5 text-red-500" />;
    }
    return null;
};

export const MaintenanceCard: React.FC<MaintenanceCardProps> = ({
    requests,
    loading,
    onCreateRequest,
}) => {
    const openRequests = requests.filter(r => r.status !== 'completed');

    if (loading) {
        return (
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm animate-pulse">
                <div className="w-40 h-6 bg-gray-200 rounded mb-6" />
                <div className="space-y-3">
                    <div className="h-16 bg-gray-100 rounded-xl" />
                    <div className="h-16 bg-gray-100 rounded-xl" />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">
                    Remonto užklausos
                </h2>
                <Wrench className="w-5 h-5 text-gray-400" />
            </div>

            {/* Open Requests */}
            {openRequests.length > 0 ? (
                <div className="space-y-3 mb-4">
                    {openRequests.slice(0, 3).map((request) => (
                        <div
                            key={request.id}
                            className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                        >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${request.status === 'in_progress' ? 'bg-blue-100' : 'bg-amber-100'
                                }`}>
                                <StatusIcon status={request.status} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-900 truncate">
                                        {request.title}
                                    </span>
                                    {getPriorityIcon(request.priority)}
                                </div>
                                <div className="text-xs text-gray-500 mt-0.5">
                                    {formatDate(request.createdAt)}
                                </div>
                            </div>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap ${getStatusColor(request.status)}`}>
                                {STATUS_LABELS.maintenance[request.status]}
                            </span>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="rounded-xl bg-gray-50 p-6 text-center mb-4">
                    <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    <div className="text-gray-600 text-sm font-medium">
                        Viskas tvarkoje!
                    </div>
                    <div className="text-gray-500 text-xs mt-1">
                        Atvirų užklausų nėra
                    </div>
                </div>
            )}

            {/* Create Request Button */}
            <button
                onClick={onCreateRequest}
                className="w-full h-10 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
                <Plus className="w-4 h-4" />
                Pranešti apie gedimą
            </button>
        </div>
    );
};
