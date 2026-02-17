import React, { useState, useEffect } from 'react';
import {
  ChartBarIcon,
  CurrencyEuroIcon,
  BuildingOfficeIcon,
  UsersIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline';
import { formatCurrency, formatPercentage } from '../utils/format';

interface AnalyticsData {
  totalRevenue: number;
  totalProperties: number;
  occupancyRate: number;
  averageRent: number;
  monthlyGrowth: number;
  yearlyGrowth: number;
  revenueByMonth: { month: string; revenue: number }[];
  occupancyByProperty: { property: string; occupancy: number }[];
  topPerformingProperties: { property: string; revenue: number; occupancy: number }[];
}

const Analytics: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('year');

  useEffect(() => {
    const loadAnalytics = async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const mockData: AnalyticsData = {
        totalRevenue: 8450,
        totalProperties: 12,
        occupancyRate: 91.5,
        averageRent: 704,
        monthlyGrowth: 8.2,
        yearlyGrowth: 12.5,
        revenueByMonth: [
          { month: 'Sausis', revenue: 7200 },
          { month: 'Vasaris', revenue: 7350 },
          { month: 'Kovas', revenue: 7500 },
          { month: 'Balandis', revenue: 7650 },
          { month: 'Gegužė', revenue: 7800 },
          { month: 'Birželis', revenue: 7950 },
          { month: 'Liepa', revenue: 8100 },
          { month: 'Rugpjūtis', revenue: 8250 },
          { month: 'Rugsėjis', revenue: 8400 },
          { month: 'Spalis', revenue: 8550 },
          { month: 'Lapkritis', revenue: 8700 },
          { month: 'Gruodis', revenue: 8850 },
        ],
        occupancyByProperty: [
          { property: 'Vokiečių g. 117', occupancy: 100 },
          { property: 'Laisvės al. 45', occupancy: 100 },
          { property: 'Gedimino pr. 12', occupancy: 0 },
          { property: 'Vilniaus g. 89', occupancy: 100 },
          { property: 'Gedimino pr. 15', occupancy: 100 },
        ],
        topPerformingProperties: [
          { property: 'Laisvės al. 45', revenue: 650, occupancy: 100 },
          { property: 'Vokiečių g. 117', revenue: 511, occupancy: 100 },
          { property: 'Vilniaus g. 89', revenue: 580, occupancy: 100 },
          { property: 'Gedimino pr. 15', revenue: 520, occupancy: 100 },
        ]
      };

      setData(mockData);
      setLoading(false);
    };

    loadAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="card p-6">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Analitika
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Jūsų nekilnojamojo turto veiklos analizė
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
          >
            <option value="month">Mėnuo</option>
            <option value="quarter">Ketvirtis</option>
            <option value="year">Metai</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Bendros pajamos
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(data.totalRevenue)}
              </p>
            </div>
            <div className="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
              <CurrencyEuroIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
          </div>
          <div className="flex items-center mt-4">
            <ArrowUpIcon className="w-4 h-4 text-primary-600" />
            <span className="text-sm text-primary-600 ml-1">
              +2.1% nuo praėjusio mėn.
            </span>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Nuosavybių skaičius
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {data.totalProperties}
              </p>
            </div>
            <div className="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
              <BuildingOfficeIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
          </div>
          <div className="flex items-center mt-4">
            <ArrowUpIcon className="w-4 h-4 text-primary-600" />
            <span className="text-sm text-primary-600 ml-1">
              +2 per metus
            </span>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Užimtumo lygis
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatPercentage(data.occupancyRate)}
              </p>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <UsersIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="flex items-center mt-4">
            <ArrowUpIcon className="w-4 h-4 text-primary-600" />
            <span className="text-sm text-primary-600 ml-1">
              +2.1% nuo praėjusio mėn.
            </span>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Vidutinė nuoma
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(data.averageRent)}
              </p>
            </div>
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <ArrowTrendingUpIcon className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
          <div className="flex items-center mt-4">
            <ArrowDownIcon className="w-4 h-4 text-red-600" />
            <span className="text-sm text-red-600 ml-1">
              -3.2% nuo praėjusio mėn.
            </span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Pajamų tendencija
          </h3>
          <div className="space-y-3">
            {data.revenueByMonth.slice(-6).map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {item.month}
                </span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-primary-500 h-2 rounded-full"
                      style={{ width: `${(item.revenue / 9000) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatCurrency(item.revenue)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Occupancy Chart */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Užimtumas pagal objektus
          </h3>
          <div className="space-y-3">
            {data.occupancyByProperty.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-32">
                  {item.property}
                </span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${item.occupancy === 100 ? 'bg-green-500' : 'bg-red-500'
                        }`}
                      style={{ width: `${item.occupancy}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {item.occupancy}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Performing Properties */}
      <div className="card p-6 gaming-form-bg" style={{ backgroundImage: "url('/images/CardsBackground.webp')" }}>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Geriausiai veikiantys objektai
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                  Objektas
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                  Pajamos
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                  Užimtumas
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                  Statusas
                </th>
              </tr>
            </thead>
            <tbody>
              {data.topPerformingProperties.map((property, index) => (
                <tr key={index} className="border-b border-gray-200 dark:border-gray-700">
                  <td className="py-3 px-4">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {property.property}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-gray-900 dark:text-white">
                      {formatCurrency(property.revenue)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-gray-900 dark:text-white">
                      {property.occupancy}%
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                      Aktyvus
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Analytics; 