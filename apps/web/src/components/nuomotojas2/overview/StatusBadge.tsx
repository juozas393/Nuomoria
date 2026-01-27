import React from 'react';
import { StatusBadgeProps } from './types';

const variants = {
    vacant: {
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        border: 'border-amber-200',
        dot: 'bg-amber-500',
        label: 'Laisvas',
    },
    rented: {
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        dot: 'bg-emerald-500',
        label: 'Išnuomotas',
    },
    reserved: {
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        border: 'border-blue-200',
        dot: 'bg-blue-500',
        label: 'Rezervuotas',
    },
    moving_out: {
        bg: 'bg-orange-50',
        text: 'text-orange-700',
        border: 'border-orange-200',
        dot: 'bg-orange-500',
        label: 'Išsikrausto',
    },
};

const sizes = {
    sm: 'px-2 py-0.5 text-[11px]',
    md: 'px-3 py-1 text-[12px]',
    lg: 'px-4 py-1.5 text-[13px]',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
    const v = variants[status] || variants.vacant;
    const s = sizes[size];

    return (
        <span className={`inline-flex items-center gap-1.5 font-semibold rounded-full border ${v.bg} ${v.text} ${v.border} ${s}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${v.dot}`} />
            {v.label}
        </span>
    );
};

export default StatusBadge;
