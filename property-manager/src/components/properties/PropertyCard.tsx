import React from 'react';
import { 
  HomeIcon, 
  UserIcon, 
  CurrencyEuroIcon, 
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  CalendarIcon,
  BellIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

interface Property {
  id: string;
  apartmentNumber: string;
  area: number;
  rooms: number;
  monthlyRent: number;
  tenant?: {
    id: string;
    name: string;
    phone: string;
    email: string;
    contractStart: string;
    contractEnd: string;
    tenant_response_date?: string;
    planned_move_out_date?: string;
    deposit: number;
    outstanding_amount: number;
    notification_count: number;
    monthlyRent: number;
  };
}

interface PropertyCardProps {
  property: Property;
  onClick: (property: Property) => void;
}

const PropertyCard: React.FC<PropertyCardProps> = ({ 
  property, 
  onClick 
}) => {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Nenurodyta';
    return new Date(dateString).toLocaleDateString('lt-LT');
  };

  const getContractStatus = () => {
    if (!property.tenant) {
      return { status: 'vacant', text: 'Laisvas', color: 'text-gray-600', bgColor: 'bg-gray-50' };
    }

    const today = new Date();
    const endDate = new Date(property.tenant.contractEnd);
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { status: 'expired', text: 'Sutartis baigėsi', color: 'text-red-600', bgColor: 'bg-red-50' };
    } else if (diffDays <= 30) {
      return { status: 'ending_soon', text: 'Baigiasi greitai', color: 'text-orange-600', bgColor: 'bg-orange-50' };
    } else {
      return { status: 'active', text: 'Aktyvi', color: 'text-green-600', bgColor: 'bg-green-50' };
    }
  };

  const contractStatus = getContractStatus();

  return (
    <div 
      className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onClick(property)}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <HomeIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Butas #{property.apartmentNumber}
              </h3>
              <p className="text-sm text-gray-600">
                {property.area}m² • {property.rooms}k
              </p>
            </div>
          </div>
          
          {/* Status Badge */}
          <div className={`px-3 py-1 rounded-full ${contractStatus.bgColor} border`}>
            <div className="flex items-center space-x-1">
              <div className={`w-1.5 h-1.5 rounded-full ${contractStatus.color.replace('text-', 'bg-')}`}></div>
              <span className={`text-sm font-medium ${contractStatus.color}`}>
                {contractStatus.text}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Tenant Info */}
        {property.tenant ? (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <UserIcon className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-900">{property.tenant.name}</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <PhoneIcon className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">{property.tenant.phone}</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <EnvelopeIcon className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">{property.tenant.email}</span>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <UserIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Nėra nuomininko</p>
          </div>
        )}

        {/* Financial Info */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Mėnesinė nuoma:</span>
            <span className="text-sm font-semibold text-blue-600">
              €{property.monthlyRent}
            </span>
          </div>
          
          {property.tenant && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Depozitas:</span>
              <span className="text-sm font-semibold text-gray-900">
                €{property.tenant.deposit}
              </span>
            </div>
          )}
        </div>

        {/* Contract Dates */}
        {property.tenant && (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <CalendarIcon className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">
                {formatDate(property.tenant.contractStart)} - {formatDate(property.tenant.contractEnd)}
              </span>
            </div>
          </div>
        )}

        {/* Notifications */}
        {property.tenant && property.tenant.notification_count > 0 && (
          <div className="flex items-center space-x-2">
            <BellIcon className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-600 font-medium">
              {property.tenant.notification_count} pranešimas
            </span>
          </div>
        )}

        {/* Outstanding Amount */}
        {property.tenant && property.tenant.outstanding_amount > 0 && (
          <div className="flex items-center space-x-2">
            <XCircleIcon className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-600 font-medium">
              Skola: €{property.tenant.outstanding_amount}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertyCard; 