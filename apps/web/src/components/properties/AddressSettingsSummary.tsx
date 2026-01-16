import React from 'react';
import { 
  Cog6ToothIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  CurrencyEuroIcon,
  InformationCircleIcon,
  WrenchScrewdriverIcon,
  CalendarIcon,
  PhoneIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';
import { AddressSettings } from '../../data/addressSettingsData';

interface AddressSettingsSummaryProps {
  address: string;
  settings?: AddressSettings;
  onOpenSettings: () => void;
}

export const AddressSettingsSummary: React.FC<AddressSettingsSummaryProps> = ({
  address,
  settings,
  onOpenSettings
}) => {
  const hasSettings = !!settings;
  const lastUpdated = settings?.updatedAt 
    ? new Date(settings.updatedAt).toLocaleDateString('lt-LT')
    : null;

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Cog6ToothIcon className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Adreso nustatymai</h3>
            <p className="text-sm text-gray-600">{address}</p>
          </div>
        </div>
        <button
          onClick={onOpenSettings}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          {hasSettings ? 'Redaguoti' : 'Sukurti'} nustatymus
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {hasSettings ? (
          <div className="space-y-4">
            {/* Building Info Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <BuildingOfficeIcon className="w-5 h-5 text-gray-600" />
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {settings.buildingInfo.totalApartments} butai
                  </div>
                  <div className="text-xs text-gray-500">
                    {settings.buildingInfo.totalFloors} aukštai
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <UserGroupIcon className="w-5 h-5 text-gray-600" />
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {settings.contactInfo.managerName || 'Nenustatyta'}
                  </div>
                  <div className="text-xs text-gray-500">Valdytojas</div>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <CurrencyEuroIcon className="w-5 h-5 text-gray-600" />
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {settings.financialSettings.defaultDeposit}€
                  </div>
                  <div className="text-xs text-gray-500">Numatytasis depozitas</div>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <WrenchScrewdriverIcon className="w-5 h-5 text-gray-600" />
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {settings.communalConfig ? 'Konfigūruota' : 'Nenustatyta'}
                  </div>
                  <div className="text-xs text-gray-500">Komunaliniai</div>
                </div>
              </div>
            </div>

            {/* Quick Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Contact Info */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-900 flex items-center">
                  <PhoneIcon className="w-4 h-4 mr-2" />
                  Kontaktai
                </h4>
                <div className="text-sm text-gray-600 space-y-1">
                  {settings.contactInfo.managerPhone && (
                    <div>📞 {settings.contactInfo.managerPhone}</div>
                  )}
                  {settings.contactInfo.managerEmail && (
                    <div>📧 {settings.contactInfo.managerEmail}</div>
                  )}
                  {settings.contactInfo.emergencyPhone && (
                    <div>🚨 Avarinis: {settings.contactInfo.emergencyPhone}</div>
                  )}
                </div>
              </div>

              {/* Financial & Notification Settings */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-900 flex items-center">
                  <InformationCircleIcon className="w-4 h-4 mr-2" />
                  Nustatymai
                </h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>⏰ Priminimas: {settings.notificationSettings.rentReminderDays} d. prieš</div>
                  <div>📅 Sutartis: {settings.notificationSettings.contractExpiryReminderDays} d. prieš</div>
                  <div>📊 Skaitliukai: {settings.notificationSettings.meterReminderDays} d. prieš</div>
                  <div>🔄 Automatinis pratęsimas: {settings.financialSettings.autoRenewalEnabled ? 'Įjungtas' : 'Išjungtas'}</div>
                </div>
              </div>
            </div>

            {/* Last Updated */}
            {lastUpdated && (
              <div className="text-xs text-gray-500 flex items-center">
                <CalendarIcon className="w-3 h-3 mr-1" />
                Atnaujinta: {lastUpdated}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-4">
              <Cog6ToothIcon className="w-12 h-12 mx-auto" />
            </div>
            <h4 className="text-lg font-medium text-gray-700 mb-2">
              Nėra nustatymų
            </h4>
            <p className="text-sm text-gray-500 mb-4">
              Sukurkite adreso nustatymus, kad galėtumėte valdyti pastato informaciją, 
              kontaktus, finansus ir komunalinius visiems butams.
            </p>
            <button
              onClick={onOpenSettings}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Sukurti nustatymus
            </button>
          </div>
        )}
      </div>
    </div>
  );
};



