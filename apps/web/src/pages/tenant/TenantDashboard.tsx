/* eslint-disable react/prop-types */
import React, { useState, useMemo, useCallback, Suspense } from 'react';
import { motion } from 'framer-motion';
import { 
  ExclamationCircleIcon, 
  InformationCircleIcon,
  ChartBarIcon,
  DocumentTextIcon, 
  CogIcon,
  BellIcon,
  UserIcon,
  HomeIcon,
  CalendarIcon,
  CurrencyEuroIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';


// Interfaces
interface TenantProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  propertyAddress: string;
  rentAmount: number;
  contractEndDate: string;
  status: 'active' | 'pending' | 'expired';
}

interface ContractAnalysis {
  contractType: string;
  monthlyRent: number;
  depositAmount: number;
  utilitiesIncluded: boolean;
  nextPaymentDate: string;
  daysUntilPayment: number;
}

interface SmartAction {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: 'payment' | 'maintenance' | 'document' | 'communication';
  isCompleted: boolean;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  timestamp: string;
  isRead: boolean;
}

interface Analytics {
  rentPaid: number;
  rentDue: number;
  maintenanceRequests: number;
  documentsUploaded: number;
  communicationCount: number;
}

interface PropertyInfo {
  address: string;
  type: string;
  size: number;
  rooms: number;
  amenities: string[];
}

interface KeyMetric {
    label: string;
  value: string | number;
  change: number;
  icon: React.ComponentType<any>;
}

interface NavigationTab {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  isActive: boolean;
}

