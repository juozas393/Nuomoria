import React, { useState, useCallback, useMemo } from 'react';
import { Clock, Camera } from 'lucide-react';
import { getMeterIcon, getMeterName, type MeterType } from './iconMap';

export type Status = 'ok' | 'waiting' | 'overdue';

export type Meter = {
  id: string;
  type: MeterType;
  name: string;
  unit: 'm³' | 'kWh' | 'GJ';
  group: 'Individualūs' | 'Bendri';
  last?: number;
  lastDate?: string;
  needsPhoto: boolean;
  needsReading: boolean;
  status: Status;
};

interface MeterRowProps {
  meter: Meter;
  onSave: (meterId: string, value: number) => void;
  onOpenHistory: (meterId: string) => void;
  onOpenPhotos: (meterId: string) => void;
  isActive?: boolean;
}

export const MeterRow: React.FC<MeterRowProps> = React.memo(({
  meter,
  onSave,
  onOpenHistory,
  onOpenPhotos,
  isActive = false
}) => {
  const [val, setVal] = useState<number | ''>('');
  const [isSaving, setIsSaving] = useState(false);

  const Icon = getMeterIcon(meter.type);
  const dirty = val !== '' && val !== meter.last;

  const handleSave = useCallback(async () => {
    if (val === '' || val === meter.last) return;
    
    setIsSaving(true);
    try {
      await onSave(meter.id, Number(val));
      setVal('');
    } catch (error) {
      console.error('Error saving reading:', error);
    } finally {
      setIsSaving(false);
    }
  }, [val, meter.last, meter.id, onSave]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && dirty) {
      handleSave();
    }
  }, [dirty, handleSave]);

  const statusClasses = useMemo(() => {
    switch (meter.status) {
      case 'ok':
        return 'bg-[#E8F5F4] text-[#2F8481]';
      case 'waiting':
        return 'bg-amber-50 text-amber-700';
      case 'overdue':
        return 'bg-red-50 text-red-600';
      default:
        return 'bg-neutral-100 text-neutral-700';
    }
  }, [meter.status]);

  const statusText = useMemo(() => {
    switch (meter.status) {
      case 'ok':
        return 'OK';
      case 'waiting':
        return 'Laukiama';
      case 'overdue':
        return 'Vėluoja';
      default:
        return 'Nežinoma';
    }
  }, [meter.status]);

  const iconColor = isActive ? 'text-[#2F8481]' : 'text-neutral-500';

  return (
    <div className="grid grid-cols-[28px,1fr,160px,220px,120px,120px,auto] items-center gap-3 h-14 px-3
                    border-b border-neutral-200 text-[13px] hover:bg-neutral-50 transition-colors">
      {/* Ikona */}
      <Icon className={`h-5 w-5 ${iconColor}`} />

      {/* Pavadinimas + grupė */}
      <div className="min-w-0">
        <div className="truncate text-neutral-900 font-medium">{meter.name}</div>
        <div className="mt-0.5 inline-flex items-center rounded-full bg-neutral-100 px-2 py-[2px] text-[11px] text-neutral-700">
          {meter.group}
        </div>
      </div>

      {/* Paskutinis */}
      <div className="text-neutral-600 tabular-nums">
        {meter.last ?? '–'} {meter.unit}
        <span className="ml-2 text-neutral-400 text-[11px]">{meter.lastDate ?? ''}</span>
      </div>

      {/* Įvedimas su vienetu kaip suffix */}
      <div className="flex items-center gap-2">
        <input
          value={val}
          onChange={(e) => setVal(e.target.value === '' ? '' : Number(e.target.value))}
          onKeyDown={handleKeyDown}
          placeholder={meter.unit}
          className="w-28 h-8 rounded-lg border border-neutral-300 px-2 focus:outline-none
                     focus:ring-2 focus:ring-[#2F8481] tabular-nums text-[13px]"
          inputMode="decimal"
          disabled={isSaving}
          aria-label={`Įveskite ${getMeterName(meter.type)} rodmenį`}
        />
        <span className="text-neutral-500 text-[13px]">{meter.unit}</span>
      </div>

      {/* Foto būsena */}
      <button 
        onClick={() => onOpenPhotos(meter.id)}
        className={`inline-flex items-center gap-1 h-8 px-2 rounded-lg border transition-colors
                    ${meter.needsPhoto 
                      ? 'border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100' 
                      : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'}`}
        aria-label={`${meter.needsPhoto ? 'Trūksta' : 'Yra'} nuotraukų`}
      >
        <Camera className="h-4 w-4" />
        <span className="text-[12px]">{meter.needsPhoto ? 'Trūksta' : 'Yra'}</span>
      </button>

      {/* Statusas */}
      <span className={`inline-flex h-8 items-center px-2 rounded-lg text-[12px] font-medium ${statusClasses}`}>
        {statusText}
      </span>

      {/* Veiksmai */}
      <div className="flex items-center gap-2">
        <button
          disabled={!dirty || isSaving}
          onClick={handleSave}
          className="h-8 rounded-lg bg-[#2F8481] text-white px-3 disabled:opacity-40 disabled:cursor-not-allowed
                     hover:bg-[#2a7673] transition-colors text-[12px] font-medium"
        >
          {isSaving ? (
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
              <span>Saugoma</span>
            </div>
          ) : (
            'Išsaugoti'
          )}
        </button>
        <button 
          onClick={() => onOpenHistory(meter.id)} 
          className="h-8 px-2 text-neutral-600 hover:text-neutral-900 transition-colors"
          aria-label="Peržiūrėti istoriją"
        >
          <Clock className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
});

MeterRow.displayName = 'MeterRow';



