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
      {/* Greitas pridėjimas iš defaultų */}
      <div className="flex flex-wrap gap-2">
        {METER_TEMPLATES.map(tpl => (
          <button
            type="button"
            key={tpl.kind}
            onClick={() => addFromTemplate(tpl)}
            className="px-2.5 py-1.5 text-sm rounded border bg-white hover:bg-gray-50 transition-colors duration-150"
          >
            + {tpl.title}
          </button>
        ))}
        <button
          type="button"
          onClick={addCustom}
          className="px-2.5 py-1.5 text-sm rounded border bg-white hover:bg-gray-50 transition-colors duration-150"
        >
          + Custom
        </button>
      </div>

      {/* Lentelė */}
      <div className="overflow-x-auto border rounded-md gaming-form-bg" style={{ backgroundImage: "url('/images/CardsBackground.webp')" }}>
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-gray-600">
              <th className="px-3 py-2 text-left w-40">Pavadinimas</th>
              <th className="px-3 py-2 text-left w-24">Vienetas</th>
              <th className="px-3 py-2 text-left w-28">Tarifas (€/unit)</th>
              <th className="px-3 py-2 text-left w-32">Pradinis rodmuo</th>
              <th className="px-3 py-2 text-left">Pastaba</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {value.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-3 text-gray-500 text-center">
                  Nėra skaitliukų. Pridėk iš sąrašo viršuje arba &quot;Custom&quot;.
                </td>
              </tr>
            )}

            {value.map(row => (
              <tr key={row.id} className="border-t hover:bg-gray-50 transition-colors duration-150">
                <td className="px-3 py-2">
                  <input
                    className="w-full rounded border px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={row.name}
                    onChange={e => update(row.id, { name: e.target.value })}
                    placeholder={row.key === 'custom' ? 'Custom skaitliuko pavadinimas' : 'Skaitliuko pavadinimas'}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    className="w-full rounded border px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={row.unit}
                    placeholder="kWh / m³ / MWh"
                    onChange={e => update(row.id, { unit: e.target.value })}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    className="w-full rounded border px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={row.rate}
                    onChange={e => update(row.id, { rate: number(e.target.value) })}
                    placeholder="0.00"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    className="w-full rounded border px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={row.initialReading}
                    onChange={e => update(row.id, { initialReading: number(e.target.value) })}
                    placeholder="0.00"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    className="w-full rounded border px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={row.note || ''}
                    onChange={e => update(row.id, { note: e.target.value })}
                    placeholder="Pastaba (nebūtina)"
                  />
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => remove(row.id)}
                    className="text-red-600 hover:text-red-800 transition-colors duration-150"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
