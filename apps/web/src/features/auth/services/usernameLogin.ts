import { supabase } from '../../../lib/supabase';

export interface LoginInfo {
  email: string | null;
  user_id: string;
}

export interface LoginResult {
  success: boolean;
  data?: LoginInfo;
  error?: string;
}

/**
 * Get login information by username from profiles table
 */
export async function getLoginInfoByUsername(username: string): Promise<LoginResult> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('email, id')
      .eq('username', username)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return {
          success: false,
          error: 'Tokio vartotojo vardo nėra.'
        };
      }
      return {
        success: false,
        error: 'Klaida tikrinant vartotoją.'
      };
    }

    if (!data) {
      return {
        success: false,
        error: 'Tokio vartotojo vardo nėra.'
      };
    }

    return {
      success: true,
      data: {
        email: data.email,
        user_id: data.id
      }
    };
  } catch (err) {
    return {
      success: false,
      error: 'Įvyko nenumatyta klaida.'
    };
  }
}
