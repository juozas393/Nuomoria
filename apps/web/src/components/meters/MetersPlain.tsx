import React, { useMemo, useState } from "react";
import { Meter } from "../../types/meters";

type MetersPlainProps = {
  meters: Meter[];
  onSaveReading?: (id: string, value: number) => Promise<void> | void;
  onOpenPhoto?: (id: string) => void;
  onRequestMissing?: () => void;
};

export function MetersPlain({
  meters,
  onSaveReading,
  onOpenPhoto,
  onRequestMissing,
}: MetersPlainProps) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [filter, setFilter] = useState<"all" | "photo" | "reading">("all");
  const [draft, setDraft] = useState<Record<string, string>>({});

  const stats = useMemo(
    () => ({
      photo: meters.filter(m => m.photoRequired).length,
      reading: meters.filter(m => !m.active).length,
    }),
    [meters]
  );

  const data = useMemo(() => {
    if (filter === "photo") return meters.filter(m => m.photoRequired);
    if (filter === "reading") return meters.filter(m => !m.active);
    return meters;
  }, [meters, filter]);

  async function saveOne(id: string) {
    const raw = (draft[id] ?? "").trim().replace(",", ".");
    if (!raw) return;
    const val = Number(raw);
    if (!Number.isFinite(val)) return;
    await onSaveReading?.(id, val);
    setDraft(d => ({ ...d, [id]: "" }));
  }

  async function saveAllVisible() {
    for (const m of data) {
      const v = draft[m.id];
      if (v && v.trim()) await saveOne(m.id);
    }
  }

  return (
    <div className="text-[#111]">
      {/* Toolbar */}
      <div className="sticky top-0 z-10 bg-white/95 border-b border-neutral-200">
        <div className="mx-auto max-w-[1100px] px-4 py-3 flex flex-wrap gap-8 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm text-neutral-600">Mėnuo</label>
            <input
              type="month"
              value={month}
              onChange={e => setMonth(e.target.value)}
              className="h-9 px-3 rounded-md border border-neutral-200"
            />
          </div>

          <div className="flex items-center gap-4 text-sm">
            <button
              className={`h-9 px-3 rounded-md border ${filter === "all" ? "border-[#2F8481] text-[#2F8481]" : "border-neutral-200 text-neutral-700"}`}
              onClick={() => setFilter("all")}
            >
              Visi
            </button>
            <button
              className={`h-9 px-3 rounded-md border ${filter === "photo" ? "border-[#2F8481] text-[#2F8481]" : "border-neutral-200 text-neutral-700"}`}
              onClick={() => setFilter("photo")}
            >
              Reikia foto ({stats.photo})
            </button>
            <button
              className={`h-9 px-3 rounded-md border ${filter === "reading" ? "border-[#2F8481] text-[#2F8481]" : "border-neutral-200 text-neutral-700"}`}
              onClick={() => setFilter("reading")}
            >
              Reikia rodmens ({stats.reading})
            </button>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <button
              className="h-9 px-3 rounded-md border border-neutral-200 text-neutral-800"
              title="Ctrl+Enter"
              onClick={saveAllVisible}
            >
              Išsaugoti matomus
            </button>
            <button
              className="h-9 px-3 rounded-md text-white"
              style={{ background: "#2F8481" }}
              onClick={onRequestMissing}
            >
              Paprašyti trūkstamų
            </button>
          </div>
        </div>
      </div>

      {/* Sąrašas */}
      <div className="mx-auto max-w-[1100px] px-4 py-8">
        <ul className="divide-y divide-neutral-200">
          {data.map(m => {
            // For demo purposes, we'll assume no current reading data
            const lastReading = null; // This would come from actual meter readings
            const lastDate = null; // This would come from actual meter readings
            const invalid =
              draft[m.id]?.trim() &&
              lastReading != null &&
              Number((draft[m.id] ?? "").replace(",", ".")) < lastReading;

            return (
              <li key={m.id} className="py-3">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                  {/* Pavadinimas */}
                  <div className="min-w-[220px]">
                    <span className="font-medium">{m.title}</span>
                    <span className="ml-2 text-xs text-neutral-500">
                      ({m.mode === "individual" ? "Individualūs" : "Bendri"})
                    </span>
                  </div>

                  {/* Paskutinis */}
                  <div className="text-sm text-neutral-700">
                    Paskutinis:{" "}
                    {lastReading != null ? (
                      <b>
                        {lastReading} {m.unit}
                      </b>
                    ) : (
                      <span className="text-neutral-400">—</span>
                    )}
                    {lastDate ? (
                      <span className="text-neutral-400"> · {lastDate}</span>
                    ) : null}
                  </div>

                  {/* Foto */}
                  <div className="text-sm">
                    Foto:{" "}
                    {m.photoRequired ? (
                      <span className="text-amber-600">reikia</span>
                    ) : (
                      <span className="text-[#2F8481]">yra</span>
                    )}{" "}
                    <button
                      className="underline decoration-[#2F8481] decoration-2 underline-offset-2"
                      onClick={() => onOpenPhoto?.(m.id)}
                    >
                      [Foto]
                    </button>
                  </div>

                  {/* Naujas rodmuo */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-neutral-600">Naujas:</label>
                    <input
                      className={`h-9 px-3 rounded-md border text-sm ${
                        invalid ? "border-red-300" : "border-neutral-200"
                      }`}
                      placeholder={`… ${m.unit}`}
                      value={draft[m.id] ?? ""}
                      onChange={e =>
                        setDraft(d => ({ ...d, [m.id]: e.target.value }))
                      }
                      onKeyDown={e => {
                        if (e.key === "Enter") saveOne(m.id);
                        if (e.key === "Enter" && e.ctrlKey) saveAllVisible();
                      }}
                      inputMode="decimal"
                    />
                    <button
                      className="h-9 px-3 rounded-md text-white"
                      style={{ background: "#2F8481" }}
                      onClick={() => saveOne(m.id)}
                    >
                      Išsaugoti
                    </button>
                  </div>

                  {/* Būsena */}
                  <div className="text-sm text-neutral-600">
                    Būsena:{" "}
                    {!m.active ? (
                      <span className="text-amber-600">laukiama rodmens</span>
                    ) : (
                      <span className="text-[#2F8481]">ok</span>
                    )}
                  </div>
                </div>

                {invalid && (
                  <div className="mt-1 text-xs text-red-600">
                    Rodmuo negali būti mažesnis už paskutinį ({lastReading} {m.unit})
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
