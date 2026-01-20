import React from 'react';
import { TenantLease, STATUS_LABELS } from '../types/tenant.types';
import { ChevronDown, Home, Check } from 'lucide-react';

interface LeaseSelectorProps {
    leases: TenantLease[];
    selectedLease: TenantLease | null;
    onSelect: (leaseId: string) => void;
}

export const LeaseSelector: React.FC<LeaseSelectorProps> = ({
    leases,
    selectedLease,
    onSelect,
}) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    // Close on outside click
    React.useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (leases.length === 0) {
        return (
            <div className="text-sm text-gray-500">
                Nėra aktyvių sutarčių
            </div>
        );
    }

    if (leases.length === 1 && selectedLease) {
        // Single lease - just display, no dropdown
        return (
            <div className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200">
                <Home className="w-4 h-4 text-[#2F8481]" />
                <div className="text-sm">
                    <span className="font-medium text-gray-900">{selectedLease.address}</span>
                    <span className="text-gray-500"> • {selectedLease.unitLabel}</span>
                </div>
                <span className={`ml-2 px-2 py-0.5 text-xs font-medium rounded-full ${selectedLease.status === 'active'
                        ? 'bg-emerald-100 text-emerald-700'
                        : selectedLease.status === 'ending_soon'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-gray-100 text-gray-600'
                    }`}>
                    {STATUS_LABELS.lease[selectedLease.status]}
                </span>
            </div>
        );
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200 hover:border-[#2F8481] transition-colors min-w-[280px]"
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                aria-label="Pasirinkti būstą"
            >
                <Home className="w-4 h-4 text-[#2F8481]" />
                {selectedLease ? (
                    <div className="flex-1 text-left text-sm">
                        <span className="font-medium text-gray-900">{selectedLease.address}</span>
                        <span className="text-gray-500"> • {selectedLease.unitLabel}</span>
                    </div>
                ) : (
                    <span className="flex-1 text-left text-sm text-gray-500">
                        Pasirinkite būstą...
                    </span>
                )}
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div
                    className="absolute top-full left-0 mt-2 w-full bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50"
                    role="listbox"
                >
                    {leases.map((lease) => (
                        <button
                            key={lease.id}
                            onClick={() => {
                                onSelect(lease.id);
                                setIsOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors ${selectedLease?.id === lease.id ? 'bg-[#2F8481]/5' : ''
                                }`}
                            role="option"
                            aria-selected={selectedLease?.id === lease.id}
                        >
                            <div className="flex-1">
                                <div className="text-sm font-medium text-gray-900">
                                    {lease.address}
                                </div>
                                <div className="text-xs text-gray-500">
                                    {lease.unitLabel} • {lease.rentAmount} €/mėn
                                </div>
                            </div>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${lease.status === 'active'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : lease.status === 'ending_soon'
                                        ? 'bg-amber-100 text-amber-700'
                                        : 'bg-gray-100 text-gray-600'
                                }`}>
                                {STATUS_LABELS.lease[lease.status]}
                            </span>
                            {selectedLease?.id === lease.id && (
                                <Check className="w-4 h-4 text-[#2F8481]" />
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
