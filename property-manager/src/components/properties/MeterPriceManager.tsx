import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { updateApartmentMeter, updateAddressMeter, getMeterReadings } from '../../lib/meterPriceApi';

export interface MeterPriceData {
  id: string;
  name: string;
  type: 'individual' | 'communal';
  unit: 'm3' | 'kWh' | 'GJ' | 'Kitas';
  distribution_method: 'per_apartment' | 'per_area' | 'per_consumption' | 'fixed_split';
  price_per_unit: number;
  fixed_price: number;
  is_custom: boolean;
  address_meter_id?: string | null;
  property_id: string;
  policy?: {
    scope: 'none' | 'apartment' | 'building';
    collectionMode: 'landlord_only' | 'tenant_photo';
  };
  requires_photo?: boolean;
  requires_reading?: boolean;
  last_reading?: number | null;
  previous_reading?: number | null;
  last_reading_date?: string | null;
  last_total_cost?: number | null;
  tenant_submitted_value?: number | null;
  tenant_submitted_at?: string | null;
  tenant_submission_status?: 'pending' | 'approved' | 'rejected' | null;
}

interface MeterPriceManagerProps {
  meters: MeterPriceData[];
  apartmentCount: number;
  onMeterUpdate: (meterId: string, updates: Partial<MeterPriceData>) => void;
  onGlobalMeterUpdate?: (addressMeterId: string, updates: Partial<MeterPriceData>) => void;
}

