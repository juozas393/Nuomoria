/* eslint-disable react/prop-types */
/**
 * AddApartmentModal - Premium Design
 * Matches app-wide modal pattern: ModalBackground.png backdrop + CardsBackground.webp on cards
 */
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import LtDateInput from '../ui/LtDateInput';
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
  TrashIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';
import MeterTable from '../meters/MeterTable';
import { MeterRow } from '../../types/meters';

const cardsBg = '/images/CardsBackground.webp';

interface AddApartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (apartmentData: ApartmentData | MultipleApartmentData) => void;
  address?: string;
}

export interface ApartmentData {
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

export interface MultipleApartmentData {
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

type ModalStep = 'type-selection' | 'single-apartment' | 'multiple-apartments';

export const AddApartmentModal: React.FC<AddApartmentModalProps> = React.memo(({
  isOpen,
  onClose,
  onAdd,
  address = ''
}) => {
  const [currentStep, setCurrentStep] = useState<ModalStep>('single-apartment');
  const [apartmentType, setApartmentType] = useState<'single' | 'multiple'>('single');

  // Default meters for new apartments
  const defaultMeters: MeterRow[] = [
    {
      id: 'meter-1',
      key: 'cold_water',
      name: 'Šaltas vanduo',
      unit: 'm3',
      rate: 1.32,
      initialReading: 0,
      photoRequired: true
    },
    {
      id: 'meter-2',
      key: 'hot_water',
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
      rate: 0.23,
      initialReading: 0,
      photoRequired: true
    },
    {
      id: 'meter-4',
      key: 'heating',
      name: 'Šildymas',
      unit: 'kWh',
      rate: 0.095,
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

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [metersExpanded, setMetersExpanded] = useState(true);

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
    const numValue = value === '' ? 0 : parseFloat(value);
    handleSingleInputChange(field, numValue);
  };

  // Multiple apartments input change handler
  const handleMultipleInputChange = (apartmentIndex: number, field: string, value: string | number) => {
    setMultipleFormData(prev => {
      const updatedApartments = [...prev.apartments];
      updatedApartments[apartmentIndex] = {
        ...updatedApartments[apartmentIndex],
        [field]: value
      };
      return {
        ...prev,
        apartments: updatedApartments
      };
    });
    // Clear error
    const errorKey = `apartments.${apartmentIndex}.${field}`;
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
    const numValue = value === '' ? 0 : parseFloat(value);
    handleMultipleInputChange(apartmentIndex, field, numValue);
  };

  // Add new apartment to multiple apartments
  const addApartment = () => {
    setMultipleFormData(prev => ({
      ...prev,
      apartments: [
        ...prev.apartments,
        {
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
        }
      ]
    }));
  };

  // Remove apartment from multiple apartments
  const removeApartment = (index: number) => {
    if (multipleFormData.apartments.length <= 1) return;
    setMultipleFormData(prev => ({
      ...prev,
      apartments: prev.apartments.filter((_, i) => i !== index)
    }));
  };

  // Handle apartment type selection
  const handleTypeSelection = (type: 'single' | 'multiple') => {
    setApartmentType(type);
    if (type === 'single') {
      setCurrentStep('single-apartment');
    } else {
      setCurrentStep('multiple-apartments');
    }
    setErrors({});
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
    if (!singleFormData.area || singleFormData.area <= 0) {
      newErrors.area = 'Plotas turi būti didesnis nei 0';
    }
    if (!singleFormData.rooms || singleFormData.rooms <= 0) {
      newErrors.rooms = 'Kambarių skaičius turi būti didesnis nei 0';
    }
    if (!singleFormData.monthlyRent || singleFormData.monthlyRent <= 0) {
      newErrors.monthlyRent = 'Nuomos kaina turi būti didesnė nei 0';
    }

    // Contract dates are optional, but if both provided, end must be after start
    if (singleFormData.contractStart && singleFormData.contractEnd) {
      if (new Date(singleFormData.contractEnd) <= new Date(singleFormData.contractStart)) {
        newErrors.contractEnd = 'Pabaigos data turi būti vėlesnė nei pradžios data';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Validate multiple apartments form
  const validateMultipleForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    multipleFormData.apartments.forEach((apt, index) => {
      if (!apt.apartmentNumber.trim()) {
        newErrors[`apartments.${index}.apartmentNumber`] = 'Buto numeris yra privalomas';
      }
      if (!apt.area || apt.area <= 0) {
        newErrors[`apartments.${index}.area`] = 'Plotas turi būti didesnis nei 0';
      }
      if (!apt.rooms || apt.rooms <= 0) {
        newErrors[`apartments.${index}.rooms`] = 'Kambarių skaičius turi būti didesnis nei 0';
      }
      if (!apt.monthlyRent || apt.monthlyRent <= 0) {
        newErrors[`apartments.${index}.monthlyRent`] = 'Nuomos kaina turi būti didesnė nei 0';
      }
      // Contract dates optional, but if both provided, end must be after start
      if (apt.contractStart && apt.contractEnd) {
        if (new Date(apt.contractEnd) <= new Date(apt.contractStart)) {
          newErrors[`apartments.${index}.contractEnd`] = 'Pabaigos data turi būti vėlesnė nei pradžios data';
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle single apartment submit
  const handleSingleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateSingleForm()) return;
    onAdd({
      type: 'single',
      ...singleFormData
    });
  };

  // Handle multiple apartments submit
  const handleMultipleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateMultipleForm()) return;
    onAdd({
      type: 'multiple',
      ...multipleFormData
    });
  };

  const handleClose = () => {
    setCurrentStep('type-selection');
    setErrors({});
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
    onClose();
  };

  if (!isOpen) return null;

  // ─── Shared Styles ───────────────────────────────────────────
  const inputCls = (hasError?: boolean) =>
    `w-full px-3.5 py-2 text-[13px] text-gray-900 caret-gray-900 bg-white/90 border rounded-xl shadow-sm focus:ring-2 focus:ring-[#2F8481]/30 focus:border-[#2F8481] focus:bg-white transition-all placeholder:text-gray-400 ${hasError ? 'border-red-400 bg-red-50/50' : 'border-gray-200/80 hover:border-gray-300'
    }`;

  const labelCls = 'block text-[11px] font-semibold text-gray-600 uppercase tracking-wider mb-1';
  const sectionTitleCls = 'text-[13px] font-bold text-gray-800 tracking-tight';

  // ─── Type Selection ──────────────────────────────────────────
  const renderTypeSelection = () => (
    <div className="p-8 flex flex-col items-center gap-6">
      <p className="text-sm text-gray-400">Pasirinkite, kaip norite pridėti butus</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full max-w-lg">
        {/* Single Apartment Option */}
        <button
          onClick={() => handleTypeSelection('single')}
          className="group p-6 bg-white/95 border-2 border-transparent rounded-2xl hover:border-[#2F8481] shadow-lg hover:shadow-xl transition-all duration-300 text-left"
          style={{ backgroundImage: `url('${cardsBg}')`, backgroundSize: 'cover', backgroundPosition: 'center' }}
        >
          <div className="text-center">
            <div className="w-14 h-14 bg-[#2F8481]/10 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-[#2F8481]/20 transition-colors">
              <HomeIcon className="w-7 h-7 text-[#2F8481]" />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1">Vienas butas</h3>
            <p className="text-xs text-gray-500">
              Pilna informacija su skaitliukais
            </p>
          </div>
        </button>

        {/* Multiple Apartments Option */}
        <button
          onClick={() => handleTypeSelection('multiple')}
          className="group p-6 bg-white/95 border-2 border-transparent rounded-2xl hover:border-[#2F8481] shadow-lg hover:shadow-xl transition-all duration-300 text-left"
          style={{ backgroundImage: `url('${cardsBg}')`, backgroundSize: 'cover', backgroundPosition: 'center' }}
        >
          <div className="text-center">
            <div className="w-14 h-14 bg-[#2F8481]/10 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-[#2F8481]/20 transition-colors">
              <BuildingOfficeIcon className="w-7 h-7 text-[#2F8481]" />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1">Keli butai</h3>
            <p className="text-xs text-gray-500">
              Greitas kelių butų pridėjimas
            </p>
          </div>
        </button>
      </div>
    </div>
  );

  const renderSingleApartmentForm = () => (
    <form onSubmit={handleSingleSubmit} className="flex flex-col h-full min-h-0">
      <div className="flex-1 overflow-y-auto min-h-0 px-6 py-5 space-y-4">
        {/* Unified Property Card */}
        <div
          className="rounded-2xl border border-gray-200/50 shadow-[0_2px_8px_rgba(0,0,0,0.06)] p-5 bg-cover bg-center"
          style={{ backgroundImage: `url('${cardsBg}')` }}
        >
          {/* Section: Buto informacija */}
          <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-gray-200/40">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#2F8481]/15 to-[#2F8481]/5 flex items-center justify-center">
              <HomeIcon className="w-3.5 h-3.5 text-[#2F8481]" />
            </div>
            <h3 className={sectionTitleCls}>Buto informacija</h3>
          </div>

          {/* 5-field grid: Numeris + Plotas + Kambariai + Nuoma + Depozitas */}
          <div className="grid grid-cols-5 gap-3">
            <div>
              <label className={labelCls}>Numeris <span className="text-red-400">*</span></label>
              <input type="text" value={singleFormData.apartmentNumber} onChange={(e) => handleSingleInputChange('apartmentNumber', e.target.value)} className={inputCls(!!errors.apartmentNumber)} placeholder="5" />
              {errors.apartmentNumber && <p className="mt-1 text-[10px] text-red-500 font-medium">{errors.apartmentNumber}</p>}
            </div>
            <div>
              <label className={labelCls}>Plotas (m²) <span className="text-red-400">*</span></label>
              <input type="number" value={singleFormData.area || ''} onChange={(e) => handleNumberInputChange('area', e.target.value)} className={inputCls(!!errors.area)} placeholder="45" />
              {errors.area && <p className="mt-1 text-[10px] text-red-500 font-medium">{errors.area}</p>}
            </div>
            <div>
              <label className={labelCls}>Kambariai <span className="text-red-400">*</span></label>
              <input type="number" value={singleFormData.rooms || ''} onChange={(e) => handleNumberInputChange('rooms', e.target.value)} className={inputCls(!!errors.rooms)} placeholder="2" />
              {errors.rooms && <p className="mt-1 text-[10px] text-red-500 font-medium">{errors.rooms}</p>}
            </div>
            <div>
              <label className={labelCls}>Nuoma (€/mėn) <span className="text-red-400">*</span></label>
              <input type="number" step="0.01" value={singleFormData.monthlyRent || ''} onChange={(e) => handleNumberInputChange('monthlyRent', e.target.value)} className={inputCls(!!errors.monthlyRent)} placeholder="520" />
              {errors.monthlyRent && <p className="mt-1 text-[10px] text-red-500 font-medium">{errors.monthlyRent}</p>}
            </div>
            <div>
              <label className={labelCls}>Depozitas (€)</label>
              <input type="number" step="0.01" value={singleFormData.deposit || ''} onChange={(e) => handleNumberInputChange('deposit', e.target.value)} className={inputCls()} placeholder="1040" />
            </div>
          </div>
        </div>

        {/* Skaitliukai — always visible */}
        <div
          className="rounded-2xl border border-gray-200/50 shadow-[0_2px_8px_rgba(0,0,0,0.06)] p-5 bg-cover bg-center"
          style={{ backgroundImage: `url('${cardsBg}')` }}
        >
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200/40">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500/15 to-amber-500/5 flex items-center justify-center">
                <CreditCardIcon className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <div>
                <h3 className={sectionTitleCls}>Skaitliukai</h3>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Pasirink šabloną arba pridėk savo
                </p>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-[#2F8481] bg-[#2F8481]/10 px-2.5 py-1 rounded-full">
              {singleFormData.meters.length} pridėti
            </span>
          </div>
          <MeterTable
            value={singleFormData.meters}
            onChange={(meters) => handleSingleInputChange('meters', meters)}
            allowDuplicatesByKey={false}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-white/10 px-6 py-3.5 bg-neutral-900/70 backdrop-blur-md flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={handleClose}
          className="px-4 py-2 text-[13px] font-medium text-gray-400 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:text-gray-300 transition-all"
        >
          Atšaukti
        </button>
        <button
          type="submit"
          className="px-5 py-2 text-[13px] font-semibold text-white bg-gradient-to-r from-[#2F8481] to-[#267673] rounded-xl hover:from-[#297a77] hover:to-[#1f6b68] shadow-lg shadow-[#2F8481]/25 transition-all active:scale-[0.98] flex items-center gap-2"
        >
          <PlusIcon className="w-4 h-4" />
          Pridėti butą
        </button>
      </div>
    </form>
  );

  // ─── Multiple Apartments Form ────────────────────────────────
  const renderMultipleApartmentsForm = () => (
    <form onSubmit={handleMultipleSubmit} className="flex flex-col h-full min-h-0">
      <div className="flex-1 overflow-y-auto min-h-0 px-6 py-5 space-y-5">
        {/* Apartments List Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-white">Butai ({multipleFormData.apartments.length})</h3>
          <button
            type="button"
            onClick={addApartment}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#2F8481]/80 rounded-lg hover:bg-[#2F8481] transition-colors"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            Pridėti butą
          </button>
        </div>

        {multipleFormData.apartments.map((apt, index) => (
          <div
            key={index}
            className="bg-white/95 rounded-2xl border border-white/20 shadow-sm p-4"
            style={{ backgroundImage: `url('${cardsBg}')`, backgroundSize: 'cover', backgroundPosition: 'center' }}
          >
            {/* Card Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#2F8481]/10 flex items-center justify-center">
                  <span className="text-[#2F8481] text-sm font-bold">{index + 1}</span>
                </div>
                <h4 className={sectionTitleCls}>
                  Butas {apt.apartmentNumber ? `#${apt.apartmentNumber}` : `#${index + 1}`}
                </h4>
              </div>
              {multipleFormData.apartments.length > 1 && (
                <button type="button" onClick={() => removeApartment(index)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                  <TrashIcon className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="space-y-3">
              {/* Row 1: Nr + Plotas + Kamb + Nuoma + Depozitas */}
              <div className="grid grid-cols-5 gap-3">
                <div>
                  <label className={labelCls}>Numeris <span className="text-red-400">*</span></label>
                  <input type="text" value={apt.apartmentNumber} onChange={(e) => handleMultipleInputChange(index, 'apartmentNumber', e.target.value)} className={inputCls(!!errors[`apartments.${index}.apartmentNumber`])} placeholder="1" />
                  {errors[`apartments.${index}.apartmentNumber`] && <p className="mt-1 text-xs text-red-600">{errors[`apartments.${index}.apartmentNumber`]}</p>}
                </div>
                <div>
                  <label className={labelCls}>Plotas (m²) <span className="text-red-400">*</span></label>
                  <input type="number" value={apt.area || ''} onChange={(e) => handleMultipleNumberInputChange(index, 'area', e.target.value)} className={inputCls(!!errors[`apartments.${index}.area`])} placeholder="45" />
                  {errors[`apartments.${index}.area`] && <p className="mt-1 text-xs text-red-600">{errors[`apartments.${index}.area`]}</p>}
                </div>
                <div>
                  <label className={labelCls}>Kamb. <span className="text-red-400">*</span></label>
                  <input type="number" value={apt.rooms || ''} onChange={(e) => handleMultipleNumberInputChange(index, 'rooms', e.target.value)} className={inputCls(!!errors[`apartments.${index}.rooms`])} placeholder="2" />
                  {errors[`apartments.${index}.rooms`] && <p className="mt-1 text-xs text-red-600">{errors[`apartments.${index}.rooms`]}</p>}
                </div>
                <div>
                  <label className={labelCls}>Nuoma € <span className="text-red-400">*</span></label>
                  <input type="number" step="0.01" value={apt.monthlyRent || ''} onChange={(e) => handleMultipleNumberInputChange(index, 'monthlyRent', e.target.value)} className={inputCls(!!errors[`apartments.${index}.monthlyRent`])} placeholder="520" />
                  {errors[`apartments.${index}.monthlyRent`] && <p className="mt-1 text-xs text-red-600">{errors[`apartments.${index}.monthlyRent`]}</p>}
                </div>
                <div>
                  <label className={labelCls}>Depozitas €</label>
                  <input type="number" step="0.01" value={apt.deposit || ''} onChange={(e) => handleMultipleNumberInputChange(index, 'deposit', e.target.value)} className={inputCls()} placeholder="1040" />
                </div>
              </div>

              {/* Row 2: Nuomininkas + Tel + El. paštas */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>Nuomininkas</label>
                  <input type="text" value={apt.tenantName} onChange={(e) => handleMultipleInputChange(index, 'tenantName', e.target.value)} className={inputCls(!!errors[`apartments.${index}.tenantName`])} placeholder="Jonas Jonaitis" />
                </div>
                <div>
                  <label className={labelCls}>Telefonas</label>
                  <input type="tel" value={apt.tenantPhone} onChange={(e) => handleMultipleInputChange(index, 'tenantPhone', e.target.value)} className={inputCls()} placeholder="+370 600 00000" />
                </div>
                <div>
                  <label className={labelCls}>El. paštas</label>
                  <input type="email" value={apt.tenantEmail} onChange={(e) => handleMultipleInputChange(index, 'tenantEmail', e.target.value)} className={inputCls()} placeholder="jonas@example.com" />
                </div>
              </div>

              {/* Row 3: Sutarties datos */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Sutarties pradžia</label>
                  <LtDateInput value={apt.contractStart} onChange={(e) => handleMultipleInputChange(index, 'contractStart', e.target.value)} className={inputCls(!!errors[`apartments.${index}.contractStart`])} />
                  {errors[`apartments.${index}.contractStart`] && <p className="mt-1 text-xs text-red-600">{errors[`apartments.${index}.contractStart`]}</p>}
                </div>
                <div>
                  <label className={labelCls}>Sutarties pabaiga</label>
                  <LtDateInput value={apt.contractEnd} onChange={(e) => handleMultipleInputChange(index, 'contractEnd', e.target.value)} className={inputCls(!!errors[`apartments.${index}.contractEnd`])} />
                  {errors[`apartments.${index}.contractEnd`] && <p className="mt-1 text-xs text-red-600">{errors[`apartments.${index}.contractEnd`]}</p>}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Meters Section (shared for all apartments) */}
        <div
          className="bg-white/95 rounded-2xl border border-white/20 shadow-sm p-5"
          style={{ backgroundImage: `url('${cardsBg}')`, backgroundSize: 'cover', backgroundPosition: 'center' }}
        >
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <CreditCardIcon className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h3 className={sectionTitleCls}>Skaitliukai</h3>
              <p className="text-[11px] text-gray-400">Bendri skaitliukai visiems butams</p>
            </div>
          </div>
          <MeterTable
            value={multipleFormData.meters}
            onChange={(meters) => setMultipleFormData(prev => ({ ...prev, meters }))}
            allowDuplicatesByKey={false}
          />
        </div>
      </div>

      {/* Sticky Footer */}
      <div className="shrink-0 border-t border-white/10 px-6 py-4 bg-neutral-900/60 backdrop-blur-sm flex justify-end gap-3">
        <button
          type="button"
          onClick={handleClose}
          className="px-5 py-2.5 text-sm font-medium text-gray-300 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
        >
          Atšaukti
        </button>
        <button
          type="submit"
          className="px-5 py-2.5 text-sm font-medium text-white bg-[#2F8481] rounded-xl hover:bg-[#297a77] transition-colors flex items-center gap-2"
        >
          <PlusIcon className="w-4 h-4" />
          Sukurti {multipleFormData.apartments.length} {multipleFormData.apartments.length === 1 ? 'butą' : 'butus'}
        </button>
      </div>
    </form>
  );

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      {/* Backdrop overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm cursor-pointer" onClick={handleClose} />

      {/* Modal card — same pattern as UniversalAddMeterModal */}
      <div
        className="relative rounded-2xl shadow-2xl max-w-[960px] w-full max-h-[90vh] flex flex-col overflow-hidden cursor-default"
        style={{
          background: `linear-gradient(135deg, rgba(0, 0, 0, 0.45) 0%, rgba(20, 20, 20, 0.30) 50%, rgba(0, 0, 0, 0.45) 100%), url('/images/ModalBackground.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-white/10 px-6 py-3.5 flex items-center justify-between bg-neutral-900/70 backdrop-blur-md">
          <div className="flex items-center gap-3">

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#2F8481]/25 to-[#2F8481]/10 flex items-center justify-center">
                <HomeIcon className="w-4.5 h-4.5 text-[#2F8481]" />
              </div>
              <div>
                <h2 className="text-[15px] font-bold text-white tracking-tight">
                  Pridėti butą
                </h2>
                <p className="text-[11px] text-gray-400">{address}</p>
              </div>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-gray-500 hover:text-white hover:bg-white/10 rounded-lg transition-all"
            title="Uždaryti"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {renderSingleApartmentForm()}
      </div>
    </div>,
    document.body
  );
});

AddApartmentModal.displayName = 'AddApartmentModal';