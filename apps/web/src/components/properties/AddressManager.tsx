import React, { useState } from 'react';
import { 
  MapPinIcon,
  PlusIcon,
  HomeIcon,
  UserIcon,
  CurrencyEuroIcon,
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

interface Address {
  id: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  totalApartments: number;
  occupiedApartments: number;
}

interface AddressManagerProps {
  addresses: Address[];
  onAddAddress: (address: Omit<Address, 'id'>) => void;
  onSelectAddress: (address: Address) => void;
  selectedAddress?: Address;
}

export const AddressManager: React.FC<AddressManagerProps> = ({
  addresses,
  onAddAddress,
  onSelectAddress,
  selectedAddress
}) => {
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({
    street: '',
    city: '',
    postalCode: '',
    country: 'Lietuva'
  });

  const handleAddAddress = (e: React.FormEvent) => {
    e.preventDefault();
    onAddAddress({
      ...newAddress,
      totalApartments: 0,
      occupiedApartments: 0
    });
    setNewAddress({ street: '', city: '', postalCode: '', country: 'Lietuva' });
    setShowAddAddress(false);
  };

  const getOccupancyRate = (address: Address) => {
    if (address.totalApartments === 0) return 0;
    return Math.round((address.occupiedApartments / address.totalApartments) * 100);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Adresai</h2>
            <p className="text-sm text-gray-600">Jūsų nuomojamų būstų adresai</p>
          </div>
          <button
            onClick={() => setShowAddAddress(true)}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Pridėti adresą
          </button>
        </div>
      </div>

      {/* Addresses List */}
      <div className="p-6">
        <div className="space-y-4">
          {addresses.map((address) => {
            const occupancyRate = getOccupancyRate(address);
            const isSelected = selectedAddress?.id === address.id;
            
            return (
              <div
                key={address.id}
                onClick={() => onSelectAddress(address)}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  isSelected 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <MapPinIcon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">
                        {address.street}
                      </h3>
                      <p className="text-xs text-gray-600">
                        {address.postalCode} {address.city}, {address.country}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {address.occupiedApartments}/{address.totalApartments} butų
                      </div>
                      <div className="text-xs text-gray-600">
                        {occupancyRate}% užimta
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {occupancyRate >= 80 ? (
                        <CheckCircleIcon className="w-4 h-4 text-green-600" />
                      ) : occupancyRate >= 50 ? (
                        <div className="w-4 h-4 rounded-full bg-yellow-400" />
                      ) : (
                        <XCircleIcon className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {addresses.length === 0 && (
          <div className="text-center py-8">
            <HomeIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-sm font-medium text-gray-900 mb-2">Nėra adresų</h3>
            <p className="text-sm text-gray-600 mb-4">
              Pridėkite pirmąjį adresą, kad pradėtumėte valdyti būstus
            </p>
            <button
              onClick={() => setShowAddAddress(true)}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              Pridėti adresą
            </button>
          </div>
        )}
      </div>

      {/* Add Address Modal */}
      {showAddAddress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Pridėti adresą</h3>
            </div>
            
            <form onSubmit={handleAddAddress} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gatvė ir numeris
                </label>
                <input
                  type="text"
                  value={newAddress.street}
                  onChange={(e) => setNewAddress(prev => ({ ...prev, street: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Pvz., Vokiečių g. 117"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Miestas
                  </label>
                  <input
                    type="text"
                    value={newAddress.city}
                    onChange={(e) => setNewAddress(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Pvz., Vilnius"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pašto kodas
                  </label>
                  <input
                    type="text"
                    value={newAddress.postalCode}
                    onChange={(e) => setNewAddress(prev => ({ ...prev, postalCode: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Pvz., 01108"
                    required
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddAddress(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Atšaukti
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700"
                >
                  Pridėti
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
