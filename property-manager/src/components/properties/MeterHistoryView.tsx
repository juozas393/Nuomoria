import React, { useState } from 'react';
import { 
  CalendarIcon, 
  ChartBarIcon,
  EyeIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  CurrencyEuroIcon
} from '@heroicons/react/24/outline';
import { MeterReadingWithPricing, PropertyMeterConfig, MeterStatistics, getMeterIcon, getMeterName, getUnitLabel, formatDate, formatCurrency } from '../../types/meters';

interface MeterHistoryViewProps {
  propertyId: string;
  meterConfigs: PropertyMeterConfig[];
  readings: MeterReadingWithPricing[];
  statistics?: MeterStatistics;
  onViewDetails?: (reading: MeterReadingWithPricing) => void;
  onEditReading?: (reading: MeterReadingWithPricing) => void;
}

export function MeterHistoryView({
  propertyId,
  meterConfigs,
  readings,
  statistics,
  onViewDetails,
  onEditReading
}: MeterHistoryViewProps) {
  const [selectedMeterType, setSelectedMeterType] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('6months');

  const getMeterIconDisplay = (type: string) => {
    switch (type) {
      case 'electricity': return '⚡';
      case 'water_cold': return '🌊';
      case 'water_hot': return '🔥';
      case 'gas': return '🔥';
      case 'heating': return '🔥';
      case 'internet': return '🌐';
      case 'garbage': return '🗑️';
      case 'custom': return '⚙️';
      default: return '📊';
    }
  };

  const getMeterNameDisplay = (config: PropertyMeterConfig) => {
    if (config.meter_type === 'custom' && config.custom_name) {
      return config.custom_name;
    }
    
    switch (config.meter_type) {
      case 'electricity': return 'Elektra';
      case 'water_cold': return 'Vanduo (šaltas)';
      case 'water_hot': return 'Vanduo (karštas)';
      case 'gas': return 'Dujos';
      case 'heating': return 'Šildymas';
      case 'internet': return 'Internetas';
      case 'garbage': return 'Šiukšlių išvežimas';
      default: return 'Skaitliukas';
    }
  };

  const getUnitLabelDisplay = (unit: string) => {
    switch (unit) {
      case 'm3': return 'm³';
      case 'kWh': return 'kWh';
      case 'GJ': return 'GJ';
      case 'Kitas': return 'Kitas';
      default: return unit;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      case 'overdue': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved': return 'Patvirtinta';
      case 'pending': return 'Laukia';
      case 'rejected': return 'Atmesta';
      case 'overdue': return 'Vėluoja';
      default: return 'Nepateikta';
    }
  };





  const filterReadings = () => {
    let filtered = readings;

    // Filter by meter type
    if (selectedMeterType !== 'all') {
      filtered = filtered.filter(reading => 
        reading.meter_config?.meter_type === selectedMeterType
      );
    }

    // Filter by period
    const now = new Date();
    const periodMonths = parseInt(selectedPeriod);
    if (periodMonths > 0) {
      const cutoffDate = new Date(now.getFullYear(), now.getMonth() - periodMonths, now.getDate());
      filtered = filtered.filter(reading => 
        reading.reading_date && new Date(reading.reading_date) >= cutoffDate
      );
    }

    return filtered.sort((a, b) => {
      const dateA = a.reading_date ? new Date(a.reading_date).getTime() : 0;
      const dateB = b.reading_date ? new Date(b.reading_date).getTime() : 0;
      return dateB - dateA;
    });
  };

  const filteredReadings = filterReadings();

  const getTotalCost = () => {
    return filteredReadings.reduce((sum, reading) => sum + (reading.total_cost || 0), 0);
  };

  const getTotalConsumption = () => {
    return filteredReadings.reduce((sum, reading) => sum + (reading.consumption ?? reading.difference ?? 0), 0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Skaitliukų istorija</h2>
          <p className="text-sm text-gray-600 mt-1">
            Peržiūrėkite skaitliukų rodmenų istoriją ir sąskaitas
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedMeterType}
            onChange={(e) => setSelectedMeterType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Visi skaitliukai</option>
            {meterConfigs.map(config => (
              <option key={config.id} value={config.meter_type || ''}>
                {getMeterIconDisplay(config.meter_type || '')} {getMeterNameDisplay(config)}
              </option>
            ))}
          </select>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="1">Paskutinis mėnuo</option>
            <option value="3">Paskutiniai 3 mėnesiai</option>
            <option value="6">Paskutiniai 6 mėnesiai</option>
            <option value="12">Paskutiniai 12 mėnesių</option>
            <option value="0">Visi laikai</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Iš viso rodmenų</p>
              <p className="text-2xl font-bold text-gray-900">{filteredReadings.length}</p>
            </div>
            <DocumentTextIcon className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Bendra suma</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(getTotalCost())} €</p>
            </div>
            <CurrencyEuroIcon className="w-8 h-8 text-green-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Sunaudojimas</p>
              <p className="text-2xl font-bold text-blue-600">{getTotalConsumption().toFixed(2)}</p>
            </div>
            <ChartBarIcon className="w-8 h-8 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Readings List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Rodmenų sąrašas</h3>
        </div>
        
        {filteredReadings.length === 0 ? (
          <div className="text-center py-8">
            <DocumentTextIcon className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-600">Nėra rodmenų pagal pasirinktus filtrus</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredReadings.map((reading) => {
              const config = reading.meter_config;
              
              return (
                <div key={reading.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-2xl">{getMeterIconDisplay(config?.meter_type || '')}</span>
                      <div>
                                                 <h4 className="font-medium text-gray-900">
                           {config ? getMeterNameDisplay(config) : 'Nežinomas skaitliukas'}
                         </h4>
                        <p className="text-sm text-gray-600">
                          {reading.reading_date ? formatDate(reading.reading_date) : '—'} • {reading.consumption ?? reading.difference ?? 0} {getUnitLabelDisplay(config?.unit || '')}
                        </p>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-xs text-gray-500">
                            {reading.previous_reading || 0} → {reading.current_reading || 0}
                          </span>
                          {reading.photos && reading.photos.length > 0 && (
                            <span className="text-xs text-blue-600 flex items-center gap-1">
                              <EyeIcon className="w-3 h-3" />
                              {reading.photos.length} nuotr.
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          {formatCurrency(reading.total_cost || 0)} €
                        </p>
                        <p className="text-sm text-gray-600">
                          {config?.allocation === 'fixed_split' ? 'Fiksuota' : `${reading.price_per_unit || 0} €/${getUnitLabelDisplay(config?.unit || '')}`}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(reading.status)}`}>
                          {getStatusText(reading.status)}
                        </span>
                        
                        <div className="flex items-center gap-1">
                          {onViewDetails && (
                            <button
                              onClick={() => onViewDetails(reading)}
                              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                              title="Peržiūrėti detales"
                            >
                              <EyeIcon className="w-4 h-4" />
                            </button>
                          )}
                          {onEditReading && reading.status === 'pending' && (
                            <button
                              onClick={() => onEditReading(reading)}
                              className="p-1 text-blue-400 hover:text-blue-600 transition-colors"
                              title="Redaguoti"
                            >
                              <DocumentTextIcon className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {reading.notes && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-700">{reading.notes}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Statistics */}
      {statistics && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Statistika</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Vidutinis mėnesinis suvartojimas</p>
              <p className="text-xl font-semibold text-gray-900">
                {(statistics.average_monthly || 0).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Vidutinė mėnesinė kaina</p>
              <p className="text-xl font-semibold text-green-600">
                {formatCurrency(statistics.average_cost_per_month || 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Paskutinis rodmuo</p>
              <p className="text-xl font-semibold text-gray-900">
                {statistics.last_reading_date ? formatDate(statistics.last_reading_date) : '—'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Tendencija</p>
              <p className={`text-xl font-semibold ${
                statistics.trend === 'increasing' ? 'text-red-600' :
                statistics.trend === 'decreasing' ? 'text-green-600' : 'text-gray-600'
              }`}>
                {statistics.trend === 'increasing' ? '↗' : 
                 statistics.trend === 'decreasing' ? '↘' : '→'}
                {statistics.trend === 'increasing' ? 'Didėja' :
                 statistics.trend === 'decreasing' ? 'Mažėja' : 'Stabilu'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



