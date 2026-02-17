import React, { useState, useMemo } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import AddressCard from './AddressCard';
import { Tenant } from '../../types/tenant';

interface AddressListProps {
  addresses: Array<{
    id: string;
    full_address: string;
    total_apartments: number;
    floors: number;
    building_type: string;
    year_built?: number;
    chairman_name?: string;
    chairman_phone?: string;
    chairman_email?: string;
  }>;
  tenants: Tenant[];
  onAddressSelect: (address: any) => void;
  onBackToTenants: () => void;
}

const AddressList: React.FC<AddressListProps> = ({
  addresses,
  tenants,
  onAddressSelect,
  onBackToTenants
}) => {
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  // Calculate tenant count for each address
  const addressTenantCounts = useMemo(() => {
    const counts: { [key: string]: number } = {};

    addresses.forEach(address => {
      counts[address.id] = tenants.filter(tenant =>
        tenant.address_id === address.id || tenant.address === address.full_address
      ).length;
    });

    return counts;
  }, [addresses, tenants]);

  const handleAddressSelect = (address: any) => {
    setSelectedAddressId(address.id);
    onAddressSelect(address);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Adresų sąrašas</h2>
          <p className="text-gray-600">Pasirinkite adresą nuomininkų peržiūrai</p>
        </div>
        <button
          onClick={onBackToTenants}
          className="text-[#2F8481] hover:text-[#297a77] font-medium"
        >
          Rodyti visus nuomininkus
        </button>
      </div>

      {/* Address List */}
      {addresses.length > 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {addresses.map((address) => (
            <AddressCard
              key={address.id}
              address={address}
              tenantCount={addressTenantCounts[address.id] || 0}
              onSelect={handleAddressSelect}
              isSelected={selectedAddressId === address.id}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg mb-4">Nėra adresų</div>
          <p className="text-gray-400 mb-6">Pridėkite pirmąjį adresą, kad pradėtumėte valdyti nuomininkus</p>
          <button
            onClick={() => {
              // This will trigger the parent's add address modal
              window.dispatchEvent(new CustomEvent('openAddAddressModal'));
            }}
            className="inline-flex items-center px-6 py-3 bg-[#2F8481] hover:bg-[#297a77] text-white rounded-xl font-semibold transition-colors shadow-sm"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Pridėti pirmąjį adresą
          </button>
        </div>
      )}

      {/* Summary Stats */}
      {addresses.length > 0 && (
        <div className="mt-8 p-6 bg-gray-50 rounded-xl">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Bendras apžvalga</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-[#2F8481]">{addresses.length}</div>
              <div className="text-sm text-gray-600">Adresai</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {addresses.reduce((sum, addr) => sum + addr.total_apartments, 0)}
              </div>
              <div className="text-sm text-gray-600">Iš viso butų</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{tenants.length}</div>
              <div className="text-sm text-gray-600">Nuomininkai</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {addresses.reduce((sum, addr) => sum + addr.total_apartments, 0) - tenants.length}
              </div>
              <div className="text-sm text-gray-600">Laisvi butai</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddressList;
