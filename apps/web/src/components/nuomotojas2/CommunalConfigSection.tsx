import React, { useState } from 'react';
import { CommunalConfig } from '../../types/communal';
import { CommunalConfigManager } from '../communal/CommunalConfigManager';

interface CommunalConfigSectionProps {
  address: string;
  currentConfig?: CommunalConfig;
  onConfigChange: (config: CommunalConfig) => void;
}

export const CommunalConfigSection: React.FC<CommunalConfigSectionProps> = ({
  address,
  currentConfig,
  onConfigChange
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-black/10 bg-white">
      {/* Header */}
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-neutral-50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#2F8481] rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-neutral-800">Komunalinių konfigūracija</h3>
            <p className="text-sm text-neutral-600">Skaitliukai ir kainos adresui: {address}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {currentConfig && (
            <div className="flex items-center gap-1 text-sm text-neutral-500">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              Konfigūruota
            </div>
          )}
          <svg 
            className={`w-5 h-5 text-neutral-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="border-t border-neutral-200 p-4">
          <CommunalConfigManager
            address={address}
            currentConfig={currentConfig}
            onConfigChange={onConfigChange}
          />
        </div>
      )}
    </div>
  );
};



