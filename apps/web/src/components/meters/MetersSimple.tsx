import React, { useMemo, useState } from "react";
import { Meter } from "../../types/meters";

// Simple icon components
const Camera = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const Save = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
  </svg>
);

const Check = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

type MetersSimpleProps = {
  meters: Meter[];
  onSaveReading?: (id: string, value: number) => Promise<void> | void;
  onOpenPhoto?: (id: string) => void;
  onRequestMissing?: () => void;
};

export function MetersSimple({
  meters,
  onSaveReading,
  onOpenPhoto,
  onRequestMissing,
}: MetersSimpleProps) {
  const [month, setMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [filter, setFilter] = useState<"all" | "photo" | "reading">("all");
  const [draft, setDraft] = useState<Record<string, string>>({});

  const stats = useMemo(() => ({
    photo: meters.filter(m => m.photoRequired).length,
    reading: meters.filter(m => !m.active).length // Assuming inactive means needs reading
  }), [meters]);

  const data = useMemo(() => {
    let arr = meters;
    if (filter === "photo") arr = arr.filter(m => m.photoRequired);
    if (filter === "reading") arr = arr.filter(m => !m.active);
    return arr;
  }, [meters, filter]);

  const groups = useMemo(() => {
    return ["individual", "communal"].map(g => ({
      name: g === "individual" ? "Individualūs" : "Bendri",
      rows: data.filter(m => m.mode === g)
    })).filter(g => g.rows.length);
  }, [data]);

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="max-w-[1100px] mx-auto px-4 py-3 flex items-center gap-2">
          <input
            type="month"
            className="pm-input"
            value={month}
            onChange={e => setMonth(e.target.value)}
          />
          <div className="ml-2 flex items-center gap-1">
            <button 
              className={`pm-btn ${filter === "all" ? "border-[var(--pm-primary)] text-[var(--pm-primary)]" : ""}`} 
              onClick={() => setFilter("all")}
            >
              Visi
            </button>
            <button 
              className={`pm-btn ${filter === "photo" ? "border-[var(--pm-primary)] text-[var(--pm-primary)]" : ""}`} 
              onClick={() => setFilter("photo")}
            >
              Reikia foto ({stats.photo})
            </button>
            <button 
              className={`pm-btn ${filter === "reading" ? "border-[var(--pm-primary)] text-[var(--pm-primary)]" : ""}`} 
              onClick={() => setFilter("reading")}
            >
              Reikia rodmens ({stats.reading})
            </button>
          </div>
          <div className="flex-1" />
          <button 
            className="pm-btn pm-btn-primary" 
            onClick={onRequestMissing}
          >
            Išsiųsti prašymą trūkstamiems
          </button>
        </div>
      </div>

      {/* List */}
      <div className="max-w-[1100px] mx-auto w-full">
        {groups.map(g => (
          <div key={g.name} className="mb-6">
            <div className="text-sm font-medium text-[var(--pm-muted)] mb-2">{g.name}</div>
            <div className="pm-card rounded-xl overflow-hidden">
              <Header />
              {g.rows.map((m, idx) => (
                <Row
                  key={m.id}
                  meter={m}
                  odd={idx % 2 === 1}
                  value={draft[m.id] ?? ""}
                  onChange={(v) => setDraft(d => ({ ...d, [m.id]: v }))}
                  onSave={async () => {
                    const val = Number((draft[m.id] ?? "").replace(",", "."));
                    if (!Number.isFinite(val)) return;
                    await onSaveReading?.(m.id, val);
                    setDraft(d => ({ ...d, [m.id]: "" }));
                  }}
                  onOpenPhoto={() => onOpenPhoto?.(m.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="grid grid-cols-[1.4fr_.9fr_.9fr_.9fr_auto] gap-2 px-3 h-10 items-center text-xs text-neutral-500 border-b bg-white">
              <span>Skaitliukas</span>
      <span>Paskutinis</span>
      <span>Foto</span>
      <span>Naujas rodmuo</span>
      <span className="text-right">Veiksmai</span>
    </div>
  );
}

function Row({
  meter,
  odd,
  value,
  onChange,
  onSave,
  onOpenPhoto
}: {
  meter: Meter;
  odd: boolean;
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  onOpenPhoto: () => void;
}) {
  // For demo purposes, we'll assume no current reading data
  const lastReading = null; // This would come from actual meter readings
  const invalid = value !== "" && lastReading != null && Number(value.replace(",", ".")) < lastReading;
  
  return (
    <div className={`grid grid-cols-[1.4fr_.9fr_.9fr_.9fr_auto] gap-2 px-3 h-14 items-center border-b ${odd ? "bg-neutral-50" : ""}`}>
      <div className="flex items-center gap-3 min-w-0">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#2F8481" }} />
        <div className="truncate text-sm">{meter.title}</div>
      </div>
      <div className="text-sm">{lastReading ?? "—"} {lastReading != null ? meter.unit : ""}</div>
      <div className="flex items-center gap-2">
        {meter.photoRequired ? (
          <span className="pm-pill">Reikia</span>
        ) : (
          <span className="pm-pill pm-pill-ok">
            <Check className="h-3 w-3 mr-1 inline" />
            Yra
          </span>
        )}
        <button className="pm-btn" onClick={onOpenPhoto}>
          <Camera className="h-4 w-4" />
        </button>
      </div>
      <div>
        <input
          className={`pm-input w-full ${invalid ? "border-red-300" : ""}`}
          placeholder={`… ${meter.unit}`}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") onSave(); }}
          inputMode="decimal"
        />
        {invalid && (
          <div className="text-xs text-red-500 mt-0.5">
            Negali būti mažiau nei {lastReading}
          </div>
        )}
      </div>
      <div className="flex justify-end">
        <button className="pm-btn pm-btn-primary" onClick={onSave}>
          <Save className="h-4 w-4 mr-2" />
          Išsaugoti
        </button>
      </div>
    </div>
  );
}
