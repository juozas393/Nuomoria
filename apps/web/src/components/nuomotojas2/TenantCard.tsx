import React, { memo } from 'react';
import { 
  UserIcon,
  BellIcon,
  PhoneIcon,
  EnvelopeIcon,
  EyeIcon,
  ChevronRightIcon,
  MapPinIcon,
  CurrencyEuroIcon,
  BuildingOfficeIcon,
  HomeIcon,
  CreditCardIcon,
  DocumentTextIcon,
  WrenchScrewdriverIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  CalendarIcon,
  ChatBubbleLeftRightIcon
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

interface TenantCardProps {
  tenant: Tenant;
  isSelected: boolean;
  onClick: (tenant: Tenant) => void;
  onChatClick?: (address: string) => void;
}

// Utility functions
const formatDate = (dateString: string | null) => {
  if (!dateString) return 'Nenurodyta';
  const date = new Date(dateString);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('lt-LT', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount);
};

const getDaysUntilContractEnd = (contractEnd: string): number => {
  const endDate = new Date(contractEnd);
  const today = new Date();
  const diffTime = endDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

const getContractStatusText = (contractEnd: string): string => {
  const daysLeft = getDaysUntilContractEnd(contractEnd);
  
  if (daysLeft < 0) {
    return 'Sutartis baigėsi';
  } else if (daysLeft === 0) {
    return 'Sutartis baigiasi šiandien';
  } else if (daysLeft <= 30) {
    return `Baigiasi per ${daysLeft} dienų`;
  } else if (daysLeft <= 90) {
    return `Baigiasi per ${Math.ceil(daysLeft / 30)} mėnesių`;
  } else {
    return `Baigiasi ${formatDate(contractEnd)}`;
  }
};

const getContractDateColor = (contractEnd: string) => {
  const daysLeft = getDaysUntilContractEnd(contractEnd);
  
  if (daysLeft < 0) return 'text-red-600';
  if (daysLeft <= 30) return 'text-orange-600';
  if (daysLeft <= 90) return 'text-yellow-600';
  return 'text-green-600';
};

const getStatusBadges = (tenant: Tenant) => {
  const badges = [];
  
  // Payment status
  if (tenant.payment_status === 'overdue') {
    badges.push({ text: 'Vėluoja mokėti', color: 'bg-red-100 text-red-800 border-red-200' });
  } else if (tenant.payment_status === 'unpaid') {
    badges.push({ text: 'Neapmokėta', color: 'bg-orange-100 text-orange-800 border-orange-200' });
  }
  
  // Meters submission
  if (!tenant.meters_submitted) {
    badges.push({ text: 'Nepateikti skaitliukai', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' });
  }
  
  // Cleaning required
  if (tenant.cleaning_required) {
    badges.push({ text: 'Reikia valymo', color: 'bg-purple-100 text-purple-800 border-purple-200' });
  }
  
  // Contract status
  const daysLeft = getDaysUntilContractEnd(tenant.contractEnd);
  if (daysLeft < 0) {
    badges.push({ text: 'Sutartis baigėsi', color: 'bg-red-100 text-red-800 border-red-200' });
  } else if (daysLeft <= 30) {
    badges.push({ text: 'Baigiasi greitai', color: 'bg-orange-100 text-orange-800 border-orange-200' });
  }
  
  return badges;
};

const TenantCard: React.FC<TenantCardProps> = memo(({ tenant, isSelected, onClick, onChatClick }) => {
  const badges = getStatusBadges(tenant);
  const contractStatusText = getContractStatusText(tenant.contractEnd);
  const contractDateColor = getContractDateColor(tenant.contractEnd);

  return (
    <div 
      className={`group p-6 border-2 rounded-2xl cursor-pointer transition-all duration-500 hover:scale-[1.03] hover:-translate-y-2 hover:rotate-1 ${
        isSelected 
          ? 'border-[#2f8481] bg-gradient-to-br from-[#2f8481]/10 to-[#2f8481]/5 shadow-xl shadow-[#2f8481]/30' 
          : 'border-gray-100 bg-white hover:border-[#2f8481]/40 hover:shadow-2xl hover:shadow-[#2f8481]/20 hover:bg-gradient-to-br hover:from-white hover:to-gray-50'
      }`}
      onClick={() => onClick(tenant)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-br from-[#2f8481] to-[#297a77] rounded-2xl flex items-center justify-center group-hover:scale-125 group-hover:rotate-12 transition-all duration-500 shadow-lg group-hover:shadow-xl">
            <UserIcon className="h-6 w-6 text-white group-hover:scale-110 transition-transform duration-500" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-lg group-hover:text-[#2f8481] group-hover:scale-105 transition-all duration-500 origin-left">{tenant.name}</h3>
            <p className="text-sm text-gray-500 font-medium">Butas {tenant.apartmentNumber}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {tenant.notification_count && tenant.notification_count > 0 && (
            <div className="bg-red-100 rounded-full px-2 py-0.5 border border-red-200">
              <span className="text-xs font-bold text-red-700">{tenant.notification_count}</span>
            </div>
          )}
          <ChevronRightIcon className="h-4 w-4 text-gray-400" />
        </div>
      </div>

      <div className="space-y-2 mb-3">
        <div className="flex items-center space-x-2 text-sm">
          <MapPinIcon className="h-4 w-4 text-gray-500" />
          <span className="text-gray-700">{tenant.address}</span>
        </div>
        
        <div className="flex items-center space-x-2 text-sm">
          <CurrencyEuroIcon className="h-4 w-4 text-gray-500" />
          <span className="text-gray-700">{formatCurrency(tenant.monthlyRent)}/mėn</span>
        </div>
        
        <div className="flex items-center space-x-2 text-sm">
          <CalendarIcon className="h-4 w-4 text-gray-500" />
          <span className={`${contractDateColor}`}>{contractStatusText}</span>
        </div>
      </div>

      {badges.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {badges.map((badge, index) => (
            <span key={index} className={`px-2 py-1 rounded-full text-xs font-medium border ${badge.color}`}>
              {badge.text}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick(tenant);
            }}
            className="flex items-center space-x-2 px-4 py-2 text-sm bg-gradient-to-r from-[#2f8481] to-[#297a77] text-white rounded-xl hover:from-[#297a77] hover:to-[#2f8481] transition-all duration-500 shadow-md hover:shadow-xl hover:scale-110 hover:-translate-y-1"
          >
            <EyeIcon className="h-4 w-4 group-hover:scale-110 transition-transform duration-500" />
            <span>Peržiūrėti</span>
          </button>
        </div>
        
        {onChatClick && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onChatClick(tenant.address);
            }}
            className="flex items-center space-x-2 px-4 py-2 text-sm bg-gradient-to-r from-[#2f8481] to-[#297a77] text-white rounded-xl hover:from-[#297a77] hover:to-[#2f8481] transition-all duration-500 shadow-md hover:shadow-xl hover:scale-110 hover:-translate-y-1"
          >
            <ChatBubbleLeftRightIcon className="h-4 w-4 group-hover:scale-110 transition-transform duration-500" />
            <span>Pokalbis</span>
          </button>
        )}
      </div>
    </div>
  );
});

TenantCard.displayName = 'TenantCard';

export default TenantCard; 