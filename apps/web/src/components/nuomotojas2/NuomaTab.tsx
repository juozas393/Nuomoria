import React, { useState } from 'react';
import {
    Euro, Calendar, FileText, User, PawPrint, Cigarette, Clock,
    CreditCard, Plus, Edit3, Check, ArrowRight
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface NuomaTabProps {
    property: {
        id: string;
        rent?: number;
        deposit_amount?: number;
        extended_details?: {
            min_term_months?: number;
            pets_allowed?: boolean;
            pets_deposit?: number;
            smoking_allowed?: boolean;
            utilities_paid_by?: 'tenant' | 'landlord' | 'mixed';
            payment_due_day?: number;
            notes_internal?: string;
        };
    };
    tenant?: {
        name?: string;
        email?: string;
        phone?: string;
        status?: string;
    };
    lease?: {
        startDate?: string;
        endDate?: string;
        status?: 'active' | 'pending' | 'ended';
    };
    onEditPricing?: () => void;
    onEditRules?: () => void;
    onAddTenant?: () => void;
    onManageTenant?: () => void;
    onNavigateTab?: (tab: string) => void;
}

// =============================================================================
// HELPERS
// =============================================================================

const hasMeaningfulValue = (value: any): boolean => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'number' && value === 0) return false;
    if (typeof value === 'string' && !value) return false;
    return true;
};

const formatDate = (dateStr?: string): string => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('lt-LT', { year: 'numeric', month: '2-digit', day: '2-digit' });
};

// =============================================================================
// SECTION CARD
// =============================================================================

const SectionCard: React.FC<{
    title: string;
    icon: React.ReactNode;
    onEdit?: () => void;
    children: React.ReactNode;
}> = ({ title, icon, onEdit, children }) => (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center text-gray-600">
                    {icon}
                </div>
                <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            </div>
            {onEdit && (
                <button onClick={onEdit} className="text-sm font-medium text-teal-700 hover:text-teal-800 flex items-center gap-1">
                    <Edit3 className="w-3.5 h-3.5" />
                    Redaguoti
                </button>
            )}
        </div>
        <div className="p-4">{children}</div>
    </div>
);

// =============================================================================
// DATA ROW
// =============================================================================

const DataRow: React.FC<{
    label: string;
    value: any;
    unit?: string;
    onAdd?: () => void;
}> = ({ label, value, unit, onAdd }) => (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
        <span className="text-sm text-gray-500">{label}</span>
        {hasMeaningfulValue(value) ? (
            <span className="text-sm font-medium text-gray-900">{value}{unit ? ` ${unit}` : ''}</span>
        ) : (
            <button onClick={onAdd} className="text-sm text-teal-600 font-medium hover:text-teal-700">
                + Pridėti
            </button>
        )}
    </div>
);

// =============================================================================
// COMPONENT
// =============================================================================

