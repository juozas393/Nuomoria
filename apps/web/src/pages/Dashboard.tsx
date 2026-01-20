import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import {
  Cog6ToothIcon,
  BellIcon,
  UserIcon,
  BuildingOfficeIcon,
  CurrencyEuroIcon,
  ChartBarIcon,
  SparklesIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CogIcon,
  UsersIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
// Removed HeroSection and BackgroundImageSelector as they were deleted
import SkeletonCard from '../components/ui/SkeletonCard';
import { BACKGROUND_IMAGES } from '../utils/constants';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { formatNumberSafe, formatCurrencySafe } from '../utils/format';
import { AnimatedElement } from '../components/ui/AnimatedElement';

// Lazy loaded components - Removed for deleted components

interface DashboardData {
  overview: {
    totalProperties: number;
    occupiedProperties: number;
    vacantProperties: number;
    totalRevenue: number;
    monthlyGrowth: number;
    occupancyRate: number;
    averageRent: number;
  };
  recentActivity: {
    id: string;
    type: 'invoice' | 'maintenance' | 'tenant' | 'property';
    title: string;
    description: string;
    property: string;
    time: string;
    status: 'success' | 'warning' | 'error' | 'info';
  }[];
  upcomingTasks: {
    id: string;
    title: string;
    type: 'maintenance' | 'inspection' | 'payment' | 'meeting';
    property: string;
    tenant: string;
    dueDate: Date;
    priority: 'low' | 'medium' | 'high' | 'urgent';
  }[];
  financialSummary: {
    monthlyRevenue: number;
    pendingPayments: number;
    overdueInvoices: number;
    maintenanceCosts: number;
    revenueGrowth: number;
  };
  propertyStatus: {
    property: string;
    status: 'occupied' | 'vacant' | 'maintenance';
    tenant: string;
    rent: number;
    lastPayment: Date;
  }[];
  achievements: {
    id: string;
    title: string;
    description: string;
    icon: string;
    progress: number;
    maxProgress: number;
  }[];
}

const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showImageSelector, setShowImageSelector] = useState(false);
  const [properties, setProperties] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Use localStorage for background image persistence
  const [currentBackgroundImage, setCurrentBackgroundImage] = useLocalStorage<string>(
    'dashboardBackgroundImage',
    BACKGROUND_IMAGES.modernBuilding
  );

  // Memoized data processing
  const processedData = useMemo(() => {
    if (!properties.length || !tenants.length) return null;

    const totalProperties = properties.length;
    const occupiedProperties = properties.filter(p => p.status === 'occupied').length;
    const vacantProperties = totalProperties - occupiedProperties;
    const totalRevenue = properties.reduce((sum, p) => sum + (p.rent || 0), 0);
    const occupancyRate = totalProperties > 0 ? (occupiedProperties / totalProperties) * 100 : 0;
    const averageRent = totalProperties > 0 ? totalRevenue / totalProperties : 0;

    return {
      overview: {
        totalProperties,
        occupiedProperties,
        vacantProperties,
        totalRevenue,
        monthlyGrowth: 12.5, // Mock data
        occupancyRate,
        averageRent
      },
      recentActivity: [
        {
          id: '1',
          type: 'invoice' as const,
          title: 'Payment received',
          description: 'Vokiečių 117 - 850€ payment successfully received',
          property: 'Vokiečių 117',
          time: '2 min ago',
          status: 'success' as const
        },
        {
          id: '2',
          type: 'maintenance' as const,
          title: 'Maintenance request',
          description: 'Plumbing issues require attention',
          property: 'Vokiečių 117',
          time: '15 min ago',
          status: 'warning' as const
        },
        {
          id: '3',
          type: 'tenant' as const,
          title: 'New tenant',
          description: 'Jonas Jonaitis - lease agreement signed',
          property: 'Vokiečių 117',
          time: '1 hour ago',
          status: 'info' as const
        }
      ],
      upcomingTasks: [
        {
          id: '1',
          title: 'Property inspection',
          type: 'inspection' as const,
          property: 'Vokiečių 117',
          tenant: 'Jonas Jonaitis',
          dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          priority: 'high' as const
        },
        {
          id: '2',
          title: 'Rent collection',
          type: 'payment' as const,
          property: 'Vokiečių 117',
          tenant: 'Jonas Jonaitis',
          dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          priority: 'medium' as const
        }
      ],
      financialSummary: {
        monthlyRevenue: 8500,
        pendingPayments: 2500,
        overdueInvoices: 500,
        maintenanceCosts: 1200,
        revenueGrowth: 8.5
      },
      propertyStatus: properties.map(p => ({
        property: p.address,
        status: p.status as 'occupied' | 'vacant' | 'maintenance',
        tenant: p.tenant || 'Vacant',
        rent: p.rent || 0,
        lastPayment: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
      })),
      achievements: [
        {
          id: '1',
          title: '100% Occupancy',
          description: 'All properties are occupied',
          icon: '🏠',
          progress: 100,
          maxProgress: 100
        },
        {
          id: '2',
          title: 'On-time Payments',
          description: '90% of payments received on time',
          icon: '💰',
          progress: 90,
          maxProgress: 100
        }
      ]
    };
  }, [properties, tenants]);

  // Load data
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        // Simplified data loading - removed API calls
        setProperties([]);
        setTenants([]);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  // Update data when processed data changes
  useEffect(() => {
    if (processedData) {
      setData(processedData);
    }
  }, [processedData]);

  // Loading skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <SkeletonCard className="h-32" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <SkeletonCard key={i} className="h-24" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SkeletonCard className="h-64" />
            <SkeletonCard className="h-64" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section with B&W Background */}
      <div
        className="relative h-64 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url('/images/ProfileBackground_bw.png')` }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-40" />
        <div className="relative h-full flex items-center justify-center">
          <div className="text-center text-white">
            <h1 className="text-4xl font-bold mb-4">Turto valdymo dashboard</h1>
            <p className="text-xl">Valdykite savo nuosavybę efektyviai</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-10">
        <div className="space-y-6">
          {/* Overview Section - Removed for deleted components */}
          <div className="bg-white rounded-lg shadow-sm p-6 gaming-form-bg" style={{ backgroundImage: "url('/images/FormsBackground.png')" }}>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Apžvalga</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-600">{formatNumberSafe(data?.overview.totalProperties, 'Nėra')}</div>
                <div className="text-sm text-gray-600">Iš viso butų</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-600">{formatNumberSafe(data?.overview.occupiedProperties, 'Nėra')}</div>
                <div className="text-sm text-gray-600">Užimti</div>
              </div>
              <div className="bg-orange-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-orange-600">{formatNumberSafe(data?.overview.vacantProperties, 'Nėra')}</div>
                <div className="text-sm text-gray-600">Laisvi</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-purple-600">€{formatNumberSafe(data?.overview.totalRevenue, 'N/A')}</div>
                <div className="text-sm text-gray-600">Mėnesinė nuoma</div>
              </div>
            </div>
          </div>

          {/* Quick Actions - Removed for deleted components */}
          <div className="bg-white rounded-lg shadow-sm p-6 gaming-form-bg" style={{ backgroundImage: "url('/images/FormsBackground.png')" }}>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Greiti veiksmai</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button className="bg-blue-600 text-white rounded-lg p-4 hover:bg-blue-700 transition-colors">
                <div className="text-sm font-medium">Pridėti butą</div>
              </button>
              <button className="bg-green-600 text-white rounded-lg p-4 hover:bg-green-700 transition-colors">
                <div className="text-sm font-medium">Naujas nuomininkas</div>
              </button>
              <button className="bg-orange-600 text-white rounded-lg p-4 hover:bg-orange-700 transition-colors">
                <div className="text-sm font-medium">Pranešimai</div>
              </button>
              <button className="bg-purple-600 text-white rounded-lg p-4 hover:bg-purple-700 transition-colors">
                <div className="text-sm font-medium">Ataskaitos</div>
              </button>
            </div>
          </div>

          {/* Analytics and Tasks Grid - Removed for deleted components */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-sm p-6 gaming-form-bg" style={{ backgroundImage: "url('/images/FormsBackground.png')" }}>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Finansai</h2>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Mėnesinės pajamos:</span>
                  <span className="font-semibold">€{formatNumberSafe(data?.financialSummary.monthlyRevenue, 'N/A')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Laukiančios sumos:</span>
                  <span className="font-semibold">€{formatNumberSafe(data?.financialSummary.pendingPayments, 'Nėra')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Vėluojančios sąskaitos:</span>
                  <span className="font-semibold">€{formatNumberSafe(data?.financialSummary.overdueInvoices, 'Nėra')}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 gaming-form-bg" style={{ backgroundImage: "url('/images/FormsBackground.png')" }}>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Užduotys</h2>
              <div className="space-y-3">
                {data?.upcomingTasks.slice(0, 3).map((task, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-sm">{task.title}</div>
                      <div className="text-xs text-gray-600">{task.property}</div>
                    </div>
                    <div className="text-xs text-gray-500">{task.dueDate.toLocaleDateString('lt-LT')}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Background Image Selector removed */}
    </div>
  );
};

export default Dashboard; 