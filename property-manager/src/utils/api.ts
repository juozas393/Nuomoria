// API utility functions for property management

export interface Property {
  id: number;
  address: string;
  type: 'apartment' | 'house' | 'commercial';
  status: 'occupied' | 'vacant' | 'maintenance';
  rent: number;
  area: number;
  rooms: number;
  tenant?: string;
  image?: string;
  additionalImages?: string[];
  createdAt: Date;
  updatedAt: Date;
  // Deposit fields
  deposit_amount?: number;
  deposit_paid_amount?: number;
  deposit_paid?: boolean;
  deposit_returned?: boolean;
  // Contract fields
  contract_start?: string;
  contract_end?: string;
  auto_renewal_enabled?: boolean;
  tenant_response?: 'wants_to_renew' | 'does_not_want_to_renew' | null;
  // Additional fields
  cleaning_cost?: number;
  cleaning_required?: boolean;
  bedding_owner?: 'tenant' | 'landlord' | null;
  bedding_fee_paid?: boolean;
}

export interface Tenant {
  id: string;
  name: string;
  email: string;
  phone: string;
  propertyId: string;
  rentAmount: number;
  startDate: Date;
  endDate?: Date;
  status: 'active' | 'inactive';
}

export interface Invoice {
  id: string;
  propertyId: string;
  tenantId: string;
  amount: number;
  dueDate: Date;
  status: 'paid' | 'pending' | 'overdue';
  items: InvoiceItem[];
  createdAt: Date;
}

export interface InvoiceItem {
  description: string;
  amount: number;
  type: 'rent' | 'utilities' | 'maintenance' | 'other';
}

// Mock data for development
export const mockProperties: Property[] = [
  {
    id: 1,
    address: 'Vilniaus g. 15, Vilnius',
    type: 'apartment',
    status: 'occupied',
    rent: 850,
    area: 65,
    rooms: 3,
    tenant: 'Jonas Jonaitis',
    image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=500',
    additionalImages: [
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=500',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=500',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=500'
    ],
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    deposit_amount: 1700,
    deposit_paid_amount: 1700,
    deposit_paid: true,
    deposit_returned: false,
    contract_start: '2024-01-15',
    contract_end: '2024-12-31',
    auto_renewal_enabled: true,
    tenant_response: null,
    cleaning_cost: 50,
    cleaning_required: false,
    bedding_owner: 'tenant',
    bedding_fee_paid: true
  },
  {
    id: 2,
    address: 'Kauno g. 8, Kaunas',
    type: 'house',
    status: 'vacant',
    rent: 1200,
    area: 120,
    rooms: 4,
    image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=500',
    additionalImages: [
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=500',
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=500'
    ],
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10'),
    deposit_amount: 2400,
    deposit_paid_amount: 0,
    deposit_paid: false,
    deposit_returned: false,
    contract_start: undefined,
    contract_end: undefined,
    auto_renewal_enabled: false,
    tenant_response: null,
    cleaning_cost: 80,
    cleaning_required: true,
    bedding_owner: null,
    bedding_fee_paid: false
  },
  {
    id: 3,
    address: 'Klaipėdos g. 25, Klaipėda',
    type: 'commercial',
    status: 'occupied',
    rent: 2000,
    area: 200,
    rooms: 6,
    tenant: 'UAB Verslas',
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=500',
    additionalImages: [
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=500',
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=500',
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=500',
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=500'
    ],
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-05'),
    deposit_amount: 4000,
    deposit_paid_amount: 3000,
    deposit_paid: false,
    deposit_returned: false,
    contract_start: '2024-01-05',
    contract_end: '2024-12-31',
    auto_renewal_enabled: true,
    tenant_response: 'wants_to_renew',
    cleaning_cost: 120,
    cleaning_required: false,
    bedding_owner: 'landlord',
    bedding_fee_paid: true
  },
  {
    id: 4,
    address: 'Šiaulių g. 12, Šiauliai',
    type: 'apartment',
    status: 'maintenance',
    rent: 600,
    area: 45,
    rooms: 2,
    image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=500',
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-20')
  },
  {
    id: 5,
    address: 'Panevėžio g. 30, Panevėžys',
    type: 'house',
    status: 'vacant',
    rent: 1500,
    area: 150,
    rooms: 5,
    image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=500',
    additionalImages: [
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=500',
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=500'
    ],
    createdAt: new Date('2024-01-12'),
    updatedAt: new Date('2024-01-12')
  },
  {
    id: 6,
    address: 'Alytaus g. 7, Alytus',
    type: 'apartment',
    status: 'occupied',
    rent: 750,
    area: 55,
    rooms: 2,
    tenant: 'Marija Marijaitė',
    image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=500',
    createdAt: new Date('2024-01-18'),
    updatedAt: new Date('2024-01-18')
  },
  {
    id: 7,
    address: 'Marijampolės g. 18, Marijampolė',
    type: 'commercial',
    status: 'occupied',
    rent: 1800,
    area: 180,
    rooms: 8,
    tenant: 'UAB Prekyba',
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=500',
    additionalImages: [
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=500',
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=500'
    ],
    createdAt: new Date('2024-01-08'),
    updatedAt: new Date('2024-01-08')
  },
  {
    id: 8,
    address: 'Tauragės g. 5, Tauragė',
    type: 'apartment',
    status: 'vacant',
    rent: 650,
    area: 50,
    rooms: 2,
    image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=500',
    createdAt: new Date('2024-01-25'),
    updatedAt: new Date('2024-01-25')
  },
  {
    id: 9,
    address: 'Telšių g. 22, Telšiai',
    type: 'house',
    status: 'occupied',
    rent: 1100,
    area: 110,
    rooms: 4,
    tenant: 'Petras Petraitis',
    image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=500',
    additionalImages: [
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=500',
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=500',
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=500'
    ],
    createdAt: new Date('2024-01-14'),
    updatedAt: new Date('2024-01-14')
  },
  {
    id: 10,
    address: 'Utenos g. 9, Utena',
    type: 'apartment',
    status: 'maintenance',
    rent: 700,
    area: 60,
    rooms: 3,
    image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=500',
    createdAt: new Date('2024-01-22'),
    updatedAt: new Date('2024-01-22')
  },
  {
    id: 11,
    address: 'Ukmergės g. 33, Ukmergė',
    type: 'commercial',
    status: 'vacant',
    rent: 2200,
    area: 250,
    rooms: 10,
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=500',
    additionalImages: [
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=500',
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=500'
    ],
    createdAt: new Date('2024-01-16'),
    updatedAt: new Date('2024-01-16')
  },
  {
    id: 12,
    address: 'Zarasų g. 11, Zarasai',
    type: 'apartment',
    status: 'occupied',
    rent: 800,
    area: 70,
    rooms: 3,
    tenant: 'Ona Onaitė',
    image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=500',
    createdAt: new Date('2024-01-19'),
    updatedAt: new Date('2024-01-19')
  }
];

