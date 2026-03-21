import React, { memo } from 'react';
import { Gauge, Settings2 } from 'lucide-react';
import { Card, FormField, InputField, SelectField, ToggleRow } from '../AddressSettingsUI';
import type { AddressSettingsData, LocalMeter } from '../addressSettingsTypes';
import { MetersTable } from '../MetersTable';

interface CommunalTabProps {
  settings: AddressSettingsData;
  updateSettings: (section: keyof AddressSettingsData, updates: Record<string, unknown>) => void;
  meters: LocalMeter[];
  onMetersChange: (meters: LocalMeter[]) => void;
  onMeterUpdate: (meterId: string, updates: Partial<LocalMeter>) => void;
}

export const CommunalTab = memo<CommunalTabProps>(({
  settings,
  updateSettings,
  meters,
  onMetersChange,
  onMeterUpdate,
}) => (
  <div className="space-y-4">
    {/* Meters Table */}
    <Card title="Skaitiklių konfigūracija" icon={<Gauge className="w-4 h-4 text-[#2F8481]" />}>
      <MetersTable
        meters={meters}
        onMetersChange={onMetersChange}
        onMeterUpdate={onMeterUpdate}
      />
    </Card>

    {/* Settings */}
    <Card title="Papildomi nustatymai" icon={<Settings2 className="w-4 h-4 text-[#2F8481]" />}>
      <div className="space-y-3">
        <ToggleRow
          label="Skaitiklių redagavimas"
          description="Leisti nuomininkams matyti ir pateikti skaitiklių rodmenis"
          checked={settings.communalConfig.enableMeterEditing}
          onChange={(v) => updateSettings('communalConfig', { enableMeterEditing: v })}
        />
        <ToggleRow
          label="Reikalauti nuotraukų"
          description="Nuomininkai privalo pridėti skaitiklio nuotrauką prie kiekvieno rodmens"
          checked={settings.communalConfig.requirePhotos}
          onChange={(v) => updateSettings('communalConfig', { requirePhotos: v })}
        />
        <FormField label="Istorijos saugojimo laikotarpis" helperText="Kiek mėnesių saugoti rodmenų istoriją prieš archyvuojant">
          <SelectField
            value={String(settings.communalConfig.historyRetentionMonths || 18)}
            onChange={(v) => updateSettings('communalConfig', { historyRetentionMonths: parseInt(v) || 18 })}
            options={[
              { value: '3', label: '3 mėn.' },
              { value: '6', label: '6 mėn.' },
              { value: '12', label: '1 metai' },
              { value: '18', label: '18 mėn.' },
            ]}
          />
        </FormField>
      </div>
    </Card>
  </div>
));
CommunalTab.displayName = 'CommunalTab';
