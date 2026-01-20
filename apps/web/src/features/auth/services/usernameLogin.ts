import { supabase } from '../../../lib/supabase';

export interface LoginInfo {
  email: string | null;
  has_password: boolean;
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
      .select('email, has_password, id')
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
        has_password: data.has_password || false,
        user_id: data.id  // Map 'id' from DB to 'user_id' in interface
      }
    };
  } catch (err) {
    return {
      success: false,
      error: 'Įvyko nenumatyta klaida.'
    };
  }
}

