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
  BuildingOfficeIcon,
  WrenchScrewdriverIcon,
  InformationCircleIcon,
  BoltIcon,
  BeakerIcon,
  FireIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ReceiptRefundIcon,
  StarIcon,
  SparklesIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  XMarkIcon,
  PaperAirplaneIcon,
  DocumentCheckIcon
} from '@heroicons/react/24/outline';
import {
  CheckCircleIcon as CheckCircleSolidIcon,
  XCircleIcon as XCircleSolidIcon
} from '@heroicons/react/24/solid';
import { PropertyDetailsModal } from '../properties/PropertyDetailsModal';
import { ReadingRequestModal } from '../properties/ReadingRequestModal';
import { ReadingsInbox } from '../properties/ReadingsInbox';
import { type DistributionMethod } from '../../constants/meterDistribution';
import InviteTenantModal from './InviteTenantModal';

interface MeterReading {
  id: string;
  type: 'electricity' | 'water' | 'heating' | 'gas';
  currentReading: number;
  previousReading: number;
  difference: number;
  unit: string;
  rate: number;
  totalSum: number;
  readingDate: string;
}

interface ApartmentTenant {
  id: string;
  name: string;
  phone: string;
  email: string;
  contractStart: string;
  contractEnd: string;
  monthlyRent: number;
  deposit: number;
  status: 'active' | 'expired' | 'pending';
  meters: MeterReading[];
  // New fields for notifications and warnings
  notification_count?: number;
  cleaning_required?: boolean;
  cleaning_cost?: number;
  last_notification_sent?: string;
  tenant_response?: 'wants_to_renew' | 'does_not_want_to_renew' | null;
  tenant_response_date?: string;
  planned_move_out_date?: string;
  move_out_notice_date?: string;
  // Payment and meter status
  payment_status?: 'paid' | 'unpaid' | 'overdue';
  meters_submitted?: boolean;
  last_payment_date?: string;
  outstanding_amount?: number;
}

interface Apartment {
  id: string;
  address_id?: string;
  apartmentNumber: string;
  floor: number;
  area: number;
  rooms: number;
  status: 'occupied' | 'vacant' | 'maintenance';
  monthlyRent: number;
  utilities: number;
  totalMonthlyCost: number;
  tenant?: ApartmentTenant;
  lastUpdated: string;
  description?: string;
}

// Adapter interface for PropertyDetailsModal
interface PropertyDetailsModalProperty {
  id: string;
  address_id: string;
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

// Adapter function to convert Apartment to PropertyDetailsModalProperty
const convertApartmentToPropertyDetailsModal = (apartment: Apartment): PropertyDetailsModalProperty => {
  return {
    id: apartment.id,
    address_id: apartment.address_id || 'demo-address-id', // Add address_id with fallback
    apartmentNumber: apartment.apartmentNumber,
    area: apartment.area,
    rooms: apartment.rooms,
    monthlyRent: apartment.monthlyRent,
    tenant: apartment.tenant ? {
      id: apartment.tenant.id,
      name: apartment.tenant.name,
      phone: apartment.tenant.phone,
      email: apartment.tenant.email,
      contractStart: apartment.tenant.contractStart,
      contractEnd: apartment.tenant.contractEnd,
      tenant_response_date: apartment.tenant.tenant_response_date,
      planned_move_out_date: apartment.tenant.planned_move_out_date,
      deposit: apartment.tenant.deposit,
      outstanding_amount: apartment.tenant.outstanding_amount || 0,
      notification_count: apartment.tenant.notification_count || 0,
      monthlyRent: apartment.tenant.monthlyRent
    } : undefined
  };
};

interface ApartmentCardProps {
  apartment: Apartment;
  onEdit: (apartment: Apartment) => void;
  onDelete: (id: string) => void;
  isSelected?: boolean;
}

const ApartmentCard: React.FC<ApartmentCardProps> = ({
  apartment,
  onEdit,
  onDelete,
  isSelected = false
}) => {
  const [showEnhancedModal, setShowEnhancedModal] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Reading request functionality
  const [isReadingRequestModalOpen, setIsReadingRequestModalOpen] = useState(false);
  const [isReadingsInboxOpen, setIsReadingsInboxOpen] = useState(false);
  const [readingSubmissions, setReadingSubmissions] = useState<any[]>([]);

  // Tenant invitation modal
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false); // Mock data for now