export const NuomaTab: React.FC<NuomaTabProps> = ({
    property,
    tenant,
    lease,
    onEditPricing,
    onEditRules,
    onAddTenant,
    onManageTenant,
    onNavigateTab
}) => {
    const extendedDetails = property.extended_details || {};
    const isOccupied = tenant?.name && tenant?.status !== 'vacant';

    return (
        <div className="space-y-4 max-w-3xl">

            {/* === KAINODARA === */}
            <SectionCard title="Kainodara" icon={<Euro className="w-4 h-4" />} onEdit={onEditPricing}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                    <DataRow
                        label="Nuomos kaina"
                        value={property.rent ? `€${property.rent}` : undefined}
                        unit="/mėn"
                        onAdd={onEditPricing}
                    />
                    <DataRow
                        label="Depozitas"
                        value={property.deposit_amount ? `€${property.deposit_amount}` : undefined}
                        onAdd={onEditPricing}
                    />
                    <DataRow
                        label="Mokėjimo diena"
                        value={extendedDetails.payment_due_day}
                        unit="d."
                        onAdd={onEditPricing}
                    />
                    <DataRow
                        label="Komunaliniai"
                        value={
                            extendedDetails.utilities_paid_by === 'tenant' ? 'Apmoka nuomininkas' :
                                extendedDetails.utilities_paid_by === 'landlord' ? 'Įskaičiuota' :
                                    extendedDetails.utilities_paid_by === 'mixed' ? 'Dalinai' : undefined
                        }
                        onAdd={onEditPricing}
                    />
                </div>
            </SectionCard>

            {/* === NUOMOS TAISYKLĖS === */}
            <SectionCard title="Nuomos taisyklės" icon={<FileText className="w-4 h-4" />} onEdit={onEditRules}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                    <DataRow
                        label="Min. nuomos terminas"
                        value={extendedDetails.min_term_months}
                        unit="mėn."
                        onAdd={onEditRules}
                    />
                    <DataRow
                        label="Augintiniai"
                        value={
                            extendedDetails.pets_allowed === true ? 'Leidžiama' :
                                extendedDetails.pets_allowed === false ? 'Neleidžiama' : undefined
                        }
                        onAdd={onEditRules}
                    />
                    <DataRow
                        label="Rūkymas"
                        value={
                            extendedDetails.smoking_allowed === true ? 'Leidžiama' :
                                extendedDetails.smoking_allowed === false ? 'Neleidžiama' : undefined
                        }
                        onAdd={onEditRules}
                    />
                    {extendedDetails.pets_allowed && (
                        <DataRow
                            label="Augintinių depozitas"
                            value={extendedDetails.pets_deposit ? `€${extendedDetails.pets_deposit}` : undefined}
                            onAdd={onEditRules}
                        />
                    )}
                </div>
            </SectionCard>

            {/* === NUOMININKAS === */}
            <SectionCard title="Nuomininkas" icon={<User className="w-4 h-4" />}>
                {isOccupied ? (
                    <div className="space-y-4">
                        {/* Tenant info */}
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-teal-50 rounded-full flex items-center justify-center">
                                <User className="w-6 h-6 text-teal-700" />
                            </div>
                            <div className="flex-1">
                                <div className="font-medium text-gray-900">{tenant?.name}</div>
                                <div className="text-sm text-gray-500">{tenant?.email || tenant?.phone || 'Kontaktų nėra'}</div>
                            </div>
                            <span className="px-2 py-1 bg-teal-50 text-teal-700 text-xs font-medium rounded-full">
                                Aktyvus
                            </span>
                        </div>

                        {/* Lease period */}
                        {lease && (
                            <div className="bg-gray-50 rounded-lg p-3">
                                <div className="text-xs text-gray-500 mb-1">Nuomos periodas</div>
                                <div className="text-sm font-medium text-gray-900">
                                    {formatDate(lease.startDate)} – {formatDate(lease.endDate)}
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2">
                            <button
                                onClick={onManageTenant}
                                className="flex-1 py-2 px-4 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                Valdyti nuomininką
                            </button>
                            <button
                                onClick={() => onNavigateTab?.('dokumentai')}
                                className="py-2 px-4 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                Sutartis →
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-6">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <User className="w-6 h-6 text-gray-400" />
                        </div>
                        <p className="text-gray-600 font-medium mb-1">Nuomininko nėra</p>
                        <p className="text-sm text-gray-500 mb-4">Pridėkite nuomininką pradėti nuomai</p>
                        <button
                            onClick={onAddTenant}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Pridėti nuomininką
                        </button>
                    </div>
                )}
            </SectionCard>

            {/* === VIDINĖS PASTABOS (perkelta iš Būstas) === */}
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
                <button
                    onClick={() => { }}
                    className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                            <FileText className="w-4 h-4 text-amber-600" />
                        </div>
                        <div className="text-left">
                            <h3 className="text-sm font-semibold text-gray-900">Vidinės pastabos</h3>
                            <p className="text-xs text-gray-500">Tik nuomotojui matomos</p>
                        </div>
                    </div>
                </button>
                <div className="border-t border-gray-100 p-4">
                    {property.extended_details?.notes_internal ? (
                        <p className="text-sm text-gray-700">
                            {property.extended_details.notes_internal}
                        </p>
                    ) : (
                        <p className="text-sm text-gray-400 italic">Pastabų nėra. Pridėkite pastabas redaguodami būstą.</p>
                    )}
                </div>
            </div>

            {/* === QUICK LINK TO DOCUMENTS === */}
            <button
                onClick={() => onNavigateTab?.('dokumentai')}
                className="w-full p-4 bg-white border border-gray-100 rounded-xl flex items-center justify-between hover:border-gray-200 hover:shadow-sm transition-colors group"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center group-hover:bg-teal-50 transition-colors">
                        <FileText className="w-5 h-5 text-gray-600 group-hover:text-teal-600" />
                    </div>
                    <div className="text-left">
                        <div className="text-sm font-medium text-gray-900">Sutartis ir dokumentai</div>
                        <div className="text-xs text-gray-500">Kurti, įkelti arba peržiūrėti</div>
                    </div>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-teal-600" />
            </button>
        </div>
    );
};

export default NuomaTab;
