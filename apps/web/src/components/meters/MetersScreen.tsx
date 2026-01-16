import React, { useMemo, useState, useDeferredValue, useCallback } from "react";
import { Meter } from "../../types/meters";

// Simple icon components
const Camera = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const History = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const Play = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const Search = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const MoreHorizontal = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
  </svg>
);

type MetersScreenProps = {
  meters: Meter[];
  onReadingSubmit?: (meterId: string, reading: number) => void;
  onPhotoUpload?: (meterId: string) => void;
  onHistoryView?: (meterId: string) => void;
  onCollectAll?: () => void;
};

type TabType = "individual" | "communal";

export function MetersScreen({ 
  meters, 
  onReadingSubmit, 
  onPhotoUpload, 
  onHistoryView, 
  onCollectAll 
}: MetersScreenProps) {
  const [query, setQuery] = useState("");
  const [onlyPhoto, setOnlyPhoto] = useState(false);
  const [tab, setTab] = useState<TabType>("individual");

  const deferredQ = useDeferredValue(query);

  const filtered = useMemo(() => {
    const byTab = meters.filter(m =>
      tab === "individual" ? m.mode === 'individual' : m.mode === 'communal'
    );
    const byPhoto = onlyPhoto ? byTab.filter(m => m.photoRequired) : byTab;
    const q = deferredQ.trim().toLowerCase();
    return q ? byPhoto.filter(m => (m.name || m.title || '').toLowerCase().includes(q)) : byPhoto;
  }, [meters, tab, onlyPhoto, deferredQ]);

  return (
    <div className="flex flex-col h-full">
      {/* Sticky toolbar */}
      <div className="sticky top-0 z-10 bg-white/95 border-b border-gray-200">
        <div className="max-w-[1200px] mx-auto px-4 py-3 flex items-center gap-2">
          <div className="flex rounded-md border overflow-hidden">
            <button 
              onClick={() => setTab("individual")}
              className={`px-3 h-9 text-sm transition-colors ${
                tab === "individual" 
                  ? "bg-[var(--pm-primary)] text-white" 
                  : "bg-white hover:bg-gray-50"
              }`}
            >
              Individualūs
            </button>
            <button 
              onClick={() => setTab("communal")}
              className={`px-3 h-9 text-sm transition-colors ${
                tab === "communal" 
                  ? "bg-[var(--pm-primary)] text-white" 
                  : "bg-white hover:bg-gray-50"
              }`}
            >
              Bendri
            </button>
          </div>
          
          <div className="flex-1" />
          
          <div className="relative">
            <input 
              className="pm-input w-64 pl-9" 
              placeholder="Ieškoti skaitliuko…" 
              value={query} 
              onChange={e => setQuery(e.target.value)} 
            />
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[var(--pm-muted)]" />
          </div>
          
          <label className="ml-2 flex items-center gap-2 text-sm">
            <input 
              type="checkbox" 
              checked={onlyPhoto} 
              onChange={e => setOnlyPhoto(e.target.checked)} 
              className="rounded border-gray-300"
            />
            Reikia nuotraukos
          </label>
          
          <button 
            className="pm-btn pm-btn-primary ml-2"
            onClick={onCollectAll}
          >
            <Play className="h-4 w-4 mr-2" /> 
            Surinkti rodmenis
          </button>
        </div>
      </div>

      {/* List */}
      <div className="max-w-[1200px] mx-auto px-4 py-3 w-full flex-1">
        <div className="pm-card rounded-xl">
          {/* Header */}
          <div className="grid grid-cols-[1.2fr_.9fr_.7fr_.9fr_auto] gap-2 h-10 items-center px-3 text-xs text-neutral-500 sticky top-12 bg-white/95 border-b">
            <span>Skaitliukas</span>
            <span>Paskutinis</span>
            <span>Vienetas</span>
            <span>Naujas rodmuo</span>
            <span>Veiksmai</span>
          </div>
          
          {/* Meter rows */}
          <div className="max-h-[520px] overflow-y-auto">
            {filtered.map((meter) => (
              <MeterRow 
                key={meter.id}
                meter={meter} 
                onReadingSubmit={onReadingSubmit}
                onPhotoUpload={onPhotoUpload}
                onHistoryView={onHistoryView}
              />
            ))}
          </div>
          
          {filtered.length === 0 && (
            <div className="flex items-center justify-center h-32 text-gray-500">
              <div className="text-center">
                <p className="text-sm">Nėra skaitliukų</p>
                <p className="text-xs text-gray-400">Pakeiskite filtrus arba pridėkite naują skaitliuką</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface MeterRowProps {
  meter: Meter;
  onReadingSubmit?: (meterId: string, reading: number) => void;
  onPhotoUpload?: (meterId: string) => void;
  onHistoryView?: (meterId: string) => void;
}

function MeterRow({ meter, onReadingSubmit, onPhotoUpload, onHistoryView }: MeterRowProps) {
  const [newReading, setNewReading] = useState("");
  const [isValid, setIsValid] = useState(true);

  const handleReadingChange = (value: string) => {
    setNewReading(value);
    // Validation will be added when we have current reading data
    setIsValid(true);
  };

  const handleSubmit = () => {
    if (newReading && onReadingSubmit) {
      onReadingSubmit(meter.id, parseFloat(newReading));
      setNewReading("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const getStatusPills = () => {
    const pills = [];
    
    if (meter.photoRequired) {
      pills.push(
        <span key="photo" className="pm-pill pm-pill-ok">
          Reikia nuotraukos
        </span>
      );
    } else {
      pills.push(
        <span key="ok" className="pm-pill">
          OK
        </span>
      );
    }
    
    if (!meter.active) {
      pills.push(
        <span key="inactive" className="pm-pill">
          Neaktyvus
        </span>
      );
    }
    
    return pills;
  };

  return (
    <div className="grid grid-cols-[1.2fr_.9fr_.7fr_.9fr_auto] gap-2 items-center px-3 h-14 border-b border-gray-100 hover:bg-gray-50 transition-colors">
      {/* Pavadinimas + statusas */}
      <div className="flex items-center gap-3 min-w-0">
        <Dot type={meter.kind || 'water_cold'} />
        <div className="min-w-0">
          <div className="truncate text-sm text-[var(--pm-text)] font-medium">
            {meter.name || meter.title || 'Nežinomas skaitliukas'}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {getStatusPills()}
          </div>
        </div>
      </div>

      {/* Paskutinis rodmuo */}
      <div className="text-sm text-neutral-700">
        — {/* Will be populated with actual reading data */}
      </div>
      
      {/* Vienetas */}
      <div className="text-sm text-neutral-700">
        {meter.unit}
      </div>

      {/* Naujas rodmuo */}
      <div>
        <input 
          className={`pm-input w-full ${!isValid ? 'border-red-300 focus:border-red-500' : ''}`}
          type="number" 
          placeholder="Įvesti…" 
          inputMode="decimal"
          value={newReading}
          onChange={e => handleReadingChange(e.target.value)}
          onKeyPress={handleKeyPress}
          title={!isValid ? "Negali būti mažiau nei paskutinis rodmuo" : ""}
        />
      </div>

      {/* Veiksmai */}
      <div className="flex items-center gap-2 justify-end">
        <button 
          className="pm-btn pm-btn-ghost hover:bg-gray-100" 
          title="Nuotrauka"
          onClick={() => onPhotoUpload?.(meter.id)}
        >
          <Camera className="h-4 w-4" />
        </button>
        <button 
          className="pm-btn pm-btn-ghost hover:bg-gray-100" 
          title="Istorija"
          onClick={() => onHistoryView?.(meter.id)}
        >
          <History className="h-4 w-4" />
        </button>
        <button 
          className="pm-btn pm-btn-ghost hover:bg-gray-100" 
          title="Daugiau"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function Dot({ type }: { type: string }) {
  const color = "#2F8481";
  return (
    <div 
      className="shrink-0 h-2.5 w-2.5 rounded-full" 
      style={{ background: color }}
    />
  );
}
