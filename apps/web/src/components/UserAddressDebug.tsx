import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { userApi } from '../lib/userApi';
import { addressApi } from '../lib/database';
import { UserAddress } from '../types/user';

export const UserAddressDebug: React.FC = () => {
  const { user } = useAuth();
  const [userAddresses, setUserAddresses] = useState<UserAddress[]>([]);
  const [allAddresses, setAllAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;

      try {
        setLoading(true);
        
        // Get user's addresses
        const userAddrs = await userApi.getUserAddresses(user.id);
        setUserAddresses(userAddrs);

        // Get filtered addresses
        const shouldFilterByUser = !['admin', 'property_manager'].includes(user.role);
        const userId = shouldFilterByUser ? user.id : undefined;
        const addresses = await addressApi.getAll(userId);
        setAllAddresses(addresses);

        if (import.meta.env.DEV) console.log('User addresses debug:', {
          userId: user.id,
          role: user.role,
          shouldFilter: shouldFilterByUser,
          userAddresses: userAddrs,
          filteredAddresses: addresses
        });
      } catch (error) {
        if (import.meta.env.DEV) console.error('Error loading debug data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  if (!user) return null;

  // Only show debug in development
  if (process.env.NODE_ENV === 'production') return null;

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-yellow-800">
          🔍 Debug: Vartotojo adresai ({user.email})
        </h3>
        <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded">
          DEV MODE
        </span>
      </div>
      
      {loading ? (
        <p className="text-sm text-yellow-600">Kraunama...</p>
      ) : (
        <div className="space-y-2">
          <div>
            <p className="text-xs font-medium text-yellow-700">Vaidmuo: {user.role}</p>
            <p className="text-xs text-yellow-600">
              Rodo tik savo adresus: {!['admin', 'property_manager'].includes(user.role) ? 'TAIP' : 'NE'}
            </p>
          </div>
          
          <div>
            <p className="text-xs font-medium text-yellow-700">Priskirti adresai ({userAddresses.length}):</p>
            {userAddresses.length === 0 ? (
              <p className="text-xs text-yellow-600">Jokių priskirtų adresų</p>
            ) : (
              userAddresses.map((ua) => (
                <p key={ua.id} className="text-xs text-yellow-600">
                  • {ua.addresses?.full_address} ({ua.role})
                </p>
              ))
            )}
          </div>
          
          <div>
            <p className="text-xs font-medium text-yellow-700">Matomi adresai ({allAddresses.length}):</p>
            {allAddresses.length === 0 ? (
              <p className="text-xs text-yellow-600">Jokių matomų adresų</p>
            ) : (
              allAddresses.map((addr) => (
                <p key={addr.id} className="text-xs text-yellow-600">
                  • {addr.full_address}
                </p>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
