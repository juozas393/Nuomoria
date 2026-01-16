import React, { useState } from 'react';
import { 
  Droplets, 
  Flame, 
  Zap, 
  Thermometer, 
  Building2, 
  Lock, 
  Send, 
  Trash2, 
  Edit3, 
  Search,
  Plus,
  Check,
  X
} from 'lucide-react';

import type { Allocation } from "../../types/meters";

// ---- Types ----
export type MeterMode = "individual" | "shared";
export type MeterType = "water_cold" | "water_hot" | "electricity" | "heating" | "electricity_common";

export interface Meter {
  id: string;
  type: MeterType;
  mode: MeterMode;
  unit: "m3" | "kWh" | "GJ" | "Kitas";
  price: number;
  allocation?: Allocation;
  photoRequired: boolean;
  enableMeterEditing?: boolean;
  visibleToTenant?: boolean;
  active?: boolean;
  name?: string;
  description?: string;
  collectionMode?: 'landlord_only' | 'tenant_photo';
}

// Available meters that can be added
export interface AvailableMeter {
  id: string;
  type: MeterType;
  name: string;
  description: string;
  defaultUnit: "m3" | "kWh" | "GJ" | "Kitas";
  defaultPrice: number;
  defaultMode: MeterMode;
  defaultAllocation?: Allocation;
  icon: React.ElementType;
}

// ---- Icons+labels ----
const meterMeta: Record<MeterType, { icon: React.ElementType; label: string }> = {
  water_cold:        { icon: Droplets,    label: "Vanduo (šaltas)" },
  water_hot:         { icon: Droplets,    label: "Vanduo (karštas)" },
  electricity:       { icon: Zap,         label: "Elektra (individuali)" },
  electricity_common:{ icon: Building2,   label: "Elektra (bendra)" },
  heating:           { icon: Thermometer, label: "Šildymas" },
};

// Available meters list
const availableMeters: AvailableMeter[] = [
  {
    id: "water_cold_available",
    type: "water_cold",
    name: "Vanduo (šaltas)",
    description: "Šalto vandens suvartojimas",
    defaultUnit: "m3",
    defaultPrice: 1.2,
    defaultMode: "individual",
    defaultAllocation: "per_consumption",
    icon: Droplets
  },
  {
    id: "water_hot_available",
    type: "water_hot",
    name: "Vanduo (karštas)",
    description: "Karšto vandens suvartojimas",
    defaultUnit: "m3",
    defaultPrice: 3.5,
    defaultMode: "individual",
    defaultAllocation: "per_consumption",
    icon: Droplets
  },
  {
    id: "electricity_individual_available",
    type: "electricity",
    name: "Elektra (individuali)",
    description: "Elektros suvartojimas",
    defaultUnit: "kWh",
    defaultPrice: 0.15,
    defaultMode: "individual",
    defaultAllocation: "per_consumption",
    icon: Zap
  },
  {
    id: "electricity_common_available",
    type: "electricity_common",
    name: "Elektra (bendra)",
    description: "Namo apsvietimas",
    defaultUnit: "kWh",
    defaultPrice: 0.15,
    defaultMode: "shared",
    defaultAllocation: "per_apartment",
    icon: Building2
  },
  {
    id: "heating_available",
    type: "heating",
    name: "Šildymas",
    description: "Namo šildymo sąnaudos",
    defaultUnit: "GJ",
    defaultPrice: 25.0,
    defaultMode: "shared",
    defaultAllocation: "per_apartment",
    icon: Thermometer
  },
  {
    id: "internet_available",
    type: "electricity_common",
    name: "Internetas",
    description: "Namo interneto paslaugos",
    defaultUnit: "Kitas",
    defaultPrice: 60.0,
    defaultMode: "shared",
    defaultAllocation: "fixed_split",
    icon: Zap
  },
  {
    id: "garbage_available",
    type: "electricity_common",
    name: "Šiukšlių išvežimas",
    description: "Šiukšlių išvežimo paslaugos",
    defaultUnit: "Kitas",
    defaultPrice: 45.0,
    defaultMode: "shared",
    defaultAllocation: "fixed_split",
    icon: Building2
  },
  {
    id: "gas_available",
    type: "heating",
    name: "Dujos",
    description: "Dujų suvartojimas",
    defaultUnit: "m3",
    defaultPrice: 0.8,
    defaultMode: "individual",
    defaultAllocation: "per_consumption",
    icon: Flame
  },
  {
    id: "ventilation_available",
    type: "electricity_common",
    name: "Vėdinimas",
    description: "Vėdinimo sistemos",
    defaultUnit: "Kitas",
    defaultPrice: 30.0,
    defaultMode: "shared",
    defaultAllocation: "fixed_split",
    icon: Building2
  },
  {
    id: "elevator_available",
    type: "electricity_common",
    name: "Lifto priežiūra",
    description: "Lifto techninė priežiūra",
    defaultUnit: "Kitas",
    defaultPrice: 25.0,
    defaultMode: "shared",
    defaultAllocation: "per_apartment",
    icon: Building2
  }
];

