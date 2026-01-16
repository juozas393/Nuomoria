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
export const getAddressSettings = async (address: string, addressData?: any): Promise<AddressSettings | undefined> => {
  try {
    // Try to get settings from database
    if (addressData?.id) {
      const { getAddressSettings: getDbSettings } = await import('../lib/communalMetersApi');
      const dbSettings = await getDbSettings(addressData.id);
      
      if (dbSettings) {
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Found address settings in database:', dbSettings);
        }
        // Convert database format to AddressSettings format
        return {
          id: dbSettings.id,
          address: address,
          buildingInfo: {
            totalApartments: dbSettings.building_info?.totalApartments || 12,
            totalFloors: dbSettings.building_info?.totalFloors || 4,
            yearBuilt: dbSettings.building_info?.yearBuilt || 2000,
            buildingType: (dbSettings.building_info?.buildingType as 'apartment' | 'house' | 'commercial') || 'apartment',
            heatingType: (dbSettings.building_info?.heatingType as 'central' | 'individual' | 'district') || 'central',
            parkingSpaces: dbSettings.building_info?.parkingSpaces || 8
          },
          contactInfo: {
            managerName: dbSettings.contact_info?.managerName || '',
            managerPhone: dbSettings.contact_info?.managerPhone || '',
            managerEmail: dbSettings.contact_info?.managerEmail || '',
            emergencyContact: dbSettings.contact_info?.emergencyContact || '',
            emergencyPhone: dbSettings.contact_info?.emergencyPhone || ''
          },
          financialSettings: {
            defaultDeposit: dbSettings.financial_settings?.defaultDeposit || 0,
            latePaymentFee: dbSettings.financial_settings?.latePaymentFee || 0,
            gracePeriodDays: dbSettings.financial_settings?.gracePeriodDays || 7,
            autoRenewalEnabled: dbSettings.financial_settings?.autoRenewalEnabled || false,
            defaultContractDuration: dbSettings.financial_settings?.defaultContractDuration || 12
          },
          notificationSettings: {
            rentReminderDays: dbSettings.notification_settings?.rentReminderDays || 7,
            contractExpiryReminderDays: dbSettings.notification_settings?.contractExpiryReminderDays || 30,
            meterReminderDays: dbSettings.notification_settings?.meterReminderDays || 7,
            maintenanceNotifications: dbSettings.notification_settings?.maintenanceNotifications || true
          },
          communalConfig: dbSettings.communal_config,
          createdAt: dbSettings.created_at,
          updatedAt: dbSettings.updated_at
        };
      }
    }
  } catch (error) {
    console.error('❌ Error getting address settings from database:', error);
  }
  
  // If no database settings found, create from address data
  if (addressData) {
    const settings = {
      id: addressData.id || `address_${Date.now()}`,
      address: address,
      buildingInfo: {
        totalApartments: addressData.total_apartments || 12,
        totalFloors: addressData.floors || 4,
        yearBuilt: addressData.year_built || 2000,
        buildingType: (addressData.building_type as 'apartment' | 'house' | 'commercial') || 'apartment',
        heatingType: 'central' as 'central' | 'individual' | 'district',
        parkingSpaces: 8
      },
      contactInfo: {
        managerName: addressData.chairman_name || '',
        managerPhone: addressData.chairman_phone || '',
        managerEmail: addressData.chairman_email || '',
        emergencyContact: '',
        emergencyPhone: ''
      },
      financialSettings: {
        defaultDeposit: 0,
        latePaymentFee: 0,
        gracePeriodDays: 7,
        autoRenewalEnabled: false,
        defaultContractDuration: 12
      },
      notificationSettings: {
        rentReminderDays: 7,
        contractExpiryReminderDays: 30,
        meterReminderDays: 7,
        maintenanceNotifications: true
      },
      createdAt: addressData.created_at || new Date().toISOString(),
      updatedAt: addressData.updated_at || new Date().toISOString()
    };
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Created settings from address data:', settings);
    }
    
    return settings;
  }
  
  // If no address data, return undefined to create default settings
  return undefined;
};

export const getAllAddressSettings = (): AddressSettings[] => {
  return addressSettings;
};

export const saveAddressSettings = async (settings: AddressSettings): Promise<void> => {
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 saveAddressSettings called with:', settings);
  }
  
  try {
    // Import the API functions
    const { createAddressSettings, updateAddressSettings } = await import('../lib/communalMetersApi');
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 API functions imported successfully');
    }
    
    if (settings.id && settings.id.startsWith('address_')) {
      // Update existing settings
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 Updating existing settings with ID:', settings.id);
      }
      await updateAddressSettings(settings.id, settings);
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Address settings updated in database:', settings);
      }
    } else {
      // Create new settings
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 Creating new settings with address_id:', settings.id);
      }
      const newSettings = await createAddressSettings({
        address_id: settings.id,
        building_info: settings.buildingInfo,
        contact_info: settings.contactInfo,
        financial_settings: settings.financialSettings,
        notification_settings: settings.notificationSettings,
        communal_config: settings.communalConfig
      });
      
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Address settings created in database:', newSettings);
      }
    }
  } catch (error) {
    console.error('❌ Error saving address settings to database:', error);
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Error details:', error);
    }
    // Fallback to local storage
    const index = addressSettings.findIndex(s => s.id === settings.id);
    if (index !== -1) {
      addressSettings[index] = settings;
    } else {
      addressSettings.push(settings);
    }
  }
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
export const getDefaultAddressSettings = (address: string, addressData?: any): Omit<AddressSettings, 'id' | 'createdAt' | 'updatedAt'> => {
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 getDefaultAddressSettings called with:', { address, addressData });
  }
  
  return {
    address,
    buildingInfo: {
      totalApartments: addressData?.total_apartments || 12,
      totalFloors: addressData?.floors || 4,
      yearBuilt: addressData?.year_built || 2000,
      buildingType: (addressData?.building_type as 'apartment' | 'house' | 'commercial') || 'apartment',
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



