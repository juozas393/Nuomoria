import React, { useState } from 'react';
import LtDateInput from '../../components/ui/LtDateInput';
import {
  ExclamationTriangleIcon,
  ClockIcon,
  CalendarIcon,
  UserIcon,
  HomeIcon,
  CurrencyEuroIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';
import { validateMoveOutDate } from '../../utils/notificationSystem';
import { useAuth } from '../../context/AuthContext';

interface TenantContractTerminationProps {
  property: {
    id: string;
    address: string;
    apartment_number: string;
    tenant_name: string;
    rent: number;
    deposit_amount: number;
    deposit_paid_amount: number;
    contract_start: string;
    contract_end: string;
    auto_renewal_enabled: boolean;
    tenant_response: string | null;
  };
}

const TenantContractTermination: React.FC<TenantContractTerminationProps> = ({ property }) => {
  const { logout } = useAuth();
  const [terminationDate, setTerminationDate] = useState('');
  const [noticeGiven, setNoticeGiven] = useState(false);
  const [showCalculation, setShowCalculation] = useState(false);
  const [dateError, setDateError] = useState('');

  const today = new Date();
  const contractEnd = new Date(property.contract_end);
  const daysUntilEnd = Math.ceil((contractEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const monthsLeft = Math.ceil(daysUntilEnd / 30.44);

  // Validate termination date
  const validateTerminationDate = (date: string) => {
    if (!date) {
      setDateError('');
      return true;
    }

    const validation = validateMoveOutDate(date, property.contract_end);

    if (!validation.isValid) {
      setDateError(validation.error || '');
      return false;
    }

    setDateError('');
    return true;
  };

  // Handle date change with validation
  const handleDateChange = (e: { target: { value: string } }) => {
    const newDate = e.target.value;
    setTerminationDate(newDate);
    validateTerminationDate(newDate);
  };

  // Calculate deposit return based on termination date
  const calculateDepositReturn = (terminationDate: string) => {
    if (!terminationDate) return 0;

    const termination = new Date(terminationDate);
    const contractStart = new Date(property.contract_start);
    const contractEnd = new Date(property.contract_end);
    const daysUntilTermination = Math.ceil((termination.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // Calculate how many months have passed since contract start
    // If contract is auto-renewed, calculate from the renewal date (contract_end of original contract)
    // If not auto-renewed, calculate from contract_start
    let monthsSinceStart;
    if (property.auto_renewal_enabled) {
      // For auto-renewed contracts, calculate from the renewal date (original contract_end)
      const renewalDate = new Date(property.contract_end);
      renewalDate.setFullYear(renewalDate.getFullYear() - 1); // Go back 1 year to get original contract_end
      monthsSinceStart = Math.ceil((termination.getTime() - renewalDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
    } else {
      // For regular contracts, calculate from contract_start
      monthsSinceStart = Math.ceil((termination.getTime() - contractStart.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
    }

    // Check if tenant gave proper notice (30+ days before termination)
    const daysNoticeGiven = noticeGiven ? daysUntilTermination : 0;

    // 3. Pratęsta sutartis (automatinis arba susitarimu pagrįstas pratęsimas)
    if (property.auto_renewal_enabled && property.tenant_response === 'does_not_want_to_renew') {
      if (daysNoticeGiven >= 30) {
        return property.deposit_paid_amount; // Pranešus apie išsikėlimą prieš 30 dienų: Depozitas grąžinamas pilnai
      } else {
        return Math.max(0, property.deposit_paid_amount - property.rent); // Nepranešus prieš 30 dienų: 1 mėnesio nuomos suma lieka nuomotojui
      }
    }

    // 1. Nutraukimas per pirmus 12 mėnesių
    if (daysUntilTermination > 0 && property.tenant_response === 'does_not_want_to_renew' && monthsSinceStart < 12) {
      if (daysNoticeGiven >= 30) {
        // Pranešus prieš 30 dienų: 1 mėnesio nuomos suma lieka nuomotojui
        return Math.max(0, property.deposit_paid_amount - property.rent);
      } else {
        // Be įspėjimo prieš 30 dienų: Depozitas negrąžinamas
        return 0;
      }
    }

    // 2. Išsikėlimas pasibaigus pradinės sutarties laikotarpiui (po 12 mėnesių)
    if (daysUntilTermination > 0 && property.tenant_response === 'does_not_want_to_renew' && monthsSinceStart >= 12) {
      if (daysNoticeGiven >= 30) {
        // Pranešus prieš 30 dienų: Depozitas grąžinamas pilnai
        return property.deposit_paid_amount;
      } else {
        // Nepranešus prieš 30 dienų: 1 mėnesio nuomos suma lieka nuomotojui
        return Math.max(0, property.deposit_paid_amount - property.rent);
      }
    }

    // B. Sutarties pabaigoje (išsikrausto laiku)
    if (daysUntilTermination <= 0) {
      // Check if tenant gave proper notice (30+ days before contract end)
      if (daysNoticeGiven >= 30) {
        return property.deposit_paid_amount; // Full deposit return
      } else {
        // If notice was given less than 30 days, landlord keeps 1 month rent
        return Math.max(0, property.deposit_paid_amount - property.rent);
      }
    }

    // If tenant responds to notification (1 month before end) and wants to leave
    if (daysUntilTermination > 0 && daysUntilTermination <= 30) {
      // Check if tenant gave proper notice (30+ days before contract end)
      if (daysNoticeGiven >= 30) {
        return property.deposit_paid_amount; // Full deposit return
      } else {
        // If notice was given less than 30 days, landlord keeps 1 month rent
        return Math.max(0, property.deposit_paid_amount - property.rent);
      }
    }

    return 0;
  };

  const depositReturn = calculateDepositReturn(terminationDate);
  const depositLoss = property.deposit_paid_amount - depositReturn;
  const isDateValid = !dateError && terminationDate;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with logout button */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-black">Sutarties nutraukimas</h1>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={logout}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                title="Atsijungti"
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5" />
                <span className="hidden sm:inline">Atsijungti</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Sutarties nutraukimas</h1>
              <p className="text-gray-600 mt-1">Pasirinkite kada norite išsikraustyti</p>
            </div>
            <div className="flex items-center space-x-2">
              <HomeIcon className="w-6 h-6 text-blue-600" />
              <span className="text-lg font-medium text-gray-900">
                {property.address} #{property.apartment_number}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Termination Form */}
          <div className="space-y-6">
            {/* Current Contract Info */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Dabartinė sutartis</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Nuomininkas:</span>
                  <span className="font-medium">{property.tenant_name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Mėnesinė nuoma:</span>
                  <span className="font-medium">€{property.rent}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Depozitas:</span>
                  <span className="font-medium">€{property.deposit_paid_amount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Sutarties pabaiga:</span>
                  <span className="font-medium">{property.contract_end}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Liko iki pabaigos:</span>
                  <span className={`font-medium ${daysUntilEnd <= 30 ? 'text-red-600' : 'text-primary-600'}`}>
                    {daysUntilEnd} dienų
                  </span>
                </div>
              </div>
            </div>

            {/* Termination Form */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Nutraukimo informacija</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Išsikėlimo data
                  </label>
                  <LtDateInput
                    value={terminationDate}
                    onChange={handleDateChange}
                    min={new Date().toISOString().split('T')[0]}
                    max={property.contract_end}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${dateError
                      ? 'border-red-300 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-blue-500'
                      }`}
                  />
                  {dateError && (
                    <div className="mt-2 flex items-center space-x-2 text-red-600 text-sm">
                      <ExclamationTriangleIcon className="w-4 h-4" />
                      <span>{dateError}</span>
                    </div>
                  )}
                  <div className="mt-2 text-xs text-gray-500">
                    Maksimali data: {property.contract_end} (sutarties pabaiga)
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="noticeGiven"
                    checked={noticeGiven}
                    onChange={(e) => setNoticeGiven(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="noticeGiven" className="text-sm text-gray-700">
                    Pranešiu mėnesį prieš išsikėlimą
                  </label>
                </div>

                <button
                  onClick={() => setShowCalculation(true)}
                  disabled={!isDateValid}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Skaičiuoti depozito grąžinimą
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Results */}
          <div className="space-y-6">
            {/* Deposit Calculation Results */}
            {showCalculation && terminationDate && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Depozito grąžinimo skaičiavimas</h2>

                <div className="space-y-4">
                  {/* Termination Date */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                    <span className="text-gray-600">Išsikėlimo data:</span>
                    <span className="font-medium">{terminationDate}</span>
                  </div>

                  {/* Notice Period */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                    <span className="text-gray-600">Pranešimo laikotarpis:</span>
                    <span className={`font-medium ${noticeGiven ? 'text-primary-600' : 'text-red-600'}`}>
                      {noticeGiven ? 'Taip' : 'Ne'}
                    </span>
                  </div>

                  {/* Deposit Return Calculation */}
                  <div className="border-t pt-4">
                    <h3 className="text-md font-semibold text-gray-900 mb-3">Skaičiavimas:</h3>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Sumokėtas depozitas:</span>
                        <span className="font-medium">€{property.deposit_paid_amount}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Grąžinama:</span>
                        <span className={`font-medium ${depositReturn > 0 ? 'text-primary-600' : 'text-red-600'}`}>
                          {depositReturn > 0 ? `€${depositReturn}` : 'Nėra grąžinamos sumos'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Nuostolis:</span>
                        <span className={`font-medium ${depositLoss > 0 ? 'text-red-600' : 'text-primary-600'}`}>
                          €{depositLoss}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Result Message */}
                  <div className={`p-4 rounded-md ${depositReturn === property.deposit_paid_amount
                    ? 'bg-primary-50 border border-primary-200'
                    : depositReturn > 0
                      ? 'bg-yellow-50 border border-yellow-200'
                      : 'bg-red-50 border border-red-200'
                    }`}>
                    <div className="flex items-center space-x-2">
                      {depositReturn === property.deposit_paid_amount ? (
                        <CheckCircleIcon className="w-5 h-5 text-primary-600" />
                      ) : depositReturn > 0 ? (
                        <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />
                      ) : (
                        <XCircleIcon className="w-5 h-5 text-red-600" />
                      )}
                      <span className={`font-medium ${depositReturn === property.deposit_paid_amount
                        ? 'text-primary-800'
                        : depositReturn > 0
                          ? 'text-yellow-800'
                          : 'text-red-800'
                        }`}>
                        {depositReturn === property.deposit_paid_amount
                          ? 'Visas depozitas grąžinamas'
                          : depositReturn > 0
                            ? `Grąžinama €${depositReturn} (nuostolis €${depositLoss})`
                            : 'Depozitas negrąžinamas'
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Rules Information */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Depozito grąžinimo taisyklės</h2>
              <div className="space-y-3 text-sm">
                <div className="flex items-start space-x-2">
                  <CheckCircleIcon className="w-4 h-4 text-primary-600 mt-0.5" />
                  <div>
                    <span className="font-medium text-primary-800">Sutarties pabaigoje:</span>
                    <p className="text-gray-600">Visas depozitas grąžinamas (minus valymo/žalos išlaidos)</p>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <XCircleIcon className="w-4 h-4 text-red-600 mt-0.5" />
                  <div>
                    <span className="font-medium text-red-800">Per pirmus 6 mėn.:</span>
                    <p className="text-gray-600">Depozitas pilnai negrąžinamas</p>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <XCircleIcon className="w-4 h-4 text-red-600 mt-0.5" />
                  <div>
                    <span className="font-medium text-red-800">6-12 mėn. laikotarpiu:</span>
                    <p className="text-gray-600">Depozitas negrąžinamas (net jei pranešė laiku)</p>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <ExclamationTriangleIcon className="w-4 h-4 text-yellow-600 mt-0.5" />
                  <div>
                    <span className="font-medium text-yellow-800">Po 12 mėn., praneša 30 d.:</span>
                    <p className="text-gray-600">Nuomotojui 1 mėnuo, likusį nuomininkui</p>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <ExclamationTriangleIcon className="w-4 h-4 text-yellow-600 mt-0.5" />
                  <div>
                    <span className="font-medium text-yellow-800">Pratęsta sutartis:</span>
                    <p className="text-gray-600">30 d. prieš - visas depozitas, be pranešimo - nuostolis 1 mėnuo</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex justify-center space-x-4">
          <button className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700">
            Atšaukti
          </button>
          <button
            className="bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700"
            disabled={!terminationDate || !showCalculation}
          >
            Patvirtinti nutraukimą
          </button>
        </div>
      </div>
    </div>
  );
};

export default TenantContractTermination; 