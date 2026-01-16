import React, { useMemo, useCallback } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Chart } from 'react-chartjs-2';

// Register Chart.js components once
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export interface RevenueDataPoint {
  month: string;
  monthFull: string;
  billed: number;
  paid: number;
  outstanding: number;
  target: number;
}

export interface RevenueChartProps {
  data: RevenueDataPoint[];
  targetCollection?: number;
  height?: number;
  onMonthClick?: (month: string, index: number) => void;
  animationDelay?: string;
}

// Optimized currency formatter with memoization
const formatCurrency = (amount: number): string => {
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(0)}k €`;
  }
  return `${amount} €`;
};

const RevenueChart: React.FC<RevenueChartProps> = ({
  data,
  targetCollection = 95,
  height = 500,
  onMonthClick,
  animationDelay = "0s",
}) => {
  // Memoized example data
  const exampleData = useMemo(() => [
    { month: "1", monthFull: "Sausis", billed: 45000, paid: 42000, outstanding: 3000, target: 40000 },
    { month: "2", monthFull: "Vasaris", billed: 52000, paid: 48000, outstanding: 4000, target: 45000 },
    { month: "3", monthFull: "Kovas", billed: 48000, paid: 45000, outstanding: 3000, target: 42000 },
    { month: "4", monthFull: "Balandis", billed: 55000, paid: 50000, outstanding: 5000, target: 48000 },
    { month: "5", monthFull: "Gegužė", billed: 50000, paid: 47000, outstanding: 3000, target: 46000 },
    { month: "6", monthFull: "Birželis", billed: 58000, paid: 52000, outstanding: 6000, target: 50000 },
    { month: "7", monthFull: "Liepa", billed: 47000, paid: 44000, outstanding: 3000, target: 43000 },
    { month: "8", monthFull: "Rugpjūtis", billed: 51000, paid: 48000, outstanding: 3000, target: 47000 },
    { month: "9", monthFull: "Rugsėjis", billed: 54000, paid: 50000, outstanding: 4000, target: 49000 },
    { month: "10", monthFull: "Spalis", billed: 49000, paid: 46000, outstanding: 3000, target: 45000 },
    { month: "11", monthFull: "Lapkritis", billed: 53000, paid: 49000, outstanding: 4000, target: 48000 },
    { month: "12", monthFull: "Gruodis", billed: 56000, paid: 52000, outstanding: 4000, target: 51000 }
  ], []);

  const displayData = useMemo(() => 
    data && data.length > 0 ? data : exampleData, 
    [data, exampleData]
  );

  // Memoized calculations
  const calculations = useMemo(() => {
    const totalBilled = displayData.reduce((sum, d) => sum + d.billed, 0);
    const totalPaid = displayData.reduce((sum, d) => sum + d.paid, 0);
    const totalOutstanding = displayData.reduce((sum, d) => sum + d.outstanding, 0);
    const totalTarget = displayData.reduce((sum, d) => sum + d.target, 0);
    
    const totalUnpaid = totalBilled - totalPaid;
    const notDue = Math.max(0, totalUnpaid - totalOutstanding);
    const collectionRate = (totalPaid / totalBilled) * 100;
    const targetAchievement = (totalBilled / totalTarget) * 100;
    
    return {
      totalBilled,
      totalPaid,
      totalOutstanding,
      totalTarget,
      totalUnpaid,
      notDue,
      collectionRate,
      targetAchievement,
      rateChange: collectionRate - 95.8 // Simulated previous month rate
    };
  }, [displayData]);

  const {
    totalBilled,
    totalPaid,
    totalOutstanding,
    totalTarget,
    totalUnpaid,
    notDue,
    collectionRate,
    targetAchievement,
    rateChange
  } = calculations;

  // Memoized chart data
  const chartData = useMemo(() => ({
    labels: ['Finansų būsena'],
    datasets: [
      {
        label: 'Surinkta',
        data: [totalPaid],
        backgroundColor: 'rgba(47, 132, 129, 0.9)',
        borderColor: '#2F8481',
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      },
      {
        label: 'Neapmokėta',
        data: [notDue],
        backgroundColor: 'rgba(156, 163, 175, 0.9)',
        borderColor: '#9ca3af',
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      },
      {
        label: 'Vėluoja',
        data: [totalOutstanding],
        backgroundColor: 'rgba(245, 158, 11, 0.9)',
        borderColor: '#f59e0b',
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      },
    ],
  }), [totalPaid, notDue, totalOutstanding]);

  // Memoized chart options
  const options = useMemo(() => ({
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 1000, // Reduced animation time
      easing: 'easeInOutQuart' as const,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 14,
            weight: 'bold' as const,
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#2F8481',
        borderWidth: 2,
        cornerRadius: 8,
        callbacks: {
          label: function(context: any) {
            const value = context.parsed.x;
            const percentage = ((value / (totalPaid + notDue + totalOutstanding)) * 100).toFixed(1);
            if (context.dataset.label === 'Neapmokėta') {
              return `Neapmokėta: ${formatCurrency(value)} (${percentage}%)`;
            } else if (context.dataset.label === 'Vėluoja') {
              return `Vėluoja: ${formatCurrency(value)} (${percentage}%)`;
            }
            return `${context.dataset.label}: ${formatCurrency(value)} (${percentage}%)`;
          },
          footer: function(context: any) {
            return `Iš viso išrašyta: ${formatCurrency(totalBilled)}`;
          },
        },
      },
    },
    scales: {
      x: {
        stacked: true,
        display: true,
        title: {
          display: true,
          text: 'Suma (€)',
          font: {
            size: 14,
            weight: 'bold' as const,
          },
          color: '#374151',
        },
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.05)',
          lineWidth: 1,
        },
        ticks: {
          font: {
            size: 12,
            weight: 'bold' as const,
          },
          color: '#6b7280',
          callback: function(value: any) {
            if (value >= 1000) {
              return `${(value / 1000).toFixed(0)}k`;
            }
            return value.toString();
          },
        },
      },
      y: {
        stacked: true,
        display: false,
      },
    },
  }), [totalPaid, notDue, totalOutstanding, totalBilled]);

  return (
    <div 
      className="col-span-12 lg:col-span-6 relative z-0 bg-white rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-black/5 p-6 lg:p-8 hover:shadow-[0_16px_48px_rgba(0,0,0,0.12)] transition-all duration-500 animate-slide-up overflow-hidden"
      style={{ animationDelay }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-br from-[#2F8481] to-[#2F8481]/80 rounded-2xl flex items-center justify-center shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
        <div>
            <h3 className="text-xl lg:text-2xl font-bold text-black">Finansų analizė</h3>
            <p className="text-sm text-black/60 mt-1 font-medium">Surinkimas ir tikslų pasiekimas</p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="bg-gradient-to-br from-[#2F8481]/5 via-[#2F8481]/10 to-[#2F8481]/15 p-6 rounded-2xl border border-[#2F8481]/20 shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-2 h-2 bg-[#2F8481] rounded-full"></div>
                <p className="text-sm text-[#2F8481] font-semibold">Surinkimas</p>
                <span className="text-xs text-black/60">(šis mėnuo)</span>
              </div>
              <p className="text-3xl font-bold text-[#2F8481] mb-1">{collectionRate.toFixed(1).replace('.', ',')}%</p>
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-16 h-1 bg-[#2F8481]/20 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#2F8481] rounded-full transition-all duration-1000"
                    style={{ width: `${Math.min(collectionRate, 100)}%` }}
                  ></div>
                </div>
                <span className="text-xs text-[#2F8481]/60 font-medium">tikslas 98%</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className={`text-xs font-medium ${rateChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {rateChange >= 0 ? '+' : ''}{rateChange.toFixed(1).replace('.', ',')} proc. punkto vs praeitą mėn.
                </span>
              </div>
            </div>
            <div className="w-12 h-12 bg-[#2F8481]/10 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-[#2F8481]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-[#2F8481]/5 via-[#2F8481]/10 to-[#2F8481]/15 p-6 rounded-2xl border border-[#2F8481]/20 shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-2 h-2 bg-[#2F8481] rounded-full"></div>
                <p className="text-sm text-[#2F8481] font-semibold">Tikslų pasiekimas</p>
              </div>
              <p className="text-3xl font-bold text-[#2F8481] mb-1">{targetAchievement.toFixed(1).replace('.', ',')}%</p>
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-16 h-1 bg-[#2F8481]/20 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#2F8481] rounded-full transition-all duration-1000"
                    style={{ width: `${Math.min(targetAchievement, 100)}%` }}
                  ></div>
                </div>
                <span className="text-xs text-[#2F8481]/60 font-medium">tikslas 98%</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-[#2F8481]/10 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-[#2F8481]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar Chart */}
      <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-6 border border-black/5 overflow-visible" style={{ height: `${height - 200}px` }}>
        
        <Chart 
          type="bar" 
          data={chartData} 
          options={options}
          style={{ 
            maxHeight: '300px',
            width: '100%'
          }}
        />
        
      </div>


    </div>
  );
};

// Memoized component for better performance
export default React.memo(RevenueChart);