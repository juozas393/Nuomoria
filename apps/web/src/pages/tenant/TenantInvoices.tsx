import React, { useState } from 'react';
import {
  DocumentTextIcon,
  CalendarIcon,
  CurrencyEuroIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  CalculatorIcon,
  BeakerIcon,
  BoltIcon,
  FireIcon,
  WifiIcon,
  TrashIcon,
  InformationCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';

interface InvoiceItem {
  id: string;
  name: string;
  baseAmount: number;
  consumption: number;
  rate: number;
  total: number;
  unit: string;
  previousReading: number;
  currentReading: number;
  meterNumber: string;
  isEstimated: boolean;
  icon: React.ComponentType<any>;
}

interface DetailedInvoice {
  id: string;
  month: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  dueDate: string;
  paidDate?: string;
  description: string;
  baseRent: number;
  items: InvoiceItem[];
  lateFee: number;
  totalWithLateFee: number;
  propertyAddress: string;
  tenantName: string;
  invoiceNumber: string;
  billingPeriod: string;
  meterReadings: {
    electricity: { previous: number; current: number; meter: string };
    water: { previous: number; current: number; meter: string };
    gas: { previous: number; current: number; meter: string };
    heating: { previous: number; current: number; meter: string };
  };
  utilityRates: {
    electricity: number;
    water: number;
    gas: number;
    heating: number;
    internet: number;
    garbage: number;
  };
}

const TenantInvoices: React.FC = () => {
  const { user, logout } = useAuth();
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null);

  // Invoice data — will be fetched from Supabase when invoicing is implemented
  const invoices: DetailedInvoice[] = [];

  const filteredInvoices = selectedStatus === 'all'
    ? invoices
    : invoices.filter(invoice => invoice.status === selectedStatus);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircleIcon className="w-5 h-5 text-green-600" />;
      case 'pending':
        return <ClockIcon className="w-5 h-5 text-yellow-600" />;
      case 'overdue':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />;
      default:
        return <DocumentTextIcon className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Apmokėta';
      case 'pending':
        return 'Laukiama';
      case 'overdue':
        return 'Vėluoja';
      default:
        return status;
    }
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toFixed(2)}€`;
  };

  const getConsumptionColor = (consumption: number, unit: string) => {
    if (unit === 'kWh' && consumption > 200) return 'text-orange-600';
    if (unit === 'm³' && consumption > 15) return 'text-orange-600';
    if (consumption === 0) return 'text-gray-500';
    return 'text-green-600';
  };

  const toggleInvoiceExpansion = (invoiceId: string) => {
    setExpandedInvoice(expandedInvoice === invoiceId ? null : invoiceId);
  };

  return (
    <div className="min-h-screen bg-[#f0fafa]">
      {/* Header with logout button */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-black">Sąskaitos</h1>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={logout}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                title="Atsijungti"
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5" />
                <span className="hidden sm:inline">Atsijungti</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl">
                <DocumentTextIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Iš viso sąskaitų</p>
                <p className="text-2xl font-bold text-gray-900">{invoices.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#2F8481] rounded-xl">
                <CheckCircleIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Apmokėta</p>
                <p className="text-2xl font-bold text-gray-900">
                  {invoices.filter(i => i.status === 'paid').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl">
                <ClockIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Laukiama</p>
                <p className="text-2xl font-bold text-gray-900">
                  {invoices.filter(i => i.status === 'pending').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gray-600 rounded-xl">
                <CurrencyEuroIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Iš viso sumokėta</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(invoices.reduce((sum, invoice) => sum + invoice.amount, 0))}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 mb-8">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-bold text-gray-900">Filtruoti pagal statusą:</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedStatus('all')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors duration-200 ${selectedStatus === 'all'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                Visi
              </button>
              <button
                onClick={() => setSelectedStatus('paid')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors duration-200 ${selectedStatus === 'paid'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                Apmokėti
              </button>
              <button
                onClick={() => setSelectedStatus('pending')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors duration-200 ${selectedStatus === 'pending'
                  ? 'bg-yellow-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                Laukiami
              </button>
              <button
                onClick={() => setSelectedStatus('overdue')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors duration-200 ${selectedStatus === 'overdue'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                Vėluojantys
              </button>
            </div>
          </div>
        </div>

        {/* Invoices List */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Sąskaitų sąrašas</h2>
            <p className="text-gray-600">Jūsų mokėjimų istorija su detaliais komunalinių kainomis</p>
          </div>

          <div className="divide-y divide-gray-200">
            {filteredInvoices.map((invoice) => (
              <div key={invoice.id} className="p-6 hover:bg-gray-50 transition-colors duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${invoice.status === 'paid' ? 'bg-green-100' :
                      invoice.status === 'pending' ? 'bg-yellow-100' : 'bg-red-100'
                      }`}>
                      {getStatusIcon(invoice.status)}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{invoice.month}</h3>
                      <p className="text-sm text-gray-500">{invoice.description}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-500">Terminas: {invoice.dueDate}</span>
                        </div>
                        {invoice.paidDate && (
                          <div className="flex items-center gap-2">
                            <CheckCircleIcon className="w-4 h-4 text-green-500" />
                            <span className="text-sm text-green-600">Apmokėta: {invoice.paidDate}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">{formatCurrency(invoice.amount)}</p>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                        {getStatusText(invoice.status)}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleInvoiceExpansion(invoice.id)}
                        className="p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                      >
                        {expandedInvoice === invoice.id ? (
                          <ChevronUpIcon className="w-5 h-5" />
                        ) : (
                          <ChevronDownIcon className="w-5 h-5" />
                        )}
                      </button>
                      <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200">
                        <EyeIcon className="w-5 h-5" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200">
                        <ArrowDownTrayIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Invoice Details */}
                {expandedInvoice === invoice.id && (
                  <div className="mt-6 space-y-6">
                    {/* Invoice Header Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-xl">
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Sąskaitos informacija</h4>
                        <div className="space-y-1 text-sm">
                          <p><span className="font-medium">Sąskaitos numeris:</span> {invoice.invoiceNumber}</p>
                          <p><span className="font-medium">Atsiskaitymo laikotarpis:</span> {invoice.billingPeriod}</p>
                          <p><span className="font-medium">Nuomininkas:</span> {invoice.tenantName}</p>
                          <p><span className="font-medium">Adresas:</span> {invoice.propertyAddress}</p>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Mokėjimo informacija</h4>
                        <div className="space-y-1 text-sm">
                          <p><span className="font-medium">Bazinis nuomos mokestis:</span> {formatCurrency(invoice.baseRent)}</p>
                          <p><span className="font-medium">Komunaliniai mokesčiai:</span> {formatCurrency(invoice.amount - invoice.baseRent)}</p>
                          <p><span className="font-medium">Vėlavimo mokestis:</span> {formatCurrency(invoice.lateFee)}</p>
                          <p><span className="font-medium">Iš viso:</span> <span className="font-bold text-lg">{formatCurrency(invoice.totalWithLateFee)}</span></p>
                        </div>
                      </div>
                    </div>

                    {/* Utility Rates */}
                    <div className="p-4 bg-blue-50 rounded-xl">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <InformationCircleIcon className="w-5 h-5 text-blue-600" />
                        Komunalinių paslaugų kainos
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <BoltIcon className="w-4 h-4 text-yellow-600" />
                          <span>Elektra:</span>
                          <span className="font-medium">{invoice.utilityRates.electricity}€/kWh</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <BeakerIcon className="w-4 h-4 text-blue-600" />
                          <span>Vanduo:</span>
                          <span className="font-medium">{invoice.utilityRates.water}€/m³</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FireIcon className="w-4 h-4 text-orange-600" />
                          <span>Dujos:</span>
                          <span className="font-medium">{invoice.utilityRates.gas}€/m³</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FireIcon className="w-4 h-4 text-red-600" />
                          <span>Šildymas:</span>
                          <span className="font-medium">{invoice.utilityRates.heating}€/kWh</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <WifiIcon className="w-4 h-4 text-purple-600" />
                          <span>Internetas:</span>
                          <span className="font-medium">{formatCurrency(invoice.utilityRates.internet)}/mėn</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <TrashIcon className="w-4 h-4 text-gray-600" />
                          <span>Šiukšlės:</span>
                          <span className="font-medium">{formatCurrency(invoice.utilityRates.garbage)}/mėn</span>
                        </div>
                      </div>
                    </div>

                    {/* Meter Readings */}
                    <div className="p-4 bg-green-50 rounded-xl">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <CalculatorIcon className="w-5 h-5 text-green-600" />
                        Skaitliukai
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="bg-white p-3 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <BoltIcon className="w-4 h-4 text-yellow-600" />
                            <span className="font-medium">Elektros skaitliukas {invoice.meterReadings.electricity.meter}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Ankstesnis: {invoice.meterReadings.electricity.previous} kWh</span>
                            <span>Dabartinis: {invoice.meterReadings.electricity.current} kWh</span>
                          </div>
                        </div>
                        <div className="bg-white p-3 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <BeakerIcon className="w-4 h-4 text-blue-600" />
                            <span className="font-medium">Vandens skaitliukas {invoice.meterReadings.water.meter}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Ankstesnis: {invoice.meterReadings.water.previous} m³</span>
                            <span>Dabartinis: {invoice.meterReadings.water.current} m³</span>
                          </div>
                        </div>
                        <div className="bg-white p-3 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <FireIcon className="w-4 h-4 text-orange-600" />
                            <span className="font-medium">Dujų skaitliukas {invoice.meterReadings.gas.meter}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Ankstesnis: {invoice.meterReadings.gas.previous} m³</span>
                            <span>Dabartinis: {invoice.meterReadings.gas.current} m³</span>
                          </div>
                        </div>
                        <div className="bg-white p-3 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <FireIcon className="w-4 h-4 text-red-600" />
                            <span className="font-medium">Šildymo skaitliukas {invoice.meterReadings.heating.meter}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Ankstesnis: {invoice.meterReadings.heating.previous} kWh</span>
                            <span>Dabartinis: {invoice.meterReadings.heating.current} kWh</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Detailed Items */}
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">Detalus sąskaitos sąrašas</h4>
                      <div className="space-y-3">
                        {invoice.items.map((item) => {
                          const consumption = item.currentReading - item.previousReading;
                          const consumptionColor = getConsumptionColor(consumption, item.unit);
                          const IconComponent = item.icon;

                          return (
                            <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                              <div className="flex items-center gap-4">
                                <div className="p-2 bg-white rounded-lg">
                                  <IconComponent className="w-5 h-5 text-gray-600" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium text-gray-900">{item.name}</p>
                                    {item.isEstimated && (
                                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                                        Įvertinta
                                      </span>
                                    )}
                                  </div>
                                  {item.meterNumber && (
                                    <p className="text-sm text-gray-500">Skaitliukas: {item.meterNumber}</p>
                                  )}
                                  {consumption > 0 ? (
                                    <p className="text-sm text-gray-500">
                                      {item.previousReading} → {item.currentReading} = {consumption} {item.unit} × {item.rate}€/{item.unit}
                                    </p>
                                  ) : (
                                    <p className="text-sm text-gray-500">Fiksuotas mokestis</p>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <p className={`font-bold text-lg ${consumptionColor}`}>{formatCurrency(item.total)}</p>
                                {consumption > 0 && (
                                  <p className="text-xs text-gray-500">{consumption} {item.unit}</p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {filteredInvoices.length === 0 && (
            <div className="p-12 text-center">
              <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Sąskaitų nerasta</h3>
              <p className="text-gray-500">Šiuo metu sąskaitų nėra. Kai nuomotojas sukurs sąskaitą, ji bus rodoma čia.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TenantInvoices;