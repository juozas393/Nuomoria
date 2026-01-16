import { supabase } from './supabase';

export interface NotificationRow {
  id: string;
  user_id: string;
  title: string | null;
  body: string | null;
  kind: string | null;
  data: Record<string, unknown> | null;
  created_at: string;
  read_at: string | null;
  is_read: boolean | null;
}

export interface CreateNotificationPayload {
  userId: string;
  title: string;
  body: string;
  kind?: string | null;
  data?: Record<string, unknown> | null;
}

const DEFAULT_PAGE_SIZE = 50;

export async function fetchNotificationsForUser(
  userId: string,
  limit = DEFAULT_PAGE_SIZE
): Promise<NotificationRow[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id,user_id,title,body,kind,data,created_at,read_at,is_read')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(0, Math.max(0, limit - 1));

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    ...row,
    data: row.data ?? null
  }));
}

export async function createNotification(
  payload: CreateNotificationPayload
): Promise<NotificationRow | null> {
  const { data, error } = await supabase
    .from('notifications')
    .insert([
      {
        user_id: payload.userId,
        title: payload.title,
        body: payload.body,
        kind: payload.kind ?? null,
        data: payload.data ?? null
      }
    ])
    .select('id,user_id,title,body,kind,data,created_at,read_at,is_read')
    .single();

  if (error) {
    throw error;
  }

  return data ?? null;
}
