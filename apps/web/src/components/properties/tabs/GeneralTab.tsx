import React, { memo } from 'react';
import { Building2, Palette, AlertTriangle, Trash2, Check } from 'lucide-react';
import { Card, FormField, InputField, SelectField } from '../AddressSettingsUI';
import type { AddressSettingsData, AddressRow } from '../addressSettingsTypes';

interface GeneralTabProps {
  settings: AddressSettingsData;
  updateSettings: (section: keyof AddressSettingsData, updates: Record<string, unknown>) => void;
  addressData: AddressRow | null;
  streetPart: string;
  cityPart: string;
  onDelete?: () => void;
}

const CARD_BACKGROUNDS = [
  { file: 'none', label: 'Baltas' },
  { file: 'CardsBackground.webp', label: 'Geometrinis' },
  { file: 'rodikliai_opt.webp', label: 'Dangoraižis' },
  { file: 'rodikliai2_opt.webp', label: 'Klasika' },
  { file: 'rodikliai3_opt.webp', label: 'Modernizmas' },
  { file: 'rodikliai4_opt.webp', label: 'Miesto rūkas' },
  { file: 'rodikliai5_opt.webp', label: 'Balkonai' },
  { file: 'rodikliai6_opt.webp', label: 'Bokštas' },
  { file: 'rodikliai7_opt.webp', label: 'Mozaika' },
] as const;

const BUILDING_TYPE_OPTIONS = [
  { value: 'Butų namas', label: 'Butų namas' },
  { value: 'Namas', label: 'Namas' },
  { value: 'Komercinis', label: 'Komercinis' },
];

const HEATING_TYPE_OPTIONS = [
  { value: 'Centrinis', label: 'Centrinis' },
  { value: 'Individualus', label: 'Individualus' },
  { value: 'Rajoninis', label: 'Rajoninis' },
];