export const mockTenants: Tenant[] = [
  {
    id: '1',
    name: 'Jonas Jonaitis',
    email: 'tenant@example.com',
    phone: '37060000001',
    propertyId: '1',
    rentAmount: 450,
    startDate: new Date('2024-01-01'),
    status: 'active',
  },
  {
    id: '2',
    name: 'Marija Jonaitė',
    email: 'marija.jonaite@email.com',
    phone: '37061234567',
    propertyId: '2',
    rentAmount: 650,
    startDate: new Date('2024-01-15'),
    status: 'active',
  },
  {
    id: '3',
    name: 'Jonas Petras',
    email: 'jonas.petras@email.com',
    phone: '37062345678',
    propertyId: '4',
    rentAmount: 1200,
    startDate: new Date('2023-12-01'),
    status: 'active',
  },
  {
    id: '4',
    name: 'UAB "Verslo Sprendimai"',
    email: 'info@verslosprendimai.lt',
    phone: '37053456789',
    propertyId: '5',
    rentAmount: 2500,
    startDate: new Date('2023-11-15'),
    status: 'active',
  },
  {
    id: '5',
    name: 'Ana Marija',
    email: 'ana.marija@email.com',
    phone: '37064567890',
    propertyId: '8',
    rentAmount: 950,
    startDate: new Date('2023-10-01'),
    status: 'active',
  },
  {
    id: '6',
    name: 'Petras Petraitis',
    email: 'tomas.kazlauskas@email.com',
    phone: '37065678901',
    propertyId: '10',
    rentAmount: 520,
    startDate: new Date('2024-01-25'),
    status: 'active',
  },
  {
    id: '7',
    name: 'Elena Jankauskienė',
    email: 'elena.jankauskiene@email.com',
    phone: '37066789012',
    propertyId: '12',
    rentAmount: 480,
    startDate: new Date('2024-01-30'),
    status: 'active',
  },
];

// API functions
export const getProperties = async (): Promise<Property[]> => {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 500));
  return mockProperties;
};

export const getTenants = async (): Promise<Tenant[]> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  return mockTenants;
};

export const createProperty = async (property: Omit<Property, 'id' | 'createdAt' | 'updatedAt'>): Promise<Property> => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  const newProperty: Property = {
    ...property,
    id: Math.max(...mockProperties.map(p => p.id)) + 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  mockProperties.push(newProperty);
  return newProperty;
};

export const updateProperty = async (id: number, updates: Partial<Property>): Promise<Property> => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  const index = mockProperties.findIndex(p => p.id === id);
  if (index === -1) throw new Error('Property not found');
  
  mockProperties[index] = { ...mockProperties[index], ...updates, updatedAt: new Date() };
  return mockProperties[index];
};

export const deleteProperty = async (id: number): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  const index = mockProperties.findIndex(p => p.id === id);
  if (index === -1) throw new Error('Property not found');
  mockProperties.splice(index, 1);
}; 