/* eslint-disable react/prop-types */
import React, { useCallback } from 'react';
import { nanoid } from 'nanoid';
import {
  METER_TEMPLATES,
  MeterRow,
  MeterTemplate,
  Meter,
  MeterKind,
  Unit,
  MeterMode,
  Allocation
} from '../../types/meters';

type Props = {
  value: MeterRow[];
  onChange: (rows: MeterRow[]) => void;
  allowDuplicatesByKey?: boolean; // jei nori leisti po kelis tos pačios rūšies
};

const number = (v: any): number => {
  if (v === '' || v === null || v === undefined) return 0;
  const num = Number(v);
  return isNaN(num) ? 0 : num;
};

// Legacy compatibility: convert new Meter to old MeterRow format
const convertMeterToLegacy = (meter: Meter): MeterRow => ({
  id: meter.id,
  key: meter.kind || 'water_cold',
  name: meter.name || meter.title || '',
  unit: meter.unit,
  rate: meter.price || meter.price_per_unit || 0,
  initialReading: 0,
  mode: meter.mode || (meter.type === 'individual' ? 'individual' : 'communal'),
  allocation: meter.allocation || 'per_apartment',
  photoRequired: meter.photoRequired || meter.requires_photo || false,
  active: meter.active !== undefined ? meter.active : meter.is_active
});

// Legacy compatibility: convert old MeterRow to new Meter format
const convertLegacyToMeter = (row: MeterRow): Meter => ({
  id: row.id,
  kind: (row.key as MeterKind) || 'water_cold',
  type: row.mode === 'individual' ? 'individual' : 'shared',
  distribution: row.allocation || 'per_apartment',
  unit: (row.unit as Unit) || 'm3',
  pricePerUnit: row.rate,
  currency: 'EUR',
  policy: {
    collectionMode: 'landlord_only',
    scope: 'apartment'
  },
  // Legacy compatibility fields
  name: row.name,
  title: row.name,
  mode: row.mode || 'individual',
  price: row.rate,
  allocation: row.allocation || 'per_apartment',
  photoRequired: row.photoRequired || false,
  active: row.active !== false,
  price_per_unit: row.rate,
  distribution_method: row.allocation || 'per_apartment',
  is_active: row.active !== false,
  requires_photo: row.photoRequired || false,
  is_custom: false,
  is_inherited: false
});

