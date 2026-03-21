import React, { memo, useState, useEffect, useRef, useCallback } from 'react';
import {
  User, Users, Building2, AlertTriangle,
  Phone, Check, Loader2, Save, Copy,
  ChevronDown, Plus, Trash2
} from 'lucide-react';
import { Card, FormField, InputField } from '../AddressSettingsUI';
import type { AddressSettingsData, CustomContact } from '../addressSettingsTypes';

interface ContactsTabProps {
  settings: AddressSettingsData;
  updateSettings: (section: keyof AddressSettingsData, updates: Record<string, unknown>) => void;
  validationErrors: { bendrija?: string; valdymoImone?: string };
  user: { id?: string; first_name?: string; last_name?: string; email?: string } | null;
  ownerPhone: string | null;
  phoneInput: string;
  setPhoneInput: (val: string) => void;
  onSavePhone: () => Promise<void>;
  isSavingPhone: boolean;
  phoneSaved: boolean;
  allAddresses: Array<{ id: string; full_address: string }>;
  onCopySettings: (sourceAddressId: string, tab: 'contacts') => Promise<void>;
}

export const ContactsTab = memo<ContactsTabProps>(({
  settings,
  updateSettings,
  validationErrors,
  user,
  ownerPhone,
  phoneInput,
  setPhoneInput,
  onSavePhone,
  isSavingPhone,
  phoneSaved,
  allAddresses,
  onCopySettings,
}) => {
  const [copyDropdownOpen, setCopyDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Click-outside handler for copy dropdown
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
    await onCopySettings(sourceId, 'contacts');
    setCopyDropdownOpen(false);
  }, [onCopySettings]);

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

      {/* Nuomotojo kontaktai */}
      <Card title="Nuomotojo kontaktai" icon={<User className="w-4 h-4 text-[#2F8481]" />}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Vardas ir pavardė">
              <div className="w-full px-3.5 py-2 bg-gray-100/60 border border-gray-200/50 rounded-lg text-[13px] text-gray-700 select-none">
                {user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || '—' : '—'}
              </div>
            </FormField>
            <FormField label="El. paštas">
              <div className="w-full px-3.5 py-2 bg-gray-100/60 border border-gray-200/50 rounded-lg text-[13px] text-gray-700 select-none">
                {user?.email || '—'}
              </div>
            </FormField>
            <FormField label="Telefonas" className="col-span-2">
              {ownerPhone ? (
                <div className="w-full px-3.5 py-2 bg-gray-100/60 border border-gray-200/50 rounded-lg text-[13px] text-gray-700 select-none flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  {ownerPhone}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                      <input
                        type="tel"
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        placeholder="+370..."
                        className="w-full pl-9 pr-3.5 py-2 bg-white border border-gray-200 rounded-lg text-[13px] text-gray-700 placeholder-gray-400 focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition-all"
                      />
                    </div>
                    <button
                      onClick={onSavePhone}
                      disabled={!phoneInput.trim() || isSavingPhone}
                      className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                    >
                      {isSavingPhone ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : phoneSaved ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      {isSavingPhone ? 'Saugoma...' : phoneSaved ? 'Išsaugota!' : 'Išsaugoti'}
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-400 leading-tight">Įveskite telefono numerį — jis bus automatiškai pridėtas prie jūsų profilio</p>
                </div>
              )}
            </FormField>
          </div>
          <p className="text-[9px] text-gray-400 leading-tight">Kontaktinė informacija imama iš jūsų paskyros. El. paštas ir telefonas bus matomi nuomininkams.</p>
        </div>
      </Card>

      {/* Bendrijos kontaktai */}
      <Card title="Bendrijos kontaktai" icon={<Users className="w-4 h-4 text-[#2F8481]" />}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Pirmininko vardas" helperText="Bendrijos pirmininko arba atstovo vardas ir pavardė">
              <InputField
                value={settings.contactInfo.chairmanName}
                onChange={(v) => updateSettings('contactInfo', { chairmanName: v })}
                placeholder="Vardas Pavardė"
              />
            </FormField>
            <FormField label="Registracijos nr." helperText="Juridinių asmenų registre įregistruotas bendrijos numeris">
              <InputField
                value={settings.buildingInfo.associationNumber}
                onChange={(v) => updateSettings('buildingInfo', { associationNumber: v })}
                placeholder="pvz. 302345678"
              />
            </FormField>
            <FormField label="Telefonas" helperText="Telefono numeris bendravimui su bendrija">
              <InputField
                type="tel"
                value={settings.contactInfo.chairmanPhone}
                onChange={(v) => updateSettings('contactInfo', { chairmanPhone: v })}
                placeholder="+370..."
              />
            </FormField>
            <FormField label="El. paštas" helperText="El. paštas oficialiai korespondencijai su bendrija">
              <InputField
                type="email"
                value={settings.contactInfo.chairmanEmail}
                onChange={(v) => updateSettings('contactInfo', { chairmanEmail: v })}
                placeholder="el.pastas@pvz.lt"
              />
            </FormField>
          </div>
          {validationErrors.bendrija ? (
            <p className="text-[10px] text-red-500 font-medium flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{validationErrors.bendrija}</p>
          ) : (
            <p className="text-[9px] text-gray-400 leading-tight">Užpildykite bent telefoną arba el. paštą, kad bendrijos kontaktai būtų rodomi nuomininkams.</p>
          )}
        </div>
      </Card>

      {/* Valdymo įmonės kontaktai */}
      <Card title="Valdymo įmonės kontaktai" icon={<Building2 className="w-4 h-4 text-[#2F8481]" />}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Įmonės pavadinimas" helperText="Oficialus valdymo įmonės pavadinimas">
              <InputField
                value={settings.contactInfo.companyName}
                onChange={(v) => updateSettings('contactInfo', { companyName: v })}
                placeholder="UAB ..."
              />
            </FormField>
            <FormField label="Įmonės kodas" helperText="Valdymo įmonės juridinio asmens kodas">
              <InputField
                value={settings.buildingInfo.companyCode}
                onChange={(v) => updateSettings('buildingInfo', { companyCode: v })}
                placeholder="pvz. 123456789"
              />
            </FormField>
            <FormField label="Kontaktinis asmuo" helperText="Atsakingas asmuo su kuriuo bendraujama">
              <InputField
                value={settings.contactInfo.contactPerson}
                onChange={(v) => updateSettings('contactInfo', { contactPerson: v })}
                placeholder="Vardas Pavardė"
              />
            </FormField>
            <FormField label="Telefonas" helperText="Įmonės kontaktinis telefono numeris">
              <InputField
                type="tel"
                value={settings.contactInfo.companyPhone}
                onChange={(v) => updateSettings('contactInfo', { companyPhone: v })}
                placeholder="+370..."
              />
            </FormField>
            <FormField label="El. paštas" className="col-span-2" helperText="Įmonės el. paštas korespondencijai">
              <InputField
                type="email"
                value={settings.contactInfo.companyEmail}
                onChange={(v) => updateSettings('contactInfo', { companyEmail: v })}
                placeholder="info@imone.lt"
              />
            </FormField>
          </div>
          {validationErrors.valdymoImone ? (
            <p className="text-[10px] text-red-500 font-medium flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{validationErrors.valdymoImone}</p>
          ) : (
            <p className="text-[9px] text-gray-400 leading-tight">Užpildykite bent telefoną arba el. paštą, kad valdymo įmonės kontaktai būtų rodomi nuomininkams.</p>
          )}
        </div>
      </Card>

      {/* Papildomi kontaktai */}
      <Card title="Papildomi kontaktai" icon={<AlertTriangle className="w-4 h-4 text-amber-500" />}>
        <div className="space-y-3">
          {(settings.contactInfo.customContacts || []).length > 0 ? (
            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_1fr_1fr_32px] gap-2 px-1">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.08em]">Pavadinimas</span>
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.08em]">Kontaktas</span>
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.08em]">Komentaras</span>
                <span />
              </div>
              {(settings.contactInfo.customContacts || []).map((contact: CustomContact, index: number) => (
                <div key={contact.id} className="grid grid-cols-[1fr_1fr_1fr_32px] gap-2 items-start">
                  <InputField
                    value={contact.title}
                    onChange={(v) => {
                      const updated = [...(settings.contactInfo.customContacts || [])];
                      updated[index] = { ...updated[index], title: v };
                      updateSettings('contactInfo', { customContacts: updated });
                    }}
                    placeholder="pvz. Santechnikas"
                  />
                  <InputField
                    value={contact.content}
                    onChange={(v) => {
                      const updated = [...(settings.contactInfo.customContacts || [])];
                      updated[index] = { ...updated[index], content: v };
                      updateSettings('contactInfo', { customContacts: updated });
                    }}
                    placeholder="+370... / el. paštas"
                  />
                  <InputField
                    value={contact.comment}
                    onChange={(v) => {
                      const updated = [...(settings.contactInfo.customContacts || [])];
                      updated[index] = { ...updated[index], comment: v };
                      updateSettings('contactInfo', { customContacts: updated });
                    }}
                    placeholder="Pastaba..."
                  />
                  <button
                    onClick={() => {
                      const updated = (settings.contactInfo.customContacts || []).filter((_: CustomContact, i: number) => i !== index);
                      updateSettings('contactInfo', { customContacts: updated });
                    }}
                    className="mt-1.5 w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-gray-400 text-center py-3">Nėra pridėtų kontaktų</p>
          )}

          <button
            onClick={() => {
              const newContact: CustomContact = { id: crypto.randomUUID(), title: '', content: '', comment: '' };
              updateSettings('contactInfo', {
                customContacts: [...(settings.contactInfo.customContacts || []), newContact]
              });
            }}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-semibold text-teal-600 bg-teal-50/60 hover:bg-teal-50 border border-teal-200/50 rounded-lg transition-colors active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5" />
            Pridėti kontaktą
          </button>

          <p className="text-[9px] text-gray-400 leading-tight">Pridėkite avarinius, specialistų ar kitus svarbius kontaktus, kuriuos matys nuomininkai</p>
        </div>
      </Card>
    </div>
  );
});
ContactsTab.displayName = 'ContactsTab';
