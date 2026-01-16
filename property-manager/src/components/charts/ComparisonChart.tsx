import React, { useMemo } from 'react';

/**
 * Comparison Chart - Year-over-Year / Quarter-over-Quarter
 * 
 * Lyginimas tarp laikotarpių su delta rodikliais
 * Palette: #2F8481, #000, #fff
 */

export interface ComparisonData {
  label: string;
  current: number;
  previous: number;
  unit: 'currency' | 'percent' | 'number';
}

export interface ComparisonChartProps {
  data: ComparisonData[];
  title: string;
  subtitle?: string;
  comparisonType: 'YoY' | 'QoQ' | 'MoM';
  animationDelay?: string;
}

const formatValue = (value: number, unit: ComparisonData['unit']): string => {
  if (unit === 'currency') {
    return new Intl.NumberFormat('lt-LT', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0
    }).format(value).replace(/\s/g, ' ');
  } else if (unit === 'percent') {
    return `${value.toFixed(1).replace('.', ',')} %`;
  }
  return value.toString();
};

const ComparisonChart: React.FC<ComparisonChartProps> = ({
  data,
  title,
  subtitle,
  comparisonType,
  animationDelay = '0s'
}) => {
  const maxValue = useMemo(() => {
    return Math.max(...data.map(d => Math.max(d.current, d.previous))) * 1.1;
  }, [data]);

  return (
    <div 
      className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.1)] border border-black/10 p-4 lg:p-5 hover:shadow-[0_4px_6px_rgba(0,0,0,0.1)] transition-all duration-300 animate-slide-up"
      style={{ animationDelay }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base lg:text-lg font-bold text-black">{title}</h3>
          {subtitle && <p className="text-xs text-black/60 mt-1">{subtitle}</p>}
        </div>
        <span className="px-3 py-1 bg-[#2F8481]/10 text-[#2F8481] text-xs font-bold rounded-lg border border-[#2F8481]/20">
          {comparisonType}
        </span>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-[#2F8481] rounded"></div>
          <span className="text-xs text-black/70">Dabartinis</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-black/20 rounded"></div>
          <span className="text-xs text-black/70">Praėjęs</span>
        </div>
      </div>

      {/* Bars */}
      <div className="space-y-4">
        {data.map((item, index) => {
          const currentWidth = (item.current / maxValue) * 100;
          const previousWidth = (item.previous / maxValue) * 100;
          const delta = item.current - item.previous;
          const deltaPercent = item.previous > 0 ? (delta / item.previous) * 100 : 0;

          return (
            <div key={index} className="group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-black">{item.label}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-black/50">
                    {formatValue(item.previous, item.unit)}
                  </span>
                  <span className="text-sm font-bold text-black tabular-nums">
                    {formatValue(item.current, item.unit)}
                  </span>
                  <span 
                    className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
                      delta > 0 
                        ? 'bg-[#2F8481]/10 text-black' 
                        : delta < 0 
                        ? 'bg-black/10 text-black' 
                        : 'bg-black/5 text-black/50'
                    }`}
                  >
                    {delta > 0 ? '↑' : delta < 0 ? '↓' : '='} {Math.abs(deltaPercent).toFixed(1)} %
                  </span>
                </div>
              </div>
              <div className="relative h-8 bg-black/5 rounded-lg overflow-hidden">
                {/* Previous bar (background) */}
                <div 
                  className="absolute inset-y-0 left-0 bg-black/20 transition-all duration-500"
                  style={{ width: `${previousWidth}%` }}
                />
                {/* Current bar (foreground) */}
                <div 
                  className="absolute inset-y-0 left-0 bg-[#2F8481] transition-all duration-500 group-hover:opacity-90"
                  style={{ width: `${currentWidth}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ComparisonChart;

