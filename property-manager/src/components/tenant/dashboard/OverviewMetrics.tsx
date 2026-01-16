import React from 'react';

export type OverviewMetricTone = 'primary' | 'warning' | 'success' | 'neutral';

export interface OverviewMetric {
  id: string;
  label: string;
  value: string;
  caption?: string;
  tone?: OverviewMetricTone;
}

const toneStyles: Record<OverviewMetricTone, string> = {
  primary: 'border-[#2F8481] text-[#2F8481]',
  warning: 'border-black/20 text-black',
  success: 'border-black/10 text-black',
  neutral: 'border-black/10 text-black'
};

function metricTone(tone?: OverviewMetricTone): OverviewMetricTone {
  return tone ?? 'neutral';
}

export interface OverviewMetricsProps {
  metrics: OverviewMetric[];
}

export const OverviewMetrics: React.FC<OverviewMetricsProps> = ({ metrics }) => {
  if (metrics.length === 0) {
    return (
      <div className="rounded-2xl border border-black/10 bg-white px-6 py-5 text-sm text-black/60 shadow-sm">
        Duomenų nėra.
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => {
        const toneClass = toneStyles[metricTone(metric.tone)];
        return (
          <article
            key={metric.id}
            className={`rounded-2xl border bg-white px-5 py-4 shadow-sm transition hover:shadow-md ${toneClass}`}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/50">{metric.label}</p>
            <p className="mt-3 text-2xl font-semibold text-black">{metric.value}</p>
            {metric.caption && <p className="mt-1 text-xs text-black/60">{metric.caption}</p>}
          </article>
        );
      })}
    </div>
  );
};

export default OverviewMetrics;

















