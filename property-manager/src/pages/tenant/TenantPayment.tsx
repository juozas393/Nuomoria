import React, { useState, useEffect } from 'react';
import { 
  CreditCardIcon, 
  DocumentTextIcon,
  CalculatorIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  ClockIcon,
  CalendarIcon,
  InformationCircleIcon,
  ShieldCheckIcon,
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
}

interface PaymentMethod {
  id: string;
  name: string;
  type: 'card' | 'bank' | 'cash';
  last4?: string;
  isDefault: boolean;
  isActive: boolean;
}

interface PaymentValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

const TenantPayment: React.FC = () => {
  const { user, logout } = useAuth();
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('card-1');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Mock invoice data with realistic meter readings
  const invoice = {
    id: 'INV-2024-001',
    month: 'Sausis 2024',
    dueDate: '2024-01-15',
    status: 'pending',
    baseRent: 850,
    items: [
      {
        id: '1',
        name: 'Elektros energija',
        baseAmount: 0,
        consumption: 245, // kWh
        rate: 0.12, // €/kWh
        total: 29.40,
        unit: 'kWh',
        previousReading: 1250,
        currentReading: 1495,
        meterNumber: 'EL-001',
        isEstimated: false
      },
      {
        id: '2',
        name: 'Vanduo',
        baseAmount: 0,
        consumption: 12.5, // m³
        rate: 2.50, // €/m³
        total: 31.25,
        unit: 'm³',
        previousReading: 456,
        currentReading: 468.5,
        meterNumber: 'W-001',
        isEstimated: false
      },
      {
        id: '3',
        name: 'Dujos',
        baseAmount: 0,
        consumption: 45.2, // m³
        rate: 0.85, // €/m³
        total: 38.42,
        unit: 'm³',
        previousReading: 234,
        currentReading: 279.2,
        meterNumber: 'G-001',
        isEstimated: false
      }
    ],
    total: 949.07,
    paidAmount: 0,
    remainingAmount: 949.07,
    lateFee: 0,
    totalWithLateFee: 949.07,
    propertyAddress: 'Vilniaus g. 15, Butas 15',
    tenantName: user ? `${user.first_name} ${user.last_name}` : 'Nuomininkas'
  };

  const paymentMethods: PaymentMethod[] = [
    {
      id: 'card-1',
      name: 'Visa ****1234',
      type: 'card',
      last4: '1234',
      isDefault: true,
      isActive: true
    },
    {
      id: 'bank-1',
      name: 'SEB Bankas',
      type: 'bank',
      isDefault: false,
      isActive: true
    },
    {
      id: 'card-2',
      name: 'Mastercard ****5678',
      type: 'card',
      last4: '5678',
      isDefault: false,
      isActive: false
    }
  ];

  const validatePayment = (): PaymentValidation => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if payment method is selected
    if (!selectedPaymentMethod) {
      errors.push('Pasirinkite mokėjimo būdą');
    }

    // Check if selected payment method is active
    const selectedMethod = paymentMethods.find(m => m.id === selectedPaymentMethod);
    if (selectedMethod && !selectedMethod.isActive) {
      errors.push('Pasirinktas mokėjimo būdas neaktyvus');
    }

    // Check if invoice is overdue
    const dueDate = new Date(invoice.dueDate);
    const daysOverdue = Math.ceil((currentTime.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysOverdue > 0) {
      warnings.push(`Sąskaita vėluoja ${daysOverdue} dienų`);
    }

    // Check if amount is reasonable
    if (invoice.total > 2000) {
      warnings.push('Sąskaitos suma atrodo neįprastai didelė');
    }

    // Check for estimated readings
    const estimatedItems = invoice.items.filter(item => item.isEstimated);
    if (estimatedItems.length > 0) {
              warnings.push(`${estimatedItems.length} skaitliukai yra įvertinti`);
    }

    // Check for unusual consumption patterns
    invoice.items.forEach(item => {
      const consumption = item.currentReading - item.previousReading;
      
      // Check for negative consumption
      if (consumption < 0) {
        errors.push(`${item.name}: Neigiamas suvartojimas neįmanomas`);
      }
      
      // Check for zero consumption (suspicious)
      if (consumption === 0) {
        warnings.push(`${item.name}: Suvartojimas lygus nuliui`);
      }
      
      // Check for unreasonably high consumption
      if (consumption > 1000 && item.unit === 'kWh') {
        warnings.push(`${item.name}: Suvartojimas atrodo per didelis`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  };

  const handlePayment = async () => {
    const validation = validatePayment();
    
    if (!validation.isValid) {
      alert('Prašome ištaisyti klaidas prieš atliekant mokėjimą');
      return;
    }

    setIsProcessing(true);
    
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    setIsProcessing(false);
    setShowSuccess(true);
    
    setTimeout(() => setShowSuccess(false), 5000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid': return 'Apmokėta';
      case 'overdue': return 'Vėluoja';
      default: return 'Laukiama';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('lt-LT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('lt-LT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getDaysUntilDue = () => {
    const dueDate = new Date(invoice.dueDate);
    return Math.ceil((dueDate.getTime() - currentTime.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getConsumptionColor = (consumption: number, unit: string) => {
    // Define reasonable consumption ranges
    const ranges = {
      'kWh': { low: 100, high: 500 },
      'm³': { low: 5, high: 20 }
    };
    
    const range = ranges[unit as keyof typeof ranges];
    if (!range) return 'text-gray-600';
    
    if (consumption < range.low) return 'text-blue-600';
    if (consumption > range.high) return 'text-orange-600';
    return 'text-green-600';
  };

  const validation = validatePayment();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header with logout button */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-black">Mokėjimas</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <button 
                onClick={logout}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
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
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl">
              <CreditCardIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Mokėjimas</h1>
              <p className="text-gray-600">Apmokėkite sąskaitą už {invoice.month}</p>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {showSuccess && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <CheckCircleIcon className="w-5 h-5 text-green-600" />
              <div>
                <h3 className="font-medium text-green-900">Mokėjimas sėkmingai atliktas!</h3>
                <p className="text-sm text-green-700">Jūsų mokėjimas buvo apdorotas ir kvitas išsiųstas el. paštu.</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Invoice Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Invoice Summary */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Sąskaitos informacija</h2>
                  <p className="text-gray-600">Sąskaita #{invoice.id}</p>
                  <p className="text-sm text-gray-500">{invoice.propertyAddress}</p>
                </div>
                <div className="text-right">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                    {getStatusText(invoice.status)}
                  </span>
                  <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                    <ClockIcon className="w-3 h-3" />
                    <span>{getDaysUntilDue() > 0 ? `${getDaysUntilDue()} d. iki termino` : `${Math.abs(getDaysUntilDue())} d. vėluoja`}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-500">Mėnuo</p>
                  <p className="text-lg font-bold text-gray-900">{invoice.month}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-500">Terminas</p>
                  <p className="text-lg font-bold text-gray-900">{formatDate(invoice.dueDate)}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-500">Bazinis nuomos mokestis</p>
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(invoice.baseRent)}</p>
                </div>
              </div>

              {/* Consumption Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-900">Skaitliukai</h3>
                {invoice.items.map((item) => {
                  const consumption = item.currentReading - item.previousReading;
                  const consumptionColor = getConsumptionColor(consumption, item.unit);
                  
                  return (
                    <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <CalculatorIcon className="w-5 h-5 text-blue-600" />
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
                          <p className="text-sm text-gray-500">
                            Skaitliukas: {item.meterNumber}
                          </p>
                          <p className="text-sm text-gray-500">
                            {item.previousReading} → {item.currentReading} = {consumption} {item.unit} × {item.rate}€/{item.unit}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${consumptionColor}`}>{formatCurrency(item.total)}</p>
                        <p className="text-xs text-gray-500">{consumption} {item.unit}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Payment Methods */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Mokėjimo būdas</h3>
              <div className="space-y-3">
                {paymentMethods.map((method) => (
                  <label key={method.id} className={`flex items-center gap-3 p-4 border rounded-xl hover:bg-gray-50 cursor-pointer transition-colors duration-200 ${
                    method.isActive ? 'border-gray-200' : 'border-gray-100 bg-gray-50'
                  }`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method.id}
                      checked={selectedPaymentMethod === method.id}
                      onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                      disabled={!method.isActive}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 disabled:opacity-50"
                    />
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`p-2 rounded-lg ${
                        method.type === 'card' ? 'bg-blue-100' : 'bg-green-100'
                      } ${!method.isActive ? 'opacity-50' : ''}`}>
                        <CreditCardIcon className={`w-5 h-5 ${
                          method.type === 'card' ? 'text-blue-600' : 'text-green-600'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <p className={`font-medium ${method.isActive ? 'text-gray-900' : 'text-gray-500'}`}>
                          {method.name}
                          {!method.isActive && ' (Neaktyvus)'}
                        </p>
                        {method.last4 && (
                          <p className="text-sm text-gray-500">**** {method.last4}</p>
                        )}
                      </div>
                    </div>
                    {method.isDefault && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        Numatyta
                      </span>
                    )}
                  </label>
                ))}
              </div>

              {/* Payment Security Info */}
              <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                <div className="flex items-start gap-3">
                  <ShieldCheckIcon className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900">Saugus mokėjimas</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Jūsų mokėjimo informacija yra apsaugota SSL šifravimu ir atitinka PCI DSS standartus.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Summary */}
          <div className="space-y-6">
            {/* Total Amount */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Mokėjimo suma</h3>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">Bazinis nuomos mokestis</span>
                  <span className="font-medium">{formatCurrency(invoice.baseRent)}</span>
                </div>
                {invoice.items.map((item) => (
                  <div key={item.id} className="flex justify-between">
                    <span className="text-gray-600">{item.name}</span>
                    <span className="font-medium">{formatCurrency(item.total)}</span>
                  </div>
                ))}
                {invoice.lateFee > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Vėlavimo mokestis</span>
                    <span className="font-medium">{formatCurrency(invoice.lateFee)}</span>
                  </div>
                )}
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between">
                    <span className="text-lg font-bold text-gray-900">Iš viso</span>
                    <span className="text-2xl font-bold text-gray-900">{formatCurrency(invoice.totalWithLateFee)}</span>
                  </div>
                </div>
              </div>

              {/* Validation Errors */}
              {validation.errors.length > 0 && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <div className="flex items-start gap-2">
                    <ExclamationTriangleIcon className="w-4 h-4 text-red-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-800">Klaidos:</p>
                      <ul className="text-xs text-red-700 mt-1 space-y-1">
                        {validation.errors.map((error, index) => (
                          <li key={index}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Validation Warnings */}
              {validation.warnings.length > 0 && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                  <div className="flex items-start gap-2">
                    <ExclamationTriangleIcon className="w-4 h-4 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800">Įspėjimai:</p>
                      <ul className="text-xs text-yellow-700 mt-1 space-y-1">
                        {validation.warnings.map((warning, index) => (
                          <li key={index}>• {warning}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handlePayment}
                disabled={!validation.isValid || isProcessing}
                className="w-full group relative px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium rounded-xl hover:shadow-lg transition-all duration-200 overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
                <span className="relative flex items-center justify-center gap-2">
                  {isProcessing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Apdorojama...
                    </>
                  ) : (
                    <>
                      <CreditCardIcon className="w-5 h-5" />
                      Apmokėti {formatCurrency(invoice.totalWithLateFee)}
                    </>
                  )}
                </span>
              </button>
            </div>

            {/* Payment Info */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Mokėjimo informacija</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="w-4 h-4 text-green-500" />
                  <span className="text-gray-600">Saugus mokėjimas</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="w-4 h-4 text-green-500" />
                  <span className="text-gray-600">Momentinis apdorojimas</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="w-4 h-4 text-green-500" />
                  <span className="text-gray-600">Automatinis kvitas</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="w-4 h-4 text-green-500" />
                  <span className="text-gray-600">24/7 palaikymas</span>
                </div>
              </div>
            </div>

            {/* Download Invoice */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Sąskaitos kopija</h3>
              <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors duration-200">
                <ArrowDownTrayIcon className="w-4 h-4" />
                Atsisiųsti PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TenantPayment; 