const unitSuffix: Record<Meter["unit"], string> = { 
  m3: "€/m³", 
  kWh: "€/kWh", 
  GJ: "€/GJ",
  Kitas: "€/vnt"
};
const allocationLabel: Record<Allocation, string> = {
  per_apartment: "Pagal butus",
  per_person: "Pagal asmenis",
  per_area: "Pagal plotą",
  fixed_split: "Fiksuotas",
  per_consumption: "Pagal suvartojimą"
};

function formatPrice(n: number) {
  return new Intl.NumberFormat("lt-LT", { minimumFractionDigits: 2, maximumFractionDigits: 3 }).format(n);
}

// ---- Toolbar ----
function Toolbar({
  filter,
  onFilterChange,
  search,
  onSearch,
  onAddMeter,
}: {
  filter: "all" | "available";
  onFilterChange: (v: "all" | "available") => void;
  search: string;
  onSearch: (v: string) => void;
  onAddMeter: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Ieškoti skaitliukų..."
            className="h-10 w-[280px] pl-10 pr-4 text-sm border border-neutral-300 rounded-xl focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481] transition-all duration-200 hover:border-neutral-400"
          />
        </div>
        <div className="flex rounded-xl border border-neutral-300 overflow-hidden shadow-sm">
          <button
            onClick={() => onFilterChange("all")}
            className={`px-4 py-2 text-sm font-medium transition-all duration-200 ${
              filter === "all" 
                ? "bg-[#2F8481] text-white shadow-sm" 
                : "bg-white text-neutral-600 hover:bg-neutral-50 hover:text-neutral-800"
            }`}
          >
            Mano skaitliukai
          </button>
          <button
            onClick={() => onFilterChange("available")}
            className={`px-4 py-2 text-sm font-medium transition-all duration-200 ${
              filter === "available" 
                ? "bg-[#2F8481] text-white shadow-sm" 
                : "bg-white text-neutral-600 hover:bg-neutral-50 hover:text-neutral-800"
            }`}
          >
            Galimi
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onAddMeter}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#2F8481] rounded-xl hover:bg-[#297a77] transition-all duration-200 shadow-sm hover:shadow-md hover:scale-105"
        >
          <Plus className="w-4 h-4" />
          Pridėti skaitiklį
        </button>
      </div>
    </div>
  );
}

