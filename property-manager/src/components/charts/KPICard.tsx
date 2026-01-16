import React from 'react';

/**
 * KPI Card - "Sprendimų kortelė"
 * 
 * Rodo ne tik skaičių, bet ir:
 * - Tikslą (jei taikoma)
 * - Delta (pokytį vs praėjęs laikotarpis)
 * - Progress bar arba sparkline
 * - Pirminį CTA
 * - Tooltip su formule
 * 
 * 100% Palette: #2F8481, #000, #fff
 */

export interface KPICardProps {
  // Core
  icon: React.ReactNode;
  title: string;
  value: string; // Formatuotas skaičius (pvz., "91,5 %", "8 450 €")
  subtitle?: string; // Kontekstas po reikšme (pvz., "vs. praėjęs mėn. 8 310 €")
  
  // Status indicator (P0 - spėjama interpretacija)
  status?: 'success' | 'warning' | 'danger' | 'default';
  
  // Badge (viršutinis dešinysis kampas)
  badge?: {
    text: string;
    variant: 'default' | 'success' | 'warning';
    onClick?: () => void; // Optional: make badge clickable
  };
  
  // Progress / Target
  progress?: {
    current: number; // 0-100
    target?: number; // 0-100
    label?: string; // pvz., "Tikslas: 95 %"
  };
  
  // Delta (pokytis)
  delta?: {
    value: string; // formatuotas (pvz., "+1,7 %", "−0,8 %")
    direction: 'up' | 'down' | 'neutral';
    label?: string; // pvz., "vs praėjęs mėn."
  };
  
  // Sparkline (mini grafikas) - P0: padidinti aukštį
  sparkline?: {
    data: number[]; // 6 reikšmės (paskutiniai 6 mėn.)
    min: number;
    max: number;
  };
  
  // Actions
  primaryCTA?: {
    label: string;
    onClick: () => void;
  };
  secondaryCTA?: {
    label: string;
    onClick: () => void;
    variant?: 'low' | 'medium' | 'high'; // Risk level colors
  };
  
  // Tooltip - P0: aiškiai aprašyti skaičiavimus
  tooltip?: string;
  onTooltipClick?: () => void;
  
  // Styling
  animationDelay?: string;
  onClick?: () => void; // Jei visa kortelė clickable
}

