// Komunalinių skaitliukų konfigūracija pagal adresą
export interface CommunalConfig {
  id: string;
  address: string;
  meters: CommunalMeter[];
  prices: CommunalPrices;
  createdAt: string;
  updatedAt: string;
}

// Adreso skaitliukų nustatymai
export interface AddressMeterSettings {
  enableMeterEditing?: boolean; // Ar nuomotojas gali redaguoti skaitliukus
  requirePhotos?: boolean; // Ar nuomininkas turi pateikti nuotraukas
}

// Komunalinio skaitliuko konfigūracija
export interface CommunalMeter {
  id: string;
  type: 'water_cold' | 'water_hot' | 'electricity' | 'gas' | 'heating' | 'sewage' | 'garbage';
  name: string;
  unit: string;
  isRequired: boolean;
  hasIndividualMeter: boolean;
  defaultPrice?: number; // kaina už vienetą
  description?: string;
  collectionMode?: 'landlord_only' | 'tenant_photo'; // collection mode for legacy compatibility
}

// Komunalinių kainų konfigūracija
export interface CommunalPrices {
  waterCold: number; // €/m³
  waterHot: number; // €/m³
  electricity: number; // €/kWh
  gas: number; // €/m³
  heating: number; // €/kWh
  sewage: number; // €/m³
  garbage: number; // €/mėn
  maintenance: number; // €/mėn
}

// Komunalinio skaitliuko rodmuo
export interface CommunalReading {
  id: string;
  meterId: string;
  apartmentId: string;
  reading: number;
  date: string;
  status: 'pending' | 'approved' | 'rejected';
  photos?: string[];
  notes?: string;
  submittedBy?: string;
  approvedBy?: string;
  approvedAt?: string;
}

// Komunalinių mokėjimo skaičiavimas
export interface CommunalCalculation {
  apartmentId: string;
  period: string; // YYYY-MM
  readings: {
    meterId: string;
    current: number;
    previous: number;
    consumption: number;
    price: number;
    total: number;
  }[];
  totalAmount: number;
  fixedCharges: number; // fiksuoti mokesčiai (šiukšlės, priežiūra)
  variableCharges: number; // kintami mokesčiai (pagal suvartojimą)
}



