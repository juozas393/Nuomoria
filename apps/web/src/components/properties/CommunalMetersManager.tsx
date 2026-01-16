import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { UniversalAddMeterModal } from '../meters/UniversalAddMeterModal';
import { 
  WrenchScrewdriverIcon, 
  CurrencyEuroIcon, 
  CalculatorIcon,
  PlusIcon,
  TrashIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import { 
  getCommunalMeters, 
  createCommunalMeter, 
  updateCommunalMeter, 
  deleteCommunalMeter,
  getCommunalExpenses,
  createCommunalExpense,
  updateCommunalExpense,
  deleteCommunalExpense,
  type CommunalMeter as DbCommunalMeter,
  type CommunalExpense as DbCommunalExpense
} from '../../lib/communalMetersApi';
import { type DistributionMethod } from '../../constants/meterDistribution';

export interface CommunalMeter {
  id: string;
  name: string;
  type: 'individual' | 'communal';
  unit: 'm3' | 'kWh' | 'GJ' | 'Kitas';
  price_per_unit: number;
  fixed_price?: number;
  distribution_method: DistributionMethod;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CommunalExpense {
  id: string;
  meter_id: string;
  month: string; // YYYY-MM format
  total_amount: number;
  total_units?: number;
  distribution_amount: number; // Amount per apartment
  notes?: string;
  created_at: string;
}

interface CommunalMetersManagerProps {
  addressId: string;
  totalApartments: number;
  onSave: (meters: CommunalMeter[], expenses: CommunalExpense[]) => void;
}

const DEFAULT_METERS: Omit<CommunalMeter, 'id' | 'created_at' | 'updated_at'>[] = [
  {
    name: 'Vanduo (šaltas)',
    type: 'individual',
    unit: 'm3',
    price_per_unit: 1.2,
    distribution_method: 'per_consumption',
    description: 'Šalto vandens suvartojimas kiekvienam butui',
    is_active: true
  },
  {
    name: 'Vanduo (karštas)',
    type: 'individual',
    unit: 'm3',
    price_per_unit: 3.5,
    distribution_method: 'per_consumption',
    description: 'Karšto vandens suvartojimas kiekvienam butui',
    is_active: true
  },
  {
    name: 'Elektra (individuali)',
    type: 'individual',
    unit: 'kWh',
    price_per_unit: 0.15,
    distribution_method: 'per_consumption',
    description: 'Elektros suvartojimas kiekvienam butui',
    is_active: true
  },
  {
    name: 'Elektra (bendra)',
    type: 'communal',
    unit: 'kWh',
    price_per_unit: 0.15,
    distribution_method: 'per_apartment',
    description: 'Namo apsvietimas, liftas, kiemo apšvietimas',
    is_active: true
  },
  {
    name: 'Šildymas',
    type: 'communal',
    unit: 'GJ',
    price_per_unit: 25.0,
    distribution_method: 'per_apartment',
    description: 'Namo šildymo sąnaudos',
    is_active: true
  },
  {
    name: 'Internetas',
    type: 'communal',
    unit: 'Kitas',
    price_per_unit: 0,
    fixed_price: 60,
    distribution_method: 'fixed_split',
    description: 'Namo interneto paslaugos',
    is_active: true
  },
  {
    name: 'Šiukšlių išvežimas',
    type: 'communal',
    unit: 'Kitas',
    price_per_unit: 0,
    fixed_price: 45,
    distribution_method: 'fixed_split',
    description: 'Šiukšlių išvežimo paslaugos',
    is_active: true
  },
  {
    name: 'Namo valymas',
    type: 'communal',
    unit: 'Kitas',
    price_per_unit: 0,
    fixed_price: 80,
    distribution_method: 'per_apartment',
    description: 'Bendrų patalpų valymas',
    is_active: true
  }
];

export const CommunalMetersManager: React.FC<CommunalMetersManagerProps> = ({
  addressId,
  totalApartments,
  onSave
}) => {
  const [meters, setMeters] = useState<CommunalMeter[]>([]);
  const [expenses, setExpenses] = useState<CommunalExpense[]>([]);
  const [activeTab, setActiveTab] = useState<'meters' | 'expenses' | 'distribution'>('meters');
  const [showAddMeter, setShowAddMeter] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [editingMeter, setEditingMeter] = useState<CommunalMeter | null>(null);

  // Load meters from database
  useEffect(() => {
    const loadMeters = async () => {
      try {
        const dbMeters = await getCommunalMeters(addressId);
        if (dbMeters.length > 0) {
          // Convert database format to component format
          const convertedMeters: CommunalMeter[] = dbMeters.map(dbMeter => ({
            id: dbMeter.id,
            name: dbMeter.name,
            type: dbMeter.type,
            unit: dbMeter.unit,
            price_per_unit: dbMeter.price_per_unit,
            fixed_price: dbMeter.fixed_price,
            distribution_method: dbMeter.distribution_method,
            description: dbMeter.description,
            is_active: dbMeter.is_active,
            created_at: dbMeter.created_at,
            updated_at: dbMeter.updated_at
          }));
          setMeters(convertedMeters);
        } else {
          // No meters in database, use defaults
          const defaultMeters: CommunalMeter[] = DEFAULT_METERS.map((meter, index) => ({
            ...meter,
            id: `meter-${index}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }));
          setMeters(defaultMeters);
        }
      } catch (error) {
        console.error('Error loading communal meters:', error);
        // Fallback to defaults
        const defaultMeters: CommunalMeter[] = DEFAULT_METERS.map((meter, index) => ({
          ...meter,
          id: `meter-${index}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));
        setMeters(defaultMeters);
      }
    };

    loadMeters();
  }, [addressId]);

  // Optimized functions with useCallback
  const addMeter = useCallback(async (meter: Omit<CommunalMeter, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const dbMeter = await createCommunalMeter({
        address_id: addressId,
        name: meter.name,
        type: meter.type,
        unit: meter.unit,
        price_per_unit: meter.price_per_unit,
        fixed_price: meter.fixed_price,
        distribution_method: meter.distribution_method,
        description: meter.description,
        is_active: meter.is_active
      });

      const newMeter: CommunalMeter = {
        id: dbMeter.id,
        name: dbMeter.name,
        type: dbMeter.type,
        unit: dbMeter.unit,
        price_per_unit: dbMeter.price_per_unit,
        fixed_price: dbMeter.fixed_price,
        distribution_method: dbMeter.distribution_method,
        description: dbMeter.description,
        is_active: dbMeter.is_active,
        created_at: dbMeter.created_at,
        updated_at: dbMeter.updated_at
      };
      setMeters(prev => [...prev, newMeter]);
    } catch (error) {
      console.error('Error adding meter:', error);
      throw error;
    }
  }, [addressId]);

  const updateMeter = useCallback(async (id: string, updates: Partial<CommunalMeter>) => {
    try {
      const dbMeter = await updateCommunalMeter(id, updates);
      
      setMeters(prev => prev.map(meter => 
        meter.id === id 
          ? {
              id: dbMeter.id,
              name: dbMeter.name,
              type: dbMeter.type,
              unit: dbMeter.unit,
              price_per_unit: dbMeter.price_per_unit,
              fixed_price: dbMeter.fixed_price,
              distribution_method: dbMeter.distribution_method,
              description: dbMeter.description,
              is_active: dbMeter.is_active,
              created_at: dbMeter.created_at,
              updated_at: dbMeter.updated_at
            }
          : meter
      ));
    } catch (error) {
      console.error('Error updating meter:', error);
      throw error;
    }
  }, []);

  const deleteMeter = useCallback(async (id: string) => {
    try {
      await deleteCommunalMeter(id);
      setMeters(prev => prev.filter(meter => meter.id !== id));
      setExpenses(prev => prev.filter(expense => expense.meter_id !== id));
    } catch (error) {
      console.error('Error deleting meter:', error);
      throw error;
    }
  }, []);

  const addExpense = useCallback((expense: Omit<CommunalExpense, 'id' | 'created_at' | 'distribution_amount'>) => {
    const meter = meters.find(m => m.id === expense.meter_id);
    if (!meter) return;

    let distributionAmount = 0;
    if (meter.distribution_method === 'per_apartment') {
      distributionAmount = expense.total_amount / totalApartments;
    } else if (meter.distribution_method === 'per_area') {
      const avgArea = 50; // m²
      distributionAmount = expense.total_amount / (totalApartments * avgArea);
    } else {
      // fixed_split - equal distribution
      distributionAmount = expense.total_amount / totalApartments;
    }

    const newExpense: CommunalExpense = {
      ...expense,
      id: `expense-${Date.now()}`,
      distribution_amount: Math.round(distributionAmount * 100) / 100,
      created_at: new Date().toISOString()
    };
    setExpenses(prev => [...prev, newExpense]);
  }, [meters, totalApartments]);

  const calculateMonthlyTotal = useCallback((month: string) => {
    const monthExpenses = expenses.filter(exp => exp.month === month);
    return monthExpenses.reduce((total, exp) => total + exp.distribution_amount, 0);
  }, [expenses]);

  // Optimized computed values with useMemo
  const activeMeters = useMemo(() => meters.filter(meter => meter.is_active), [meters]);
  const inactiveMeters = useMemo(() => meters.filter(meter => !meter.is_active), [meters]);
  const handleSave = useCallback(() => onSave(meters, expenses), [meters, expenses, onSave]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <WrenchScrewdriverIcon className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Komunaliniai skaitliukai</h3>
            <p className="text-sm text-gray-600">Valdykite skaitliukus ir sąnaudų pasiskirstymą</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-[#2F8481] text-white rounded-lg hover:bg-[#2a7875] transition-colors"
        >
          Išsaugoti
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-1 px-6">
          {[
            { id: 'meters', label: 'Skaitliukai', icon: WrenchScrewdriverIcon },
            { id: 'expenses', label: 'Sąnaudos', icon: CurrencyEuroIcon },
            { id: 'distribution', label: 'Pasiskirstymas', icon: CalculatorIcon }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-t-lg transition-colors ${
                  isActive ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'meters' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-medium text-gray-900">Skaitliukų sąrašas</h4>
              <button
                onClick={() => setShowAddMeter(true)}
                className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <PlusIcon className="w-4 h-4" />
                <span>Pridėti skaitliuką</span>
              </button>
            </div>

            {/* Active Meters */}
            <div className="space-y-3">
              <h5 className="text-sm font-medium text-gray-700">Aktyvūs skaitliukai ({activeMeters.length})</h5>
              {activeMeters.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>Nėra aktyvių skaitiklių</p>
                  <p className="text-sm">Pridėkite skaitiklį, kad pradėtumėte valdyti sąnaudas</p>
                </div>
              ) : (
                activeMeters.map((meter) => (
                  <div key={meter.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h5 className="font-medium text-gray-900">{meter.name}</h5>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            meter.type === 'individual' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {meter.type === 'individual' ? 'Individualus' : 'Bendras'}
                          </span>
                          <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                            Aktyvus
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{meter.description}</p>
                        <div className="text-sm text-gray-500 space-y-1">
                          <div>Vienetas: {meter.unit}</div>
                          <div>Kaina: {meter.fixed_price ? `${meter.fixed_price}€` : `${meter.price_per_unit}€/${meter.unit}`}</div>
                          <div>Pasiskirstymas: {
                            meter.distribution_method === 'per_apartment' ? 'Pagal butus' :
                            meter.distribution_method === 'per_area' ? 'Pagal plotą' : 'Fiksuotas'
                          }</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingMeter(meter)}
                          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                          title="Redaguoti"
                        >
                          <Cog6ToothIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => updateMeter(meter.id, { is_active: false })}
                          className="p-2 text-yellow-400 hover:text-yellow-600 transition-colors"
                          title="Deaktyvuoti"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => deleteMeter(meter.id)}
                          className="p-2 text-red-400 hover:text-red-600 transition-colors"
                          title="Ištrinti"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Inactive Meters */}
            {inactiveMeters.length > 0 && (
              <div className="space-y-3 mt-6">
                <h5 className="text-sm font-medium text-gray-700">Neaktyvūs skaitliukai ({inactiveMeters.length})</h5>
                {inactiveMeters.map((meter) => (
                  <div key={meter.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50 opacity-75">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h5 className="font-medium text-gray-700">{meter.name}</h5>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            meter.type === 'individual' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {meter.type === 'individual' ? 'Individualus' : 'Bendras'}
                          </span>
                          <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                            Neaktyvus
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mb-2">{meter.description}</p>
                        <div className="text-sm text-gray-400 space-y-1">
                          <div>Vienetas: {meter.unit}</div>
                          <div>Kaina: {meter.fixed_price ? `${meter.fixed_price}€` : `${meter.price_per_unit}€/${meter.unit}`}</div>
                          <div>Pasiskirstymas: {
                            meter.distribution_method === 'per_apartment' ? 'Pagal butus' :
                            meter.distribution_method === 'per_area' ? 'Pagal plotą' : 'Fiksuotas'
                          }</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingMeter(meter)}
                          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                          title="Redaguoti"
                        >
                          <Cog6ToothIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => updateMeter(meter.id, { is_active: true })}
                          className="p-2 text-green-400 hover:text-green-600 transition-colors"
                          title="Aktyvuoti"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => deleteMeter(meter.id)}
                          className="p-2 text-red-400 hover:text-red-600 transition-colors"
                          title="Ištrinti"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'expenses' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-medium text-gray-900">Mėnesinės sąnaudos</h4>
              <button
                onClick={() => setShowAddExpense(true)}
                className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <PlusIcon className="w-4 h-4" />
                <span>Pridėti sąnaudas</span>
              </button>
            </div>

            <div className="space-y-3">
              {expenses.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>Nėra pridėtų sąnaudų</p>
                  <p className="text-sm">Pridėkite sąnaudas, kad matytumėte jų sąrašą</p>
                </div>
              ) : (
                expenses.map((expense) => {
                  const meter = meters.find(m => m.id === expense.meter_id);
                  if (!meter) return null;
                  return (
                    <div key={expense.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="font-medium text-gray-900">{meter?.name || 'Nežinomas skaitliukas'}</h5>
                          <p className="text-sm text-gray-600">{expense.month}</p>
                          <div className="text-sm text-gray-500 space-y-1 mt-2">
                            <div>Bendra suma: {expense.total_amount}€</div>
                            <div>Vienam butui: {expense.distribution_amount}€</div>
                            {expense.total_units && <div>Vienetai: {expense.total_units}</div>}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setExpenses(prev => prev.filter(exp => exp.id !== expense.id));
                          }}
                          className="p-2 text-red-400 hover:text-red-600 transition-colors"
                          title="Ištrinti sąnaudas"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {activeTab === 'distribution' && (
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-gray-900">Sąnaudų pasiskirstymas</h4>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="mb-4">
                <h5 className="font-medium text-gray-900 mb-2">Informacija:</h5>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>• Butų skaičius: {totalApartments}</div>
                  <div>• Aktyvūs skaitliukai: {activeMeters.length}</div>
                  <div>• Mėnesinių sąnaudų: {expenses.length}</div>
                </div>
              </div>
              
              <h5 className="font-medium text-gray-900 mb-3">Mėnesinės sąnaudos vienam butui:</h5>
              <div className="space-y-2">
                {activeMeters.map((meter) => {
                  const lastExpense = expenses
                    .filter(exp => exp.meter_id === meter.id)
                    .sort((a, b) => b.month.localeCompare(a.month))[0];
                  
                  return (
                    <div key={meter.id} className="flex items-center justify-between py-2 border-b border-gray-200 last:border-b-0">
                      <div>
                        <span className="text-sm text-gray-700">{meter.name}</span>
                        <div className="text-xs text-gray-500">
                          {meter.distribution_method === 'per_apartment' ? 'Pagal butus' :
                           meter.distribution_method === 'per_area' ? 'Pagal plotą' : 'Fiksuotas'}
                        </div>
                      </div>
                      <span className="font-medium">
                        {lastExpense ? `${lastExpense.distribution_amount}€` : 'Nenurodyta'}
                      </span>
                    </div>
                  );
                })}
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">Iš viso vienam butui:</span>
                  <span className="font-bold text-lg text-[#2F8481]">
                    {activeMeters.reduce((total, meter) => {
                      const lastExpense = expenses
                        .filter(exp => exp.meter_id === meter.id)
                        .sort((a, b) => b.month.localeCompare(a.month))[0];
                      return total + (lastExpense?.distribution_amount || 0);
                    }, 0).toFixed(2)}€
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Meter Modal */}
      {showAddMeter && (
        <UniversalAddMeterModal
          isOpen={true}
          onClose={() => setShowAddMeter(false)}
          onAddMeters={(metersData) => {
            metersData.forEach(data => {
              const meter: Omit<CommunalMeter, 'id' | 'created_at' | 'updated_at'> = {
                name: data.label || data.title || data.custom_name || '',
                type: data.mode === 'individual' ? 'individual' : 'communal',
                unit: (data.unit === 'custom' ? 'Kitas' : data.unit) as 'm3' | 'kWh' | 'GJ' | 'Kitas',
                price_per_unit: data.price_per_unit || 0,
                fixed_price: data.fixed_price,
                distribution_method: data.allocation as any, // Convert from universal to specific type
                description: data.notes || '',
                is_active: true
              };
              addMeter(meter);
            });
          }}
          title="Pridėti komunalinį skaitiklį"
          allowMultiple={false}
        />
      )}

      {/* Add Expense Modal */}
      {showAddExpense && (
        <AddExpenseModal
          meters={activeMeters}
          onClose={() => setShowAddExpense(false)}
          onAdd={addExpense}
        />
      )}

      {/* Edit Meter Modal */}
      {editingMeter && (
        <EditMeterModal
          meter={editingMeter}
          onClose={() => setEditingMeter(null)}
          onSave={(updatedMeter) => {
            updateMeter(editingMeter.id, updatedMeter);
            setEditingMeter(null);
          }}
        />
      )}
    </div>
  );
};

// Add Meter Modal Component
interface AddMeterModalProps {
  onClose: () => void;
  onAdd: (meter: Omit<CommunalMeter, 'id' | 'created_at' | 'updated_at'>) => void;
}

const AddMeterModal: React.FC<AddMeterModalProps> = ({ onClose, onAdd }) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'individual' as const,
    unit: 'm3' as 'm3' | 'kWh' | 'GJ' | 'Kitas',
    price_per_unit: 0,
    fixed_price: 0,
    distribution_method: 'per_apartment' as DistributionMethod,
    description: '',
    is_active: true
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Pridėti skaitliuką</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pavadinimas</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481]"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipas</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481]"
            >
              <option value="individual">Individualus</option>
              <option value="communal">Bendras</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vienetas</label>
            <select
              value={formData.unit}
              onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481]"
            >
              <option value="m3">m³ (kubiniai metrai)</option>
              <option value="kWh">kWh (kilovatvalandės)</option>
              <option value="GJ">GJ (gigadžauliai)</option>
              <option value="Kitas">Kitas</option>
            </select>
          </div>

          {formData.distribution_method === 'fixed_split' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fiksuota suma (€)</label>
              <input
                type="number"
                step="0.01"
                value={formData.fixed_price}
                onChange={(e) => setFormData(prev => ({ ...prev, fixed_price: parseFloat(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481]"
                required
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kaina už vienetą (€)</label>
              <input
                type="number"
                step="0.01"
                value={formData.price_per_unit}
                onChange={(e) => setFormData(prev => ({ ...prev, price_per_unit: parseFloat(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481]"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pasiskirstymo metodas</label>
            <select
              value={formData.distribution_method}
              onChange={(e) => setFormData(prev => ({ ...prev, distribution_method: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481]"
            >
              <option value="per_apartment">Pagal butus</option>
              <option value="per_area">Pagal plotą</option>
              <option value="per_consumption">Pagal suvartojimą</option>
              <option value="fixed_split">Fiksuotas pasiskirstymas</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Aprašymas</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Atšaukti
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#2F8481] text-white hover:bg-[#2a7875] rounded-lg transition-colors"
            >
              Pridėti
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Edit Meter Modal Component
interface EditMeterModalProps {
  meter: CommunalMeter;
  onClose: () => void;
  onSave: (meter: Partial<CommunalMeter>) => void;
}

const EditMeterModal: React.FC<EditMeterModalProps> = ({ meter, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: meter.name,
    type: meter.type,
    unit: meter.unit,
    price_per_unit: meter.price_per_unit,
    fixed_price: meter.fixed_price || 0,
    distribution_method: meter.distribution_method,
    description: meter.description,
    is_active: meter.is_active
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Redaguoti skaitliuką</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pavadinimas</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481]"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipas</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481]"
            >
              <option value="individual">Individualus</option>
              <option value="communal">Bendras</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vienetas</label>
            <select
              value={formData.unit}
              onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481]"
            >
              <option value="m3">m³ (kubiniai metrai)</option>
              <option value="kWh">kWh (kilovatvalandės)</option>
              <option value="GJ">GJ (gigadžauliai)</option>
              <option value="Kitas">Kitas</option>
            </select>
          </div>

          {formData.distribution_method === 'fixed_split' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fiksuota suma (€)</label>
              <input
                type="number"
                step="0.01"
                value={formData.fixed_price}
                onChange={(e) => setFormData(prev => ({ ...prev, fixed_price: parseFloat(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481]"
                required
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kaina už vienetą (€)</label>
              <input
                type="number"
                step="0.01"
                value={formData.price_per_unit}
                onChange={(e) => setFormData(prev => ({ ...prev, price_per_unit: parseFloat(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481]"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pasiskirstymo metodas</label>
            <select
              value={formData.distribution_method}
              onChange={(e) => setFormData(prev => ({ ...prev, distribution_method: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481]"
            >
              <option value="per_apartment">Pagal butus</option>
              <option value="per_area">Pagal plotą</option>
              <option value="per_consumption">Pagal suvartojimą</option>
              <option value="fixed_split">Fiksuotas pasiskirstymas</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Aprašymas</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481]"
              rows={3}
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                className="rounded border-gray-300 text-[#2F8481] focus:ring-[#2F8481]"
              />
              <span className="ml-2 text-sm text-gray-700">Aktyvus</span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Atšaukti
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#2F8481] text-white hover:bg-[#2a7875] rounded-lg transition-colors"
            >
              Išsaugoti
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Add Expense Modal Component
interface AddExpenseModalProps {
  meters: CommunalMeter[];
  onClose: () => void;
  onAdd: (expense: Omit<CommunalExpense, 'id' | 'created_at' | 'distribution_amount'>) => void;
}

const AddExpenseModal: React.FC<AddExpenseModalProps> = ({ meters, onClose, onAdd }) => {
  const [formData, setFormData] = useState({
    meter_id: '',
    month: new Date().toISOString().slice(0, 7), // YYYY-MM format
    total_amount: 0,
    total_units: 0,
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Pridėti sąnaudas</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Skaitliukas</label>
            <select
              value={formData.meter_id}
              onChange={(e) => setFormData(prev => ({ ...prev, meter_id: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481]"
              required
            >
              <option value="">Pasirinkite skaitliuką</option>
              {meters.map((meter) => (
                <option key={meter.id} value={meter.id}>{meter.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mėnuo</label>
            <input
              type="month"
              value={formData.month}
              onChange={(e) => setFormData(prev => ({ ...prev, month: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bendra suma (€)</label>
            <input
              type="number"
              step="0.01"
              value={formData.total_amount}
              onChange={(e) => setFormData(prev => ({ ...prev, total_amount: parseFloat(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bendri vienetai (neprivaloma)</label>
            <input
              type="number"
              step="0.01"
              value={formData.total_units}
              onChange={(e) => setFormData(prev => ({ ...prev, total_units: parseFloat(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pastabos</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481]"
              rows={3}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Atšaukti
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#2F8481] text-white hover:bg-[#2a7875] rounded-lg transition-colors"
            >
              Pridėti
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
