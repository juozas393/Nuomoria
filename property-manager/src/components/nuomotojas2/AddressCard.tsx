import React from 'react';
import { BuildingOfficeIcon, MapPinIcon, UsersIcon, CalendarIcon } from '@heroicons/react/24/outline';

interface AddressCardProps {
  address: {
    id: string;
    full_address: string;
    total_apartments: number;
    floors: number;
    building_type: string;
    year_built?: number;
    chairman_name?: string;
    chairman_phone?: string;
    chairman_email?: string;
  };
  tenantCount: number;
  onSelect: (address: any) => void;
  isSelected?: boolean;
}

const AddressCard: React.FC<AddressCardProps> = ({ 
  address, 
  tenantCount, 
  onSelect, 
  isSelected = false 
}) => {
  return (
    <div
      onClick={() => onSelect(address)}
      className={`
        bg-white border-b border-gray-200 cursor-pointer transition-all duration-200
        hover:bg-gray-50
        ${isSelected 
          ? 'bg-[#2F8481]/5 border-[#2F8481]' 
          : 'hover:border-gray-300'
        }
      `}
    >
      <div className="px-4 py-3">
        {/* Compact Row Layout */}
        <div className="flex items-center justify-between">
          {/* Left side - Address info */}
          <div className="flex items-center space-x-4 flex-1">
            <div className="w-8 h-8 bg-[#2F8481]/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <BuildingOfficeIcon className="w-4 h-4 text-[#2F8481]" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-3">
                <h3 className="text-sm font-semibold text-gray-900 truncate">{address.full_address}</h3>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{address.building_type}</span>
              </div>
              
              <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                <span className="flex items-center space-x-1">
                  <MapPinIcon className="w-3 h-3" />
                  <span>{address.floors} aukštai</span>
                </span>
                <span className="flex items-center space-x-1">
                  <UsersIcon className="w-3 h-3" />
                  <span>{address.total_apartments} butai</span>
                </span>
                {address.year_built && (
                  <span className="flex items-center space-x-1">
                    <CalendarIcon className="w-3 h-3" />
                    <span>{address.year_built}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right side - Stats and actions */}
          <div className="flex items-center space-x-4 flex-shrink-0">
            {/* Tenant count */}
            <div className="text-right">
              <div className="text-sm font-semibold text-[#2F8481]">{tenantCount}</div>
              <div className="text-xs text-gray-500">nuomininkai</div>
            </div>

            {/* Chairman info (if available) */}
            {address.chairman_name && (
              <div className="text-right hidden md:block">
                <div className="text-xs text-gray-500">Valdytojas</div>
                <div className="text-xs font-medium text-gray-900 truncate max-w-24">{address.chairman_name}</div>
              </div>
            )}

            {/* Action indicator */}
            <div className="w-2 h-2 bg-[#2F8481] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddressCard;
