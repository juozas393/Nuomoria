import React, { useState } from 'react';
import {
  CheckIcon,
  XMarkIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  DocumentCheckIcon
} from '@heroicons/react/24/outline';
import {
  Droplets,
  Bolt,
  Zap,
  Flame,
  Wifi,
  Trash2,
  Fan,
  ArrowUpDown,
  Gauge
} from 'lucide-react';

interface ReadingSubmission {
  id: string;
  requestId: string;
  meterId: string;
  meterName: string;
  unitId: string;
  unitNumber: string;
  tenantName: string;
  value: number;
  photoUrl: string;
  submittedAt: string;
  status: 'submitted' | 'approved' | 'rejected';
  period: string;
}

interface ReadingsInboxProps {
  isOpen: boolean;
  onClose: () => void;
  readingSubmissions: ReadingSubmission[];
  onApproveSubmission: (submissionId: string) => void;
  onRejectSubmission: (submissionId: string, reason: string) => void;
  onViewPhoto: (photoUrl: string) => void;
}

export const ReadingsInbox: React.FC<ReadingsInboxProps> = ({
  isOpen,
  onClose,
  readingSubmissions,
  onApproveSubmission,
  onRejectSubmission,
  onViewPhoto
}) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'submitted' | 'approved' | 'rejected'>('all');
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const filteredSubmissions = readingSubmissions.filter(submission =>
    filterStatus === 'all' || submission.status === filterStatus
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted':
        return <ClockIcon className="w-4 h-4 text-orange-500" />;
      case 'approved':
        return <CheckIcon className="w-4 h-4 text-green-500" />;
      case 'rejected':
        return <XMarkIcon className="w-4 h-4 text-red-500" />;
      default:
        return <ClockIcon className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'Laukia patvirtinimo';
      case 'approved':
        return 'Patvirtinta';
      case 'rejected':
        return 'Atmesta';
      default:
        return 'Nežinomas';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleReject = (submissionId: string) => {
    if (!rejectReason.trim()) {
      alert('Įveskite atmetimo priežastį');
      return;
    }
    onRejectSubmission(submissionId, rejectReason);
    setRejectingId(null);
    setRejectReason('');
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const getMeterIcon = (name: string) => {
    if (name.includes('Vanduo')) return <Droplets className="w-6 h-6" />;
    if (name.includes('Elektra')) return <Zap className="w-6 h-6" />;
    if (name.includes('Šildymas')) return <Flame className="w-6 h-6" />;
    if (name.includes('Internetas')) return <Wifi className="w-6 h-6" />;
    if (name.includes('Šiukšlės')) return <Trash2 className="w-6 h-6" />;
    if (name.includes('Dujos')) return <Flame className="w-6 h-6" />;
    if (name.includes('Vėdinimas')) return <Fan className="w-6 h-6" />;
    if (name.includes('Liftas')) return <ArrowUpDown className="w-6 h-6" />;
    return <Gauge className="w-6 h-6" />;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200">
          <div className="flex items-center gap-3">
            <DocumentCheckIcon className="w-6 h-6 text-[#2F8481]" />
            <h2 className="text-xl font-semibold text-neutral-900">
              Gauti skaitliukai ({readingSubmissions.length})
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="space-y-4">
            {/* Status Filter */}
            <div className="flex justify-end">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481]"
              >
                <option value="all">Visi ({readingSubmissions.length})</option>
                <option value="submitted">Laukia ({readingSubmissions.filter(s => s.status === 'submitted').length})</option>
                <option value="approved">Patvirtinti ({readingSubmissions.filter(s => s.status === 'approved').length})</option>
                <option value="rejected">Atmesti ({readingSubmissions.filter(s => s.status === 'rejected').length})</option>
              </select>
            </div>

            {/* Submissions List */}
            <div className="space-y-3">
              {filteredSubmissions.map((submission) => (
                <div
                  key={submission.id}
                  className="bg-white border border-neutral-200 rounded-lg p-4 hover:border-[#2F8481] transition-colors"
                >
                  <div className="flex items-start justify-between">
                    {/* Left side - Meter info */}
                    <div className="flex items-start gap-3 flex-1">
                      <span className="text-2xl">{getMeterIcon(submission.meterName)}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-neutral-900">{submission.meterName}</h3>
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(submission.status)}`}>
                            {getStatusIcon(submission.status)}
                            {getStatusText(submission.status)}
                          </span>
                        </div>
                        <div className="text-sm text-neutral-600 space-y-1">
                          <p>Butas: <span className="font-medium">{submission.unitNumber}</span></p>
                          <p>Nuomininkas: <span className="font-medium">{submission.tenantName}</span></p>
                          <p>Laikotarpis: <span className="font-medium">{submission.period}</span></p>
                          <p>Rodmuo: <span className="font-medium text-lg">{submission.value}</span></p>
                          <p>Pateikta: <span className="font-medium">{formatDate(submission.submittedAt)}</span></p>
                        </div>
                      </div>
                    </div>

                    {/* Right side - Actions */}
                    <div className="flex items-center gap-2 ml-4">
                      {/* View Photo */}
                      <button
                        onClick={() => onViewPhoto(submission.photoUrl)}
                        className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                        title="Peržiūrėti nuotrauką"
                      >
                        <EyeIcon className="w-4 h-4 text-neutral-600" />
                      </button>

                      {/* Approve/Reject buttons - only for submitted status */}
                      {submission.status === 'submitted' && (
                        <>
                          <button
                            onClick={() => onApproveSubmission(submission.id)}
                            className="p-2 hover:bg-green-100 rounded-lg transition-colors"
                            title="Patvirtinti"
                          >
                            <CheckIcon className="w-4 h-4 text-green-600" />
                          </button>
                          <button
                            onClick={() => setRejectingId(submission.id)}
                            className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                            title="Atmesti"
                          >
                            <XMarkIcon className="w-4 h-4 text-red-600" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Reject Reason Modal */}
                  {rejectingId === submission.id && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <ExclamationTriangleIcon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-red-800 mb-2">
                            Atmetimo priežastis
                          </label>
                          <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Įveskite priežastį, kodėl atmetate šį rodmenį..."
                            className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
                            rows={3}
                          />
                          <div className="flex items-center gap-2 mt-3">
                            <button
                              onClick={() => handleReject(submission.id)}
                              className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
                            >
                              Atmesti
                            </button>
                            <button
                              onClick={() => {
                                setRejectingId(null);
                                setRejectReason('');
                              }}
                              className="px-3 py-1 text-red-600 hover:text-red-700 text-sm font-medium"
                            >
                              Atšaukti
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {filteredSubmissions.length === 0 && (
                <div className="text-center py-12 text-neutral-500">
                  <DocumentCheckIcon className="w-16 h-16 mx-auto mb-4 text-neutral-300" />
                  <p className="text-lg font-medium mb-2">
                    {filterStatus === 'all'
                      ? 'Nėra gautų rodmenų'
                      : `Nėra rodmenų su statusu "${getStatusText(filterStatus)}"`
                    }
                  </p>
                  <p className="text-sm">
                    {filterStatus === 'all'
                      ? 'Nuomininkas dar nepateikė rodmenų'
                      : 'Visi skaitliukai jau apdoroti'
                    }
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
