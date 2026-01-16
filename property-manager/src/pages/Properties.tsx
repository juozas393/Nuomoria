import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  FunnelIcon,
  ChatBubbleLeftRightIcon,
  BellIcon,
  UserIcon,
  HomeIcon,
  CalendarIcon,
  CurrencyEuroIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  MapPinIcon,
  PencilIcon,
  TrashIcon,
  CameraIcon,
  PhoneIcon,
  EnvelopeIcon,
  CreditCardIcon,
  BanknotesIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  PhotoIcon,
  EyeIcon,
  EyeSlashIcon,
  UserGroupIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';
import PropertyCard from '../components/properties/PropertyCard';
import { PropertyDetailsModal } from '../components/properties/PropertyDetailsModal';
import { AddApartmentModal } from '../components/properties/AddApartmentModal';
import PropertiesFilters from '../components/properties/PropertiesFilters';
import GlobalChat from '../components/properties/GlobalChatComponent';
import { chatSystem, ChatUser, ChatMessage, initializeChatSystem } from '../utils/chatSystemNew';
// Removed propertyTestData as it was deleted
import { propertiesApi, propertyMeterConfigsApi } from '../lib/api';
import { CommunalConfigSection } from '../components/nuomotojas2/CommunalConfigSection';
import { getCommunalConfigByAddress, saveCommunalConfig } from '../data/communalConfigData';
import { CommunalConfig } from '../types/communal';
import AddressSettingsModal from '../components/properties/AddressSettingsModal';
import { AddressSettings } from '../data/addressSettingsData';
import { AddressSettingsSummary } from '../components/properties/AddressSettingsSummary';
import { getAddressSettings, saveAddressSettings } from '../data/addressSettingsData';

interface Property {
  id: string;
  address_id?: string;
  apartmentNumber: string;
  area: number;
  rooms: number;
  monthlyRent: number;
  tenant?: {
    id: string;
    name: string;
    phone: string;
    email: string;
    contractStart: string;
    contractEnd: string;
    tenant_response_date?: string;
    planned_move_out_date?: string;
    deposit: number;
    outstanding_amount: number;
    notification_count: number;
    monthlyRent: number;
  };
}

// Converter function to transform propertyTestData to Property interface
const convertTestDataToProperty = (testData: any): Property => {
  return {
    id: testData.apartment_number || testData.id || 'unknown',
    apartmentNumber: testData.apartment_number || testData.apartmentNumber || 'unknown',
    area: testData.area || 0,
    rooms: testData.rooms || 0,
    monthlyRent: testData.rent || testData.monthlyRent || 0,
    tenant: testData.tenant_name || testData.tenant?.name ? {
      id: testData.apartment_number || testData.id || 'unknown',
      name: testData.tenant_name || testData.tenant?.name || '',
      phone: testData.phone || testData.tenant?.phone || '',
      email: testData.email || testData.tenant?.email || '',
      contractStart: testData.contract_start || testData.tenant?.contractStart || '',
      contractEnd: testData.contract_end || testData.tenant?.contractEnd || '',
      tenant_response_date: testData.tenant_response_date || testData.tenant?.tenant_response_date,
      planned_move_out_date: testData.planned_move_out_date || testData.tenant?.planned_move_out_date,
      deposit: testData.deposit_amount || testData.tenant?.deposit || 0,
      outstanding_amount: testData.tenant?.outstanding_amount || 0,
      notification_count: testData.notification_count || testData.tenant?.notification_count || 0,
      monthlyRent: testData.rent || testData.tenant?.monthlyRent || 0
    } : undefined
  };
};

// Helper function to convert unit types
  const convertUnit = (unit: string): 'm3' | 'kWh' | 'GJ' | 'Kitas' => {
  switch (unit.toLowerCase()) {
    case 'm³':
    case 'm3':
      return 'm3';
    case 'kwh':
      return 'kWh';
    case 'gj':
      return 'GJ';
    case 'mb':
      return 'Kitas';
          default:
        return 'Kitas';
  }
};

// Helper function to convert meter types
const convertMeterType = (key: string): 'electricity' | 'water_cold' | 'water_hot' | 'gas' | 'heating' | 'internet' | 'garbage' | 'custom' => {
  switch (key) {
    case 'electricity':
      return 'electricity';
    case 'water_cold':
      return 'water_cold';
    case 'water_hot':
      return 'water_hot';
    case 'gas':
      return 'gas';
    case 'heating':
      return 'heating';
    case 'internet':
      return 'internet';
    case 'garbage':
      return 'garbage';
    default:
      return 'custom';
  }
};

