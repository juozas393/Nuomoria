import type { Database } from '../lib/supabase';
import { propertiesApi } from '../lib/api';

type Property = Database['public']['Tables']['properties']['Row'];

export interface ContractNotification {
  id: string;
  property_id: string;
  tenant_name: string;
  tenant_email: string;
  tenant_phone: string;
  notification_type: 'contract_expiring' | 'contract_expired' | 'renewal_reminder' | 'final_reminder' | 'tenant_response' | 'landlord_notification' | 'auto_renewal' | 'deposit_deduction';
  message: string;
  sent_date: Date;
  days_until_expiry: number;
  status: 'pending' | 'sent' | 'failed';
  tenant_response?: 'wants_to_renew' | 'does_not_want_to_renew' | 'no_response';
  response_date?: Date;
}

export interface ContractStatus {
  status: 'active' | 'expiring_in_2_months' | 'expiring_in_1_month' | 'expiring_in_15_days' | 'expiring_tomorrow' | 'expired' | 'auto_renewed';
  text: string;
  color: string;
  urgent: boolean;
  daysLeft: number;
  shouldSendNotification: boolean;
  notificationType: string;
  shouldAutoRenew: boolean;
}

export const calculateContractStatus = (property: Property): ContractStatus => {
  const today = new Date();
  const contractEnd = new Date(property.contract_end);
  const contractStart = new Date(property.contract_start);
  const diffTime = contractEnd.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const diffMonths = Math.ceil(diffDays / 30);

  // Calculate original contract duration in months
  const contractDurationMs = contractEnd.getTime() - contractStart.getTime();
  const contractDurationMonths = Math.round(contractDurationMs / (1000 * 60 * 60 * 24 * 30.44));

  // Check if this is a long-term contract (>12 months)
  const isLongTermContract = contractDurationMonths > 12;

  // Check if tenant has already responded
  const tenantResponse = property.tenant_response as string | null;
  const notificationCount = property.notification_count || 0;

  // For maintenance properties, no notifications or auto-renewal
  if (property.status === 'maintenance') {
    return {
      status: 'active',
      text: 'Remontuojamas',
      color: 'bg-amber-100 text-amber-800',
      urgent: false,
      daysLeft: 0,
      shouldSendNotification: false,
      notificationType: 'none',
      shouldAutoRenew: false
    };
  }

  // For vacant properties, no notifications or auto-renewal
  if (property.status === 'vacant') {
    return {
      status: 'active',
      text: 'Laisvas',
      color: 'bg-yellow-100 text-yellow-800',
      urgent: false,
      daysLeft: 0,
      shouldSendNotification: false,
      notificationType: 'none',
      shouldAutoRenew: false
    };
  }

  // If tenant doesn't want to renew, no auto-renewal
  if (tenantResponse === 'does_not_want_to_renew') {
    return {
      status: 'active',
      text: 'Aktyvi - nuomininkas nenori pratęsti',
      color: 'bg-orange-100 text-orange-800',
      urgent: false,
      daysLeft: diffDays,
      shouldSendNotification: false,
      notificationType: 'none',
      shouldAutoRenew: false
    };
  }

  // If tenant wants to renew, handle accordingly
  if (tenantResponse === 'wants_to_renew') {
    if (diffDays < 0) {
      return {
        status: 'active',
        text: 'Pratęsta',
        color: 'bg-green-100 text-green-800',
        urgent: false,
        daysLeft: diffDays,
        shouldSendNotification: false,
        notificationType: 'auto_renewal',
        shouldAutoRenew: true
      };
    } else {
      return {
        status: 'active',
        text: 'Pratęsta',
        color: 'bg-green-100 text-green-800',
        urgent: false,
        daysLeft: diffDays,
        shouldSendNotification: false,
        notificationType: 'none',
        shouldAutoRenew: true
      };
    }
  }

  // For long-term contracts (>12 months), check if they're auto-renewed
  if (isLongTermContract) {
    // Check if contract has been running for more than 12 months (auto-renewed)
    const monthsSinceStart = Math.round((today.getTime() - contractStart.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
    const isAutoRenewed = monthsSinceStart > 12;

    if (diffDays < 0) {
      return {
        status: 'expired',
        text: 'Sutartis baigėsi',
        color: 'bg-red-100 text-red-800',
        urgent: true,
        daysLeft: diffDays,
        shouldSendNotification: false,
        notificationType: 'landlord_notification',
        shouldAutoRenew: false
      };
    } else {
      return {
        status: 'active',
        text: isAutoRenewed ? 'Pratęsta' : 'Aktyvi',
        color: isAutoRenewed ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800',
        urgent: false,
        daysLeft: diffDays,
        shouldSendNotification: false,
        notificationType: 'none',
        shouldAutoRenew: isAutoRenewed
      };
    }
  }

  // For 1-year contracts only: notification logic
  // If contract has expired, check tenant response
  if (diffDays < 0) {
    // If no response, auto-renew (tenant gets 1 more month)
    if (!tenantResponse || tenantResponse === 'no_response') {
      return {
        status: 'expired',
        text: 'Sutartis baigėsi - automatiškai pratęsiama',
        color: 'bg-blue-100 text-blue-800',
        urgent: false,
        daysLeft: diffDays,
        shouldSendNotification: false,
        notificationType: 'auto_renewal',
        shouldAutoRenew: true
      };
    }
    // If tenant wants to renew, show that contract is renewed
    else if (tenantResponse === 'wants_to_renew') {
      return {
        status: 'active',
        text: 'Pratęsta',
        color: 'bg-green-100 text-green-800',
        urgent: false,
        daysLeft: diffDays,
        shouldSendNotification: false,
        notificationType: 'auto_renewal',
        shouldAutoRenew: true
      };
    }
    // If tenant doesn't want to renew, show expired
    else {
      return {
        status: 'expired',
        text: 'Sutartis baigėsi - nuomininkas nenori pratęsti',
        color: 'bg-red-100 text-red-800',
        urgent: true,
        daysLeft: diffDays,
        shouldSendNotification: false,
        notificationType: 'landlord_notification',
        shouldAutoRenew: false
      };
    }
  }
  // If less than 1 month + 1 day remaining (31 days), auto-renew if no response
  else if (diffDays <= 31) {
    // If no response yet, auto-renew
    if (!tenantResponse || tenantResponse === 'no_response') {
      return {
        status: 'expiring_in_1_month',
        text: `Liko ${diffDays} dienų - automatiškai pratęsiama`,
        color: 'bg-blue-100 text-blue-800',
        urgent: false,
        daysLeft: diffDays,
        shouldSendNotification: false,
        notificationType: 'auto_renewal',
        shouldAutoRenew: true
      };
    }
    // If tenant wants to renew, auto-renew
    else if (tenantResponse === 'wants_to_renew') {
      return {
        status: 'active',
        text: 'Pratęsta',
        color: 'bg-green-100 text-green-800',
        urgent: false,
        daysLeft: diffDays,
        shouldSendNotification: false,
        notificationType: 'auto_renewal',
        shouldAutoRenew: true
      };
    }
    // If tenant doesn't want to renew, show that
    else {
      return {
        status: 'expiring_in_1_month',
        text: `Liko ${diffDays} dienų - nuomininkas nenori pratęsti`,
        color: 'bg-red-100 text-red-800',
        urgent: false,
        daysLeft: diffDays,
        shouldSendNotification: false,
        notificationType: 'none',
        shouldAutoRenew: false
      };
    }
  }
  // If less than 2 months remaining (60 days), send notification
  else if (diffDays <= 60) {
    // If no response yet, send notification
    if (!tenantResponse || tenantResponse === 'no_response') {
      return {
        status: 'expiring_in_2_months',
        text: `Liko ${diffDays} dienų - reikia nuomininko atsakymo`,
        color: 'bg-orange-100 text-orange-800',
        urgent: true,
        daysLeft: diffDays,
        shouldSendNotification: true,
        notificationType: 'contract_expiring',
        shouldAutoRenew: false
      };
    }
    // If tenant wants to renew, show that
    else if (tenantResponse === 'wants_to_renew') {
      return {
        status: 'active',
        text: 'Pratęsta',
        color: 'bg-green-100 text-green-800',
        urgent: false,
        daysLeft: diffDays,
        shouldSendNotification: false,
        notificationType: 'auto_renewal',
        shouldAutoRenew: true
      };
    }
    // If tenant doesn't want to renew, show that
    else {
      return {
        status: 'expiring_in_2_months',
        text: `Liko ${diffDays} dienų - nuomininkas nenori pratęsti`,
        color: 'bg-red-100 text-red-800',
        urgent: false,
        daysLeft: diffDays,
        shouldSendNotification: false,
        notificationType: 'none',
        shouldAutoRenew: false
      };
    }
  }
  // If more than 2 months remaining, normal active status
  else {
    return {
      status: 'active',
      text: 'Aktyvi',
      color: 'bg-green-100 text-green-800',
      urgent: false,
      daysLeft: diffDays,
      shouldSendNotification: false,
      notificationType: 'none',
      shouldAutoRenew: false
    };
  }
};

export const generateNotificationMessage = (property: Property, notificationType: string): string => {
  const contractEnd = new Date(property.contract_end);
  const formattedDate = `${contractEnd.getFullYear()}-${String(contractEnd.getMonth() + 1).padStart(2, '0')}-${String(contractEnd.getDate()).padStart(2, '0')}`;

  switch (notificationType) {
    case 'contract_expiring':
      return `Sveiki ${property.tenant_name}!

Jūsų nuomos sutartis butui ${property.address} ${property.apartment_number} baigiasi ${formattedDate}.

Ar norėtumėte pratęsti nuomos sutartį dar vieneriems metams?

Prašome atsakyti per 15 dienų:
- Jei NORITE pratęsti: atsakykite "TAIP" arba susisiekite su mumis
- Jei NENORITE pratęsti: atsakykite "NE"

Jei neatakėte per 15 dienų, sutartis bus automatiškai pratęsta 6 mėnesiams.

Kontaktai:
- Telefonu: +370 600 00000
- El. paštu: info@nuomosistema.lt

Su pagarba,
Nuomos valdymo komanda`;

    case 'renewal_reminder':
      return `Sveiki ${property.tenant_name}!

Primename, kad jūsų nuomos sutartis butui ${property.address} ${property.apartment_number} baigiasi ${formattedDate}.

Prašome atsakyti dėl sutarties pratęsimo per ${calculateContractStatus(property).daysLeft} dienų.

Jei dar neatakėte, prašome susisiekti:
- Telefonu: +370 600 00000
- El. paštu: info@nuomosistema.lt

Su pagarba,
Nuomos valdymo komanda`;

    case 'final_reminder':
      return `Sveiki ${property.tenant_name}!

Jūsų nuomos sutartis butui ${property.address} ${property.apartment_number} baigiasi ${formattedDate}.

Tai paskutinis pranešimas. Jei nenorite pratęsti sutarties, prašome išsikraustyti iki sutarties pabaigos.

Kontaktai:
- Telefonu: +370 600 00000
- El. paštu: info@nuomosistema.lt

Su pagarba,
Nuomos valdymo komanda`;

    case 'auto_renewal':
      return `Sveiki ${property.tenant_name}!

Jūsų nuomos sutartis butui ${property.address} ${property.apartment_number} buvo automatiškai pratęsta 6 mėnesiams.

Nauja sutarties pabaigos data: ${(() => { const d = new Date(new Date(property.contract_end).getTime() + 6 * 30 * 24 * 60 * 60 * 1000); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })()}

Kontaktai:
- Telefonu: +370 600 00000
- El. paštu: info@nuomosistema.lt

Su pagarba,
Nuomos valdymo komanda`;

    case 'landlord_notification': {
      const tenantResponse = property.tenant_response as string | null;
      if (tenantResponse === 'wants_to_renew') {
        return `Sveiki nuomotojau!

Nuomininkas ${property.tenant_name} (Butas ${property.apartment_number}, ${property.address}) NORI pratęsti sutartį.

Sutartis baigėsi ${formattedDate}, bet nuomininkas pageidauja pratęsimo.

Veiksmai:
1. Susisiekite su nuomininku ir sutarkite naują sutartį
2. Atnaujinkite sutarties datą sistemoje

Kontaktai:
- Telefonu: +370 600 00000
- El. paštu: info@nuomosistema.lt

Su pagarba,
Nuomos valdymo sistema`;
      } else if (tenantResponse === 'does_not_want_to_renew') {
        return `Sveiki nuomotojau!

Nuomininkas ${property.tenant_name} (Butas ${property.apartment_number}, ${property.address}) NENORI pratęsti sutarties.

Sutartis baigėsi ${formattedDate}.

Veiksmai:
1. Susisiekite su nuomininku dėl išsikraustymo
2. Pradėkite ieškoti naujų nuomininkų
3. Atnaujinkite buto statusą sistemoje

Kontaktai:
- Telefonu: +370 600 00000
- El. paštu: info@nuomosistema.lt

Su pagarba,
Nuomos valdymo sistema`;
      } else {
        return `Sveiki nuomotojau!

Nuomininkas ${property.tenant_name} (Butas ${property.apartment_number}, ${property.address}) NEGAVO atsakymo dėl sutarties pratęsimo.

Sutartis baigėsi ${formattedDate}.

Veiksmai:
1. Susisiekite su nuomininku dėl išsikraustymo
2. Pradėkite ieškoti naujų nuomininkų
3. Atnaujinkite buto statusą sistemoje

Kontaktai:
- Telefonu: +370 600 00000
- El. paštu: info@nuomosistema.lt

Su pagarba,
Nuomos valdymo sistema`;
      }
    }

    case 'deposit_deduction':
      return `Sveiki nuomotojau!

Nuomininkas ${property.tenant_name} (Butas ${property.apartment_number}, ${property.address}) išsikraustė.

Depozito išskaitymai:
- Antčiužiniai: ${property.bedding_owner === 'landlord' ? '50€' : '0€'}
- Valymo paslaugos: ${property.cleaning_required ? `${property.cleaning_cost}€` : '0€'}
- Išskaitymai iš depozito: ${property.deposit_deductions}€

Kontaktai:
- Telefonu: +370 600 00000
- El. paštu: info@nuomosistema.lt

Su pagarba,
Nuomos valdymo sistema`;

    default:
      return '';
  }
};

export const shouldSendNotification = (property: Property): boolean => {
  const contractStatus = calculateContractStatus(property);
  return contractStatus.shouldSendNotification;
};

export const getNotificationType = (property: Property): string => {
  const contractStatus = calculateContractStatus(property);
  return contractStatus.notificationType;
};

export const sendNotification = async (property: Property): Promise<boolean> => {
  try {
    const notificationType = getNotificationType(property);
    const message = generateNotificationMessage(property, notificationType);

    // Simulate sending notification
    if (import.meta.env.DEV) console.log(`Sending ${notificationType} notification to ${property.tenant_name}:`);
    if (import.meta.env.DEV) console.log(message);

    // Update notification count and last sent date in database
    await propertiesApi.update(property.id, {
      notification_count: (property.notification_count || 0) + 1,
      last_notification_sent: new Date().toISOString()
    });

    // Automatiškai pratęsti sutartį, jei nuomininkas išsiunčia pranešimą
    // ir sutartis baigėsi arba baigiasi greitai
    await autoRenewOnNotification(property);

    // In real implementation, this would send email/SMS
    // For now, we'll just log it

    return true;
  } catch (error) {
    if (import.meta.env.DEV) console.error('Failed to send notification:', error);
    return false;
  }
};

export const checkAndSendNotifications = async (properties: Property[]): Promise<void> => {
  const notificationsToSend = properties.filter(shouldSendNotification);

  for (const property of notificationsToSend) {
    const success = await sendNotification(property);
    if (success) {
      if (import.meta.env.DEV) console.log(`Notification sent successfully to ${property.tenant_name}`);
    } else {
      if (import.meta.env.DEV) console.error(`Failed to send notification to ${property.tenant_name}`);
    }
  }
};

// Helper function to handle tenant response
export const handleTenantResponse = async (propertyId: string, response: 'wants_to_renew' | 'does_not_want_to_renew'): Promise<void> => {
  try {
    // In real implementation, this would update the database
    if (import.meta.env.DEV) console.log(`Tenant response for property ${propertyId}: ${response}`);

    if (response === 'wants_to_renew') {
      if (import.meta.env.DEV) console.log('Tenant wants to renew - automatically extending contract for 1 year');
      // Automatically extend contract for 1 year
      // This will be handled by autoRenewOnPositiveResponse function
    } else {
      if (import.meta.env.DEV) console.log('Tenant does not want to renew - landlord will be notified when contract expires');
    }
  } catch (error) {
    if (import.meta.env.DEV) console.error('Failed to handle tenant response:', error);
  }
};

// Helper function to calculate deposit deductions
export const calculateDepositDeductions = (property: Property): number => {
  let deductions = 0;

  // Bedding fee (50€ if landlord provides bedding)
  if (property.bedding_owner === 'landlord' && !property.bedding_fee_paid) {
    deductions += 50;
  }

  // Cleaning cost if required
  if (property.cleaning_required) {
    deductions += property.cleaning_cost || 0;
  }

  return deductions;
};

// Helper function to calculate deposit return based on notice period
export const calculateDepositReturn = (property: Property): number => {
  const today = new Date();
  const contractEnd = new Date(property.contract_end);
  const daysUntilEnd = Math.ceil((contractEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const depositPaid = property.deposit_paid_amount || 0;
  const oneMonthRent = property.rent || 0;

  if (import.meta.env.DEV) console.log(`DEBUG calculateDepositReturn:`);
  if (import.meta.env.DEV) console.log(`- Today: ${today.toISOString()}`);
  if (import.meta.env.DEV) console.log(`- Contract End: ${contractEnd.toISOString()}`);
  if (import.meta.env.DEV) console.log(`- Days Until End: ${daysUntilEnd}`);
  if (import.meta.env.DEV) console.log(`- Deposit Paid: ${depositPaid}`);
  if (import.meta.env.DEV) console.log(`- One Month Rent: ${oneMonthRent}`);

  // Jei nėra išsikraustymo pranešimo, depozitas lieka galioti
  if (!property.tenant_response || !property.planned_move_out_date) {
    return depositPaid;
  }

  // Tik jei nuomininkas nori išsikraustyti
  if (property.tenant_response !== 'does_not_want_to_renew') {
    return depositPaid;
  }

  const plannedMoveOut = new Date(property.planned_move_out_date);
  const responseDate = property.tenant_response_date ? new Date(property.tenant_response_date) : null;

  // Skaičiuojame pranešimo laiką
  let daysNotice = 0;
  if (responseDate) {
    daysNotice = Math.ceil((plannedMoveOut.getTime() - responseDate.getTime()) / (1000 * 60 * 60 * 24));
    if (import.meta.env.DEV) console.log(`DEBUG: Pranešimo laikas: ${daysNotice} dienų`);
    if (import.meta.env.DEV) console.log(`DEBUG: Pateikimo data: ${responseDate.toISOString()}`);
    if (import.meta.env.DEV) console.log(`DEBUG: Išsikraustymo data: ${plannedMoveOut.toISOString()}`);
  }

  // 1. SUTARTIS DAR GALIOJA (iki pabaigos datos)
  if (daysUntilEnd > 0) {

    // 1.1. IŠSIKRAUSTYMAS SUTARTIES PABAIGOJE
    if (plannedMoveOut.getTime() === contractEnd.getTime()) {
      if (import.meta.env.DEV) console.log(`DEBUG: Išsikraustymas sutarties pabaigoje, pranešimo laikas: ${daysNotice} dienų`);
      if (import.meta.env.DEV) console.log(`DEBUG: Deposit paid: ${depositPaid}, One month rent: ${oneMonthRent}`);
      if (daysNotice >= 30) {
        if (import.meta.env.DEV) console.log(`DEBUG: Grąžinamas visas depozitas (≥30 dienų)`);
        return depositPaid; // Grąžinamas visas depozitas
      } else {
        if (import.meta.env.DEV) console.log(`DEBUG: Išskaičiuojama 1 mėn. nuoma (<30 dienų)`);
        const result = Math.max(0, depositPaid - oneMonthRent);
        if (import.meta.env.DEV) console.log(`DEBUG: Rezultatas: ${result} (${depositPaid} - ${oneMonthRent})`);
        return result; // Išskaičiuojama 1 mėn. nuoma
      }
    }

    // 1.2. IŠSIKRAUSTYMAS ANKSCIAU NEI SUTARTIES PABAIGA
    if (plannedMoveOut.getTime() < contractEnd.getTime()) {
      if (daysNotice >= 30) {
        return Math.max(0, depositPaid - oneMonthRent); // Išskaičiuojama 1 mėn. nuoma
      } else {
        return 0; // Išskaičiuojamas visas depozitas
      }
    }
  }

  // 2. SUTARTIS PASIBAIGIA IR TAMPA NETERMINUOTA
  if (daysUntilEnd <= 0) {

    // 2.1. NUOMININKAS NORI IŠSIKRAUSTYTI (neterminuotoje fazėje)
    if (import.meta.env.DEV) console.log(`DEBUG: Neterminuota sutartis, pranešimo laikas: ${daysNotice} dienų`);
    if (daysNotice >= 30) {
      if (import.meta.env.DEV) console.log(`DEBUG: Grąžinamas visas depozitas (≥30 dienų)`);
      return depositPaid; // Grąžinamas visas depozitas
    } else {
      if (import.meta.env.DEV) console.log(`DEBUG: Išskaičiuojama 1 mėn. nuoma (<30 dienų)`);
      return Math.max(0, depositPaid - oneMonthRent); // Išskaičiuojama 1 mėn. nuoma
    }
  }

  // Numatytoji logika - depozitas grąžinamas
  if (import.meta.env.DEV) console.log(`DEBUG: Galutinis depozito grąžinimas: ${depositPaid}`);
  return depositPaid;
};

// Calculate additional deductions (cleaning, damages, unpaid bills, etc.)
export const calculateAdditionalDeductions = (property: Property): number => {
  let totalDeductions = 0;

  // 🧼 Valymo išlaidos
  if (property.cleaning_required && property.cleaning_cost) {
    totalDeductions += property.cleaning_cost;
  }

  // 🛏️ Sugadintas inventorių (pvz. čiužinį)
  if (property.deposit_deductions) {
    totalDeductions += property.deposit_deductions;
  }

  // 📩 Neapmokėtas sąskaitas (jei būtų papildomas laukas)
  // if (property.unpaid_bills) {
  //   totalDeductions += property.unpaid_bills;
  // }

  // 🔧 Techninius pažeidimus ar praradimus (jei būtų papildomas laukas)
  // if (property.technical_damages) {
  //   totalDeductions += property.technical_damages;
  // }

  return totalDeductions;
};

// Calculate final deposit return with all deductions
// NAUJOS TAISYKLĖS: Depozitas negali būti naudojamas sąskaitoms apmokėti
// Nuomininkas turi pats padengti visas sąskaitas prieš grąžinant depozitą
export const calculateFinalDepositReturn = (property: Property): number => {
  const baseDepositReturn = calculateDepositReturn(property);
  const additionalDeductions = calculateAdditionalDeductions(property);
  const outstandingAmount = (property as any).outstanding_amount || 0;

  if (import.meta.env.DEV) console.log(`DEBUG calculateFinalDepositReturn:`);
  if (import.meta.env.DEV) console.log(`- Base deposit return: ${baseDepositReturn}`);
  if (import.meta.env.DEV) console.log(`- Additional deductions: ${additionalDeductions}`);
  if (import.meta.env.DEV) console.log(`- Outstanding amount: ${outstandingAmount}`);

  // Jei yra neapmokėtų sąskaitų ar kitų išlaidų, depozitas negrąžinamas
  // Nuomininkas turi pats padengti visas sąskaitas prieš grąžinant depozitą
  if (additionalDeductions > 0) {
    if (import.meta.env.DEV) console.log(`- Final result: 0 (due to additional deductions)`);
    return 0; // Depozitas negrąžinamas, kol neapmokėtos sąskaitos
  }

  if (import.meta.env.DEV) console.log(`- Final result: ${baseDepositReturn}`);
  return baseDepositReturn;
};

// Helper function to auto-renew contract
export const autoRenewContract = async (property: Property): Promise<void> => {
  try {
    const newEndDate = new Date(property.contract_end);
    newEndDate.setMonth(newEndDate.getMonth() + 6); // Add 6 months

    if (import.meta.env.DEV) console.log(`Auto-renewing contract for ${property.tenant_name} until ${newEndDate.getFullYear()}-${String(newEndDate.getMonth() + 1).padStart(2, '0')}-${String(newEndDate.getDate()).padStart(2, '0')}`);

    // In real implementation, this would update the database
    // Update contract_end and set auto_renewal_enabled to true
  } catch (error) {
    if (import.meta.env.DEV) console.error('Failed to auto-renew contract:', error);
  }
};

// Automatinis pratęsimas, jei nuomininkas atsako teigiamai
export const autoRenewOnPositiveResponse = async (property: Property): Promise<Property | null> => {
  const tenantResponse = property.tenant_response as string | null;

  // Jei nuomininkas atsakė "wants_to_renew" ir sutartis dar nebuvo pratęsta, pratęsti 1 metui
  if (tenantResponse === 'wants_to_renew' && !property.auto_renewal_enabled) {
    const contractEnd = new Date(property.contract_end);
    const newEnd = new Date(contractEnd);
    newEnd.setFullYear(newEnd.getFullYear() + 1); // Pratęsti 1 metui

    const updated = await propertiesApi.update(property.id, {
      contract_end: newEnd.toISOString().slice(0, 10),
      tenant_response: 'wants_to_renew',
      auto_renewal_enabled: true // Pažymėti, kad sutartis jau pratęsta
    });
    if (import.meta.env.DEV) console.log(`Automatically renewed contract for ${property.tenant_name} until ${newEnd.getFullYear()}-${String(newEnd.getMonth() + 1).padStart(2, '0')}-${String(newEnd.getDate()).padStart(2, '0')} (1 year extension)`);
    return updated;
  }
  return null;
};

// Automatinis pratęsimas, jei sutartis baigėsi arba lieka mažiau nei mėnuo + 1 diena (tik 1 metų sutartims)
export const autoRenewIfNeeded = async (property: Property): Promise<Property | null> => {
  const today = new Date();
  const contractEnd = new Date(property.contract_end);
  const contractStart = new Date(property.contract_start);
  const diffDays = Math.ceil((contractEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  // Calculate original contract duration in months
  const contractDurationMs = contractEnd.getTime() - contractStart.getTime();
  const contractDurationMonths = Math.round(contractDurationMs / (1000 * 60 * 60 * 24 * 30.44));

  // Check if this is a long-term contract (>12 months)
  const isLongTermContract = contractDurationMonths > 12;

  // Jei ilgalaikė sutartis (>12 mėn.), nepratęsti automatiškai
  if (isLongTermContract) {
    return null;
  }

  // Jei butas remontuojamas, nepratęsti automatiškai
  if (property.status === 'maintenance') {
    return null;
  }

  // Jei butas laisvas, nepratęsti automatiškai
  if (property.status === 'vacant') {
    return null;
  }

  // Jei nuomininkas nenori pratęsti, nepratęsti automatiškai
  if (property.tenant_response === 'does_not_want_to_renew') {
    return null;
  }

  // Jei sutartis baigėsi arba lieka mažiau nei 31 diena ir dar nebuvo pratęsta
  if ((diffDays < 0 || diffDays <= 31) && !property.auto_renewal_enabled) {
    // Pratęsiam 6 mėnesiams nuo pabaigos datos
    const newEnd = new Date(contractEnd);
    newEnd.setMonth(newEnd.getMonth() + 6);

    try {
      const updated = await propertiesApi.update(property.id, {
        contract_end: newEnd.toISOString().slice(0, 10),
        auto_renewal_enabled: true // Pažymėti, kad sutartis jau pratęsta
      });
      if (import.meta.env.DEV) console.log(`Automatically renewed contract for ${property.tenant_name} until ${newEnd.getFullYear()}-${String(newEnd.getMonth() + 1).padStart(2, '0')}-${String(newEnd.getDate()).padStart(2, '0')} (${diffDays < 0 ? 'expired' : '31 days remaining'})`);
      return updated;
    } catch (error) {
      if (import.meta.env.DEV) console.error(`Failed to auto-renew contract for ${property.tenant_name}:`, error);
      return null;
    }
  }
  return null;
};

// Automatinis pratęsimas, kai nuomininkas išsiunčia pranešimą
export const autoRenewOnNotification = async (property: Property): Promise<Property | null> => {
  const today = new Date();
  const contractEnd = new Date(property.contract_end);
  const diffDays = Math.ceil((contractEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  // Jei butas remontuojamas, nepratęsti automatiškai
  if (property.status === 'maintenance') {
    return null;
  }

  // Jei butas laisvas, nepratęsti automatiškai
  if (property.status === 'vacant') {
    return null;
  }

  // Jei nuomininkas nenori pratęsti, nepratęsti automatiškai
  if (property.tenant_response === 'does_not_want_to_renew') {
    return null;
  }

  // Jei sutartis baigėsi arba lieka mažiau nei 31 diena ir dar nebuvo pratęsta
  if ((diffDays < 0 || diffDays <= 31) && !property.auto_renewal_enabled) {
    // Pratęsiam 6 mėnesiams nuo pabaigos datos
    const newEnd = new Date(contractEnd);
    newEnd.setMonth(newEnd.getMonth() + 6);

    try {
      const updated = await propertiesApi.update(property.id, {
        contract_end: newEnd.toISOString().slice(0, 10),
        auto_renewal_enabled: true, // Pažymėti, kad sutartis jau pratęsta
        tenant_response: 'wants_to_renew' // Automatiškai pažymėti, kad nuomininkas nori pratęsti
      });
      if (import.meta.env.DEV) console.log(`Automatically renewed contract for ${property.tenant_name} until ${newEnd.getFullYear()}-${String(newEnd.getMonth() + 1).padStart(2, '0')}-${String(newEnd.getDate()).padStart(2, '0')} (notification sent)`);
      return updated;
    } catch (error) {
      if (import.meta.env.DEV) console.error(`Failed to auto-renew contract for ${property.tenant_name}:`, error);
      return null;
    }
  }
  return null;
};

// Utility function to validate move-out date
export const validateMoveOutDate = (moveOutDate: string, contractEndDate: string): { isValid: boolean; error?: string } => {
  if (!moveOutDate) {
    return { isValid: true };
  }

  const moveOut = new Date(moveOutDate);
  const contractEnd = new Date(contractEndDate);
  const today = new Date();

  // Check if move-out date is after contract end date
  if (moveOut > contractEnd) {
    return {
      isValid: false,
      error: 'Išsikėlimo data negali būti vėlesnė nei sutarties pabaigos data'
    };
  }

  // Check if move-out date is before today
  if (moveOut < today) {
    return {
      isValid: false,
      error: 'Išsikėlimo data negali būti ankstesnė nei šiandien'
    };
  }

  return { isValid: true };
};

// ========================================
// 📧 PRANEŠIMŲ SISTEMOS LOGIKOS PATOBULINIMAS
// ========================================

// Tenant interface import
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

// Helper functions
const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

const formatDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getDaysUntilContractEnd = (contractEnd: string): number => {
  const endDate = new Date(contractEnd);
  const today = new Date();
  return Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

const isAutoRenewedContract = (tenant: Tenant): boolean => {
  const contractEnd = new Date(tenant.contractEnd);
  const autoRenewalDate = new Date(contractEnd);
  autoRenewalDate.setMonth(autoRenewalDate.getMonth() + 6);

  return contractEnd < new Date() &&
    autoRenewalDate > new Date() &&
    !tenant.tenant_response;
};

// Pranešimų tipai
export type NotificationType =
  | 'contract_expiry_reminder_1'    // Pirmas pranešimas (2 mėn. prieš)
  | 'contract_expiry_reminder_2'    // Antras pranešimas (po 15 dienų)
  | 'contract_expiry_reminder_3'    // Trečias pranešimas (po 29 dienų)
  | 'contract_auto_renewed'         // Automatiškai pratęsta
  | 'contract_termination_notice'   // Išsikraustymo pranešimas
  | 'payment_reminder'              // Mokėjimo priminimas
  | 'meter_reading_reminder';       // Skaitliukų nuskaitymo priminimas

// Pranešimų statusai
export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'cancelled';

// Pranešimo objektas
export interface Notification {
  id: string;
  tenantId: string;
  type: NotificationType;
  status: NotificationStatus;
  scheduledDate: Date;
  sentDate?: Date;
  message: string;
  recipient: 'tenant' | 'landlord';
  channel: 'email' | 'sms' | 'push';
  priority: 'low' | 'medium' | 'high';
  metadata?: Record<string, any>;
}

// Pranešimų planavimo logika
export const scheduleContractNotifications = (tenant: Tenant): Notification[] => {
  const notifications: Notification[] = [];
  const contractEnd = new Date(tenant.contractEnd);
  const now = new Date();

  // Patikrinti ar sutartis jau pratęsta
  if (isAutoRenewedContract(tenant)) {
    // Jei sutartis jau pratęsta, siųsti tik išsikraustymo pranešimus
    if (tenant.planned_move_out_date) {
      notifications.push(createMoveOutNotification(tenant));
    }
    return notifications;
  }

  // Patikrinti ar nuomininkas jau atsakė
  if (tenant.tenant_response) {
    // Jei atsakė, nesiųsti daugiau pranešimų
    return notifications;
  }

  // Pirmas pranešimas - 2 mėnesiai prieš sutarties pabaigą
  const firstReminderDate = new Date(contractEnd);
  firstReminderDate.setMonth(firstReminderDate.getMonth() - 2);

  if (firstReminderDate > now) {
    notifications.push({
      id: generateId(),
      tenantId: tenant.id,
      type: 'contract_expiry_reminder_1',
      status: 'pending',
      scheduledDate: firstReminderDate,
      message: `Jūsų nuomos sutartis baigiasi ${formatDate(contractEnd)}. Ar norite pratęsti sutartį? Atsakykite per 30 dienų.`,
      recipient: 'tenant',
      channel: 'email',
      priority: 'high',
      metadata: {
        contractEnd: contractEnd.toISOString(),
        reminderNumber: 1
      }
    });
  }

  // Antras pranešimas - po 15 dienų nuo pirmo
  const secondReminderDate = new Date(firstReminderDate);
  secondReminderDate.setDate(secondReminderDate.getDate() + 15);

  if (secondReminderDate > now) {
    notifications.push({
      id: generateId(),
      tenantId: tenant.id,
      type: 'contract_expiry_reminder_2',
      status: 'pending',
      scheduledDate: secondReminderDate,
      message: `Priminimas: Jūsų nuomos sutartis baigiasi ${formatDate(contractEnd)}. Jei neatsakysite, sutartis bus automatiškai pratęsta 6 mėnesiams.`,
      recipient: 'tenant',
      channel: 'email',
      priority: 'high',
      metadata: {
        contractEnd: contractEnd.toISOString(),
        reminderNumber: 2
      }
    });
  }

  // Trečias pranešimas - po 29 dienų nuo pirmo
  const thirdReminderDate = new Date(firstReminderDate);
  thirdReminderDate.setDate(thirdReminderDate.getDate() + 29);

  if (thirdReminderDate > now) {
    notifications.push({
      id: generateId(),
      tenantId: tenant.id,
      type: 'contract_expiry_reminder_3',
      status: 'pending',
      scheduledDate: thirdReminderDate,
      message: `Paskutinis pranešimas: Jūsų nuomos sutartis baigiasi ${formatDate(contractEnd)}. Jei neatsakysite iki sutarties pabaigos, ji bus automatiškai pratęsta.`,
      recipient: 'tenant',
      channel: 'email',
      priority: 'high',
      metadata: {
        contractEnd: contractEnd.toISOString(),
        reminderNumber: 3
      }
    });
  }

  return notifications;
};

// Automatinio pratėsimo pranešimas
export const createAutoRenewalNotification = (tenant: Tenant): Notification => {
  const contractEnd = new Date(tenant.contractEnd);
  const autoRenewalEnd = new Date(contractEnd);
  autoRenewalEnd.setMonth(autoRenewalEnd.getMonth() + 6);

  return {
    id: generateId(),
    tenantId: tenant.id,
    type: 'contract_auto_renewed',
    status: 'pending',
    scheduledDate: new Date(contractEnd),
    message: `Jūsų nuomos sutartis buvo automatiškai pratęsta iki ${formatDate(autoRenewalEnd)}. Jei norite išsikraustyti, pateikite pranešimą bent 30 dienų iš anksto.`,
    recipient: 'tenant',
    channel: 'email',
    priority: 'medium',
    metadata: {
      originalEnd: contractEnd.toISOString(),
      newEnd: autoRenewalEnd.toISOString(),
      autoRenewalDate: new Date().toISOString()
    }
  };
};

// Išsikraustymo pranešimas
export const createMoveOutNotification = (tenant: Tenant): Notification => {
  const moveOutDate = new Date(tenant.planned_move_out_date!);
  const noticeDate = tenant.move_out_notice_date ? new Date(tenant.move_out_notice_date) : new Date();
  const daysNotice = Math.ceil((moveOutDate.getTime() - noticeDate.getTime()) / (1000 * 60 * 60 * 24));

  let message = `Jūsų išsikraustymo data: ${formatDate(moveOutDate)}. `;

  if (daysNotice >= 30) {
    message += 'Pranešimas pateiktas laiku - visas depozitas bus grąžintas.';
  } else {
    message += `Pranešimas pateiktas ${daysNotice} dienų prieš išsikraustymą. Gali būti išskaičiuota 1 mėnesio nuomos suma.`;
  }

  return {
    id: generateId(),
    tenantId: tenant.id,
    type: 'contract_termination_notice',
    status: 'pending',
    scheduledDate: new Date(),
    message,
    recipient: 'tenant',
    channel: 'email',
    priority: 'high',
    metadata: {
      moveOutDate: moveOutDate.toISOString(),
      noticeDate: noticeDate.toISOString(),
      daysNotice,
      isTimelyNotice: daysNotice >= 30
    }
  };
};

// Pranešimų atšaukimo logika
export const cancelPendingNotifications = (tenantId: string, reason: 'tenant_responded' | 'contract_auto_renewed' | 'tenant_moved_out'): void => {
  // Čia būtų logika atšaukti visus laukiančius pranešimus
  // priklausomai nuo priežasties
  if (import.meta.env.DEV) console.log(`Cancelling notifications for tenant ${tenantId}, reason: ${reason}`);
};

// Pranešimų siuntimo logika (nauja versija)
export const sendNotificationNew = async (notification: Notification): Promise<boolean> => {
  try {
    // Simuliuoti pranešimo siuntimą
    if (import.meta.env.DEV) console.log(`Sending notification to tenant ${notification.tenantId}:`, notification.message);

    // Čia būtų tikras pranešimo siuntimas (email, SMS, etc.)
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simuliuoti API call

    // Atnaujinti pranešimo statusą
    notification.status = 'sent';
    notification.sentDate = new Date();

    return true;
  } catch (error) {
    if (import.meta.env.DEV) console.error('Failed to send notification:', error);
    notification.status = 'failed';
    return false;
  }
};

// Pranešimų planavimo funkcija
export const scheduleNotificationsForAllTenants = (tenants: Tenant[]): Notification[] => {
  const allNotifications: Notification[] = [];

  tenants.forEach(tenant => {
    const tenantNotifications = scheduleContractNotifications(tenant);
    allNotifications.push(...tenantNotifications);
  });

  return allNotifications;
};

// Pranešimų būsenos tikrinimas
export const checkNotificationStatus = (tenant: Tenant): {
  hasPendingNotifications: boolean;
  nextNotificationDate?: Date;
  notificationCount: number;
} => {
  const notifications = scheduleContractNotifications(tenant);
  const pendingNotifications = notifications.filter(n => n.status === 'pending');

  return {
    hasPendingNotifications: pendingNotifications.length > 0,
    nextNotificationDate: pendingNotifications.length > 0 ? pendingNotifications[0].scheduledDate : undefined,
    notificationCount: tenant.notification_count || 0
  };
};

// Automatinio pratėsimo logikos patobulinimas
export const shouldAutoRenewContract = (tenant: Tenant): boolean => {
  const daysUntilExpiry = getDaysUntilContractEnd(tenant.contractEnd);

  // Jei nuomininkas atsisakė pratėsimo, nepratęsti
  if (tenant.tenant_response === 'does_not_want_to_renew') {
    return false;
  }

  // Jei yra išsikraustymo planas, nepratęsti
  if (tenant.planned_move_out_date) {
    return false;
  }

  // Pratęsti visada (net jei 12+ mėnesių ar jau buvo pratęsta), jei sutartis baigėsi arba baigiasi
  return daysUntilExpiry <= 0;
};

// Automatinio pratėsimo vykdymas
export const executeAutoRenewal = (tenant: Tenant): Tenant => {
  const contractEnd = new Date(tenant.contractEnd);
  const autoRenewalEnd = new Date(contractEnd);
  autoRenewalEnd.setMonth(autoRenewalEnd.getMonth() + 6);

  // Atšaukti visus laukiančius pranešimus
  cancelPendingNotifications(tenant.id, 'contract_auto_renewed');

  // Sukurti automatinio pratėsimo pranešimą
  const autoRenewalNotification = createAutoRenewalNotification(tenant);

  return {
    ...tenant,
    contractEnd: autoRenewalEnd.toISOString().split('T')[0], // Format as YYYY-MM-DD
    notification_count: (tenant.notification_count || 0) + 1,
    last_notification_sent: new Date().toISOString()
  };
};

// Pranešimų istorijos funkcija
export const getNotificationHistory = (tenant: Tenant): Notification[] => {
  // Čia būtų logika gauti pranešimų istoriją iš duomenų bazės
  const mockHistory: Notification[] = [];

  if (tenant.last_notification_sent) {
    mockHistory.push({
      id: generateId(),
      tenantId: tenant.id,
      type: 'contract_expiry_reminder_1',
      status: 'sent',
      scheduledDate: new Date(tenant.last_notification_sent),
      sentDate: new Date(tenant.last_notification_sent),
      message: 'Sutarties pabaigos pranešimas',
      recipient: 'tenant',
      channel: 'email',
      priority: 'high'
    });
  }

  return mockHistory;
};

// Pranešimų statistikos funkcija
export const getNotificationStats = (tenants: Tenant[]): {
  totalNotifications: number;
  pendingNotifications: number;
  sentNotifications: number;
  failedNotifications: number;
  autoRenewals: number;
  responses: number;
} => {
  const stats = {
    totalNotifications: 0,
    pendingNotifications: 0,
    sentNotifications: 0,
    failedNotifications: 0,
    autoRenewals: 0,
    responses: 0
  };

  tenants.forEach(tenant => {
    stats.totalNotifications += tenant.notification_count || 0;

    if (isAutoRenewedContract(tenant)) {
      stats.autoRenewals++;
    }

    if (tenant.tenant_response) {
      stats.responses++;
    }
  });

  return stats;
}; 