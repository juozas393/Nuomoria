import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { FRONTEND_MODE } from '../config/frontendMode';
import TwoFactorSection from '../components/profile/TwoFactorSection';
import { translateUserRole } from '../utils/userDisplay';
import { getDefaultRouteForRole } from '../utils/roleRouting';
import { UserRole } from '../types/user';

interface ProfileData {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  nickname?: string | null;
  name?: string; // Computed field: first_name + last_name
  phone?: string;
  role: string;
  google_linked?: boolean;
  google_email?: string;
  avatar_url?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  last_login?: string | null;
}

const normalizeNameValue = (value?: string | null): string | null => {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed === 'User' || trimmed === 'Name') {
    return null;
  }
  return trimmed;
};

const hasText = (value?: string | null): boolean => {
  return !!value && value.trim().length > 0;
};

const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined) {
    return '€0';
  }
  return new Intl.NumberFormat('lt-LT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0
  }).format(value);
};

const extractAvatarKey = (url?: string | null): string | null => {
  if (!url) return null;
  try {
    const marker = '/storage/v1/object/public/avatars/';
    const index = url.indexOf(marker);
    if (index === -1) return null;
    return decodeURIComponent(url.slice(index + marker.length));
  } catch (err) {
    return null;
  }
};

const Profile: React.FC = () => {
  const { user, refreshSession } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const fetchingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const messageTimeoutRef = useRef<NodeJS.Timeout | null>(null);

// Form state
const [formData, setFormData] = useState({
  first_name: '',
  last_name: '',
  phone: ''
});

  // Form validation errors

  useEffect(() => {
    // Security: Don't log sensitive user data
  if (process.env.NODE_ENV === 'development') {
    console.log('👤 Profile: useEffect triggered, user changed:', user);
  }
    if (user && !fetchingRef.current) {
      fetchProfile();
    }
  }, [user]);

  // Fallback: ensure loading doesn't get stuck
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading && user) {
        // Security: Don't log sensitive loading states
        if (process.env.NODE_ENV === 'development') {
          console.log('👤 Profile: Loading timeout reached, forcing loading to false');
        }
        setLoading(false);
      }
    }, 5000); // 5 second timeout

    return () => clearTimeout(timeout);
  }, [loading, user]);

  const fetchProfile = async () => {
    // Security: Don't log sensitive user data
    if (process.env.NODE_ENV === 'development') {
      console.log('👤 Profile: fetchProfile');
    }
    
    if (!user) {
      // Security: Don't log sensitive user states
      if (process.env.NODE_ENV === 'development') {
        console.log('👤 Profile: No user, setting loading to false');
      }
      setLoading(false);
      return;
    }

    // Prevent multiple simultaneous calls
    if (fetchingRef.current) {
      // Security: Don't log sensitive fetching states
      if (process.env.NODE_ENV === 'development') {
        console.log('👤 Profile: Already fetching, skipping');
      }
      return;
    }
    
    fetchingRef.current = true;

    try {
      // Security: Don't log sensitive profile data
      if (process.env.NODE_ENV === 'development') {
        console.log('👤 Profile: creating base profile');
      }
      // First, use the user data from AuthContext as the base
      const normalizedFirstName = normalizeNameValue(user.first_name);
      const normalizedLastName = normalizeNameValue(user.last_name);
      const baseProfile: ProfileData = {
        id: user.id,
        email: user.email,
        first_name: normalizedFirstName,
        last_name: normalizedLastName,
        nickname: normalizeNameValue(user.nickname),
        name: user.name || undefined, // Computed field
        phone: user.phone ?? undefined, // Will be fetched from database
        role: user.role,
        google_linked: Boolean(user.google_linked ?? user.google_email),
        google_email: user.google_email ?? undefined,
        avatar_url: user.avatar_url || null,
        is_active: user.is_active,
        created_at: user.created_at,
        updated_at: user.updated_at,
        last_login: user.last_login ?? null,
      };

      // Security: Don't log sensitive profile data
      if (process.env.NODE_ENV === 'development') {
        console.log('👤 Profile: base profile prepared');
      }

      // Try to fetch additional data from the database
      try {
        // Security: Don't log sensitive database operations
        if (process.env.NODE_ENV === 'development') {
          console.log('👤 Profile: querying users table');
        }
        // Fixed: removed google_user_id from query
        const { data, error } = await supabase
          .from('users')
          .select('first_name, last_name, nickname, phone, google_linked, google_email, last_login')
          .eq('id', user.id)
          .single();

        // Security: Don't log sensitive database results
        if (process.env.NODE_ENV === 'development') {
          console.log('👤 Profile: users query complete');
        }

        if (error) {
          // Security: Don't log sensitive database errors
          if (process.env.NODE_ENV === 'development') {
            console.error('👤 Profile: Database query failed:', error);
          }
          // Check if it's a column not found error or no rows found
          if (error.code === 'PGRST116') {
            // Security: Don't log sensitive user table info
            if (process.env.NODE_ENV === 'development') {
              console.warn('👤 Profile: users row missing, using auth data only');
            }
            // User doesn't exist in users table, use AuthContext data only
            baseProfile.phone = undefined;
          }
        } else if (data) {
          baseProfile.first_name = normalizeNameValue(data.first_name) ?? baseProfile.first_name ?? null;
          baseProfile.last_name = normalizeNameValue(data.last_name) ?? baseProfile.last_name ?? null;
          baseProfile.nickname = normalizeNameValue(data.nickname) ?? baseProfile.nickname ?? null;
          baseProfile.phone = data.phone;
          const dbGoogleEmail = data.google_email ?? baseProfile.google_email;
          const dbGoogleLinked =
            data.google_linked ?? baseProfile.google_linked ?? Boolean(dbGoogleEmail);
          baseProfile.google_linked = Boolean(dbGoogleLinked);
          baseProfile.google_email = dbGoogleEmail;
          baseProfile.last_login = data.last_login ?? baseProfile.last_login ?? null;
          // Security: Don't log sensitive profile data
          if (process.env.NODE_ENV === 'development') {
            console.log('👤 Profile: users data merged');
          }
        }

        // Check localStorage for Google linking data (fallback)
        const localStorageGoogleLinked = localStorage.getItem('google_linked');
        const localStorageGoogleEmail = localStorage.getItem('google_email');
        
        if (localStorageGoogleLinked === 'true' && localStorageGoogleEmail) {
          // Security: Don't log sensitive localStorage data
          if (process.env.NODE_ENV === 'development') {
            console.log('👤 Profile: using google fallback from localStorage');
          }
          baseProfile.google_linked = true;
          baseProfile.google_email = localStorageGoogleEmail;
        }
      } catch (dbError) {
        // Security: Don't log sensitive database errors
        if (process.env.NODE_ENV === 'development') {
          console.warn('👤 Profile: Could not fetch additional profile data from database:', dbError);
        }
        // Continue with base profile data
      }

      // Security: Don't log sensitive profile state
      if (process.env.NODE_ENV === 'development') {
        console.log('👤 Profile: profile state ready');
      }
      setProfile(baseProfile);
      setFormData({
        first_name: baseProfile.first_name ?? '',
        last_name: baseProfile.last_name ?? '',
        phone: baseProfile.phone ?? ''
      });
      // Security: Don't log sensitive profile setup info
      if (process.env.NODE_ENV === 'development') {
        console.log('👤 Profile: profile state set, finishing load');
      }
    } catch (error) {
      // Security: Don't log sensitive profile errors
      if (process.env.NODE_ENV === 'development') {
        console.error('👤 Profile: Error setting up profile:', error);
      }
    } finally {
      // Security: Don't log sensitive loading states
      if (process.env.NODE_ENV === 'development') {
        console.log('👤 Profile: loading=false');
      }
      setLoading(false);
      fetchingRef.current = false;
    }
  };

  // Auto-dismiss message after 5 seconds
  useEffect(() => {
    if (message) {
      // Clear any existing timeout
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current);
      }
      
      // Set new timeout
      messageTimeoutRef.current = setTimeout(() => {
        setMessage(null);
      }, 5000);
    }
    
    // Cleanup on unmount
    return () => {
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current);
      }
    };
  }, [message]);

  const handlePhotoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Prašome pasirinkti paveikslėlio failą' });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Failo dydis negali viršyti 5MB' });
      return;
    }

    setUploadingPhoto(true);
    setMessage(null);

    try {
      if (FRONTEND_MODE) {
        if (process.env.NODE_ENV === 'development') {
          console.log('📸 Simulating photo upload for file:', file.name);
        }
        
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const mockPhotoUrl = URL.createObjectURL(file);
        
        if (profile) {
          setProfile({
            ...profile,
            avatar_url: mockPhotoUrl
          });
        }
        
        setMessage({ type: 'success', text: 'Nuotrauka sėkmingai įkelta!' });
        await refreshSession();
      } else {
        // Production - upload to Supabase Storage
        const fileExt = file.name.split('.').pop() ?? 'jpg';
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, file, {
            upsert: true,
            cacheControl: '3600',
            contentType: file.type
          });
        
        if (uploadError) throw uploadError;
        
        const { data } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);
        
        const { error } = await supabase
          .from('users')
          .update({ avatar_url: data.publicUrl })
          .eq('id', user.id);
        
        if (error) throw error;
        
        const previousKey = extractAvatarKey(profile?.avatar_url);
        if (previousKey) {
          await supabase.storage.from('avatars').remove([previousKey]);
        }
        
        if (profile) {
          setProfile({
            ...profile,
            avatar_url: data.publicUrl
          });
        }
        
        setMessage({ type: 'success', text: 'Nuotrauka sėkmingai įkelta!' });
        await refreshSession();
      }
    } catch (error: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error uploading photo:', error);
      }
      const isRlsError = typeof error?.message === 'string' && error.message.includes('row-level security');
      setMessage({
        type: 'error',
        text: isRlsError
          ? 'Neturite leidimo įkelti nuotraukos. Kreipkitės į administratorių dėl prieigos.'
          : 'Klaida įkeliant nuotrauką'
      });
    } finally {
      setUploadingPhoto(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [user, profile, refreshSession]);

  const handleRemovePhoto = useCallback(async () => {
    if (!user || !profile) return;

    try {
      if (FRONTEND_MODE) {
        if (process.env.NODE_ENV === 'development') {
          console.log('🗑️ Simulating photo removal');
        }
        
        // Update profile to remove photo
        setProfile({
          ...profile,
          avatar_url: null
        });
        
        setMessage({ type: 'success', text: 'Nuotrauka pašalinta!' });
        await refreshSession();
      } else {
        // Production - remove from Supabase
        const previousKey = extractAvatarKey(profile.avatar_url);
        if (previousKey) {
          await supabase.storage.from('avatars').remove([previousKey]);
        }
        if (profile.avatar_url) {
          const { error } = await supabase
            .from('users')
            .update({ avatar_url: null })
            .eq('id', user.id);
        
          if (error) throw error;
        
          setProfile({
            ...profile,
            avatar_url: null
          });
        }
        
        setMessage({ type: 'success', text: 'Nuotrauka pašalinta!' });
        await refreshSession();
      }
    } catch (error) {
      console.error('Error removing photo:', error);
      setMessage({ type: 'error', text: 'Klaida šalinant nuotrauką' });
    }
  }, [user, profile, refreshSession]);

  // Memoize user display name
  const displayName = useMemo(() => {
    if (!profile) return 'Mano Profilis';
    
    if (profile.first_name && profile.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    if (profile.first_name) {
      return profile.first_name;
    }
    if (profile.nickname) {
      return profile.nickname;
    }
    if (profile.last_name) {
      return profile.last_name;
    }
    if (profile.name) {
      const trimmed = profile.name.trim();
      if (trimmed && trimmed !== 'User Name') {
        return trimmed;
      }
    }
    if (profile.email) {
      return profile.email.split('@')[0];
    }
    return 'Mano Profilis';
  }, [profile]);

  // Memoize user initials
  const userInitials = useMemo(() => {
    if (!profile) return 'U';
    
    if (profile.first_name && profile.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
    } else if (profile.first_name) {
      return profile.first_name[0].toUpperCase();
    } else if (profile.nickname && profile.nickname.trim()) {
      return profile.nickname.trim()[0]?.toUpperCase() ?? 'U';
    } else if (profile.last_name) {
      return profile.last_name[0].toUpperCase();
    }
    return profile.email[0].toUpperCase();
  }, [profile]);

  // Memoize profile completeness calculation
  const profileCompleteness = useMemo(() => {
    if (!profile) return 0;
    
    const fields = [
      true, // email always present
      hasText(profile.first_name),
      hasText(profile.last_name),
      hasText(profile.nickname),
      hasText(profile.phone),
      hasText(profile.avatar_url),
      Boolean(profile.google_linked),
    ];

    const filled = fields.filter(Boolean).length;
    return Math.round((filled / fields.length) * 100);
  }, [profile]);

  const roleLabel = useMemo(() => translateUserRole(profile?.role), [profile?.role]);

  const googleStatusStyles = useMemo(() => {
    if (profile?.google_linked) {
      return {
        container: 'border border-[#2F8481]/30 bg-[#2F8481]/10',
        dot: 'bg-[#2F8481]',
        text: 'text-[#2F8481]',
        label: 'Google prijungtas',
      } as const;
    }
    return {
      container: 'border border-black/15 bg-black/5',
      dot: 'bg-black/30',
      text: 'text-black/60',
      label: 'Google neprijungtas',
    } as const;
  }, [profile?.google_linked]);

  const completenessStyles = useMemo(() => {
    if (profileCompleteness >= 80) {
      return {
        container: 'border border-[#2F8481]/30 bg-[#2F8481]/10',
        dot: 'bg-[#2F8481]',
        text: 'text-[#2F8481]',
        label: 'Profilis išsamus',
      } as const;
    }
    if (profileCompleteness >= 60) {
      return {
        container: 'border border-black/15 bg-black/5',
        dot: 'bg-black/40',
        text: 'text-black/70',
        label: 'Profilis dalinis',
      } as const;
    }
    return {
      container: 'border border-black/15 bg-white',
      dot: 'bg-black/30',
      text: 'text-black/60',
      label: 'Profilis neišsamus',
    } as const;
  }, [profileCompleteness]);

  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  const [savingInfo, setSavingInfo] = useState(false);

  const handleSavePersonalInfo = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;

    setSavingInfo(true);
    setMessage(null);

    try {
      const firstName = formData.first_name.trim();
      const lastName = formData.last_name.trim();
      const phone = formData.phone.trim();

      const payload = {
        id: user.id,
        first_name: firstName.length > 0 ? firstName : null,
        last_name: lastName.length > 0 ? lastName : null,
        phone: phone.length > 0 ? phone : null,
        email: user.email ?? null,
        role: profile?.role ?? user.role,
        google_linked: profile?.google_linked ?? true,
        google_email: profile?.google_email ?? user.google_email ?? user.email ?? null,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('users')
        .upsert(payload, { onConflict: 'id' })
        .select('first_name, last_name, phone')
        .single();

      if (error) throw error;

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              first_name: data?.first_name ?? null,
              last_name: data?.last_name ?? null,
              phone: data?.phone ?? undefined,
            }
          : prev,
      );

      setFormData({
        first_name: data?.first_name ?? '',
        last_name: data?.last_name ?? '',
        phone: data?.phone ?? '',
      });

      await refreshSession();

      setMessage({ type: 'success', text: 'Asmeninė informacija atnaujinta.' });
    } catch (err: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error('👤 Profile: Failed to save personal info:', err);
      }
      setMessage({
        type: 'error',
        text: err?.message ?? 'Nepavyko atnaujinti informacijos. Bandykite dar kartą.',
      });
    } finally {
      setSavingInfo(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const currentRole = profile?.role ?? user.role;
    const targetRole: UserRole = 'landlord';

    if (currentRole !== 'tenant') {
      setMessage({ type: 'error', text: 'Rolę galima pakeisti tik iš nuomininko į nuomotoją.' });
      return;
    }

    setUpdating(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('users')
        .update({ role: targetRole })
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      const { data: authUserResult, error: authUserError } = await supabase.auth.getUser();
      if (authUserError) {
        throw authUserError;
      }

      const currentMeta = (authUserResult?.user?.user_metadata ?? {}) as Record<string, unknown>;
      const { error: authUpdateError } = await supabase.auth.updateUser({
        data: {
          ...currentMeta,
          role: targetRole,
          google_linked: true,
        },
      });

      if (authUpdateError) {
        throw authUpdateError;
      }

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              role: targetRole,
              google_linked: true,
            }
          : prev,
      );

      try {
        localStorage.setItem('google_linked', 'true');
        const googleEmail = profile?.google_email ?? user.google_email ?? user.email ?? '';
        if (googleEmail) {
          localStorage.setItem('google_email', googleEmail);
        }
      } catch {
        // ignore storage errors
      }

      await refreshSession();

      setMessage({
        type: 'success',
        text: 'Rolė sėkmingai pakeista į „Nuomotojas“. Nukreipiame...',
      });

      setUpdating(false);

      setTimeout(() => {
        navigate(getDefaultRouteForRole(targetRole), { replace: true });
      }, 600);
    } catch (err: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error('👤 Profile: Error updating role:', err);
      }
      setMessage({
        type: 'error',
        text: err?.message ?? 'Nepavyko pakeisti rolės. Bandykite dar kartą.',
      });
      setUpdating(false);
    }
  };


  // Security: Don't log sensitive render data
  if (process.env.NODE_ENV === 'development') {
    console.log('👤 Profile: Render check - loading =', loading, 'user =', user?.email, 'profile =', profile?.email);
  }
  
  if (loading) {
    // Security: Don't log sensitive loading screen data
    if (process.env.NODE_ENV === 'development') {
      console.log('👤 Profile: Rendering loading screen, user =', user, 'profile =', profile, 'loading =', loading);
    }
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#2F8481]/5 via-white to-[#2F8481]/10 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <div className="bg-white rounded-3xl shadow-2xl p-12 backdrop-blur-sm">
            <div className="relative mb-8">
              <div className="animate-spin rounded-full h-20 w-20 border-4 border-[#2F8481]/20 border-t-[#2F8481] mx-auto"></div>
              <div className="absolute inset-0 rounded-full h-20 w-20 border-4 border-transparent border-t-[#2F8481]/40 animate-pulse mx-auto"></div>
            </div>
            <h2 className="text-2xl font-bold text-black mb-2">Kraunama profilis</h2>
            <p className="text-black/60 mb-4">Palaukite, kol gauname jūsų duomenis</p>
            <div className="flex items-center justify-center gap-2 text-sm text-black/40">
              <div className="w-2 h-2 bg-[#2F8481] rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-[#2F8481] rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
              <div className="w-2 h-2 bg-[#2F8481] rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#2F8481]/5 via-white to-[#2F8481]/10 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <div className="w-20 h-20 bg-[#2F8481]/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-[#2F8481]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-black mb-2">Neprisijungęs vartotojas</h2>
          <p className="text-black/60 mb-6">Prašome prisijungti, kad galėtumėte peržiūrėti profilį</p>
          <button 
            onClick={() => window.location.href = '/login'}
            className="px-6 py-3 bg-[#2F8481] text-white font-semibold rounded-xl hover:opacity-90 transition-all duration-200 transform hover:scale-[1.02]"
          >
            Prisijungti
          </button>
        </div>
      </div>
    );
  }

  if (!profile) {
    // Security: Don't log sensitive error screen data
    if (process.env.NODE_ENV === 'development') {
      console.log('👤 Profile: No profile found, showing error screen');
    }
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#2F8481]/5 via-white to-[#2F8481]/10 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <div className="w-20 h-20 bg-[#2F8481]/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-[#2F8481]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-black mb-2">Nepavyko užkrauti profilio</h2>
          <p className="text-black/60 mb-6">Bandykite dar kartą arba susisiekite su palaikymo komanda</p>
          <div className="flex gap-3 justify-center">
          <button 
            onClick={fetchProfile}
              className="px-6 py-3 bg-[#2F8481] text-white font-semibold rounded-xl hover:opacity-90 transition-all duration-200 transform hover:scale-[1.02]"
          >
            Bandyti dar kartą
          </button>
            <button 
              onClick={() => window.location.href = '/dashboard'}
              className="px-6 py-3 bg-white text-black font-semibold rounded-xl border border-black/15 hover:bg-black/5 transition-all duration-200"
            >
              Grįžti į pagrindinį
          </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2F8481]/5 via-white to-[#2F8481]/10 py-8 px-4 sm:px-6 lg:px-8 animate-fade-in">
      <div className="max-w-4xl mx-auto">
        {/* Header Section */}
        <div className="mb-8 animate-slide-up">
          <div className="bg-white rounded-2xl shadow-lg border border-black/10 p-8 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
            <div className="flex items-center gap-6">
              {/* Avatar */}
              <div className="relative group" role="img" aria-label={`${displayName} profilio nuotrauka`}>
                <div className="w-20 h-20 bg-gradient-to-br from-[#2F8481] to-[#2F8481]/80 rounded-2xl flex items-center justify-center shadow-lg overflow-hidden ring-4 ring-white/20 hover:ring-[#2F8481]/20 transition-all duration-300">
                  {profile.avatar_url && profile.avatar_url.trim() ? (
                    <img 
                      src={profile.avatar_url} 
                      alt={`${displayName} profilio nuotrauka`}
                      className="w-full h-full object-cover rounded-2xl"
                      loading="lazy"
                      decoding="async"
                      onError={(e) => {
                        // Fallback to initials if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const fallback = target.nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <span 
                    className={`text-2xl font-bold text-white ${(profile.avatar_url && profile.avatar_url.trim()) ? 'hidden' : 'flex'} items-center justify-center w-full h-full`}
                  >
                    {userInitials}
                  </span>
                </div>
                
                {/* Status indicator */}
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-br from-[#2F8481] to-[#2F8481]/80 rounded-full border-2 border-white flex items-center justify-center shadow-lg animate-pulse">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                
                {/* Photo upload overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/50 to-black/30 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center backdrop-blur-sm">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowPhotoOptions(true)}
                      disabled={uploadingPhoto}
                      className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-all duration-200 transform hover:scale-110 shadow-lg"
                      title="Įkelti nuotrauką"
                      aria-label="Įkelti profilio nuotrauką"
                    >
                      {uploadingPhoto ? (
                        <svg className="w-4 h-4 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      )}
                    </button>
                    {profile.avatar_url && profile.avatar_url.trim() && (
                      <button
                        onClick={handleRemovePhoto}
                        className="p-2 bg-black/50 hover:bg-black/60 rounded-xl transition-all duration-200 transform hover:scale-110 shadow-lg"
                        title="Pašalinti nuotrauką"
                        aria-label="Pašalinti profilio nuotrauką"
                      >
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Hidden file inputs */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  aria-label="Pasirinkite profilio nuotrauką iš failų"
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="user"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  aria-label="Fotografuokite profilio nuotrauką"
                />
              </div>
              
              {/* User Info */}
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-black mb-2">
                  {displayName}
                </h1>
                {hasText(profile.nickname) && (
                  <p className="text-sm text-black/50 mb-1">@{profile.nickname}</p>
                )}
                <p className="text-lg text-black/60 mb-3">{profile.email}</p>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 px-4 py-2 bg-[#2F8481]/8 rounded-xl border border-[#2F8481]/20">
                    <div className="w-2 h-2 bg-[#2F8481] rounded-full" />
                    <span className="text-sm font-semibold text-[#2F8481]">
                      {roleLabel}
                    </span>
                  </div>
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${googleStatusStyles.container}`}>
                    <div className={`w-2 h-2 rounded-full ${googleStatusStyles.dot}`} />
                    <span className={`text-sm font-semibold ${googleStatusStyles.text}`}>
                      {googleStatusStyles.label}
                    </span>
                  </div>
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${completenessStyles.container}`}>
                    <div className={`w-2 h-2 rounded-full ${completenessStyles.dot}`} />
                    <span className={`text-sm font-semibold ${completenessStyles.text}`}>
                      {completenessStyles.label} ({profileCompleteness}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>

          {message && (
            <div
              className={`mb-6 rounded-xl border p-4 animate-slide-up ${
              message.type === 'success' 
                  ? 'bg-[#2F8481]/10 text-[#2F8481] border-[#2F8481]/30'
                  : 'bg-black/5 text-black border-black/10'
              }`}
              role="alert"
              aria-live="polite"
            >
            <div className="flex items-center gap-2">
              {message.type === 'success' ? (
                  <svg className="w-5 h-5 text-[#2F8481]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                  <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              )}
              <span className="font-medium">{message.text}</span>
            </div>
            </div>
          )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Account Information Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-black/10 p-6 backdrop-blur-sm hover:shadow-xl transition-all duration-300 animate-slide-up">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-gradient-to-br from-[#2F8481] to-[#2F8481]/80 rounded-xl shadow-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-black">Paskyros informacija</h2>
              </div>
            
            <div className="space-y-4">
              {hasText(profile.nickname) && (
                <div className="flex justify-between items-center py-3 border-b border-black/5">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-black/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 10c0 7-7 11-7 11s-7-4-7-11a7 7 0 1114 0z" />
                    </svg>
                    <span className="text-sm font-medium text-black/60">Vartotojo vardas</span>
                  </div>
                  <span className="font-semibold text-black">@{profile.nickname}</span>
                </div>
              )}
              
              <div className="flex justify-between items-center py-3 border-b border-black/5">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-black/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                  <span className="text-sm font-medium text-black/60">El. paštas</span>
                </div>
                <span className="font-semibold text-black">{profile.email}</span>
              </div>

              {(hasText(profile.first_name) || hasText(profile.last_name)) && (
                <div className="flex justify-between items-center py-3 border-b border-black/5">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-black/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-sm font-medium text-black/60">Vardas ir pavardė</span>
                  </div>
                  <span className="font-semibold text-black">
                    {[profile.first_name, profile.last_name].filter((part) => hasText(part)).join(' ') || '—'}
                  </span>
                </div>
              )}
              
              <div className="flex justify-between items-center py-3 border-b border-black/5">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-black/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className="text-sm font-medium text-black/60">Rolė</span>
                </div>
                <span className="px-2 py-1 bg-[#2F8481]/10 text-[#2F8481] border border-[#2F8481]/20 rounded-lg text-sm font-semibold">
                  {roleLabel}
                </span>
              </div>
              
              <div className="flex justify-between items-center py-3 border-b border-black/5">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-black/40" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  </svg>
                  <span className="text-sm font-medium text-black/60">Prisijungimas</span>
                </div>
                <span className="px-2 py-1 rounded-lg text-sm font-semibold bg-[#2F8481]/10 text-[#2F8481] border border-[#2F8481]/20">
                  Google SSO
                </span>
              </div>

              <div className="flex justify-between items-center py-3">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-black/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684L10.89 6H19a2 2 0 012 2v9a2 2 0 01-2 2h-5" />
                  </svg>
                  <span className="text-sm font-medium text-black/60">Telefono numeris</span>
                </div>
                <span className="font-semibold text-black">{hasText(profile.phone) ? profile.phone : '—'}</span>
              </div>
            </div>
          </div>

          {/* Google Integration Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-black/10 p-6 backdrop-blur-sm hover:shadow-xl transition-all duration-300 animate-slide-up">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-gradient-to-br from-[#2F8481] to-[#2F8481]/80 rounded-xl shadow-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-black">Saugumas ir prisijungimas</h2>
            </div>
            
            <div className="space-y-6">
              <div className={`p-6 rounded-2xl border ${
                profile.google_linked ? 'border-[#2F8481]/20 bg-[#2F8481]/10' : 'border-black/15 bg-black/5'
              }`}>
                  <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${
                      profile.google_linked ? 'bg-[#2F8481] text-white' : 'bg-black/30 text-white'
                    }`}
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  <div>
                    <p className={`text-lg font-bold ${profile.google_linked ? 'text-[#2F8481]' : 'text-black'}`}>
                      {profile.google_linked ? 'Prisijungimas per Google aktyvus' : 'Prisijungimas per Google neaktyvus'}
                    </p>
                    <p className="text-sm text-black/60 font-medium">
                      {profile.google_linked
                        ? profile.google_email || profile.email
                        : 'Prisijunkite su Google, kad pagreitintumėte autentifikaciją'}
                    </p>
                  </div>
                  </div>
                </div>
                
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border border-black/10 rounded-2xl bg-white">
                  <h3 className="text-sm font-semibold text-black mb-2">Paskutinis prisijungimas</h3>
                  <p className="text-sm text-black/60">
                    {profile.last_login ? new Date(profile.last_login).toLocaleString('lt-LT') : 'Informacija bus rodoma kitą kartą prisijungus.'}
                    </p>
                  </div>
                </div>
                
              <TwoFactorSection />
                  </div>
                </div>

        </div>

        {/* Profile Form Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-black/10 p-6 backdrop-blur-sm hover:shadow-xl transition-all duration-300 animate-slide-up">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-gradient-to-br from-[#2F8481] to-[#2F8481]/80 rounded-xl shadow-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-black">Asmeninė informacija</h2>
          </div>

          <form onSubmit={handleSavePersonalInfo} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="group">
                <label htmlFor="first_name" className="block text-sm font-bold text-black mb-3 group-focus-within:text-[#2F8481] transition-colors">
                  Vardas
                </label>
                <input
                  type="text"
                  id="first_name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-4 border-2 border-black/10 rounded-2xl bg-white shadow-sm focus:ring-4 focus:ring-[#2F8481]/20 focus:border-[#2F8481] text-sm transition-all duración-200"
                  placeholder="Jūsų vardas"
                />
              </div>
              <div className="group">
                <label htmlFor="last_name" className="block text-sm font-bold text-black mb-3 group-focus-within:text-[#2F8481] transition-colors">
                  Pavardė
                </label>
                <input
                  type="text"
                  id="last_name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-4 border-2 border-black/10 rounded-2xl bg-white shadow-sm focus:ring-4 focus:ring-[#2F8481]/20 focus:border-[#2F8481] text-sm transition-all duración-200"
                  placeholder="Jūsų pavardė"
                />
              </div>
            </div>

            <div className="group">
              <label htmlFor="phone" className="block text-sm font-bold text-black mb-3 group-focus-within:text-[#2F8481] transition-colors">
                Telefono numeris
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full px-4 py-4 border-2 border-black/10 rounded-2xl bg-white shadow-sm focus:ring-4 focus:ring-[#2F8481]/20 focus:border-[#2F8481] text-sm transition-all duración-200"
                placeholder="+370 6XX XXXXX"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-6">
              <button
                type="submit"
                disabled={savingInfo}
                className="flex-1 px-6 py-4 bg-[#2F8481] text-white font-bold rounded-2xl hover:bg-[#276f6c] disabled:opacity-50 disabled:cursor-not-allowed transition-all duración-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
              >
                {savingInfo ? 'Saugoma...' : 'Išsaugoti asmeninę informaciją'}
              </button>
            </div>
          </form>

          {profile?.role === 'tenant' && (
            <form onSubmit={handleUpdateProfile} className="mt-6 space-y-4">
              <div className="rounded-2xl border border-[#2F8481]/20 bg-[#2F8481]/10 px-4 py-4 shadow-sm">
                <h3 className="text-sm font-semibold text-[#2F8481]">Tapkite nuomotoju</h3>
                <p className="text-sm text-black/70">
                  Norite valdyti objektus, sąskaitas ir skaitliukus? Paspauskite „Tapti nuomotoju“ ir iškart aktyvuosime nuomotojo aplinką.
                </p>
              </div>
              <button
                type="submit"
                disabled={updating}
                className="w-full px-6 py-4 bg-gradient-to-r from-[#2F8481] to-[#2F8481]/90 text-white font-bold rounded-2xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duración-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
              >
                {updating ? 'Atnaujinama...' : 'Tapti nuomotoju'}
              </button>
            </form>
          )}

        </div>
      {/* Photo Options Modal */}
      {showPhotoOptions && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
          onClick={() => setShowPhotoOptions(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#2F8481] rounded-xl">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-black">Įkelti nuotrauką</h3>
                  <p className="text-sm text-black/60">Pasirinkite nuotraukos šaltinį</p>
                </div>
              </div>
              <button
                onClick={() => setShowPhotoOptions(false)}
                className="p-2 hover:bg-black/5 rounded-xl transition-colors"
                aria-label="Uždaryti"
              >
                <svg className="w-5 h-5 text-black/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Options */}
            <div className="space-y-3">
              {/* Camera Option */}
              <button
                onClick={() => {
                  setShowPhotoOptions(false);
                  cameraInputRef.current?.click();
                }}
                className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-[#2F8481]/10 to-[#2F8481]/5 hover:from-[#2F8481]/20 hover:to-[#2F8481]/10 border-2 border-[#2F8481]/20 rounded-xl transition-all duration-200 group"
              >
                <div className="p-3 bg-[#2F8481] rounded-xl group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <p className="font-bold text-black">Fotografuoti</p>
                  <p className="text-sm text-black/60">Naudoti fotoaparatą</p>
                </div>
                <svg className="w-5 h-5 text-[#2F8481]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* Gallery/Files Option */}
              <button
                onClick={() => {
                  setShowPhotoOptions(false);
                  fileInputRef.current?.click();
                }}
                className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-[#2F8481]/10 to-[#2F8481]/5 hover:from-[#2F8481]/20 hover:to-[#2F8481]/10 border-2 border-[#2F8481]/20 rounded-xl transition-all duration-200 group"
              >
                <div className="p-3 bg-[#2F8481] rounded-xl group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <p className="font-bold text-black">Pasirinkti iš galerijų</p>
                  <p className="text-sm text-black/60">Naudoti esamą nuotrauką</p>
                </div>
                <svg className="w-5 h-5 text-[#2F8481]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Cancel Button */}
            <button
              onClick={() => setShowPhotoOptions(false)}
              className="w-full mt-4 px-4 py-3 text-black bg-black/5 hover:bg-black/10 rounded-xl font-semibold transition-colors"
            >
              Atšaukti
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default Profile;

