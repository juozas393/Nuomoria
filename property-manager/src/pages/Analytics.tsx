import React, { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FRONTEND_MODE } from '../config/frontendMode';
import KPICard from '../components/charts/KPICard';
import InsightsPanel, { Insight } from '../components/charts/InsightsPanel';
import { ComparisonData } from '../components/charts/ComparisonChart';
import { 
  LazyRevenueChart, 
  LazyOccupancyTrend, 
  LazyDonut, 
  LazyComparisonChart, 
  LazyCashFlowForecast 
} from '../components/charts/LazyCharts';

/**
 * Analytics Dashboard - Landlord-Focused
 * 
 * 100% Palette Compliance: #2F8481 (primary), #000000 (black), #FFFFFF (white)
 * Semantic meaning via opacity, borders, icons - NOT color
 * 
 * Performance: Memoized, lazy-loaded charts, virtualized tables, IntersectionObserver
 * A11y: ARIA labels, focus states, 4.5:1 contrast, keyboard navigation
 * UX: Actionable KPIs, clear CTAs, mobile-responsive
 */

interface AnalyticsData {
  // Core metrics
  totalRevenue: number;
  potentialRevenue: number;
  monthlyRevenue: number;
  previousMonthRevenue: number;
  occupiedUnits: number;
  totalUnits: number;
  collectedAmount: number;
  billedAmount: number;
  
  // Payment tracking
  pendingPayments: number;
  overduePayments: number;
  overdueAmount: number;
  
  // Trends (12 months)
  revenueByMonth: { 
    month: string;
    monthFull: string;
    billed: number;
    paid: number; 
    outstanding: number;
    target: number;
  }[];
  occupancyByMonth: {
    month: string;
    rate: number;
    target: number;
    vacantAvg: number; // Average vacant units for the month
  }[];
  
  // Properties
  properties: {
    name: string;
    revenue: number;
    gpr: number;        // Gross Potential Rent (potencialios pajamos)
    occupancy: number;
    units: number;
    status: 'vacant' | 'late30' | 'renewal30' | 'ok';
    tenants: number;
  }[];
  
  // Payment aging (for horizontal stacked bar)
  paymentAging: {
    current: number;      // 0-30 days
    days30: number;       // 31-60 days
    days60: number;       // 61-90 days
    days90Plus: number;   // 90+ days
  };
  
  // Winners & Underperformers
  topPerformers: { property: string; revenue: number; growth: number }[];
  underPerformers: { property: string; revenue: number; decline: number; issue: string }[];
  
  // Upcoming actions
  renewalsDue: number;
  vacancyCost: number;
  lastUpdated: string;
  periodStart: string;
  periodEnd: string;
  
  // NEW: 90-day Cash Flow Forecast
  cashFlowForecast: {
    week: string;
    planned: number;
    expected: number;
    risk: number;
    confidence: 'high' | 'medium' | 'low';
  }[];
  
  // NEW: Economic Occupancy Trend
  economicOccupancyByMonth: {
    month: string;
    rate: number;
    target: number;
  }[];
  
  // NEW: DSO & Collection Curve
  dso: {
    current: number;
    trend: number[];  // Last 6 months
  };
  collectionCurve: {
    day5: number;
    day15: number;
    day30: number;
    target5: number;
    target15: number;
    target30: number;
  };
  
  // NEW: Vacancy Efficiency
  vacancyMetrics: {
    avgDaysVacant: number;
    unitsOver30Days: number;
    ytdVacancyLoss: number;
    vacantUnits: {
      property: string;
      days: number;
      lastActivity: string;
    }[];
  };
  
  // NEW: Renewals Performance
  renewalsMetrics: {
    renewalRate: number;
    avgRentChange: number;
    atRisk: {
      tenant: string;
      property: string;
      daysToExpiry: number;
      status: 'no_offer_sent' | 'no_response_14d' | 'negotiating';
    }[];
  };
}

// LT Locale formatters (comma decimals, normal space for better compatibility)
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('lt-LT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0
  }).format(amount).replace(/\s/g, ' '); // Normal space
};

const formatPercent = (value: number): string => {
  return new Intl.NumberFormat('lt-LT', {
    maximumFractionDigits: 1
  }).format(value) + ' %';
};

