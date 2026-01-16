// Define AddressSettings interface locally to avoid circular imports
import { type AddressMeterSettings } from '../types/communal';

export interface AddressSettings {
  id: string;
  address: string;
  buildingInfo: {
    totalApartments: number;
    totalFloors: number;
    yearBuilt?: number;
    buildingType: 'apartment' | 'house' | 'commercial';
    heatingType: 'central' | 'individual' | 'district';
    parkingSpaces?: number;
  };
  contactInfo: {
    managerName: string;
    managerPhone: string;
    managerEmail: string;
    emergencyContact: string;
    emergencyPhone: string;
  };
  financialSettings: {
    defaultDeposit: number;
    latePaymentFee: number;
    gracePeriodDays: number;
    autoRenewalEnabled: boolean;
    defaultContractDuration: number;
  };
  notificationSettings: {
    rentReminderDays: number;
    contractExpiryReminderDays: number;
    meterReminderDays: number;
    maintenanceNotifications: boolean;
  };
  communalConfig?: AddressMeterSettings;
  createdAt: string;
  updatedAt: string;
}

// Mock data for address settings
export const addressSettings: AddressSettings[] = [
  {
    id: 'address_1',
    address: 'Vokiečių g. 117, Vilnius',
    buildingInfo: {
      totalApartments: 12,
      totalFloors: 4,
      yearBuilt: 2000,
      buildingType: 'apartment',
      heatingType: 'central',
      parkingSpaces: 8
    },
    contactInfo: {
      managerName: 'Jonas Valdytojas',
      managerPhone: '+370 600 00000',
      managerEmail: 'jonas@vokieciu117.lt',
      emergencyContact: 'Avarinis servisas',
      emergencyPhone: '+370 600 11111'
    },
    financialSettings: {
      defaultDeposit: 500,
      latePaymentFee: 10,
      gracePeriodDays: 5,
      autoRenewalEnabled: true,
      defaultContractDuration: 12
    },
    notificationSettings: {
      rentReminderDays: 3,
      contractExpiryReminderDays: 30,
      meterReminderDays: 5,
      maintenanceNotifications: true
    },
    communalConfig: {
      enableMeterEditing: true,
      requirePhotos: true
    },
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-15T10:30:00.000Z'
  },
  {
    id: 'address_2',
    address: 'Gedimino pr. 15, Vilnius',
    buildingInfo: {
      totalApartments: 8,
      totalFloors: 3,
      yearBuilt: 1995,
      buildingType: 'apartment',
      heatingType: 'district',
      parkingSpaces: 4
    },
    contactInfo: {
      managerName: 'Marija Valdytoja',
      managerPhone: '+370 600 22222',
      managerEmail: 'marija@gedimino15.lt',
      emergencyContact: 'Avarinis servisas',
      emergencyPhone: '+370 600 33333'
    },
    financialSettings: {
      defaultDeposit: 600,
      latePaymentFee: 15,
      gracePeriodDays: 3,
      autoRenewalEnabled: false,
      defaultContractDuration: 24
    },
    notificationSettings: {
      rentReminderDays: 5,
      contractExpiryReminderDays: 45,
      meterReminderDays: 7,
      maintenanceNotifications: false
    },
    communalConfig: {
      enableMeterEditing: true,
      requirePhotos: true
    },
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-10T14:20:00.000Z'
  }
];

// Utility functions for managing address settings
export const getAddressSettings = (address: string): AddressSettings | undefined => {
  return addressSettings.find(setting => setting.address === address);
};

export const getAllAddressSettings = (): AddressSettings[] => {
  return addressSettings;
};

export const saveAddressSettings = (settings: AddressSettings): void => {
  const index = addressSettings.findIndex(s => s.id === settings.id);
  if (index !== -1) {
    addressSettings[index] = settings;
  } else {
    addressSettings.push(settings);
  }
  
  // In a real application, this would save to a database
  console.log('Address settings saved:', settings);
};

export const deleteAddressSettings = (addressId: string): void => {
  const index = addressSettings.findIndex(s => s.id === addressId);
  if (index !== -1) {
    addressSettings.splice(index, 1);
  }
  
  // In a real application, this would delete from a database
  console.log('Address settings deleted:', addressId);
};

export const getAddressesWithSettings = (): string[] => {
  return addressSettings.map(setting => setting.address);
};

// Helper function to get default settings for a new address
export const getDefaultAddressSettings = (address: string): Omit<AddressSettings, 'id' | 'createdAt' | 'updatedAt'> => {
  return {
    address,
    buildingInfo: {
      totalApartments: 12,
      totalFloors: 4,
      yearBuilt: 2000,
      buildingType: 'apartment',
      heatingType: 'central',
      parkingSpaces: 8
    },
    contactInfo: {
      managerName: '',
      managerPhone: '',
      managerEmail: '',
      emergencyContact: '',
      emergencyPhone: ''
    },
    financialSettings: {
      defaultDeposit: 500,
      latePaymentFee: 10,
      gracePeriodDays: 5,
      autoRenewalEnabled: true,
      defaultContractDuration: 12
    },
    notificationSettings: {
      rentReminderDays: 3,
      contractExpiryReminderDays: 30,
      meterReminderDays: 5,
      maintenanceNotifications: true
    },
    communalConfig: {
      enableMeterEditing: true,
      requirePhotos: true
    }
  };
};