// ---- Row ----
function MeterRow({
  meter,
  onChange,
  onDelete,
  onEdit,
  readOnlyAllocationForIndividual = true,
  isEditing,
  onCancelEdit,
}: {
  meter: Meter;
  onChange: (m: Meter) => void;
  onDelete: (id: string) => void;
  onEdit: (m: Meter) => void;
  readOnlyAllocationForIndividual?: boolean;
  isEditing: boolean;
  onCancelEdit: () => void;
}) {
  const { icon: Icon } = meterMeta[meter.type];
  const [editValues, setEditValues] = useState({
    name: meter.name || '',
    description: meter.description || '',
    price: meter.price,
    photoRequired: meter.photoRequired,
          allocation: meter.allocation || 'per_apartment',
    mode: meter.mode,
    unit: meter.unit
  });

  const getUnitDisplay = (unit: string) => {
    switch (unit) {
      case 'm3': return 'm³';
      case 'kWh': return 'kWh';
      case 'GJ': return 'GJ';
      case 'Kitas': return 'Kitas';
      default: return unit;
    }
  };

  const getPriceDisplay = (price: number, unit: string) => {
    if (unit === 'Kitas') {
      return `${formatPrice(price)}€`;
    }
    return `${formatPrice(price)} ${unitSuffix[unit as keyof typeof unitSuffix]}`;
  };

  const handleSave = () => {
    onChange({
      ...meter,
      name: editValues.name,
      description: editValues.description,
      price: editValues.price,
      photoRequired: editValues.photoRequired,
      allocation: editValues.allocation,
      mode: editValues.mode,
      unit: editValues.unit
    });
    onCancelEdit();
  };

  const handleCancel = () => {
    setEditValues({
      name: meter.name || '',
      description: meter.description || '',
      price: meter.price,
      photoRequired: meter.photoRequired,
      allocation: meter.allocation || 'per_apartment',
      mode: meter.mode,
      unit: meter.unit
    });
    onCancelEdit();
  };

  const handleStartEdit = () => {
    onEdit(meter);
  };

  if (isEditing) {
    return (
      <div className="group relative overflow-hidden rounded-xl border-2 border-[#2F8481] bg-white p-3 shadow-lg">
        <div className="relative flex items-center gap-3">
          {/* Icon */}
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#2F8481]/10 to-[#2F8481]/20 flex items-center justify-center shadow-sm flex-shrink-0">
            <Icon className="h-5 w-5 text-[#2F8481]" />
          </div>

          {/* Edit form */}
          <div className="flex-1 min-w-0 space-y-2">
            <input
              type="text"
              value={editValues.name}
              onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
              placeholder="Skaitliuko pavadinimas"
              className="w-full px-3 py-1 text-sm border border-neutral-300 rounded-md focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481]"
            />
            <input
              type="text"
              value={editValues.description}
              onChange={(e) => setEditValues({ ...editValues, description: e.target.value })}
              placeholder="Aprašymas"
              className="w-full px-3 py-1 text-sm border border-neutral-300 rounded-md focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481]"
            />
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Mode selector */}
            <select
              value={editValues.mode}
              onChange={(e) => setEditValues({ ...editValues, mode: e.target.value as MeterMode })}
              className="h-7 px-2 text-xs border border-neutral-300 rounded-md focus:ring-1 focus:ring-[#2F8481] focus:border-[#2F8481]"
            >
              <option value="individual">Individualus</option>
                                      <option value="communal">Bendras</option>
            </select>

            {/* Unit - now editable */}
            <select
              value={editValues.unit}
              onChange={(e) => setEditValues({ ...editValues, unit: e.target.value as Meter["unit"] })}
              className="h-7 px-2 text-xs border border-neutral-300 rounded-md focus:ring-1 focus:ring-[#2F8481] focus:border-[#2F8481]"
            >
              <option value="m3">m³</option>
              <option value="kWh">kWh</option>
                              <option value="GJ">GJ</option>
                <option value="Kitas">Kitas</option>
            </select>

            {/* Price */}
            <div className="flex items-center group/price">
              <input
                className="h-7 w-16 rounded-l-md border border-r-0 px-2 text-xs focus:ring-1 focus:ring-[#2F8481] focus:border-[#2F8481]"
                inputMode="decimal"
                value={editValues.price}
                onChange={(e) => setEditValues({ ...editValues, price: Number((e.target.value || "0").replace(",", ".")) })}
              />
              <div className="flex h-7 items-center rounded-r-md border border-l-0 bg-neutral-50 px-2 text-xs text-neutral-600">
                {meter.unit === 'Kitas' ? '€' : unitSuffix[meter.unit]}
              </div>
            </div>

            {/* Send meter readings toggle */}
            <button
              onClick={() => setEditValues({ ...editValues, photoRequired: !editValues.photoRequired })}
              className={`p-1.5 rounded-md transition-all duration-200 ${
                editValues.photoRequired ? 'bg-blue-100 text-blue-600' : 'bg-neutral-100 text-neutral-400'
              }`}
              title={editValues.photoRequired ? 'Reikia nuotraukos' : 'Nereikia nuotraukos'}
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Save/Cancel buttons */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={handleSave}
              className="p-1.5 rounded-md bg-green-100 text-green-600 hover:bg-green-200 transition-all duration-200"
              title="Išsaugoti"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleCancel}
              className="p-1.5 rounded-md bg-red-100 text-red-600 hover:bg-red-200 transition-all duration-200"
              title="Atšaukti"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative overflow-hidden rounded-xl border border-neutral-200 bg-white p-3 hover:border-[#2F8481]/50 hover:shadow-lg transition-all duration-300 hover:scale-[1.01]">
      {/* Hover effect background */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#2F8481]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative flex items-center gap-3">
        {/* Icon */}
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#2F8481]/10 to-[#2F8481]/20 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow duration-300 flex-shrink-0">
          <Icon className="h-5 w-5 text-[#2F8481] group-hover:scale-110 transition-transform duration-300" />
        </div>

        {/* Title and description */}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-neutral-900 group-hover:text-[#2F8481] transition-colors duration-300 text-sm truncate">
            {meter.name || meterMeta[meter.type].label}
          </div>
          <div className="text-xs text-neutral-500 mt-0.5">
            {meter.mode === "individual" ? "Individualus" : "Bendras"}
            {meter.photoRequired && (
              <span className="ml-2 text-blue-600">• Siųsti skaitliuką</span>
            )}
          </div>
        </div>

        {/* Controls - compact layout */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Unit */}
          <div className="flex items-center gap-1 rounded-md border bg-neutral-50 px-2 py-1 text-xs text-neutral-700 group-hover:bg-neutral-100 transition-colors duration-200">
            {getUnitDisplay(meter.unit)}
          </div>

          {/* Price */}
          <div className="flex items-center group/price">
            <input
              type="number"
              step="0.01"
              min="0"
              className="h-7 w-16 rounded-l-md border border-r-0 px-2 text-xs focus:ring-1 focus:ring-[#2F8481] focus:border-[#2F8481] transition-all duration-200 group-hover/price:border-[#2F8481]/30"
              value={Number.isFinite(meter.price) ? meter.price : 0}
              onChange={(e) => onChange({ ...meter, price: Number(e.target.value || 0) })}
            />
            <div className="flex h-7 items-center rounded-r-md border border-l-0 bg-neutral-50 px-2 text-xs text-neutral-600 group-hover/price:bg-neutral-100 transition-colors duration-200">
              {meter.unit === 'Kitas' ? '€' : unitSuffix[meter.unit]}
            </div>
          </div>

          {/* Allocation - simplified */}
          {meter.mode === "shared" && (
            <select
              value={meter.allocation || "per_apartment"}
              onChange={(e) => onChange({ ...meter, allocation: e.target.value as Allocation })}
              className="h-7 w-20 rounded-md border px-2 text-xs focus:ring-1 focus:ring-[#2F8481] focus:border-[#2F8481] group-hover:border-[#2F8481]/30 transition-colors duration-200"
            >
              <option value="per_apartment">Butai</option>
              <option value="per_area">Plotas</option>
              <option value="per_consumption">Suvartojimas</option>
              <option value="fixed_split">Fiksuotas</option>
            </select>
          )}
        </div>

        {/* Actions - always visible but compact */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Send meter readings toggle with text */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-600">Siųsti skaitliuką:</span>
            <button
              onClick={() => onChange({ ...meter, photoRequired: !meter.photoRequired })}
              className={`px-2 py-1 rounded-md text-xs font-medium transition-all duration-200 ${
                meter.photoRequired 
                  ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                  : 'bg-neutral-100 text-neutral-500 border border-neutral-200 hover:bg-neutral-200'
              }`}
              title={meter.photoRequired ? 'Išjungti siuntimą' : 'Įjungti siuntimą'}
            >
              {meter.photoRequired ? 'Įjungta' : 'Išjungta'}
            </button>
          </div>

          <button
            onClick={handleStartEdit}
            className="p-1.5 rounded-md hover:bg-blue-50 transition-all duration-200 hover:scale-105"
            title="Redaguoti"
          >
            <Edit3 className="h-3.5 w-3.5 text-neutral-600" />
          </button>

          <button
            onClick={() => onDelete(meter.id)}
            className="p-1.5 rounded-md hover:bg-red-50 transition-all duration-200 hover:scale-105"
            title="Pašalinti"
          >
            <Trash2 className="h-3.5 w-3.5 text-red-500" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Available Meter Row ----
function AvailableMeterRow({
  availableMeter,
  onAdd,
}: {
  availableMeter: AvailableMeter;
  onAdd: (availableMeter: AvailableMeter) => void;
}) {
  const { icon: Icon } = availableMeter;

  const getUnitDisplay = (unit: string) => {
    switch (unit) {
      case 'm3': return 'm³';
      case 'kWh': return 'kWh';
      case 'GJ': return 'GJ';
      case 'Kitas': return 'Kitas';
      default: return unit;
    }
  };

  const getPriceDisplay = (price: number, unit: string) => {
    if (unit === 'Kitas') {
      return `${formatPrice(price)}€`;
    }
    return `${formatPrice(price)} ${unitSuffix[unit as keyof typeof unitSuffix]}`;
  };

  return (
    <div className="group relative overflow-hidden rounded-xl border border-neutral-200 bg-white p-3 hover:border-[#2F8481]/50 hover:shadow-lg transition-all duration-300 hover:scale-[1.01]">
      {/* Hover effect background */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#2F8481]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative flex items-center gap-3">
        {/* Icon */}
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#2F8481]/10 to-[#2F8481]/20 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow duration-300 flex-shrink-0">
          <Icon className="h-5 w-5 text-[#2F8481] group-hover:scale-110 transition-transform duration-300" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-neutral-900 group-hover:text-[#2F8481] transition-colors duration-300 text-sm">
            {availableMeter.name}
          </div>
          <div className="text-xs text-neutral-500 mt-0.5 truncate">
            {availableMeter.description}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-neutral-600">
            <span>Vnt.: {getUnitDisplay(availableMeter.defaultUnit)}</span>
            <span>Kaina: {getPriceDisplay(availableMeter.defaultPrice, availableMeter.defaultUnit)}</span>
            <span>Režimas: {availableMeter.defaultMode === 'individual' ? 'Individualus' : 'Bendras'}</span>
            {availableMeter.defaultAllocation && (
              <span>Paskirstymas: {allocationLabel[availableMeter.defaultAllocation]}</span>
            )}
          </div>
        </div>

        {/* Add button */}
        <button
          onClick={() => {
            console.log('AvailableMeterRow Add button clicked for:', availableMeter.name);
            onAdd(availableMeter);
          }}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-[#2F8481] rounded-lg hover:bg-[#297a77] transition-all duration-200 shadow-sm hover:shadow-md hover:scale-105 flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          Pridėti
        </button>
      </div>
    </div>
  );
}

// ---- Group section ----
function GroupHeader({ title, note, tone = "neutral" }: { title: string; note: string; tone?: "neutral" | "brand" }) {
  return (
    <div
      className={`mb-3 mt-6 rounded-lg border px-3 py-2 text-sm shadow-sm transition-all duration-300 hover:shadow-md ${
        tone === "brand" 
          ? "border-[#2F8481]/20 bg-gradient-to-r from-[#2F8481]/10 to-[#2F8481]/5 hover:from-[#2F8481]/15 hover:to-[#2F8481]/8" 
          : "border-neutral-200 bg-gradient-to-r from-neutral-50 to-neutral-100 hover:from-neutral-100 hover:to-neutral-150"
      }`}
    >
      <div className="font-semibold text-neutral-800 text-sm">{title}</div>
      <div className="text-xs text-neutral-600 mt-0.5">{note}</div>
    </div>
  );
}

// ---- Main panel ----
export function MetersPanel({
  meters,
  onChange,
  onDelete,
  onEdit,
  onAddMeter,
  onAddAvailableMeter,
}: {
  meters: Meter[];
  onChange: (m: Meter) => void;
  onDelete: (id: string) => void;
  onEdit: (m: Meter) => void;
  onAddMeter: (id: string) => void;
  onAddAvailableMeter: (availableMeter: AvailableMeter) => void;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "available">("all");
  const [editingMeterId, setEditingMeterId] = useState<string | null>(null);

  const filtered = meters.filter((m) => {
    const searchTerm = search.toLowerCase();
    const meterName = (m.name || meterMeta[m.type].label).toLowerCase();
    const meterDescription = (m.description || '').toLowerCase();
    
    return meterName.includes(searchTerm) || meterDescription.includes(searchTerm);
  });

  // Filter out already added meters from available list
  const existingMeterNames = meters.map(m => m.name).filter(Boolean);
  const filteredAvailable = availableMeters.filter((m) => {
    // Don't show if already added
    if (existingMeterNames.includes(m.name)) return false;
    
    // Apply search filter
    return m.name.toLowerCase().includes(search.toLowerCase()) || 
           m.description.toLowerCase().includes(search.toLowerCase());
  });

  const handleAddAvailableMeter = (availableMeter: AvailableMeter) => {
    console.log('MetersPanel handleAddAvailableMeter called with:', availableMeter);
    onAddAvailableMeter(availableMeter);
    console.log('MetersPanel onAddAvailableMeter called');
  };

  const handleAddMeterClick = () => {
    console.log('Add meter button clicked, creating new meter');
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    onAddMeter(tempId);

    setTimeout(() => {
      setEditingMeterId(tempId);
      console.log('New meter put in edit mode:', tempId);
    }, 0);
  };

  const handleEditMeter = (meter: Meter) => {
    setEditingMeterId(meter.id);
    onEdit(meter);
  };

  const handleSaveMeter = (meter: Meter) => {
    onChange(meter);
    setEditingMeterId(null);
  };

  const handleCancelEdit = () => {
    setEditingMeterId(null);
  };

  return (
    <div className="space-y-4">
      <Toolbar
        filter={filter}
        onFilterChange={setFilter}
        search={search}
        onSearch={setSearch}
        onAddMeter={handleAddMeterClick}
      />
      
      <div className="border-t border-neutral-200"></div>

      {filter === "all" ? (
        <>
          {/* Individualūs */}
          <GroupHeader
            title="Individualūs skaitliukai"
                          note="Skaičiuojami pagal suvartojimą • Nuomininkas pildo rodmenis su nuotraukomis"
            tone="brand"
          />
          <div className="grid gap-3 content-visibility-auto">
            {filtered.filter((m) => m.mode === "individual").map((m) => (
              <MeterRow 
                key={m.id} 
                meter={m} 
                onChange={handleSaveMeter}
                onDelete={onDelete} 
                onEdit={handleEditMeter}
                isEditing={editingMeterId === m.id}
                onCancelEdit={handleCancelEdit}
              />
            ))}
            {filtered.filter((m) => m.mode === "individual").length === 0 && (
              <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center hover:border-neutral-400 transition-colors duration-300">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-br from-neutral-100 to-neutral-200 flex items-center justify-center shadow-sm">
                  <Zap className="h-6 w-6 text-neutral-400" />
                </div>
                <p className="text-sm font-medium text-neutral-700 mb-1">Nėra individualių skaitliukų</p>
                <p className="text-xs text-neutral-500">Pridėkite individualų skaitiklį iš galimų</p>
              </div>
            )}
          </div>

          {/* Bendri */}
          <GroupHeader 
            title="Bendri skaitliukai" 
            note="Paskirstomi pagal pasirinktą metodą • Nuomotojas pildo rodmenis" 
          />
          <div className="grid gap-3 content-visibility-auto">
            {filtered.filter((m) => m.mode === "shared").map((m) => (
              <MeterRow 
                key={m.id} 
                meter={m} 
                onChange={handleSaveMeter}
                onDelete={onDelete} 
                onEdit={handleEditMeter}
                isEditing={editingMeterId === m.id}
                onCancelEdit={handleCancelEdit}
              />
            ))}
            {filtered.filter((m) => m.mode === "shared").length === 0 && (
              <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center hover:border-neutral-400 transition-colors duration-300">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-br from-neutral-100 to-neutral-200 flex items-center justify-center shadow-sm">
                  <Building2 className="h-6 w-6 text-neutral-400" />
                </div>
                <p className="text-sm font-medium text-neutral-700 mb-1">Nėra bendrų skaitliukų</p>
                <p className="text-xs text-neutral-500">Pridėkite bendrą skaitiklį iš galimų</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Galimi skaitliukai */}
          <GroupHeader
            title="Galimi skaitliukai"
            note="Pasirinkite skaitiklį, kurį norite pridėti"
            tone="brand"
          />
          <div className="grid gap-3 content-visibility-auto">
            {filteredAvailable.map((m) => (
              <AvailableMeterRow 
                key={m.id} 
                availableMeter={m} 
                onAdd={handleAddAvailableMeter}
              />
            ))}
            {filteredAvailable.length === 0 && (
              <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center hover:border-neutral-400 transition-colors duration-300">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-br from-neutral-100 to-neutral-200 flex items-center justify-center shadow-sm">
                  <Plus className="h-6 w-6 text-neutral-400" />
                </div>
                <p className="text-sm font-medium text-neutral-700 mb-1">
                  {search ? 'Nerasta skaitliukų' : 'Visi galimi skaitliukai jau pridėti'}
                </p>
                <p className="text-xs text-neutral-500">
                  {search ? 'Pabandykite kitą paieškos užklausą' : 'Perjunkite į "Mano skaitliukai" kad matytumėte pridėtus'}
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
