import React from 'react';

/**
 * Insights Panel - AI-Powered Decision Support
 * 
 * Automatiškai generuoja insights pagal duomenis:
 * - Trends (augimas/mažėjimas)
 * - Anomalijos (staigūs pokyčiai)
 * - Rekomendacijos (veiksmai)
 * 
 * Palette: #2F8481, #000, #fff
 */

export interface Insight {
  type: 'success' | 'warning' | 'info' | 'critical';
  title: string;
  description: string;
  metric?: string; // pvz., "-2.3 %", "€1 400"
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface InsightsPanelProps {
  insights: Insight[];
  animationDelay?: string;
}

const InsightsPanel: React.FC<InsightsPanelProps> = ({ insights, animationDelay = '0s' }) => {
  if (insights.length === 0) return null;

  const getIcon = (type: Insight['type']) => {
    switch (type) {
      case 'success':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'critical':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'info':
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const getStyle = (type: Insight['type']) => {
    switch (type) {
      case 'success':
        return 'border-[#2F8481] bg-[#2F8481]/5';
      case 'warning':
        return 'border-black/20 bg-black/5';
      case 'critical':
        return 'border-black/40 bg-black/10';
      case 'info':
      default:
        return 'border-[#2F8481]/20 bg-[#2F8481]/5';
    }
  };

  return (
    <div 
      className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.1)] border border-black/10 p-4 lg:p-5 hover:shadow-[0_4px_6px_rgba(0,0,0,0.1)] transition-all duration-300 animate-slide-up"
      style={{ animationDelay }}
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-[#2F8481] rounded-xl shadow-sm">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <div>
          <h3 className="text-base lg:text-lg font-bold text-black">Pagrindinės įžvalgos</h3>
          <p className="text-xs text-black/60 mt-0.5">AI analizė</p>
        </div>
        <span className="ml-auto text-xs font-bold px-2 py-1 rounded-lg bg-[#2F8481]/10 text-black">
          {insights.length}
        </span>
      </div>

      <div className="space-y-3">
        {insights.map((insight, index) => (
          <div
            key={index}
            className={`border-2 rounded-xl p-3 transition-all hover:scale-[1.01] ${getStyle(insight.type)}`}
          >
            <div className="flex items-start gap-3">
              <div className={`flex-shrink-0 mt-0.5 ${
                insight.type === 'success' ? 'text-[#2F8481]' : 
                insight.type === 'critical' ? 'text-black' : 
                'text-black/60'
              }`}>
                {getIcon(insight.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-bold text-black">{insight.title}</p>
                  {insight.metric && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
                      insight.type === 'success' 
                        ? 'bg-[#2F8481] text-white' 
                        : 'bg-black/10 text-black'
                    }`}>
                      {insight.metric}
                    </span>
                  )}
                </div>
                <p className="text-xs text-black/70 leading-relaxed">{insight.description}</p>
                {insight.action && (
                  <button
                    onClick={insight.action.onClick}
                    className="mt-2 text-xs font-semibold text-[#2F8481] hover:underline"
                  >
                    {insight.action.label} →
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InsightsPanel;