// eslint-disable-next-line react/prop-types
const MeterTable = React.memo<Props>(({ value, onChange, allowDuplicatesByKey = true }) => {
  const addFromTemplate = (tpl: MeterTemplate) => {
    if (!allowDuplicatesByKey) {
      const exists = value.some(r => r.key === tpl.kind);
      if (exists) return;
    }
    const meter: Meter = {
      id: nanoid(),
      kind: tpl.kind,
      type: tpl.mode === 'individual' ? 'individual' : 'shared',
      distribution: tpl.allocation,
      unit: tpl.unit,
      pricePerUnit: tpl.price,
      currency: 'EUR',
      policy: {
        collectionMode: tpl.mode === 'individual' ? 'tenant_photo' : 'landlord_only',
        scope: tpl.mode === 'individual' ? 'apartment' : 'building'
      },
      // Legacy compatibility fields
      title: tpl.title,
      mode: tpl.mode,
      price: tpl.price,
      allocation: tpl.allocation,
      photoRequired: tpl.photoRequired,
      active: tpl.active
    };
    const row = convertMeterToLegacy(meter);
    onChange([...value, row]);
  };

  const addCustom = () => {
    const meter: Meter = {
      id: nanoid(),
      kind: 'water_cold',
      type: 'individual',
      distribution: 'per_apartment',
      unit: 'm3',
      pricePerUnit: 0,
      currency: 'EUR',
      policy: {
        collectionMode: 'tenant_photo',
        scope: 'apartment'
      },
      // Legacy compatibility fields
      title: '',
      mode: 'individual',
      price: 0,
      allocation: 'per_apartment',
      photoRequired: false,
      active: true
    };
    const row = convertMeterToLegacy(meter);
    onChange([...value, row]);
  };

  const update = useCallback((id: string, patch: Partial<MeterRow>) => {
    onChange(value.map(r => (r.id === id ? { ...r, ...patch } : r)));
  }, [value, onChange]);

  const remove = useCallback((id: string) => {
    onChange(value.filter(r => r.id !== id));
  }, [value, onChange]);

  return (
    <div className="space-y-3">
      {/* Quick-add template buttons */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mr-1">Pridėti:</span>
        {METER_TEMPLATES.map(tpl => (
          <button
            type="button"
            key={tpl.kind}
            onClick={() => addFromTemplate(tpl)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium rounded-lg border border-[#2F8481]/20 bg-[#2F8481]/5 text-[#2F8481] hover:bg-[#2F8481]/15 hover:border-[#2F8481]/40 transition-all duration-150 active:scale-[0.97]"
          >
            <span className="text-[13px] leading-none">+</span> {tpl.title}
          </button>
        ))}
        <button
          type="button"
          onClick={addCustom}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium rounded-lg border border-dashed border-gray-300 bg-white/40 text-gray-500 hover:bg-white/80 hover:border-gray-400 hover:text-gray-700 transition-all duration-150 active:scale-[0.97]"
        >
          <span className="text-[13px] leading-none">+</span> Kitas...
        </button>
      </div>

      {/* Lentelė */}
      <div className="overflow-x-auto rounded-xl border border-gray-200/50 bg-white/40 backdrop-blur-sm">
        <table className="min-w-full text-[11px]">
          <thead>
            <tr className="border-b border-gray-200/60">
              <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider w-36">Pavadinimas</th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider w-20">Vienetas</th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider w-24">Tarifas €</th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider w-28">Pradinis</th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Pastaba</th>
              <th className="px-2 py-2 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {value.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-gray-400 text-center text-xs">
                  Nėra skaitliukų. Pridėk iš sąrašo viršuje arba &quot;Custom&quot;.
                </td>
              </tr>
            )}

            {value.map(row => (
              <tr key={row.id} className="border-t border-gray-200/40 hover:bg-white/30 transition-colors duration-150">
                <td className="px-2 py-1.5">
                  <input
                    className="w-full rounded-lg border border-gray-200/70 bg-white/70 px-2 py-1 text-[11px] text-gray-800 caret-gray-900 focus:ring-1 focus:ring-teal-500/40 focus:border-teal-400 transition-all placeholder-gray-400"
                    value={row.name}
                    onChange={e => update(row.id, { name: e.target.value })}
                    placeholder={row.key === 'custom' ? 'Pavadinimas' : 'Skaitliuko pavadinimas'}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    className="w-full rounded-lg border border-gray-200/70 bg-white/70 px-2 py-1 text-[11px] text-gray-800 caret-gray-900 focus:ring-1 focus:ring-teal-500/40 focus:border-teal-400 transition-all placeholder-gray-400"
                    value={row.unit}
                    placeholder="m³"
                    onChange={e => update(row.id, { unit: e.target.value })}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    className="w-full rounded-lg border border-gray-200/70 bg-white/70 px-2 py-1 text-[11px] text-gray-800 caret-gray-900 focus:ring-1 focus:ring-teal-500/40 focus:border-teal-400 transition-all placeholder-gray-400 tabular-nums"
                    value={row.rate}
                    onChange={e => update(row.id, { rate: number(e.target.value) })}
                    placeholder="0.00"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    className="w-full rounded-lg border border-gray-200/70 bg-white/70 px-2 py-1 text-[11px] text-gray-800 caret-gray-900 focus:ring-1 focus:ring-teal-500/40 focus:border-teal-400 transition-all placeholder-gray-400 tabular-nums"
                    value={row.initialReading}
                    onChange={e => update(row.id, { initialReading: number(e.target.value) })}
                    placeholder="0"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    className="w-full rounded-lg border border-gray-200/70 bg-white/70 px-2 py-1 text-[11px] text-gray-800 caret-gray-900 focus:ring-1 focus:ring-teal-500/40 focus:border-teal-400 transition-all placeholder-gray-400"
                    value={row.note || ''}
                    onChange={e => update(row.id, { note: e.target.value })}
                    placeholder="Nebūtina"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <button
                    type="button"
                    onClick={() => remove(row.id)}
                    className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-150"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});

MeterTable.displayName = 'MeterTable';

export default MeterTable;
