// Centralizuota skaitliukų pasiskirstymo konfigūracija
export type DistributionMethod = 'per_apartment' | 'per_person' | 'per_area' | 'fixed_split' | 'per_consumption';

// Policy inference function for new meter system
export const inferPolicyFrom = (meter: { type?: 'individual' | 'shared'; distribution?: string }): 'apartment' | 'building' | 'none' => {
  if (meter.distribution === 'fixed' || meter.distribution === 'fixed_split') {
    return 'none';
  }
  
  if (meter.type === 'individual' && (meter.distribution === 'consumption' || meter.distribution === 'per_consumption')) {
    return 'apartment';
  }
  
  if (meter.type === 'shared' && meter.distribution !== 'fixed' && meter.distribution !== 'fixed_split') {
    return 'building';
  }
  
  // Default fallback
  return 'apartment';
};
export type MeterKind = 
  | 'water_cold' | 'water_hot' | 'electricity_ind' | 'gas_ind'
  | 'heating' | 'electricity_shared' | 'internet' | 'trash' | 'ventilation' | 'elevator'
  | 'custom'; // Kitas skaitliukas

// Server-side validacijos helper
export function assertAllowed(kind: MeterKind, dist: DistributionMethod): void {
  const cfg = ALLOWED[kind];
  if (!cfg || !cfg.allowed.includes(dist)) {
    throw new Error(`Distribution "${dist}" not allowed for "${kind}"`);
  }
}

// Precondition checking helper
export type PreconditionContext = {
  units: number;
  sumArea: number;
  hasMeters: boolean;
  hasFixed?: boolean;
  hasAllocators?: boolean; // ar yra dalikliai šildymui
};

export type PreconditionResult = { 
  allowed: boolean; 
  reason?: string;
};

export function checkPrecondition(
  kind: MeterKind, 
  dist: DistributionMethod, 
  ctx: PreconditionContext
): PreconditionResult {
  if (dist === 'per_area' && ctx.sumArea <= 0) {
    return { allowed: false, reason: 'Trūksta butų plotų' };
  }
  if (dist === 'per_apartment' && ctx.units <= 0) {
    return { allowed: false, reason: 'Nėra butų' };
  }
  if (dist === 'per_apartment' && !ctx.hasMeters) {
    return { allowed: false, reason: 'Nėra individualių skaitiklių' };
  }
  if (dist === 'fixed_split' && !ctx.hasFixed) {
    return { allowed: false, reason: 'Nenurodyta fiksuota suma' };
  }
  // Šildymo specialus atvejis
  if (kind === 'heating' && dist === 'per_apartment' && !ctx.hasAllocators) {
    return { allowed: false, reason: 'Nėra šildymo daliklių' };
  }
  return { allowed: true };
}

export const ALLOWED: Record<MeterKind, { 
  allowed: DistributionMethod[]; 
  default: DistributionMethod;
  hasIndividualMeters?: boolean; // ar gali turėti individualius skaitliukus
}> = {
  // Individualūs skaitliukai - gali turėti visus pasiskirstymo metodus
  water_cold: { 
    allowed: ['per_consumption', 'per_area', 'per_apartment', 'fixed_split'], 
    default: 'per_consumption',
    hasIndividualMeters: true
  },
  water_hot: { 
    allowed: ['per_consumption', 'per_area', 'per_apartment', 'fixed_split'], 
    default: 'per_consumption',
    hasIndividualMeters: true
  },
  electricity_ind: { 
    allowed: ['per_consumption', 'per_area', 'per_apartment', 'fixed_split'], 
    default: 'per_consumption',
    hasIndividualMeters: true
  },
  gas_ind: { 
    allowed: ['per_consumption', 'per_area', 'per_apartment', 'fixed_split'], 
    default: 'per_consumption',
    hasIndividualMeters: true
  },

  // Šildymas (specialus atvejis) - gali būti individualus arba bendras
  heating: { 
    allowed: ['per_area', 'per_consumption', 'fixed_split', 'per_apartment'], 
    default: 'per_area',
    hasIndividualMeters: true
  },

  // Bendri skaitliukai
  electricity_shared: { 
    allowed: ['per_apartment', 'per_area', 'per_consumption', 'fixed_split'], 
    default: 'per_apartment'
  },
  ventilation: { 
    allowed: ['per_apartment', 'per_area', 'per_consumption', 'fixed_split'], 
    default: 'per_apartment'
  },
  elevator: { 
    allowed: ['per_apartment', 'per_area', 'per_consumption', 'fixed_split'], 
    default: 'per_apartment'
  },

  // Fiksuoti mokesčiai
  internet: { 
    allowed: ['fixed_split', 'per_apartment'], 
    default: 'fixed_split'
  },
  trash: { 
    allowed: ['fixed_split', 'per_apartment'], 
    default: 'fixed_split'
  },

  // Kitas skaitliukas (custom)
  custom: { 
    allowed: ['per_apartment', 'per_consumption', 'per_area', 'fixed_split'], 
    default: 'per_apartment',
    hasIndividualMeters: true
  },
};

// Paaiškinimai pasiskirstymo metodams
export const DISTRIBUTION_LABELS: Record<DistributionMethod, string> = {
  per_apartment: 'Pagal butus',
  per_person: 'Pagal asmenis',
  per_area: 'Pagal plotą',
  fixed_split: 'Fiksuotas',
  per_consumption: 'Pagal suvartojimą'
};

