import { CommunalConfig } from '../types/communal';

// Testiniai komunalinių konfigūracijų duomenys
export const communalConfigs: CommunalConfig[] = [
  {
    id: 'config_1',
    address: 'Konstitucijos pr. 25, Vilnius',
    meters: [
      { id: '1', type: 'water_cold', name: 'Šaltas vanduo', unit: 'm³', isRequired: true, hasIndividualMeter: true, defaultPrice: 1.32 },
      { id: '2', type: 'water_hot', name: 'Karštas vanduo', unit: 'm³', isRequired: true, hasIndividualMeter: true, defaultPrice: 3.5 },
      { id: '3', type: 'electricity', name: 'Elektra', unit: 'kWh', isRequired: true, hasIndividualMeter: true, defaultPrice: 0.23 },
      { id: '4', type: 'heating', name: 'Šildymas', unit: 'kWh', isRequired: false, hasIndividualMeter: true, defaultPrice: 0.095 },
      { id: '5', type: 'gas', name: 'Dujos', unit: 'm³', isRequired: false, hasIndividualMeter: true, defaultPrice: 0.99 },
      { id: '6', type: 'garbage', name: 'Šiukšlės', unit: 'mėn', isRequired: false, hasIndividualMeter: false, defaultPrice: 5.0 },
    ],
    prices: {
      waterCold: 1.32,
      waterHot: 3.5,
      electricity: 0.23,
      gas: 0.99,
      heating: 0.095,
      garbage: 5.0,
    },
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-08-10T14:30:00Z',
  },
  {
    id: 'config_2',
    address: 'Gedimino pr. 12, Vilnius',
    meters: [
      { id: '1', type: 'water_cold', name: 'Šaltas vanduo', unit: 'm³', isRequired: true, hasIndividualMeter: true, defaultPrice: 1.32 },
      { id: '2', type: 'water_hot', name: 'Karštas vanduo', unit: 'm³', isRequired: true, hasIndividualMeter: true, defaultPrice: 3.5 },
      { id: '3', type: 'electricity', name: 'Elektra', unit: 'kWh', isRequired: true, hasIndividualMeter: true, defaultPrice: 0.23 },
      { id: '4', type: 'heating', name: 'Šildymas', unit: 'kWh', isRequired: false, hasIndividualMeter: true, defaultPrice: 0.095 },
      { id: '5', type: 'garbage', name: 'Šiukšlės', unit: 'mėn', isRequired: false, hasIndividualMeter: false, defaultPrice: 5.0 },
    ],
    prices: {
      waterCold: 1.32,
      waterHot: 3.5,
      electricity: 0.23,
      gas: 0.0,
      heating: 0.095,
      garbage: 5.0,
    },
    createdAt: '2024-02-20T09:15:00Z',
    updatedAt: '2024-08-05T16:45:00Z',
  },
  {
    id: 'config_3',
    address: 'Vilniaus g. 45, Kaunas',
    meters: [
      { id: '1', type: 'water_cold', name: 'Šaltas vanduo', unit: 'm³', isRequired: true, hasIndividualMeter: true, defaultPrice: 1.32 },
      { id: '2', type: 'water_hot', name: 'Karštas vanduo', unit: 'm³', isRequired: true, hasIndividualMeter: true, defaultPrice: 3.5 },
      { id: '3', type: 'electricity', name: 'Elektra', unit: 'kWh', isRequired: true, hasIndividualMeter: true, defaultPrice: 0.23 },
      { id: '4', type: 'heating', name: 'Šildymas', unit: 'kWh', isRequired: false, hasIndividualMeter: true, defaultPrice: 0.095 },
      { id: '5', type: 'gas', name: 'Dujos', unit: 'm³', isRequired: false, hasIndividualMeter: true, defaultPrice: 0.99 },
      { id: '6', type: 'garbage', name: 'Šiukšlės', unit: 'mėn', isRequired: false, hasIndividualMeter: false, defaultPrice: 5.0 },
    ],
    prices: {
      waterCold: 1.32,
      waterHot: 3.5,
      electricity: 0.23,
      gas: 0.99,
      heating: 0.095,
      garbage: 5.0,
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



