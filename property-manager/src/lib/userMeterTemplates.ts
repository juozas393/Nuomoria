import { supabase, type Database } from './supabase';

export type UserMeterTemplateRow = Database['public']['Tables']['user_meter_templates']['Row'];
export type UserMeterTemplateInsert = Database['public']['Tables']['user_meter_templates']['Insert'];
type UserHiddenTemplateRow = Database['public']['Tables']['user_hidden_meter_templates']['Row'];

export async function fetchUserMeterTemplates(userId: string): Promise<UserMeterTemplateRow[]> {
  const { data, error } = await supabase
    .from('user_meter_templates')
    .select('id, user_id, name, description, mode, unit, price_per_unit, distribution_method, requires_photo, icon, created_at, updated_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function createUserMeterTemplate(
  payload: Omit<UserMeterTemplateInsert, 'id' | 'created_at' | 'updated_at'>
): Promise<UserMeterTemplateRow> {
  const { data, error } = await supabase
    .from('user_meter_templates')
    .insert(payload)
    .select('id, user_id, name, description, mode, unit, price_per_unit, distribution_method, requires_photo, icon, created_at, updated_at')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteUserMeterTemplate(templateId: string): Promise<void> {
  const { error } = await supabase
    .from('user_meter_templates')
    .delete()
    .eq('id', templateId);

  if (error) {
    throw error;
  }
}

export async function fetchHiddenMeterTemplates(userId: string): Promise<UserHiddenTemplateRow[]> {
  const { data, error } = await supabase
    .from('user_hidden_meter_templates')
    .select('user_id, template_id, created_at')
    .eq('user_id', userId);

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function hideBaseMeterTemplate(userId: string, templateId: string): Promise<void> {
  const { error } = await supabase
    .from('user_hidden_meter_templates')
    .upsert({
      user_id: userId,
      template_id: templateId
    }, { onConflict: 'user_id,template_id' });

  if (error) {
    throw error;
  }
}

export async function unhideBaseMeterTemplate(userId: string, templateId: string): Promise<void> {
  const { error } = await supabase
    .from('user_hidden_meter_templates')
    .delete()
    .eq('user_id', userId)
    .eq('template_id', templateId);

  if (error) {
    throw error;
  }
}





