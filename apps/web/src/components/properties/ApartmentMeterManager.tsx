import React, { useState, useEffect, useCallback } from 'react';
import { MeterPriceManager, MeterPriceData } from './MeterPriceManager';
import { MeterManagementCard } from './MeterManagementCard';
import { getApartmentMeters, getAddressMeters, getApartmentCount } from '../../lib/meterPriceApi';

// Type for address meters (without apartment-specific fields)
type AddressMeterData = Omit<MeterPriceData, 'is_custom' | 'property_id'>;

interface ApartmentMeterManagerProps {
  propertyId: string;
  addressId: string;
  onMetersUpdate?: () => void;
}

export const ApartmentMeterManager: React.FC<ApartmentMeterManagerProps> = ({
  propertyId,
  addressId,
  onMetersUpdate
}) => {
  const [meters, setMeters] = useState<MeterPriceData[]>([]);
  const [apartmentCount, setApartmentCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load meters and apartment count
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Load meters from address settings (address_meters)
      const meters = await getApartmentMeters(propertyId);
      console.log('📊 Loaded meters from address settings:', meters);
      
      setMeters(meters);
      
      // Load apartment count
      const count = await getApartmentCount(addressId);
      setApartmentCount(count);
      
    } catch (err) {
      console.error('Error loading meter data:', err);
      setError('Klaida kraunant skaitliukų duomenis');
    } finally {
      setLoading(false);
    }
  }, [propertyId, addressId]);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle individual meter update
  const handleMeterUpdate = useCallback(async (meterId: string, updates: Partial<MeterPriceData>) => {
    try {
      // Update local state immediately for better UX
      setMeters(prev => prev.map(meter => 
        meter.id === meterId 
          ? { ...meter, ...updates }
          : meter
      ));
      
      // Notify parent component
      onMetersUpdate?.();
      
    } catch (err) {
      console.error('Error updating meter:', err);
      // Reload data to revert changes
      loadData();
    }
  }, [onMetersUpdate, loadData]);

  // Handle global meter update (for communal meters)
  const handleGlobalMeterUpdate = useCallback(async (addressMeterId: string, updates: Partial<MeterPriceData>) => {
    try {
      // Update all meters that inherit from this address meter
      setMeters(prev => prev.map(meter => 
        meter.address_meter_id === addressMeterId && !meter.is_custom
          ? { ...meter, ...updates }
          : meter
      ));
      
      // Notify parent component
      onMetersUpdate?.();
      
    } catch (err) {
      console.error('Error updating global meter:', err);
      // Reload data to revert changes
      loadData();
    }
  }, [onMetersUpdate, loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-sm text-gray-600">Kraunama...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Klaida</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
            <div className="mt-4">
              <button
                onClick={loadData}
                className="bg-red-100 text-red-800 px-3 py-2 rounded-md text-sm font-medium hover:bg-red-200"
              >
                Bandyti dar kartą
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (meters.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">Nėra skaitliukų</h3>
        <p className="mt-1 text-sm text-gray-500">
          Šiam butui dar nepridėta jokių skaitliukų.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Skaitliukų valdymas</h2>
          <p className="mt-1 text-sm text-gray-600">
            Valdykite skaitliukų kainas ir pasiskirstymo metodus
          </p>
        </div>
        <div className="text-sm text-gray-500">
          Butų skaičius: {apartmentCount}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {meters.map((meter) => (
          <MeterManagementCard
            key={meter.id}
            meter={meter}
            onUpdateReading={(meterId, reading) => {
              console.log('Updating reading for meter:', meterId, reading);
              // TODO: Implement reading update
            }}
            onOpenApartmentReadings={(meterId) => {
              console.log('Opening apartment readings for meter:', meterId);
              // TODO: Implement apartment readings modal
            }}
            onReviewTenantSubmission={(meterId, action) => {
              console.log('Reviewing tenant submission:', meterId, action);
              // TODO: Implement tenant submission review
            }}
          />
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Kaip veikia kainų redagavimas</h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Individualūs skaitliukai:</strong> Kaina keičiasi tik šiam butui</li>
                <li><strong>Bendri skaitliukai:</strong> Kaina keičiasi visiems butams</li>
                <li><strong>Fiksuoti mokesčiai:</strong> Fiksuota suma už mėnesį</li>
                <li><strong>Kintami mokesčiai:</strong> Kaina už vienetą (m³, kWh, etc.)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