const Properties: React.FC = () => {
  // Mock data instead of deleted propertyTestData
  const mockProperties: Property[] = [];
  const [properties, setProperties] = useState<Property[]>(mockProperties);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showGlobalChat, setShowGlobalChat] = useState(false);
  const [globalMessages, setGlobalMessages] = useState<ChatMessage[]>([]);
  const [showAddApartmentModal, setShowAddApartmentModal] = useState(false);
  const [communalConfigs, setCommunalConfigs] = useState<Map<string, CommunalConfig>>(new Map());
  const [addressSettings, setAddressSettings] = useState<AddressSettings | undefined>(undefined);
  const [showAddressSettingsModal, setShowAddressSettingsModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<ChatUser>({
    id: 'landlord-1',
    name: 'Nuomotojas',
    type: 'landlord',
    isOnline: true
  });

  // Initialize chat system
  useEffect(() => {
    initializeChatSystem();
    chatSystem.addUser(currentUser);
    
    // Load global chat messages
    const globalChat = chatSystem.getGlobalChat('Vokiečių g. 117, Vilnius');
    if (globalChat) {
      setGlobalMessages(globalChat.messages);
    }
  }, []);

  const handleSendGlobalMessage = (message: string, type: 'text' | 'announcement' = 'text', targetAudience: 'all' | 'tenants' | 'landlords' = 'all') => {
    const newMessage = chatSystem.sendGlobalMessage(
      currentUser.id,
      message,
      type,
      targetAudience
    );
    
    if (newMessage) {
      setGlobalMessages(prev => [...prev, newMessage]);
    }
  };

  const handlePropertyClick = (property: Property) => {
    setSelectedProperty(property);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProperty(null);
  };

  const handleEditProperty = (property: Property) => {
    // Handle edit logic
    console.log('Edit property:', property);
  };

  const handleDeleteProperty = (id: string) => {
    setProperties(prev => prev.filter(property => property.id !== id));
    handleCloseModal();
  };

  // Komunalinių konfigūracijos valdymas
  const handleCommunalConfigChange = (address: string, config: CommunalConfig) => {
    setCommunalConfigs(prev => new Map(prev.set(address, config)));
    saveCommunalConfig(config);
  };

  const getCommunalConfigForAddress = (address: string): CommunalConfig | undefined => {
    return communalConfigs.get(address) || getCommunalConfigByAddress(address);
  };

  // Adreso nustatymų valdymas
  const handleAddressSettingsSave = (settings: AddressSettings) => {
    setAddressSettings(settings);
    saveAddressSettings(settings);
  };

  const handleOpenAddressSettings = () => {
    setShowAddressSettingsModal(true);
  };

  const handleOpenBillingShortcut = useCallback((params: { addressId?: string | null; address: string }) => {
    setShowAddressSettingsModal(false);
    window.dispatchEvent(new CustomEvent('open-invoice-quick-create', { detail: params }));
  }, []);

  const handleAddApartment = async (apartmentData: any) => {
    try {
      // Convert apartment data to API format
      const newProperty = await propertiesApi.create({
        address: apartmentData.address,
        apartment_number: apartmentData.apartmentNumber,
        tenant_name: apartmentData.tenantName,
        phone: apartmentData.tenantPhone,
        email: apartmentData.tenantEmail,
        rent: apartmentData.monthlyRent,
        area: apartmentData.area,
        rooms: apartmentData.rooms,
        contract_start: apartmentData.contractStart,
        contract_end: apartmentData.contractEnd,
        deposit_amount: apartmentData.deposit,
        deposit_paid_amount: 0,
        deposit_paid: false,
        deposit_returned: false,
        deposit_deductions: 0,
        status: 'occupied',
        auto_renewal_enabled: false,
        notification_count: 0,
        original_contract_duration_months: 12
      });

      // Pridėti skaitiklius, jei yra
      if (apartmentData.meters && apartmentData.meters.length > 0) {
        console.log('Pridedami skaitliukai:', apartmentData.meters);
        
        // Convert MeterRow to PropertyMeterConfig format
        const meterConfigs = apartmentData.meters.map((meter: any) => ({
          meter_type: convertMeterType(meter.key),
          custom_name: meter.key === 'custom' ? meter.name : null,
          unit: convertUnit(meter.unit),
          tariff: 'single' as const,
          price_per_unit: meter.rate,
          initial_reading: meter.initialReading,
          initial_date: apartmentData.contractStart,
          require_photo: true,
          require_serial: false,
          serial_number: null,
          provider: null,
          status: 'active' as const,
          notes: meter.note || null
        }));

        await propertyMeterConfigsApi.createMultiple(newProperty.id, meterConfigs);
        console.log('Skaitliukai sėkmingai pridėti');
      }

      // Convert API response to Property format and add to state
      const convertedProperty = convertTestDataToProperty(newProperty);
      setProperties(prev => [...prev, convertedProperty]);
      setShowAddApartmentModal(false);
      
      console.log('Butas sėkmingai pridėtas:', newProperty);
    } catch (error) {
      console.error('Klaida pridedant butą:', error);
      // Čia galėtumėte pridėti error handling (toast notification, etc.)
    }
  };

  const filteredProperties = properties.filter(property => {
    const searchLower = searchTerm.toLowerCase();
    const apartmentNumberLower = property.apartmentNumber?.toLowerCase() || '';
    const tenantNameLower = property.tenant?.name?.toLowerCase() || '';
    
    const matchesSearch = apartmentNumberLower.includes(searchLower) ||
                         tenantNameLower.includes(searchLower);
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <HomeIcon className="w-6 h-6 text-blue-600" />
                <h1 className="text-xl font-semibold text-gray-900">Vokiečių g. 117, Vilnius</h1>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <MapPinIcon className="w-4 h-4" />
                <span>12 butų</span>
                <span>•</span>
                <span>8 nuomininkai</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Global Chat Button */}
              <button
                onClick={() => setShowGlobalChat(true)}
                className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                <ChatBubbleLeftRightIcon className="w-4 h-4" />
                <span className="text-sm font-medium">Bendras pokalbis</span>
              </button>
              
              <button 
                onClick={() => setShowAddApartmentModal(true)}
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <PlusIcon className="w-4 h-4" />
                <span className="text-sm font-medium">Pridėti butą</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Ieškoti butų..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FunnelIcon className="w-4 h-4" />
            <span className="text-sm">Filtrai</span>
          </button>
        </div>

        {showFilters && (
          <div className="mt-4">
            <PropertiesFilters 
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              statusFilter="all"
              onStatusFilterChange={() => {}}
              sortBy="name"
              onSortByChange={() => {}}
            />
          </div>
        )}
      </div>

      {/* Adreso nustatymai */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <AddressSettingsSummary
          address="Vokiečių g. 117, Vilnius"
          settings={addressSettings}
          onOpenSettings={handleOpenAddressSettings}
        />
      </div>

      {/* Properties Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProperties.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              onClick={() => handlePropertyClick(property)}
            />
          ))}
        </div>
      </div>

      {/* Property Details Modal */}
      {selectedProperty && (
        <PropertyDetailsModal
          apartment={selectedProperty}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onEdit={handleEditProperty}
          onDelete={handleDeleteProperty}
        />
      )}

      {/* Global Chat Modal */}
      <GlobalChat
        buildingAddress="Vokiečių g. 117, Vilnius"
        currentUser={currentUser}
        onSendMessage={handleSendGlobalMessage}
        messages={globalMessages}
        isOpen={showGlobalChat}
        onClose={() => setShowGlobalChat(false)}
        onlineUsers={chatSystem.getOnlineUsers().length}
      />

      {/* Add Apartment Modal */}
      <AddApartmentModal
        isOpen={showAddApartmentModal}
        onClose={() => setShowAddApartmentModal(false)}
        onAdd={handleAddApartment}
        address="Vokiečių g. 117, Vilnius"
      />

      {/* Address Settings Modal */}
      <AddressSettingsModal
        isOpen={showAddressSettingsModal}
        onClose={() => setShowAddressSettingsModal(false)}
        address="Vokiečių g. 117, Vilnius"
        currentSettings={addressSettings}
        onSave={handleAddressSettingsSave}
        onOpenBilling={handleOpenBillingShortcut}
      />
    </div>
  );
};

export default Properties; 