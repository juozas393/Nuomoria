import { CommunalConfig } from '../types/communal';

// Testiniai komunalinių konfigūracijų duomenys
export const communalConfigs: CommunalConfig[] = [
  {
    id: 'config_1',
    address: 'Konstitucijos pr. 25, Vilnius',
    meters: [
      { id: '1', type: 'water_cold', name: 'Šaltas vanduo', unit: 'm³', isRequired: true, hasIndividualMeter: true, defaultPrice: 1.2 },
      { id: '2', type: 'water_hot', name: 'Karštas vanduo', unit: 'm³', isRequired: true, hasIndividualMeter: true, defaultPrice: 3.5 },
      { id: '3', type: 'electricity', name: 'Elektra', unit: 'kWh', isRequired: true, hasIndividualMeter: true, defaultPrice: 0.12 },
      { id: '4', type: 'heating', name: 'Šildymas', unit: 'kWh', isRequired: true, hasIndividualMeter: false, defaultPrice: 0.08 },
      { id: '5', type: 'gas', name: 'Dujos', unit: 'm³', isRequired: false, hasIndividualMeter: true, defaultPrice: 0.45 },
      { id: '6', type: 'sewage', name: 'Nuotekos', unit: 'm³', isRequired: true, hasIndividualMeter: false, defaultPrice: 0.8 },
      { id: '7', type: 'garbage', name: 'Šiukšlės', unit: 'mėn', isRequired: true, hasIndividualMeter: false, defaultPrice: 8.0 },
    ],
    prices: {
      waterCold: 1.2,
      waterHot: 3.5,
      electricity: 0.12,
      gas: 0.45,
      heating: 0.08,
      sewage: 0.8,
      garbage: 8.0,
      maintenance: 15.0,
    },
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-08-10T14:30:00Z',
  },
  {
    id: 'config_2',
    address: 'Gedimino pr. 12, Vilnius',
    meters: [
      { id: '1', type: 'water_cold', name: 'Šaltas vanduo', unit: 'm³', isRequired: true, hasIndividualMeter: true, defaultPrice: 1.1 },
      { id: '2', type: 'water_hot', name: 'Karštas vanduo', unit: 'm³', isRequired: true, hasIndividualMeter: true, defaultPrice: 3.2 },
      { id: '3', type: 'electricity', name: 'Elektra', unit: 'kWh', isRequired: true, hasIndividualMeter: true, defaultPrice: 0.11 },
      { id: '4', type: 'heating', name: 'Šildymas', unit: 'kWh', isRequired: true, hasIndividualMeter: false, defaultPrice: 0.07 },
      { id: '5', type: 'sewage', name: 'Nuotekos', unit: 'm³', isRequired: true, hasIndividualMeter: false, defaultPrice: 0.75 },
      { id: '6', type: 'garbage', name: 'Šiukšlės', unit: 'mėn', isRequired: true, hasIndividualMeter: false, defaultPrice: 7.5 },
    ],
    prices: {
      waterCold: 1.1,
      waterHot: 3.2,
      electricity: 0.11,
      gas: 0.0, // Nėra dujų
      heating: 0.07,
      sewage: 0.75,
      garbage: 7.5,
      maintenance: 12.0,
    },
    createdAt: '2024-02-20T09:15:00Z',
    updatedAt: '2024-08-05T16:45:00Z',
  },
  {
    id: 'config_3',
    address: 'Vilniaus g. 45, Kaunas',
    meters: [
      { id: '1', type: 'water_cold', name: 'Šaltas vanduo', unit: 'm³', isRequired: true, hasIndividualMeter: true, defaultPrice: 1.0 },
      { id: '2', type: 'water_hot', name: 'Karštas vanduo', unit: 'm³', isRequired: true, hasIndividualMeter: true, defaultPrice: 3.0 },
      { id: '3', type: 'electricity', name: 'Elektra', unit: 'kWh', isRequired: true, hasIndividualMeter: true, defaultPrice: 0.10 },
      { id: '4', type: 'heating', name: 'Šildymas', unit: 'kWh', isRequired: true, hasIndividualMeter: false, defaultPrice: 0.06 },
      { id: '5', type: 'gas', name: 'Dujos', unit: 'm³', isRequired: true, hasIndividualMeter: true, defaultPrice: 0.40 },
      { id: '6', type: 'sewage', name: 'Nuotekos', unit: 'm³', isRequired: true, hasIndividualMeter: false, defaultPrice: 0.70 },
      { id: '7', type: 'garbage', name: 'Šiukšlės', unit: 'mėn', isRequired: true, hasIndividualMeter: false, defaultPrice: 7.0 },
    ],
    prices: {
      waterCold: 1.0,
      waterHot: 3.0,
      electricity: 0.10,
      gas: 0.40,
      heating: 0.06,
      sewage: 0.70,
      garbage: 7.0,
      maintenance: 10.0,
    },
    createdAt: '2024-03-10T11:30:00Z',
    updatedAt: '2024-08-08T13:20:00Z',
  },
];

// Funkcija, kuri grąžina konfigūraciją pagal adresą
export const getCommunalConfigByAddress = (address: string): CommunalConfig | undefined => {
  return communalConfigs.find(config => config.address === address);
};

// Funkcija, kuri grąžina visus adresus su konfigūracijomis
export const getAddressesWithConfigs = (): string[] => {
  return communalConfigs.map(config => config.address);
};

// Funkcija, kuri išsaugo naują konfigūraciją
export const saveCommunalConfig = (config: CommunalConfig): void => {
  const existingIndex = communalConfigs.findIndex(c => c.address === config.address);
  
  if (existingIndex >= 0) {
    communalConfigs[existingIndex] = config;
  } else {
    communalConfigs.push(config);
  }
  
  // Čia būtų išsaugojimas į duomenų bazę
  console.log('Saving communal config:', config);
};



