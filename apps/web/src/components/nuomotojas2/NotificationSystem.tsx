import React, { useState } from 'react';
import {
  BellIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  CalendarIcon,
  EnvelopeIcon,
  PhoneIcon,
  CreditCardIcon
} from '@heroicons/react/24/outline';
import { formatNumberSafe } from '../../utils/format';

interface Tenant {
  id: string;
  name: string;
  phone: string;
  email: string;
  apartmentNumber: string;
  address: string;
  status: 'active' | 'expired' | 'pending';
  contractStart: string;
  contractEnd: string;
  monthlyRent: number;
  deposit: number;
  notification_count?: number;
  cleaning_required?: boolean;
  cleaning_cost?: number;
  last_notification_sent?: string;
  tenant_response?: 'wants_to_renew' | 'does_not_want_to_renew' | null;
  tenant_response_date?: string;
  planned_move_out_date?: string;
  move_out_notice_date?: string;
  payment_status?: 'paid' | 'unpaid' | 'overdue';
  meters_submitted?: boolean;
  last_payment_date?: string;
  outstanding_amount?: number;
  area?: number;
  rooms?: number;
  photos?: string[];
}

interface NotificationSystemProps {
  tenant: Tenant;
}

const NotificationSystem: React.FC<NotificationSystemProps> = ({ tenant }) => {
  const [showDetails, setShowDetails] = useState(false);

  // Skolos pranešimų logika
  const debtNotifications = () => {
    const notifications = [];
    
    // Patikrinti ar yra neapmokėtų sąskaitų
    if (tenant.payment_status === 'unpaid' || tenant.payment_status === 'overdue') {
      const status = tenant.payment_status === 'overdue' ? 'Vėluoja mokėti' : 'Nesumokėta';
      const color = tenant.payment_status === 'overdue' ? 'text-red-600 bg-red-50 border-red-200' : 'text-orange-600 bg-orange-50 border-orange-200';
      
      notifications.push({
        type: 'payment_issue',
        status: tenant.payment_status,
        message: `${status} - ${tenant.outstanding_amount && tenant.outstanding_amount > 0 ? formatNumberSafe(tenant.outstanding_amount) + ' €' : 'Nenurodyta suma'}`,
        color: color,
        priority: tenant.payment_status === 'overdue' ? 1 : 2
      });
    }
    
    // Patikrinti ar yra konkreti skolos suma (tik jei payment_status nėra 'paid')
    if (tenant.outstanding_amount && tenant.outstanding_amount > 0 && tenant.payment_status !== 'paid') {
      notifications.push({
        type: 'outstanding_debt',
        status: 'debt',
        message: `Neapmokėta skola: ${formatNumberSafe(tenant.outstanding_amount)} €`,
        color: 'text-red-600 bg-red-50 border-red-200',
        priority: 1
      });
    }
    
    return notifications;
  };

  // Pranešimų planavimo logika
  const notificationSchedule = () => {
    const contractEnd = new Date(tenant.contractEnd);
    const now = new Date();
    
               // Patikrinti ar sutartis jau pratęsta
      const isAutoRenewed = () => {
        const autoRenewalDate = new Date(contractEnd);
        autoRenewalDate.setMonth(autoRenewalDate.getMonth() + 6);
        return contractEnd < now && autoRenewalDate > now && !tenant.tenant_response;
      };
      
      // Patikrinti ar nuomininkas atsisakė pratėsimo
      if (tenant.tenant_response === 'does_not_want_to_renew') {
        return {
          status: 'rejected',
          message: 'Nuomininkas atsisakė pratėsimo - pranešimai sustabdyti',
          notifications: []
        };
      }
      
      // Patikrinti ar nuomininkas nori pratęsti
      if (tenant.tenant_response === 'wants_to_renew') {
        return {
          status: 'wants_renewal',
          message: 'Nuomininkas nori pratęsti - laukiama nuomotojo patvirtinimo',
          notifications: []
        };
      }
      
      // Jei sutartis jau pratęsta ir dar veikia
      if (isAutoRenewed()) {
        return {
          status: 'auto_renewed',
          message: 'Sutartis automatiškai pratęsta - nuomininkas gali bet kada pateikti išsikraustymo pranešimą',
          notifications: []
        };
      }
      
      // Jei pratęsta sutartis baigėsi - vėl pratėsiama automatiškai
      if (contractEnd < now && isAutoRenewed()) {
        return {
          status: 'auto_renew_again',
          message: 'Pratęsta sutartis baigėsi - automatiškai pratėsiama dar kartą',
          notifications: []
        };
      }
    
    // Pirmas pranešimas - 2 mėnesiai prieš
    const firstReminderDate = new Date(contractEnd);
    firstReminderDate.setMonth(firstReminderDate.getMonth() - 2);
    
    // Antras pranešimas - po 15 dienų
    const secondReminderDate = new Date(firstReminderDate);
    secondReminderDate.setDate(secondReminderDate.getDate() + 15);
    
    // Trečias pranešimas - po 29 dienų
    const thirdReminderDate = new Date(firstReminderDate);
    thirdReminderDate.setDate(thirdReminderDate.getDate() + 29);
    
    const notifications = [];
    
    if (firstReminderDate > now) {
      notifications.push({
        type: 'first_reminder',
        scheduledDate: firstReminderDate,
        message: 'Pirmas pranešimas: Ar norite pratęsti sutartį?',
        status: 'pending'
      });
    } else if (firstReminderDate <= now && secondReminderDate > now) {
      notifications.push({
        type: 'second_reminder',
        scheduledDate: secondReminderDate,
        message: 'Antras pranešimas: Priminimas apie sutarties pabaigą',
        status: 'pending'
      });
    } else if (secondReminderDate <= now && thirdReminderDate > now) {
      notifications.push({
        type: 'third_reminder',
        scheduledDate: thirdReminderDate,
        message: 'Paskutinis pranešimas: Sutartis bus automatiškai pratęsta',
        status: 'pending'
      });
    } else if (thirdReminderDate <= now && contractEnd > now) {
      notifications.push({
        type: 'auto_renewal',
        scheduledDate: contractEnd,
        message: 'Automatinis pratėsimas: Sutartis pratėsiama 6 mėnesiams',
        status: 'pending'
      });
    }
    
    return {
      status: 'active',
      message: 'Pranešimai planuojami pagal grafiką',
      notifications
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'rejected':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'wants_renewal':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'auto_renewed':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'auto_renew_again':
        return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'active':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'first_reminder':
        return <BellIcon className="w-5 h-5 text-blue-500" />;
      case 'second_reminder':
        return <ClockIcon className="w-5 h-5 text-orange-500" />;
      case 'third_reminder':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />;
      case 'auto_renewal':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'move_out_notice':
        return <XCircleIcon className="w-5 h-5 text-purple-500" />;
      default:
        return <BellIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('lt-LT');
  };

  const getDaysUntilContractEnd = () => {
    const endDate = new Date(tenant.contractEnd);
    const today = new Date();
    return Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <BellIcon className="w-5 h-5 mr-2" />
          Pranešimų sistema
        </h3>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          {showDetails ? 'Slėpti' : 'Rodyti'} detales
        </button>
      </div>

      {/* Skolos pranešimai - PRIORITY 1 */}
      {debtNotifications().length > 0 && (
        <div className="mb-4">
          <h4 className="font-medium text-gray-900 mb-2">Mokėjimo pranešimai:</h4>
          <div className="space-y-2">
            {debtNotifications().map((notification, index) => (
              <div key={index} className={`p-3 rounded-lg border ${notification.color}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <ExclamationTriangleIcon className="w-5 h-5 mr-2" />
                    <span className="font-medium">{notification.message}</span>
                  </div>
                  <div className="text-sm">
                    {notification.status === 'overdue' && <span className="text-red-600 font-semibold">KRITINĖ</span>}
                    {notification.status === 'unpaid' && <span className="text-orange-600 font-semibold">SVARBU</span>}
                  </div>
                </div>
                {/* Papildoma informacija apie mokėjimus */}
                <div className="mt-2 text-sm text-gray-600">
                  {tenant.last_payment_date && (
                    <p>Paskutinis mokėjimas: {formatDate(new Date(tenant.last_payment_date))}</p>
                  )}
                  {tenant.payment_status === 'overdue' && (
                    <p className="text-red-600 font-medium">Mokėjimas vėluoja!</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mokėjimo statusas - rodomas tik kai yra problemų arba kai statusas nėra 'paid' */}
      {(tenant.payment_status !== 'paid' || (tenant.outstanding_amount && tenant.outstanding_amount > 0)) && (
        <div className="mb-4 p-3 rounded-lg border border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <CreditCardIcon className="w-5 h-5 mr-2 text-gray-600" />
              <span className="font-medium text-gray-900">Mokėjimo statusas:</span>
            </div>
            <div className="text-right">
              <span className={`px-2 py-1 rounded text-sm font-medium ${
                tenant.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                tenant.payment_status === 'unpaid' ? 'bg-orange-100 text-orange-800' :
                tenant.payment_status === 'overdue' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {tenant.payment_status === 'paid' ? 'Sumokėta' :
                 tenant.payment_status === 'unpaid' ? 'Nesumokėta' :
                 tenant.payment_status === 'overdue' ? 'Vėluoja' :
                 'Nenurodyta'}
              </span>
            </div>
          </div>
          {tenant.outstanding_amount && tenant.outstanding_amount > 0 && (
            <div className="mt-2 text-sm text-gray-600">
              <p>Neapmokėta suma: <span className="font-semibold text-red-600">{formatNumberSafe(tenant.outstanding_amount)} €</span></p>
            </div>
          )}
          {tenant.last_payment_date && (
            <div className="mt-1 text-sm text-gray-600">
              <p>Paskutinis mokėjimas: {formatDate(new Date(tenant.last_payment_date))}</p>
            </div>
          )}
        </div>
      )}

      {/* Būsenos kortelė */}
      <div className={`mb-4 p-4 rounded-lg border ${getStatusColor(notificationSchedule().status)}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">{notificationSchedule().message}</p>
            <p className="text-sm mt-1">
              Sutarties pabaiga: {formatDate(new Date(tenant.contractEnd))} 
              ({getDaysUntilContractEnd()} dienų)
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm">
              Pranešimų skaičius: {formatNumberSafe(tenant.notification_count, 'Nėra')}
            </p>
            {tenant.last_notification_sent && (
              <p className="text-sm">
                Paskutinis: {formatDate(new Date(tenant.last_notification_sent))}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Pranešimų grafikas */}
      {showDetails && (
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Pranešimų grafikas:</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Pirmas pranešimas */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <BellIcon className="w-5 h-5 text-blue-500 mr-2" />
                <span className="font-medium text-blue-900">Pirmas pranešimas</span>
              </div>
              <p className="text-sm text-blue-700 mb-2">
                2 mėnesiai prieš sutarties pabaigą
              </p>
              <p className="text-xs text-blue-600">
                "Jūsų nuomos sutartis baigiasi [data]. Ar norite pratęsti sutartį?"
              </p>
            </div>

            {/* Antras pranešimas */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <ClockIcon className="w-5 h-5 text-orange-500 mr-2" />
                <span className="font-medium text-orange-900">Antras pranešimas</span>
              </div>
              <p className="text-sm text-orange-700 mb-2">
                Po 15 dienų nuo pirmo
              </p>
              <p className="text-xs text-orange-600">
                "Priminimas: Jei neatsakysite, sutartis bus automatiškai pratęsta"
              </p>
            </div>

            {/* Trečias pranešimas */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-500 mr-2" />
                <span className="font-medium text-red-900">Paskutinis pranešimas</span>
              </div>
              <p className="text-sm text-red-700 mb-2">
                Po 29 dienų nuo pirmo
              </p>
              <p className="text-xs text-red-600">
                "Paskutinis pranešimas: Sutartis bus automatiškai pratęsta"
              </p>
            </div>
          </div>

                     {/* Automatinio pratėsimo informacija */}
           <div className="bg-green-50 border border-green-200 rounded-lg p-4">
             <div className="flex items-center mb-2">
               <CheckCircleIcon className="w-5 h-5 text-green-500 mr-2" />
               <span className="font-medium text-green-900">Automatinis pratėsimas</span>
             </div>
                           <p className="text-sm text-green-700">
                Jei nuomininkas neatsako iki sutarties pabaigos, sutartis automatiškai pratėsiama 6 mėnesiams. 
                Jei pratęsta sutartis baigėsi, ji vėl automatiškai pratėsiama be jokio klausimo. 
                Po pratėsimo nuomininkas pats pateikia pranešimą kada nori išsikraustyti. Nuomotojas turi patvirtinti pratėsimą.
              </p>
           </div>

          {/* Aktyvūs pranešimai */}
          {notificationSchedule().notifications.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h5 className="font-medium text-yellow-900 mb-2">Planuojami pranešimai:</h5>
              <div className="space-y-2">
                {notificationSchedule().notifications.map((notification, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                    <div className="flex items-center">
                      {getNotificationIcon(notification.type)}
                      <span className="ml-2 text-sm">{notification.message}</span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatDate(notification.scheduledDate)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Nuomininko atsakymo informacija */}
      {tenant.tenant_response && (
        <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Nuomininko atsakymas:</h4>
          <div className="flex items-center">
            {tenant.tenant_response === 'wants_to_renew' ? (
              <CheckCircleIcon className="w-5 h-5 text-green-500 mr-2" />
            ) : (
              <XCircleIcon className="w-5 h-5 text-red-500 mr-2" />
            )}
            <span className="text-sm">
              {tenant.tenant_response === 'wants_to_renew' ? 'Nori pratęsti' : 'Nenori pratęsti'}
            </span>
            {tenant.tenant_response_date && (
              <span className="text-xs text-gray-500 ml-2">
                ({formatDate(new Date(tenant.tenant_response_date))})
              </span>
            )}
          </div>
        </div>
      )}

      {/* Išsikraustymo informacija */}
      {tenant.planned_move_out_date && (
        <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <h4 className="font-medium text-purple-900 mb-2">Išsikraustymo planas:</h4>
          <div className="space-y-1 text-sm">
            <p>Išsikraustymo data: {formatDate(new Date(tenant.planned_move_out_date))}</p>
            {tenant.move_out_notice_date && (
              <p>Pranešimo data: {formatDate(new Date(tenant.move_out_notice_date))}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationSystem; 