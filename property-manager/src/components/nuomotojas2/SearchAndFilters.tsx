import React, { memo } from 'react';
import { 
  MagnifyingGlassIcon, 
  FunnelIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';

interface Tenant {
  id: string;
  name: string;
  phone: string;
  email: string;
  apartmentNumber: string;
  address: string;
  status: 'active' | 'expired' | 'pending';
  contractStart: string;
  contractEnd: string;
  monthlyRent: number;
  deposit: number;
  notification_count?: number;
  cleaning_required?: boolean;
  cleaning_cost?: number;
  last_notification_sent?: string;
  tenant_response?: 'wants_to_renew' | 'does_not_want_to_renew' | null;
  tenant_response_date?: string;
  planned_move_out_date?: string;
  payment_status?: 'paid' | 'unpaid' | 'overdue';
  meters_submitted?: boolean;
  last_payment_date?: string;
  outstanding_amount?: number;
  area?: number;
  rooms?: number;
  photos?: string[];
  auto_renewal_enabled?: boolean;
}

interface SearchAndFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  sortBy: 'name' | 'date' | 'status' | 'payment' | 'area' | 'rooms';
  setSortBy: (sort: 'name' | 'date' | 'status' | 'payment' | 'area' | 'rooms') => void;
  activeFilter: 'all' | 'problems' | 'unpaid' | 'unsubmitted' | 'cleaning' | 'expired' | 'active' | 'movingOut';
  setActiveFilter: (filter: 'all' | 'problems' | 'unpaid' | 'unsubmitted' | 'cleaning' | 'expired' | 'active' | 'movingOut') => void;
  tenants: Tenant[];
  stats: any;
}

const SearchAndFilters: React.FC<SearchAndFiltersProps> = memo(({ 
  searchTerm, 
  setSearchTerm, 
  sortBy, 
  setSortBy, 
  activeFilter, 
  setActiveFilter, 
  tenants, 
  stats 
}) => {
  const [showAdvancedFilters, setShowAdvancedFilters] = React.useState(false);

  const handleEscapeKey = React.useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      setShowAdvancedFilters(false);
    }
  }, []);

  React.useEffect(() => {
    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [handleEscapeKey]);

  const sortOptions = [
    { value: 'name', label: 'Pagal vardą' },
    { value: 'date', label: 'Pagal datą' },
    { value: 'status', label: 'Pagal statusą' },
    { value: 'payment', label: 'Pagal mokėjimą' },
    { value: 'area', label: 'Pagal plotą' },
    { value: 'rooms', label: 'Pagal kambarius' }
  ];

  return (
    <div className="bg-gradient-to-r from-white to-gray-50 rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        {/* Search Section */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Ieškoti nuomininkų..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#2f8481] focus:border-transparent transition-colors"
            />
          </div>
        </div>

        {/* Filters Section */}
        <div className="flex items-center space-x-4">
          {/* Sort Dropdown */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'date' | 'status' | 'payment' | 'area' | 'rooms')}
              className="appearance-none bg-white border border-gray-300 rounded-xl px-4 py-3 pr-10 focus:ring-2 focus:ring-[#2f8481] focus:border-transparent transition-colors"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Advanced Filters Button */}
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`group flex items-center space-x-2 px-4 py-3 rounded-xl border transition-all duration-500 hover:scale-105 hover:-translate-y-1 ${
              showAdvancedFilters
                ? 'bg-gradient-to-r from-[#2f8481] to-[#297a77] text-white border-[#2f8481] shadow-lg'
                : 'bg-white text-gray-700 border-gray-300 hover:border-[#2f8481] hover:text-[#2f8481] hover:shadow-md hover:bg-gradient-to-r hover:from-white hover:to-gray-50'
            }`}
          >
            <AdjustmentsHorizontalIcon className="h-5 w-5 group-hover:scale-110 transition-transform duration-500" />
            <span className="hidden sm:inline">Filtrai</span>
          </button>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showAdvancedFilters && (
        <div className="mt-6 p-4 bg-white rounded-xl border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Filter by Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Statusas</label>
              <select
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value as 'all' | 'problems' | 'unpaid' | 'unsubmitted' | 'cleaning' | 'expired' | 'active' | 'movingOut')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#2f8481] focus:border-transparent"
              >
                <option value="all">Visi</option>
                <option value="problems">Problemos</option>
                <option value="unpaid">Neapmokėtos</option>
                <option value="unsubmitted">Nepateikti skaitliukai</option>
                <option value="cleaning">Reikia valymo</option>
                <option value="expired">Baigėsi sutartys</option>
                <option value="active">Aktyvios</option>
                <option value="movingOut">Išsikraustantys</option>
              </select>
            </div>

            {/* Filter by Payment Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mokėjimo statusas</label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#2f8481] focus:border-transparent">
                <option value="">Visi</option>
                <option value="paid">Apmokėta</option>
                <option value="unpaid">Neapmokėta</option>
                <option value="overdue">Vėluoja</option>
              </select>
            </div>

            {/* Filter by Contract Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sutarties statusas</label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#2f8481] focus:border-transparent">
                <option value="">Visi</option>
                <option value="active">Aktyvi</option>
                <option value="expired">Baigėsi</option>
                <option value="pending">Laukia</option>
              </select>
            </div>

            {/* Filter by Area */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Plotas</label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#2f8481] focus:border-transparent">
                <option value="">Visi</option>
                <option value="small">Mažas (&lt;50m²)</option>
                <option value="medium">Vidutinis (50-80m²)</option>
                <option value="large">Didelis (&gt;80m²)</option>
              </select>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-[#2f8481]">{stats.total}</div>
                <div className="text-gray-600">Iš viso</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-500">{stats.problems}</div>
                <div className="text-gray-600">Problemos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">{stats.active}</div>
                <div className="text-gray-600">Aktyvios</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-500">{stats.unpaid}</div>
                <div className="text-gray-600">Neapmokėtos</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

SearchAndFilters.displayName = 'SearchAndFilters';

export default SearchAndFilters; 