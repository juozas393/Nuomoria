/* eslint-disable react/prop-types */
import React, { useState } from 'react';
import { 
  XMarkIcon,
  HomeIcon,
  UserIcon,
  CurrencyEuroIcon,
  PhoneIcon,
  EnvelopeIcon,
  CalendarIcon,
  CreditCardIcon,
  PlusIcon,
  BuildingOfficeIcon,
  ArrowLeftIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import MeterTable from '../meters/MeterTable';
import { MeterRow } from '../../types/meters';

interface AddApartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (apartmentData: ApartmentData | MultipleApartmentData) => void;
  address?: string;
}

interface ApartmentData {
  type: 'single';
  apartmentNumber: string;
  area: number;
  rooms: number;
  monthlyRent: number;
  deposit: number;
  tenantName: string;
  tenantPhone: string;
  tenantEmail: string;
  contractStart: string;
  contractEnd: string;
  address: string;
  meters: MeterRow[];
}

interface MultipleApartmentData {
  type: 'multiple';
  apartments: {
    apartmentNumber: string;
    area: number;
    rooms: number;
    monthlyRent: number;
    deposit: number;
    tenantName: string;
    tenantPhone: string;
    tenantEmail: string;
    contractStart: string;
    contractEnd: string;
  }[];
  address: string;
  meters: MeterRow[];
}

type ModalStep = 'type-selection' | 'single-apartment' | 'multiple-apartments';

