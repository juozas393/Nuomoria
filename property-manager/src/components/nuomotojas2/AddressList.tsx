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
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-black">Adresų portfelis</h2>
          <p className="text-sm text-black/60">Stebėkite pastatus, užimtumą ir nuomininkus vienoje vietoje.</p>
        </div>
        <button
          onClick={onBackToTenants}
          className="inline-flex items-center gap-2 rounded-full border border-[#2F8481]/30 bg-[#2F8481]/10 px-4 py-2 text-sm font-semibold text-[#2F8481] transition-colors hover:bg-[#2F8481]/20"
        >
          Rodyti visus nuomininkus
        </button>
      </div>

      {addresses.length > 0 ? (
        <>
          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
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

          <div className="grid gap-4 rounded-3xl border border-black/5 bg-white/80 p-6 md:grid-cols-4">
            <div className="rounded-2xl bg-[#2F8481]/10 p-4 text-center">
              <div className="text-2xl font-semibold text-[#2F8481]">{addresses.length}</div>
              <div className="text-xs uppercase tracking-[0.2em] text-[#2F8481]/80">Adresai</div>
            </div>
            <div className="rounded-2xl bg-black/5 p-4 text-center">
              <div className="text-2xl font-semibold text-black">
                {addresses.reduce((sum, addr) => sum + addr.total_apartments, 0)}
              </div>
              <div className="text-xs uppercase tracking-[0.2em] text-black/50">Iš viso butų</div>
            </div>
            <div className="rounded-2xl bg-black/5 p-4 text-center">
              <div className="text-2xl font-semibold text-black">{tenants.length}</div>
              <div className="text-xs uppercase tracking-[0.2em] text-black/50">Nuomininkai</div>
            </div>
            <div className="rounded-2xl bg-black/5 p-4 text-center">
              <div className="text-2xl font-semibold text-black">
                {addresses.reduce((sum, addr) => sum + addr.total_apartments, 0) - tenants.length}
              </div>
              <div className="text-xs uppercase tracking-[0.2em] text-black/50">Laisvi butai</div>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center rounded-3xl border border-black/5 bg-white/80 py-16">
          <div className="text-lg font-semibold text-black mb-2">Nėra adresų</div>
          <p className="text-sm text-black/60 mb-6">Pridėkite pirmąjį adresą ir pradėkite valdyti pastatus.</p>
          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent('openAddAddressModal'));
            }}
            className="inline-flex items-center gap-2 rounded-full bg-[#2F8481] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#2F8481]/30 transition-all duration-200 hover:translate-y-[-1px] hover:bg-[#297a77]"
          >
            <PlusIcon className="h-5 w-5" />
            Pridėti pirmąjį adresą
          </button>
        </div>
      )}
    </div>
  );
};

export default AddressList;
