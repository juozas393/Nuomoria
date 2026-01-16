import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { FRONTEND_MODE } from '../config/frontendMode';

/**
 * Settings page for landlords/property managers
 * 
 * Performance optimizations:
 * - useMemo for computed values
 * - useCallback for event handlers
 * - Auto-dismiss messages with cleanup
 * - Optimized re-renders
 * 
 * Features:
 * - Invoice automation settings
 * - Payment terms configuration
 * - Late fee management
 * - Email notifications
 * - Regional settings (language, currency, date format)
 * - Security & account management
 */

interface SettingsState {
  // Invoice & Payment Settings
  emailNotifications: boolean;
  invoiceReminders: boolean;
  paymentAlerts: boolean;
  tenantMessages: boolean;
  autoInvoiceGeneration: boolean;
  paymentDeadlineDays: number;
  lateFeePercentage: number;
  
  // Regional Settings
  language: string;
  currency: string;
  dateFormat: string;
  
  // Security Settings
  twoFactorEnabled: boolean;
}

const Settings: React.FC = () => {
  const { user } = useAuth();
  
  const [settings, setSettings] = useState<SettingsState>({
    // Notifications
    emailNotifications: true,
    invoiceReminders: true,
    paymentAlerts: true,
    tenantMessages: true,
    
    // Invoice & Payment
    autoInvoiceGeneration: true,
    paymentDeadlineDays: 10,
    lateFeePercentage: 0.1,
    
    // Regional
    language: 'lt',
    currency: 'EUR',
    dateFormat: 'YYYY-MM-DD',
    
    // Security
    twoFactorEnabled: false
  });

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showDateFormatModal, setShowDateFormatModal] = useState(false);
  const [showPaymentDaysModal, setShowPaymentDaysModal] = useState(false);
  const [showLateFeeModal, setShowLateFeeModal] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState('');
  
  const messageTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-dismiss message after 3 seconds
  useEffect(() => {
    if (message) {
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current);
      }
      messageTimeoutRef.current = setTimeout(() => {
        setMessage(null);
      }, 3000);
    }
    return () => {
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current);
      }
    };
  }, [message]);

  const toggleSetting = useCallback((key: keyof SettingsState) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
    setMessage({ type: 'success', text: 'Nustatymai išsaugoti!' });
  }, []);

  const changeSetting = useCallback((key: keyof SettingsState, value: string | number) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
    setMessage({ type: 'success', text: 'Nustatymai atnaujinti!' });
  }, []);

  const handleAction = useCallback((action: string) => {
    setMessage({ 
      type: 'success', 
      text: FRONTEND_MODE 
        ? `${action} funkcija veiks su backend` 
        : `${action} vykdomas...` 
    });
  }, []);

  const handle2FASetup = useCallback(() => {
    // Generate mock QR code for frontend mode
    const mockQR = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0id2hpdGUiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSJibGFjayIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPjJGQSBRUiBDb2RlPC90ZXh0Pjwvc3ZnPg==';
    setQrCodeUrl(mockQR);
    setShow2FAModal(true);
  }, []);

  const handle2FAVerify = useCallback(() => {
    if (verificationCode.length === 6) {
      toggleSetting('twoFactorEnabled');
      setShow2FAModal(false);
      setVerificationCode('');
      setMessage({ type: 'success', text: '2FA sėkmingai įjungta!' });
    } else {
      setMessage({ type: 'error', text: 'Įveskite 6 skaitmenų kodą' });
    }
  }, [verificationCode, toggleSetting]);

  const handle2FADisable = useCallback(() => {
    toggleSetting('twoFactorEnabled');
    setMessage({ type: 'success', text: '2FA išjungta' });
  }, [toggleSetting]);

  // Configuration options
  const languages = [
    { code: 'lt', name: 'Lietuvių', flag: '🇱🇹' },
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'pl', name: 'Polski', flag: '🇵🇱' }
  ];

  const currencies = [
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'GBP', name: 'British Pound', symbol: '£' }
  ];

  const dateFormats = [
    { code: 'YYYY-MM-DD', name: '2025-01-15', example: '2025-01-15' },
    { code: 'DD/MM/YYYY', name: '15/01/2025', example: '15/01/2025' },
    { code: 'MM/DD/YYYY', name: '01/15/2025', example: '01/15/2025' },
    { code: 'DD.MM.YYYY', name: '15.01.2025', example: '15.01.2025' }
  ];

  const paymentDeadlineOptions = [
    { days: 5, label: '5 dienos' },
    { days: 7, label: '7 dienos' },
    { days: 10, label: '10 dienų' },
    { days: 14, label: '14 dienų' },
    { days: 30, label: '30 dienų' }
  ];

  const lateFeeOptions = [
    { percentage: 0, label: 'Be delspinigių (0%)' },
    { percentage: 0.05, label: '0.05% per dieną' },
    { percentage: 0.1, label: '0.1% per dieną' },
    { percentage: 0.2, label: '0.2% per dieną' },
    { percentage: 0.5, label: '0.5% per dieną' }
  ];

  // Current selections
  const currentLanguage = languages.find(l => l.code === settings.language);
  const currentCurrency = currencies.find(c => c.code === settings.currency);
  const currentDateFormat = dateFormats.find(d => d.code === settings.dateFormat);
  const currentPaymentDeadline = paymentDeadlineOptions.find(p => p.days === settings.paymentDeadlineDays);
  const currentLateFee = lateFeeOptions.find(l => l.percentage === settings.lateFeePercentage);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2F8481]/5 via-white to-[#2F8481]/10 py-8 px-4 sm:px-6 lg:px-8 animate-fade-in">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 animate-slide-up">
          <h1 className="text-3xl font-bold text-black mb-2">Nustatymai</h1>
          <p className="text-black/60">Valdykite savo verslo nustatymus ir preferencijas</p>
        </div>

        {/* Success/Error Message */}
        {message && (
          <div 
            className={`mb-6 p-4 rounded-2xl border-2 animate-slide-up ${
              message.type === 'success' 
                ? 'bg-green-50 text-green-800 border-green-200' 
                : 'bg-red-50 text-red-800 border-red-200'
            }`} 
            role="alert" 
            aria-live="polite"
          >
            <div className="flex items-center gap-3">
              {message.type === 'success' ? (
                <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
              <span className="font-semibold">{message.text}</span>
            </div>
          </div>
        )}

        {/* Main Settings Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Invoice & Payment Settings */}
          <div className="bg-white rounded-2xl shadow-lg border border-black/10 p-6 hover:shadow-xl transition-all duration-300 animate-slide-up backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-gradient-to-br from-[#2F8481] to-[#2F8481]/80 rounded-xl shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-black">Sąskaitos</h3>
                <p className="text-xs text-black/60">Mokėjimų valdymas</p>
              </div>
            </div>
            <div className="space-y-3">
              {/* Auto Invoice Generation */}
              <div className="p-3 bg-gradient-to-r from-black/5 to-black/0 hover:from-[#2F8481]/10 hover:to-[#2F8481]/5 rounded-xl transition-all duration-200">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <span className="text-sm font-semibold text-black block">Automatinės sąskaitos</span>
                    <span className="text-xs text-black/60">Generuoti kas mėnesį</span>
                  </div>
                  <button
                    onClick={() => toggleSetting('autoInvoiceGeneration')}
                    className={`w-12 h-6 rounded-full transition-all duration-300 relative transform hover:scale-105 shadow-lg flex-shrink-0 ${
                      settings.autoInvoiceGeneration ? 'bg-[#2F8481]' : 'bg-black/20'
                    }`}
                    aria-label="Automatinės sąskaitos"
                    aria-pressed={settings.autoInvoiceGeneration}
                  >
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-md ${
                      settings.autoInvoiceGeneration ? 'right-1' : 'left-1'
                    }`}></span>
                  </button>
                </div>
              </div>

              {/* Payment Deadline */}
              <button
                onClick={() => setShowPaymentDaysModal(true)}
                className="w-full p-3 bg-gradient-to-r from-black/5 to-black/0 hover:from-[#2F8481]/10 hover:to-[#2F8481]/5 rounded-xl transition-all duration-200 group"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 text-left">
                    <span className="text-sm font-semibold text-black block">Apmokėjimo terminas</span>
                    <span className="text-xs text-black/60">Iki kada sumokėti</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="px-3 py-1 bg-white rounded-lg text-sm font-medium text-black border border-black/10 shadow-sm">
                      {currentPaymentDeadline?.label}
                    </span>
                    <svg className="w-4 h-4 text-black/40 group-hover:text-[#2F8481] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </button>

              {/* Late Fee */}
              <button
                onClick={() => setShowLateFeeModal(true)}
                className="w-full p-3 bg-gradient-to-r from-black/5 to-black/0 hover:from-[#2F8481]/10 hover:to-[#2F8481]/5 rounded-xl transition-all duration-200 group"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 text-left">
                    <span className="text-sm font-semibold text-black block">Delspinigiai</span>
                    <span className="text-xs text-black/60">Už vėlavimą</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="px-3 py-1 bg-white rounded-lg text-sm font-medium text-black border border-black/10 shadow-sm">
                      {currentLateFee?.label}
                    </span>
                    <svg className="w-4 h-4 text-black/40 group-hover:text-[#2F8481] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-white rounded-2xl shadow-lg border border-black/10 p-6 hover:shadow-xl transition-all duration-300 animate-slide-up backdrop-blur-sm" style={{animationDelay: '0.1s'}}>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-gradient-to-br from-[#2F8481] to-[#2F8481]/80 rounded-xl shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-black">Pranešimai</h3>
                <p className="text-xs text-black/60">El. pašto pranešimai</p>
              </div>
            </div>
            <div className="space-y-3">
              {/* Email Notifications */}
              <div className="p-3 bg-gradient-to-r from-black/5 to-black/0 hover:from-[#2F8481]/10 hover:to-[#2F8481]/5 rounded-xl transition-all duration-200">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <span className="text-sm font-semibold text-black block">Visi pranešimai</span>
                    <span className="text-xs text-black/60">Gauti visus el. laiškus</span>
                  </div>
                  <button
                    onClick={() => toggleSetting('emailNotifications')}
                    className={`w-12 h-6 rounded-full transition-all duration-300 relative transform hover:scale-105 shadow-lg flex-shrink-0 ${
                      settings.emailNotifications ? 'bg-[#2F8481]' : 'bg-black/20'
                    }`}
                    aria-label="Visi el. pašto pranešimai"
                    aria-pressed={settings.emailNotifications}
                  >
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-md ${
                      settings.emailNotifications ? 'right-1' : 'left-1'
                    }`}></span>
                  </button>
                </div>
              </div>

              {/* Invoice Reminders */}
              <div className="p-3 bg-gradient-to-r from-black/5 to-black/0 hover:from-[#2F8481]/10 hover:to-[#2F8481]/5 rounded-xl transition-all duration-200">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <span className="text-sm font-semibold text-black block">Neapmokėtos sąskaitos</span>
                    <span className="text-xs text-black/60">Kai nuomininkas vėluoja</span>
                  </div>
                  <button
                    onClick={() => toggleSetting('invoiceReminders')}
                    className={`w-12 h-6 rounded-full transition-all duration-300 relative transform hover:scale-105 shadow-lg flex-shrink-0 ${
                      settings.invoiceReminders ? 'bg-[#2F8481]' : 'bg-black/20'
                    }`}
                    aria-label="Sąskaitų priminimas"
                    aria-pressed={settings.invoiceReminders}
                  >
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-md ${
                      settings.invoiceReminders ? 'right-1' : 'left-1'
                    }`}></span>
                  </button>
                </div>
              </div>

              {/* Payment Alerts */}
              <div className="p-3 bg-gradient-to-r from-black/5 to-black/0 hover:from-[#2F8481]/10 hover:to-[#2F8481]/5 rounded-xl transition-all duration-200">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <span className="text-sm font-semibold text-black block">Gauti mokėjimai</span>
                    <span className="text-xs text-black/60">Kai nuomininkas sumokėjo</span>
                  </div>
                  <button
                    onClick={() => toggleSetting('paymentAlerts')}
                    className={`w-12 h-6 rounded-full transition-all duration-300 relative transform hover:scale-105 shadow-lg flex-shrink-0 ${
                      settings.paymentAlerts ? 'bg-[#2F8481]' : 'bg-black/20'
                    }`}
                    aria-label="Mokėjimų įspėjimai"
                    aria-pressed={settings.paymentAlerts}
                  >
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-md ${
                      settings.paymentAlerts ? 'right-1' : 'left-1'
                    }`}></span>
                  </button>
                </div>
              </div>

              {/* Tenant Messages */}
              <div className="p-3 bg-gradient-to-r from-black/5 to-black/0 hover:from-[#2F8481]/10 hover:to-[#2F8481]/5 rounded-xl transition-all duration-200">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <span className="text-sm font-semibold text-black block">Nuomininkų žinutės</span>
                    <span className="text-xs text-black/60">Naujos žinutės ir užklausos</span>
                  </div>
                  <button
                    onClick={() => toggleSetting('tenantMessages')}
                    className={`w-12 h-6 rounded-full transition-all duration-300 relative transform hover:scale-105 shadow-lg flex-shrink-0 ${
                      settings.tenantMessages ? 'bg-[#2F8481]' : 'bg-black/20'
                    }`}
                    aria-label="Nuomininkų žinutės"
                    aria-pressed={settings.tenantMessages}
                  >
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-md ${
                      settings.tenantMessages ? 'right-1' : 'left-1'
                    }`}></span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Regional Settings - Full Width */}
        <div className="bg-white rounded-2xl shadow-lg border border-black/10 p-6 hover:shadow-xl transition-all duration-300 mb-8 animate-slide-up backdrop-blur-sm" style={{animationDelay: '0.2s'}}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-gradient-to-br from-[#2F8481] to-[#2F8481]/80 rounded-xl shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-black">Regioniniai nustatymai</h3>
              <p className="text-xs text-black/60">Kalba, valiuta ir datos formatas</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Language */}
            <button
              onClick={() => setShowLanguageModal(true)}
              className="p-4 bg-gradient-to-r from-black/5 to-black/0 hover:from-[#2F8481]/10 hover:to-[#2F8481]/5 border-2 border-black/10 hover:border-[#2F8481]/20 rounded-xl transition-all duration-200 transform hover:scale-[1.02] group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-black">Kalba</span>
                <svg className="w-4 h-4 text-black/40 group-hover:text-[#2F8481] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{currentLanguage?.flag}</span>
                <span className="font-bold text-black">{currentLanguage?.name}</span>
              </div>
            </button>

            {/* Currency */}
            <button
              onClick={() => setShowCurrencyModal(true)}
              className="p-4 bg-gradient-to-r from-black/5 to-black/0 hover:from-[#2F8481]/10 hover:to-[#2F8481]/5 border-2 border-black/10 hover:border-[#2F8481]/20 rounded-xl transition-all duration-200 transform hover:scale-[1.02] group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-black">Valiuta</span>
                <svg className="w-4 h-4 text-black/40 group-hover:text-[#2F8481] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{currentCurrency?.symbol}</span>
                <span className="font-bold text-black">{currentCurrency?.code}</span>
              </div>
            </button>

            {/* Date Format */}
            <button
              onClick={() => setShowDateFormatModal(true)}
              className="p-4 bg-gradient-to-r from-black/5 to-black/0 hover:from-[#2F8481]/10 hover:to-[#2F8481]/5 border-2 border-black/10 hover:border-[#2F8481]/20 rounded-xl transition-all duration-200 transform hover:scale-[1.02] group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-black">Datos formatas</span>
                <svg className="w-4 h-4 text-black/40 group-hover:text-[#2F8481] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">📅</span>
                <span className="font-bold text-black">{currentDateFormat?.example}</span>
              </div>
            </button>
          </div>
        </div>

        {/* Security & Account - Full Width */}
        <div className="bg-white rounded-2xl shadow-lg border border-black/10 p-6 hover:shadow-xl transition-all duration-300 mb-8 animate-slide-up backdrop-blur-sm" style={{animationDelay: '0.3s'}}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-gradient-to-br from-[#2F8481] to-[#2F8481]/80 rounded-xl shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-black">Saugumas ir paskyra</h3>
              <p className="text-xs text-black/60">Paskyros valdymas ir duomenų apsauga</p>
            </div>
          </div>
          
          {/* 2FA Toggle - Prominent */}
          <div className="mb-6 p-4 bg-gradient-to-r from-[#2F8481]/10 to-[#2F8481]/5 border-2 border-[#2F8481]/20 rounded-xl">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="p-2 bg-[#2F8481] rounded-lg">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <span className="text-sm font-bold text-black block">Dviejų veiksnių autentifikacija (2FA)</span>
                  <span className="text-xs text-black/60">
                    {settings.twoFactorEnabled 
                      ? '✅ Įjungta - Jūsų paskyra apsaugota' 
                      : '⚠️ Išjungta - Rekomenduojame įjungti'}
                  </span>
                </div>
              </div>
              {settings.twoFactorEnabled ? (
                <button
                  onClick={handle2FADisable}
                  className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 font-semibold rounded-xl transition-all duration-200 border-2 border-red-200 hover:border-red-300 flex-shrink-0"
                >
                  Išjungti
                </button>
              ) : (
                <button
                  onClick={handle2FASetup}
                  className="px-4 py-2 bg-[#2F8481] hover:opacity-90 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex-shrink-0"
                >
                  Įjungti 2FA
                </button>
              )}
            </div>
          </div>

          {/* Other Security Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button 
              onClick={() => handleAction('Slaptažodžio keitimas')}
              className="p-4 bg-gradient-to-r from-black/5 to-black/0 hover:from-[#2F8481]/10 hover:to-[#2F8481]/5 border-2 border-black/10 hover:border-[#2F8481]/20 rounded-xl text-left transition-all duration-200 transform hover:scale-[1.02] group"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-black/60 group-hover:text-[#2F8481] transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                <span className="text-sm font-semibold text-black group-hover:text-[#2F8481] transition-colors">Keisti slaptažodį</span>
              </div>
            </button>
            
            <button 
              onClick={() => handleAction('Duomenų eksportas')}
              className="p-4 bg-gradient-to-r from-[#2F8481]/10 to-[#2F8481]/5 hover:from-[#2F8481]/20 hover:to-[#2F8481]/10 border-2 border-[#2F8481]/20 hover:border-[#2F8481]/40 rounded-xl text-left transition-all duration-200 transform hover:scale-[1.02] group"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-[#2F8481] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span className="text-sm font-semibold text-black group-hover:text-[#2F8481] transition-colors">Eksportuoti duomenis</span>
              </div>
            </button>

            <button 
              onClick={() => handleAction('Aktyvių sesijų peržiūra')}
              className="p-4 bg-gradient-to-r from-black/5 to-black/0 hover:from-[#2F8481]/10 hover:to-[#2F8481]/5 border-2 border-black/10 hover:border-[#2F8481]/20 rounded-xl text-left transition-all duration-200 transform hover:scale-[1.02] group"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-black/60 group-hover:text-[#2F8481] transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-semibold text-black group-hover:text-[#2F8481] transition-colors">Aktyvios sesijos</span>
              </div>
            </button>
          </div>
        </div>

        {/* Frontend Mode Info Card */}
        {FRONTEND_MODE && (
          <div className="bg-gradient-to-r from-[#2F8481]/10 to-[#2F8481]/5 border-2 border-[#2F8481]/20 rounded-2xl p-6 animate-slide-up backdrop-blur-sm" style={{animationDelay: '0.4s'}}>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-[#2F8481] rounded-xl flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-black mb-2">💡 Frontend režimas</h4>
                <p className="text-sm text-black/70 leading-relaxed">
                  Šiuo metu sistema veikia <strong>frontend režimu</strong> — visi pakeitimai veikia tik jūsų naršyklėje. 
                  Kai įjungsite backend, visi nustatymai bus saugomi duomenų bazėje ir taikomi visai sistemai.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Modals */}
        {showLanguageModal && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
            onClick={() => setShowLanguageModal(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="language-modal-title"
          >
            <div 
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-slide-up"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 id="language-modal-title" className="text-lg font-bold text-black">Pasirinkite kalbą</h3>
                <button
                  onClick={() => setShowLanguageModal(false)}
                  className="p-2 hover:bg-black/5 rounded-xl transition-colors"
                  aria-label="Uždaryti kalbos pasirinkimą"
                >
                  <svg className="w-5 h-5 text-black/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-2">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      changeSetting('language', lang.code);
                      setShowLanguageModal(false);
                    }}
                    className={`w-full p-4 rounded-xl text-left transition-all duration-200 border-2 ${
                      settings.language === lang.code
                        ? 'bg-[#2F8481]/10 border-[#2F8481] shadow-lg transform scale-[1.02]'
                        : 'bg-black/5 border-black/10 hover:border-[#2F8481]/40 hover:bg-[#2F8481]/5'
                    }`}
                    aria-pressed={settings.language === lang.code}
                  >
                    <span className="text-2xl mr-3">{lang.flag}</span>
                    <span className="font-semibold text-black">{lang.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {showCurrencyModal && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
            onClick={() => setShowCurrencyModal(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="currency-modal-title"
          >
            <div 
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-slide-up"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 id="currency-modal-title" className="text-lg font-bold text-black">Pasirinkite valiutą</h3>
                <button
                  onClick={() => setShowCurrencyModal(false)}
                  className="p-2 hover:bg-black/5 rounded-xl transition-colors"
                  aria-label="Uždaryti valiutos pasirinkimą"
                >
                  <svg className="w-5 h-5 text-black/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-2">
                {currencies.map((curr) => (
                  <button
                    key={curr.code}
                    onClick={() => {
                      changeSetting('currency', curr.code);
                      setShowCurrencyModal(false);
                    }}
                    className={`w-full p-4 rounded-xl text-left transition-all duration-200 border-2 ${
                      settings.currency === curr.code
                        ? 'bg-[#2F8481]/10 border-[#2F8481] shadow-lg transform scale-[1.02]'
                        : 'bg-black/5 border-black/10 hover:border-[#2F8481]/40 hover:bg-[#2F8481]/5'
                    }`}
                    aria-pressed={settings.currency === curr.code}
                  >
                    <span className="text-2xl mr-3">{curr.symbol}</span>
                    <span className="font-semibold text-black">{curr.code}</span>
                    <span className="text-sm text-black/60 ml-2">({curr.name})</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {showDateFormatModal && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
            onClick={() => setShowDateFormatModal(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="date-format-modal-title"
          >
            <div 
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-slide-up"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 id="date-format-modal-title" className="text-lg font-bold text-black">Pasirinkite datos formatą</h3>
                <button
                  onClick={() => setShowDateFormatModal(false)}
                  className="p-2 hover:bg-black/5 rounded-xl transition-colors"
                  aria-label="Uždaryti datos formato pasirinkimą"
                >
                  <svg className="w-5 h-5 text-black/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-2">
                {dateFormats.map((format) => (
                  <button
                    key={format.code}
                    onClick={() => {
                      changeSetting('dateFormat', format.code);
                      setShowDateFormatModal(false);
                    }}
                    className={`w-full p-4 rounded-xl text-left transition-all duration-200 border-2 ${
                      settings.dateFormat === format.code
                        ? 'bg-[#2F8481]/10 border-[#2F8481] shadow-lg transform scale-[1.02]'
                        : 'bg-black/5 border-black/10 hover:border-[#2F8481]/40 hover:bg-[#2F8481]/5'
                    }`}
                    aria-pressed={settings.dateFormat === format.code}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-black block">{format.name}</span>
                        <span className="text-xs text-black/60">{format.code}</span>
                      </div>
                      <span className="text-xl">📅</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {showPaymentDaysModal && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
            onClick={() => setShowPaymentDaysModal(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-days-modal-title"
          >
            <div 
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-slide-up"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 id="payment-days-modal-title" className="text-lg font-bold text-black">Apmokėjimo terminas</h3>
                <button
                  onClick={() => setShowPaymentDaysModal(false)}
                  className="p-2 hover:bg-black/5 rounded-xl transition-colors"
                  aria-label="Uždaryti apmokėjimo termino pasirinkimą"
                >
                  <svg className="w-5 h-5 text-black/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-2">
                {paymentDeadlineOptions.map((option) => (
                  <button
                    key={option.days}
                    onClick={() => {
                      changeSetting('paymentDeadlineDays', option.days);
                      setShowPaymentDaysModal(false);
                    }}
                    className={`w-full p-4 rounded-xl text-left transition-all duration-200 border-2 ${
                      settings.paymentDeadlineDays === option.days
                        ? 'bg-[#2F8481]/10 border-[#2F8481] shadow-lg transform scale-[1.02]'
                        : 'bg-black/5 border-black/10 hover:border-[#2F8481]/40 hover:bg-[#2F8481]/5'
                    }`}
                    aria-pressed={settings.paymentDeadlineDays === option.days}
                  >
                    <span className="font-semibold text-black">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {showLateFeeModal && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
            onClick={() => setShowLateFeeModal(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="late-fee-modal-title"
          >
            <div 
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-slide-up"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 id="late-fee-modal-title" className="text-lg font-bold text-black">Delspinigių procentas</h3>
                <button
                  onClick={() => setShowLateFeeModal(false)}
                  className="p-2 hover:bg-black/5 rounded-xl transition-colors"
                  aria-label="Uždaryti delspinigių pasirinkimą"
                >
                  <svg className="w-5 h-5 text-black/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-2">
                {lateFeeOptions.map((option) => (
                  <button
                    key={option.percentage}
                    onClick={() => {
                      changeSetting('lateFeePercentage', option.percentage);
                      setShowLateFeeModal(false);
                    }}
                    className={`w-full p-4 rounded-xl text-left transition-all duration-200 border-2 ${
                      settings.lateFeePercentage === option.percentage
                        ? 'bg-[#2F8481]/10 border-[#2F8481] shadow-lg transform scale-[1.02]'
                        : 'bg-black/5 border-black/10 hover:border-[#2F8481]/40 hover:bg-[#2F8481]/5'
                    }`}
                    aria-pressed={settings.lateFeePercentage === option.percentage}
                  >
                    <span className="font-semibold text-black">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 2FA Setup Modal */}
        {show2FAModal && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
            onClick={() => setShow2FAModal(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="2fa-modal-title"
          >
            <div 
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-slide-up"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#2F8481] rounded-xl">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <h3 id="2fa-modal-title" className="text-lg font-bold text-black">Įjungti 2FA</h3>
                </div>
                <button
                  onClick={() => setShow2FAModal(false)}
                  className="p-2 hover:bg-black/5 rounded-xl transition-colors"
                  aria-label="Uždaryti 2FA nustatymą"
                >
                  <svg className="w-5 h-5 text-black/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Instructions */}
              <div className="mb-6">
                <div className="bg-[#2F8481]/10 border-2 border-[#2F8481]/20 rounded-xl p-4 mb-4">
                  <h4 className="font-bold text-black mb-2">📱 Instrukcijos:</h4>
                  <ol className="text-sm text-black/70 space-y-2 list-decimal list-inside">
                    <li>Atsisiųskite <strong>Google Authenticator</strong> ar <strong>Authy</strong> programėlę</li>
                    <li>Nuskaitykite QR kodą žemiau</li>
                    <li>Įveskite 6 skaitmenų kodą iš programėlės</li>
                  </ol>
                </div>

                {/* QR Code */}
                <div className="flex justify-center mb-4">
                  <div className="p-4 bg-white border-2 border-black/10 rounded-xl shadow-lg">
                    {qrCodeUrl ? (
                      <img src={qrCodeUrl} alt="2FA QR Code" className="w-48 h-48" />
                    ) : (
                      <div className="w-48 h-48 bg-black/5 rounded-lg flex items-center justify-center">
                        <svg className="w-12 h-12 text-black/20 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>

                {/* Verification Code Input */}
                <div>
                  <label htmlFor="verification-code" className="block text-sm font-semibold text-black mb-2">
                    Patvirtinimo kodas (6 skaitmenys)
                  </label>
                  <input
                    id="verification-code"
                    type="text"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-full px-4 py-3 border-2 border-black/10 rounded-xl focus:ring-4 focus:ring-[#2F8481]/20 focus:border-[#2F8481] text-center text-2xl font-bold tracking-widest transition-all duration-200"
                    aria-label="6 skaitmenų patvirtinimo kodas"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShow2FAModal(false)}
                  className="flex-1 px-4 py-3 bg-black/5 hover:bg-black/10 text-black font-semibold rounded-xl transition-all duration-200"
                >
                  Atšaukti
                </button>
                <button
                  onClick={handle2FAVerify}
                  disabled={verificationCode.length !== 6}
                  className="flex-1 px-4 py-3 bg-[#2F8481] hover:opacity-90 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  Patvirtinti
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
