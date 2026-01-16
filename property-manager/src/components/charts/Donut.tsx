import React, { useMemo } from "react";

type Segment = {
  label: string;
  value: number;
  opacity: number; // e.g., 1.0, 0.7, 0.45, 0.25
};

interface Props {
  segments: Segment[];
  totalLabel?: string;
  onSegmentClick?: (label: string) => void;
  size?: number;
}

const PRIMARY = "#2F8481";

export default function Donut({
  segments,
  totalLabel = "Viso",
  onSegmentClick,
  size = 180
}: Props) {
  const total = useMemo(() => segments.reduce((sum, s) => sum + s.value, 0), [segments]);
  
  const radius = size / 2 - 8;
  const innerRadius = radius * 0.65; // Thinner ring (65% vs 60%)
  const cx = size / 2;
  const cy = size / 2;

  // Generate arcs
  const arcs = useMemo(() => {
    let currentAngle = -90; // Start at top
    
    return segments.map((seg) => {
      const percent = total > 0 ? seg.value / total : 0;
      const angle = percent * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      
      // Calculate arc path
      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;
      
      const x1 = cx + radius * Math.cos(startRad);
      const y1 = cy + radius * Math.sin(startRad);
      const x2 = cx + radius * Math.cos(endRad);
      const y2 = cy + radius * Math.sin(endRad);
      
      const x3 = cx + innerRadius * Math.cos(endRad);
      const y3 = cy + innerRadius * Math.sin(endRad);
      const x4 = cx + innerRadius * Math.cos(startRad);
      const y4 = cy + innerRadius * Math.sin(startRad);
      
      const largeArc = angle > 180 ? 1 : 0;
      
      const path = [
        `M ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
        `L ${x3} ${y3}`,
        `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4}`,
        'Z'
      ].join(' ');
      
      currentAngle = endAngle;
      
      return {
        path,
        segment: seg,
        percent
      };
    });
  }, [segments, total, size]);

  return (
    <div className="flex flex-col lg:flex-row items-center gap-4">
      {/* Donut SVG */}
      <svg width={size} height={size} className="flex-shrink-0 mx-auto lg:mx-0">
        {arcs.map((arc, i) => (
          <g key={i}>
            <path
              d={arc.path}
              fill={PRIMARY}
              fillOpacity={arc.segment.opacity}
              className={onSegmentClick ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}
              onClick={onSegmentClick ? () => onSegmentClick(arc.segment.label) : undefined}
              aria-label={onSegmentClick ? `Filtruoti: ${arc.segment.label}` : undefined}
            />
          </g>
        ))}
        
        {/* Center text */}
        <text
          x={cx}
          y={cy - 8}
          textAnchor="middle"
          fontSize="12"
          fill="rgba(0,0,0,0.6)"
          fontWeight="600"
        >
          {totalLabel}
        </text>
        <text
          x={cx}
          y={cy + 10}
          textAnchor="middle"
          fontSize="20"
          fill="#000"
          fontWeight="bold"
        >
          {new Intl.NumberFormat('lt-LT', {
            style: 'currency',
            currency: 'EUR',
            maximumFractionDigits: 0
          }).format(total)}
        </text>
      </svg>
      
      {/* Legend - 2 columns on larger screens */}
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-1.5 w-full">
        {segments.map((seg, i) => {
          const percent = total > 0 ? (seg.value / total) * 100 : 0;
          return (
            <button
              key={i}
              onClick={onSegmentClick ? () => onSegmentClick(seg.label) : undefined}
              className={`flex items-center justify-between p-2 rounded-lg transition-all ${
                onSegmentClick ? 'hover:bg-[#2F8481]/10 cursor-pointer' : ''
              }`}
              aria-label={onSegmentClick ? `Filtruoti ${seg.label}` : undefined}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="w-3 h-3 rounded flex-shrink-0"
                  style={{
                    backgroundColor: PRIMARY,
                    opacity: seg.opacity
                  }}
                ></div>
                <span className="text-xs font-medium text-black truncate">{seg.label}</span>
              </div>
              <div className="text-right flex-shrink-0 ml-2">
                <span className="text-xs font-bold text-black tabular-nums">
                  {new Intl.NumberFormat('lt-LT', {
                    style: 'currency',
                    currency: 'EUR',
                    maximumFractionDigits: 0
                  }).format(seg.value)}
                </span>
                <span className="text-xs text-black/50 tabular-nums">
                  {' • '}{new Intl.NumberFormat('lt-LT', {maximumFractionDigits: 1}).format(percent)} %
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

