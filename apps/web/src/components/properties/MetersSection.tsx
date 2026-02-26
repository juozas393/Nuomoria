import React, { useId, useState } from 'react';
import LtDateInput from '../ui/LtDateInput';
import { MeterForm, MeterType, MeterUnit, MeterTariff, Unit, type Allocation } from '../../types/meters';

interface MetersSectionProps {
  defaultStartDate?: string;
  meters: MeterForm[];
  onMetersChange: (meters: MeterForm[]) => void;
}

export function MetersSection({ defaultStartDate, meters, onMetersChange }: MetersSectionProps) {
  const addByType = (type: MeterType) => {
    onMetersChange(meters.concat([buildMeter(type)]));
  };

  const buildMeter = (type: MeterType): MeterForm => {
    const id = `${type}-${crypto.randomUUID().slice(0, 8)}`;

    // Default configurations for each meter type
    const defaultConfigs: Record<MeterType, { label: string; unit: Unit; price_per_unit: number }> = {
      electricity: { label: 'Elektra', unit: 'kWh', price_per_unit: 0.23 },
      water_cold: { label: 'Šaltas vanduo', unit: 'm3', price_per_unit: 1.32 },
      water_hot: { label: 'Karštas vanduo', unit: 'm3', price_per_unit: 3.50 },
      electricity_individual: { label: 'Elektra', unit: 'kWh', price_per_unit: 0.23 },
      electricity_common: { label: 'Elektra (bendra)', unit: 'kWh', price_per_unit: 0.23 },
      gas: { label: 'Dujos', unit: 'm3', price_per_unit: 0.99 },
      heating: { label: 'Šildymas', unit: 'kWh', price_per_unit: 0.095 },
      waste: { label: 'Šiukšlės', unit: 'Kitas', price_per_unit: 5.0 },
      garbage: { label: 'Šiukšlės', unit: 'Kitas', price_per_unit: 5.0 },
      internet: { label: 'Internetas', unit: 'Kitas', price_per_unit: 15.0 },
      custom: { label: 'Kitas', unit: 'kWh', price_per_unit: 0 }
    };

    const config = defaultConfigs[type];

    return {
      id,
      type,
      label: config.label,
      unit: config.unit,
      tariff: 'single' as MeterTariff,
      initialDate: defaultStartDate,
      requirePhoto: true,
      price_per_unit: config.price_per_unit,
      custom_name: type === 'custom' ? 'Kitas skaitliukas' : undefined,
      allocation: 'per_apartment' as Allocation
    };
  };

  const remove = (id: string) => onMetersChange(meters.filter(x => x.id !== id));

  const update = (id: string, patch: Partial<MeterForm>) =>
    onMetersChange(meters.map(x => (x.id === id ? { ...x, ...patch } : x)));

  return (
    <section className="mt-6">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-medium text-neutral-800">Skaitliukai</h3>
        <div className="flex flex-wrap gap-2">
          <QuickChip label="Šaltas vanduo" onClick={() => addByType('water_cold')} />
          <QuickChip label="Karštas vanduo" onClick={() => addByType('water_hot')} />
          <QuickChip label="Elektra (individuali)" onClick={() => addByType('electricity_individual')} />
          <QuickChip label="Elektra (bendra)" onClick={() => addByType('electricity_common')} />
          <QuickChip label="Dujos" onClick={() => addByType('gas')} />
          <QuickChip label="Šildymas" onClick={() => addByType('heating')} />
          <QuickChip label="Internetas" onClick={() => addByType('internet')} />
          <QuickChip label="Šiukšlės" onClick={() => addByType('waste')} />
        </div>
      </div>

      <div className="space-y-3">
        {meters.map(m => (
          <div key={m.id} className="rounded-xl border border-neutral-200 bg-white p-3">
            <div className="flex items-center justify-between">
              <div className="text-[13px] font-medium">{m.label}</div>
              <button
                onClick={() => remove(m.id || '')}
                className="text-[12px] text-neutral-500 hover:underline"
              >
                Pašalinti
              </button>
            </div>

            <div className="mt-2 grid grid-cols-1 sm:grid-cols-6 gap-2">
              <Select
                label="Tipas"
                value={m.type}
                onChange={v => update(m.id || '', { type: v as MeterType })}
                options={[
                  ['water_cold', 'Šaltas vanduo'],
                  ['water_hot', 'Karštas vanduo'],
                  ['electricity_individual', 'Elektra (individuali)'],
                  ['electricity_common', 'Elektra (bendra)'],
                  ['gas', 'Dujos'],
                  ['heating', 'Šildymas'],
                  ['internet', 'Internetas'],
                  ['waste', 'Šiukšlės'],
                ]}
              />
              <Input
                label="Serijos nr. / EIC"
                value={m.serial ?? ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => update(m.id || '', { serial: e.target.value })}
              />
              <Select
                label="Vienetas"
                value={m.unit}
                onChange={v => update(m.id || '', { unit: v as MeterUnit })}
                options={[['m3', 'm³'], ['kWh', 'kWh'], ['GJ', 'GJ'], ['eur', '€']]}
              />
              <Input
                type="number"
                label="Kaina už vienetą"
                inputMode="decimal"
                value={m.price_per_unit || 0}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => update(m.id || '', { price_per_unit: e.target.valueAsNumber || 0 })}
              />
              <Input
                type="number"
                label="Pradinis rodmuo"
                inputMode="decimal"
                value={m.initialReading || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => update(m.id || '', { initialReading: e.target.valueAsNumber || 0 })}
              />
              <LtDateInput
                value={m.initialDate ?? ''}
                onChange={(e) => update(m.id || '', { initialDate: e.target.value })}
                className="w-full rounded-lg border border-neutral-200 px-2 py-1.5 text-[13px]"
              />
            </div>

            <div className="mt-2 flex items-center gap-4">
              <label className="inline-flex items-center gap-2 text-[13px]">
                <input
                  type="checkbox"
                  checked={!!m.requirePhoto}
                  onChange={e => update(m.id || '', { requirePhoto: e.target.checked })}
                />
                Reikalinga pirmoji nuotrauka
              </label>
              <Input
                label="Tiekėjas"
                value={m.provider ?? ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => update(m.id || '', { provider: e.target.value })}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

const QuickChip = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-[12px] hover:bg-neutral-100"
  >
    {label}
  </button>
);

// Mini Input/Select – pakeisk savais UI komponentais
function Input(props: any) {
  return (
    <label className="flex flex-col gap-1 text-[12px] text-neutral-600">
      <span>{props.label}</span>
      <input
        {...props}
        className="h-9 rounded-lg border border-neutral-300 px-3 text-[14px] outline-none focus:border-teal-500"
      />
    </label>
  );
}

function Select({ label, options, value, onChange }: {
  label: string;
  options: [string, string][];
  value: any;
  onChange: (v: string) => void
}) {
  return (
    <label className="flex flex-col gap-1 text-[12px] text-neutral-600">
      <span>{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="h-9 rounded-lg border border-neutral-300 px-3 text-[14px] outline-none focus:border-teal-500"
      >
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}
