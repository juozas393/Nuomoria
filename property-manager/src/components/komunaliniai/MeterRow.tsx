import React, { useState, useCallback, useMemo } from 'react';
import { Droplets, Bolt, Flame, Fan, Building2, Camera, Clock } from 'lucide-react';
import { Meter } from './TenantMetersModal';

interface MeterRowProps {
  meter: Meter;
  onSave: (id: string, value: number) => void;
  onOpenHistory: (id: string) => void;
  onTogglePhoto: (id: string) => void;
  isActive?: boolean;
  onValueChange: (id: string, value: number | undefined) => void;
}

const getMeterIcon = (kind: Meter['kind']) => {
  switch (kind) {
    case 'water_cold':
    case 'water_hot':
      return Droplets;
    case 'electricity':
      return Bolt;
    case 'heating':
    case 'gas':
      return Flame;
    case 'ventilation':
      return Fan;
    case 'shared':
      return Building2;
    default:
      return Bolt;
  }
};

export const MeterRow: React.FC<MeterRowProps> = React.memo(({
  meter,
  onSave,
  onOpenHistory,
  onTogglePhoto,
  isActive = false,
  onValueChange
}) => {
  const [inputValue, setInputValue] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  const Icon = getMeterIcon(meter.kind);
  const hasChanges = inputValue !== '' && Number(inputValue) !== meter.value;

  const statusClasses = useMemo(() => {
    switch (meter.status) {
      case 'ok':
        return 'bg-[#E8F5F4] text-[#2F8481]';
      case 'waiting':
        return 'bg-amber-50 text-amber-700';
      case 'overdue':
        return 'bg-rose-50 text-rose-700';
      default:
        return 'bg-neutral-100 text-neutral-700';
    }
  }, [meter.status]);

  const statusText = useMemo(() => {
    switch (meter.status) {
      case 'ok':
        return 'Pateikta';
      case 'waiting':
        return 'Laukiama';
      case 'overdue':
        return 'Vėluoja';
      default:
        return 'Nežinoma';
    }
  }, [meter.status]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    if (value === '') {
      onValueChange(meter.id, undefined);
    } else {
      const numValue = Number(value);
      if (!isNaN(numValue)) {
        onValueChange(meter.id, numValue);
      }
    }
  }, [meter.id, onValueChange]);

  const handleSave = useCallback(async () => {
    if (!hasChanges || isSaving) return;

    setIsSaving(true);
    try {
      await onSave(meter.id, Number(inputValue));
      setInputValue('');
      onValueChange(meter.id, undefined);
    } catch (error) {
      console.error('Error saving reading:', error);
    } finally {
      setIsSaving(false);
    }
  }, [hasChanges, isSaving, inputValue, meter.id, onSave, onValueChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && hasChanges) {
      e.preventDefault();
      handleSave();
    }
  }, [hasChanges, handleSave]);

  const iconColor = isActive ? 'text-[#2F8481]' : 'text-neutral-500';

  return (
    <div className="grid grid-cols-[28px,1fr,120px,84px,92px,112px,100px,72px] items-center gap-3 px-3 h-12 border-b border-neutral-200 text-sm hover:bg-neutral-50 transition-colors">
      {/* Icon + Name */}
      <div className="flex items-center gap-2">
        <Icon className={`size-5 ${iconColor}`} aria-hidden />
        <div className="truncate text-neutral-900">{meter.name}</div>
      </div>

      {/* Mode chip */}
      <div className="text-xs px-2 py-1 rounded-full bg-neutral-100 text-neutral-700 w-fit">
        {meter.mode}
      </div>

      {/* Input with unit suffix */}
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={meter.unit}
          className="w-[84px] h-8 rounded-lg border border-neutral-300 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F8481]/40 tabular-nums"
          disabled={isSaving}
          aria-label={`${meter.name} – rodmuo`}
        />
        <span className="text-sm text-neutral-500">{meter.unit}</span>
      </div>

      {/* Photo status */}
      <button
        onClick={() => onTogglePhoto(meter.id)}
        className={`inline-flex items-center gap-1 h-8 rounded-lg px-2 text-sm border transition-colors ${
          meter.photoPresent
            ? 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
            : 'border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100'
        }`}
        aria-pressed={meter.photoPresent}
        aria-label={`${meter.photoPresent ? 'Yra' : 'Reikia'} nuotraukų`}
      >
        <Camera className="size-4" />
        {meter.photoPresent ? 'Yra' : 'Reikia'}
      </button>

      {/* Status */}
      <span className={`text-xs px-2 py-1 rounded-lg w-fit font-medium ${statusClasses}`}>
        {statusText}
      </span>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={!hasChanges || isSaving}
        className="h-8 px-3 rounded-lg bg-[#2F8481] text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#287672] transition-colors"
      >
        {isSaving ? '...' : 'Išsaugoti'}
      </button>

      {/* History link */}
      <button
        onClick={() => onOpenHistory(meter.id)}
        className="text-xs text-[#2F8481] hover:underline transition-colors"
        aria-label="Peržiūrėti istoriją"
      >
        Istorija
      </button>
    </div>
  );
});

MeterRow.displayName = 'MeterRow';
