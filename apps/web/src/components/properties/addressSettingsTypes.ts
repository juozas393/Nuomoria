import { type DistributionMethod } from '../../constants/meterDistribution';

// ============================================================
// TYPES
// ============================================================

export interface LocalMeter {
  id: string;
  name: string;
  type: 'individual' | 'communal';
  unit: 'm3' | 'kWh' | 'GJ' | 'Kitas';
  price_per_unit: number;
  fixed_price?: number;
  distribution_method: DistributionMethod;
  description: string;
  is_active: boolean;
  requires_photo: boolean;
  is_custom?: boolean;
  is_inherited?: boolean;
  collectionMode: 'landlord_only' | 'tenant_photo';
  landlordReadingEnabled: boolean;
  tenantPhotoEnabled: boolean;
  supplier?: string;
}

export interface PaymentMethodBank {
  enabled: boolean;
  iban: string;
  bankName: string;
  recipientName: string;
}

export interface PaymentMethodPaysera {
  enabled: boolean;
  account: string;
}

export interface PaymentMethodRevolut {
  enabled: boolean;
  tag: string;
}

export interface PaymentMethodStripe {
  enabled: boolean;
}

export interface PaymentMethods {
  bankTransfer: PaymentMethodBank;
  paysera: PaymentMethodPaysera;
  revolut: PaymentMethodRevolut;
  stripe: PaymentMethodStripe;
}

export interface CustomContact {
  id: string;
  title: string;
  content: string;
  comment: string;
}

export interface BuildingInfo {
  totalApartments: number;
  totalFloors: number;
  yearBuilt: number | null;
  buildingType: string;
  heatingType: string;
  parkingSpaces: number;
  totalArea: number | null;
  managementType: string;
  associationNumber: string;
  companyCode: string;
  companyWebsite: string;
  card_background: string;
  card_background_position: number;
  card_background_opacity: number;
}

export interface ContactInfo {
  managerName: string;
  managerPhone: string;
  managerEmail: string;
  emergencyContact: string;
  emergencyPhone: string;
  chairmanName: string;
  chairmanPhone: string;
  chairmanEmail: string;
  companyName: string;
  contactPerson: string;
  companyPhone: string;
  companyEmail: string;
  plumberPhone: string;
  electricianPhone: string;
  dispatcherPhone: string;
  customContacts: CustomContact[];
}

export interface FinancialSettings {
  defaultDeposit: number;
  latePaymentFee: number;
  gracePeriodDays: number;
  autoRenewalEnabled: boolean;
  defaultContractDuration: number;
  paymentDay: number;
  depositPolicy: string;
  bankAccount: string;
  recipientName: string;
  paymentPurposeTemplate: string;
  paymentMethods: PaymentMethods;
}

export interface NotificationSettings {
  rentReminderEnabled: boolean;
  rentReminderDays: number;
  latePaymentEnabled: boolean;
  meterReminderEnabled: boolean;
  meterReminderDays: number;
  meterReadingStartDay: number;
  meterReadingEndDay: number;
  contractExpiryEnabled: boolean;
  contractExpiryReminderDays: number;
  maintenanceNotifications: boolean;
  newDocumentNotifications: boolean;
}

export interface CommunalConfig {
  enableMeterEditing: boolean;
  requirePhotos: boolean;
  historyRetentionMonths: number;
}

export interface AddressSettingsData {
  buildingInfo: BuildingInfo;
  contactInfo: ContactInfo;
  financialSettings: FinancialSettings;
  notificationSettings: NotificationSettings;
  communalConfig: CommunalConfig;
}

export type TabId = 'general' | 'contacts' | 'financial' | 'notifications' | 'communal';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- backward compat with consumers using AddressSettings type
export interface AddressSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  address: string;
  addressId?: string;
  currentSettings?: any; // justified: consumers pass AddressSettings (with id, address, createdAt, updatedAt)
  onSave: (settings: any) => void; // justified: consumers expect AddressSettings return type
  onDelete?: (addressId: string, address: string) => void;
}

export interface AddressRow {
  id: string;
  full_address: string;
  city?: string;
  postal_code?: string;
  building_type?: string;
  management_type?: string;
  total_apartments?: number;
  floors?: number;
  year_built?: number;
  chairman_name?: string;
  chairman_phone?: string;
  chairman_email?: string;
  company_name?: string;
  contact_person?: string;
  company_phone?: string;
  company_email?: string;
}

// ============================================================
// DEFAULT SETTINGS
// ============================================================
export const DEFAULT_SETTINGS: AddressSettingsData = {
  buildingInfo: {
    totalApartments: 1,
    totalFloors: 1,
    yearBuilt: null,
    buildingType: 'Butų namas',
    heatingType: 'central',
    parkingSpaces: 0,
    totalArea: null,
    managementType: 'Nuomotojas',
    associationNumber: '',
    companyCode: '',
    companyWebsite: '',
    card_background: 'CardsBackground.webp',
    card_background_position: 50,
    card_background_opacity: 15,
  },
  contactInfo: {
    managerName: '',
    managerPhone: '',
    managerEmail: '',
    emergencyContact: '',
    emergencyPhone: '',
    chairmanName: '',
    chairmanPhone: '',
    chairmanEmail: '',
    companyName: '',
    contactPerson: '',
    companyPhone: '',
    companyEmail: '',
    plumberPhone: '',
    electricianPhone: '',
    dispatcherPhone: '',
    customContacts: [],
  },
  financialSettings: {
    defaultDeposit: 500,
    latePaymentFee: 0,
    gracePeriodDays: 5,
    autoRenewalEnabled: true,
    defaultContractDuration: 12,
    paymentDay: 15,
    depositPolicy: '1month',
    bankAccount: '',
    recipientName: '',
    paymentPurposeTemplate: '',
    paymentMethods: {
      bankTransfer: { enabled: false, iban: '', bankName: '', recipientName: '' },
      paysera: { enabled: false, account: '' },
      revolut: { enabled: false, tag: '' },
      stripe: { enabled: false },
    },
  },
  notificationSettings: {
    rentReminderEnabled: true,
    rentReminderDays: 3,
    latePaymentEnabled: true,
    meterReminderEnabled: true,
    meterReminderDays: 5,
    meterReadingStartDay: 20,
    meterReadingEndDay: 29,
    contractExpiryEnabled: true,
    contractExpiryReminderDays: 30,
    maintenanceNotifications: true,
    newDocumentNotifications: false,
  },
  communalConfig: {
    enableMeterEditing: true,
    requirePhotos: true,
    historyRetentionMonths: 18,
  },
};
