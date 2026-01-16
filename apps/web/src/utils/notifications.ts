import { supabase } from '../lib/supabase';

export interface NotificationData {
  user_id: string;
  kind: string;
  title: string;
  body?: string;
  data?: any;
  to_email?: string;
  subject?: string;
  html?: string;
}

/**
 * Send notification and optionally email
 */
export async function sendNotification(notification: NotificationData) {
  try {
    const { data, error } = await supabase.rpc('notify_and_email', {
      p_user_id: notification.user_id,
      p_kind: notification.kind,
      p_title: notification.title,
      p_body: notification.body || null,
      p_data: notification.data || {},
      p_to_email: notification.to_email || null,
      p_subject: notification.subject || null,
      p_html: notification.html || null
    });

    if (error) throw error;
    
    console.log('Notification sent:', data);
    return data;
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
}

/**
 * Send in-app notification only
 */
export async function sendInAppNotification(
  user_id: string,
  kind: string,
  title: string,
  body?: string,
  data?: any
) {
  try {
    const { data: result, error } = await supabase.rpc('rpc_create_notification', {
      p_user_id: user_id,
      p_kind: kind,
      p_title: title,
      p_body: body || null,
      p_data: data || {}
    });

    if (error) throw error;
    
    console.log('In-app notification sent:', result);
    return result;
  } catch (error) {
    console.error('Error sending in-app notification:', error);
    throw error;
  }
}

/**
 * Queue email for sending
 */
export async function queueEmail(
  to_email: string,
  subject: string,
  html: string,
  related_user?: string,
  related_entity?: string
) {
  try {
    const { data, error } = await supabase.rpc('rpc_queue_email', {
      p_to_email: to_email,
      p_subject: subject,
      p_html: html,
      p_related_user: related_user || null,
      p_related_entity: related_entity || null
    });

    if (error) throw error;
    
    console.log('Email queued:', data);
    return data;
  } catch (error) {
    console.error('Error queuing email:', error);
    throw error;
  }
}

/**
 * Predefined notification templates
 */
export const NotificationTemplates = {
  // Address notifications
  addressCreated: (user_id: string, address: string, to_email?: string) => ({
    user_id,
    kind: 'address.created',
    title: 'Adresas sukurtas',
    body: `Adresas "${address}" sėkmingai pridėtas.`,
    data: { address },
    to_email,
    subject: 'Adresas sukurtas',
    html: `
      <h2>Adresas sukurtas</h2>
      <p>Adresas <strong>${address}</strong> sėkmingai pridėtas į sistemą.</p>
      <p>Dabar galite pridėti butus ir skaitiklius.</p>
    `
  }),

  // Property notifications
  propertyCreated: (user_id: string, property: string, to_email?: string) => ({
    user_id,
    kind: 'property.created',
    title: 'Butas pridėtas',
    body: `Butas "${property}" sėkmingai pridėtas.`,
    data: { property },
    to_email,
    subject: 'Butas pridėtas',
    html: `
      <h2>Butas pridėtas</h2>
      <p>Butas <strong>${property}</strong> sėkmingai pridėtas į sistemą.</p>
    `
  }),

  // Meter reading notifications
  meterReadingDue: (user_id: string, meter: string, to_email?: string) => ({
    user_id,
    kind: 'meter.reading',
    title: 'Reikia pateikti rodmenis',
    body: `Skaitiklio "${meter}" rodmenys turi būti pateikti iki mėnesio pabaigos.`,
    data: { meter },
    to_email,
    subject: 'Reikia pateikti rodmenis',
    html: `
      <h2>Reikia pateikti rodmenis</h2>
      <p>Skaitiklio <strong>${meter}</strong> rodmenys turi būti pateikti iki mėnesio pabaigos.</p>
      <p>Prisijunkite prie sistemos ir pateikite rodmenis su nuotrauka.</p>
    `
  }),

  // Payment notifications
  paymentDue: (user_id: string, amount: number, due_date: string, to_email?: string) => ({
    user_id,
    kind: 'payment.due',
    title: 'Mokėjimas artėja',
    body: `Mokėjimas ${amount}€ turi būti atliktas iki ${due_date}.`,
    data: { amount, due_date },
    to_email,
    subject: 'Mokėjimas artėja',
    html: `
      <h2>Mokėjimas artėja</h2>
      <p>Mokėjimas <strong>${amount}€</strong> turi būti atliktas iki <strong>${due_date}</strong>.</p>
      <p>Prašome atlikti mokėjimą laiku.</p>
    `
  }),

  // Maintenance notifications
  maintenanceRequest: (user_id: string, request: string, to_email?: string) => ({
    user_id,
    kind: 'maintenance.request',
    title: 'Naujas remonto prašymas',
    body: `Gautas naujas remonto prašymas: "${request}".`,
    data: { request },
    to_email,
    subject: 'Naujas remonto prašymas',
    html: `
      <h2>Naujas remonto prašymas</h2>
      <p>Gautas naujas remonto prašymas: <strong>${request}</strong></p>
      <p>Prašome peržiūrėti ir atsakyti.</p>
    `
  }),

  // Welcome notification
  welcome: (user_id: string, name: string, to_email?: string) => ({
    user_id,
    kind: 'welcome',
    title: 'Sveiki atvykę!',
    body: `Sveiki atvykę į Property Manager, ${name}!`,
    data: { name },
    to_email,
    subject: 'Sveiki atvykę į Property Manager',
    html: `
      <h2>Sveiki atvykę!</h2>
      <p>Sveiki atvykę į Property Manager, <strong>${name}</strong>!</p>
      <p>Jūsų paskyra sėkmingai sukurta ir galite pradėti naudotis sistema.</p>
    `
  })
};

/**
 * Send welcome notification to new user
 */
export async function sendWelcomeNotification(user_id: string, name: string, email?: string) {
  const notification = NotificationTemplates.welcome(user_id, name, email);
  return sendNotification(notification);
}

/**
 * Send address created notification
 */
export async function sendAddressCreatedNotification(user_id: string, address: string, email?: string) {
  const notification = NotificationTemplates.addressCreated(user_id, address, email);
  return sendNotification(notification);
}

/**
 * Send property created notification
 */
export async function sendPropertyCreatedNotification(user_id: string, property: string, email?: string) {
  const notification = NotificationTemplates.propertyCreated(user_id, property, email);
  return sendNotification(notification);
}













