import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { FixedSizeList as List } from 'react-window';
import { X } from 'lucide-react';
import { MeterRow } from './MeterRow';
import { FilterChips } from './FilterChips';
import { useMetersFilters } from './useMetersFilters';

export type MeterUnit = 'm³' | 'kWh' | 'GJ' | 'Kitas';
export type MeterGroup = 'Individualūs' | 'Bendri';
export type MeterStatus = 'ok' | 'waiting' | 'overdue';

export interface Meter {
  id: string;
  name: string;
  kind: 'water_cold' | 'water_hot' | 'electricity' | 'heating' | 'gas' | 'ventilation' | 'shared';
  mode: MeterGroup;
  unit: MeterUnit;
  needsReading: boolean;
  needsPhoto: boolean;
  status: MeterStatus;
  lastUpdatedAt?: string;
  value?: number | null;
  photoPresent?: boolean;
  photoUrl?: string | null;
  tenantSubmittedValue?: number | null;
  tenantSubmittedAt?: string;
  isApproved?: boolean;
  hasWarning?: boolean;
  // New fields for fixed/communal meters
  isFixedMeter?: boolean;
  isCommunalMeter?: boolean;
  showPhotoRequirement?: boolean;
  costPerApartment?: number;
  // Additional pricing information
  price_per_unit?: number;
  fixed_price?: number;
  distribution_method?: string;
  description?: string;
}

interface TenantMetersModalProps {
  isOpen: boolean;
  meters: Meter[];
  onClose: () => void;
  onSaveRow: (id: string, value: number) => Promise<void>;
  onSaveAllChanged?: (changes: Array<{id: string; value: number}>) => Promise<void>;
  onOpenHistory: (id: string) => void;
  onTogglePhoto: (id: string) => void;
  onRequestMissing: (ids: string[]) => Promise<void>;
}

const ROW_HEIGHT = 48;
const VIRTUALIZATION_THRESHOLD = 12;