export const DISTRIBUTION_TOOLTIPS: Record<DistributionMethod, string> = {
  per_apartment: 'Vienodomis dalimis kiekvienam butui',
  per_person: 'Proporcingai gyventojų skaičiui',
  per_area: 'Proporcingai buto m²',
  fixed_split: 'Vienoda fiksuota suma kiekvienam',
  per_consumption: 'Pagal faktinį suvartojimą'
};

// Pagalbinės funkcijos - patobulinta logika
export const getMeterKind = (name: string, type: 'individual' | 'communal', unit?: string): MeterKind => {
  const lowerName = name.toLowerCase();
  
  // Individualūs skaitliukai
  if (type === 'individual') {
    if (lowerName.includes('vanduo') && lowerName.includes('šaltas')) return 'water_cold';
    if (lowerName.includes('vanduo') && lowerName.includes('karštas')) return 'water_hot';
    if (lowerName.includes('elektra') && lowerName.includes('individuali')) return 'electricity_ind';
    if (lowerName.includes('elektra') && !lowerName.includes('bendra')) return 'electricity_ind';
    if (lowerName.includes('dujos')) return 'gas_ind';
    if (lowerName.includes('šildymas')) return 'heating';
    if (lowerName.includes('kitas') || lowerName.includes('custom')) return 'custom';
    
    // Fallback individualiems skaitliukams
    return 'electricity_ind';
  } 
  
  // Bendri skaitliukai
  if (type === 'communal') {
    if (lowerName.includes('elektra') && lowerName.includes('bendra')) return 'electricity_shared';
    if (lowerName.includes('elektra') && !lowerName.includes('individuali')) return 'electricity_shared';
    if (lowerName.includes('vėdinimas') || lowerName.includes('ventilation')) return 'ventilation';
    if (lowerName.includes('liftas') || lowerName.includes('elevator')) return 'elevator';
    if (lowerName.includes('internetas') || lowerName.includes('internet')) return 'internet';
    if (lowerName.includes('šiukšlės') || lowerName.includes('šiukšlių') || lowerName.includes('trash') || lowerName.includes('garbage')) return 'trash';
    if (lowerName.includes('šildymas')) return 'heating';
    if (lowerName.includes('valymas') || lowerName.includes('cleaning')) return 'trash';
    
    // Fallback bendriems skaitliukams
    return 'electricity_shared';
  }
  
  // Jei tipas nenurodytas, bandome nustatyti pagal pavadinimą
  if (lowerName.includes('vanduo') && lowerName.includes('šaltas')) return 'water_cold';
  if (lowerName.includes('vanduo') && lowerName.includes('karštas')) return 'water_hot';
  if (lowerName.includes('elektra') && lowerName.includes('individuali')) return 'electricity_ind';
  if (lowerName.includes('elektra') && lowerName.includes('bendra')) return 'electricity_shared';
  if (lowerName.includes('elektra')) return 'electricity_ind'; // default to individual
  if (lowerName.includes('dujos')) return 'gas_ind';
  if (lowerName.includes('šildymas')) return 'heating';
  if (lowerName.includes('vėdinimas') || lowerName.includes('ventilation')) return 'ventilation';
  if (lowerName.includes('liftas') || lowerName.includes('elevator')) return 'elevator';
  if (lowerName.includes('internetas') || lowerName.includes('internet')) return 'internet';
  if (lowerName.includes('šiukšlės') || lowerName.includes('šiukšlių') || lowerName.includes('trash') || lowerName.includes('garbage')) return 'trash';
  if (lowerName.includes('kitas') || lowerName.includes('custom')) return 'custom';
  
  // Ultimate fallback
  return 'electricity_ind';
};

export const getAllowedDistributions = (name: string, type: 'individual' | 'communal', unit?: string): DistributionMethod[] => {
  const kind = getMeterKind(name, type, unit);
  return ALLOWED[kind].allowed;
};

export const getDefaultDistribution = (name: string, type: 'individual' | 'communal', unit?: string): DistributionMethod => {
  const kind = getMeterKind(name, type, unit);
  return ALLOWED[kind].default;
};

export const isValidDistribution = (name: string, type: 'individual' | 'communal', distribution: DistributionMethod, unit?: string): boolean => {
  return getAllowedDistributions(name, type, unit).includes(distribution);
};

// Konvertavimas iš senos sistemos
export const convertLegacyDistribution = (oldDistribution: string): DistributionMethod => {
  switch (oldDistribution) {
    case 'per_consumption':
    case 'pagal_suvartojima':
    case 'consumption':
      return 'per_consumption';
    case 'per_apartment':
    case 'pagal_butus':
      return 'per_apartment';
    case 'per_area':
    case 'pagal_plotą':
      return 'per_area';
    case 'fixed_split':
    case 'fiksuota':
    case 'fixed':
      return 'fixed_split';
    default:
      return 'per_apartment'; // fallback
  }
};

// Konvertavimas į seną sistemą (jei reikia)
export const convertToLegacyDistribution = (distribution: DistributionMethod): string => {
  switch (distribution) {
    case 'per_apartment':
      return 'per_apartment';
    case 'per_person':
      return 'per_person';
    case 'per_area':
      return 'per_area';
    case 'fixed_split':
      return 'fixed_split';
    case 'per_consumption':
      return 'per_consumption';
    default:
      return 'per_apartment';
  }
};

// Nauja funkcija - gauti ženklelio tekstą
export const getMeterTypeLabel = (type: 'individual' | 'communal', distribution?: DistributionMethod): string => {
  if (distribution === 'fixed_split') {
    return 'Fiksuota įmoka';
  }
  if (type === 'individual') {
    return 'Individualus skaitliukas';
  }
  if (type === 'communal') {
    return 'Bendras skaitliukas';
  }
  return 'Skaitliukas';
};
