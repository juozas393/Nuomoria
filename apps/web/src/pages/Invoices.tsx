import React, { useState, useEffect } from 'react';
import { 
  DocumentTextIcon, 
  CurrencyEuroIcon, 
  CalendarIcon,
  UserIcon,
  BuildingOfficeIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import { formatCurrency, formatDate } from '../utils/format';

interface InvoiceItem {
  description: string;
  amount: number;
  type: 'rent' | 'utilities' | 'maintenance' | 'other';
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  propertyAddress: string;
  tenantName: string;
  tenantEmail: string;
  tenantPhone: string;
  propertyArea: number;
  dueDate: Date;
  totalAmount: number;
  status: 'paid' | 'pending' | 'overdue';
  items: InvoiceItem[];
  createdAt: Date;
}

const Invoices: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    // Simulate loading with real data from CSV
    const loadInvoices = async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockInvoices: Invoice[] = [
        {
          id: '1',
          invoiceNumber: 'V202506-1',
          propertyAddress: 'Vokiečių g. 117',
          tenantName: 'Jonas Jonaitis',
          tenantEmail: 'tenant@example.com',
          tenantPhone: '37060000001',
          propertyArea: 48,
          dueDate: new Date('2025-07-05'),
          totalAmount: 511.19,
          status: 'pending',
          createdAt: new Date('2025-06-30'),
          items: [
            { description: 'Nuomos mokestis', amount: 450.00, type: 'rent' },
            { description: 'Vanduo šaltas', amount: 5.21, type: 'utilities' },
            { description: 'Vanduo karštas', amount: 7.34, type: 'utilities' },
            { description: 'Šildymas', amount: 0.29, type: 'utilities' },
            { description: 'Kauno švara', amount: 8.82, type: 'utilities' },
            { description: 'Elektra', amount: 9.30, type: 'utilities' },
            { description: 'Bendra elektra', amount: 0.46, type: 'utilities' },
            { description: 'Internetas', amount: 8.00, type: 'utilities' },
            { description: 'Aplinkos tvarkymas', amount: 7.06, type: 'utilities' },
            { description: 'Technininė priežiūra', amount: 14.71, type: 'maintenance' },
          ]
        },
        {
          id: '2',
          invoiceNumber: 'V202506-2',
          propertyAddress: 'Laisvės al. 45',
          tenantName: 'Marija Jonaitė',
          tenantEmail: 'marija.jonaite@email.com',
          tenantPhone: '37061234567',
          propertyArea: 65,
          dueDate: new Date('2025-07-10'),
          totalAmount: 650.00,
          status: 'paid',
          createdAt: new Date('2025-06-25'),
          items: [
            { description: 'Nuomos mokestis', amount: 650.00, type: 'rent' },
          ]
        },
        {
          id: '3',
          invoiceNumber: 'V202506-3',
          propertyAddress: 'Gedimino pr. 12',
          tenantName: 'Jonas Petrauskas',
          tenantEmail: 'jonas.petrauskas@email.com',
          tenantPhone: '37062345678',
          propertyArea: 55,
          dueDate: new Date('2025-07-01'),
          totalAmount: 580.00,
          status: 'overdue',
          createdAt: new Date('2025-06-20'),
          items: [
            { description: 'Nuomos mokestis', amount: 580.00, type: 'rent' },
          ]
        }
      ];
      
      setInvoices(mockInvoices);
      setLoading(false);
    };

    loadInvoices();
  }, []);

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         invoice.tenantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         invoice.propertyAddress.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-primary-100 text-primary-800 dark:bg-primary-900/20 dark:text-primary-400';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'overdue':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Apmokėta';
      case 'pending':
        return 'Laukia mokėjimo';
      case 'overdue':
        return 'Vėluoja';
      default:
        return status;
    }
  };

  const getDaysUntilDue = (dueDate: Date) => {
    const today = new Date();
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="card p-6">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Sąskaitos
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Valdykite nuomos sąskaitas ir mokėjimus
          </p>
        </div>
        <button className="btn-primary flex items-center space-x-2">
          <PlusIcon className="w-5 h-5" />
          <span>Sukurti sąskaitą</span>
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Ieškoti pagal sąskaitos numerį, nuomininką ar adresą..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <FunnelIcon className="w-5 h-5 text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="all">Visi statusai</option>
              <option value="paid">Apmokėta</option>
              <option value="pending">Laukia mokėjimo</option>
              <option value="overdue">Vėluoja</option>
            </select>
          </div>
        </div>
      </div>

      {/* Invoices Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredInvoices.map((invoice) => {
          const daysUntilDue = getDaysUntilDue(invoice.dueDate);
          const isOverdue = daysUntilDue < 0;
          
          return (
            <div key={invoice.id} className="card p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                    {invoice.invoiceNumber}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {formatDate(invoice.createdAt)}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(invoice.status)}`}>
                  {getStatusText(invoice.status)}
                </span>
              </div>

              <div className="space-y-4">
                {/* Property Info */}
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <BuildingOfficeIcon className="w-4 h-4" />
                  <span>{invoice.propertyAddress} ({invoice.propertyArea} m²)</span>
                </div>

                {/* Tenant Info */}
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <UserIcon className="w-4 h-4" />
                  <span>{invoice.tenantName}</span>
                </div>

                {/* Amount */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CurrencyEuroIcon className="w-5 h-5 text-primary-500" />
                    <span className="text-lg font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(invoice.totalAmount)}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-2 text-sm">
                      <CalendarIcon className="w-4 h-4" />
                      <span className={isOverdue ? 'text-red-600' : 'text-gray-600 dark:text-gray-400'}>
                        {isOverdue ? `Vėluoja ${Math.abs(daysUntilDue)} d.` : `Iki ${formatDate(invoice.dueDate)}`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Items Preview */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Pagrindiniai mokesčiai:
                  </div>
                  <div className="space-y-1">
                    {invoice.items.slice(0, 3).map((item, index) => (
                      <div key={index} className="flex justify-between text-xs">
                        <span>{item.description}</span>
                        <span>{formatCurrency(item.amount)}</span>
                      </div>
                    ))}
                    {invoice.items.length > 3 && (
                      <div className="text-xs text-gray-500">
                        +{invoice.items.length - 3} daugiau...
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button className="flex items-center space-x-1 text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400">
                  <EyeIcon className="w-4 h-4" />
                  <span>Peržiūrėti</span>
                </button>
                <button className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-700 dark:text-gray-400">
                  <ArrowDownTrayIcon className="w-4 h-4" />
                  <span>Atsisiųsti</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredInvoices.length === 0 && (
        <div className="text-center py-12">
          <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Nerasta sąskaitų
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Pabandykite pakeisti paieškos kriterijus arba sukurkite naują sąskaitą.
          </p>
        </div>
      )}
    </div>
  );
};

export default Invoices; 