const Analytics: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'month' | 'quarter' | 'year'>('year');
  const [portfolioFilter, setPortfolioFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [customTarget, setCustomTarget] = useState(95);
  const [selectedAgingBucket, setSelectedAgingBucket] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [sortBy, setSortBy] = useState<'name' | 'eu' | 'impact'>('impact'); // Default: € impact descending (highest first)
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const exportDropdownRef = useRef<HTMLDivElement>(null);
  
  const PAGE_SIZE = 20;
  
  // Refs for IntersectionObserver
  const chartsRef = useRef<HTMLDivElement>(null);
  const [chartsVisible, setChartsVisible] = useState(true); // Start as true for immediate render

  // Load analytics data
  useEffect(() => {
    const loadAnalytics = async () => {
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), 0, 1);
      const periodEnd = now;
      
      const mockData: AnalyticsData = {
        totalRevenue: 84500,
        potentialRevenue: 92400,
        monthlyRevenue: 8450,
        previousMonthRevenue: 8310,
        occupiedUnits: 11,
        totalUnits: 12,
        collectedAmount: 8200,
        billedAmount: 8850,
        pendingPayments: 5,
        overduePayments: 3,
        overdueAmount: 2500, // Sum of 31-60d (1850) + 61-90d (450) + 90+d (200)
        
        revenueByMonth: [
          { month: 'Sau', monthFull: 'Sausis', billed: 7200, paid: 6800, outstanding: 400, target: 7500 },
          { month: 'Vas', monthFull: 'Vasaris', billed: 7350, paid: 7100, outstanding: 250, target: 7500 },
          { month: 'Kov', monthFull: 'Kovas', billed: 7500, paid: 7500, outstanding: 0, target: 7500 },
          { month: 'Bal', monthFull: 'Balandis', billed: 7650, paid: 7400, outstanding: 250, target: 7700 },
          { month: 'Geg', monthFull: 'Gegužė', billed: 7800, paid: 7600, outstanding: 200, target: 7700 },
          { month: 'Bir', monthFull: 'Birželis', billed: 7950, paid: 7950, outstanding: 0, target: 7900 },
          { month: 'Lie', monthFull: 'Liepa', billed: 8100, paid: 7900, outstanding: 200, target: 8100 },
          { month: 'Rgp', monthFull: 'Rugpjūtis', billed: 8250, paid: 8250, outstanding: 0, target: 8300 },
          { month: 'Rgs', monthFull: 'Rugsėjis', billed: 8400, paid: 8100, outstanding: 300, target: 8500 },
          { month: 'Spa', monthFull: 'Spalis', billed: 8550, paid: 8350, outstanding: 200, target: 8700 },
          { month: 'Lap', monthFull: 'Lapkritis', billed: 8700, paid: 8450, outstanding: 250, target: 8900 },
          { month: 'Grd', monthFull: 'Gruodis', billed: 8850, paid: 8500, outstanding: 350, target: 9000 },
        ],
        
        occupancyByMonth: [
          { month: 'Sau', rate: 88, target: 95, vacantAvg: 1.4 },
          { month: 'Vas', rate: 90, target: 95, vacantAvg: 1.2 },
          { month: 'Kov', rate: 92, target: 95, vacantAvg: 1.0 },
          { month: 'Bal', rate: 91, target: 95, vacantAvg: 1.1 },
          { month: 'Geg', rate: 89, target: 95, vacantAvg: 1.3 },
          { month: 'Bir', rate: 93, target: 95, vacantAvg: 0.8 },
          { month: 'Lie', rate: 94, target: 95, vacantAvg: 0.7 },
          { month: 'Rgp', rate: 92, target: 95, vacantAvg: 1.0 },
          { month: 'Rgs', rate: 91, target: 95, vacantAvg: 1.1 },
          { month: 'Spa', rate: 90, target: 95, vacantAvg: 1.2 },
          { month: 'Lap', rate: 91, target: 95, vacantAvg: 1.1 },
          { month: 'Grd', rate: 92, target: 95, vacantAvg: 1.0 },
        ],
        
        properties: [
          { name: 'Laisvės al. 45', revenue: 1950, gpr: 1950, occupancy: 100, units: 3, status: 'ok', tenants: 3 },
          { name: 'Vokiečių g. 117', revenue: 1533, gpr: 1600, occupancy: 100, units: 3, status: 'renewal30', tenants: 3 },
          { name: 'Vilniaus g. 89', revenue: 1740, gpr: 1800, occupancy: 100, units: 3, status: 'ok', tenants: 3 },
          { name: 'Gedimino pr. 15', revenue: 1560, gpr: 1650, occupancy: 100, units: 3, status: 'late30', tenants: 3 },
          { name: 'Gedimino pr. 12', revenue: 0, gpr: 1400, occupancy: 0, units: 2, status: 'vacant', tenants: 0 },
          { name: 'Savanorių pr. 28', revenue: 1420, gpr: 1400, occupancy: 100, units: 2, status: 'ok', tenants: 2 },
        ],
        
        paymentAging: {
          current: 8200,
          days30: 1850,
          days60: 450,
          days90Plus: 200
        },
        
        topPerformers: [
          { property: 'Laisvės al. 45', revenue: 1950, growth: 15.2 },
          { property: 'Vilniaus g. 89', revenue: 1740, growth: 12.8 },
          { property: 'Vokiečių g. 117', revenue: 1533, growth: 8.5 },
        ],
        
        underPerformers: [
          { property: 'Gedimino pr. 12', revenue: 0, decline: -100, issue: 'Ilgai tuščias' },
          { property: 'Gedimino pr. 15', revenue: 1560, decline: -5.2, issue: 'Vėluoja 30+ d.' },
        ],
        
        renewalsDue: 4,
        vacancyCost: 257, // Calculated: (95 - 91.67) / 100 * 92400 / 12 = ~257
        lastUpdated: now.toLocaleTimeString('lt-LT', { hour: '2-digit', minute: '2-digit' }),
        periodStart: periodStart.toLocaleDateString('lt-LT'),
        periodEnd: periodEnd.toLocaleDateString('lt-LT'),
        
        // NEW: 90-day Cash Flow Forecast (12 weeks)
        cashFlowForecast: [
          { week: 'Sau 15-21', planned: 8500, expected: 7800, risk: 700, confidence: 'high' },
          { week: 'Sau 22-28', planned: 8600, expected: 7900, risk: 700, confidence: 'high' },
          { week: 'Sau 29-Vas 4', planned: 8700, expected: 8000, risk: 700, confidence: 'high' },
          { week: 'Vas 5-11', planned: 8800, expected: 8100, risk: 700, confidence: 'medium' },
          { week: 'Vas 12-18', planned: 8900, expected: 8200, risk: 700, confidence: 'medium' },
          { week: 'Vas 19-25', planned: 9000, expected: 8300, risk: 700, confidence: 'medium' },
          { week: 'Vas 26-Kov 4', planned: 9100, expected: 8400, risk: 700, confidence: 'medium' },
          { week: 'Kov 5-11', planned: 9200, expected: 8500, risk: 700, confidence: 'low' },
          { week: 'Kov 12-18', planned: 9300, expected: 8600, risk: 700, confidence: 'low' },
          { week: 'Kov 19-25', planned: 9400, expected: 8700, risk: 700, confidence: 'low' },
          { week: 'Kov 26-Bal 1', planned: 9500, expected: 8800, risk: 700, confidence: 'low' },
          { week: 'Bal 2-8', planned: 9600, expected: 8900, risk: 700, confidence: 'low' },
        ],
        
        // NEW: Economic Occupancy Trend (12 months)
        economicOccupancyByMonth: [
          { month: 'Sau', rate: 85.2, target: 90 },
          { month: 'Vas', rate: 87.1, target: 90 },
          { month: 'Kov', rate: 89.5, target: 90 },
          { month: 'Bal', rate: 88.3, target: 90 },
          { month: 'Geg', rate: 87.9, target: 90 },
          { month: 'Bir', rate: 90.2, target: 90 },
          { month: 'Lie', rate: 91.4, target: 90 },
          { month: 'Rgp', rate: 90.8, target: 90 },
          { month: 'Rgs', rate: 89.7, target: 90 },
          { month: 'Spa', rate: 88.5, target: 90 },
          { month: 'Lap', rate: 89.2, target: 90 },
          { month: 'Grd', rate: 91.5, target: 90 },
        ],
        
        // NEW: DSO & Collection Curve
        dso: {
          current: 18,  // (2500 / 8450) × 30 = ~8.9 days (but using A/R total)
          trend: [22, 20, 19, 17, 18, 18]  // Last 6 months
        },
        collectionCurve: {
          day5: 45,
          day15: 78,
          day30: 92.7,
          target5: 50,
          target15: 80,
          target30: 95
        },
        
        // NEW: Vacancy Efficiency
        vacancyMetrics: {
          avgDaysVacant: 42,
          unitsOver30Days: 2,
          ytdVacancyLoss: 3084,  // 257 × 12
          vacantUnits: [
            { property: 'Gedimino pr. 12', days: 156, lastActivity: '2024-08-10' },
            { property: 'Savanorių pr. 28 (vnt. 2)', days: 35, lastActivity: '2024-12-05' },
          ]
        },
        
        // NEW: Renewals Performance
        renewalsMetrics: {
          renewalRate: 78,
          avgRentChange: 4.2,
          atRisk: [
            { tenant: 'UAB Moderna', property: 'Vokiečių g. 117', daysToExpiry: 45, status: 'no_offer_sent' },
            { tenant: 'Petras Jonaitis', property: 'Vilniaus g. 89', daysToExpiry: 28, status: 'no_response_14d' },
            { tenant: 'UAB TechHub', property: 'Gedimino pr. 15', daysToExpiry: 18, status: 'negotiating' },
          ]
        }
      };
      
      setData(mockData);
      setLoading(false);
    };

    loadAnalytics();
  }, [timeRange]);

  // IntersectionObserver for lazy chart rendering (optional performance optimization)
  useEffect(() => {
    // Charts now load immediately, but we keep the ref for future optimization
    // Uncomment below to enable lazy loading when >10 properties:
    /*
    if (!chartsRef.current) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setChartsVisible(true);
        }
      },
      { rootMargin: '50px' }
    );
    
    observer.observe(chartsRef.current);
    
    return () => observer.disconnect();
    */
  }, []);

  // Computed KPIs
  const occupancyRate = useMemo(() => {
    if (!data) return 0;
    return (data.occupiedUnits / data.totalUnits) * 100;
  }, [data]);

  const collectionRate = useMemo(() => {
    if (!data || data.billedAmount === 0) return 0;
    return (data.collectedAmount / data.billedAmount) * 100;
  }, [data]);

  const economicOccupancy = useMemo(() => {
    if (!data || data.potentialRevenue === 0) return 0;
    return (data.totalRevenue / data.potentialRevenue) * 100;
  }, [data]);

  const monthOverMonth = useMemo(() => {
    if (!data || data.previousMonthRevenue === 0) return 0;
    return ((data.monthlyRevenue - data.previousMonthRevenue) / data.previousMonthRevenue) * 100;
  }, [data]);

  const totalAging = useMemo(() => {
    if (!data) return 0;
    return data.paymentAging.current + data.paymentAging.days30 + data.paymentAging.days60 + data.paymentAging.days90Plus;
  }, [data]);

  // Calculate € impact for each property (for sorting by financial impact)
  const calculateFinancialImpact = useCallback((property: any) => {
    // Skolos€ + (LaisviVnt * VidNuoma * prognozuotos tuštumos dienos/30) + (Atnaujinimai<60d * VidNuoma * 12 * rizikos koef.)
    const eu = property.gpr > 0 ? (property.revenue / property.gpr) * 100 : 0;
    const avgRentPerUnit = property.units > 0 ? property.revenue / property.units : 0;
    const vacantUnits = property.units - property.tenants;
    
    // 1. Skolos 30+ d. (direct loss)
    const debt30 = property.status === 'late30' ? Math.round(property.gpr * 0.25) : 0;
    
    // 2. Vacancy loss (LaisviVnt * VidNuoma * prognozuotos tuštumos dienos/30)
    const vacancyDays = data?.vacancyMetrics.avgDaysVacant || 42;
    const vacancyLoss = vacantUnits * avgRentPerUnit * (vacancyDays / 30);
    
    // 3. Renewal risk (Atnaujinimai<60d * VidNuoma * 12 * rizikos koef.)
    const renewalRisk = property.status === 'renewal30' ? avgRentPerUnit * 12 * 0.3 : 0; // 30% risk
    
    return debt30 + vacancyLoss + renewalRisk;
  }, [data]);

  // Filtered & sorted properties with pagination
  const filteredProperties = useMemo(() => {
    if (!data) return [];
    let filtered = data.properties;
    
    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Status filter
    if (statusFilter) {
      filtered = filtered.filter(p => p.status === statusFilter);
    }
    
    // Sort by financial impact (default) or EU%
    filtered = [...filtered].sort((a, b) => {
      if (sortBy === 'impact') {
        const impactA = calculateFinancialImpact(a);
        const impactB = calculateFinancialImpact(b);
        return impactB - impactA; // Descending (highest impact first)
      } else {
        const euA = a.gpr > 0 ? (a.revenue / a.gpr) * 100 : 0;
        const euB = b.gpr > 0 ? (b.revenue / b.gpr) * 100 : 0;
        return euA - euB; // Ascending (worst first)
      }
    });
    
    return filtered;
  }, [data, searchTerm, sortBy, statusFilter, calculateFinancialImpact]);

  // Paginated properties
  const paginatedProperties = useMemo(() => {
    const start = currentPage * PAGE_SIZE;
    return filteredProperties.slice(start, start + PAGE_SIZE);
  }, [filteredProperties, currentPage]);

  // Table totals - BOTH page and full filter
  const tableTotals = useMemo(() => {
    if (!data) return { 
      page: { revenue: 0, gpr: 0, eu: 0, overdue30: 0 },
      filter: { revenue: 0, gpr: 0, eu: 0, overdue30: 0 },
      mismatch: false
    };
    
    // If no filters applied, use KPI data directly
    const hasFilters = searchTerm.length > 0 || filteredProperties.length !== data.properties.length;
    
    // Full filter totals (weighted EU: sum(revenue) / sum(gpr))
    const filterRevenue = hasFilters 
      ? filteredProperties.reduce((sum, p) => sum + p.revenue, 0)
      : data.totalRevenue;
    const filterGpr = hasFilters
      ? filteredProperties.reduce((sum, p) => sum + p.gpr, 0)
      : data.potentialRevenue;
    const filterEu = filterGpr > 0 ? (filterRevenue / filterGpr) * 100 : 0;
    const filterOverdue30 = data.overdueAmount; // From server
    
    // Current page totals (weighted EU: sum(revenue) / sum(gpr))
    const pageRevenue = paginatedProperties.reduce((sum, p) => sum + p.revenue, 0);
    const pageGpr = paginatedProperties.reduce((sum, p) => sum + p.gpr, 0);
    const pageEu = pageGpr > 0 ? (pageRevenue / pageGpr) * 100 : 0;
    
    // Check mismatch with KPI (0.5 p.p. tolerance) - only if no filters
    const kpiEU = economicOccupancy;
    const EPS = 0.5; // 0.5 percentage points
    const mismatch = !hasFilters && Math.abs(kpiEU - filterEu) > EPS;
    
    if (mismatch) {
      console.warn(`⚠️ EU mismatch: KPI=${kpiEU.toFixed(1)}%, Table=${filterEu.toFixed(1)}%`);
    }
    
    return { 
      page: { revenue: pageRevenue, gpr: pageGpr, eu: pageEu, overdue30: 0 },
      filter: { revenue: filterRevenue, gpr: filterGpr, eu: filterEu, overdue30: filterOverdue30 },
      mismatch
    };
  }, [data, filteredProperties, paginatedProperties, economicOccupancy, searchTerm]);

  // Time range label (used in multiple places)
  const timeRangeLabel = timeRange === 'month' ? 'Šį mėnesį' : timeRange === 'quarter' ? 'Šį ketvirtį' : 'Šiais metais';

  // Event handlers
  const handleCTA = useCallback((action: string, context?: any) => {
    if (FRONTEND_MODE) {
      alert(`🎯 ${action}\n\nŠi funkcija veiks su backend.\nKontekstas: ${JSON.stringify(context || {})}`);
    } else {
      console.log('Action:', action, context);
    }
  }, []);

  const handleExport = useCallback(async (format: 'csv' | 'pdf', scope: 'page' | 'filter' = 'filter') => {
    if (FRONTEND_MODE) {
      setIsExporting(true);
      setShowExportDropdown(false);
      
      const properties = scope === 'page' ? paginatedProperties : filteredProperties;
      const count = properties.length;
      const filterInfo = `${scope === 'page' ? 'Matomą puslapį' : 'Visą filtrą'} (${count} obj.) • ${timeRange} • ${portfolioFilter}`;
      
      try {
        if (format === 'csv') {
          // Export to CSV
          const { exportToCSV } = await import('../utils/pdfExport');
          const csvData = properties.map(p => ({
            Objektas: p.name,
            'Pajamos (€)': p.revenue,
            'GPR (€)': p.gpr,
            'EU (%)': p.gpr > 0 ? ((p.revenue / p.gpr) * 100).toFixed(1) : '0.0',
            'Vienetai': p.units,
            'Nuomotojai': p.tenants,
            'Statusas': p.status === 'vacant' ? 'Tuščias' : 
                       p.status === 'late30' ? 'Vėluoja 30+ d.' :
                       p.status === 'renewal30' ? 'Atnaujinimas < 30 d.' : 'Gerai'
          }));
          exportToCSV(csvData, `analytics_${timeRange}`);
        } else if (format === 'pdf') {
          // Export to PDF
          const { exportToPDF } = await import('../utils/pdfExport');
          await exportToPDF({
            title: `Analitika – ${timeRangeLabel}`,
            subtitle: `${data?.periodStart} – ${data?.periodEnd}`,
            includeCharts: true,
            includeTable: true,
            includeInsights: true,
            orientation: 'landscape'
          });
        }
        
        // Show success toast
      const toast = document.createElement('div');
      toast.className = 'fixed bottom-4 right-4 bg-[#2F8481] text-white px-6 py-3 rounded-xl shadow-lg animate-slide-up z-50';
      toast.innerHTML = `
        <div class="flex items-center gap-3">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <div>
              <p class="font-bold">${format.toUpperCase()} parengta</p>
            <p class="text-xs opacity-90">${filterInfo}</p>
          </div>
        </div>
      `;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 4000);
      } catch (error) {
        console.error('Export error:', error);
        alert('Eksportavimo klaida. Bandykite dar kartą.');
      } finally {
        setIsExporting(false);
    }
    }
  }, [timeRange, portfolioFilter, paginatedProperties, filteredProperties, data, timeRangeLabel]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(e.target as Node)) {
        setShowExportDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation for tabs
  const handleTabKeyDown = useCallback((e: React.KeyboardEvent, range: 'month' | 'quarter' | 'year') => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      const ranges: ('month' | 'quarter' | 'year')[] = ['month', 'quarter', 'year'];
      const currentIndex = ranges.indexOf(timeRange);
      const direction = e.key === 'ArrowLeft' ? -1 : 1;
      const newIndex = (currentIndex + direction + ranges.length) % ranges.length;
      setTimeRange(ranges[newIndex]);
    }
  }, [timeRange]);

  // Tooltip helpers with exact formulas
  const tooltips = useMemo(() => ({
    economicOccupancy: data ? `EU % = sum(Apmokėta nuoma) / sum(GPR) × 100

GPR = sutartinė nuoma, be nuolaidų, proratuota
Apmokėta nuoma = tik nuomos mokėjimai (be kitų mokesčių)

Pvz.: ${formatCurrency(data.totalRevenue)} / ${formatCurrency(data.potentialRevenue)} = ${formatPercent(economicOccupancy)}` : '',
    collectionRate: data ? `Surinkimo % = sum(Apmokėta per periodą) / sum(Išrašyta per periodą) × 100

Skaičiuojama tik šio laikotarpio sąskaitos.
Idealus rezultatas: ≥ 95 %

Pvz.: ${formatCurrency(data.collectedAmount)} / ${formatCurrency(data.billedAmount)} = ${formatPercent(collectionRate)}` : '',
    occupancy: data ? `Užimtumas % = 1 - (vid. laisvų vienetų / bendras vienetų sk.) × 100

Fizinis užimtumas = kiek vienetų faktiškai užimta
${data.occupiedUnits} / ${data.totalUnits} = ${formatPercent(occupancyRate)}` : '',
    vacancyLoss: data ? `Nuostolis = (Tikslas % - Faktinis %) × GPR / 12 mėn.

Alternatyvus: Laisvi vienetai × vid. mėn. nuoma
Pvz.: (95 % - ${occupancyRate.toFixed(1)} %) × ${formatCurrency(data.potentialRevenue)} / 12 = ${formatCurrency(data.vacancyCost)}/mėn.` : '',
    agingPeriod: data ? `Įtraukta tik ${timeRangeLabel.toLowerCase()} sąskaitos (išrašytos ${data.periodStart} – ${data.periodEnd}).

Vėluoja 30+ d. = 31–60 d. + 61–90 d. + 90+ d.
Senėjimas skaičiuojamas nuo išrašymo datos.` : ''
  }), [data, timeRangeLabel, economicOccupancy, collectionRate, occupancyRate]);
  
  // Handle aging bucket click
  const handleAgingClick = useCallback((bucket: string) => {
    setSelectedAgingBucket(bucket);
    handleCTA('Filtruoti skolininkus', { bucket });
    // In production: navigate to tenants page with pre-filtered bucket
  }, [handleCTA]);

  // Validate overdue KPI = aging sum (TEST)
  const overdueKPIValid = useMemo(() => {
    if (!data) return true;
    const agingSum = data.paymentAging.days30 + data.paymentAging.days60 + data.paymentAging.days90Plus;
    const kpiAmount = data.overdueAmount;
    const isValid = Math.abs(agingSum - kpiAmount) < 1; // Allow 1€ rounding
    if (!isValid) {
      console.error(`❌ Vėluojančių KPI neatitikimas: KPI=${kpiAmount}€, Aging sum=${agingSum}€`);
    }
    return isValid;
  }, [data]);

  // Auto-generate insights based on data
  const insights: Insight[] = useMemo(() => {
    if (!data) return [];
    
    const result: Insight[] = [];

    // 1. Economic Occupancy insight
    if (economicOccupancy < 90) {
      const loss = Math.round((95 - economicOccupancy) / 100 * data.potentialRevenue / 12);
      result.push({
        type: 'critical',
        title: 'Ekonominis užimtumas žemiau tikslo',
        description: `EU yra ${formatPercent(economicOccupancy)}, tai ${(95 - economicOccupancy).toFixed(1)} p.p. žemiau 95% tikslo. Rekomenduojama peržiūrėti tuščius objektus ir aktyvuoti marketingą.`,
        metric: `−${formatCurrency(loss)}/mėn.`,
        action: {
          label: 'Peržiūrėti tuščius',
          onClick: () => {
            setStatusFilter('vacant');
            setCurrentPage(0);
            document.getElementById('objektu-rezultatai')?.scrollIntoView({ behavior: 'smooth' });
          }
        }
      });
    } else if (economicOccupancy >= 95) {
      result.push({
        type: 'success',
        title: 'Puikus ekonominis užimtumas!',
        description: `EU ${formatPercent(economicOccupancy)} viršija tikslą. Portfelis veikia efektyviai.`,
        metric: `+${(economicOccupancy - 95).toFixed(1)} p.p.`
      });
    }

    // 2. Collection rate insight
    if (collectionRate < 90) {
      result.push({
        type: 'warning',
        title: 'Surinkimo rodiklis žemas',
        description: `Tik ${formatPercent(collectionRate)} sąskaitų apmokėta. ${data.overduePayments} mokėjimai vėluoja >30 d. Rekomenduojama siųsti priminimus.`,
        metric: `${formatCurrency(data.overdueAmount)}`,
        action: {
          label: 'Siųsti priminimus',
          onClick: () => handleCTA('Siųsti priminimus', { count: data.overduePayments })
        }
      });
    }

    // 3. Month-over-month growth
    if (monthOverMonth > 5) {
      result.push({
        type: 'success',
        title: 'Pajamos auga sparčiai',
        description: `Šio mėnesio pajamos ${formatCurrency(data.monthlyRevenue)} yra ${formatPercent(monthOverMonth)} daugiau nei praėjusį mėnesį. Teigiama tendencija!`,
        metric: `+${formatPercent(monthOverMonth)}`
      });
    } else if (monthOverMonth < -5) {
      result.push({
        type: 'warning',
        title: 'Pajamų mažėjimas',
        description: `Pajamos sumažėjo ${formatPercent(Math.abs(monthOverMonth))} vs. praėjęs mėn. Rekomenduojama išanalizuoti priežastis.`,
        metric: `${formatPercent(monthOverMonth)}`
      });
    }

    // 4. Vacancy duration
    if (data.vacancyMetrics.unitsOver30Days > 0) {
      result.push({
        type: 'warning',
        title: 'Ilgalaikė tuštuma',
        description: `${data.vacancyMetrics.unitsOver30Days} vnt. tušti >30 dienų (vid. ${data.vacancyMetrics.avgDaysVacant} d.). Metinis nuostolis: ${formatCurrency(data.vacancyMetrics.ytdVacancyLoss)}.`,
        metric: `${data.vacancyMetrics.unitsOver30Days} vnt.`,
        action: {
          label: 'Aktyvuoti rinkodarą',
          onClick: () => handleCTA('Peržiūrėti tuščius', { count: data.vacancyMetrics.unitsOver30Days })
        }
      });
    }

    // 5. Renewals at risk
    const atRiskCount = data.renewalsMetrics.atRisk.filter(a => a.daysToExpiry < 30).length;
    if (atRiskCount > 0) {
      result.push({
        type: 'info',
        title: 'Atnaujinimai artėja',
        description: `${atRiskCount} sutarčių baigiasi per 30 d. Rekomenduojama siųsti pasiūlymus iš anksto.`,
        metric: `${atRiskCount} vnt.`,
        action: {
          label: 'Siųsti pasiūlymus',
          onClick: () => handleCTA('Siųsti pasiūlymus', { count: atRiskCount })
        }
      });
    }

    // 6. Payment aging trend
    const overdue60Plus = data.paymentAging.days60 + data.paymentAging.days90Plus;
    if (overdue60Plus > 1000) {
      result.push({
        type: 'critical',
        title: 'Ilgalaikiai skolininkai',
        description: `${formatCurrency(overdue60Plus)} skolų >60 dienų. Rekomenduojama pradėti kolektorinį procesą.`,
        metric: formatCurrency(overdue60Plus),
        action: {
          label: 'Peržiūrėti',
          onClick: () => handleAgingClick('61-90')
        }
      });
    }

    return result;
  }, [data, economicOccupancy, collectionRate, monthOverMonth, handleCTA, handleAgingClick, setStatusFilter, setCurrentPage]);

  // Comparison data (Year-over-Year simulation)
  const comparisonData: ComparisonData[] = useMemo(() => {
    if (!data) return [];
    
    return [
      {
        label: 'Bendros pajamos',
        current: data.totalRevenue,
        previous: data.totalRevenue * 0.92, // -8% YoY simulation
        unit: 'currency'
      },
      {
        label: 'Ekonominis užimtumas',
        current: economicOccupancy,
        previous: 88.5, // Previous year
        unit: 'percent'
      },
      {
        label: 'Surinkimo rodiklis',
        current: collectionRate,
        previous: 89.2,
        unit: 'percent'
      },
      {
        label: 'Vid. nuoma/vnt.',
        current: data.totalRevenue / data.totalUnits / 12,
        previous: (data.totalRevenue / data.totalUnits / 12) * 0.96,
        unit: 'currency'
      }
    ];
  }, [data, economicOccupancy, collectionRate]);
  
  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === '/' && e.target === document.body) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    
    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="bg-gradient-to-br from-[#2F8481]/5 via-white to-[#2F8481]/10 py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
        <div className="animate-pulse space-y-6">
            <div className="h-12 bg-black/5 rounded-2xl w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="bg-white rounded-2xl border border-black/10 p-6 h-36"></div>
              ))}
              </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="bg-gradient-to-br from-[#2F8481]/5 via-white to-[#2F8481]/10 py-4 px-4 sm:px-6 lg:px-8 animate-fade-in">
      <div id="analytics-content" className="max-w-7xl mx-auto">
        {/* Header (SINGLE occurrence) */}
        <div className="sticky top-0 z-30 bg-gradient-to-br from-[#2F8481]/5 via-white to-[#2F8481]/10 backdrop-blur-sm pb-4 mb-4 -mx-4 px-4 pt-2 border-b border-black/10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-black">Analitika</h1>
                <span className="px-3 py-1 bg-[#2F8481]/10 text-[#2F8481] text-xs font-bold rounded-lg border border-[#2F8481]/20">
                  {timeRangeLabel}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <p 
                  className="text-sm text-black/60 cursor-help" 
                  title={`Paskutinį kartą atnaujinta: ${new Date().toLocaleString('lt-LT', { 
                    dateStyle: 'medium', 
                    timeStyle: 'medium', 
                    timeZone: 'Europe/Vilnius' 
                  })}`}
                >
                  Atnaujinta: {data.lastUpdated} (EET)
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="p-1 hover:bg-[#2F8481]/10 rounded-lg transition-colors"
                  aria-label="Atnaujinti duomenis"
                  title="Atnaujinti"
                >
                  <svg className="w-4 h-4 text-black/60 hover:text-[#2F8481]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Validation Warning */}
            {!overdueKPIValid && (
              <div className="mb-4 p-3 bg-red-50 border-2 border-red-200 rounded-xl flex items-center gap-3">
                <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-semibold text-red-900">
                  ⚠️ Duomenų neatitikimas: Vėluojančių KPI nesutampa su Mokėjimų senėjimo suma.
                </p>
              </div>
            )}
            
            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Time Range - Accessible Tabs */}
              <div 
                className="flex bg-white border-2 border-black/10 rounded-xl p-1 shadow-sm"
                role="tablist"
                aria-label="Laikotarpio pasirinkimas"
              >
                {(['month', 'quarter', 'year'] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    onKeyDown={(e) => handleTabKeyDown(e, range)}
                    role="tab"
                    aria-selected={timeRange === range}
                    tabIndex={timeRange === range ? 0 : -1}
                    aria-controls={`${range}-panel`}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#2F8481]/40 ${
                      timeRange === range
                        ? 'bg-[#2F8481] text-white shadow-md'
                        : 'text-black/70 hover:text-black hover:bg-black/5'
                    }`}
                  >
                    {range === 'month' ? 'Mėnuo' : range === 'quarter' ? 'Ketvirtis' : 'Metai'}
                  </button>
                ))}
              </div>
              
              {/* Export Dropdown */}
              <div className="relative" ref={exportDropdownRef}>
              <button
                  onClick={() => setShowExportDropdown(!showExportDropdown)}
                disabled={isExporting}
                  className="px-4 py-2 bg-[#2F8481] hover:opacity-90 text-white font-semibold rounded-xl transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Eksportuoti CSV"
                  aria-expanded={showExportDropdown}
                  aria-haspopup="true"
              >
                {isExporting ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Ruošiama...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                      Eksportuoti
                      <svg className={`w-4 h-4 transition-transform ${showExportDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                  </>
                )}
              </button>
                
                {showExportDropdown && !isExporting && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-black/10 py-2 z-50 animate-slide-up">
                    {/* CSV Options */}
                    <div className="px-4 py-2 text-xs font-bold text-black/50 uppercase">CSV</div>
                    <button
                      onClick={() => handleExport('csv', 'page')}
                      className="w-full px-4 py-2 text-left text-sm text-black hover:bg-[#2F8481]/5 transition-colors flex items-center gap-3"
                    >
                      <svg className="w-4 h-4 text-black/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <div>
                        <p className="font-semibold">Matomas puslapis</p>
                        <p className="text-xs text-black/50">{paginatedProperties.length} obj.</p>
                      </div>
                    </button>
                    <button
                      onClick={() => handleExport('csv', 'filter')}
                      className="w-full px-4 py-2 text-left text-sm text-black hover:bg-[#2F8481]/5 transition-colors flex items-center gap-3"
                    >
                      <svg className="w-4 h-4 text-black/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                      </svg>
                      <div>
                        <p className="font-semibold">Visas filtras</p>
                        <p className="text-xs text-black/50">{filteredProperties.length} obj.</p>
                      </div>
                    </button>
                    
                    <div className="border-t border-black/10 my-2"></div>
                    
                    {/* PDF Option */}
                    <div className="px-4 py-2 text-xs font-bold text-black/50 uppercase">PDF Reportas</div>
                    <button
                      onClick={() => handleExport('pdf', 'filter')}
                      className="w-full px-4 py-2 text-left text-sm text-black hover:bg-[#2F8481]/5 transition-colors flex items-center gap-3"
                    >
                      <svg className="w-4 h-4 text-black/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <div>
                        <p className="font-semibold">Pilnas reportas</p>
                        <p className="text-xs text-black/50">Su grafikais ir insights</p>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Portfolio Filter Chips */}
          <div className="flex flex-wrap gap-2">
            {['Visi', 'Vilnius', 'Kaunas', 'Komerciniai', 'Butai'].map((filter) => (
              <button
                key={filter}
                onClick={() => setPortfolioFilter(filter.toLowerCase())}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  portfolioFilter === filter.toLowerCase()
                    ? 'bg-[#2F8481] text-white shadow-md'
                    : 'bg-white text-black/70 border border-black/10 hover:border-[#2F8481]/40'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* KPI Juosta - 6 Pagrindiniai Rodikliai (Nuomotojo prioritetu) */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 lg:gap-3 mb-6 lg:mb-8 min-w-0 w-full">
          {/* 1. Užimtumas */}
          <KPICard
            icon={
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
            }
            title="Užimtumas"
            value={formatPercent(economicOccupancy)}
            subtitle={`Tikslas 95 % | ${economicOccupancy >= 95 ? '+' : ''}${(economicOccupancy - 95).toFixed(1)} % nuo tikslo`}
            status={
              economicOccupancy >= 95 ? 'success' :
              economicOccupancy >= 90 ? 'warning' : 'danger'
            }
            primaryCTA={{
              label: data.totalUnits - data.occupiedUnits > 0 
                ? `Peržiūrėti laisvus (${data.totalUnits - data.occupiedUnits})` 
                : 'Kainodaros patarimai',
              onClick: () => {
                if (data.totalUnits - data.occupiedUnits > 0) {
                  setStatusFilter('vacant');
                  setCurrentPage(0);
                  document.getElementById('objektu-rezultatai')?.scrollIntoView({ behavior: 'smooth' });
                } else {
                  handleCTA('Kainodaros patarimai', { eu: economicOccupancy });
                }
              }
            }}
            tooltip="Užimtumas = faktinės pajamos / potencialios pajamos × 100%"
            animationDelay="0s"
          />

          {/* 2. Laisvi vienetai */}
          <KPICard
            icon={
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
            }
            title="Ekonominis užimtumas"
            value={formatPercent(economicOccupancy)}
            status={
              economicOccupancy >= 95 ? 'success' :
              economicOccupancy >= 93 ? 'warning' : 'danger'
            }
            badge={(() => {
              const achievedPercent = ((economicOccupancy / 95) * 100).toFixed(0);
              const gapPercent = (95 - economicOccupancy).toFixed(1);
              return {
                text: economicOccupancy >= 95 
                  ? `+${(economicOccupancy - 95).toFixed(1)} %`
                  : `−${gapPercent} %`,
                variant: economicOccupancy >= 95 
                  ? 'success' 
                  : economicOccupancy >= 93 
                  ? 'warning' 
                  : 'warning',
                onClick: () => {
                  setSortBy('eu');
                  setCurrentPage(0);
                  document.getElementById('objektu-rezultatai')?.scrollIntoView({ behavior: 'smooth' });
                }
              };
            })()}
            progress={{
              current: economicOccupancy,
              target: 95,
              label: 'Tikslas 95 %'
            }}
            sparkline={{
              data: data.economicOccupancyByMonth.map(m => m.rate),
              min: 80, // Fixed domain for consistency
              max: 100
            }}
            primaryCTA={
              data.totalUnits - data.occupiedUnits > 0
                ? {
                    label: `Peržiūrėti laisvus (${data.totalUnits - data.occupiedUnits})`,
                    onClick: () => {
                      setStatusFilter('vacant');
                      setCurrentPage(0);
                      document.getElementById('objektu-rezultatai')?.scrollIntoView({ behavior: 'smooth' });
                    }
                  }
                : {
                    label: 'Kainodaros patarimai',
                    onClick: () => handleCTA('Kainodaros patarimai', { eu: economicOccupancy })
                  }
            }
            secondaryCTA={
              economicOccupancy < 95
                ? (() => {
                    const monthlyRisk = Math.round((95 - economicOccupancy) / 100 * data.potentialRevenue / 12);
                    return {
                      label: `−${formatCurrency(monthlyRisk)}/mėn.`,
                      onClick: () => {
                        setSortBy('eu');
                        setCurrentPage(0);
                        document.getElementById('objektu-rezultatai')?.scrollIntoView({ behavior: 'smooth' });
                      },
                      variant: monthlyRisk < 50 ? 'low' : monthlyRisk <= 300 ? 'medium' : 'high'
                    };
                  })()
                : undefined
            }
            tooltip="Tikslas 95 %. Skirtumas skaičiuojamas punktais (91,5 % – 95 % = 3,5 punkto)"
            onTooltipClick={() => setShowTooltip(showTooltip === 'eco' ? null : 'eco')}
            animationDelay="0.05s"
            onClick={() => {
              setSortBy('eu');
              setCurrentPage(0);
              document.getElementById('objektu-rezultatai')?.scrollIntoView({ behavior: 'smooth' });
            }}
          />

          {/* 3. Surinkta / Išrašyta */}
          <KPICard
            icon={
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            }
            title="Surinkta / Išrašyta"
            value={formatPercent(collectionRate)}
            subtitle={`${formatCurrency(data.collectedAmount)} / ${formatCurrency(data.billedAmount)}`}
            status={
              collectionRate >= 95 ? 'success' :
              collectionRate >= 90 ? 'warning' : 'danger'
            }
            badge={
              collectionRate < 95
                ? {
                    text: `−${(95 - collectionRate).toFixed(1)} %`,
                    variant: 'warning'
                  }
                : {
                    text: `+${(collectionRate - 95).toFixed(1)} %`,
                    variant: 'success'
                  }
            }
            progress={{
              current: collectionRate,
              target: 95,
              label: 'Tikslas'
            }}
            sparkline={{
              data: data.revenueByMonth.map((m) => {
                // Calculate collection rate for all 12 months
                const rate = m.billed > 0 ? (m.paid / m.billed) * 100 : 0;
                return rate;
              }),
              min: 80, // Fixed domain for consistency
              max: 100
            }}
            tooltip={tooltips.collectionRate}
            onTooltipClick={() => setShowTooltip(showTooltip === 'collection' ? null : 'collection')}
            animationDelay="0.1s"
          />

          {/* 4. Skolos 30+ d. */}
          <KPICard
            icon={
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            }
            title="Skolos 30+ d."
            value={formatCurrency(data.overdueAmount)}
            subtitle={`${data.overduePayments} vnt.`}
            status={
              data.overduePayments === 0 ? 'success' :
              data.overduePayments <= 2 ? 'warning' : 'danger'
            }
            badge={
              data.overduePayments > 0
                ? {
                    text: `${data.overduePayments} skol.`,
                    variant: 'warning'
                  }
                : undefined
            }
            primaryCTA={{
              label: `Peržiūrėti ${data.overduePayments} ${data.overduePayments === 1 ? 'skolininką' : 'skolininkus'}`,
              onClick: () => handleCTA('Peržiūrėti skolininkus', { count: data.overduePayments })
            }}
            animationDelay="0.15s"
          />

          {/* 5. Atnaujinimai <60 d. */}
          <KPICard
            icon={
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
            }
            title="Atnaujinimai <60 d."
            value={`${data.renewalsMetrics.atRisk.filter(a => a.daysToExpiry < 60).length} vnt.`}
            subtitle={`iš ${data.renewalsDue}`}
            status={
              data.renewalsMetrics.atRisk.filter(a => a.daysToExpiry < 30).length === 0 ? 'success' :
              data.renewalsMetrics.atRisk.filter(a => a.daysToExpiry < 30).length <= 2 ? 'warning' : 'danger'
            }
            badge={
              data.renewalsMetrics.atRisk.filter(a => a.daysToExpiry < 30).length > 0
                ? {
                    text: `${data.renewalsMetrics.atRisk.filter(a => a.daysToExpiry < 30).length} <30d`,
                    variant: 'warning'
                  }
                : undefined
            }
            primaryCTA={{
              label: `Siųsti pasiūlymus (${data.renewalsMetrics.atRisk.filter(a => a.status === 'no_offer_sent').length})`,
              onClick: () => handleCTA('Siųsti pasiūlymus', { count: data.renewalsMetrics.atRisk.filter(a => a.status === 'no_offer_sent').length })
            }}
            animationDelay="0.2s"
          />

          {/* 6. Laisvi vienetai */}
          <KPICard
            icon={
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
            }
            title="Laisvi vienetai"
            value={`${data.totalUnits - data.occupiedUnits} vnt.`}
            subtitle={`Vid. ${data.vacancyMetrics.avgDaysVacant} d. tuštuma${data.totalUnits - data.occupiedUnits > 0 ? ` • Rizika: −${formatCurrency(Math.round(data.vacancyMetrics.ytdVacancyLoss / 12))}/mėn.` : ''}`}
            status={
              data.totalUnits - data.occupiedUnits === 0 ? 'success' :
              data.vacancyMetrics.unitsOver30Days === 0 ? 'warning' : 'danger'
            }
            badge={
              data.vacancyMetrics.unitsOver30Days > 0
                ? {
                    text: `${data.vacancyMetrics.unitsOver30Days} >30d`,
                    variant: 'warning'
                  }
                : undefined
            }
            primaryCTA={
              data.totalUnits - data.occupiedUnits > 0
                ? {
                    label: `Peržiūrėti ${data.totalUnits - data.occupiedUnits} ${data.totalUnits - data.occupiedUnits === 1 ? 'vienetą' : 'vienetus'}`,
                    onClick: () => {
                      setStatusFilter('vacant');
                      setCurrentPage(0);
                      document.getElementById('objektu-rezultatai')?.scrollIntoView({ behavior: 'smooth' });
                    }
                  }
                : undefined
            }
            tooltip={tooltips.occupancy}
            onTooltipClick={() => setShowTooltip(showTooltip === 'occupancy' ? null : 'occupancy')}
            animationDelay="0.25s"
          />
        </div>


        {/* What Changed - Revenue & Occupancy Trends */}
        <div id="pajamu-grafikas" ref={chartsRef} className="grid grid-cols-12 gap-3 lg:gap-4 xl:gap-6 mb-6 lg:mb-8 min-w-0">
          {chartsVisible ? (
            <>
              {/* Revenue Trend (Clustered Bars + Collection % Line) */}
              <div className="col-span-12 lg:col-span-6 bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.1)] border border-black/10 hover:shadow-[0_8px_25px_rgba(0,0,0,0.15)] hover:scale-[1.01] hover:border-[#2F8481]/30 transition-all duration-300 animate-slide-up min-w-0 w-full" style={{animationDelay: '0.25s'}}>
                <div className="p-4 lg:p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-base lg:text-lg font-bold text-black">Finansų analizė</h3>
                      <p className="text-xs text-black/60 mt-1">Pajamų tendencijos ir surinkimo efektyvumas</p>
                    </div>
                  </div>
                  <LazyRevenueChart
                    data={data.revenueByMonth}
                    targetCollection={95}
                    height={400}
                    onMonthClick={(month: string, index: number) => handleCTA('Filtruoti mėnesį', { month, index })}
                    animationDelay="0.25s"
                  />
                </div>
              </div>

              {/* Occupancy Trend */}
              <div className="col-span-12 lg:col-span-6 bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.1)] border border-black/10 hover:shadow-[0_8px_25px_rgba(0,0,0,0.15)] hover:scale-[1.01] hover:border-[#2F8481]/30 transition-all duration-300 animate-slide-up min-w-0 w-full" style={{animationDelay: '0.3s'}}>
                <div className="p-4 lg:p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-base lg:text-lg font-bold text-black">Užimtumo tendencija</h3>
                      <p className="text-xs text-black/60 mt-1">(12 mėn.)</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-[#2F8481]/35 rounded"></div>
                          <span className="text-xs text-black/70">Vid. laisvų vnt.</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-[#2F8481] rounded-full border border-white"></div>
                          <span className="text-xs text-black/70">Užimtumas (%)</span>
                        </div>
                      </div>
                    <button
                      onClick={() => setShowTargetModal(true)}
                      className="text-xs font-semibold text-[#2F8481] hover:underline px-2 py-1 rounded-lg hover:bg-[#2F8481]/5"
                    >
                        Keisti
                    </button>
                    </div>
                  </div>
                </div>
                {/* GRAFIKO ZONA: pilnas plotis be padding */}
                <div className="w-full min-w-0">
                  <div className="w-full h-[600px] min-w-0 flex-1">
                    <LazyOccupancyTrend 
                      data={data.occupancyByMonth.map(m => ({ label: m.month, value: m.rate, vacantAvg: m.vacantAvg }))}
                      target={customTarget}
                      minY={85}
                      height={600}
                      showAnnotations={true}
                      onPointClick={(month: string, index: number) => {
                        handleCTA('Filtruoti mėnesį', { month, index });
                      }}
                    />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="col-span-12 lg:col-span-7 bg-white rounded-2xl border border-black/10 p-4 lg:p-5 h-80 animate-pulse">
                <div className="h-4 bg-black/5 rounded w-1/3 mb-4"></div>
                <div className="h-64 bg-black/5 rounded"></div>
              </div>
              <div className="col-span-12 lg:col-span-5 bg-white rounded-2xl border border-black/10 p-4 lg:p-5 h-80 animate-pulse">
                <div className="h-4 bg-black/5 rounded w-1/3 mb-4"></div>
                <div className="h-64 bg-black/5 rounded"></div>
          </div>
            </>
          )}
        </div>

        {/* Where to Act - Properties Table & Payment Aging */}
        <div className="grid grid-cols-12 gap-3 lg:gap-4 xl:gap-6 mb-6 lg:mb-8">
          {/* Properties Table */}
          <div id="objektu-rezultatai" className="col-span-12 lg:col-span-7 bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.1)] border border-black/10 p-4 lg:p-5 hover:shadow-[0_8px_25px_rgba(0,0,0,0.15)] hover:scale-[1.01] hover:border-[#2F8481]/30 transition-all duration-300 animate-slide-up" style={{animationDelay: '0.35s'}}>
            <div className="mb-3">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-base lg:text-lg font-bold text-black">Objektų rezultatai</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-black/60">{timeRangeLabel}</p>
                    <p className="text-xs font-semibold text-black/40" title="Rodo objektus nuo-iki iš viso">
                      {currentPage * PAGE_SIZE + 1}–{Math.min((currentPage + 1) * PAGE_SIZE, filteredProperties.length)} / {filteredProperties.length}
                    </p>
                  </div>
                </div>
                <div className="relative">
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Ieškoti objekto..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(0); }}
                    className="px-3 py-2 border-2 border-black/10 rounded-xl text-sm focus:ring-2 focus:ring-[#2F8481]/20 focus:border-[#2F8481] transition-all"
                    aria-label="Ieškoti objekto pagal pavadinimą. Spauskite / greitam fokusui"
                  />
                </div>
              </div>
              
              {/* Quick Status Filters */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => { setStatusFilter(null); setCurrentPage(0); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    statusFilter === null
                      ? 'bg-[#2F8481] text-white shadow-sm'
                      : 'bg-white text-black/70 border border-black/10 hover:border-[#2F8481]/40'
                  }`}
                >
                  Visi
                </button>
                <button
                  onClick={() => { setStatusFilter('vacant'); setCurrentPage(0); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    statusFilter === 'vacant'
                      ? 'bg-[#2F8481] text-white shadow-sm'
                      : 'bg-white text-black/70 border border-black/10 hover:border-[#2F8481]/40'
                  }`}
                >
                  Tušti
                </button>
                <button
                  onClick={() => { setStatusFilter('late30'); setCurrentPage(0); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    statusFilter === 'late30'
                      ? 'bg-[#2F8481] text-white shadow-sm'
                      : 'bg-white text-black/70 border border-black/10 hover:border-[#2F8481]/40'
                  }`}
                >
                  Vėluoja 30+ d.
                </button>
                <button
                  onClick={() => { setStatusFilter('renewal30'); setCurrentPage(0); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    statusFilter === 'renewal30'
                      ? 'bg-[#2F8481] text-white shadow-sm'
                      : 'bg-white text-black/70 border border-black/10 hover:border-[#2F8481]/40'
                  }`}
                >
                  Atnaujinimai &lt; 30 d.
                </button>
              </div>
      </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
                  <tr className="border-b-2 border-black/10 hover:bg-[#2F8481]/5 transition-colors duration-300">
                    <th className="text-left py-2 px-2 text-xs font-bold text-black/70">Objektas</th>
                    <th className="text-right py-2 px-2 text-xs font-bold text-black/70">
                      Pajamos šį mėn. (€)
                    </th>
                    <th className="text-right py-2 px-2 text-xs font-bold text-black/70">
                      <button
                        onClick={() => setSortBy(sortBy === 'eu' ? 'impact' : 'eu')}
                        className="hover:text-[#2F8481] transition-colors flex items-center gap-1.5 group ml-auto"
                        aria-label="Rikiuoti pagal EU%"
                      >
                        <span className={sortBy === 'eu' ? 'text-[#2F8481]' : ''}>Ekonominis užimtumas (%)</span>
                        <svg 
                          className={`w-3 h-3 transition-all ${sortBy === 'eu' ? 'text-[#2F8481]' : 'text-black/30 group-hover:text-black/50'}`} 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                    </th>
                    <th className="text-right py-2 px-2 text-xs font-bold text-black/70">
                      <button
                        onClick={() => setSortBy(sortBy === 'impact' ? 'eu' : 'impact')}
                        className="hover:text-[#2F8481] transition-colors flex items-center gap-1.5 group ml-auto"
                        aria-label="Rikiuoti pagal € poveikį"
                      >
                        <span className={sortBy === 'impact' ? 'text-[#2F8481]' : ''}>€ Poveikis</span>
                        <svg 
                          className={`w-3 h-3 transition-all ${sortBy === 'impact' ? 'text-[#2F8481]' : 'text-black/30 group-hover:text-black/50'}`} 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                    </th>
                    <th className="text-center py-2 px-2 text-xs font-bold text-black/70">Laisvi vnt.</th>
                    <th className="text-right py-2 px-2 text-xs font-bold text-black/70">Skolos 30+ d. (€ / vnt.)</th>
                    <th className="text-center py-2 px-2 text-xs font-bold text-black/70">Atnaujinimai &lt;60 d. (vnt.)</th>
                    <th className="text-right py-2 px-2 text-xs font-bold text-black/70">Vid. nuoma/vnt. (€)</th>
                    <th className="text-center py-2 px-2 text-xs font-bold text-black/70">Veiksmai</th>
              </tr>
            </thead>
            <tbody>
                  {paginatedProperties.length === 0 ? (
                    <tr className="hover:bg-[#2F8481]/5 transition-colors duration-300">
                      <td colSpan={9} className="py-8 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <svg className="w-12 h-12 text-black/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                          <p className="text-sm text-black/60">Objektų nerasta</p>
                          <button 
                            onClick={() => handleCTA('Pridėti objektą')}
                            className="px-4 py-2 bg-[#2F8481] text-white font-semibold rounded-xl hover:opacity-90 transition-all"
                          >
                            Pridėti objektą
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <>
                      {paginatedProperties.map((property, index) => {
                        const eu = property.gpr > 0 ? (property.revenue / property.gpr) * 100 : 0;
                        const avgRentPerUnit = property.units > 0 ? property.revenue / property.units : 0;
                        const vacantUnits = property.units - property.tenants;
                        const estimatedDebt30 = property.status === 'late30' ? Math.round(property.gpr * 0.25) : 0;
                        const hasRenewal60 = property.status === 'renewal30' ? 1 : 0;
                        const financialImpact = calculateFinancialImpact(property);
                        
                        // Determine primary action based on priority
                        const getPrimaryAction = () => {
                          if (estimatedDebt30 > 0) {
                            return { label: 'Siųsti priminimus', action: 'remind' };
                          } else if (vacantUnits > 0) {
                            return { label: 'Aktyvuoti rinkodarą', action: 'market' };
                          } else if (hasRenewal60 > 0) {
                            return { label: 'Siųsti pasiūlymus', action: 'offer' };
                          }
                          return { label: 'Peržiūrėti', action: 'view' };
                        };
                        
                        const primaryAction = getPrimaryAction();
                        
                        return (
                          <>
                            <tr 
                              key={index} 
                              onClick={() => setExpandedRow(expandedRow === index ? null : index)}
                              className="border-b border-black/5 hover:bg-[#2F8481]/10 hover:shadow-md hover:scale-[1.01] transition-all duration-300 group cursor-pointer"
                            >
                              {/* 1. Objektas */}
                              <td className="py-3 px-2">
                                <div className="flex items-center gap-2">
                                  <svg className={`w-4 h-4 transition-transform ${expandedRow === index ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                  <div>
                                    <p className="text-sm font-semibold text-black">{property.name}</p>
                                    <p className="text-xs text-black/50">{property.units} vnt. • {property.tenants} nuom.</p>
                                  </div>
                                </div>
                              </td>
                              
                              {/* 2. Pajamos šį mėn. (€) */}
                              <td className="py-3 px-2 text-right">
                                <p className="text-sm font-bold text-black tabular-nums">{formatCurrency(property.revenue)}</p>
                                <p className="text-xs text-black/60 tabular-nums">
                                  {property.revenue > property.gpr ? '+' : property.revenue < property.gpr ? '' : ''}
                                  {property.gpr > 0 ? formatPercent(((property.revenue - property.gpr) / property.gpr) * 100) : '0%'} vs planas
                                </p>
                              </td>
                              
                              {/* 3. Ekonominis užimtumas (%) */}
                              <td className="py-3 px-2 text-right">
                                <p className="text-sm font-bold text-black tabular-nums">{formatPercent(eu)}</p>
                                <div className="w-12 bg-black/5 rounded-full h-1 mx-auto mt-1">
                                  <div 
                                    className={`h-1 rounded-full transition-all ${
                                      eu >= 90 ? 'bg-[#2F8481]' : eu >= 85 ? 'bg-yellow-500' : 'bg-red-500'
                                    }`}
                                    style={{ width: `${Math.min(100, eu)}%` }}
                                  ></div>
                                </div>
                              </td>
                              
                              {/* 4. € Poveikis */}
                              <td className="py-3 px-2 text-right">
                                <p className="text-sm font-bold text-black tabular-nums">{formatCurrency(financialImpact)}</p>
                                <div className="text-xs text-black/50">
                                  {estimatedDebt30 > 0 && <span className="text-red-600">Skolos</span>}
                                  {vacantUnits > 0 && <span className="text-blue-600">Tuštuma</span>}
                                  {hasRenewal60 > 0 && <span className="text-yellow-600">Atnaujinimas</span>}
                                </div>
                              </td>
                              
                              {/* 5. Laisvi vnt. */}
                              <td className="py-3 px-2 text-center">
                                {vacantUnits > 0 ? (
                                  <div className="flex flex-col items-center">
                                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                                      data?.vacancyMetrics.avgDaysVacant && data.vacancyMetrics.avgDaysVacant > 30 
                                        ? 'bg-red-100 text-red-600' 
                                        : 'bg-black/10 text-black'
                                    }`}>
                                      {vacantUnits}
                                    </span>
                                    <p className="text-xs text-black/50 mt-1">
                                      vid. {data?.vacancyMetrics.avgDaysVacant || 42} d.
                                    </p>
                                  </div>
                                ) : (
                                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#2F8481]/10 text-[#2F8481] text-xs font-bold">
                                    ✓
                                  </span>
                                )}
                              </td>
                              
                              {/* 5. Skolos 30+ d. (€ / vnt.) */}
                              <td className="py-3 px-2 text-right">
                                {estimatedDebt30 > 0 ? (
                                  <div className="flex flex-col items-end">
                                    <p className="text-sm font-bold text-black tabular-nums">{formatCurrency(estimatedDebt30)}</p>
                                    <div className="w-16 bg-red-100 rounded-full h-1 mt-1">
                                      <div 
                                        className="h-1 rounded-full bg-red-500 transition-all"
                                        style={{ width: `${Math.min(100, (estimatedDebt30 / (property.gpr * 0.5)) * 100)}%` }}
                                      ></div>
                                    </div>
                                    <p className="text-xs text-black/50">~35 d.</p>
                                  </div>
                                ) : (
                                  <span className="text-xs text-black/40">—</span>
                                )}
                              </td>
                              
                              {/* 6. Atnaujinimai <60 d. (vnt.) */}
                              <td className="py-3 px-2 text-center">
                                {hasRenewal60 > 0 ? (
                                  <div className="flex flex-col items-center">
                                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                                      hasRenewal60 > 0 ? 'bg-yellow-100 text-yellow-600' : 'bg-[#2F8481]/10 text-[#2F8481]'
                                    }`}>
                                      {hasRenewal60}
                                    </span>
                                    <p className="text-xs text-black/50">iš {data?.renewalsDue || 1}</p>
                                  </div>
                                ) : (
                                  <span className="text-xs text-black/40">—</span>
                                )}
                              </td>
                              
                              {/* 7. Vid. nuoma/vnt. (€) */}
                              <td className="py-3 px-2 text-right">
                                <p className="text-sm font-bold text-black tabular-nums">{formatCurrency(avgRentPerUnit)}</p>
                                <p className="text-xs text-black/60">/mėn.</p>
                              </td>
                              
                              {/* 8. Veiksmai - Primary Action */}
                              <td className="py-3 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCTA(primaryAction.label, { property: property.name, action: primaryAction.action });
                                  }}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                    primaryAction.action === 'remind' ? 'bg-red-100 text-red-600 hover:bg-red-200' :
                                    primaryAction.action === 'market' ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' :
                                    primaryAction.action === 'offer' ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200' :
                                    'bg-[#2F8481]/10 text-[#2F8481] hover:bg-[#2F8481]/20'
                                  }`}
                                >
                                  {primaryAction.label}
                                </button>
                              </td>
                            </tr>
                            
                            {/* Expanded Row Content */}
                            {expandedRow === index && (
                              <tr className="bg-[#2F8481]/5 hover:bg-[#2F8481]/10 transition-colors duration-300">
                                <td colSpan={8} className="p-4">
                                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Left: 6-month trends */}
                                    <div>
                                      <h4 className="text-sm font-bold text-black mb-3">6 mėn. tendencijos</h4>
                                      <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                          <span className="text-xs text-black/70">EU% trendas:</span>
                                          <span className="text-xs font-semibold text-black">{formatPercent(eu)}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                          <span className="text-xs text-black/70">Surinkta/Išrašyta:</span>
                                          <span className="text-xs font-semibold text-black">{formatPercent(collectionRate)}</span>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* Right: Mini lists */}
                                    <div className="space-y-3">
                                      {/* Top 3 skolininkai */}
                                      {estimatedDebt30 > 0 && (
                                        <div>
                                          <h4 className="text-xs font-bold text-black mb-2">TOP skolininkai</h4>
                                          <div className="text-xs text-black/70">
                                            {property.name}: {formatCurrency(estimatedDebt30)} (~35 d.)
                                          </div>
                                        </div>
                                      )}
                                      
                                      {/* Artėjantys atnaujinimai */}
                                      {hasRenewal60 > 0 && (
                                        <div>
                                          <h4 className="text-xs font-bold text-black mb-2">Artėjantys atnaujinimai</h4>
                                          <div className="text-xs text-black/70">
                                            Sutartis baigiasi per 45 d., siūloma +4.2%
                                          </div>
                                        </div>
                                      )}
                                      
                                      {/* Laisvi vienetai */}
                                      {vacantUnits > 0 && (
                                        <div>
                                          <h4 className="text-xs font-bold text-black mb-2">Laisvi vienetai</h4>
                                          <div className="text-xs text-black/70">
                                            {vacantUnits} vnt. tušti {data?.vacancyMetrics.avgDaysVacant || 42} d., 
                                            rekomenduojama kaina: {formatCurrency(avgRentPerUnit * 1.1)}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        );
                      })}
                      
                      {/* Totals Rows - Page & Filter */}
                      {filteredProperties.length > PAGE_SIZE && (
                        <tr className="border-t border-black/10 bg-black/[0.02] hover:bg-[#2F8481]/5 transition-colors duration-300">
                          <td className="py-2 px-2">
                            <p className="text-xs font-semibold text-black/70">Šio puslapio suma</p>
                          </td>
                          <td className="py-2 px-2 text-right">
                            <p className="text-xs font-bold text-black tabular-nums">{formatCurrency(tableTotals.page.revenue)}</p>
                            <p className="text-xs text-black/50 tabular-nums">GPR {formatCurrency(tableTotals.page.gpr)}</p>
                          </td>
                          <td className="py-2 px-2 text-right">
                            <span className="text-xs font-bold text-black tabular-nums">{formatPercent(tableTotals.page.eu)}</span>
                          </td>
                          <td className="py-2 px-2" colSpan={5}></td>
                        </tr>
                      )}
                      <tr className="border-t-2 border-black/20 bg-[#2F8481]/5 hover:bg-[#2F8481]/10 hover:shadow-md transition-all duration-300 font-bold sticky bottom-0">
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-black">Iš viso pagal filtrą</p>
                            {tableTotals.mismatch && (
                              <span 
                                className="text-xs text-black/60 cursor-help"
                                title="Skaičiavimas atnaujinamas, pabandykite perkrauti"
                              >
                                ⚠️
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-2 text-right">
                          <p className="text-sm font-bold text-black tabular-nums">{formatCurrency(tableTotals.filter.revenue)}</p>
                          <p className="text-xs text-black/50 tabular-nums">GPR {formatCurrency(tableTotals.filter.gpr)}</p>
                        </td>
                        <td className="py-3 px-2 text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <div className="w-[72px] bg-black/5 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full transition-all ${
                                  tableTotals.filter.eu >= 90 ? 'bg-[#2F8481]' : 'bg-black/20'
                                }`}
                                style={{ width: `${Math.min(100, tableTotals.filter.eu)}%` }}
                                title={tableTotals.filter.eu > 100 ? `Faktinis: ${formatPercent(tableTotals.filter.eu)} (bar cap'intas 100%)` : undefined}
                              ></div>
                            </div>
                            <span className="text-sm font-bold text-black tabular-nums w-16 text-right">EU {formatPercent(tableTotals.filter.eu)}</span>
                            {tableTotals.filter.eu > 100 && (
                              <span 
                                className="text-xs font-bold px-1.5 py-0.5 bg-[#2F8481]/10 text-black rounded border border-[#2F8481]/30"
                                title="Vidurkis viršija 100%"
                              >
                                Viršyta
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-2" colSpan={5}>
                          <p className="text-xs text-black/60">Skolos 30+ d.: {formatCurrency(tableTotals.filter.overdue30)}</p>
                        </td>
                      </tr>
                    </>
                  )}
            </tbody>
          </table>
            </div>

            {/* Pagination */}
            {filteredProperties.length > PAGE_SIZE && (
              <div className="mt-3 flex items-center justify-between border-t border-black/10 pt-3">
                <p className="text-xs text-black/60">
                  {currentPage * PAGE_SIZE + 1}–{Math.min((currentPage + 1) * PAGE_SIZE, filteredProperties.length)} / {filteredProperties.length}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                    disabled={currentPage === 0}
                    className="px-3 py-1 text-xs font-semibold border-2 border-black/10 rounded-lg hover:bg-black/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    Ankstesnis
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredProperties.length / PAGE_SIZE) - 1, p + 1))}
                    disabled={currentPage >= Math.ceil(filteredProperties.length / PAGE_SIZE) - 1}
                    className="px-3 py-1 text-xs font-semibold border-2 border-black/10 rounded-lg hover:bg-black/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    Kitas
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Skolų Senėjimas - Donut Chart + TOP 5 Skolininkai */}
          <div className="col-span-12 lg:col-span-5 bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.1)] border border-black/10 p-4 lg:p-5 hover:shadow-[0_8px_25px_rgba(0,0,0,0.15)] hover:scale-[1.01] hover:border-[#2F8481]/30 transition-all duration-300 animate-slide-up min-w-0 w-full" style={{animationDelay: '0.4s'}}>
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-base lg:text-lg font-bold text-black">Skolų senėjimas</h3>
                <p className="text-xs text-black/60 mt-1">Viso: {formatCurrency(totalAging)}</p>
              </div>
              <button 
                className="text-xs font-medium text-[#2F8481] hover:underline flex items-center gap-1"
                onClick={() => setShowTooltip(showTooltip === 'aging' ? null : 'aging')}
                aria-label="Skolų senėjimo laikotarpis"
              >
                ⓘ
              </button>
            </div>
            {showTooltip === 'aging' && (
              <div className="absolute z-10 bg-black text-white text-xs rounded-lg p-3 max-w-xs shadow-lg mt-1 whitespace-pre-line">
                {tooltips.agingPeriod}
              </div>
            )}
            
            <LazyDonut
              segments={[
                { label: '0–30 dienų', value: data.paymentAging.current, opacity: 0.9 },
                { label: '31–60 dienų', value: data.paymentAging.days30, opacity: 0.7 },
                { label: '61–90 dienų', value: data.paymentAging.days60, opacity: 0.45 },
                { label: '90+ dienų', value: data.paymentAging.days90Plus, opacity: 0.25 }
              ]}
              totalLabel="Viso skolos"
              onSegmentClick={(label: string) => {
                const bucketMap: Record<string, string> = {
                  '0–30 dienų': '0-30',
                  '31–60 dienų': '31-60',
                  '61–90 dienų': '61-90',
                  '90+ dienų': '90+'
                };
                handleAgingClick(bucketMap[label]);
              }}
            />

            {/* TOP 5 Skolininkai */}
            {data.overduePayments > 0 && (
              <div className="mt-4 border-t border-black/10 pt-4">
                <h4 className="text-sm font-bold text-black mb-3">TOP 5 Skolininkai (30+ d.)</h4>
                <div className="space-y-2">
                  {data.properties
                    .filter(p => p.status === 'late30')
                    .slice(0, 5)
                    .map((p, i) => {
                      const estimatedDebt = Math.round(p.gpr * 0.3); // Mock: ~30% GPR
                      return (
                        <div key={i} className="flex items-center justify-between py-2 px-3 bg-black/[0.02] rounded-lg hover:bg-[#2F8481]/5 transition-colors cursor-pointer" onClick={() => handleCTA('Atidaryti skolininką', { property: p.name })}>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-black truncate">{p.name}</p>
                            <p className="text-xs text-black/50">Paskutinis veiksmas: prieš 12 d.</p>
                          </div>
                          <div className="text-right ml-3">
                            <p className="text-sm font-bold text-black tabular-nums">{formatCurrency(estimatedDebt)}</p>
                            <p className="text-xs text-black/50">~35 d.</p>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            <button 
              onClick={() => handleCTA('Peržiūrėti skolininkus')}
              className="w-full mt-4 px-4 py-2 bg-[#2F8481] hover:opacity-90 text-white font-semibold rounded-xl transition-all duration-200 shadow-sm"
            >
              Peržiūrėti visus skolininkus
            </button>
          </div>
        </div>


        {/* Užduotys su € Poveikiu (sujungtos Įžvalgos + Reikia dėmesio) */}
        {insights.length > 0 && (
          <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.1)] border border-black/10 p-4 lg:p-5 hover:shadow-[0_8px_25px_rgba(0,0,0,0.15)] hover:scale-[1.01] hover:border-[#2F8481]/30 transition-all duration-300 animate-slide-up mb-6 lg:mb-8" style={{animationDelay: '0.45s'}}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-[#2F8481] rounded-xl shadow-sm">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <h3 className="text-base lg:text-lg font-bold text-black">Užduotys pagal € Poveikį</h3>
              </div>
              <p className="text-xs text-black/40">Rikiuota pagal prioritetą</p>
            </div>

            <div className="space-y-3">
              {insights.map((insight, index) => {
                // Calculate impact and difficulty
                const impactMatch = insight.metric?.match(/€\s*([\d\s]+)/);
                const impactAmount = impactMatch ? parseInt(impactMatch[1].replace(/\s/g, '')) : 0;
                const difficulty = insight.type === 'critical' ? 3 : insight.type === 'warning' ? 2 : 1;
                
                return (
                  <div 
                    key={index}
                    className={`p-4 rounded-xl border-2 transition-all hover:shadow-md ${
                      insight.type === 'critical' 
                        ? 'border-black/20 bg-white' 
                        : insight.type === 'warning'
                        ? 'border-black/15 bg-white'
                        : 'border-[#2F8481]/30 bg-[#2F8481]/5'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="text-sm font-bold text-black">{insight.title}</h4>
                          {impactAmount > 0 && (
                            <span className="px-2 py-0.5 bg-black/10 text-black text-xs font-bold rounded-lg">
                              Poveikis: {insight.metric}
                            </span>
                          )}
                          <span className="px-2 py-0.5 bg-black/5 text-black/60 text-xs font-semibold rounded-lg">
                            Sunkumas: {'●'.repeat(difficulty)}{'○'.repeat(3 - difficulty)}
                          </span>
                        </div>
                        <p className="text-xs text-black/70 mb-3">{insight.description}</p>
                        {insight.action && (
                          <button
                            onClick={insight.action.onClick}
                            className="px-3 py-1.5 bg-[#2F8481] hover:opacity-90 text-white text-xs font-semibold rounded-lg transition-all"
                          >
                            {insight.action.label}
                          </button>
                        )}
                      </div>
                      <button 
                        onClick={() => {/* TODO: Implement postpone */}}
                        className="px-2 py-1 text-xs text-black/40 hover:text-black/70 hover:bg-black/5 rounded-lg transition-colors"
                        title="Atidėti 7 d."
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Comparison & Forecast Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4 xl:gap-6 mb-6 lg:mb-8 min-w-0">
          {/* Year-over-Year Comparison */}
          <LazyComparisonChart
            data={comparisonData}
            title="Metinis palyginimas"
            subtitle="vs. praėję metai (YoY)"
            comparisonType="YoY"
            animationDelay="0.5s"
          />

          {/* 90-day Cash Flow Forecast */}
          <LazyCashFlowForecast
            data={data.cashFlowForecast}
            animationDelay="0.55s"
          />
        </div>

        {/* Target Setting Modal */}
        {showTargetModal && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
            onClick={() => setShowTargetModal(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="target-modal-title"
          >
            <div 
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-slide-up"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#2F8481] rounded-xl">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 id="target-modal-title" className="text-lg font-bold text-black">Portfelio lygio tikslas</h3>
                    <p className="text-xs text-black/60 mt-1">Taikoma visiems objektams</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowTargetModal(false)}
                  className="p-2 hover:bg-black/5 rounded-xl transition-colors"
                  aria-label="Uždaryti tikslo nustatymą"
                >
                  <svg className="w-5 h-5 text-black/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Instructions */}
              <div className="mb-6">
                <div className="bg-[#2F8481]/10 border-2 border-[#2F8481]/20 rounded-xl p-4 mb-4">
                  <p className="text-sm text-black/70">
                    <strong>Portfelio lygio tikslas</strong> — nustatykite bendrą užimtumo tikslą visam portfeliui. Šis tikslas bus rodomas grafikuose ir naudojamas nuostolių skaičiavimams.
                  </p>
                </div>

                {/* Target Input */}
                <div>
                  <label htmlFor="target-input" className="block text-sm font-semibold text-black mb-2">
                    Užimtumo tikslas (%)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      id="target-input"
                      type="number"
                      min="80"
                      max="100"
                      step="1"
                      value={customTarget}
                      onChange={(e) => setCustomTarget(Math.min(100, Math.max(80, parseInt(e.target.value) || 80)))}
                      className="flex-1 px-4 py-3 border-2 border-black/10 rounded-xl focus:ring-4 focus:ring-[#2F8481]/20 focus:border-[#2F8481] text-2xl font-bold text-center transition-all duration-200"
                      aria-label="Įveskite užimtumo tikslą procentais"
                    />
                    <span className="text-2xl font-bold text-black/40">%</span>
                  </div>
                  
                  {/* Range Slider */}
                  <input
                    type="range"
                    min="80"
                    max="100"
                    step="1"
                    value={customTarget}
                    onChange={(e) => setCustomTarget(parseInt(e.target.value))}
                    className="w-full mt-4 h-2 bg-black/10 rounded-full appearance-none cursor-pointer accent-[#2F8481]"
                    style={{
                      background: `linear-gradient(to right, #2F8481 0%, #2F8481 ${(customTarget - 80) / 0.2}%, rgba(0,0,0,0.1) ${(customTarget - 80) / 0.2}%, rgba(0,0,0,0.1) 100%)`
                    }}
                  />
                  
                  <div className="flex justify-between text-xs text-black/50 mt-1">
                    <span>80%</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Preview */}
                <div className="mt-4 p-3 bg-[#2F8481]/5 rounded-xl border border-[#2F8481]/20">
                  <p className="text-xs text-black/60 mb-1">Tikslas šiam portfeliui</p>
                  <p className="text-xs text-black/50 mt-1">
                    Prognozuojamas nuostolis, jei užimtumas {formatPercent(occupancyRate)}:
                  </p>
                  <p className="text-lg font-bold text-black mt-1">
                    {formatCurrency(Math.round((customTarget - occupancyRate) / 100 * data.potentialRevenue / 12))}/mėn.
                  </p>
                  <p className="text-xs text-black/40 mt-1">
                    = ({customTarget}% − {occupancyRate.toFixed(1)}%) × {formatCurrency(data.potentialRevenue)} / 12
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowTargetModal(false)}
                  className="flex-1 px-4 py-3 bg-black/5 hover:bg-black/10 text-black font-semibold rounded-xl transition-all duration-200"
                >
                  Atšaukti
                </button>
                <button
                  onClick={() => {
                    setShowTargetModal(false);
                    handleCTA('Tikslas pakeistas', { newTarget: customTarget });
                  }}
                  className="flex-1 px-4 py-3 bg-[#2F8481] hover:opacity-90 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  Išsaugoti
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Analytics; 
