import React, { memo, useState, useEffect, useRef, useCallback } from 'react';
import { CreditCard, Wallet, Copy, ChevronDown } from 'lucide-react';
import { Card, FormField, InputField, SelectField, ToggleRow } from '../AddressSettingsUI';
import type { AddressSettingsData } from '../addressSettingsTypes';

interface FinancialTabProps {
  settings: AddressSettingsData;
  updateSettings: (section: keyof AddressSettingsData, updates: Record<string, unknown>) => void;
  allAddresses: Array<{ id: string; full_address: string }>;
  onCopySettings: (sourceAddressId: string, tab: 'financial') => Promise<void>;
}

export const FinancialTab = memo<FinancialTabProps>(({
  settings,
  updateSettings,
  allAddresses,
  onCopySettings,
}) => {
  const [copyDropdownOpen, setCopyDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Click-outside handler
  useEffect(() => {
    if (!copyDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setCopyDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [copyDropdownOpen]);

  const handleCopy = useCallback(async (sourceId: string) => {
    await onCopySettings(sourceId, 'financial');
    setCopyDropdownOpen(false);
  }, [onCopySettings]);

  const pm = settings.financialSettings.paymentMethods;

  return (
    <div className="space-y-4">
      {/* Copy from another address */}
      {allAddresses.length > 0 && (
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setCopyDropdownOpen(prev => !prev)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-gray-500 hover:text-teal-600 bg-gray-50 hover:bg-teal-50/60 border border-gray-200/60 rounded-lg transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            Kopijuoti iš kito adreso
            <ChevronDown className={`w-3 h-3 transition-transform ${copyDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          {copyDropdownOpen && (
            <div className="absolute z-20 mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-lg py-1">
              {allAddresses.map(a => (
                <button
                  key={a.id}
                  onClick={() => handleCopy(a.id)}
                  className="w-full text-left px-3 py-2 text-[12px] text-gray-700 hover:bg-teal-50 hover:text-teal-700 transition-colors"
                >
                  {a.full_address}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <Card title="Mokėjimo nustatymai" icon={<CreditCard className="w-4 h-4 text-[#2F8481]" />}>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Mokėjimo diena" helperText="Kiekvieną mėnesį iki šios dienos nuomininkas turi sumokėti nuomą">
            <InputField
              type="number"
              value={settings.financialSettings.paymentDay}
              onChange={(v) => updateSettings('financialSettings', { paymentDay: parseInt(v) || 15 })}
            />
          </FormField>
          <FormField label="Baudos pradžia" helperText="Po kiek dienų nuo mokėjimo termino pradedama skaičiuoti bauda">
            <InputField
              type="number"
              value={settings.financialSettings.gracePeriodDays}
              onChange={(v) => updateSettings('financialSettings', { gracePeriodDays: parseInt(v) || 0 })}
              suffix="d."
            />
          </FormField>
          <FormField label="Vėlavimo bauda" helperText="Suma eurais, kuri pridedama už kiekvieną pavėluotą dieną">
            <InputField
              type="number"
              value={settings.financialSettings.latePaymentFee}
              onChange={(v) => updateSettings('financialSettings', { latePaymentFee: parseFloat(v) || 0 })}
              suffix="€"
            />
          </FormField>
          <FormField label="Depozito politika" helperText="Kiek mėnesių nuomos sumos sudaro depozitas">
            <SelectField
              value={settings.financialSettings.depositPolicy || '1month'}
              onChange={(v) => updateSettings('financialSettings', { depositPolicy: v })}
              options={[
                { value: '1month', label: '1 mėn. nuoma' },
                { value: '2months', label: '2 mėn. nuoma' },
                { value: 'custom', label: 'Individuali suma' },
              ]}
            />
          </FormField>
          <FormField label="Numatytasis depozitas" helperText="Standartinė depozito suma naujiems nuomininkams">
            <InputField
              type="number"
              value={settings.financialSettings.defaultDeposit}
              onChange={(v) => updateSettings('financialSettings', { defaultDeposit: parseFloat(v) || 0 })}
              suffix="€"
            />
          </FormField>
          <FormField label="Sutarties trukmė" helperText="Standartinė nuomos sutarties trukmė mėnesiais">
            <InputField
              type="number"
              value={settings.financialSettings.defaultContractDuration}
              onChange={(v) => updateSettings('financialSettings', { defaultContractDuration: parseInt(v) || 12 })}
              suffix="mėn."
            />
          </FormField>
        </div>
      </Card>

      <Card title="Mokėjimo būdai" icon={<Wallet className="w-4 h-4 text-[#2F8481]" />}>
        <p className="text-[11px] text-gray-400 mb-4 leading-relaxed">Nurodykite mokėjimo būdus, kuriuos nuomininkai matys sąskaitoje. Galite įjungti kelis variantus.</p>
        <div className="space-y-3">
          {/* Bank Transfer */}
          <ToggleRow
            label="Banko pavedimas"
            description="Swedbank, SEB, Luminor, Šiaulių bankas ir kt."
            checked={pm?.bankTransfer?.enabled ?? false}
            onChange={(v) => {
              const updated = { ...pm };
              updated.bankTransfer = { ...(updated.bankTransfer || { iban: '', bankName: '', recipientName: '', enabled: false }), enabled: v };
              if (v && !updated.bankTransfer.iban && settings.financialSettings.bankAccount) {
                updated.bankTransfer.iban = settings.financialSettings.bankAccount;
                updated.bankTransfer.recipientName = settings.financialSettings.recipientName || '';
              }
              updateSettings('financialSettings', { paymentMethods: updated });
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              <FormField label="IBAN" className="col-span-2">
                <InputField
                  value={pm?.bankTransfer?.iban || ''}
                  onChange={(v) => {
                    const updated = { ...pm };
                    updated.bankTransfer = { ...(updated.bankTransfer || { iban: '', bankName: '', recipientName: '', enabled: true }), iban: v };
                    updateSettings('financialSettings', { paymentMethods: updated, bankAccount: v });
                  }}
                  placeholder="LT00 0000 0000 0000 0000"
                />
              </FormField>
              <FormField label="Banko pavadinimas">
                <InputField
                  value={pm?.bankTransfer?.bankName || ''}
                  onChange={(v) => {
                    const updated = { ...pm };
                    updated.bankTransfer = { ...(updated.bankTransfer || { iban: '', bankName: '', recipientName: '', enabled: true }), bankName: v };
                    updateSettings('financialSettings', { paymentMethods: updated });
                  }}
                  placeholder="Swedbank"
                />
              </FormField>
              <FormField label="Gavėjo vardas">
                <InputField
                  value={pm?.bankTransfer?.recipientName || ''}
                  onChange={(v) => {
                    const updated = { ...pm };
                    updated.bankTransfer = { ...(updated.bankTransfer || { iban: '', bankName: '', recipientName: '', enabled: true }), recipientName: v };
                    updateSettings('financialSettings', { paymentMethods: updated, recipientName: v });
                  }}
                  placeholder="Vardas Pavardė"
                />
              </FormField>
              <FormField label="Mokėjimo paskirtis" className="col-span-2">
                <InputField
                  value={settings.financialSettings.paymentPurposeTemplate || ''}
                  onChange={(v) => updateSettings('financialSettings', { paymentPurposeTemplate: v })}
                  placeholder="Nuomos mokestis už {period}"
                />
              </FormField>
            </div>
          </ToggleRow>

          {/* Paysera */}
          <ToggleRow
            label="Paysera"
            description="Mokėjimas per Paysera platformą"
            checked={pm?.paysera?.enabled ?? false}
            onChange={(v) => {
              const updated = { ...pm };
              updated.paysera = { ...(updated.paysera || { account: '', enabled: false }), enabled: v };
              updateSettings('financialSettings', { paymentMethods: updated });
            }}
          >
            <FormField label="Paysera el. paštas arba tel. numeris" helperText="Paysera paskyros identifikatorius, kurį nuomininkas matys">
              <InputField
                value={pm?.paysera?.account || ''}
                onChange={(v) => {
                  const updated = { ...pm };
                  updated.paysera = { ...(updated.paysera || { account: '', enabled: true }), account: v };
                  updateSettings('financialSettings', { paymentMethods: updated });
                }}
                placeholder="el.pastas@gmail.com arba +37060000000"
              />
            </FormField>
          </ToggleRow>

          {/* Revolut */}
          <ToggleRow
            label="Revolut"
            description="Mokėjimas per Revolut programėlę"
            checked={pm?.revolut?.enabled ?? false}
            onChange={(v) => {
              const updated = { ...pm };
              updated.revolut = { ...(updated.revolut || { tag: '', enabled: false }), enabled: v };
              updateSettings('financialSettings', { paymentMethods: updated });
            }}
          >
            <FormField label="Revolut vartotojo vardas" helperText="Jūsų @revolut vardas (be @). Nuomininkas galės pervesti per revolut.me nuorodą">
              <InputField
                value={pm?.revolut?.tag || ''}
                onChange={(v) => {
                  const updated = { ...pm };
                  updated.revolut = { ...(updated.revolut || { tag: '', enabled: true }), tag: v.replace('@', '') };
                  updateSettings('financialSettings', { paymentMethods: updated });
                }}
                placeholder="vardasp"
              />
            </FormField>
          </ToggleRow>

          {/* Stripe */}
          <ToggleRow
            label="Kortelės (Stripe)"
            description="Visa, Mastercard — nuomininkas moka kortele tiesiogiai"
            checked={pm?.stripe?.enabled ?? false}
            onChange={(v) => {
              const updated = { ...pm };
              updated.stripe = { ...(updated.stripe || { enabled: false }), enabled: v };
              updateSettings('financialSettings', { paymentMethods: updated });
            }}
          >
            <p className="text-[11px] text-gray-400">Stripe mokėjimai veikia automatiškai per jūsų prijungtą Stripe paskyrą. Konfigūruokite Stripe nustatymuose.</p>
          </ToggleRow>
        </div>
      </Card>

      {/* Auto-renewal toggle */}
      <ToggleRow
        label="Automatinis sutarties atnaujinimas"
        description="Pasibaigus sutarties terminui, automatiškai pratęsti tokiomis pačiomis sąlygomis"
        checked={settings.financialSettings.autoRenewalEnabled}
        onChange={(v) => updateSettings('financialSettings', { autoRenewalEnabled: v })}
      />
    </div>
  );
});
FinancialTab.displayName = 'FinancialTab';