const KPICard: React.FC<KPICardProps> = ({
  icon,
  title,
  value,
  subtitle,
  status = 'default',
  badge,
  progress,
  delta,
  sparkline,
  primaryCTA,
  secondaryCTA,
  tooltip,
  onTooltipClick,
  animationDelay = '0s',
  onClick
}) => {
  // P0: Status indikatorius (spėjama interpretacija)
  const getStatusIcon = () => {
    switch (status) {
      case 'success':
        return <span className="text-green-600">✓</span>;
      case 'warning':
        return <span className="text-yellow-600">⚠</span>;
      case 'danger':
        return <span className="text-red-600">!</span>;
      default:
        return null;
    }
  };

  // P0: Status spalva kortelei
  const getStatusBorder = () => {
    switch (status) {
      case 'success':
        return 'border-green-200 bg-green-50/30';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50/30';
      case 'danger':
        return 'border-red-200 bg-red-50/30';
      default:
        return 'border-black/10';
    }
  };
  return (
    <div 
      className={`bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.1)] border ${getStatusBorder()} p-2 lg:p-3 hover:shadow-[0_8px_25px_rgba(0,0,0,0.15)] hover:scale-[1.02] hover:border-[#2F8481]/30 transition-all duration-300 animate-slide-up min-w-0 w-full ${onClick ? 'cursor-pointer' : ''}`}
      style={{ animationDelay, transform: 'none' }}
      onClick={onClick}
    >
      {/* Header Row */}
      <div className="flex items-start justify-between mb-2">
        {/* Icon */}
        <div className="p-1.5 bg-[#2F8481] rounded-lg shadow-sm">
          {icon}
        </div>
        
        {/* Badge or Tooltip (status icon hidden when badge exists) */}
        <div className="flex items-center gap-2">
          {!badge && getStatusIcon()}
          {badge && (
            <span 
              onClick={(e) => {
                if (badge.onClick) {
                  e.stopPropagation();
                  badge.onClick();
                }
              }}
              className={`inline-flex items-center gap-1.5 text-[13px] font-semibold px-2 py-1 rounded-full transition-opacity whitespace-nowrap border ${
                badge.variant === 'success' 
                  ? 'bg-[#2F8481]/10 text-black border-[#2F8481]/20' 
                  : badge.variant === 'warning'
                  ? 'bg-black/5 text-black border-black/20'
                  : 'bg-[#2F8481]/10 text-black border-[#2F8481]/20'
              } ${badge.onClick ? 'cursor-pointer hover:opacity-70' : ''}`}
              style={{ 
                lineHeight: '1.2',
                letterSpacing: '0',
                transform: 'none'
              }}
              title={badge.onClick ? 'Spustelėkite peržiūrėti' : undefined}
            >
              {badge.text}
            </span>
          )}
          {tooltip && (
            <button 
              className="text-xs font-medium text-[#2F8481] hover:underline"
              onClick={(e) => {
                e.stopPropagation();
                onTooltipClick?.();
              }}
              aria-label={`Informacija apie ${title}`}
            >
              ⓘ
            </button>
          )}
        </div>
      </div>
      
      {/* Title */}
      <p className="text-[12px] font-semibold text-black/60 mb-1" style={{ lineHeight: '1.35' }}>{title}</p>
      
      {/* Main Value */}
      <p 
        className="text-[20px] lg:text-[24px] font-bold text-black mb-1 tabular-nums" 
        style={{ 
          lineHeight: '1.1', 
          letterSpacing: '-0.005em',
          fontVariantNumeric: 'tabular-nums lining-nums'
        }}
      >
        {value}
      </p>
      
      {/* Subtitle / Context */}
      {subtitle && (
        <p className="text-[13px] font-medium text-black/50 mb-2 truncate" style={{ lineHeight: '1.4', opacity: 0.8 }}>
          {subtitle}
        </p>
      )}
      
      {/* Delta Chip */}
      {delta && (
        <div className="flex items-center gap-1 mb-2">
          <span 
            className={`inline-flex items-center text-[13px] font-semibold px-2 py-1 rounded-full ${
              delta.direction === 'up' 
                ? 'bg-[#2F8481]/10 text-black' 
                : 'bg-black/5 text-black'
            }`}
            style={{ 
              lineHeight: '1.2',
              letterSpacing: '0',
              transform: 'none'
            }}
          >
            {delta.direction === 'up' ? '↑' : delta.direction === 'down' ? '↓' : '='} {delta.value}
          </span>
          {delta.label && (
            <span className="text-[13px] font-medium text-black/50" style={{ lineHeight: '1.4' }}>
              {delta.label}
            </span>
          )}
        </div>
      )}
      
      {/* Progress Bar */}
      {progress && (
        <div className="mb-2">
          {progress.label && (
            <div className="flex items-center mb-1">
              <span className="text-[13px] font-medium text-black/60" style={{ lineHeight: '1.4' }}>
                {progress.label}
              </span>
            </div>
          )}
          <div className="w-full bg-black/10 rounded-full h-3 shadow-inner relative">
            <div 
              className={`h-3 rounded-full transition-all duration-500 shadow-sm relative overflow-hidden ${
                progress.target && progress.current >= progress.target 
                  ? 'bg-[#2F8481]' 
                  : 'bg-black/30'
              }`}
              style={{ width: `${Math.min(100, progress.current)}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
            </div>
            {/* Target marker - 1px vertical line, 8px tall */}
            {progress.target && (
              <div 
                className="absolute top-1/2 w-px h-2 bg-black/50 -translate-y-1/2"
                style={{ left: `${progress.target}%` }}
                title={`Tikslas: ${progress.target}%`}
              />
            )}
          </div>
        </div>
      )}
      
      {/* Sparkline - Sharp rendering with proper padding */}
      {sparkline && (
        <div className="mb-2 min-w-0 w-full overflow-hidden">
          <svg 
            className="w-full h-6 min-w-0" 
            viewBox="0 0 100 24" 
            preserveAspectRatio="xMidYMid meet" 
            style={{ width: '100%', height: '24px', minWidth: '80px' }}
            width="100%"
            height="24"
          >
            {/* Zero line */}
            <line x1="10" y1="22.5" x2="90" y2="22.5" stroke="rgba(0,0,0,0.05)" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
            <polyline
              fill="none"
              stroke="#2F8481"
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              shapeRendering="geometricPrecision"
              points={sparkline.data.map((val, i) => {
                const x = 10 + (i / (sparkline.data.length - 1)) * 80; // 10-90 range for padding
                const normalized = (val - sparkline.min) / (sparkline.max - sparkline.min);
                const y = 4 + (1 - normalized) * 24; // 4-28 range, inverted
                return `${x.toFixed(2)},${y.toFixed(2)}`; // Sub-pixel precision for smoothness
              }).join(' ')}
            />
            {/* Last point emphasized - larger dot, no text */}
            {(() => {
              const last = sparkline.data[sparkline.data.length - 1];
              const normalized = (last - sparkline.min) / (sparkline.max - sparkline.min);
              const y = 4 + (1 - normalized) * 24;
              return (
                <g>
                  <circle
                    cx="90"
                    cy={y.toFixed(2)}
                    r="2.5"
                    fill="#2F8481"
                    stroke="white"
                    strokeWidth="1.5"
                    vectorEffect="non-scaling-stroke"
                  >
                    <title>Dabartinė reikšmė</title>
                  </circle>
                </g>
              );
            })()}
          </svg>
        </div>
      )}
      
      {/* Actions */}
      {(primaryCTA || secondaryCTA) && (
        <div className="flex flex-col gap-2 pt-2 border-t border-black/5">
          {primaryCTA && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                primaryCTA.onClick();
              }}
              className="text-[13px] font-semibold text-[#2F8481] hover:underline text-left transition-opacity hover:opacity-70"
              style={{ 
                lineHeight: '1.4',
                transform: 'none'
              }}
            >
              {primaryCTA.label}
            </button>
          )}
          {secondaryCTA && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                secondaryCTA.onClick();
              }}
              className={`inline-flex items-center text-[13px] font-semibold px-2.5 py-1.5 rounded-lg hover:opacity-90 transition-opacity border text-left ${
                secondaryCTA.variant === 'high' 
                  ? 'bg-red-50 text-red-700 border-red-200' 
                  : secondaryCTA.variant === 'medium'
                  ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                  : 'bg-black/5 text-black/70 border-black/10'
              }`}
              style={{ 
                lineHeight: '1.2',
                transform: 'none'
              }}
              title={secondaryCTA.variant === 'high' ? 'Didelė rizika' : secondaryCTA.variant === 'medium' ? 'Vidutinė rizika' : 'Maža rizika'}
            >
              {secondaryCTA.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default KPICard;