export const GeneralTab = memo<GeneralTabProps>(({
  settings,
  updateSettings,
  addressData,
  streetPart,
  cityPart,
  onDelete,
}) => (
  <div className="space-y-4">
    {/* Building info card */}
    <Card title="Pastato informacija" icon={<Building2 className="w-4 h-4 text-[#2F8481]" />}>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Adresas" className="col-span-2">
          <div className="w-full px-3.5 py-2 bg-gray-100/60 border border-gray-200/50 rounded-lg text-[13px] text-gray-400 cursor-not-allowed select-none">{streetPart || '—'}</div>
        </FormField>
        <FormField label="Miestas">
          <div className="w-full px-3.5 py-2 bg-gray-100/60 border border-gray-200/50 rounded-lg text-[13px] text-gray-400 cursor-not-allowed select-none">{cityPart || addressData?.city || '—'}</div>
        </FormField>
        <FormField label="Pašto kodas">
          <div className="w-full px-3.5 py-2 bg-gray-100/60 border border-gray-200/50 rounded-lg text-[13px] text-gray-400 cursor-not-allowed select-none">{addressData?.postal_code || '—'}</div>
        </FormField>
        <FormField label="Pastato tipas" helperText="Pasirinkite pastato paskirtį">
          <SelectField
            value={settings.buildingInfo.buildingType}
            onChange={(v) => updateSettings('buildingInfo', { buildingType: v })}
            options={BUILDING_TYPE_OPTIONS}
          />
        </FormField>
        <FormField label="Butų skaičius" helperText="Kiek butų yra šiame adrese">
          <InputField
            type="number"
            value={settings.buildingInfo.totalApartments}
            onChange={(v) => updateSettings('buildingInfo', { totalApartments: parseInt(v) || 0 })}
          />
        </FormField>
        <FormField label="Aukštų skaičius" helperText="Bendras pastato aukštų skaičius">
          <InputField
            type="number"
            value={settings.buildingInfo.totalFloors}
            onChange={(v) => updateSettings('buildingInfo', { totalFloors: parseInt(v) || 0 })}
          />
        </FormField>
        <FormField label="Statybos metai" helperText="Pastato statybos arba rekonstrukcijos metai">
          <InputField
            type="number"
            value={settings.buildingInfo.yearBuilt ?? ''}
            onChange={(v) => updateSettings('buildingInfo', { yearBuilt: v ? parseInt(v) : null })}
            placeholder="pvz. 1985"
          />
        </FormField>
        <FormField label="Šildymo tipas" helperText="Pastato šildymo sistema">
          <SelectField
            value={settings.buildingInfo.heatingType}
            onChange={(v) => updateSettings('buildingInfo', { heatingType: v })}
            options={HEATING_TYPE_OPTIONS}
          />
        </FormField>
        <FormField label="Stovėjimo vietos" helperText="Automobilių stovėjimo vietų skaičius">
          <InputField
            type="number"
            value={settings.buildingInfo.parkingSpaces ?? ''}
            onChange={(v) => updateSettings('buildingInfo', { parkingSpaces: v ? parseInt(v) : null })}
          />
        </FormField>
        <FormField label="Bendras plotas" helperText="Visas pastato naudingasis plotas">
          <InputField
            type="number"
            value={settings.buildingInfo.totalArea ?? ''}
            onChange={(v) => updateSettings('buildingInfo', { totalArea: v ? parseFloat(v) : null })}
            suffix="m²"
          />
        </FormField>
      </div>
    </Card>

    {/* Card background theme */}
    <Card title="Kortelių išvaizda" icon={<Palette className="w-4 h-4 text-[#2F8481]" />}>
      <p className="text-[11px] text-gray-400 mb-3">Pasirinkite fono nuotrauką, kuri bus naudojama buto kortelėse. Taikoma visiems šio adreso butams (nebent butas turi individualų pasirinkimą).</p>
      <div className="grid grid-cols-3 gap-3">
        {CARD_BACKGROUNDS.map(opt => {
          const currentBg = settings.buildingInfo.card_background || 'CardsBackground.webp';
          const isSelected = currentBg === opt.file;
          return (
            <button
              key={opt.file}
              type="button"
              onClick={() => updateSettings('buildingInfo', { card_background: opt.file })}
              className={`relative rounded-xl overflow-hidden border-2 transition-all duration-200 aspect-[16/9] group ${
                isSelected
                  ? 'border-teal-500 shadow-[0_0_0_2px_rgba(20,184,166,0.2)]'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {opt.file === 'none' ? (
                <div className="w-full h-full bg-white" />
              ) : (
                <img
                  src={`/images/${opt.file}`}
                  alt={opt.label}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              )}
              <div className={`absolute inset-0 ${opt.file === 'none' ? 'bg-gradient-to-t from-neutral-100 to-transparent' : 'bg-gradient-to-t from-black/50 to-transparent'}`} />
              <span className={`absolute bottom-1.5 left-2 text-[10px] font-bold ${opt.file === 'none' ? 'text-neutral-500' : 'text-white'}`}>{opt.label}</span>
              {isSelected && (
                <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center shadow-sm">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Adjustments — shown when a photo background is selected (not Baltas) */}
      {settings.buildingInfo.card_background && settings.buildingInfo.card_background !== 'none' && (() => {
        const pos = settings.buildingInfo.card_background_position ?? 50;
        const opacity = settings.buildingInfo.card_background_opacity ?? 15;
        const overlayVal = 1 - (opacity / 100); // 15% ryškumas = 0.85 overlay
        const bgFile = settings.buildingInfo.card_background;
        return (
          <div className="mt-4 p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-3">
            {/* Ryškumas */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-neutral-700">Ryškumas</span>
                <span className="text-[10px] text-neutral-400">{opacity}%</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[9px] text-neutral-400">Šviesiau</span>
                <input
                  type="range"
                  min="5"
                  max="60"
                  value={opacity}
                  onChange={(e) => updateSettings('buildingInfo', { card_background_opacity: parseInt(e.target.value) })}
                  className="flex-1 h-1.5 bg-neutral-200 rounded-full appearance-none cursor-pointer accent-teal-500 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-teal-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:shadow-sm"
                />
                <span className="text-[9px] text-neutral-400">Ryškiau</span>
              </div>
            </div>

            {/* Pozicija */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-neutral-700">Pozicija</span>
                <span className="text-[10px] text-neutral-400">{pos}%</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[9px] text-neutral-400">Viršus</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={pos}
                  onChange={(e) => updateSettings('buildingInfo', { card_background_position: parseInt(e.target.value) })}
                  className="flex-1 h-1.5 bg-neutral-200 rounded-full appearance-none cursor-pointer accent-teal-500 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-teal-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:shadow-sm"
                />
                <span className="text-[9px] text-neutral-400">Apačia</span>
              </div>
            </div>

            {/* Preview */}
            <div
              className="h-16 rounded-lg overflow-hidden border border-neutral-200"
              style={{
                backgroundImage: `linear-gradient(180deg, rgba(255,255,255,${overlayVal}) 0%, rgba(255,255,255,${Math.max(0, overlayVal - 0.03)}) 50%, rgba(255,255,255,${Math.min(1, overlayVal + 0.02)}) 100%), url('/images/${bgFile}')`,
                backgroundSize: 'cover',
                backgroundPosition: `center ${pos}%`,
              }}
            />
          </div>
        );
      })()}
    </Card>

    {/* Danger zone */}
    {onDelete && (
      <div className="bg-red-50 rounded-2xl border border-red-100 p-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-red-900">Pavojinga zona</h4>
            <p className="text-xs text-red-600/80 mt-1">
              Ištrynus adresą, visi susiję butai, nuomininkai ir duomenys bus pašalinti negrįžtamai.
            </p>
            <button
              onClick={onDelete}
              className="mt-3 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 hover:text-white bg-red-50 hover:bg-red-600 border border-red-200 hover:border-red-600 rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Ištrinti adresą
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
));
GeneralTab.displayName = 'GeneralTab';