export const MeterPriceManager: React.FC<MeterPriceManagerProps> = ({
  meters,
  apartmentCount,
  onMeterUpdate,
  onGlobalMeterUpdate
}) => {
  const [editingMeterId, setEditingMeterId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<MeterPriceData>>({});
  const [meterReadings, setMeterReadings] = useState<Record<string, { current: number; previous: number; consumption: number }>>({});
  const [loading, setLoading] = useState(false);

  // Load meter readings on component mount
  useEffect(() => {
    const loadMeterReadings = async () => {
      setLoading(true);
      try {
        const readings: Record<string, { current: number; previous: number; consumption: number }> = {};
        
        for (const meter of meters) {
          const reading = await getMeterReadings(meter.id, 'apartment');
          readings[meter.id] = reading;
        }
        
        setMeterReadings(readings);
      } catch (error) {
        console.error('Error loading meter readings:', error);
      } finally {
        setLoading(false);
      }
    };

    if (meters.length > 0) {
      loadMeterReadings();
    }
  }, [meters]);

  // Determine meter type based on name and distribution method
  const getMeterType = useCallback((meter: MeterPriceData): 'individual' | 'communal' => {
    console.log('🔍 getMeterType called for:', meter.name, 'with type:', meter.type, 'distribution:', meter.distribution_method);
    
    // Always use the type from database (address settings) - this is the single source of truth
    if (meter.type && (meter.type === 'individual' || meter.type === 'communal')) {
      console.log('🔍 Using meter type from database (address settings):', meter.name, '->', meter.type);
      return meter.type;
    }
    
    // Fallback only if type is not set in database
    console.log('🔍 Type not in database, using fallback for:', meter.name);
    return 'individual'; // Default fallback
  }, []);

  // Calculate cost per apartment for each meter
  const calculateMeterCost = useCallback((meter: MeterPriceData): number => {
    if (!meter) return 0;
    
    // Fixed meters - use fixed_price (this is already per apartment)
    if (meter.unit === 'Kitas' || meter.distribution_method === 'fixed_split') {
      return meter.fixed_price || 0;
    }
    
    // For communal meters, calculate based on total consumption and divide by apartment count
    if (getMeterType(meter) === 'communal') {
      const reading = meterReadings[meter.id];
      const totalConsumption = reading?.consumption || 0;
      const totalCost = totalConsumption * (meter.price_per_unit || 0);
      return totalCost / apartmentCount;
    }
    
    // Individual meters - cost is per consumption (already per apartment)
    const reading = meterReadings[meter.id];
    const consumption = reading?.consumption || 0;
    return consumption * (meter.price_per_unit || 0);
  }, [apartmentCount, meterReadings, getMeterType]);

  // Get price display for meter - show per apartment cost for communal meters
  const getPriceDisplay = useCallback((meter: MeterPriceData): string => {
    if (meter.unit === 'Kitas' || meter.distribution_method === 'fixed_split') {
      return `${meter.fixed_price || 0}€/mėn.`;
    }
    
    // For communal meters, show the per-apartment cost
    if (getMeterType(meter) === 'communal') {
      const costPerApartment = calculateMeterCost(meter);
      return `${costPerApartment.toFixed(2)}€/butui`;
    }
    
    return `${meter.price_per_unit || 0}€/${meter.unit}`;
  }, [getMeterType, calculateMeterCost]);

  // Get distribution label
  const getDistributionLabel = useCallback((method: string): string => {
    switch (method) {
      case 'per_apartment': return 'Pagal butus';
      case 'per_area': return 'Pagal plotą';
      case 'per_consumption': return 'Pagal suvartojimą';
      case 'fixed_split': return 'Fiksuotas';
      default: return 'Pagal butus';
    }
  }, []);

  // Check if meter can be edited
  const canEditMeter = useCallback((meter: MeterPriceData): boolean => {
    // Individual meters can always be edited
    if (getMeterType(meter) === 'individual') return true;
    
    // Communal meters can be edited if they're custom or if global update is available
    if (getMeterType(meter) === 'communal') {
      return meter.is_custom || !!onGlobalMeterUpdate;
    }
    
    return false;
  }, [onGlobalMeterUpdate, getMeterType]);

  // Handle edit start
  const handleEditStart = useCallback((meter: MeterPriceData) => {
    setEditingMeterId(meter.id);
    setEditValues({
      price_per_unit: meter.price_per_unit,
      fixed_price: meter.fixed_price,
      distribution_method: meter.distribution_method
    });
  }, []);

  // Handle edit save
  const handleEditSave = useCallback(async (meter: MeterPriceData) => {
    try {
      if (getMeterType(meter) === 'communal' && !meter.is_custom && onGlobalMeterUpdate && meter.address_meter_id) {
        // Update global meter for all apartments
        await updateAddressMeter(meter.address_meter_id, editValues);
        await onGlobalMeterUpdate(meter.address_meter_id, editValues);
      } else {
        // Update individual meter
        await updateApartmentMeter(meter.id, editValues);
        await onMeterUpdate(meter.id, editValues);
      }
      
      setEditingMeterId(null);
      setEditValues({});
    } catch (error) {
      console.error('Error updating meter:', error);
    }
  }, [editValues, onMeterUpdate, onGlobalMeterUpdate, getMeterType]);

  // Handle edit cancel
  const handleEditCancel = useCallback(() => {
    setEditingMeterId(null);
    setEditValues({});
  }, []);

  // Memoized meter costs
  const meterCosts = useMemo(() => {
    return meters.map(meter => ({
      ...meter,
      costPerApartment: calculateMeterCost(meter)
    }));
  }, [meters, calculateMeterCost]);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Skaitliukų kainos</h3>
      
      {loading && (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-sm text-gray-600">Kraunama...</p>
        </div>
      )}
      
      <div className="grid gap-4">
        {meterCosts.map((meter) => (
          <div key={meter.id} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-gray-900">{meter.name}</h4>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    getMeterType(meter) === 'individual' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {getMeterType(meter) === 'individual' ? 'Individualus' : 'Bendras'}
                  </span>
                  <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                    {getDistributionLabel(meter.distribution_method)}
                  </span>
                </div>
                
                <div className="mt-2 text-sm text-gray-600">
                  <div className="flex items-center gap-4">
                    <span>Kaina: {getPriceDisplay(meter)}</span>
                    {getMeterType(meter) === 'individual' && meterReadings[meter.id] && (
                      <span>Suvartojimas: {meterReadings[meter.id].consumption} {meter.unit}</span>
                    )}
                  </div>
                </div>
              </div>
              
              {canEditMeter(meter) && (
                <div className="flex items-center gap-2">
                  {editingMeterId === meter.id ? (
                    <>
                      <button
                        onClick={() => handleEditSave(meter)}
                        className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        Išsaugoti
                      </button>
                      <button
                        onClick={handleEditCancel}
                        className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                      >
                        Atšaukti
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleEditStart(meter)}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Redaguoti
                    </button>
                  )}
                </div>
              )}
            </div>
            
            {editingMeterId === meter.id && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {meter.unit === 'Kitas' || meter.distribution_method === 'fixed_split' ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fiksuota kaina (€/mėn)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editValues.fixed_price || 0}
                        onChange={(e) => setEditValues(prev => ({
                          ...prev,
                          fixed_price: parseFloat(e.target.value) || 0
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Kaina už vienetą (€/{meter.unit})
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editValues.price_per_unit || 0}
                        onChange={(e) => setEditValues(prev => ({
                          ...prev,
                          price_per_unit: parseFloat(e.target.value) || 0
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pasiskirstymo metodas
                    </label>
                    <select
                      value={editValues.distribution_method || meter.distribution_method}
                      onChange={(e) => setEditValues(prev => ({
                        ...prev,
                        distribution_method: e.target.value as any
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="per_apartment">Pagal butus</option>
                      <option value="per_area">Pagal plotą</option>
                      <option value="per_consumption">Pagal suvartojimą</option>
                      <option value="fixed_split">Fiksuotas</option>
                    </select>
                  </div>
                </div>
                
                {getMeterType(meter) === 'communal' && !meter.is_custom && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      ⚠️ Šis bendras skaitliukas bus atnaujintas visiems butams.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
