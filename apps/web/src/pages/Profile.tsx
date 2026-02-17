import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { ProfileSkeleton } from '../components/ui/SkeletonComponents';

interface ProfileData {
  id: string;
  email: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  phone?: string;
  role: string;
  avatar_url?: string | null;
  created_at?: string;
  profile_changed_at?: string | null;
}

const COOLDOWN_DAYS = 14;

const generateInitials = (firstName?: string | null, lastName?: string | null, username?: string, email?: string): string => {
  if (username) { const c = username.replace(/^@/, '').replace(/[^a-zA-Z0-9]/g, ''); if (c.length > 0) return c.slice(0, 2).toUpperCase(); }
  if (firstName || lastName) { const i = ((firstName || '').charAt(0) + (lastName || '').charAt(0)).toUpperCase(); if (i) return i.slice(0, 2); }
  if (email) { const l = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, ''); if (l.length > 0) return l.slice(0, 2).toUpperCase(); }
  return '?';
};

const Toast: React.FC<{ message: string; type: 'success' | 'error'; onClose: () => void }> = ({ message, type, onClose }) => {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg ${type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        {type === 'success' ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /> : <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />}
      </svg>
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
};

const Profile: React.FC = () => {
  const { user, logout, refreshSession } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showAvatarPreview, setShowAvatarPreview] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [formData, setFormData] = useState({ username: '', first_name: '', last_name: '', phone: '' });
  const [originalData, setOriginalData] = useState({ username: '', first_name: '', last_name: '', phone: '' });
  const [usernameError, setUsernameError] = useState('');
  const [checkingUsername, setCheckingUsername] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [showConfirmSave, setShowConfirmSave] = useState(false);

  // Only fetch profile on initial mount, not on every user object change
  const profileFetched = useRef(false);
  useEffect(() => {
    if (user && !profileFetched.current) {
      profileFetched.current = true;
      fetchProfile();
    }
  }, [user]);

  // Memoized dirty check to avoid JSON.stringify on every render
  const isDirty = useMemo(() =>
    JSON.stringify(formData) !== JSON.stringify(originalData)
    , [formData, originalData]);

  // Cooldown logic
  const cooldownInfo = useMemo(() => {
    if (!profile?.profile_changed_at) return { locked: false, remaining: '' };
    const changedAt = new Date(profile.profile_changed_at).getTime();
    const unlockAt = changedAt + COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
    const now = Date.now();
    if (now >= unlockAt) return { locked: false, remaining: '' };
    const diffMs = unlockAt - now;
    const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    const hours = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    if (days > 0) return { locked: true, remaining: `${days} d. ${hours} val.` };
    return { locked: true, remaining: `${hours} val.` };
  }, [profile?.profile_changed_at]);

  const fetchProfile = async () => {
    if (!user) { setLoading(false); return; }
    try {
      // Optimized: explicit column selects instead of '*', parallel requests
      const [profileRes, userRes] = await Promise.all([
        supabase.from('profiles').select('id, username, avatar_url, profile_changed_at').eq('id', user.id).single(),
        supabase.from('users').select('phone, created_at').eq('id', user.id).single()
      ]);
      const pd = profileRes.data;
      const ud = userRes.data;
      const fn = user.first_name && user.first_name !== 'User' ? user.first_name : null;
      const ln = user.last_name && user.last_name !== 'Name' ? user.last_name : null;
      const p: ProfileData = { id: user.id, email: user.email, username: pd?.username || user.email?.split('@')[0] || 'user', first_name: fn, last_name: ln, phone: ud?.phone, role: user.role, avatar_url: pd?.avatar_url, created_at: ud?.created_at, profile_changed_at: pd?.profile_changed_at };
      setProfile(p);
      const fs = { username: p.username, first_name: p.first_name || '', last_name: p.last_name || '', phone: p.phone || '' };
      setFormData(fs); setOriginalData(fs);
    } catch (e) { console.error(e); setToast({ message: 'Nepavyko užkrauti', type: 'error' }); }
    finally { setLoading(false); }
  };

  const validateUsername = (u: string) => u.length < 3 ? 'Min. 3 simboliai' : u.length > 24 ? 'Max. 24 simboliai' : !/^[a-zA-Z0-9._-]+$/.test(u) ? 'Netinkami simboliai' : null;

  const checkUsernameAvailability = async (u: string) => {
    if (u === profile?.username) return true;
    try { const { data } = await supabase.rpc('check_username_available', { p_username: u.toLowerCase() }); return data === true; } catch { return false; }
  };

  // Debounced username availability check
  const usernameCheckTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleUsernameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setFormData(p => ({ ...p, username: v }));
    const err = validateUsername(v);
    if (err) { setUsernameError(err); return; }
    setUsernameError('');

    // Debounce the async check
    if (usernameCheckTimeout.current) clearTimeout(usernameCheckTimeout.current);
    usernameCheckTimeout.current = setTimeout(async () => {
      if (v === profile?.username) return;
      setCheckingUsername(true);
      const avail = await checkUsernameAvailability(v);
      setCheckingUsername(false);
      setUsernameError(avail ? '' : 'Šis vardas užimtas');
    }, 300);
  }, [profile?.username]);

  const handleSaveProfile = async () => {
    if (!user || !profile) return;
    if (cooldownInfo.locked) { setToast({ message: `Profilį galėsite keisti po ${cooldownInfo.remaining}`, type: 'error' }); return; }
    const uv = validateUsername(formData.username); if (uv) { setUsernameError(uv); return; } if (usernameError) return;
    // Show confirmation if this is not first save
    if (!showConfirmSave) { setShowConfirmSave(true); return; }
    setShowConfirmSave(false);
    setSaving(true);
    try {
      const now = new Date().toISOString();
      await supabase.from('profiles').update({ username: formData.username.toLowerCase(), profile_changed_at: now }).eq('id', user.id);
      await supabase.from('users').update({ first_name: formData.first_name || '', last_name: formData.last_name || '', phone: formData.phone || null }).eq('id', user.id);
      const nfs = { username: formData.username.toLowerCase(), first_name: formData.first_name, last_name: formData.last_name, phone: formData.phone };
      setProfile(p => p ? { ...p, ...nfs, first_name: nfs.first_name || null, last_name: nfs.last_name || null, profile_changed_at: now } : null);
      setOriginalData(nfs);
      setToast({ message: 'Pakeitimai išsaugoti', type: 'success' });
      await refreshSession();
    } catch (e) { console.error(e); setToast({ message: 'Nepavyko išsaugoti', type: 'error' }); }
    finally { setSaving(false); }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!user || !file.type.startsWith('image/') || file.size > 2 * 1024 * 1024) { setToast({ message: 'Netinkamas failas', type: 'error' }); return; }
    setUploadingAvatar(true);
    try {
      const path = `${user.id}/${Date.now()}.${file.name.split('.').pop()}`;
      const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
      setProfile(p => p ? { ...p, avatar_url: publicUrl } : null);
      setToast({ message: 'Nuotrauka atnaujinta', type: 'success' });
      // Refresh auth context so header & sidebar pick up the new avatar
      await refreshSession();
    } catch { setToast({ message: 'Klaida įkeliant', type: 'error' }); }
    finally { setUploadingAvatar(false); }
  };

  const handleDeleteAccount = async () => {
    if (!user || !profile || deleteConfirmText !== `@${profile.username}`) return;
    setDeletingAccount(true);

    try {
      // Try to delete from profiles table (may fail due to RLS)
      const { error: profileError } = await supabase.from('profiles').delete().eq('id', user.id);
      if (profileError) console.warn('profiles delete failed (RLS?):', profileError.message);

      // Try to delete from users table (may fail due to RLS)
      const { error: usersError } = await supabase.from('users').delete().eq('id', user.id);
      if (usersError) console.warn('users delete failed (RLS?):', usersError.message);

      // Try logout but don't wait forever
      try { await logout(); } catch { }

    } catch (e: any) {
      console.error('Delete account error:', e);
    }

    // Force redirect to login - always executes
    window.location.href = '/login';
  };

  // Memoized completeness calculation
  const completeness = useMemo(() =>
    profile ? Math.round(([!!profile.avatar_url, !!profile.username, !!profile.first_name, !!profile.last_name, !!profile.phone].filter(Boolean).length / 5) * 100) : 0
    , [profile?.avatar_url, profile?.username, profile?.first_name, profile?.last_name, profile?.phone]);

  const getRoleName = useCallback((r: string) => r === 'landlord' ? 'Nuomotojas' : r === 'tenant' ? 'Nuomininkas' : r, []);

  // Use skeleton loader instead of spinner for better UX
  if (loading) return <ProfileSkeleton />;
  if (!profile) return <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]"><p className="text-gray-500">Nepavyko užkrauti profilio</p></div>;

  const initials = generateInitials(profile.first_name, profile.last_name, profile.username, profile.email);

  // Profile completion items for checklist
  const completionItems = [
    { key: 'avatar', label: 'Profilio nuotrauka', done: !!profile.avatar_url },
    { key: 'username', label: 'Vartotojo vardas', done: !!profile.username },
    { key: 'first_name', label: 'Vardas', done: !!profile.first_name },
    { key: 'last_name', label: 'Pavardė', done: !!profile.last_name },
    { key: 'phone', label: 'Telefonas', done: !!profile.phone },
  ];
  const missingItems = completionItems.filter(i => !i.done);

  return (
    <div className="min-h-screen relative">
      {/* Page Background - Black & White buildings theme */}
      <div className="fixed inset-0 z-0 bg-gray-900">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: `url('/images/ProfileBackground_bw.webp')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center center',
            backgroundRepeat: 'no-repeat'
          }}
        />
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* Compact Header Bar (sticky within scroll area) */}
      <div className="sticky top-0 bg-gray-950/80 backdrop-blur-xl border-b border-white/[0.06] z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-14 flex items-center justify-between gap-4">
            {/* Left: Avatar + Username */}
            <div className="flex items-center gap-3">
              <div
                onClick={() => avatarInputRef.current?.click()}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold cursor-pointer ring-2 ring-white/20 shadow-sm transition-transform hover:scale-105"
                style={{ background: profile.avatar_url ? `url(${profile.avatar_url}) center/cover` : 'linear-gradient(135deg, #2F8481, #4DB6AC)', color: profile.avatar_url ? 'transparent' : 'white' }}
              >
                {!profile.avatar_url && initials}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">@{profile.username}</span>
                  <span className="px-2 py-0.5 bg-teal-500/20 text-teal-300 text-[11px] font-semibold rounded-md">{getRoleName(profile.role)}</span>
                </div>
                <div className="text-xs text-gray-400">{profile.email}</div>
              </div>
            </div>

            {/* Right: Save */}
            <div className="flex items-center gap-2">
              {cooldownInfo.locked && (
                <span className="text-xs text-amber-400 font-medium flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                  {cooldownInfo.remaining}
                </span>
              )}
              <button
                onClick={handleSaveProfile}
                disabled={!isDirty || saving || !!usernameError || cooldownInfo.locked}
                className="h-9 px-4 bg-teal-500 hover:bg-teal-400 text-gray-950 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                {saving ? 'Saugoma...' : 'Išsaugoti'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden file input */}
      <input ref={avatarInputRef} type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])} className="hidden" />



      {/* Main Content - 2 Column Grid */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left Column - Form (7/12) */}
          <div className="lg:col-span-7 space-y-6">

            {/* Profile Photo Card */}
            <div className="bg-gray-950/80 backdrop-blur-md rounded-2xl border border-white/[0.08] shadow-lg p-5">
              <h2 className="text-sm font-semibold text-gray-100 mb-4">Profilio nuotrauka</h2>
              <div className="flex items-center gap-4">
                <div className="relative group">
                  <div
                    onClick={() => profile.avatar_url ? setShowAvatarPreview(true) : avatarInputRef.current?.click()}
                    className="w-20 h-20 rounded-2xl flex items-center justify-center text-xl font-bold cursor-pointer transition-all hover:scale-105 hover:shadow-xl ring-4 ring-white shadow-lg overflow-hidden"
                    style={{ background: profile.avatar_url ? undefined : 'linear-gradient(135deg, #2F8481, #4DB6AC)', color: 'white' }}
                  >
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt="Profilio nuotrauka" className="w-full h-full object-cover" />
                    ) : (
                      initials
                    )}
                    {uploadingAvatar && <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center"><div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" /></div>}
                    {/* Hover overlay */}
                    {profile.avatar_url && (
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                        <svg className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-400 mb-2">JPG, PNG iki 2MB</p>
                  <button onClick={() => avatarInputRef.current?.click()} className="h-9 px-4 text-sm font-medium text-teal-300 bg-teal-500/15 hover:bg-teal-500/25 rounded-lg transition-colors">
                    {profile.avatar_url ? 'Keisti nuotrauką' : 'Įkelti nuotrauką'}
                  </button>
                </div>
              </div>
            </div>

            {/* Form Card */}
            <div className="bg-gray-950/80 backdrop-blur-md rounded-2xl border border-white/[0.08] shadow-lg p-5">
              <h2 className="text-sm font-semibold text-gray-100 mb-4">Asmeninė informacija</h2>
              <div className="space-y-4">
                {/* Username */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Vartotojo vardas</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">@</span>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={handleUsernameChange}
                      disabled={cooldownInfo.locked}
                      className={`w-full h-11 pl-8 pr-10 border rounded-xl bg-white/[0.06] text-gray-100 focus:bg-white/[0.1] focus:outline-none transition-colors ${cooldownInfo.locked ? 'opacity-60 cursor-not-allowed' : ''} ${usernameError ? 'border-red-400/50 focus:border-red-400' : 'border-white/[0.1] focus:border-teal-400'}`}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {checkingUsername && <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />}
                      {!checkingUsername && formData.username.length >= 3 && !usernameError && <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                    </div>
                  </div>
                  {usernameError && <p className="mt-1 text-xs text-red-500">{usernameError}</p>}
                </div>

                {/* Name fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Vardas</label>
                    <input type="text" value={formData.first_name} onChange={(e) => setFormData(p => ({ ...p, first_name: e.target.value }))}
                      disabled={cooldownInfo.locked}
                      className={`w-full h-11 px-3 border border-white/[0.1] rounded-xl bg-white/[0.06] text-gray-100 focus:bg-white/[0.1] focus:border-teal-400 focus:outline-none transition-colors ${cooldownInfo.locked ? 'opacity-60 cursor-not-allowed' : ''}`} placeholder="Jonas" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Pavardė</label>
                    <input type="text" value={formData.last_name} onChange={(e) => setFormData(p => ({ ...p, last_name: e.target.value }))}
                      disabled={cooldownInfo.locked}
                      className={`w-full h-11 px-3 border border-white/[0.1] rounded-xl bg-white/[0.06] text-gray-100 focus:bg-white/[0.1] focus:border-teal-400 focus:outline-none transition-colors ${cooldownInfo.locked ? 'opacity-60 cursor-not-allowed' : ''}`} placeholder="Jonaitis" />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Telefonas</label>
                  <input type="tel" value={formData.phone} onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))}
                    disabled={cooldownInfo.locked}
                    className={`w-full h-11 px-3 border border-white/[0.1] rounded-xl bg-white/[0.06] text-gray-100 focus:bg-white/[0.1] focus:border-teal-400 focus:outline-none transition-colors ${cooldownInfo.locked ? 'opacity-60 cursor-not-allowed' : ''}`} placeholder="+370 600 00000" />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Summary Cards (5/12) */}
          <div className="lg:col-span-5 space-y-4">

            {/* Account Summary Card */}
            <div className="bg-gray-950/80 backdrop-blur-md rounded-2xl border border-white/[0.08] shadow-lg p-5">
              <h3 className="text-sm font-semibold text-gray-100 mb-3">Paskyros informacija</h3>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between"><span className="text-gray-400">Rolė</span><span className="font-medium text-gray-200">{getRoleName(profile.role)}</span></div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Prisijungimas</span>
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                    <span className="font-medium text-gray-200">Google</span>
                  </div>
                </div>
                {profile.created_at && <div className="flex justify-between"><span className="text-gray-400">Registracija</span><span className="font-medium text-gray-200">{new Date(profile.created_at).toLocaleDateString('lt-LT')}</span></div>}
              </div>

              {/* Profile completion progress */}
              <div className="mt-4 pt-4 border-t border-white/[0.06]">
                <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                  <span>Profilio užpildymas</span>
                  <span className="font-semibold text-teal-400">{completeness}%</span>
                </div>
                <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                  <div className="h-full bg-teal-500 rounded-full transition-colors duration-500" style={{ width: `${completeness}%` }} />
                </div>
              </div>
            </div>

            {/* Profile Completion Checklist */}
            <div className="bg-gray-950/80 backdrop-blur-md rounded-2xl border border-white/[0.08] shadow-lg p-5">
              <h3 className="text-sm font-semibold text-gray-100 mb-3">Profilio būsena</h3>
              <div className="space-y-2">
                {completionItems.map(item => (
                  <div key={item.key} className="flex items-center gap-2.5 text-sm">
                    {item.done ? (
                      <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-gray-300 flex-shrink-0" />
                    )}
                    <span className={item.done ? 'text-gray-500' : 'text-gray-200'}>{item.label}</span>
                  </div>
                ))}
              </div>
              {missingItems.length > 0 && (
                <button
                  onClick={() => document.querySelector('input')?.focus()}
                  className="mt-4 w-full h-9 text-sm font-medium text-teal-300 bg-teal-500/15 hover:bg-teal-500/25 rounded-lg transition-colors"
                >
                  Užpildyti trūkstamus laukus ({missingItems.length})
                </button>
              )}
            </div>

            {/* Danger Zone - Subtle */}
            <div className="bg-gray-950/80 backdrop-blur-md rounded-2xl border border-white/[0.08] shadow-lg p-5">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                <h3 className="text-sm font-medium text-gray-400">Pavojinga zona</h3>
              </div>
              <p className="text-xs text-gray-500 mb-3">Paskyros ištrynimas yra negrįžtamas. Visi duomenys bus prarasti.</p>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="text-sm text-red-600 hover:text-red-700 font-medium"
              >
                Ištrinti paskyrą →
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* Delete Modal - Confirmation with username */}
      {
        showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">Ištrinti paskyrą?</h3>
                <p className="text-sm text-gray-500">Visi duomenys bus prarasti negrįžtamai.</p>
              </div>
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Įveskite <span className="font-bold text-red-600">@{profile.username}</span> patvirtinimui
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="w-full h-11 px-4 border-2 border-gray-200 rounded-xl focus:border-red-400 focus:outline-none text-center"
                  placeholder={`@${profile.username}`}
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(''); }} className="flex-1 h-11 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium">Atšaukti</button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText !== `@${profile.username}` || deletingAccount}
                  className="flex-1 h-11 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deletingAccount ? 'Trinama...' : 'Ištrinti'}
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Save Confirmation Modal */}
      {showConfirmSave && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowConfirmSave(false)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: 'avatarScaleIn 200ms cubic-bezier(0.16,1,0.3,1)' }}
          >
            <div className="p-6 text-center">
              {/* Icon */}
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-50 flex items-center justify-center">
                <svg className="w-7 h-7 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              {/* Text */}
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Patvirtinti pakeitimus?</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Po išsaugojimo profilio duomenų keisti <strong className="text-gray-700">negalėsite {COOLDOWN_DAYS} dienų</strong>. Įsitikinkite, kad visa informacija teisinga.
              </p>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => setShowConfirmSave(false)}
                className="flex-1 h-11 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors"
              >
                Atšaukti
              </button>
              <button
                onClick={handleSaveProfile}
                className="flex-1 h-11 bg-[#2F8481] hover:bg-[#267673] text-white rounded-xl text-sm font-medium transition-colors"
              >
                Patvirtinti
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Avatar lightbox preview */}
      {showAvatarPreview && profile.avatar_url && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setShowAvatarPreview(false)}
          style={{ animation: 'avatarFadeIn 200ms ease-out' }}
        >
          <div
            className="relative max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: 'avatarScaleIn 250ms cubic-bezier(0.16,1,0.3,1)' }}
          >
            {/* Photo */}
            <div className="rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">
              <img
                src={profile.avatar_url}
                alt="Profilio nuotrauka"
                className="w-full aspect-square object-cover"
              />
            </div>

            {/* Actions bar below */}
            <div className="flex items-center justify-center gap-3 mt-4">
              <button
                onClick={() => { setShowAvatarPreview(false); avatarInputRef.current?.click(); }}
                className="h-10 px-5 bg-white/90 backdrop-blur-sm hover:bg-white text-gray-900 rounded-xl text-sm font-medium shadow-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                </svg>
                Keisti nuotrauką
              </button>
              <button
                onClick={() => setShowAvatarPreview(false)}
                className="h-10 px-5 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white rounded-xl text-sm font-medium transition-colors"
              >
                Uždaryti
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <style>{`
        @keyframes avatarFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes avatarScaleIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div >
  );
};

export default Profile;