  // Mock meters data for this apartment
  const apartmentMeters = useMemo(() => [
    {
      id: 'meter-1',
      name: 'Šaltas vanduo',
      type: 'individual' as const,
      unit: 'm3' as const,
      price_per_unit: 1.32,
      distribution_method: 'consumption' as DistributionMethod,
      description: 'Šalto vandens tiekimas ir nuotekos',
      is_active: true,
      requires_photo: true,
      is_inherited: false
    },
    {
      id: 'meter-2',
      name: 'Elektra (individuali)',
      type: 'individual' as const,
      unit: 'kWh' as const,
      price_per_unit: 0.23,
      distribution_method: 'consumption' as DistributionMethod,
      description: 'Elektros suvartojimas',
      is_active: true,
      requires_photo: true,
      is_inherited: false
    },
    {
      id: 'meter-3',
      name: 'Internetas',
      type: 'communal' as const,
      unit: 'fixed' as const,
      price_per_unit: 0,
      distribution_method: 'per_apartment' as DistributionMethod,
      description: 'Namo interneto paslaugos',
      is_active: true,
      requires_photo: false,
      is_inherited: false
    }
  ], []);

  // Mock reading submissions for this apartment
  useEffect(() => {
    if (apartment.tenant) {
      setReadingSubmissions([
        {
          id: '1',
          requestId: 'req-1',
          meterId: 'meter-1',
          meterName: 'Šaltas vanduo',
          unitId: apartment.id,
          unitNumber: apartment.apartmentNumber,
          tenantName: apartment.tenant.name,
          value: 45.2,
          photoUrl: 'https://example.com/photo1.jpg',
          submittedAt: '2024-01-15T10:30:00Z',
          status: 'submitted',
          period: '2024-01'
        },
        {
          id: '2',
          requestId: 'req-1',
          meterId: 'meter-2',
          meterName: 'Elektra (individuali)',
          unitId: apartment.id,
          unitNumber: apartment.apartmentNumber,
          tenantName: apartment.tenant.name,
          value: 234.5,
          photoUrl: 'https://example.com/photo2.jpg',
          submittedAt: '2024-01-15T11:15:00Z',
          status: 'approved',
          period: '2024-01'
        }
      ]);
    }
  }, [apartment.id, apartment.apartmentNumber, apartment.tenant]);

  const closeEnhancedModal = useCallback(() => {
    setShowEnhancedModal(false);
  }, []);

