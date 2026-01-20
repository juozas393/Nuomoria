import React from 'react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

// ============================================================
// CARD SKELETON
// ============================================================
export const CardSkeleton: React.FC<{ lines?: number }> = ({ lines = 3 }) => (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <Skeleton height={20} width="60%" className="mb-4" />
        {Array.from({ length: lines }).map((_, i) => (
            <Skeleton key={i} height={14} className="mb-2" />
        ))}
    </div>
);

// ============================================================
// PROFILE SKELETON
// ============================================================
export const ProfileSkeleton: React.FC = () => (
    <div className="min-h-screen relative">
        {/* Header skeleton */}
        <div className="h-56 sm:h-64 lg:h-72 bg-gray-200 animate-pulse" />

        {/* Content skeleton */}
        <div className="max-w-4xl mx-auto px-4 -mt-24 relative z-10 pb-12">
            <div className="bg-white/95 rounded-2xl shadow-xl p-6 sm:p-8">
                {/* Avatar + info */}
                <div className="flex items-center gap-5 mb-6">
                    <Skeleton circle width={112} height={112} />
                    <div className="flex-1">
                        <Skeleton height={32} width="50%" className="mb-2" />
                        <Skeleton height={16} width="40%" />
                    </div>
                </div>

                {/* Form fields */}
                <div className="space-y-4">
                    <Skeleton height={48} borderRadius={12} />
                    <div className="grid grid-cols-2 gap-4">
                        <Skeleton height={48} borderRadius={12} />
                        <Skeleton height={48} borderRadius={12} />
                    </div>
                    <Skeleton height={48} borderRadius={12} />
                </div>
            </div>
        </div>
    </div>
);

// ============================================================
// DASHBOARD SKELETON
// ============================================================
export const DashboardSkeleton: React.FC = () => (
    <div className="space-y-6 p-6">
        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                    <Skeleton height={16} width="40%" className="mb-3" />
                    <Skeleton height={28} width="60%" className="mb-2" />
                    <Skeleton height={12} width="30%" />
                </div>
            ))}
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
                <CardSkeleton lines={5} />
            </div>
            <div>
                <CardSkeleton lines={4} />
            </div>
        </div>
    </div>
);

// ============================================================
// TABLE ROW SKELETON
// ============================================================
export const TableRowSkeleton: React.FC<{ columns?: number }> = ({ columns = 5 }) => (
    <tr className="border-b border-gray-100">
        {Array.from({ length: columns }).map((_, i) => (
            <td key={i} className="px-4 py-3">
                <Skeleton height={16} />
            </td>
        ))}
    </tr>
);

// ============================================================
// MODAL SKELETON
// ============================================================
export const ModalContentSkeleton: React.FC = () => (
    <div className="p-6 space-y-4">
        <Skeleton height={24} width="50%" className="mb-6" />
        <Skeleton height={40} borderRadius={8} />
        <Skeleton height={40} borderRadius={8} />
        <Skeleton height={40} borderRadius={8} />
        <div className="flex gap-3 pt-4">
            <Skeleton height={44} borderRadius={8} className="flex-1" />
            <Skeleton height={44} borderRadius={8} className="flex-1" />
        </div>
    </div>
);

// ============================================================
// INLINE LOADING
// ============================================================
export const InlineLoading: React.FC<{ text?: string }> = ({ text = 'Kraunama...' }) => (
    <div className="flex items-center gap-2 text-gray-500 text-sm">
        <div className="w-4 h-4 border-2 border-gray-300 border-t-[#2F8481] rounded-full animate-spin" />
        <span>{text}</span>
    </div>
);

export default {
    CardSkeleton,
    ProfileSkeleton,
    DashboardSkeleton,
    TableRowSkeleton,
    ModalContentSkeleton,
    InlineLoading
};