export const AddApartmentModal: React.FC<AddApartmentModalProps> = React.memo(({
  isOpen,
  onClose,
  onAdd,
  address = ''
}) => {
  const [currentStep, setCurrentStep] = useState<ModalStep>('type-selection');
  const [apartmentType, setApartmentType] = useState<'single' | 'multiple'>('single');
  
  // Default meters for new apartments
  const defaultMeters: MeterRow[] = [
    {
      id: 'meter-1',
      key: 'cold-water',
      name: 'Šaltas vanduo',
      unit: 'm3',
      rate: 1.2,
      initialReading: 0,
      photoRequired: true
    },
    {
      id: 'meter-2',
      key: 'hot-water',
      name: 'Karštas vanduo',
      unit: 'm3',
      rate: 3.5,
      initialReading: 0,
      photoRequired: true
    },
    {
      id: 'meter-3',
      key: 'electricity',
      name: 'Elektra',
      unit: 'kWh',
      rate: 0.15,
      initialReading: 0,
      photoRequired: true
    }
  ];

  // Single apartment form data
  const [singleFormData, setSingleFormData] = useState<Omit<ApartmentData, 'type'>>({
    apartmentNumber: '',
    area: 0,
    rooms: 0,
    monthlyRent: 0,
    deposit: 0,
    tenantName: '',
    tenantPhone: '',
    tenantEmail: '',
    contractStart: '',
    contractEnd: '',
    address: address,
    meters: defaultMeters
  });

  // Multiple apartments form data
  const [multipleFormData, setMultipleFormData] = useState<Omit<MultipleApartmentData, 'type'>>({
    apartments: [{
      apartmentNumber: '',
      area: 0,
      rooms: 0,
      monthlyRent: 0,
      deposit: 0,
      tenantName: '',
      tenantPhone: '',
      tenantEmail: '',
      contractStart: '',
      contractEnd: ''
    }],
    address: address,
    meters: defaultMeters
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Single apartment input change handler
  const handleSingleInputChange = (field: keyof Omit<ApartmentData, 'type'>, value: string | number | MeterRow[]) => {
    setSingleFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Handle number input changes with proper empty value handling
  const handleNumberInputChange = (field: keyof Omit<ApartmentData, 'type'>, value: string) => {
    // Allow empty string, convert to 0 only when needed for calculations
    const numericValue = value === '' ? 0 : Number(value);
    handleSingleInputChange(field, numericValue);
  };

  // Multiple apartments input change handler
  const handleMultipleInputChange = (apartmentIndex: number, field: string, value: string | number) => {
    setMultipleFormData(prev => ({
      ...prev,
      apartments: prev.apartments.map((apt, index) => 
        index === apartmentIndex ? { ...apt, [field]: value } : apt
      )
    }));
    
    // Clear error when user starts typing
    const errorKey = `apartment_${apartmentIndex}_${field}`;
    if (errors[errorKey]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
    }
  };

  // Handle number input changes for multiple apartments with proper empty value handling
  const handleMultipleNumberInputChange = (apartmentIndex: number, field: string, value: string) => {
    // Allow empty string, convert to 0 only when needed for calculations
    const numericValue = value === '' ? 0 : Number(value);
    handleMultipleInputChange(apartmentIndex, field, numericValue);
  };

  // Add new apartment to multiple apartments
  const addApartment = () => {
    setMultipleFormData(prev => ({
      ...prev,
      apartments: [...prev.apartments, {
        apartmentNumber: '',
        area: 0,
        rooms: 0,
        monthlyRent: 0,
        deposit: 0,
        tenantName: '',
        tenantPhone: '',
        tenantEmail: '',
        contractStart: '',
        contractEnd: ''
      }]
    }));
  };

  // Remove apartment from multiple apartments
  const removeApartment = (index: number) => {
    if (multipleFormData.apartments.length > 1) {
      setMultipleFormData(prev => ({
        ...prev,
        apartments: prev.apartments.filter((_, i) => i !== index)
      }));
    }
  };

  // Handle apartment type selection
  const handleTypeSelection = (type: 'single' | 'multiple') => {
    setApartmentType(type);
    if (type === 'single') {
      setCurrentStep('single-apartment');
    } else {
      setCurrentStep('multiple-apartments');
    }
  };

  // Go back to type selection
  const goBackToTypeSelection = () => {
    setCurrentStep('type-selection');
    setErrors({});
  };

  // Validate single apartment form
  const validateSingleForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!singleFormData.apartmentNumber.trim()) {
      newErrors.apartmentNumber = 'Buto numeris yra privalomas';
    }

    if (singleFormData.area <= 0) {
      newErrors.area = 'Plotas turi būti didesnis už 0';
    }

    if (singleFormData.rooms <= 0) {
      newErrors.rooms = 'Kambarių skaičius turi būti didesnis už 0';
    }

    if (singleFormData.monthlyRent <= 0) {
      newErrors.monthlyRent = 'Nuoma turi būti didesnė už 0';
    }

    if (!singleFormData.tenantName.trim()) {
      newErrors.tenantName = 'Nuomininko vardas yra privalomas';
    }

    if (!singleFormData.contractStart) {
      newErrors.contractStart = 'Sutarties pradžios data yra privaloma';
    }

    if (!singleFormData.contractEnd) {
      newErrors.contractEnd = 'Sutarties pabaigos data yra privaloma';
    }

    if (singleFormData.contractStart && singleFormData.contractEnd) {
      const startDate = new Date(singleFormData.contractStart);
      const endDate = new Date(singleFormData.contractEnd);
      if (endDate <= startDate) {
        newErrors.contractEnd = 'Sutarties pabaigos data turi būti vėlesnė už pradžios datą';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Validate multiple apartments form
  const validateMultipleForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    multipleFormData.apartments.forEach((apartment, index) => {
      if (!apartment.apartmentNumber.trim()) {
        newErrors[`apartment_${index}_apartmentNumber`] = 'Buto numeris yra privalomas';
      }

      if (apartment.area <= 0) {
        newErrors[`apartment_${index}_area`] = 'Plotas turi būti didesnis už 0';
      }

      if (apartment.rooms <= 0) {
        newErrors[`apartment_${index}_rooms`] = 'Kambarių skaičius turi būti didesnis už 0';
      }

      if (apartment.monthlyRent <= 0) {
        newErrors[`apartment_${index}_monthlyRent`] = 'Nuoma turi būti didesnė už 0';
      }

      if (!apartment.tenantName.trim()) {
        newErrors[`apartment_${index}_tenantName`] = 'Nuomininko vardas yra privalomas';
      }

      if (!apartment.contractStart) {
        newErrors[`apartment_${index}_contractStart`] = 'Sutarties pradžios data yra privaloma';
      }

      if (!apartment.contractEnd) {
        newErrors[`apartment_${index}_contractEnd`] = 'Sutarties pabaigos data yra privaloma';
      }

      if (apartment.contractStart && apartment.contractEnd) {
        const startDate = new Date(apartment.contractStart);
        const endDate = new Date(apartment.contractEnd);
        if (endDate <= startDate) {
          newErrors[`apartment_${index}_contractEnd`] = 'Sutarties pabaigos data turi būti vėlesnė už pradžios datą';
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle single apartment submit
  const handleSingleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateSingleForm()) {
      onAdd({
        type: 'single',
        ...singleFormData
      });
      handleClose();
    }
  };

  // Handle multiple apartments submit
  const handleMultipleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateMultipleForm()) {
      onAdd({
        type: 'multiple',
        ...multipleFormData
      });
      handleClose();
    }
  };

  const handleClose = () => {
    setCurrentStep('type-selection');
    setApartmentType('single');
    setSingleFormData({
      apartmentNumber: '',
      area: 0,
      rooms: 0,
      monthlyRent: 0,
      deposit: 0,
      tenantName: '',
      tenantPhone: '',
      tenantEmail: '',
      contractStart: '',
      contractEnd: '',
      address: address,
      meters: defaultMeters
    });
    setMultipleFormData({
      apartments: [{
        apartmentNumber: '',
        area: 0,
        rooms: 0,
        monthlyRent: 0,
        deposit: 0,
        tenantName: '',
        tenantPhone: '',
        tenantEmail: '',
        contractStart: '',
        contractEnd: ''
      }],
      address: address,
      meters: defaultMeters
    });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  const renderTypeSelection = () => (
    <div className="p-6">
      <div className="text-center mb-6">
        <BuildingOfficeIcon className="w-12 h-12 text-[#2F8481] mx-auto mb-3" />
        <h2 className="text-xl font-bold text-gray-900 mb-1">Pridėti butus</h2>
        <p className="text-sm text-gray-600">{address}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Single Apartment Option */}
        <button
          onClick={() => handleTypeSelection('single')}
          className="p-4 border-2 border-gray-200 rounded-lg hover:border-[#2F8481] hover:bg-[#2F8481]/5 transition-all duration-200 group"
        >
          <div className="text-center">
            <div className="w-10 h-10 bg-[#2F8481]/10 rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:bg-[#2F8481]/20 transition-colors">
              <HomeIcon className="w-5 h-5 text-[#2F8481]" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-2">Vienas butas</h3>
            <p className="text-xs text-gray-600">
              Pilna informacija su skaitliukais
            </p>
          </div>
        </button>

        {/* Multiple Apartments Option */}
        <button
          onClick={() => handleTypeSelection('multiple')}
          className="p-4 border-2 border-gray-200 rounded-lg hover:border-[#2F8481] hover:bg-[#2F8481]/5 transition-all duration-200 group"
        >
          <div className="text-center">
            <div className="w-10 h-10 bg-[#2F8481]/10 rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:bg-[#2F8481]/20 transition-colors">
              <BuildingOfficeIcon className="w-5 h-5 text-[#2F8481]" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-2">Keli butai</h3>
            <p className="text-xs text-gray-600">
              Greitas kelių butų pridėjimas
            </p>
          </div>
        </button>
      </div>
    </div>
  );

  const renderHeader = (title: string, subtitle: string, showBack: boolean = false) => (
    <div className="flex items-center justify-between p-6 border-b border-gray-200">
      <div className="flex items-center space-x-3">
        {showBack && (
          <button
            onClick={goBackToTypeSelection}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
        )}
        <div className="w-10 h-10 bg-[#2F8481]/10 rounded-lg flex items-center justify-center">
          <HomeIcon className="w-5 h-5 text-[#2F8481]" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-600">{subtitle}</p>
        </div>
      </div>
      <button
        onClick={handleClose}
        className="text-gray-400 hover:text-gray-600 transition-colors"
      >
        <XMarkIcon className="w-6 h-6" />
      </button>
    </div>
  );

  const renderSingleApartmentForm = () => (
    <form onSubmit={handleSingleSubmit} className="p-6 space-y-4">
      {/* Apartment Details */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
          <HomeIcon className="w-4 h-4 mr-2 text-[#2F8481]" />
          Butas
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Numeris
            </label>
            <input
              type="text"
              value={singleFormData.apartmentNumber}
              onChange={(e) => handleSingleInputChange('apartmentNumber', e.target.value)}
              className={`w-full px-3 py-2 text-sm border rounded-md focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481] ${
                errors.apartmentNumber ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="5"
            />
            {errors.apartmentNumber && (
              <p className="mt-1 text-xs text-red-600">{errors.apartmentNumber}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Plotas (m²)
            </label>
            <input
              type="number"
              value={singleFormData.area || ''}
              onChange={(e) => handleNumberInputChange('area', e.target.value)}
              className={`w-full px-3 py-2 text-sm border rounded-md focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481] ${
                errors.area ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="45"
            />
            {errors.area && (
              <p className="mt-1 text-xs text-red-600">{errors.area}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Kambariai
            </label>
            <input
              type="number"
              value={singleFormData.rooms || ''}
              onChange={(e) => handleNumberInputChange('rooms', e.target.value)}
              className={`w-full px-3 py-2 text-sm border rounded-md focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481] ${
                errors.rooms ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="2"
            />
            {errors.rooms && (
              <p className="mt-1 text-xs text-red-600">{errors.rooms}</p>
            )}
          </div>
        </div>
      </div>

      {/* Financial Details */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
          <CurrencyEuroIcon className="w-4 h-4 mr-2 text-[#2F8481]" />
          Finansai
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Nuoma (€/mėn)
            </label>
            <input
              type="number"
              step="0.01"
              value={singleFormData.monthlyRent || ''}
              onChange={(e) => handleNumberInputChange('monthlyRent', e.target.value)}
              className={`w-full px-3 py-2 text-sm border rounded-md focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481] ${
                errors.monthlyRent ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="520"
            />
            {errors.monthlyRent && (
              <p className="mt-1 text-xs text-red-600">{errors.monthlyRent}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Depozitas (€)
            </label>
            <input
              type="number"
              step="0.01"
              value={singleFormData.deposit || ''}
              onChange={(e) => handleNumberInputChange('deposit', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481]"
              placeholder="1040"
            />
          </div>
        </div>
      </div>

      {/* Tenant Information */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
          <UserIcon className="w-4 h-4 mr-2 text-[#2F8481]" />
          Nuomininkas
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Vardas, pavardė
            </label>
            <input
              type="text"
              value={singleFormData.tenantName}
              onChange={(e) => handleSingleInputChange('tenantName', e.target.value)}
              className={`w-full px-3 py-2 text-sm border rounded-md focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481] ${
                errors.tenantName ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Jonas Jonaitis"
            />
            {errors.tenantName && (
              <p className="mt-1 text-xs text-red-600">{errors.tenantName}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Telefonas
            </label>
            <input
              type="tel"
              value={singleFormData.tenantPhone}
              onChange={(e) => handleSingleInputChange('tenantPhone', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481]"
              placeholder="+370 600 00000"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              El. paštas
            </label>
            <input
              type="email"
              value={singleFormData.tenantEmail}
              onChange={(e) => handleSingleInputChange('tenantEmail', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481]"
              placeholder="jonas@example.com"
            />
          </div>
        </div>
      </div>

      {/* Contract Dates */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
          <CalendarIcon className="w-4 h-4 mr-2 text-[#2F8481]" />
          Sutartis
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Pradžia
            </label>
            <input
              type="date"
              value={singleFormData.contractStart}
              onChange={(e) => handleSingleInputChange('contractStart', e.target.value)}
              className={`w-full px-3 py-2 text-sm border rounded-md focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481] ${
                errors.contractStart ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.contractStart && (
              <p className="mt-1 text-xs text-red-600">{errors.contractStart}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Pabaiga
            </label>
            <input
              type="date"
              value={singleFormData.contractEnd}
              onChange={(e) => handleSingleInputChange('contractEnd', e.target.value)}
              className={`w-full px-3 py-2 text-sm border rounded-md focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481] ${
                errors.contractEnd ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.contractEnd && (
              <p className="mt-1 text-xs text-red-600">{errors.contractEnd}</p>
            )}
          </div>
        </div>
      </div>

      {/* Meters Section */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
          <CreditCardIcon className="w-4 h-4 mr-2 text-[#2F8481]" />
          Skaitliukai
        </h3>
        <div className="text-xs text-gray-600 mb-3">
          Pagrindiniai skaitliukai pridėti automatiškai
        </div>
        <MeterTable 
          value={singleFormData.meters}
          onChange={(meters) => handleSingleInputChange('meters', meters)}
          allowDuplicatesByKey={false}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={handleClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#2F8481]"
        >
          Atšaukti
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-[#2F8481] border border-transparent rounded-md hover:bg-[#297a77] focus:outline-none focus:ring-2 focus:ring-[#2F8481]"
        >
          Pridėti butą
        </button>
      </div>
    </form>
  );

  const renderMultipleApartmentsForm = () => (
    <form onSubmit={handleMultipleSubmit} className="p-6 space-y-6">
      {/* Apartments List */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Butai</h3>
          <button
            type="button"
            onClick={addApartment}
            className="inline-flex items-center px-3 py-2 bg-[#2F8481] text-white text-sm rounded-lg hover:bg-[#297a77] transition-colors"
          >
            <PlusIcon className="w-4 h-4 mr-1" />
            Pridėti butą
          </button>
        </div>

        {multipleFormData.apartments.map((apartment, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-md font-medium text-gray-900">Butas #{index + 1}</h4>
              {multipleFormData.apartments.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeApartment(index)}
                  className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Buto numeris
                </label>
                <input
                  type="text"
                  value={apartment.apartmentNumber}
                  onChange={(e) => handleMultipleInputChange(index, 'apartmentNumber', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481] ${
                    errors[`apartment_${index}_apartmentNumber`] ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Pvz., 5"
                />
                {errors[`apartment_${index}_apartmentNumber`] && (
                  <p className="mt-1 text-sm text-red-600">{errors[`apartment_${index}_apartmentNumber`]}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Plotas (m²)
                </label>
                <input
                  type="number"
                  value={apartment.area || ''}
                  onChange={(e) => handleMultipleNumberInputChange(index, 'area', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481] ${
                    errors[`apartment_${index}_area`] ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Pvz., 45"
                />
                {errors[`apartment_${index}_area`] && (
                  <p className="mt-1 text-sm text-red-600">{errors[`apartment_${index}_area`]}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kambariai
                </label>
                <input
                  type="number"
                  value={apartment.rooms || ''}
                  onChange={(e) => handleMultipleNumberInputChange(index, 'rooms', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481] ${
                    errors[`apartment_${index}_rooms`] ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Pvz., 2"
                />
                {errors[`apartment_${index}_rooms`] && (
                  <p className="mt-1 text-sm text-red-600">{errors[`apartment_${index}_rooms`]}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mėnesinė nuoma (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={apartment.monthlyRent || ''}
                  onChange={(e) => handleMultipleNumberInputChange(index, 'monthlyRent', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481] ${
                    errors[`apartment_${index}_monthlyRent`] ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Pvz., 520.00"
                />
                {errors[`apartment_${index}_monthlyRent`] && (
                  <p className="mt-1 text-sm text-red-600">{errors[`apartment_${index}_monthlyRent`]}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Depozitas (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={apartment.deposit || ''}
                  onChange={(e) => handleMultipleNumberInputChange(index, 'deposit', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481]"
                  placeholder="Pvz., 1040.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nuomininko vardas
                </label>
                <input
                  type="text"
                  value={apartment.tenantName}
                  onChange={(e) => handleMultipleInputChange(index, 'tenantName', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481] ${
                    errors[`apartment_${index}_tenantName`] ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Pvz., Jonas Jonaitis"
                />
                {errors[`apartment_${index}_tenantName`] && (
                  <p className="mt-1 text-sm text-red-600">{errors[`apartment_${index}_tenantName`]}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telefono numeris
                </label>
                <input
                  type="tel"
                  value={apartment.tenantPhone}
                  onChange={(e) => handleMultipleInputChange(index, 'tenantPhone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481]"
                  placeholder="Pvz., +370 600 00000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  El. paštas
                </label>
                <input
                  type="email"
                  value={apartment.tenantEmail}
                  onChange={(e) => handleMultipleInputChange(index, 'tenantEmail', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481]"
                  placeholder="Pvz., jonas@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sutarties pradžia
                </label>
                <input
                  type="date"
                  value={apartment.contractStart}
                  onChange={(e) => handleMultipleInputChange(index, 'contractStart', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481] ${
                    errors[`apartment_${index}_contractStart`] ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors[`apartment_${index}_contractStart`] && (
                  <p className="mt-1 text-sm text-red-600">{errors[`apartment_${index}_contractStart`]}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sutarties pabaiga
                </label>
                <input
                  type="date"
                  value={apartment.contractEnd}
                  onChange={(e) => handleMultipleInputChange(index, 'contractEnd', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481] ${
                    errors[`apartment_${index}_contractEnd`] ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors[`apartment_${index}_contractEnd`] && (
                  <p className="mt-1 text-sm text-red-600">{errors[`apartment_${index}_contractEnd`]}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={handleClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#2F8481]"
        >
          Atšaukti
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-[#2F8481] border border-transparent rounded-lg hover:bg-[#297a77] focus:outline-none focus:ring-2 focus:ring-[#2F8481]"
        >
          Pridėti butus ({multipleFormData.apartments.length})
        </button>
      </div>
    </form>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        {currentStep === 'type-selection' && (
          <>
            {renderHeader('Pridėti butus', 'Pasirinkite, kaip norite pridėti butus')}
            {renderTypeSelection()}
          </>
        )}

        {currentStep === 'single-apartment' && (
          <>
            {renderHeader('Pridėti butą', address, true)}
            {renderSingleApartmentForm()}
          </>
        )}

        {currentStep === 'multiple-apartments' && (
          <>
            {renderHeader('Pridėti butus', address, true)}
            {renderMultipleApartmentsForm()}
          </>
        )}
      </div>
    </div>
  );
});

AddApartmentModal.displayName = 'AddApartmentModal';