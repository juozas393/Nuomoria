import React, { memo } from 'react';
import { Bell, Calendar, FileText, Wrench } from 'lucide-react';
import { Card, FormField, InputField, ToggleRow } from '../AddressSettingsUI';
import type { AddressSettingsData } from '../addressSettingsTypes';

interface NotificationsTabProps {
  settings: AddressSettingsData;
  updateSettings: (section: keyof AddressSettingsData, updates: Record<string, unknown>) => void;
}

export const NotificationsTab = memo<NotificationsTabProps>(({
  settings,
  updateSettings,
}) => {
  const ns = settings.notificationSettings;

  return (
    <div className="space-y-4">
      <Card title="Nuomos priminimai" icon={<Bell className="w-4 h-4 text-[#2F8481]" />}>
        <div className="space-y-3">
          <ToggleRow
            label="Nuomos mokėjimo priminimas"
            description="Automatiškai priminti nuomininkui apie artėjantį mokėjimo terminą"
            checked={ns.rentReminderEnabled}
            onChange={(v) => updateSettings('notificationSettings', { rentReminderEnabled: v })}
          >
            <FormField label="Priminti prieš" helperText="Kiek dienų prieš mokėjimo terminą siųsti priminimą">
              <InputField
                type="number"
                value={ns.rentReminderDays}
                onChange={(v) => updateSettings('notificationSettings', { rentReminderDays: parseInt(v) || 3 })}
                suffix="d."
              />
            </FormField>
          </ToggleRow>

          <ToggleRow
            label="Vėluojančio mokėjimo pranešimas"
            description="Pranešti nuomotojui, kai nuomininkas vėluoja sumokėti"
            checked={ns.latePaymentEnabled}
            onChange={(v) => updateSettings('notificationSettings', { latePaymentEnabled: v })}
          />
        </div>
      </Card>

      <Card title="Skaitiklių priminimai" icon={<Calendar className="w-4 h-4 text-[#2F8481]" />}>
        <div className="space-y-3">
          <ToggleRow
            label="Skaitiklių rodmenų priminimas"
            description="Priminti nuomininkui pateikti skaitiklių rodmenis"
            checked={ns.meterReminderEnabled}
            onChange={(v) => updateSettings('notificationSettings', { meterReminderEnabled: v })}
          >
            <div className="grid grid-cols-3 gap-3">
              <FormField label="Priminti prieš" helperText="Dienų iki periodo pabaigos">
                <InputField
                  type="number"
                  value={ns.meterReminderDays}
                  onChange={(v) => updateSettings('notificationSettings', { meterReminderDays: parseInt(v) || 5 })}
                  suffix="d."
                />
              </FormField>
              <FormField label="Periodas nuo" helperText="Mėnesio diena, nuo kurios galima teikti rodmenis">
                <InputField
                  type="number"
                  value={ns.meterReadingStartDay}
                  onChange={(v) => {
                    const day = Math.min(28, Math.max(1, parseInt(v) || 20));
                    updateSettings('notificationSettings', { meterReadingStartDay: day });
                  }}
                  suffix="d."
                />
              </FormField>
              <FormField label="Periodas iki" helperText="Mėnesio diena, iki kurios reikia pateikti rodmenis">
                <InputField
                  type="number"
                  value={ns.meterReadingEndDay}
                  onChange={(v) => {
                    const day = Math.min(31, Math.max(1, parseInt(v) || 29));
                    updateSettings('notificationSettings', { meterReadingEndDay: day });
                  }}
                  suffix="d."
                />
              </FormField>
            </div>
          </ToggleRow>
        </div>
      </Card>

      <Card title="Kiti pranešimai" icon={<FileText className="w-4 h-4 text-[#2F8481]" />}>
        <div className="space-y-3">
          <ToggleRow
            label="Sutarties pabaigos priminimas"
            description="Priminti apie artėjančią nuomos sutarties pabaigą"
            checked={ns.contractExpiryEnabled}
            onChange={(v) => updateSettings('notificationSettings', { contractExpiryEnabled: v })}
          >
            <FormField label="Priminti prieš" helperText="Kiek dienų prieš sutarties pabaigą siųsti priminimą">
              <InputField
                type="number"
                value={ns.contractExpiryReminderDays}
                onChange={(v) => updateSettings('notificationSettings', { contractExpiryReminderDays: parseInt(v) || 30 })}
                suffix="d."
              />
            </FormField>
          </ToggleRow>

          <ToggleRow
            label="Priežiūros pranešimai"
            description="Pranešti apie remonto ir priežiūros darbus"
            checked={ns.maintenanceNotifications}
            onChange={(v) => updateSettings('notificationSettings', { maintenanceNotifications: v })}
          />

          <ToggleRow
            label="Nauji dokumentai"
            description="Pranešti nuomininkui apie naujus pridėtus dokumentus"
            checked={ns.newDocumentNotifications}
            onChange={(v) => updateSettings('notificationSettings', { newDocumentNotifications: v })}
          />
        </div>
      </Card>
    </div>
  );
});
NotificationsTab.displayName = 'NotificationsTab';