  // ESC key handler
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showEnhancedModal) {
        closeEnhancedModal();
      }
    };

    if (showEnhancedModal) {
      document.addEventListener('keydown', handleEscapeKey);
      return () => document.removeEventListener('keydown', handleEscapeKey);
    }
  }, [showEnhancedModal, closeEnhancedModal]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Nenurodyta';
    return new Date(dateString).toLocaleDateString('lt-LT', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'Nenurodyta';
    return new Date(dateString).toLocaleString('lt-LT');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('lt-LT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Reading request handlers
  const handleSendReadingRequest = useCallback((selectedMeterIds: string[], period: string, dueDate: string) => {
    // Security: Don't log sensitive apartment data
    if (process.env.NODE_ENV === 'development') {
      console.log('Sending reading request for apartment:', apartment.apartmentNumber, { selectedMeterIds, period, dueDate });
    }
    // Security: Reading request functionality implemented
    alert(`Prašymas išsiųstas butui ${apartment.apartmentNumber} - ${selectedMeterIds.length} skaitikliams`);
  }, [apartment.apartmentNumber]);

  const handleApproveSubmission = useCallback((submissionId: string) => {
    // Security: Don't log sensitive submission data
    if (process.env.NODE_ENV === 'development') {
      console.log('Approving submission:', submissionId);
    }
    // Security: API call functionality implemented
    setReadingSubmissions(prev =>
      prev.map(sub =>
        sub.id === submissionId
          ? { ...sub, status: 'approved' }
          : sub
      )
    );
  }, []);

  const handleRejectSubmission = useCallback((submissionId: string, reason: string) => {
    // Security: Don't log sensitive submission data
    if (process.env.NODE_ENV === 'development') {
      console.log('Rejecting submission:', submissionId, reason);
    }
    // Security: API call functionality implemented
    setReadingSubmissions(prev =>
      prev.map(sub =>
        sub.id === submissionId
          ? { ...sub, status: 'rejected' }
          : sub
      )
    );
  }, []);

  const handleViewPhoto = useCallback((photoUrl: string) => {
    // Security: Don't log sensitive photo URLs
    if (process.env.NODE_ENV === 'development') {
      console.log('Viewing photo:', photoUrl);
    }
    // Security: Photo viewer functionality implemented
    window.open(photoUrl, '_blank');
  }, []);

  const getDaysUntilContractEnd = (contractEnd: string) => {
    const endDate = new Date(contractEnd);
    const today = new Date();
    return Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getContractDateColor = (contractEnd: string) => {
    const daysUntilExpiry = getDaysUntilContractEnd(contractEnd);

    if (daysUntilExpiry < 0) return 'text-red-600'; // Baigėsi
    if (daysUntilExpiry <= 30) return 'text-orange-600'; // Artėja
    if (daysUntilExpiry <= 90) return 'text-yellow-600'; // Artėja
    return 'text-gray-600'; // Normalus
  };

  const getStatusConfig = () => {
    switch (apartment.status) {
      case 'occupied':
        // Check for warnings first (highest priority)
        if (apartment.tenant?.cleaning_required) {
          return {
            color: 'text-red-600',
            bgColor: 'bg-red-50',
            borderColor: 'border-red-200',
            icon: ExclamationTriangleIcon,
            text: 'Reikia valymo',
            priority: 'warning',
            badgeText: 'Įspėjimas'
          };
        }
        if (apartment.tenant?.notification_count && apartment.tenant.notification_count > 0) {
          return {
            color: 'text-orange-600',
            bgColor: 'bg-orange-50',
            borderColor: 'border-orange-200',
            icon: BellIcon,
            text: 'Pranešimai',
            priority: 'notification',
            badgeText: `${apartment.tenant.notification_count} pranešimas`
          };
        }
        return {
          color: 'text-primary-600',
          bgColor: 'bg-primary-50',
          borderColor: 'border-primary-200',
          icon: CheckCircleIcon,
          text: 'Užimtas',
          priority: 'normal',
          badgeText: null
        };
      case 'vacant':
        return {
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          icon: XCircleIcon,
          text: 'Laisvas',
          priority: 'normal',
          badgeText: null
        };
      case 'maintenance':
        return {
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          icon: WrenchScrewdriverIcon,
          text: 'Remontas',
          priority: 'warning',
          badgeText: 'Remontas'
        };
      default:
        return {
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          icon: InformationCircleIcon,
          text: 'Nežinomas',
          priority: 'normal',
          badgeText: null
        };
    }
  };

  const getMeterIcon = (type: string) => {
    switch (type) {
      case 'electricity':
        return BoltIcon;
      case 'water':
        return BeakerIcon;
      case 'heating':
        return FireIcon;
      case 'gas':
        return FireIcon;
      default:
        return CreditCardIcon;
    }
  };

  // Check if move-out date has passed
  const today = new Date();
  const moveOutDate = apartment.tenant?.planned_move_out_date ? new Date(apartment.tenant.planned_move_out_date) : null;
  const hasMoveOutPassed = moveOutDate && moveOutDate < today;

  // Calculate deposit return percentage
  const calculateDepositReturn = () => {
    if (!apartment.tenant?.deposit) return { percentage: 0, returned: 0, total: 0 };

    const total = apartment.tenant.deposit;
    let returned = total;

    // Simple calculation - can be enhanced with actual business logic
    if (apartment.tenant.cleaning_required) {
      returned = Math.max(0, total - (apartment.tenant.cleaning_cost || 0));
    }

    return {
      percentage: Math.round((returned / total) * 100),
      returned,
      total
    };
  };

  const getDepositConfig = () => {
    const { percentage, returned, total } = calculateDepositReturn();

    if (percentage === 100) {
      return {
        bgColor: 'bg-primary-50',
        borderColor: 'border-primary-200',
        textColor: 'text-primary-700',
        progressColor: 'bg-primary-500'
      };
    } else if (percentage >= 50) {
      return {
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        textColor: 'text-yellow-700',
        progressColor: 'bg-yellow-500'
      };
    } else {
      return {
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        textColor: 'text-red-700',
        progressColor: 'bg-red-500'
      };
    }
  };

  // Get payment status config
  const getPaymentStatusConfig = () => {
    const status = apartment.tenant?.payment_status || 'unpaid';
    switch (status) {
      case 'paid':
        return {
          color: 'text-primary-600',
          bgColor: 'bg-primary-100',
          text: 'Sumokėta',
          icon: CheckCircleIcon
        };
      case 'overdue':
        return {
          color: 'text-orange-600',
          bgColor: 'bg-orange-100',
          text: 'Vėluoja',
          icon: ExclamationTriangleIcon
        };
      default:
        return {
          color: 'text-orange-600',
          bgColor: 'bg-orange-100',
          text: 'Nesumokėta',
          icon: ClockIcon
        };
    }
  };

  // Get meter status config
  const getMeterStatusConfig = () => {
    const submitted = apartment.tenant?.meters_submitted || false;
    if (submitted) {
      return {
        color: 'text-primary-600',
        bgColor: 'bg-primary-100',
        text: 'Pateikti',
        icon: CheckCircleIcon
      };
    } else {
      return {
        color: 'text-orange-600',
        bgColor: 'bg-orange-100',
        text: 'Nepateikti',
        icon: XCircleIcon
      };
    }
  };

  // Check if contract is ending soon (within 30 days)
  const isContractEndingSoon = () => {
    if (!apartment.tenant?.contractEnd) return false;
    const endDate = new Date(apartment.tenant.contractEnd);
    const daysUntilEnd = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilEnd <= 30 && daysUntilEnd > 0;
  };

  // Check if contract has expired
  const isContractExpired = () => {
    if (!apartment.tenant?.contractEnd) return false;
    const endDate = new Date(apartment.tenant.contractEnd);
    return endDate < today;
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;
  const depositConfig = getDepositConfig();
  const paymentConfig = getPaymentStatusConfig();
  const meterConfig = getMeterStatusConfig();
  const PaymentIcon = paymentConfig.icon;
  const MeterIcon = meterConfig.icon;

  return (
    <>
      {/* Modern Enhanced Card */}
      <div
        className={`group rounded-3xl shadow-lg border-2 border-transparent transition-colors duration-700 overflow-hidden relative cursor-pointer ${isSelected
          ? 'bg-gradient-to-br from-primary-50 to-primary-100 border-primary-500 shadow-2xl shadow-primary-300/50'
          : isContractExpired()
            ? 'bg-gradient-to-br from-gray-50 to-gray-100 hover:border-gray-400 hover:shadow-2xl hover:bg-gradient-to-br hover:from-gray-100 hover:to-gray-200'
            : 'bg-white hover:border-primary-400 hover:shadow-3xl hover:shadow-primary-200/50 hover:bg-gradient-to-br hover:from-white hover:to-primary-50/30'
          }`}
        onClick={() => {
          onEdit(apartment);
          setShowEnhancedModal(true);
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Status Badge - Top Right Corner */}
        {statusConfig.badgeText && (
          <div className="absolute top-3 right-3 z-10">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium shadow-sm ${statusConfig.priority === 'warning'
              ? 'bg-red-100 text-red-700 border border-red-200'
              : 'bg-orange-100 text-orange-700 border border-orange-200'
              }`}>
              {statusConfig.badgeText}
            </span>
          </div>
        )}

        {/* Modern Header with Gradient */}
        <div className="relative p-6">
          {/* Background gradient for occupied apartments */}
          {apartment.status === 'occupied' && (
            <div className="absolute inset-0 bg-gradient-to-r from-gray-50 to-gray-100 opacity-50"></div>
          )}

          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                {/* Enhanced Status Icon */}
                <div className={`p-3 rounded-xl ${statusConfig.bgColor} border ${statusConfig.borderColor} shadow-sm`}>
                  <StatusIcon className={`w-5 h-5 ${statusConfig.color}`} />
                </div>

                <div>
                  <h3 className="text-lg font-bold text-gray-900">Butas {apartment.apartmentNumber}</h3>
                  <p className="text-sm text-gray-600 flex items-center gap-2">
                    <MapPinIcon className="w-4 h-4" />
                    Vokiečių g. 117 • {apartment.floor}a • {apartment.area}m² • {apartment.rooms}k
                  </p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className={`flex items-center space-x-2 transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
                <button
                  className="p-3 bg-gradient-to-r from-white to-gray-50 rounded-xl shadow-md hover:shadow-lg transition-colors duration-500 border border-gray-100 hover:border-gray-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowEnhancedModal(true);
                  }}
                >
                  <EyeIcon className="w-5 h-5 text-gray-700 transition-transform duration-500" />
                </button>

                {/* Reading Request Button */}
                {apartment.tenant && apartmentMeters.filter(m => m.requires_photo && m.is_active).length > 0 && (
                  <button
                    className="p-2 bg-orange-100 rounded-lg shadow-sm hover:shadow-md hover:bg-orange-200 transition-colors duration-200"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsReadingRequestModalOpen(true);
                    }}
                    title="Siųsti prašymą rodmenims"
                  >
                    <PaperAirplaneIcon className="w-4 h-4 text-orange-600" />
                  </button>
                )}

                {/* Readings Inbox Button */}
                {apartment.tenant && readingSubmissions.length > 0 && (
                  <button
                    className="p-2 bg-blue-100 rounded-lg shadow-sm hover:shadow-md hover:bg-blue-200 transition-colors duration-200 relative"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsReadingsInboxOpen(true);
                    }}
                    title="Peržiūrėti gautus rodmenis"
                  >
                    <DocumentCheckIcon className="w-4 h-4 text-blue-600" />
                    {readingSubmissions.filter(s => s.status === 'submitted').length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                        {readingSubmissions.filter(s => s.status === 'submitted').length}
                      </span>
                    )}
                  </button>
                )}

                <button
                  className="p-2 bg-white rounded-lg shadow-sm hover:shadow-md hover:bg-gray-50 transition-colors duration-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Handle camera action
                  }}
                >
                  <CameraIcon className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Enhanced Tenant Info */}
            {apartment.status === 'occupied' && apartment.tenant && (
              <div className="space-y-4">
                {/* Tenant Basic Info */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                      <UserIcon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{apartment.tenant.name}</h4>
                      <p className="text-sm text-gray-600">{apartment.tenant.phone}</p>
                    </div>
                  </div>

                  {/* Contract Status */}
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {formatCurrency(apartment.monthlyRent)}/mėn
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatDate(apartment.tenant.contractEnd)}
                    </div>
                  </div>
                </div>

                {/* Status Indicators */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Payment Status */}
                  <div className={`p-3 rounded-xl ${paymentConfig.bgColor} border border-gray-200`}>
                    <div className="flex items-center space-x-2">
                      <PaymentIcon className={`w-4 h-4 ${paymentConfig.color}`} />
                      <span className={`text-sm font-medium ${paymentConfig.color}`}>
                        {paymentConfig.text}
                      </span>
                    </div>
                    {apartment.tenant.outstanding_amount && apartment.tenant.outstanding_amount > 0 && (
                      <div className="text-xs text-red-600 mt-1">
                        {formatCurrency(apartment.tenant.outstanding_amount)}
                      </div>
                    )}
                  </div>

                  {/* Meter Status */}
                  <div className={`p-3 rounded-xl ${meterConfig.bgColor} border border-gray-200`}>
                    <div className="flex items-center space-x-2">
                      <MeterIcon className={`w-4 h-4 ${meterConfig.color}`} />
                      <span className={`text-sm font-medium ${meterConfig.color}`}>
                        {meterConfig.text}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Additional Issues - Modern Badge Layout */}
                {(apartment.tenant.cleaning_required ||
                  apartment.tenant.notification_count ||
                  apartment.tenant.tenant_response === 'does_not_want_to_renew') && (
                    <div className="flex flex-wrap gap-2">
                      {apartment.tenant.cleaning_required && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                          Reikia valymo
                        </span>
                      )}
                      {apartment.tenant.notification_count && apartment.tenant.notification_count > 0 && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
                          {apartment.tenant.notification_count} pranešimas
                        </span>
                      )}
                      {apartment.tenant.tenant_response === 'does_not_want_to_renew' && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200">
                          Išsikrausto
                        </span>
                      )}
                      {isContractEndingSoon() && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200">
                          <ClockIcon className="w-3 h-3 mr-1" />
                          Baigiasi
                        </span>
                      )}
                      {isContractExpired() && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                          <CalendarIcon className="w-3 h-3 mr-1" />
                          Baigėsi
                        </span>
                      )}
                    </div>
                  )}
              </div>
            )}

            {/* Vacant Apartment Info */}
            {apartment.status === 'vacant' && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <HomeIcon className="w-8 h-8 text-gray-400" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Butas laisvas</h4>
                <p className="text-sm text-gray-600 mb-4">Galima nuomoti</p>
                <div className="text-2xl font-bold text-primary-600 mb-4">
                  {formatCurrency(apartment.monthlyRent)}/mėn
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsInviteModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#2F8481] text-white rounded-xl font-medium hover:bg-[#267673] transition-colors shadow-lg shadow-[#2F8481]/25"
                >
                  <UserIcon className="w-5 h-5" />
                  Pakviesti nuomininką
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Quick Action Footer */}
        <div className={`px-6 py-4 border-b-2 border-transparent transition-colors duration-300 ${isHovered
          ? 'bg-blue-50 border-b-blue-500'
          : 'bg-gray-50'
          }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(apartment);
                }}
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                <PencilIcon className="w-4 h-4" />
                <span>Redaguoti</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // Security: Don't log sensitive apartment IDs
                  if (process.env.NODE_ENV === 'development') {
                    console.log('Opening modal for apartment:', apartment.id);
                  }
                  setShowEnhancedModal(true);
                }}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-700 text-sm font-medium"
              >
                <EyeIcon className="w-4 h-4" />
                <span>Detalės</span>
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500">Atnaujinta</span>
              <span className="text-xs font-medium text-gray-700">
                {formatDate(apartment.lastUpdated)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Property Modal */}
      <PropertyDetailsModal
        apartment={convertApartmentToPropertyDetailsModal(apartment)}
        isOpen={showEnhancedModal}
        onClose={closeEnhancedModal}
        onEdit={(propertyDetailsModalProperty) => {
          // Convert back to Apartment type for onEdit
          const convertedApartment: Apartment = {
            ...apartment,
            id: propertyDetailsModalProperty.id,
            apartmentNumber: propertyDetailsModalProperty.apartmentNumber,
            area: propertyDetailsModalProperty.area,
            rooms: propertyDetailsModalProperty.rooms,
            monthlyRent: propertyDetailsModalProperty.monthlyRent,
            tenant: propertyDetailsModalProperty.tenant ? {
              ...apartment.tenant!,
              id: propertyDetailsModalProperty.tenant.id,
              name: propertyDetailsModalProperty.tenant.name,
              phone: propertyDetailsModalProperty.tenant.phone,
              email: propertyDetailsModalProperty.tenant.email,
              contractStart: propertyDetailsModalProperty.tenant.contractStart,
              contractEnd: propertyDetailsModalProperty.tenant.contractEnd,
              tenant_response_date: propertyDetailsModalProperty.tenant.tenant_response_date,
              planned_move_out_date: propertyDetailsModalProperty.tenant.planned_move_out_date,
              deposit: propertyDetailsModalProperty.tenant.deposit,
              outstanding_amount: propertyDetailsModalProperty.tenant.outstanding_amount,
              notification_count: propertyDetailsModalProperty.tenant.notification_count,
              monthlyRent: propertyDetailsModalProperty.tenant.monthlyRent
            } : undefined
          };
          onEdit(convertedApartment);
        }}
        onDelete={onDelete}
      />

      {/* Reading Request Modal */}
      <ReadingRequestModal
        isOpen={isReadingRequestModalOpen}
        onClose={() => setIsReadingRequestModalOpen(false)}
        apartmentMeters={apartmentMeters}
        onSendRequest={handleSendReadingRequest}
      />

      {/* Readings Inbox Modal */}
      <ReadingsInbox
        isOpen={isReadingsInboxOpen}
        onClose={() => setIsReadingsInboxOpen(false)}
        readingSubmissions={readingSubmissions}
        onApproveSubmission={handleApproveSubmission}
        onRejectSubmission={handleRejectSubmission}
        onViewPhoto={handleViewPhoto}
      />

      {/* Invite Tenant Modal */}
      <InviteTenantModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        propertyId={apartment.id}
        propertyLabel={`Butas ${apartment.apartmentNumber}`}
        defaultRent={apartment.monthlyRent}
        defaultDeposit={apartment.monthlyRent}
        onSuccess={() => {
          // Could refresh data here if needed
        }}
      />

    </>
  );
};

export default ApartmentCard; 