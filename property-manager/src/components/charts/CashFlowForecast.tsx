import React, { useState, useMemo } from 'react';

/**
 * Cash Flow Forecast - 90 dienų prognozė
 * 
 * Rodo:
 * - Planned (planuojamos pajamos)
 * - Expected (tikėtinos pajamos)
 * - Risk (rizikos zona)
 * - Confidence level (aukštas/vidutinis/žemas)
 * 
 * Palette: #2F8481, #000, #fff
 */

export interface CashFlowDataPoint {
  week: string;
  planned: number;
  expected: number;
  risk: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface CashFlowForecastProps {
  data: CashFlowDataPoint[];
  animationDelay?: string;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('lt-LT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0
  }).format(amount).replace(/\s/g, ' ');
};

const CashFlowForecast: React.FC<CashFlowForecastProps> = ({ data, animationDelay = '0s' }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const maxValue = useMemo(() => {
    return Math.max(...data.map(d => Math.max(d.planned, d.expected, d.planned + d.risk))) * 1.05;
  }, [data]);

  const totalPlanned = useMemo(() => data.reduce((sum, d) => sum + d.planned, 0), [data]);
  const totalExpected = useMemo(() => data.reduce((sum, d) => sum + d.expected, 0), [data]);
  const totalRisk = useMemo(() => data.reduce((sum, d) => sum + d.risk, 0), [data]);

  // SVG dimensions
  const width = 800;
  const height = 280;
  const padding = { top: 20, right: 40, bottom: 40, left: 50 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const barWidth = innerWidth / data.length * 0.7;
  const x = (i: number) => padding.left + (innerWidth / data.length) * i + (innerWidth / data.length) * 0.15;
  const y = (value: number) => padding.top + innerHeight * (1 - value / maxValue);

  return (
    <div 
      className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.1)] border border-black/10 p-4 lg:p-5 hover:shadow-[0_4px_6px_rgba(0,0,0,0.1)] transition-all duration-300 animate-slide-up"
      style={{ animationDelay }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-base lg:text-lg font-bold text-black">Pinigų srautų prognozė</h3>
          <p className="text-xs text-black/60 mt-1">Ateinančios 12 savaičių (~90 d.)</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-black/50">Tikėtina</p>
            <p className="text-sm font-bold text-black">{formatCurrency(totalExpected)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-black/50">Rizika</p>
            <p className="text-sm font-bold text-black/60">{formatCurrency(totalRisk)}</p>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-[#2F8481] rounded"></div>
          <span className="text-xs text-black/70">Planuojama</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-[#2F8481]/35 rounded"></div>
          <span className="text-xs text-black/70">Tikėtina</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-black/10 rounded"></div>
          <span className="text-xs text-black/70">Rizika</span>
        </div>
      </div>

      {/* Chart */}
      <div className="relative" style={{ height: `${height}px` }}>
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
          {/* Grid */}
          {[0, 25, 50, 75, 100].map(percent => {
            const gridY = y(maxValue * percent / 100);
            return (
              <g key={percent}>
                <line
                  x1={padding.left}
                  y1={gridY}
                  x2={width - padding.right}
                  y2={gridY}
                  stroke="rgba(0,0,0,0.05)"
                  strokeWidth="1"
                />
                <text
                  x={padding.left - 5}
                  y={gridY + 3}
                  textAnchor="end"
                  fontSize="9"
                  fill="rgba(0,0,0,0.5)"
                >
                  {formatCurrency(maxValue * percent / 100)}
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {data.map((point, index) => {
            const barX = x(index);
            const plannedHeight = innerHeight * (point.planned / maxValue);
            const expectedHeight = innerHeight * (point.expected / maxValue);
            const riskHeight = innerHeight * (point.risk / maxValue);
            
            const confidenceOpacity = point.confidence === 'high' ? 1 : point.confidence === 'medium' ? 0.7 : 0.4;

            return (
              <g 
                key={index}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="cursor-pointer"
              >
                {/* Planned bar */}
                <rect
                  x={barX}
                  y={y(point.planned)}
                  width={barWidth}
                  height={plannedHeight}
                  fill="#2F8481"
                  opacity={confidenceOpacity * (hoveredIndex === index ? 0.8 : 1)}
                  className="transition-opacity"
                />
                
                {/* Expected bar (overlay) */}
                <rect
                  x={barX}
                  y={y(point.expected)}
                  width={barWidth}
                  height={expectedHeight}
                  fill="#2F8481"
                  opacity={0.35 * confidenceOpacity}
                />
                
                {/* Risk zone (above planned) */}
                {point.risk > 0 && (
                  <rect
                    x={barX}
                    y={y(point.planned + point.risk)}
                    width={barWidth}
                    height={riskHeight}
                    fill="rgba(0,0,0,0.1)"
                    strokeDasharray="2 2"
                    stroke="rgba(0,0,0,0.2)"
                    strokeWidth="1"
                  />
                )}
                
                {/* Week label */}
                <text
                  x={barX + barWidth / 2}
                  y={height - padding.bottom + 15}
                  textAnchor="middle"
                  fontSize="8"
                  fill="rgba(0,0,0,0.65)"
                >
                  {point.week.split(' ')[0]}
                </text>
                
                {/* Confidence indicator */}
                <circle
                  cx={barX + barWidth / 2}
                  cy={height - padding.bottom + 28}
                  r="2"
                  fill={
                    point.confidence === 'high' 
                      ? '#2F8481' 
                      : point.confidence === 'medium' 
                      ? 'rgba(0,0,0,0.4)' 
                      : 'rgba(0,0,0,0.2)'
                  }
                />
              </g>
            );
          })}
        </svg>

        {/* Tooltip */}
        {hoveredIndex !== null && (
          <div 
            className="absolute bg-black text-white text-xs rounded-lg p-3 shadow-xl pointer-events-none z-10 min-w-[160px]"
            style={{
              left: `${((hoveredIndex + 0.5) / data.length) * 100}%`,
              top: '10%',
              transform: 'translateX(-50%)'
            }}
          >
            <p className="font-bold mb-2">{data[hoveredIndex].week}</p>
            <div className="space-y-1">
              <div className="flex justify-between gap-3">
                <span>Planuojama:</span>
                <span className="font-bold">{formatCurrency(data[hoveredIndex].planned)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span>Tikėtina:</span>
                <span className="font-bold">{formatCurrency(data[hoveredIndex].expected)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span>Rizika:</span>
                <span className="font-bold">{formatCurrency(data[hoveredIndex].risk)}</span>
              </div>
              <div className="flex justify-between gap-3 pt-1 border-t border-white/20">
                <span>Patikimumas:</span>
                <span className="font-bold capitalize">{
                  data[hoveredIndex].confidence === 'high' ? 'Aukštas' :
                  data[hoveredIndex].confidence === 'medium' ? 'Vidutinis' : 'Žemas'
                }</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-black/10 grid grid-cols-3 gap-4">
        <div>
          <p className="text-xs text-black/50 mb-1">Bendra planuojama</p>
          <p className="text-sm font-bold text-black">{formatCurrency(totalPlanned)}</p>
        </div>
        <div>
          <p className="text-xs text-black/50 mb-1">Bendra tikėtina</p>
          <p className="text-sm font-bold text-[#2F8481]">{formatCurrency(totalExpected)}</p>
        </div>
        <div>
          <p className="text-xs text-black/50 mb-1">Bendra rizika</p>
          <p className="text-sm font-bold text-black/60">{formatCurrency(totalRisk)}</p>
        </div>
      </div>
    </div>
  );
};

export default CashFlowForecast;

