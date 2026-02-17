import React, { memo } from 'react';
import {
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  CurrencyEuroIcon,
  BuildingOfficeIcon,
  HomeIcon,
  CreditCardIcon,
  DocumentTextIcon,
  WrenchScrewdriverIcon
} from '@heroicons/react/24/outline';

interface Tenant {
  id: string;
  name: string;
  phone: string;
  email: string;
  apartmentNumber: string;
  address: string;
  status: 'active' | 'expired' | 'pending';
  contractStart: string;
  contractEnd: string;
  monthlyRent: number;
  deposit: number;
  notification_count?: number;
  cleaning_required?: boolean;
  cleaning_cost?: number;
  last_notification_sent?: string;
  tenant_response?: 'wants_to_renew' | 'does_not_want_to_renew' | null;
  tenant_response_date?: string;
  planned_move_out_date?: string;
  payment_status?: 'paid' | 'unpaid' | 'overdue';
  meters_submitted?: boolean;
  last_payment_date?: string;
  outstanding_amount?: number;
  area?: number;
  rooms?: number;
  photos?: string[];
  auto_renewal_enabled?: boolean;
}

interface StatisticsDashboardProps {
  tenants: Tenant[];
  setActiveFilter: (filter: 'all' | 'problems' | 'unpaid' | 'unsubmitted' | 'cleaning' | 'expired' | 'active' | 'movingOut') => void;
  activeFilter: 'all' | 'problems' | 'unpaid' | 'unsubmitted' | 'cleaning' | 'expired' | 'active' | 'movingOut';
}

const StatisticsDashboard: React.FC<StatisticsDashboardProps> = memo(({ tenants, setActiveFilter, activeFilter }) => {
  const getDaysUntilContractEnd = (contractEnd: string): number => {
    const endDate = new Date(contractEnd);
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getFilterKeyFromLabel = (label: string) => {
    const filterMap: { [key: string]: 'all' | 'problems' | 'unpaid' | 'unsubmitted' | 'cleaning' | 'expired' | 'active' | 'movingOut' } = {
      'Visos nuomos': 'all',
      'Problemos': 'problems',
      'Neapmokėtos': 'unpaid',
      'Nepateikti skaitliukai': 'unsubmitted',
      'Reikia valymo': 'cleaning',
      'Baigėsi sutartys': 'expired',
      'Aktyvios': 'active',
      'Išsikraustantys': 'movingOut'
    };
    return filterMap[label] || 'all';
  };

  // Calculate statistics
  const stats = React.useMemo(() => {
    const total = tenants.length;
    const problems = tenants.filter(t =>
      t.payment_status === 'overdue' ||
      t.payment_status === 'unpaid' ||
      !t.meters_submitted ||
      t.cleaning_required ||
      getDaysUntilContractEnd(t.contractEnd) < 0
    ).length;

    const unpaid = tenants.filter(t => t.payment_status === 'unpaid' || t.payment_status === 'overdue').length;
    const unsubmitted = tenants.filter(t => !t.meters_submitted).length;
    const cleaning = tenants.filter(t => t.cleaning_required).length;
    const expired = tenants.filter(t => getDaysUntilContractEnd(t.contractEnd) < 0).length;
    const active = tenants.filter(t => t.status === 'active' && getDaysUntilContractEnd(t.contractEnd) >= 0).length;
    const movingOut = tenants.filter(t => t.planned_move_out_date).length;

    return {
      total,
      problems,
      unpaid,
      unsubmitted,
      cleaning,
      expired,
      active,
      movingOut
    };
  }, [tenants]);

  const filterOptions = [
    { label: 'Visos nuomos', count: stats.total, icon: BuildingOfficeIcon, color: 'bg-blue-500' },
    { label: 'Problemos', count: stats.problems, icon: ExclamationTriangleIcon, color: 'bg-red-500' },
    { label: 'Neapmokėtos', count: stats.unpaid, icon: CurrencyEuroIcon, color: 'bg-orange-500' },
    { label: 'Nepateikti skaitliukai', count: stats.unsubmitted, icon: DocumentTextIcon, color: 'bg-yellow-500' },
    { label: 'Reikia valymo', count: stats.cleaning, icon: WrenchScrewdriverIcon, color: 'bg-purple-500' },
    { label: 'Baigėsi sutartys', count: stats.expired, icon: ClockIcon, color: 'bg-red-600' },
    { label: 'Aktyvios', count: stats.active, icon: CheckCircleIcon, color: 'bg-green-500' },
    { label: 'Išsikraustantys', count: stats.movingOut, icon: HomeIcon, color: 'bg-gray-500' }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
      {filterOptions.map((option) => {
        const IconComponent = option.icon;
        const isActive = activeFilter === getFilterKeyFromLabel(option.label);

        return (
          <button
            key={option.label}
            onClick={() => setActiveFilter(getFilterKeyFromLabel(option.label))}
            className={`group p-5 rounded-2xl border-2 transition-colors duration-500 ${isActive
                ? 'border-[#2f8481] bg-gradient-to-br from-[#2f8481]/15 to-[#2f8481]/8 shadow-xl shadow-[#2f8481]/30'
                : 'border-gray-100 bg-white hover:border-[#2f8481]/40 hover:shadow-2xl hover:shadow-[#2f8481]/20 hover:bg-gradient-to-br hover:from-white hover:to-[#2f8481]/5'
              }`}
          >
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${option.color} flex items-center justify-center transition-colors duration-500 shadow-md`}>
                <IconComponent className="h-5 w-5 text-white transition-transform duration-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{option.label}</p>
                <p className="text-lg font-bold text-gray-900">{option.count}</p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
});

StatisticsDashboard.displayName = 'StatisticsDashboard';

export default StatisticsDashboard; 