export const TenantMetersModal: React.FC<TenantMetersModalProps> = ({
  isOpen,
  meters,
  onClose,
  onSaveRow,
  onSaveAllChanged,
  onOpenHistory,
  onTogglePhoto,
  onRequestMissing
}) => {
  const [changedRows, setChangedRows] = useState<Map<string, number>>(new Map());
  const modalRef = useRef<HTMLDivElement>(null);
  
  const {
    activeFilter,
    filteredAndSortedMeters,
    stats,
    handleFilterChange
  } = useMetersFilters(meters);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        handleSaveAll();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, changedRows]);

  // Focus trap
  useEffect(() => {
    if (isOpen && modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      if (firstElement) firstElement.focus();
    }
  }, [isOpen]);

  const handleSaveRow = useCallback(async (id: string, value: number) => {
    try {
      await onSaveRow(id, value);
      setChangedRows(prev => {
        const newMap = new Map(prev);
        newMap.delete(id);
        return newMap;
      });
    } catch (error) {
      console.error('Error saving row:', error);
    }
  }, [onSaveRow]);

  const handleSaveAll = useCallback(async () => {
    if (!onSaveAllChanged || changedRows.size === 0) return;
    
    try {
      const changes = Array.from(changedRows.entries()).map(([id, value]) => ({ id, value }));
      await onSaveAllChanged(changes);
      setChangedRows(new Map());
    } catch (error) {
      console.error('Error saving all changes:', error);
    }
  }, [onSaveAllChanged, changedRows]);

  const handleRequestMissing = useCallback(async () => {
    const missingIds = meters
      .filter(m => m.needsPhoto || m.needsReading)
      .map(m => m.id);
    
    if (missingIds.length > 0) {
      await onRequestMissing(missingIds);
    }
  }, [meters, onRequestMissing]);

  const waitingCount = useMemo(() => 
    meters.filter(m => m.needsPhoto || m.needsReading).length, [meters]
  );

  const shouldUseVirtualization = filteredAndSortedMeters.length > VIRTUALIZATION_THRESHOLD;

  if (!isOpen) return null;

  return (
    <div 
      role="dialog" 
      aria-modal="true" 
      aria-labelledby="meters-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div 
        ref={modalRef}
        className="relative bg-white rounded-2xl shadow-2xl max-w-[1200px] w-[96vw] h-[86vh] grid grid-rows-[auto_auto_1fr_auto] overflow-hidden"
      >
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 border-b border-neutral-200 px-5 py-4 flex items-center justify-between bg-white">
          <h2 id="meters-title" className="text-lg font-semibold text-neutral-900">
            Komunaliniai skaitliukai
          </h2>
          
          <div className="flex items-center gap-4">
            {waitingCount > 0 && (
              <div className="text-center">
                <div className="text-sm font-semibold text-amber-600">{waitingCount}</div>
                <div className="text-xs text-neutral-500">laukia</div>
              </div>
            )}
            
            <button
              onClick={handleRequestMissing}
              className="h-9 px-4 rounded-lg bg-[#2F8481] text-white text-sm font-medium hover:bg-[#287672] transition-colors"
            >
              Paprašyti trūkstamų
            </button>
            
            <button
              onClick={onClose}
              className="p-2 text-neutral-500 hover:text-neutral-700 transition-colors"
              aria-label="Uždaryti"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <FilterChips
          activeFilter={activeFilter}
          onFilterChange={handleFilterChange}
          stats={stats}
        />

        {/* Virtualized List */}
        <div className="min-h-0">
          {filteredAndSortedMeters.length > 0 ? (
            shouldUseVirtualization ? (
              <List
                height={Math.floor(window.innerHeight * 0.86) - 200}
                itemCount={filteredAndSortedMeters.length}
                itemSize={ROW_HEIGHT}
                width="100%"
                className="content-auto"
              >
                {({ index, style }) => {
                  const meter = filteredAndSortedMeters[index];
                  const isActive = meter.needsPhoto || meter.needsReading || meter.status === 'overdue';
                  
                  return (
                    <div style={style}>
                      <MeterRow
                        meter={meter}
                        onSave={handleSaveRow}
                        onOpenHistory={onOpenHistory}
                        onTogglePhoto={onTogglePhoto}
                        isActive={isActive}
                        onValueChange={(id, value) => {
                          setChangedRows(prev => {
                            const newMap = new Map(prev);
                            if (value !== undefined) {
                              newMap.set(id, value);
                            } else {
                              newMap.delete(id);
                            }
                            return newMap;
                          });
                        }}
                      />
                    </div>
                  );
                }}
              </List>
            ) : (
              <div className="content-auto">
                {filteredAndSortedMeters.map((meter) => {
                  const isActive = meter.needsPhoto || meter.needsReading || meter.status === 'overdue';
                  return (
                    <MeterRow
                      key={meter.id}
                      meter={meter}
                      onSave={handleSaveRow}
                      onOpenHistory={onOpenHistory}
                      onTogglePhoto={onTogglePhoto}
                      isActive={isActive}
                      onValueChange={(id, value) => {
                        setChangedRows(prev => {
                          const newMap = new Map(prev);
                          if (value !== undefined) {
                            newMap.set(id, value);
                          } else {
                            newMap.delete(id);
                          }
                          return newMap;
                        });
                      }}
                    />
                  );
                })}
              </div>
            )
          ) : (
            <div className="text-center py-12">
              <div className="text-3xl text-neutral-300 mb-3">📊</div>
              <p className="text-neutral-500">Komunalinių skaitliukų nėra</p>
            </div>
          )}
        </div>

        {/* Sticky Footer */}
        <div className="sticky bottom-0 border-t border-neutral-200 px-5 py-3 bg-white flex items-center justify-between">
          <div className="text-sm text-neutral-600">
            Rasta: {filteredAndSortedMeters.length}
            {changedRows.size > 0 && ` • ${changedRows.size} pakeitimų neišsaugota`}
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="h-9 px-4 rounded-lg border border-neutral-300 text-sm hover:bg-neutral-50 transition-colors"
            >
              Uždaryti
            </button>
            
            {onSaveAllChanged && (
              <button
                onClick={handleSaveAll}
                disabled={changedRows.size === 0}
                className="h-9 px-4 rounded-lg bg-[#2F8481] text-white text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#287672] transition-colors"
              >
                Išsaugoti pokyčius
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