// Error Boundary Component
class DashboardErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Security: Only log in development, never in production
    if (process.env.NODE_ENV === 'development') {
      console.error('Dashboard Error:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ExclamationCircleIcon className="w-8 h-8 text-gray-600" />
            </div>
            <h2 className="text-xl font-semibold text-black mb-2">
              Something went wrong
            </h2>
            <p className="text-gray-600 mb-4">
              Please try refreshing the page
            </p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary px-4 py-2 rounded-lg"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Memoized Components
// eslint-disable-next-line react/prop-types
const MetricCard = React.memo<{ metric: KeyMetric }>(({ metric }) => {
  const Icon = metric.icon;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-6 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{metric.label}</p>
          <p className="text-2xl font-bold text-black">{metric.value}</p>
        </div>
        <div className="p-2 bg-primary rounded-lg">
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
      <div className="mt-2 flex items-center">
        <span className={`text-sm font-medium ${
          metric.change >= 0 ? 'text-primary' : 'text-red-600'
        }`}>
          {metric.change >= 0 ? '+' : ''}{metric.change}%
        </span>
        <span className="text-sm text-gray-500 ml-2">vs last month</span>
      </div>
    </motion.div>
  );
});

MetricCard.displayName = 'MetricCard';

// eslint-disable-next-line react/prop-types
const ProfileCard = React.memo<{ profile: TenantProfile }>(({ profile }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="card p-6"
  >
    <div className="flex items-center space-x-4">
      <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
        <UserIcon className="w-6 h-6 text-white" />
      </div>
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-black">{profile.name}</h3>
        <p className="text-sm text-gray-600">{profile.email}</p>
        <p className="text-sm text-gray-600">{profile.phone}</p>
      </div>
      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
        profile.status === 'active' ? 'status-active' :
        profile.status === 'pending' ? 'status-warning' :
        'status-error'
      }`}>
        {profile.status}
      </div>
    </div>
    
    <div className="mt-4 space-y-2">
      <div className="flex items-center text-sm text-gray-600">
        <HomeIcon className="w-4 h-4 mr-2" />
        {profile.propertyAddress}
      </div>
      <div className="flex items-center text-sm text-gray-600">
        <CurrencyEuroIcon className="w-4 h-4 mr-2" />
        €{profile.rentAmount}/month
      </div>
      <div className="flex items-center text-sm text-gray-600">
        <CalendarIcon className="w-4 h-4 mr-2" />
        Contract ends: {profile.contractEndDate}
      </div>
    </div>
  </motion.div>
));

ProfileCard.displayName = 'ProfileCard';

// eslint-disable-next-line react/prop-types
const ContractAnalysisCard = React.memo<{ analysis: ContractAnalysis }>(({ analysis }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="card p-6"
  >
    <h3 className="text-lg font-semibold text-black mb-4">Contract Analysis</h3>
    
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-600">Contract Type</span>
        <span className="text-sm font-medium text-black">{analysis.contractType}</span>
      </div>
      
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-600">Monthly Rent</span>
        <span className="text-sm font-medium text-black">€{analysis.monthlyRent}</span>
      </div>
      
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-600">Deposit</span>
        <span className="text-sm font-medium text-black">€{analysis.depositAmount}</span>
      </div>
      
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-600">Utilities Included</span>
        <span className="text-sm font-medium text-black">
          {analysis.utilitiesIncluded ? 'Yes' : 'No'}
        </span>
      </div>
      
      <div className="border-t border-gray-200 pt-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Next Payment</span>
          <span className="text-sm font-medium text-black">{analysis.nextPaymentDate}</span>
        </div>
        <div className="flex justify-between items-center mt-1">
          <span className="text-sm text-gray-600">Days Until Payment</span>
          <span className={`text-sm font-medium ${
            analysis.daysUntilPayment <= 7 ? 'text-red-600' : 'text-black'
          }`}>
            {analysis.daysUntilPayment} days
          </span>
        </div>
      </div>
    </div>
  </motion.div>
));

ContractAnalysisCard.displayName = 'ContractAnalysisCard';

// eslint-disable-next-line react/prop-types
const SmartActionsCard = React.memo<{ actions: SmartAction[] }>(({ actions }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="card p-6"
  >
    <h3 className="text-lg font-semibold text-black mb-4">Smart Actions</h3>
    
    <div className="space-y-3">
      {actions.map((action) => (
        <div key={action.id} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
          <div className={`w-2 h-2 rounded-full ${
            action.priority === 'high' ? 'bg-red-500' :
            action.priority === 'medium' ? 'bg-yellow-500' :
            'bg-primary'
          }`} />
          
          <div className="flex-1">
            <h4 className="text-sm font-medium text-black">{action.title}</h4>
            <p className="text-xs text-gray-600">{action.description}</p>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className={`text-xs px-2 py-1 rounded-full ${
              action.category === 'payment' ? 'bg-primary text-white' :
              action.category === 'maintenance' ? 'bg-orange-100 text-orange-800' :
              action.category === 'document' ? 'bg-purple-100 text-purple-800' :
              'bg-primary-100 text-primary-800'
            }`}>
              {action.category}
            </span>
            
            {action.isCompleted ? (
              <CheckCircleIcon className="w-4 h-4 text-primary" />
            ) : (
              <XCircleIcon className="w-4 h-4 text-gray-400" />
            )}
          </div>
        </div>
      ))}
    </div>
  </motion.div>
));

SmartActionsCard.displayName = 'SmartActionsCard';

// eslint-disable-next-line react/prop-types
const NotificationsCard = React.memo<{ notifications: Notification[] }>(({ notifications }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="card p-6"
  >
    <h3 className="text-lg font-semibold text-black mb-4">Recent Notifications</h3>
    
    <div className="space-y-3">
      {notifications.map((notification) => (
        <div key={notification.id} className={`p-3 border border-gray-200 rounded-lg ${
          !notification.isRead ? 'bg-gray-50' : ''
        }`}>
          <div className="flex items-start space-x-3">
            <div className={`w-2 h-2 rounded-full mt-2 ${
              notification.type === 'info' ? 'bg-primary' :
              notification.type === 'warning' ? 'bg-yellow-500' :
              notification.type === 'success' ? 'bg-primary-500' :
              'bg-red-500'
            }`} />
            
            <div className="flex-1">
              <h4 className="text-sm font-medium text-black">{notification.title}</h4>
              <p className="text-xs text-gray-600 mt-1">{notification.message}</p>
              <p className="text-xs text-gray-500 mt-2">{notification.timestamp}</p>
            </div>
            
            {!notification.isRead && (
              <div className="w-2 h-2 bg-primary rounded-full" />
            )}
          </div>
        </div>
      ))}
    </div>
  </motion.div>
));

NotificationsCard.displayName = 'NotificationsCard';

// eslint-disable-next-line react/prop-types
const AnalyticsCard = React.memo<{ analytics: Analytics }>(({ analytics }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="card p-6"
  >
    <h3 className="text-lg font-semibold text-black mb-4">Analytics Overview</h3>
    
    <div className="grid grid-cols-2 gap-4">
      <div className="text-center p-4 border border-gray-200 rounded-lg">
        <p className="text-2xl font-bold text-black">€{analytics.rentPaid}</p>
        <p className="text-xs text-gray-600">Rent Paid</p>
      </div>
      
      <div className="text-center p-4 border border-gray-200 rounded-lg">
        <p className="text-2xl font-bold text-black">€{analytics.rentDue}</p>
        <p className="text-xs text-gray-600">Rent Due</p>
      </div>
      
      <div className="text-center p-4 border border-gray-200 rounded-lg">
        <p className="text-2xl font-bold text-black">{analytics.maintenanceRequests}</p>
        <p className="text-xs text-gray-600">Maintenance Requests</p>
      </div>
      
      <div className="text-center p-4 border border-gray-200 rounded-lg">
        <p className="text-2xl font-bold text-black">{analytics.documentsUploaded}</p>
        <p className="text-xs text-gray-600">Documents</p>
      </div>
    </div>
  </motion.div>
));

AnalyticsCard.displayName = 'AnalyticsCard';

// Main Dashboard Component
const TenantDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const { logout } = useAuth();

  // Memoized data
  const tenantProfile = useMemo<TenantProfile>(() => ({
    id: '1',
    name: 'John Smith',
    email: 'john.smith@email.com',
    phone: '+1 (555) 123-4567',
    propertyAddress: '123 Main Street, Apt 4B, New York, NY 10001',
    rentAmount: 2500,
    contractEndDate: 'December 31, 2024',
    status: 'active'
  }), []);

  const contractAnalysis = useMemo<ContractAnalysis>(() => ({
    contractType: 'Standard Lease',
    monthlyRent: 2500,
    depositAmount: 5000,
    utilitiesIncluded: true,
    nextPaymentDate: 'January 1, 2024',
    daysUntilPayment: 15
  }), []);

  const smartActions = useMemo<SmartAction[]>(() => [
    {
      id: '1',
      title: 'Pay January Rent',
      description: 'Due in 15 days',
      priority: 'high',
      category: 'payment',
      isCompleted: false
    },
    {
      id: '2',
      title: 'Upload Utility Bill',
      description: 'Required for reimbursement',
      priority: 'medium',
      category: 'document',
      isCompleted: false
    },
    {
      id: '3',
      title: 'Report Maintenance Issue',
      description: 'Kitchen sink leak',
      priority: 'medium',
      category: 'maintenance',
      isCompleted: true
    }
  ], []);

  const notifications = useMemo<Notification[]>(() => [
    {
      id: '1',
      title: 'Rent Payment Due',
      message: 'Your January rent payment is due in 15 days',
      type: 'warning',
      timestamp: '2 hours ago',
      isRead: false
    },
    {
      id: '2',
      title: 'Maintenance Completed',
      message: 'Your kitchen sink repair has been completed',
      type: 'success',
      timestamp: '1 day ago',
      isRead: true
    },
    {
      id: '3',
      title: 'Document Uploaded',
      message: 'Your utility bill has been successfully uploaded',
      type: 'info',
      timestamp: '3 days ago',
      isRead: true
    }
  ], []);

  const analytics = useMemo<Analytics>(() => ({
    rentPaid: 7500,
    rentDue: 2500,
    maintenanceRequests: 2,
    documentsUploaded: 5,
    communicationCount: 12
  }), []);

  const propertyInfo = useMemo<PropertyInfo>(() => ({
    address: '123 Main Street, Apt 4B',
    type: 'Apartment',
    size: 1200,
    rooms: 3,
    amenities: ['Parking', 'Gym', 'Pool', 'Laundry']
  }), []);

  const keyMetrics = useMemo<KeyMetric[]>(() => [
    {
      label: 'Monthly Rent',
      value: '€2,500',
      change: 0,
      icon: CurrencyEuroIcon
    },
    {
      label: 'Days Until Payment',
      value: '15',
      change: -5,
      icon: ClockIcon
    },
    {
      label: 'Maintenance Requests',
      value: '2',
      change: -50,
      icon: CogIcon
    },
    {
      label: 'Documents Uploaded',
      value: '5',
      change: 25,
      icon: DocumentTextIcon
    }
  ], []);

  const navigationTabs = useMemo<NavigationTab[]>(() => [
    {
      id: 'overview',
      label: 'Overview',
      icon: ChartBarIcon,
      isActive: activeTab === 'overview'
    },
    {
      id: 'payments',
      label: 'Payments',
      icon: CurrencyEuroIcon,
      isActive: activeTab === 'payments'
    },
    {
      id: 'maintenance',
      label: 'Maintenance',
      icon: CogIcon,
      isActive: activeTab === 'maintenance'
    },
    {
      id: 'documents',
      label: 'Documents',
      icon: DocumentTextIcon,
      isActive: activeTab === 'documents'
    }
  ], [activeTab]);

  // Callbacks
  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId);
  }, []);

  const handleAction = useCallback((actionId: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Action clicked:', actionId);
    }
  }, []);

  return (
    <DashboardErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <h1 className="text-xl font-semibold text-black">Tenant Dashboard</h1>
              </div>
              
              <div className="flex items-center space-x-4">
                <button 
                  onClick={logout}
                  className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                  title="Atsijungti"
                >
                  <ArrowRightOnRectangleIcon className="w-5 h-5" />
                  <span className="hidden sm:inline">Atsijungti</span>
                </button>
            </div>
            </div>
          </div>
        </header>

        {/* Navigation Tabs */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-8">
              {navigationTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                      tab.isActive
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 hover:text-primary hover:border-primary'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {keyMetrics.map((metric, index) => (
                  <MetricCard key={index} metric={metric} />
                ))}
              </div>

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column */}
                <div className="space-y-6">
                  <ProfileCard profile={tenantProfile} />
                  <ContractAnalysisCard analysis={contractAnalysis} />
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  <SmartActionsCard actions={smartActions} />
                  <NotificationsCard notifications={notifications} />
                </div>
              </div>

              {/* Analytics Section */}
              <AnalyticsCard analytics={analytics} />
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-black mb-4">Payments</h2>
              <p className="text-gray-600">Payment management interface will be implemented here.</p>
          </div>
          )}

          {activeTab === 'maintenance' && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-black mb-4">Maintenance</h2>
              <p className="text-gray-600">Maintenance request interface will be implemented here.</p>
                  </div>
          )}

          {activeTab === 'documents' && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-black mb-4">Documents</h2>
              <p className="text-gray-600">Document management interface will be implemented here.</p>
                    </div>
          )}
        </main>
      </div>
    </DashboardErrorBoundary>
  );
};

export default TenantDashboard; 