import React, { useState, useCallback, useMemo } from 'react';
import { MeterRow, type Meter } from './MeterRow';
import { MetersFilters, type FilterType } from './MetersFilters';

interface MetersCompactProps {
  meters: Meter[];
  onSaveReading: (meterId: string, reading: number) => void;
  onRequestPhoto: (meterId: string) => void;
  onViewHistory: (meterId: string) => void;
  onRequestMissing: () => void;
}



const MetersCompact: React.FC<MetersCompactProps> = ({
  meters,
  onSaveReading,
  onRequestPhoto,
  onViewHistory,
  onRequestMissing
}) => {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  // Filtruojame ir rūšiuojame skaitliukus
  const filteredAndSortedMeters = useMemo(() => {
    let filtered = meters;

    // Filtravimas
    switch (activeFilter) {
      case 'needs_photo':
        filtered = meters.filter(m => m.needsPhoto);
        break;
      case 'needs_reading':
        filtered = meters.filter(m => m.needsReading);
        break;
      case 'overdue':
        filtered = meters.filter(m => m.status === 'overdue');
        break;
      case 'individual':
        filtered = meters.filter(m => m.group === 'Individualūs');
        break;
      case 'communal':
        filtered = meters.filter(m => m.group === 'Bendri');
        break;
      default:
        filtered = meters;
    }

    // Rūšiavimas: reikia veiksmo -> vėluoja -> likę
    return filtered.sort((a, b) => {
      const aNeedsAction = a.needsPhoto || a.needsReading;
      const bNeedsAction = b.needsPhoto || b.needsReading;
      
      if (aNeedsAction && !bNeedsAction) return -1;
      if (!aNeedsAction && bNeedsAction) return 1;
      
      if (a.status === 'overdue' && b.status !== 'overdue') return -1;
      if (a.status !== 'overdue' && b.status === 'overdue') return 1;
      
      return a.name.localeCompare(b.name);
    });
  }, [meters, activeFilter]);

  // Skaičiuojame statistikas
  const stats = useMemo(() => {
    const needsPhoto = meters.filter(m => m.needsPhoto).length;
    const needsReading = meters.filter(m => m.needsReading).length;
    const overdue = meters.filter(m => m.status === 'overdue').length;
    const individual = meters.filter(m => m.group === 'Individualūs').length;
    const communal = meters.filter(m => m.group === 'Bendri').length;

    return {
      all: meters.length,
      needsPhoto,
      needsReading,
      overdue,
      individual,
      communal
    };
  }, [meters]);

  // Skaičiuojame laukiančių skaičių
  const waitingCount = useMemo(() => 
    meters.filter(m => m.needsPhoto || m.needsReading).length, [meters]
  );

  const handleSaveReading = useCallback(async (meterId: string, reading: number) => {
    await onSaveReading(meterId, reading);
  }, [onSaveReading]);

  const handleRequestPhoto = useCallback((meterId: string) => {
    onRequestPhoto(meterId);
  }, [onRequestPhoto]);

  const handleViewHistory = useCallback((meterId: string) => {
    onViewHistory(meterId);
  }, [onViewHistory]);

  const handleFilterChange = useCallback((filter: FilterType) => {
    setActiveFilter(filter);
  }, []);



  return (
    <div className="space-y-0">
      {/* Sticky header su statistikomis */}
      <div className="sticky top-0 z-10 flex items-center justify-between p-3 bg-neutral-50 border-b border-neutral-200 shadow-sm">
        <div>
          <h3 className="text-sm font-semibold text-ink">Komunaliniai skaitliukai</h3>
          <p className="text-xs text-neutral-500">{filteredAndSortedMeters.length} skaitliukų</p>
        </div>
        
        <div className="flex items-center gap-4">
          {waitingCount > 0 && (
            <div className="text-center">
              <div className="text-sm font-semibold text-amber-600">{waitingCount}</div>
              <div className="text-xs text-neutral-500">laukia</div>
            </div>
          )}
          
          <button
            onClick={onRequestMissing}
            className="px-3 py-1.5 text-xs bg-[#2F8481] text-white rounded-lg hover:bg-[#2a7673] transition-colors font-medium"
          >
            Paprašyti trūkstamų
          </button>
        </div>
      </div>

      {/* Filtrai */}
      <MetersFilters
        activeFilter={activeFilter}
        onFilterChange={handleFilterChange}
        counts={stats}
      />

             {/* Sąrašas */}
       <div className="bg-paper border border-neutral-200 rounded-b-lg overflow-hidden">
         {filteredAndSortedMeters.length > 0 ? (
           <div className="content-auto">
             {filteredAndSortedMeters.map((meter, index) => {
               const isActive = meter.needsPhoto || meter.needsReading || meter.status === 'overdue';
               return (
                 <MeterRow
                   key={meter.id}
                   meter={meter}
                   onSave={handleSaveReading}
                   onOpenHistory={handleViewHistory}
                   onOpenPhotos={handleRequestPhoto}
                   isActive={isActive}
                 />
               );
             })}
           </div>
         ) : (
           <div className="text-center py-8">
             <div className="text-2xl text-neutral-300 mb-2">📊</div>
             <p className="text-neutral-500 text-sm">Komunalinių skaitliukų nėra</p>
           </div>
         )}
       </div>
    </div>
  );
};

export default React.memo(MetersCompact);
